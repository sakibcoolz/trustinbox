# Task 12.6 — Webhook Delivery Log Table

> **Section**: 12. Webhooks  
> **Priority**: P1 — Monitoring  
> **Estimated Scope**: Medium  
> **Route**: `/webhooks`  
> **File**: `apps/provider/src/app/webhooks/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a per-webhook delivery history table showing event type, status code, response time, attempt count, status, and timestamp. Clicking a webhook row expands to show its delivery log, fetched via `webhookDeliveries(subscriptionId, spId)`.

---

## Current State

No delivery log exists.

### GraphQL Schema

```graphql
type WebhookDelivery {
  id: ID!
  subscriptionId: ID!
  eventType: String!
  eventId: String!
  responseStatus: Int
  attemptCount: Int!
  status: WebhookDeliveryStatus!
  durationMs: Int
  createdAt: DateTime!
  completedAt: DateTime
}

type WebhookDeliveryConnection {
  nodes: [WebhookDelivery!]!
  totalCount: Int!
}

query webhookDeliveries(
  subscriptionId: ID!
  serviceProviderId: ID!
  status: WebhookDeliveryStatus
  limit: Int
  offset: Int
): WebhookDeliveryConnection!
```

---

## Requirements

### Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Event Type | `eventType` | Badge chip |
| Event ID | `eventId` | Monospace, truncated |
| Status Code | `responseStatus` | Green 2xx, Yellow 3xx, Red 4xx/5xx |
| Attempts | `attemptCount` | Number |
| Status | `status` | Success/Failed/Pending badge |
| Duration | `durationMs` | e.g., "42ms" |
| Created | `createdAt` | Relative time |

### Features

- Expandable row on webhook click → shows delivery log below
- Status filter: All, Success, Failed, Pending
- Pagination (cursor-based)
- Loading skeleton
- Empty state: "No deliveries yet"

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add expandable delivery log section |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add GET_WEBHOOK_DELIVERIES query |

---

## Acceptance Criteria

- [ ] Delivery log fetches `webhookDeliveries(subscriptionId, spId)`
- [ ] All columns displayed with proper formatting
- [ ] Status code color-coded (2xx green, 4xx/5xx red)
- [ ] Status badges (Success, Failed, Pending)
- [ ] Expandable from webhook row
- [ ] Status filter
- [ ] Pagination
- [ ] Loading skeleton
- [ ] Empty state

---

## Dependencies

- **Blocked by**: Task 12.1 (table), Task 12.9/12.10 (queries)
- **Blocks**: Task 12.7 (retry action)
