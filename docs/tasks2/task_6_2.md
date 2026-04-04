# Task 6.2 — Callback Lifecycle E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the full callback lifecycle: Provider requests callback → Policy check → Customer receives → Customer approves/rejects → Provider sees status update → Callback executes or expires.
> **Type**: Integration test scenario validating the complete callback round-trip across both apps.

---

## Objective

Verify the full callback lifecycle flows correctly through all layers — from a provider requesting a callback, through policy evaluation, to the customer approving or rejecting it, with real-time status updates visible on both sides.

---

## Architecture Flow

```
Provider Portal (/callbacks/new)
  └─ POST /api/callbacks (REST)
       └─ Gateway (graphql-bff :4000)
            └─ gRPC → communication-service (:50056)
                 ├─ PolicyChecker.EvaluateCallbackPermission(userID, spID)
                 │    └─ gRPC → policy-service (:50053)
                 ├─ callbackRepo.Create() → PostgreSQL (status: PENDING)
                 └─ publisher.Publish(CallbackRequested) → Redis
                      └─ SSE → Web App receives callback event

Web App (/callbacks)
  └─ User approves with time slot
       └─ POST /api/callbacks/{id}/approve (GraphQL mutation)
            └─ Gateway → communication-service
                 ├─ callbackRepo.Approve(requestID, slotStart, slotEnd)
                 └─ publisher.Publish(CallbackApproved) → Redis
                      └─ SSE → Provider Portal receives approval event
```

---

## Current State

### Provider Portal — New Callback (`apps/provider/src/app/callbacks/new/page.tsx`, ~180 lines)

- **Status**: FULLY IMPLEMENTED with policy pre-check
- Form fields: `userId` (searchable virtual ID), `reason` (required), `details` (optional), `priority` (LOW/NORMAL/HIGH/URGENT)
- Workflow: select recipient → `handleCustomerBlur()` → policy check → show approval likelihood → confirm modal → submit
- Mutation: `useCreateCallbackRequest()` → POST `/api/callbacks`
- Permission gate: `usePermission('callbacks:manage')`

### Provider Portal — Mutations (`apps/provider/src/lib/mutations/callbacks.ts`, ~30 lines)

```tsx
useCreateCallbackRequest(input) → POST /api/callbacks
useApproveCallback(id, input)   → POST /api/callbacks/{id}/approve
useRejectCallback(id, input)    → POST /api/callbacks/{id}/reject
useCompleteCallback(id)         → POST /api/callbacks/{id}/complete
useAssignCallback(id, agentId)  → POST /api/callbacks/{id}/assign
```

### Communication Service — Use Case (`services/communication-service/internal/usecase/communication.go`, ~300 lines)

```go
// CreateCallbackRequest: policy check → set PENDING → persist → publish CallbackRequested
func (uc *CommunicationUseCase) CreateCallbackRequest(ctx, req) (*CallbackRequest, error)

// ApproveCallbackRequest: validate ownership + PENDING status → update slots → publish CallbackApproved
func (uc *CommunicationUseCase) ApproveCallbackRequest(ctx, requestID, userID, slotStart, slotEnd) error

// RejectCallbackRequest: validate ownership → set REJECTED → publish CallbackRejected
func (uc *CommunicationUseCase) RejectCallbackRequest(ctx, requestID, userID) error
```

### Policy Service — Callback Evaluation

- `EvaluateCallbackPermission(ctx, userID, spID)` runs subset of checks:
  - User exists, SP verified, not blocked, not in DND
- Decision: ALLOW or DENY with reason

### Web App — Callbacks Page (`apps/web/src/app/(dashboard)/callbacks/page.tsx`, ~180 lines)

- **Status**: MOCK DATA with hardcoded callbacks
- Tabs: All / PENDING / APPROVED / REJECTED / EXPIRED
- Detail panel with slot picker UI
- `handleApprove()` and `handleReject()` — NO API calls, local state only
- **Missing**: Real API wiring to backend

---

## Requirements

### Sub-task 6.2.1 — Provider Portal: Request Callback

- [x] Open Provider Portal → navigate to `/callbacks/new`
- [x] Fill callback request form:
  - Search and select a valid customer (virtual ID)
  - Enter reason: "Follow up on account inquiry"
  - Enter details: "Customer requested information about new account features"
  - Set priority: `NORMAL`
- [x] Verify policy pre-check runs on customer selection:
  - `handleCustomerBlur()` triggers `EvaluateCallbackPermission`
  - Shows green indicator if policy allows
  - Shows red indicator with reason if policy denies
- [x] Click "Submit" → confirm in modal
- [x] Verify `useCreateCallbackRequest()` fires POST `/api/callbacks`
- [x] Verify success toast: "Callback request created"
- [x] Verify redirect to callback list showing the new request with status `PENDING`

### Sub-task 6.2.2 — Backend: Policy Check & Persistence

- [x] Verify `communication-service` receives `CreateCallbackRequest`:
  - Calls `PolicyChecker.EvaluateCallbackPermission(ctx, userID, spID)`
  - Policy-service evaluates: user exists, SP verified, not blocked, not in DND
  - Returns ALLOW
- [x] Verify callback persisted in PostgreSQL:
  ```sql
  SELECT id, user_id, service_provider_id, reason, status, priority, requested_at
  FROM callback_requests
  WHERE reason = 'Follow up on account inquiry'
  ORDER BY requested_at DESC LIMIT 1;
  ```
  - Status: `PENDING`, priority: `NORMAL`
- [x] Verify `callback.requested` event published:
  - Event type: `callback.requested`
  - Payload: `callback_request_id`, `user_id`, `service_provider_id`, `status`
- [x] Check Jaeger trace:
  - Span: `communication-service / CreateCallbackRequest`
  - Child span: `policy-service / EvaluateCallbackPermission`

### Sub-task 6.2.3 — Web App: Receive & Display Callback

- [x] Open Web App → navigate to `/callbacks`
- [x] Verify callback appears in list (via SSE or page refresh):
  - Status badge: `PENDING` (yellow)
  - SP name: the requesting organization
  - Reason preview: "Follow up on account inquiry"
  - Requested timestamp: relative time
  - Priority indicator: NORMAL
- [x] Verify callback appears in "Pending" tab
- [x] Click on callback → detail panel shows:
  - Full reason and details text
  - SP information (name, logo, verification badge)
  - Priority badge
  - Requested timestamp
  - Available time slot picker

### Sub-task 6.2.4 — Web App: Approve Callback with Time Slot

- [x] In the callback detail panel, select a time slot:
  - Pick date: next business day
  - Pick time window: e.g., 2:00 PM — 3:00 PM
- [x] Click "Approve"
- [x] Verify mutation fires: `approveCallbackRequest(requestID, slotStart, slotEnd)`
  - POST to `/api/callbacks/{id}/approve` or GraphQL mutation
- [x] Verify `communication-service.ApproveCallbackRequest()` executes:
  - Validates: user owns request, status is PENDING
  - Updates status to `APPROVED`
  - Sets `slotStart` and `slotEnd` timestamps
  - Publishes `callback.approved` event
- [x] Verify callback status updates in Web App:
  - Badge changes: `PENDING` → `APPROVED` (green)
  - Scheduled time displayed
- [x] Verify success toast: "Callback approved — scheduled for [date/time]"

### Sub-task 6.2.5 — Provider Portal: See Approval

- [x] Switch to Provider Portal → navigate to `/callbacks`
- [x] Verify the callback status changed to `APPROVED`:
  - Real-time update via SSE (`callback_updated` event from `useLiveCallbacks()`)
  - Or visible on manual refresh
- [x] Verify approved time slot displayed:
  - Scheduled date and time window
- [x] Click callback detail → verify:
  - Status: APPROVED
  - Customer-selected time slot visible
  - Full reason and details

### Sub-task 6.2.6 — Reject Flow

- [x] Create a second callback request from Provider Portal
- [x] Switch to Web App → navigate to `/callbacks`
- [x] Click on the new pending callback
- [x] Click "Reject"
- [x] Verify reject mutation fires with reason input (if applicable)
- [x] Verify `communication-service.RejectCallbackRequest()` executes:
  - Validates ownership and PENDING status
  - Updates status to `REJECTED`
  - Sets `respondedAt` timestamp
  - Publishes `callback.rejected` event
- [x] Verify in Web App:
  - Status changes to `REJECTED` (red badge)
  - Callback moves to "Rejected" tab
- [x] Verify in Provider Portal:
  - Status shows `REJECTED`
  - Rejection reason visible (if customer provided one)

### Sub-task 6.2.7 — Expiry Scenario

- [x] Verify expired callback handling:
  - Create a callback request and leave it as `PENDING`
  - Check if there is an expiry mechanism:
    - Worker-service cron/scheduled job that marks old PENDING requests as `EXPIRED`
    - Or application-level check on page load
  - Verify in PostgreSQL:
    ```sql
    UPDATE callback_requests SET status = 'EXPIRED'
    WHERE status = 'PENDING' AND requested_at < NOW() - INTERVAL '48 hours';
    ```
  - Verify expired callbacks show in "Expired" tab in both apps
  - Verify provider sees `EXPIRED` status with no customer response

### Sub-task 6.2.8 — Policy Denial Scenario

- [x] Test callback request that should be denied by policy:
  - **Option A**: Customer has blocked the SP → `DecisionDenyUserBlockedSP`
  - **Option B**: Customer is in DND window → `DecisionDenyDNDActive`
  - **Option C**: SP is unverified → `DecisionDenySPNotVerified`
- [x] Verify from Provider Portal:
  - Policy pre-check shows denial reason inline before submission
  - If submitted anyway: request fails with policy denial error
  - Error toast: "Policy denied: [reason]"
- [x] Verify callback does NOT appear in Web App inbox
- [x] Verify Jaeger trace shows policy denial decision

---

## Verification Checklist

- [x] Provider: compose callback → policy pre-check → submit → success toast → appears in list with PENDING
- [x] Backend: policy evaluation passes → callback persisted with PENDING → event published
- [x] Web App: callback appears with correct SP name, reason, priority → Pending tab
- [x] Web App: approve with time slot → status changes to APPROVED → toast shown
- [x] Provider: sees APPROVED status with scheduled time via real-time SSE update
- [x] Web App: reject → status changes to REJECTED → moves to Rejected tab
- [x] Provider: sees REJECTED status with reason
- [x] Expiry: unresponded PENDING callbacks eventually marked EXPIRED
- [x] Policy denial: blocked/DND/unverified → request denied → doesn't reach customer
- [x] Jaeger: traces visible for create → policy → approve/reject lifecycle
- [x] Both apps: correct timestamps, status badges, and real-time sync at each stage
