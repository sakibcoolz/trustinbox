# Task 17.2 — Cache Normalization Strategy

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P1 — Data consistency  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Define and implement a cache normalization strategy for all entity types. Ensure consistent cache behavior across queries, mutations, and subscriptions.

---

## Requirements

### Normalization Rules

1. **All entities use `id` as the cache key** — unified keyFields
2. **List queries use `merge: false`** — replace entire list on refetch (no duplicates)
3. **Mutations update cache via `cache.modify` or `update` functions** — no refetchQueries unless unavoidable
4. **Subscriptions update cache in-place** — when a subscription delivers a new entity, write it to the cache

### Cache Update Patterns

#### After Mutation (add entity)

```typescript
update(cache, { data }) {
  cache.modify({
    fields: {
      webhookSubscriptions(existing = []) {
        const newRef = cache.writeFragment({
          data: data.createWebhookSubscription,
          fragment: WEBHOOK_SUBSCRIPTION_FRAGMENT,
        });
        return [...existing, newRef];
      },
    },
  });
}
```

#### After Mutation (remove entity)

```typescript
update(cache, { data }) {
  cache.evict({ id: cache.identify(data.deleteWebhookSubscription) });
  cache.gc();
}
```

#### Subscription (add to list)

```typescript
subscribeToMore({
  document: WEBHOOK_DELIVERY_SUBSCRIPTION,
  updateQuery: (prev, { subscriptionData }) => ({
    ...prev,
    webhookDeliveries: [subscriptionData.data.providerWebhookDeliveryCompleted, ...prev.webhookDeliveries],
  }),
});
```

### Fragment Definitions

Create reusable fragments for all entity types:

```typescript
// apps/provider/src/lib/graphql/fragments.ts
export const WEBHOOK_SUBSCRIPTION_FRAGMENT = gql`
  fragment WebhookSubscriptionFields on WebhookSubscription {
    id spId url description events status failureCount maxRetries lastDeliveryAt lastFailureAt createdAt updatedAt
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/fragments.ts` | **Create** | Reusable GraphQL fragments |
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Update typePolicies |

---

## Acceptance Criteria

- [ ] Fragments for all entity types
- [ ] Cache updates on mutations (no refetchQueries)
- [ ] Cache updates on subscriptions
- [ ] No duplicate entries in lists
- [ ] `cache.gc()` after evictions

---

## Dependencies

- **Blocked by**: Task 17.1 (Apollo setup)
- **Blocks**: Mutation tasks (12.6-12.10, 14.3-14.5, 15.10, 15.13)
