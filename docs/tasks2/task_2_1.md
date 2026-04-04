# Task 2.1 — Configure Apollo Client

> **Phase**: 2 — Web App: Foundation & Data Layer
> **File**: `apps/web/src/lib/apollo-client.ts`
> **Reference**: `apps/provider/src/lib/apollo-provider.tsx`

---

## Objective

Wire the existing Apollo Client with **auth headers** (Bearer token from localStorage), an **error link** (401 retry with token refresh, redirects on failure), and **cache type policies** for frequently accessed customer data. The web app currently has a bare-bones 16-line Apollo Client with no authentication or error handling.

---

## Current State

```typescript
// apps/web/src/lib/apollo-client.ts — 16 lines total
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || '/graphql',
  credentials: 'include',
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
```

**Gaps**:
- No `authLink` — Bearer token from `localStorage.getItem('accessToken')` is never sent
- No `errorLink` — 401/UNAUTHENTICATED errors are not caught or retried
- No cache `typePolicies` — entity normalization and list merge behavior undefined
- Unused imports: `split`, `getMainDefinition`
- `credentials: 'include'` is unnecessary since web app uses localStorage, not cookies

---

## Requirements

### Auth Link
- [x] Install `@apollo/client/link/context` (already bundled with `@apollo/client`)
- [x] Create `authLink` using `setContext` that reads `localStorage.getItem('accessToken')`
- [x] Attach `Authorization: Bearer <token>` header to every GraphQL request
- [x] Guard `localStorage` access with `typeof window !== 'undefined'` for SSR safety

### Error Link
- [x] Install `@apollo/client/link/error` (already bundled with `@apollo/client`)
- [x] Create `errorLink` using `onError` that handles:
  - [x] `UNAUTHENTICATED` GraphQL error → attempt token refresh → retry original operation
  - [x] Refresh uses `POST /api/auth/refresh` with `{ refreshToken }` from localStorage
  - [x] On successful refresh → update localStorage tokens → retry via `forward(operation)`
  - [x] On failed refresh → clear localStorage → redirect to `/auth/login`
  - [x] Use `Observable` pattern from provider app for async retry
- [x] Handle network errors:
  - [x] Status 401 → redirect to `/auth/login`
  - [x] Status 429 → log rate limit warning
  - [x] Other → log network error
- [x] Log non-auth GraphQL errors to console with operation name and path

### Cache Type Policies
- [x] Configure `InMemoryCache` with `typePolicies`:
  - [x] `Query.notifications` — `keyArgs: ['category', 'status']`, `merge: false`
  - [x] `Query.callbackRequests` — `keyArgs: ['status']`, `merge: false`
  - [x] `Query.conversations` — `keyArgs: false`, `merge: false`
  - [x] `Query.serviceProviders` — `keyArgs: ['search']`, `merge: false`
  - [x] Entity key fields: `Notification`, `CallbackRequest`, `Conversation`, `Message`, `ServiceProvider`, `User`, `DocumentShare` — all `keyFields: ['id']`

### Link Chain
- [x] Compose links with `from([authLink, errorLink, httpLink])`
- [x] Remove unused `split` and `getMainDefinition` imports
- [x] Remove `credentials: 'include'` (not needed for localStorage auth)
- [x] Export both the client singleton and a `resetApolloClient()` function for logout cleanup

### Token Refresh Logic
- [x] Read `refreshToken` from `localStorage.getItem('refreshToken')`
- [x] POST to gateway refresh endpoint: `${API_BASE}/api/auth/refresh`
- [x] On success: update `localStorage` with new `accessToken` and `refreshToken`
- [x] On failure: clear all auth keys (`accessToken`, `refreshToken`, `user`, `xmppToken`, `xmppJid`)

---

## Implementation Details

### Auth Link Pattern (web app — localStorage)
```typescript
const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')
    : null;
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});
```

### Error Link Pattern (adapted from provider)
```typescript
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        return new Observable((observer) => {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            clearAuthAndRedirect();
            observer.error(err);
            return;
          }
          fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }).then((res) => {
            if (res.ok) return res.json();
            throw new Error('Refresh failed');
          }).then((data) => {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            forward(operation).subscribe(observer);
          }).catch(() => {
            clearAuthAndRedirect();
            observer.error(err);
          });
        });
      }
    }
  }
  // ... handle networkError
});
```

### Cache Configuration Pattern
```typescript
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
```

---

## Key Differences from Provider App

| Aspect | Provider App | Web App |
|--------|-------------|---------|
| Auth storage | httpOnly cookies (auto-sent) | `localStorage` (manual injection) |
| Auth link | Injects `X-Service-Provider-Id` from cookie | Injects `Authorization: Bearer <token>` from localStorage |
| Token refresh | `POST /api/auth/refresh` (cookie-based, no body) | `POST /api/auth/refresh` with `{ refreshToken }` body |
| Redirect on failure | `window.location.href = '/auth/login'` | Same pattern |
| Batching | Feature-flagged `BatchHttpLink` | Not needed (simpler client) |
| WebSocket link | Prepared but disabled | Not needed (uses SSE + XMPP) |

---

## Verification Checklist

- [x] GraphQL requests include `Authorization: Bearer <token>` header when token exists
- [x] Requests without token send no Authorization header (public queries work)
- [x] 401/UNAUTHENTICATED triggers token refresh automatically
- [x] Successful refresh retries the failed operation transparently
- [x] Failed refresh clears localStorage and redirects to `/auth/login`
- [x] `resetApolloClient()` clears the Apollo cache store
- [x] No SSR errors (`localStorage` guarded with `typeof window` check)
- [x] Cache normalizes entities by `id` field
- [x] Notification/callback list queries use correct `keyArgs`

---

## Dependencies

- **Depends on**: Nothing (first task in Phase 2)
- **Blocks**: Task 2.2 (ApolloProvider), Task 2.3 (GraphQL queries), Task 2.4 (Custom hooks)

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/apollo-client.ts` | **Target file** — rewrite |
| `apps/provider/src/lib/apollo-provider.tsx` | Reference implementation |
| `apps/web/src/lib/auth-context.tsx` | Auth context — localStorage keys, refresh endpoint |
| `apps/web/package.json` | Already has `@apollo/client ^3.9.0` |
| `gateway/graphql-bff/graph/schema.graphqls` | GraphQL schema — type names for cache policies |
