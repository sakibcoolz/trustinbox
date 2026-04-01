'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, from, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useMemo } from 'react';
import { tokenManager } from './token';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

// ─── HTTP Link ──────────────────────────────────────────

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

// ─── Auth Link — inject headers ─────────────────────────

const authLink = setContext((_, { headers }) => {
  const token = tokenManager.getAccessToken();
  const spId = tokenManager.getActiveSpId();
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(spId ? { 'X-Service-Provider-Id': spId } : {}),
    },
  };
});

// ─── Error Link — 401 retry with token refresh ─────────

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' || err.message === 'Unauthorized') {
        return new Observable((observer) => {
          tokenManager.refresh().then((success) => {
            if (success) {
              // Retry the operation with the new token
              const oldHeaders = operation.getContext().headers;
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  Authorization: `Bearer ${tokenManager.getAccessToken()}`,
                },
              });
              forward(operation).subscribe(observer);
            } else {
              tokenManager.clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
              }
              observer.error(err);
            }
          });
        });
      }
    }
  }

  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    tokenManager.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }

  return undefined;
});

// ─── Cache Configuration ────────────────────────────────

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        notifications: { keyArgs: ['filter'], merge: false },
        conversations: { keyArgs: ['filter'], merge: false },
        callbackRequests: { keyArgs: ['filter'], merge: false },
        campaigns: { keyArgs: ['filter'], merge: false },
      },
    },
    User: { keyFields: ['id'] },
    Notification: { keyFields: ['id'] },
    CallbackRequest: { keyFields: ['id'] },
    Conversation: { keyFields: ['id'] },
    Campaign: { keyFields: ['id'] },
    Bot: { keyFields: ['id'] },
    ServiceProvider: { keyFields: ['id'] },
  },
});

// ─── Client Factory ─────────────────────────────────────

function createApolloClient() {
  return new ApolloClient({
    link: from([authLink, errorLink, httpLink]),
    cache,
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
      query: { fetchPolicy: 'cache-first' },
    },
  });
}

// ─── Singleton for SSR safety ───────────────────────────
let apolloClientInstance: ApolloClient<unknown> | null = null;

export function getApolloClient(): ApolloClient<unknown> {
  if (typeof window === 'undefined') return createApolloClient();
  if (!apolloClientInstance) apolloClientInstance = createApolloClient();
  return apolloClientInstance;
}

export function resetApolloClient(): void {
  if (apolloClientInstance) {
    apolloClientInstance.clearStore();
    apolloClientInstance = null;
  }
}

// ─── Provider Wrapper ───────────────────────────────────

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
