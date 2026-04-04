# Task 6.6 — Privacy Enforcement E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete block/unblock lifecycle: Customer blocks SP → All communications from that SP are denied by policy → Unblock restores access → Block is immediate and affects all communication types (notifications, callbacks, conversations).
> **Type**: Integration test scenario validating the privacy enforcement pipeline across user-service and policy-service.

---

## Objective

Verify that when a customer blocks a service provider, the policy engine immediately denies ALL communication types from that SP, and unblocking restores normal communication — with correct propagation across both the Web App and Provider Portal.

---

## Architecture Flow

```
Web App (/settings/blocked)
  └─ POST /api/blocked-providers (block)
       └─ Gateway → gRPC → user-service (:50052)
            ├─ blockRepo.Block(userID, spID) → PostgreSQL
            │    └─ INSERT INTO blocked_service_providers (user_id, sp_id)
            └─ publisher.Publish(ServiceProviderBlocked) → Redis

Policy Engine Impact (policy-service :50053):
  └─ evaluate.go → Step #3: BLOCK_LIST_CHECK
       ├─ userRepo.IsServiceProviderBlocked(userID, spID)
       │    ├─ true → DecisionDenyUserBlockedSP
       │    │    └─ "User has blocked this service provider"
       │    └─ false → continue to step #4
       └─ Affects ALL communication types:
            ├─ Notifications → REJECTED
            ├─ Callbacks → DENIED
            └─ Conversations → BLOCKED

Provider Portal Impact:
  └─ SP attempts to send notification/callback/message
       └─ Policy denies → SP sees rejection reason
       └─ Customer status shows "BLOCKED" in customer detail

Unblock Flow:
  └─ Web App → DELETE /api/blocked-providers/{spId}
       └─ user-service.UnblockServiceProvider(userID, spID)
            └─ blockRepo.Unblock() → DELETE FROM blocked_service_providers
                 └─ Next communication attempt: policy passes step #3
```

---

## Current State

### Web App — Blocked Providers (`apps/web/src/app/settings/blocked/page.tsx`, ~120 lines)

- **Status**: MOCK DATA — 3 hardcoded blocked organizations
- UI: List of blocked SPs with "Unblock" button
- Search bar for filtering
- Blocked date shown per SP
- **Needs**: Wire to real user-service API (via Apollo Client or REST)

### User Service — Block/Unblock (`services/user-service/internal/usecase/user.go`)

```go
func (uc *UserUseCase) BlockServiceProvider(ctx context.Context, userID, spID string) error {
    // → blockRepo.Block(ctx, userID, spID)
}

func (uc *UserUseCase) UnblockServiceProvider(ctx context.Context, userID, spID string) error {
    // → blockRepo.Unblock(ctx, userID, spID)
}
```

### Policy Service — Block Check (`services/policy-service/internal/usecase/evaluate.go`)

```go
// Step #3: USER_BLOCKED_SP_CHECK
blocked, err := pe.userRepo.IsServiceProviderBlocked(ctx, req.UserID, req.ServiceProviderID)
if blocked {
    return &EvaluationResult{
        Allowed:      false,
        DecisionCode: DecisionDenyUserBlockedSP,
        Reason:       "User has blocked this service provider",
        AppliedRules: appliedRules,
    }, nil
}
```

- Step #3 in the 8-step chain (after USER_EXISTS and SP_VERIFICATION)
- Checked BEFORE category preferences, DND, ad frequency, and spam score
- Blocks ALL communication types — no exception paths

### Provider Portal — Customer Detail

- Customer detail page shows relationship status
- Blocked customers: visual indicator, send actions disabled or show warning
- No direct "unblock on behalf of user" capability (privacy by design)

---

## Requirements

### Sub-task 6.6.1 — Web App: Block a Service Provider

- [x] Log in as a customer on the Web App
- [x] Navigate to `/settings/blocked`
- [x] Verify the block interface:
  - Search/browse available service providers
  - "Block" action button available
- [x] Block a specific SP (e.g., "Acme Financial Services")
- [x] Verify block persists:
  ```sql
  SELECT user_id, service_provider_id, created_at
  FROM blocked_service_providers
  WHERE user_id = '<user-id>' AND service_provider_id = '<sp-id>';
  ```
  - Row exists with correct timestamp
- [x] Verify blocked SP appears in blocked list with "Unblock" button
- [x] Verify `service_provider.blocked` event published

### Sub-task 6.6.2 — Policy: Notification Denied After Block

- [x] From Provider Portal, attempt to send notification to the blocked customer:
  - Navigate to `/notifications/compose`
  - Select the customer who blocked the SP
  - Fill in notification details (any category)
  - Submit
- [x] Verify policy evaluation returns DENIED:
  - DecisionCode: `USER_BLOCKED_SP`
  - Reason: "User has blocked this service provider"
  - Step: #3 (BLOCK_LIST_CHECK)
- [x] Verify notification NOT created in notifications table (or status = REJECTED)
- [x] Verify Provider Portal shows rejection:
  - Error toast or inline message: "Policy denied — user has blocked your organization"
- [x] Check Jaeger trace:
  - `policy-service / Evaluate` span
  - Attribute: `trustinbox.policy_decision = DENY_USER_BLOCKED_SP`

### Sub-task 6.6.3 — Policy: Callback Denied After Block

- [x] From Provider Portal, attempt to create callback request to the blocked customer:
  - Navigate to `/callbacks/new`
  - Select the same blocked customer
  - Fill in callback details
  - Submit
- [x] Verify policy denies with same `DecisionDenyUserBlockedSP` code
- [x] Verify callback NOT created in callback_requests table
- [x] Verify Provider Portal shows callback was denied
- [x] Confirm: block applies to ALL communication types, not just notifications

### Sub-task 6.6.4 — Policy: Conversation/Message Denied After Block

- [x] From Provider Portal, attempt to send a message in an existing conversation with the blocked customer:
  - Navigate to `/conversations` → select conversation with blocked user
  - Type and send a message
- [x] Verify message delivery blocked by policy
- [x] Verify conversation list indicates blocked status for this customer
- [x] New conversation creation from SP → blocked customer should fail policy check

### Sub-task 6.6.5 — Web App: Customer Does NOT Receive Communications

- [x] After SP attempts notification, callback, and message (sub-tasks 6.6.2-6.6.4):
  - Log in as the customer on Web App
  - Navigate to `/inbox` → no new notification from blocked SP
  - Navigate to `/callbacks` → no new callback from blocked SP
  - Navigate to `/conversations` → no new message from blocked SP
- [x] Verify customer's existing conversation history is still visible (historical messages preserved)
- [x] Verify other (non-blocked) SPs can still communicate normally with this customer

### Sub-task 6.6.6 — Web App: Unblock the Service Provider

- [x] Navigate to `/settings/blocked`
- [x] Click "Unblock" on the previously blocked SP
- [x] Verify unblock persists:
  ```sql
  SELECT * FROM blocked_service_providers
  WHERE user_id = '<user-id>' AND service_provider_id = '<sp-id>';
  ```
  - Row deleted — no result
- [x] Verify SP removed from blocked list
- [x] Verify `service_provider.unblocked` event published

### Sub-task 6.6.7 — Communication Restored After Unblock

- [x] From Provider Portal, send notification to the (now unblocked) customer:
  - Same flow as Sub-task 6.6.2
  - Submit notification
- [x] Verify policy evaluation now ALLOWS the communication:
  - Passes step #3 (BLOCK_LIST_CHECK)
  - Continues through remaining steps
  - Final decision: `ALLOW_STANDARD` (assuming all other checks pass)
- [x] Verify notification delivered to customer
- [x] Log in as customer on Web App → `/inbox` → notification appears
- [x] Verify callback request also succeeds after unblock
- [x] Verify conversation messaging also restored

### Sub-task 6.6.8 — Block Immediacy & Edge Cases

- [x] **Immediate effect**: Block takes effect on the NEXT policy evaluation — no caching delay
  - Block SP → immediately attempt send → verify DENIED
- [x] **Multiple blocks**: Customer can block multiple SPs
  - Block SP-A and SP-B
  - SP-A denied, SP-B denied, SP-C allowed
- [x] **Re-block**: Customer can block the same SP again after unblocking
  - Block → Unblock → Block → verify denied again
- [x] **Block does not affect other customers**: Only the blocking customer is affected
  - Customer-1 blocks SP-A, Customer-2 does not
  - SP-A → Customer-1: DENIED
  - SP-A → Customer-2: ALLOWED

---

## Verification Checklist

- [x] Web App: block SP → persisted in blocked_service_providers table
- [x] Policy: notification to blocked customer → `DecisionDenyUserBlockedSP`
- [x] Policy: callback to blocked customer → `DecisionDenyUserBlockedSP`
- [x] Policy: message to blocked customer → blocked
- [x] Provider Portal: sees rejection reason when sending to blocked customer
- [x] Web App: blocked customer receives NO communications from blocked SP
- [x] Web App: unblock SP → row removed from blocked_service_providers
- [x] Post-unblock: communication restored — notification/callback/message succeeds
- [x] Block is immediate — no cache delay between block and policy enforcement
- [x] Block is user-scoped — other customers unaffected
- [x] Historical data preserved — existing conversations/notifications still visible
- [x] Jaeger: traces show policy decision code for both blocked and unblocked scenarios
