import {
  ApolloClient,
  InMemoryCache,
  from,
  HttpLink,
  Observable,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Auth Link ──────────────────────────────────────────

const authLink = setContext((_, { headers }) => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

// ─── Token Refresh ──────────────────────────────────────

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePending() {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
}

async function refreshToken(): Promise<boolean> {
  const refreshTokenValue =
    typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;
  if (!refreshTokenValue) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('xmppToken');
  localStorage.removeItem('xmppJid');
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

// ─── Error Link ─────────────────────────────────────────

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        if (isRefreshing) {
          return new Observable((observer) => {
            pendingRequests.push(() => {
              const token = localStorage.getItem('accessToken');
              operation.setContext(({ headers = {} }: Record<string, Record<string, string>>) => ({
                headers: {
                  ...headers,
                  Authorization: token ? `Bearer ${token}` : '',
                },
              }));
              forward(operation).subscribe(observer);
            });
          });
        }

        isRefreshing = true;

        return new Observable((observer) => {
          refreshToken()
            .then((ok) => {
              if (!ok) {
                clearAuthAndRedirect();
                observer.error(err);
                return;
              }
              const token = localStorage.getItem('accessToken');
              operation.setContext(({ headers = {} }: Record<string, Record<string, string>>) => ({
                headers: {
                  ...headers,
                  Authorization: token ? `Bearer ${token}` : '',
                },
              }));
              resolvePending();
              forward(operation).subscribe(observer);
            })
            .catch(() => {
              clearAuthAndRedirect();
              observer.error(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        });
      }

      console.error(
        `[GraphQL Error] ${err.message}`,
        operation.operationName,
        err.path,
      );
    }
  }

  if (networkError) {
    const statusCode = 'statusCode' in networkError ? (networkError as { statusCode: number }).statusCode : undefined;
    if (statusCode === 401) {
      clearAuthAndRedirect();
    } else if (statusCode === 429) {
      console.warn('[GraphQL] Rate limited', operation.operationName);
    } else {
      console.error('[Network Error]', networkError.message, operation.operationName);
    }
  }
});

// ─── HTTP Link ──────────────────────────────────────────

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || '/graphql',
});

// ─── Cache ──────────────────────────────────────────────

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        notifications: { keyArgs: ['category', 'status'], merge: false },
        callbackRequests: { keyArgs: ['status'], merge: false },
        conversations: { keyArgs: false, merge: false },
        serviceProviders: { keyArgs: ['search'], merge: false },
      },
    },
    User: { keyFields: ['id'] },
    Notification: { keyFields: ['id'] },
    CallbackRequest: { keyFields: ['id'] },
    Conversation: { keyFields: ['id'] },
    Message: { keyFields: ['id'] },
    ServiceProvider: { keyFields: ['id'] },
    DocumentShare: { keyFields: ['id'] },
  },
});

// ─── Client ─────────────────────────────────────────────

export const apolloClient = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

/** Clear the Apollo cache store — call on logout. */
export function resetApolloClient() {
  apolloClient.clearStore();
}
