# Task 6.7 — DND Enforcement E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete DND (Do Not Disturb) lifecycle: Customer sets DND rules → Policy engine denies notifications during active DND windows → Notifications deferred or rejected → DND respects scope (global, per-organization, per-category), time zones, and day-of-week rules.
> **Type**: Integration test scenario validating the DND enforcement pipeline across user-service and policy-service.

---

## Objective

Verify that DND rules configured by the customer are correctly enforced by the policy engine, blocking or deferring communications during active DND windows, respecting rule scope and timing, and that communications resume normally outside the DND window.

---

## Architecture Flow

```
Web App (/settings/dnd)
  └─ POST /api/dnd-rules (create)
       └─ Gateway → gRPC → user-service (:50052)
            ├─ dndRepo.Create(rule) → PostgreSQL
            │    └─ INSERT INTO dnd_rules (id, user_id, scope_type, scope_ref_id,
            │         start_time, end_time, days_of_week)
            └─ publisher.Publish(DNDRuleCreated)

Policy Engine Impact (policy-service :50053):
  └─ evaluate.go → Step #5: DND_CHECK
       ├─ userRepo.GetDNDRules(userID)
       ├─ isDNDActive(rules, evalTime, category, spID)
       │    ├─ For each rule:
       │    │    ├─ Match scope: GLOBAL (all), ORGANIZATION (specific SP), CATEGORY (specific type)
       │    │    ├─ Match day: current weekday in DaysOfWeek[]
       │    │    └─ Match time: start_time ≤ current_time ≤ end_time
       │    ├─ Any match → DND active
       │    │    └─ DecisionDenyDNDActive
       │    │         └─ "Communication blocked: Do Not Disturb is active"
       │    └─ No match → continue to step #6
       └─ Affects: notifications, callbacks
            └─ Conversations: may still allow (implementation-dependent)

Outside DND Window:
  └─ Same communication attempt succeeds
       └─ Policy step #5 passes → continues through remaining checks
```

---

## Current State

### Web App — DND Settings (`apps/web/src/app/settings/dnd/page.tsx`, ~150 lines)

- **Status**: MOCK DATA — 2 hardcoded DND rules
- UI:
  - List of active DND rules
  - "Add Rule" form with scope, time window, days
  - Toggle to enable/disable individual rules
  - Delete button per rule
- **Needs**: Wire to real user-service API

### User Service — DND Rules (`services/user-service/internal/usecase/user.go`)

```go
func (uc *UserUseCase) CreateDNDRule(ctx context.Context, rule *entity.DNDRule) error {
    rule.ID = uuid.New().String()
    return uc.dndRepo.Create(ctx, rule)
}

func (uc *UserUseCase) ListDNDRules(ctx context.Context, userID string) ([]*entity.DNDRule, error) {
    return uc.dndRepo.ListByUserID(ctx, userID)
}
```

### DND Rule Entity

```go
type DNDRule struct {
    ID         string
    UserID     string
    ScopeType  string    // "GLOBAL" | "ORGANIZATION" | "CATEGORY"
    ScopeRefId string    // SP ID (for ORGANIZATION) or category name (for CATEGORY), empty for GLOBAL
    StartTime  string    // "22:00" (HH:MM format)
    EndTime    string    // "07:00" (HH:MM format)
    DaysOfWeek []string  // ["MONDAY", "TUESDAY", ...] — empty = all days
    CreatedAt  time.Time
    UpdatedAt  time.Time
}
```

### Policy Service — DND Check (`services/policy-service/internal/usecase/evaluate.go`)

```go
// Step #5: DND_CHECK
dndRules, err := pe.userRepo.GetDNDRules(ctx, req.UserID)
if isDNDActive(dndRules, time.Now(), req.Category, req.ServiceProviderID) {
    return &EvaluationResult{
        Allowed:      false,
        DecisionCode: DecisionDenyDNDActive,
        Reason:       "Communication blocked: Do Not Disturb is active",
        AppliedRules: appliedRules,
    }, nil
}
```

- Step #5 in the 8-step chain (after block check and category preferences)
- `isDNDActive()` checks all rules for the user → any match = DND active
- Scope matching: GLOBAL matches all, ORGANIZATION matches specific SP, CATEGORY matches specific type

---

## Requirements

### Sub-task 6.7.1 — Web App: Create Global DND Rule

- [x] Log in as a customer on the Web App
- [x] Navigate to `/settings/dnd`
- [x] Create a GLOBAL DND rule:
  - Scope: "All Communications" (GLOBAL)
  - Start time: current time (to make DND active NOW)
  - End time: 2 hours from now
  - Days: all days (or today's day)
- [x] Verify rule persisted:
  ```sql
  SELECT id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week
  FROM dnd_rules
  WHERE user_id = '<user-id>'
  ORDER BY created_at DESC LIMIT 1;
  ```
  - scope_type: `GLOBAL`
  - scope_ref_id: empty/null
  - start_time/end_time: match input
- [x] Verify rule appears in DND rules list with correct details

### Sub-task 6.7.2 — Policy: Notification Denied During DND

- [x] With the GLOBAL DND rule active (created in 6.7.1):
- [x] From Provider Portal, send notification to the customer:
  - Navigate to `/notifications/compose`
  - Select the DND-protected customer
  - Fill in any category notification
  - Submit
- [x] Verify policy evaluation returns DENIED:
  - DecisionCode: `DND_ACTIVE`
  - Reason: "Communication blocked: Do Not Disturb is active"
  - Step: #5 (DND_CHECK)
- [x] Verify notification NOT delivered to customer
- [x] Verify Provider Portal shows rejection with DND reason
- [x] Check Jaeger trace:
  - `policy-service / Evaluate` span
  - Attribute: `trustinbox.policy_decision = DENY_DND_ACTIVE`

### Sub-task 6.7.3 — Policy: Callback Denied During DND

- [x] With GLOBAL DND still active:
- [x] From Provider Portal, request callback with the DND-protected customer:
  - Navigate to `/callbacks/new`
  - Select the same customer
  - Submit callback request
- [x] Verify policy denies with `DecisionDenyDNDActive`
- [x] Verify callback NOT created
- [x] Confirm: DND blocks both notifications and callbacks

### Sub-task 6.7.4 — Communication Resumes Outside DND Window

- [x] Wait for DND window to expire (or update the rule to a past time window):
  ```sql
  UPDATE dnd_rules SET end_time = '<past-time>'
  WHERE user_id = '<user-id>' AND scope_type = 'GLOBAL';
  ```
- [x] From Provider Portal, send the same notification again
- [x] Verify policy evaluation now ALLOWS the communication:
  - Passes step #5 (DND_CHECK) — `isDNDActive()` returns false
  - Continues through remaining steps
  - Final decision: `ALLOW_STANDARD`
- [x] Verify notification delivered to customer
- [x] Log in as customer on Web App → `/inbox` → notification appears

### Sub-task 6.7.5 — Organization-Scoped DND Rule

- [x] Create an ORGANIZATION-scoped DND rule:
  - Scope: "Specific Organization"
  - Organization: Select "Acme Financial Services" (specific SP)
  - Start time: current time (active NOW)
  - End time: 2 hours from now
  - Days: all days
- [x] Verify rule persisted with:
  - scope_type: `ORGANIZATION`
  - scope_ref_id: SP ID of "Acme Financial Services"
- [x] **Test scoped blocking**:
  - Acme Financial → send notification → DENIED (DND active for this SP)
  - Other SP → send notification → ALLOWED (DND not active for this SP)
- [x] Verify `isDNDActive()` correctly matches:
  - Rule scope_ref_id == request.ServiceProviderID → DND active
  - Rule scope_ref_id != request.ServiceProviderID → DND not active

### Sub-task 6.7.6 — Category-Scoped DND Rule

- [x] Create a CATEGORY-scoped DND rule:
  - Scope: "Specific Category"
  - Category: "ADVERTISEMENT"
  - Start time: current time (active NOW)
  - End time: 2 hours from now
- [x] Verify rule persisted with:
  - scope_type: `CATEGORY`
  - scope_ref_id: `ADVERTISEMENT`
- [x] **Test category blocking**:
  - SP sends ADVERTISEMENT notification → DENIED
  - SP sends ORGANIZATIONAL notification → ALLOWED
  - SP sends PERSONAL notification → ALLOWED
- [x] Verify `isDNDActive()` matches on category field

### Sub-task 6.7.7 — Day-of-Week Rules

- [x] Create a DND rule with specific days:
  - Scope: GLOBAL
  - Start time: "00:00"
  - End time: "23:59"
  - Days: only weekdays (MONDAY through FRIDAY)
- [x] **If today is a weekday**:
  - Send notification → DENIED
- [x] **If today is a weekend** (or test by verifying rule logic):
  - Send notification → ALLOWED
- [x] Delete the test rule after verification

### Sub-task 6.7.8 — Multiple Rules & Delete

- [x] Create multiple overlapping DND rules:
  - Rule 1: GLOBAL, nights (22:00-07:00)
  - Rule 2: ORGANIZATION-scoped, all day for SP-A
  - Rule 3: CATEGORY-scoped, all day for ADVERTISEMENT
- [x] Verify any matching rule triggers DND:
  - During night → all communications blocked (Rule 1)
  - Outside night, SP-A → blocked (Rule 2)
  - Outside night, ADVERTISEMENT from SP-B → blocked (Rule 3)
  - Outside night, ORGANIZATIONAL from SP-B → ALLOWED (no rule matches)
- [x] Delete Rule 2 (ORGANIZATION-scoped):
  ```sql
  DELETE FROM dnd_rules WHERE id = '<rule-2-id>';
  ```
  - Or via Web App: click "Delete" on the rule
- [x] Verify SP-A communication now allowed (outside night hours)
- [x] Verify remaining rules still enforced

---

## Verification Checklist

- [x] Web App: create GLOBAL DND rule → persisted in dnd_rules table
- [x] Policy: notification during active DND → `DecisionDenyDNDActive`
- [x] Policy: callback during active DND → `DecisionDenyDNDActive`
- [x] Provider Portal: sees DND rejection reason
- [x] Communication resumes after DND window expires
- [x] ORGANIZATION-scoped DND: only blocks the specific SP, others unaffected
- [x] CATEGORY-scoped DND: only blocks specific category, other categories unaffected
- [x] Day-of-week filtering: DND only active on specified days
- [x] Multiple rules: any matching rule triggers DND
- [x] Rule deletion: removes enforcement for that rule only
- [x] Web App: customer does NOT receive communications during active DND
- [x] Jaeger: traces show DND decision code with rule details
