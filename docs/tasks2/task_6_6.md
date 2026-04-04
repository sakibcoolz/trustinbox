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

- [ ] Log in as a customer on the Web App
- [ ] Navigate to `/settings/blocked`
- [ ] Verify the block interface:
  - Search/browse available service providers
  - "Block" action button available
- [ ] Block a specific SP (e.g., "Acme Financial Services")
- [ ] Verify block persists:
  ```sql
  SELECT user_id, service_provider_id, created_at
  FROM blocked_service_providers
  WHERE user_id = '<user-id>' AND service_provider_id = '<sp-id>';
  ```
  - Row exists with correct timestamp
- [ ] Verify blocked SP appears in blocked list with "Unblock" button
- [ ] Verify `service_provider.blocked` event published

### Sub-task 6.6.2 — Policy: Notification Denied After Block

- [ ] From Provider Portal, attempt to send notification to the blocked customer:
  - Navigate to `/notifications/compose`
  - Select the customer who blocked the SP
  - Fill in notification details (any category)
  - Submit
- [ ] Verify policy evaluation returns DENIED:
  - DecisionCode: `USER_BLOCKED_SP`
  - Reason: "User has blocked this service provider"
  - Step: #3 (BLOCK_LIST_CHECK)
- [ ] Verify notification NOT created in notifications table (or status = REJECTED)
- [ ] Verify Provider Portal shows rejection:
  - Error toast or inline message: "Policy denied — user has blocked your organization"
- [ ] Check Jaeger trace:
  - `policy-service / Evaluate` span
  - Attribute: `trustinbox.policy_decision = DENY_USER_BLOCKED_SP`

### Sub-task 6.6.3 — Policy: Callback Denied After Block

- [ ] From Provider Portal, attempt to create callback request to the blocked customer:
  - Navigate to `/callbacks/new`
  - Select the same blocked customer
  - Fill in callback details
  - Submit
- [ ] Verify policy denies with same `DecisionDenyUserBlockedSP` code
- [ ] Verify callback NOT created in callback_requests table
- [ ] Verify Provider Portal shows callback was denied
- [ ] Confirm: block applies to ALL communication types, not just notifications

### Sub-task 6.6.4 — Policy: Conversation/Message Denied After Block

- [ ] From Provider Portal, attempt to send a message in an existing conversation with the blocked customer:
  - Navigate to `/conversations` → select conversation with blocked user
  - Type and send a message
- [ ] Verify message delivery blocked by policy
- [ ] Verify conversation list indicates blocked status for this customer
- [ ] New conversation creation from SP → blocked customer should fail policy check

### Sub-task 6.6.5 — Web App: Customer Does NOT Receive Communications

- [ ] After SP attempts notification, callback, and message (sub-tasks 6.6.2-6.6.4):
  - Log in as the customer on Web App
  - Navigate to `/inbox` → no new notification from blocked SP
  - Navigate to `/callbacks` → no new callback from blocked SP
  - Navigate to `/conversations` → no new message from blocked SP
- [ ] Verify customer's existing conversation history is still visible (historical messages preserved)
- [ ] Verify other (non-blocked) SPs can still communicate normally with this customer

### Sub-task 6.6.6 — Web App: Unblock the Service Provider

- [ ] Navigate to `/settings/blocked`
- [ ] Click "Unblock" on the previously blocked SP
- [ ] Verify unblock persists:
  ```sql
  SELECT * FROM blocked_service_providers
  WHERE user_id = '<user-id>' AND service_provider_id = '<sp-id>';
  ```
  - Row deleted — no result
- [ ] Verify SP removed from blocked list
- [ ] Verify `service_provider.unblocked` event published

### Sub-task 6.6.7 — Communication Restored After Unblock

- [ ] From Provider Portal, send notification to the (now unblocked) customer:
  - Same flow as Sub-task 6.6.2
  - Submit notification
- [ ] Verify policy evaluation now ALLOWS the communication:
  - Passes step #3 (BLOCK_LIST_CHECK)
  - Continues through remaining steps
  - Final decision: `ALLOW_STANDARD` (assuming all other checks pass)
- [ ] Verify notification delivered to customer
- [ ] Log in as customer on Web App → `/inbox` → notification appears
- [ ] Verify callback request also succeeds after unblock
- [ ] Verify conversation messaging also restored

### Sub-task 6.6.8 — Block Immediacy & Edge Cases

- [ ] **Immediate effect**: Block takes effect on the NEXT policy evaluation — no caching delay
  - Block SP → immediately attempt send → verify DENIED
- [ ] **Multiple blocks**: Customer can block multiple SPs
  - Block SP-A and SP-B
  - SP-A denied, SP-B denied, SP-C allowed
- [ ] **Re-block**: Customer can block the same SP again after unblocking
  - Block → Unblock → Block → verify denied again
- [ ] **Block does not affect other customers**: Only the blocking customer is affected
  - Customer-1 blocks SP-A, Customer-2 does not
  - SP-A → Customer-1: DENIED
  - SP-A → Customer-2: ALLOWED

---

## Verification Checklist

- [ ] Web App: block SP → persisted in blocked_service_providers table
- [ ] Policy: notification to blocked customer → `DecisionDenyUserBlockedSP`
- [ ] Policy: callback to blocked customer → `DecisionDenyUserBlockedSP`
- [ ] Policy: message to blocked customer → blocked
- [ ] Provider Portal: sees rejection reason when sending to blocked customer
- [ ] Web App: blocked customer receives NO communications from blocked SP
- [ ] Web App: unblock SP → row removed from blocked_service_providers
- [ ] Post-unblock: communication restored — notification/callback/message succeeds
- [ ] Block is immediate — no cache delay between block and policy enforcement
- [ ] Block is user-scoped — other customers unaffected
- [ ] Historical data preserved — existing conversations/notifications still visible
- [ ] Jaeger: traces show policy decision code for both blocked and unblocked scenarios
