'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, from, Observable, split } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { type Client as WsClient } from 'graphql-ws';
import { useMemo } from 'react';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || '/graphql';
const ENABLE_BATCHING = process.env.NEXT_PUBLIC_ENABLE_BATCH_REQUESTS === 'true';

// ─── Cookie helper ──────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── HTTP Link (17.5 — BatchHttpLink behind feature flag) ──

const httpLink = ENABLE_BATCHING
  ? new BatchHttpLink({ uri: GRAPHQL_URL, batchMax: 5, batchInterval: 20 })
  : new HttpLink({ uri: GRAPHQL_URL });

// ─── Auth Link — inject SP header (tokens sent via cookies) ─

const authLink = setContext((_, { headers }) => {
  const spId = getCookie('activeSpId');
  return {
    headers: {
      ...headers,
      ...(spId ? { 'X-Service-Provider-Id': spId } : {}),
    },
  };
});

// ─── Error Link — 401 retry with token refresh ─────────

// ─── Toast-like error dedup helper ──────────────────────

let lastErrorToast = '';
let lastErrorTime = 0;

function showErrorOnce(message: string) {
  const now = Date.now();
  if (message === lastErrorToast && now - lastErrorTime < 5000) return;
  lastErrorToast = message;
  lastErrorTime = now;
  // Use console as fallback; toast context not available at link level
  console.warn('[provider-ui]', message);
}

// ─── Error Link (17.4 — extended error handling) ────────

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const code = err.extensions?.code;

      switch (code) {
        case 'UNAUTHENTICATED':
          return new Observable((observer) => {
            fetch('/api/auth/refresh', { method: 'POST' }).then((res) => {
              if (res.ok) {
                // Cookies updated server-side, retry the operation
                forward(operation).subscribe(observer);
              } else {
                if (typeof window !== 'undefined') {
                  window.location.href = '/auth/login';
                }
                observer.error(err);
              }
            });
          });

        case 'FORBIDDEN':
          showErrorOnce('Permission denied');
          break;

        case 'RATE_LIMITED':
          showErrorOnce('Too many requests — please wait');
          break;

        case 'NOT_FOUND':
        case 'VALIDATION_ERROR':
          // Let component handle via error state
          break;

        default:
          console.error(`[GraphQL Error]: ${err.message}`, {
            code,
            path: err.path,
            operation: operation.operationName,
          });
      }
    }
  }

  if (networkError) {
    if ('statusCode' in networkError) {
      const status = (networkError as { statusCode: number }).statusCode;
      if (status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      } else if (status === 429) {
        showErrorOnce('Rate limited — retrying shortly');
      } else {
        showErrorOnce('Network error — check your connection');
      }
    } else {
      showErrorOnce('Network error — check your connection');
    }
  }

  return undefined;
});

// ─── Cache Configuration ────────────────────────────────

// ─── WebSocket Connection State ─────────────────────────

export type WsConnectionState = 'connected' | 'reconnecting' | 'disconnected';

type WsStateListener = (state: WsConnectionState) => void;

const wsStateListeners = new Set<WsStateListener>();
let currentWsState: WsConnectionState = 'disconnected';

function setWsState(state: WsConnectionState) {
  currentWsState = state;
  wsStateListeners.forEach((fn) => fn(state));
}

export function onWsStateChange(fn: WsStateListener): () => void {
  wsStateListeners.add(fn);
  fn(currentWsState); // emit current state immediately
  return () => { wsStateListeners.delete(fn); };
}

export function getWsState(): WsConnectionState {
  return currentWsState;
}

// ─── WebSocket Link (16.1 + 16.4) ──────────────────────
// Disabled: backend is REST-only; no GraphQL WS endpoint available.
// Subscriptions will be re-enabled when the gateway supports WS.

let wsClient: WsClient | null = null;
const wsLink: GraphQLWsLink | null = null;

export function getWsClient(): WsClient | null {
  return wsClient;
}

// ─── Split Link ─────────────────────────────────────────

const httpChain = from([authLink, errorLink, httpLink]);

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === 'OperationDefinition' && def.operation === 'subscription';
      },
      wsLink,
      httpChain,
    )
  : httpChain;

// ─── Cache Configuration ────────────────────────────────

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        notifications: { keyArgs: ['filter'], merge: false },
        conversations: { keyArgs: ['filter'], merge: false },
        callbackRequests: { keyArgs: ['filter'], merge: false },
        campaigns: { keyArgs: ['filter'], merge: false },
        webhookSubscriptions: { merge: false },
        webhookDeliveries: { merge: false },
        apiKeys: { merge: false },
        teamMembers: { merge: false },
        pendingInvitations: { merge: false },
        industryProfiles: { merge: false },
      },
    },
    User: { keyFields: ['id'] },
    Notification: { keyFields: ['id'] },
    CallbackRequest: { keyFields: ['id'] },
    Conversation: { keyFields: ['id'] },
    Campaign: { keyFields: ['id'] },
    ServiceProvider: { keyFields: ['id'] },
    WebhookSubscription: { keyFields: ['id'] },
    WebhookDelivery: { keyFields: ['id'] },
    APIKey: { keyFields: ['id'] },
    TeamMember: { keyFields: ['id'] },
    TeamInvitation: { keyFields: ['id'] },
    IndustryProfile: { keyFields: ['id'] },
    PolicyLog: { keyFields: ['id'] },
    AuditEvent: { keyFields: ['id'] },
    SpamReport: { keyFields: ['id'] },
    Message: { keyFields: ['id'] },
    Document: { keyFields: ['id'] },
  },
});

// ─── Client Factory ─────────────────────────────────────

function createApolloClient() {
  return new ApolloClient({
    link: splitLink,
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
