# Task 12.11 — Webhook Real-Time Subscription

> **Section**: 12. Webhooks — Connected Backend  
> **Priority**: P2 — Real-time  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/webhooks.ts`  
> **Status**: ✅ Complete

---

## Objective

Subscribe to `providerWebhookDeliveryCompleted(spId)` to receive real-time webhook delivery events. Update the delivery log table in real-time when new deliveries complete.

---

## GraphQL Schema

```graphql
type Subscription {
  providerWebhookDeliveryCompleted(serviceProviderId: ID!): WebhookDelivery!
}
```

---

## Requirements

- Define `WEBHOOK_DELIVERY_COMPLETED_SUBSCRIPTION` in `webhooks.ts`
- Hook: `useWebhookDeliveryUpdates(spId, onDelivery)`
- When a delivery event arrives:
  - If delivery log is expanded for that subscription, prepend to list
  - Update webhook's `lastDeliveryAt` / `lastFailureAt` in cache
  - Flash the row briefly to indicate new data
- Only subscribe when webhooks page is mounted

---

## Implementation Plan

```typescript
export const WEBHOOK_DELIVERY_COMPLETED = gql`
  subscription WebhookDeliveryCompleted($serviceProviderId: ID!) {
    providerWebhookDeliveryCompleted(serviceProviderId: $serviceProviderId) {
      id
      subscriptionId
      eventType
      eventId
      responseStatus
      attemptCount
      status
      durationMs
      createdAt
      completedAt
    }
  }
`;

export function useWebhookDeliveryUpdates(spId: string, onDelivery: (d: WebhookDelivery) => void) {
  useSubscription(WEBHOOK_DELIVERY_COMPLETED, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    onData: ({ data }) => {
      if (data.data?.providerWebhookDeliveryCompleted) {
        onDelivery(data.data.providerWebhookDeliveryCompleted);
      }
    },
  });
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add subscription + hook |
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Wire subscription to delivery log |

---

## Acceptance Criteria

- [ ] Subscription defined with all WebhookDelivery fields
- [ ] Hook with skip logic
- [ ] Delivery log updates in real-time
- [ ] New rows flash briefly
- [ ] Only subscribes when page is mounted

---

## Dependencies

- **Blocked by**: Task 12.6 (delivery log), Task 16.1 (WebSocket link)
- **Blocks**: None
