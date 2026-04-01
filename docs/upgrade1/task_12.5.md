# Task 12.5 — Test Webhook

> **Section**: 12. Webhooks  
> **Priority**: P2 — Utility  
> **Estimated Scope**: Small  
> **Route**: `/webhooks`  
> **Status**: ✅ Complete

---

## Objective

Add a "Test" action on each webhook row that sends a test payload to the endpoint URL, shows response status code and body.

---

## Current State

No test functionality exists.

### GraphQL Schema

```graphql
type TestWebhookResult {
  success: Boolean!
  responseStatus: Int
  responseBody: String
  durationMs: Int
}

mutation testWebhookSubscription(subscriptionId: ID!, serviceProviderId: ID!): TestWebhookResult!
```

---

## Requirements

- "Test" button on each webhook row (or in webhook detail)
- Calls `testWebhookSubscription(subscriptionId, spId)`
- Displays result inline or in a modal:
  - Success/failure icon
  - Response status code (e.g., 200, 404, 500)
  - Response body (truncated, scrollable)
  - Duration in milliseconds
- Loading state during test
- Only available for Active webhooks

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add test button + result display |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add TEST_WEBHOOK_SUBSCRIPTION mutation |

---

## Acceptance Criteria

- [ ] Test button on each active webhook row
- [ ] Calls `testWebhookSubscription` mutation
- [ ] Shows response status code, body, duration
- [ ] Success: green checkmark, Failure: red X
- [ ] Loading spinner during test
- [ ] Disabled for paused webhooks

---

## Dependencies

- **Blocked by**: Task 12.1 (table), Task 12.9 (mutations)
- **Blocks**: None
