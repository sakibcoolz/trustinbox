# Task 12.3 — Edit Webhook

> **Section**: 12. Webhooks  
> **Priority**: P1 — CRUD  
> **Estimated Scope**: Small  
> **Route**: `/webhooks`  
> **Status**: ✅ Complete

---

## Objective

Add an "Edit" action on each webhook row that opens a pre-filled form to update URL, events, status, and optionally regenerate the secret. Calls `updateWebhookSubscription` mutation.

---

## Current State

No edit functionality exists.

### GraphQL Schema

```graphql
input UpdateWebhookSubscriptionInput {
  subscriptionId: ID!
  serviceProviderId: ID!
  url: String
  description: String
  events: [String!]
  status: WebhookSubscriptionStatus
  newSecret: String
}

mutation updateWebhookSubscription(input: UpdateWebhookSubscriptionInput!): WebhookSubscription!
```

---

## Requirements

- Edit button on each webhook row → opens drawer/modal with pre-filled form
- Same fields as create form (URL, description, events, status)
- Optional: "Regenerate Secret" button (generates new secret, shows once)
- Active/Paused toggle
- Save button calls `updateWebhookSubscription`
- Cancel button closes without changes

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add edit drawer/modal |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add UPDATE_WEBHOOK_SUBSCRIPTION mutation |

---

## Acceptance Criteria

- [ ] Edit button on each webhook row
- [ ] Pre-filled form with current values
- [ ] URL validation (HTTPS)
- [ ] Event multi-select with current events pre-checked
- [ ] Active/Paused toggle
- [ ] Optional secret regeneration
- [ ] Calls `updateWebhookSubscription` mutation
- [ ] Refetches list on success

---

## Dependencies

- **Blocked by**: Task 12.1 (table), Task 12.2 (form pattern), Task 12.9 (mutations)
- **Blocks**: None
