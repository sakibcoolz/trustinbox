# Task 12.4 — Delete Webhook

> **Section**: 12. Webhooks  
> **Priority**: P1 — CRUD  
> **Estimated Scope**: Small  
> **Route**: `/webhooks`  
> **Status**: ✅ Complete

---

## Objective

Add a "Delete" action on each webhook row with a confirmation modal. Calls `deleteWebhookSubscription` mutation.

---

## Current State

No delete functionality exists.

### GraphQL Schema

```graphql
mutation deleteWebhookSubscription(subscriptionId: ID!, serviceProviderId: ID!): Boolean!
```

---

## Requirements

- Delete (trash icon) button on each webhook row
- Confirmation modal: "Delete webhook subscription to {url}? This cannot be undone."
- Shows event count and delivery count in confirmation
- Confirm button: red "Delete" CTA
- Cancel button to dismiss
- Calls `deleteWebhookSubscription` on confirm
- Refetches webhook list
- Toast notification on success

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add delete confirmation modal |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add DELETE_WEBHOOK_SUBSCRIPTION mutation |

---

## Acceptance Criteria

- [ ] Delete button on each webhook row
- [ ] Confirmation modal with webhook URL displayed
- [ ] Red "Delete" CTA + Cancel button
- [ ] Calls `deleteWebhookSubscription` mutation
- [ ] Refetches list on success
- [ ] Toast notification

---

## Dependencies

- **Blocked by**: Task 12.1 (table), Task 12.9 (mutations)
- **Blocks**: None
