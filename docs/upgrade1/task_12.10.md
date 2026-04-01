# Task 12.10 — Webhook GraphQL Queries

> **Section**: 12. Webhooks — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/webhooks.ts`  
> **Status**: ✅ Complete

---

## Objective

Add webhook-related GraphQL queries to `webhooks.ts`: `webhookSubscriptions(spId)`, `webhookSubscription(id)`, `webhookDeliveries(subscriptionId)`.

---

## GraphQL Schema Reference

```graphql
webhookSubscription(id: ID!, serviceProviderId: ID!): WebhookSubscription!
webhookSubscriptions(
  serviceProviderId: ID!
  status: WebhookSubscriptionStatus
  limit: Int
  offset: Int
): WebhookSubscriptionConnection!
webhookDeliveries(
  subscriptionId: ID!
  serviceProviderId: ID!
  status: WebhookDeliveryStatus
  limit: Int
  offset: Int
): WebhookDeliveryConnection!
```

---

## Requirements

### Queries

- `GET_WEBHOOK_SUBSCRIPTIONS` — list with filter by status, pagination
- `GET_WEBHOOK_SUBSCRIPTION` — single subscription by ID
- `GET_WEBHOOK_DELIVERIES` — delivery log per subscription with status filter

### Hooks

```typescript
export function useWebhookSubscriptions(spId: string, status?: string) { ... }
export function useWebhookSubscription(id: string, spId: string) { ... }
export function useWebhookDeliveries(subscriptionId: string, spId: string, status?: string) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add query definitions and hooks |

---

## Acceptance Criteria

- [ ] `GET_WEBHOOK_SUBSCRIPTIONS` with status filter + pagination
- [ ] `GET_WEBHOOK_SUBSCRIPTION` for single webhook detail
- [ ] `GET_WEBHOOK_DELIVERIES` with status filter + pagination
- [ ] Hooks with skip logic and cache-and-network policy

---

## Dependencies

- **Blocked by**: Task 12.9 (file creation)
- **Blocks**: Tasks 12.1, 12.6
