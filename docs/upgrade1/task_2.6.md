# Task 2.6 — Apollo Client Auth Link

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/apollo.ts`

---

## Objective

Configure Apollo Client with proper link chain: auth headers, error handling with token refresh, HTTP transport, and WebSocket for subscriptions.

---

## Current State

No Apollo Client setup exists. The app currently uses REST via `fetch` in `api.ts`.

---

## Requirements

### 1. Apollo Link Chain
```
authLink → errorLink → splitLink(wsLink | httpLink)
```

### 2. Auth Link
- [ ] Inject `Authorization: Bearer <accessToken>` header
- [ ] Inject `X-Service-Provider-Id: <activeSpId>` header
- [ ] Read from `tokenManager` (task 2.5)

### 3. Error Link
- [ ] On 401 (UNAUTHENTICATED) error:
  1. Attempt token refresh via `tokenManager.refresh()`
  2. If success: retry the failed operation with `forward(operation)`
  3. If failure: clear tokens, redirect to `/auth/login`
- [ ] On network error: show toast "Network error. Check your connection."
- [ ] On other GraphQL errors: propagate to component for handling

### 4. HTTP Link
- [ ] Target: `process.env.NEXT_PUBLIC_GRAPHQL_URL || '/api/graphql'`
- [ ] Include credentials if needed

### 5. WebSocket Link (Subscriptions)
- [ ] Target: `process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql'`
- [ ] Pass auth token in `connectionParams`
- [ ] Auto-reconnect on disconnect with exponential backoff
- [ ] Use `graphql-ws` library

### 6. Split Link
- [ ] Route subscriptions to wsLink, queries/mutations to httpLink

### 7. Cache Configuration
- [ ] InMemoryCache with type policies for pagination merge
- [ ] Type policies for key entities: `User`, `Notification`, `CallbackRequest`, `Conversation`, `Campaign`, `Bot`

### 8. ApolloProvider Wrapper
- [ ] Create `ApolloWrapper` client component
- [ ] Wrap in `root layout.tsx` inside `AuthProvider`

---

## Implementation Plan

```tsx
// apps/provider/src/lib/apollo.ts
'use client';
import { ApolloClient, InMemoryCache, createHttpLink, split, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { tokenManager } from './token';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || '/api/graphql',
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: tokenManager.getAccessToken() ? `Bearer ${tokenManager.getAccessToken()}` : '',
    'x-service-provider-id': tokenManager.getActiveSpId() || '',
  },
}));

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        return fromPromise(tokenManager.refresh().then(success => {
          if (!success) { window.location.href = '/auth/login'; return; }
          const oldHeaders = operation.getContext().headers;
          operation.setContext({
            headers: { ...oldHeaders, authorization: `Bearer ${tokenManager.getAccessToken()}` },
          });
          return forward(operation);
        })).flatMap(x => x);
      }
    }
  }
  if (networkError) {
    console.error('[Network Error]', networkError);
  }
});

const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(createClient({
  url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
  connectionParams: () => ({
    authorization: tokenManager.getAccessToken() ? `Bearer ${tokenManager.getAccessToken()}` : '',
    'x-service-provider-id': tokenManager.getActiveSpId() || '',
  }),
  shouldRetry: () => true,
})) : null;

const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === 'OperationDefinition' && def.operation === 'subscription';
      },
      wsLink,
      from([authLink, errorLink, httpLink]),
    )
  : from([authLink, errorLink, httpLink]);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          notifications: { keyArgs: ['spId', 'status', 'category'], merge: offsetLimitPagination() },
          callbackRequests: { keyArgs: ['spId', 'status'], merge: offsetLimitPagination() },
          conversations: { keyArgs: ['spId', 'status'], merge: offsetLimitPagination() },
        },
      },
    },
  }),
  defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } },
});
```

```tsx
// apps/provider/src/components/ApolloWrapper.tsx
'use client';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/apollo.ts` | Create — Apollo Client + link chain |
| `apps/provider/src/components/ApolloWrapper.tsx` | Create — provider component |
| `apps/provider/src/app/layout.tsx` | Modify — wrap with `<ApolloWrapper>` |
| `apps/provider/package.json` | Modify — add `graphql-ws` dependency |

---

## Acceptance Criteria

- [ ] Apollo Client set up with auth headers injected on every request
- [ ] 401 triggers token refresh + retry transparently
- [ ] WebSocket connection established for subscriptions
- [ ] WS reconnects automatically on disconnect
- [ ] Cache merges paginated lists correctly
- [ ] Works during SSR (no window errors)
- [ ] `ApolloWrapper` wraps the app in layout.tsx

---

## Dependencies

- **Blocked by**: Task 2.5 (tokenManager)
- **Blocks**: Tasks 2.1 (login), 2.4 (useAuth), 3.8 (dashboard query), all GraphQL operations
- **Related**: Task 16.1 (real-time subscriptions)
