# Task 12.9 — Webhook GraphQL Mutations

> **Section**: 12. Webhooks — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/webhooks.ts`  
> **Status**: ✅ Complete

---

## Objective

Create `apps/provider/src/lib/graphql/webhooks.ts` with all webhook-related GraphQL mutations: `createWebhookSubscription`, `updateWebhookSubscription`, `deleteWebhookSubscription`, `testWebhookSubscription`, `retryWebhookDelivery`. Include TypeScript types and mutation hooks.

---

## GraphQL Schema Reference

```graphql
# Mutations
createWebhookSubscription(input: CreateWebhookSubscriptionInput!): WebhookSubscription!
updateWebhookSubscription(input: UpdateWebhookSubscriptionInput!): WebhookSubscription!
deleteWebhookSubscription(subscriptionId: ID!, serviceProviderId: ID!): Boolean!
testWebhookSubscription(subscriptionId: ID!, serviceProviderId: ID!): TestWebhookResult!
retryWebhookDelivery(deliveryId: ID!, serviceProviderId: ID!): Boolean!
```

---

## Requirements

### Mutations

- `CREATE_WEBHOOK_SUBSCRIPTION` — returns full WebhookSubscription fields
- `UPDATE_WEBHOOK_SUBSCRIPTION` — returns updated fields
- `DELETE_WEBHOOK_SUBSCRIPTION` — returns Boolean
- `TEST_WEBHOOK_SUBSCRIPTION` — returns TestWebhookResult
- `RETRY_WEBHOOK_DELIVERY` — returns Boolean

### TypeScript Types

```typescript
export interface WebhookSubscription {
  id: string;
  serviceProviderId: string;
  url: string;
  description?: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED';
  failureCount: number;
  maxRetries: number;
  lastDeliveryAt?: string;
  lastFailureAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  eventId: string;
  responseStatus?: number;
  attemptCount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface TestWebhookResult {
  success: boolean;
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/webhooks.ts` | **Create** | All webhook queries, mutations, types, hooks |

---

## Acceptance Criteria

- [ ] All 5 mutations defined with correct input types
- [ ] Query: `GET_WEBHOOK_SUBSCRIPTIONS` with filter/pagination
- [ ] Query: `GET_WEBHOOK_DELIVERIES` with filter/pagination
- [ ] TypeScript interfaces for all types
- [ ] Reusable hooks with loading/error states

---

## Dependencies

- **Blocked by**: None (schema defined)
- **Blocks**: Tasks 12.1-12.8
