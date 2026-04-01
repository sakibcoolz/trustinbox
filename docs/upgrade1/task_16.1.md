# Task 16.1 — Apollo Client WebSocket Link

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P0 — Infrastructure  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add WebSocket transport (`graphql-ws`) to the Apollo Client provider for GraphQL subscriptions. The current setup only has `HttpLink`, `authLink`, and `errorLink`. No WebSocket link or subscription support exists.

---

## Current State

`apps/provider/src/lib/apollo-provider.tsx` (~100 lines):
- `httpLink` — `HttpLink({ uri: GRAPHQL_URL })`
- `authLink` — injects `Authorization` + `X-Service-Provider-Id` headers
- `errorLink` — handles 401 with token refresh and retry
- `cache` — `InMemoryCache` with typePolicies for common entities
- Client: `from([authLink, errorLink, httpLink])` — HTTP only
- `ApolloWrapper` component with `ApolloProvider`

### Missing

- No `WebSocketLink` or `graphql-ws` client
- No split link (HTTP for queries/mutations, WS for subscriptions)
- No connection params (auth token via WS)

---

## Requirements

### WebSocket Link

```typescript
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const WS_URL = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql';

const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(createClient({
      url: WS_URL,
      connectionParams: () => ({
        Authorization: `Bearer ${tokenManager.getAccessToken()}`,
        'X-Service-Provider-Id': tokenManager.getActiveSpId(),
      }),
      retryAttempts: 5,
      shouldRetry: () => true,
    }))
  : null;
```

### Split Link

```typescript
import { split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === 'OperationDefinition' && def.operation === 'subscription';
      },
      wsLink,
      from([authLink, errorLink, httpLink]),
    )
  : from([authLink, errorLink, httpLink]);
```

### Client Update

```typescript
const client = new ApolloClient({
  link: splitLink,  // was: from([authLink, errorLink, httpLink])
  cache,
  ...
});
```

### Package Dependency

```json
"graphql-ws": "^5.14.0"
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Add WebSocket link + split |
| `apps/provider/package.json` | **Modify** | Add `graphql-ws` dependency |

---

## Acceptance Criteria

- [ ] WebSocket link created with `graphql-ws`
- [ ] Split link routes subscriptions to WS, queries/mutations to HTTP
- [ ] Connection params include auth token and spId
- [ ] SSR-safe (wsLink is null on server)
- [ ] Retry logic configured
- [ ] `graphql-ws` added to dependencies

---

## Dependencies

- **Blocked by**: None
- **Blocks**: All subscription tasks (12.11, 16.2-16.6)
