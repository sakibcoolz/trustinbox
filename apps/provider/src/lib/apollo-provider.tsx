'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, from, Observable, split } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, type Client as WsClient } from 'graphql-ws';
import { useMemo } from 'react';
import { tokenManager } from './token';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || '/graphql';
const WS_URL = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/graphql`
  : 'ws://localhost-0.taildb081d.ts.net:4000/graphql');
const ENABLE_BATCHING = process.env.NEXT_PUBLIC_ENABLE_BATCH_REQUESTS === 'true';

// ─── HTTP Link (17.5 — BatchHttpLink behind feature flag) ──

const httpLink = ENABLE_BATCHING
  ? new BatchHttpLink({ uri: GRAPHQL_URL, batchMax: 5, batchInterval: 20 })
  : new HttpLink({ uri: GRAPHQL_URL });

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
            tokenManager.refresh().then((success) => {
              if (success) {
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
        tokenManager.clearTokens();
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

let wsClient: WsClient | null = null;

const wsLink = typeof window !== 'undefined'
  ? (() => {
      wsClient = createClient({
        url: WS_URL,
        connectionParams: () => {
          const token = tokenManager.getAccessToken();
          const spId = tokenManager.getActiveSpId();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(spId ? { 'X-Service-Provider-Id': spId } : {}),
          };
        },
        retryAttempts: 10,
        retryWait: async (retries) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
          const delay = Math.min(1000 * Math.pow(2, retries), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        },
        shouldRetry: () => true,
        keepAlive: 10000,
        on: {
          connected: () => setWsState('connected'),
          connecting: () => setWsState('reconnecting'),
          closed: () => setWsState('disconnected'),
          error: () => setWsState('disconnected'),
        },
      });
      return new GraphQLWsLink(wsClient);
    })()
  : null;

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
    Bot: { keyFields: ['id'] },
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
    BotActionLog: { keyFields: ['id'] },
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
