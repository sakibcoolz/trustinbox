# Task 12.7 — Retry Failed Webhook Delivery

> **Section**: 12. Webhooks  
> **Priority**: P2 — Utility  
> **Estimated Scope**: Small  
> **Route**: `/webhooks`  
> **Status**: ✅ Complete

---

## Objective

Add a "Retry" action on failed webhook deliveries in the delivery log. Calls `retryWebhookDelivery(deliveryId, spId)` mutation.

---

## Current State

No retry functionality exists.

### GraphQL Schema

```graphql
mutation retryWebhookDelivery(deliveryId: ID!, serviceProviderId: ID!): Boolean!
```

---

## Requirements

- Retry button (refresh icon) on each row with status = Failed
- Calls `retryWebhookDelivery(deliveryId, spId)`
- Shows loading spinner during retry
- Refetches delivery log on success
- Toast: "Delivery retried" on success
- Disabled for successful or pending deliveries

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add retry button to delivery log rows |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add RETRY_WEBHOOK_DELIVERY mutation |

---

## Acceptance Criteria

- [ ] Retry button on failed delivery rows only
- [ ] Calls `retryWebhookDelivery` mutation
- [ ] Loading spinner during retry
- [ ] Refetches delivery log on success
- [ ] Toast notification

---

## Dependencies

- **Blocked by**: Task 12.6 (delivery log), Task 12.9 (mutations)
- **Blocks**: None
