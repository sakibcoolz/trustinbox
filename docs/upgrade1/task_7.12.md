# Task 7.12 — GraphQL providerCallbackRequestCreated Subscription

> **Section**: 7. Callback Requests — Connected Backend  
> **Priority**: P1 — Real-time  
> **Estimated Scope**: Medium  
> **Route**: N/A (subscription hook)  
> **File**: `apps/provider/src/lib/graphql/callbacks.ts`
> **Status**: ✅ Complete

---

## Objective

Create a GraphQL subscription for real-time notification when new callback requests are created, updating the callbacks table and showing a toast.

---

## Current State

No callback subscription exists in the frontend. Schema defines:

```graphql
type Subscription {
  providerCallbackRequestCreated(serviceProviderId: ID!): CallbackRequest!
}
```

---

## Requirements

### Subscription

```graphql
subscription ProviderCallbackRequestCreated($serviceProviderId: ID!) {
  providerCallbackRequestCreated(serviceProviderId: $serviceProviderId) {
    id
    serviceProvider { id name }
    reason
    details
    status
    requestedAt
    respondedAt
    approvedSlotStart
    approvedSlotEnd
  }
}
```

### Hook

```typescript
export function useCallbackRequestCreated(serviceProviderId: string) {
  return useSubscription(PROVIDER_CALLBACK_REQUEST_CREATED, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    onData({ client, data }) {
      const newRequest = data.data?.providerCallbackRequestCreated;
      if (!newRequest) return;

      // 1. Prepend to PENDING list in cache
      client.cache.modify({
        fields: {
          callbackRequests(existing, { storeFieldName }) {
            if (!storeFieldName.includes('PENDING')) return existing;
            const newRef = client.cache.writeFragment({ ... });
            return {
              ...existing,
              nodes: [newRef, ...existing.nodes],
              totalCount: existing.totalCount + 1,
            };
          },
        },
      });
    },
  });
}
```

### UI Integration
- Toast: "New callback request from {VID}" with link to row
- PENDING tab count increments
- If currently viewing PENDING tab, new row appears at top with highlight animation
- Browser tab title flash: "(1) New callback"
- Stats card "Pending Approval" increments

### Deduplication
- Check if callback ID already exists in cache before adding
- Ignore if already present (prevent double-adds from optimistic + subscription)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/callbacks.ts` | Modify — add subscription + hook |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — wire subscription, show toasts |

---

## Acceptance Criteria

- [ ] Subscription connects with serviceProviderId
- [ ] New requests appear in PENDING list in real-time
- [ ] Toast notification for new requests
- [ ] PENDING count updates
- [ ] Stats cards update
- [ ] Deduplication prevents duplicate entries
- [ ] Subscription reconnects on disconnect
- [ ] New row highlighted briefly on arrival

---

## Dependencies

- **Blocked by**: Task 7.10 (query types), Task 16.1 (WebSocket link)
- **Blocks**: None
- **Related**: Task 6.15 (providerMessageReceived — same pattern), Task 5.15 (notification subscription)
