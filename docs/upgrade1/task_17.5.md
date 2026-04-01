# Task 17.5 — Request Batching

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P3 — Performance  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Enable Apollo Client request batching to reduce HTTP overhead when multiple queries fire simultaneously (e.g., on initial page load or dashboard).

---

## Requirements

### Batch HTTP Link

Replace `HttpLink` with `BatchHttpLink`:

```typescript
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const httpLink = new BatchHttpLink({
  uri: GRAPHQL_URL,
  batchMax: 5,         // Max 5 operations per batch
  batchInterval: 20,   // Wait 20ms to collect operations
});
```

### Considerations

- Only batch queries — mutations should be sent individually
- Ensure the GraphQL gateway supports batch requests (`[{query1}, {query2}]` body format)
- Keep split link logic intact (subscriptions → WS, queries → batched HTTP, mutations → individual HTTP)

### Feature Flag

```typescript
const ENABLE_BATCHING = process.env.NEXT_PUBLIC_ENABLE_BATCH_REQUESTS === 'true';

const httpLink = ENABLE_BATCHING
  ? new BatchHttpLink({ uri: GRAPHQL_URL, batchMax: 5, batchInterval: 20 })
  : new HttpLink({ uri: GRAPHQL_URL });
```

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Add BatchHttpLink option |

---

## Acceptance Criteria

- [ ] BatchHttpLink configured with batchMax + batchInterval
- [ ] Feature-flagged via env variable
- [ ] Compatible with existing split link
- [ ] Mutations not batched
- [ ] No regressions in query results

---

## Dependencies

- **Blocked by**: Task 17.1 (Apollo setup)
- **Blocks**: None
