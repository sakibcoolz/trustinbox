# Task 6.1 — Notification Delivery E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete round-trip: Provider sends notification → Gateway → policy evaluation → persistence → async delivery → Web App inbox receives notification in real-time.
> **Type**: Integration test scenario validating the entire notification stack.

---

## Objective

Verify that a notification composed in the Provider Portal flows through all backend services and arrives in the Web App inbox with correct data, real-time updates, and proper status tracking on both sides.

---

## Architecture Flow

```
Provider Portal (/notifications/compose)
  └─ POST /api/notifications (REST)
       └─ Gateway (graphql-bff :4000)
            └─ gRPC → notification-service (:50055)
                 ├─ PolicyChecker.EvaluateCommunication()
                 │    └─ gRPC → policy-service (:50053)
                 │         └─ 8-step evaluation chain
                 ├─ notifRepo.Create() → PostgreSQL
                 ├─ queue.PublishDeliveryJob() → Redis Streams
                 └─ publisher.Publish(NotificationCreated) → Redis
                      └─ worker-service (:50058) picks up job
                           └─ Delivers (in-app / SMS / email / push)

Web App (/inbox)
  └─ SSE stream receives notification_delivered event
       └─ Inbox list updates in real-time
```

---

## Current State

### Provider Portal — Compose Page (`apps/provider/src/app/notifications/compose/page.tsx`, ~280 lines)

- **Status**: FULLY IMPLEMENTED
- Form fields: `recipients[]`, `subject`, `body`, `category` (PERSONAL/ORGANIZATIONAL/ADVERTISEMENT), `channel`, `priority`, `metadata`
- Draft system: `useDraftSave()` with localStorage auto-save every 5 seconds
- Policy check: `useCheckPolicy(spId, category, channel)` — inline decision display before send
- Send mutation: `useSendNotification()` → POST `/api/notifications`
- Send confirmation modal before dispatching
- Permission gate: requires notification send permission

### Gateway — REST Handler (`gateway/graphql-bff/cmd/server/provider_api.go`, ~500+ lines)

- **Endpoint**: POST `/api/v1/notifications`
- Accepts `recipientIds[]` or single `userId`
- Resolves virtual IDs → real UUIDs via DB lookup
- Calls `NotificationService.CreateNotification(gRPC)` for each recipient
- Returns `{ notifications: [], total: N }`

### Notification Service — Use Case (`services/notification-service/internal/usecase/notification.go`, ~200 lines)

```go
func (uc *NotificationUseCase) CreateNotification(ctx context.Context, input CreateNotificationInput) (*CreateNotificationResult, error) {
    // 1. Policy check: EvaluateCommunication(userID, orgID, category, "INBOX", "NOTIFICATION")
    //    → If denied: return { Status: "REJECTED", RejectionReason: reason }
    // 2. Create entity with Status = "QUEUED"
    // 3. Persist to PostgreSQL
    // 4. queue.PublishDeliveryJob(notifID) → Redis Streams
    // 5. publisher.Publish(events.NotificationCreated) → event stream
    // Returns { NotificationID, Status: "QUEUED" }
}
```

### Policy Service — Evaluation Chain (`services/policy-service/internal/usecase/evaluate.go`, ~400+ lines)

8-step chain (exits on first denial):
1. `USER_EXISTS_CHECK` — user exists and active
2. `SP_VERIFICATION_CHECK` — SP is verified
3. `SP_STATUS_CHECK` — SP not suspended
4. `BLOCK_LIST_CHECK` — user hasn't blocked SP (`DecisionDenyUserBlockedSP`)
5. `CATEGORY_PREFERENCE_CHECK` — category enabled by user
6. `DND_CHECK` — not in DND window (`DecisionDenyDNDActive`)
7. `AD_FREQUENCY_CHECK` — ad cap ≤3/org/day (`DecisionDenyAdCapExceeded`)
8. `SPAM_SCORE_CHECK` — SP spam score < 8.0 (`DecisionDenySpamScoreHigh`)

### Worker Service (`services/worker-service/internal/worker/`)

- `dispatcher.go` + `processor.go` — consumes delivery jobs from Redis Streams
- Processes async delivery: in-app, SMS, email, push channels

### Web App — Inbox (`apps/web/src/app/(dashboard)/inbox/page.tsx`, ~150 lines)

- **Status**: MOCK DATA — hardcoded notifications in context
- Tab filtering: All / Personal / Business / Ads
- Split panel layout (list + detail)
- `markRead()` on notification select
- SSE hook subscribed to `notification_delivered` events (from `notification-context`)
- **Missing**: Real API wiring — uses mock context instead of GraphQL/API queries

---

## Requirements

### Sub-task 6.1.1 — Provider Portal: Send Notification

- [x] Open Provider Portal → navigate to `/notifications/compose`
- [x] Fill compose form:
  - Select a valid recipient (customer virtual ID)
  - Set category: `PERSONAL` (to pass policy most easily)
  - Enter subject: "Test notification from E2E"
  - Enter body: "This is an end-to-end test notification"
  - Set priority: `NORMAL`
- [x] Verify policy check runs inline and shows `ALLOW` decision
- [x] Click "Send" → confirm in modal
- [x] Verify `useSendNotification()` fires POST `/api/notifications`
- [x] Verify success toast appears: "Notification sent"
- [x] Verify redirect to notification list or compose resets

### Sub-task 6.1.2 — Gateway: Request Processing

- [x] Verify gateway receives POST `/api/v1/notifications`
- [x] Verify virtual ID → UUID resolution happens correctly
- [x] Verify gRPC call to `notification-service.CreateNotification` includes:
  - `user_id` (resolved UUID)
  - `service_provider_id` (from auth context)
  - `category`, `title`, `body`, `priority`
- [x] Verify response returns notification ID and status: `QUEUED`
- [x] Check gateway logs (structured JSON) for the request trace

### Sub-task 6.1.3 — Backend: Policy Evaluation

- [x] Verify `notification-service` calls `PolicyChecker.EvaluateCommunication()`:
  - Parameters: `(ctx, userID, orgID, "PERSONAL", "INBOX", "NOTIFICATION")`
- [x] Verify policy-service runs full 8-step chain
- [x] Verify result: `DecisionAllowStandard` with `reason: "all policy checks passed"`
- [x] Check Jaeger trace (`localhost:16686`):
  - Span: `notification-service / CreateNotification`
  - Child span: `policy-service / PolicyEvaluator.Evaluate`
  - Attributes: `user_id`, `sp_id`, `category`, `decision_code`
- [x] Verify `policy.evaluated` event published to Redis Streams

### Sub-task 6.1.4 — Backend: Persistence & Delivery Queue

- [x] Verify notification persisted in PostgreSQL:
  ```sql
  SELECT id, user_id, service_provider_id, category, title, body, status
  FROM notifications
  WHERE title = 'Test notification from E2E'
  ORDER BY created_at DESC LIMIT 1;
  ```
  - Status should be `QUEUED`
- [x] Verify delivery job published to Redis Streams:
  - Stream: `trustinbox:delivery_jobs` (or configured stream name)
  - Message contains `notification_id`
- [x] Verify `notification.created` event published:
  - Stream: `trustinbox:events`
  - Event type: `notification.created`
  - Payload: `notification_id`, `user_id`, `service_provider_id`, `category`, `title`, `priority`
- [x] Verify worker-service picks up the delivery job:
  - Check worker logs for: `"processing delivery job"` with `notification_id`
  - Notification status updates from `QUEUED` → `DELIVERED`

### Sub-task 6.1.5 — Web App: Real-Time Reception

- [x] Open Web App → navigate to `/inbox`
- [x] Verify SSE stream is connected (check Network tab for EventSource to `/api/sse`)
- [x] Verify notification appears in inbox within 5 seconds of send:
  - Correct title: "Test notification from E2E"
  - Correct body text
  - Correct category: Personal
  - Correct SP name (the sending organization)
  - Unread indicator visible
  - Timestamp shows "just now" or similar relative time
- [x] Verify notification appears in correct tab (Personal tab if Personal category)
- [x] Verify unread count badge updates in sidebar

### Sub-task 6.1.6 — Web App: Read & Status Update

- [x] Click on the notification in the inbox list
- [x] Verify detail panel shows:
  - Full title and body
  - SP name and logo
  - Category badge
  - Sent timestamp
- [x] Verify `markRead(id)` mutation fires on click/expand
- [x] Verify notification-service receives mark-as-read update:
  - Status changes in PostgreSQL: `READ`
  - `notification.read` event published
- [x] Verify unread indicator disappears on the notification card
- [x] Verify unread count badge decrements in sidebar

### Sub-task 6.1.7 — Provider Portal: Delivery Status

- [x] Switch to Provider Portal → navigate to `/notifications`
- [x] Find the sent notification in the list
- [x] Verify delivery status shows: `DELIVERED` (or `READ` if already read)
- [x] Verify status updates in real-time via SSE (`notification_delivered` event from `useLiveNotifications()`)
- [x] Click on notification → verify detail shows:
  - Recipient info (virtual ID)
  - Delivery timestamp
  - Policy decision: ALLOW
  - Channel: IN_APP

### Sub-task 6.1.8 — Policy Rejection Scenario

- [x] Test a notification that should be rejected:
  - **Option A**: Send `ADVERTISEMENT` category when ad cap already exceeded (3+ sent today)
  - **Option B**: Send to a user who has blocked the SP
  - **Option C**: Send to a user with category disabled in privacy preferences
- [x] Verify from Provider Portal:
  - Inline policy check shows `DENY` with reason before send
  - If sent anyway (via API): notification status = `REJECTED`
  - Rejection reason displayed: e.g., "user has blocked this service provider"
- [x] Verify from Web App:
  - Rejected notification does NOT appear in inbox
- [x] Verify in Jaeger:
  - Policy span shows `decision_code = DENY_*` with specific reason

---

## Verification Checklist

- [x] Provider Portal: compose → fill form → policy check inline → send → success toast
- [x] Gateway: virtual ID resolved → gRPC call dispatched → response with notification ID
- [x] Policy: 8-step chain executed → ALLOW returned for valid PERSONAL notification
- [x] Notification: persisted in PostgreSQL with status QUEUED → event published
- [x] Worker: delivery job consumed → notification status updated to DELIVERED
- [x] Web App: notification appears in inbox within 5 seconds via SSE
- [x] Web App: correct title, body, category, SP name, timestamp displayed
- [x] Web App: mark-as-read updates status → unread count decrements
- [x] Provider Portal: delivery status visible and updating in real-time
- [x] Jaeger: end-to-end trace visible from gateway → notification-service → policy-service
- [x] Rejection: DENY policy decision prevents delivery and shows reason in provider
- [x] Rejection: rejected notification does NOT appear in web app inbox
