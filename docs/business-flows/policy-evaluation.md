# Business Flow: Policy Evaluation Engine

## Overview

The policy service is the **mandatory gatekeeper** for all communication on TrustInbox. Every notification, callback request, campaign target, bot action, and advertisement must pass through policy evaluation before reaching a customer. No exceptions.

## Actors

- **Any Service**: Requests policy evaluation (notification-service, communication-service, bot-service, etc.)
- **Policy Service**: Evaluates the request against user preferences and platform rules
- **User Service**: Provides user preferences, DND rules, blocked list (via gRPC)
- **Organization Service**: Provides SP verification status, spam score

## Evaluation Chain

The policy engine runs a sequential chain of checks. If any check fails, evaluation stops immediately with a DENY decision.

```
┌─────────────────────────────────────────────────┐
│ 1. User Exists?                                 │
│    └── DENY: user_not_found                     │
├─────────────────────────────────────────────────┤
│ 2. Service Provider Verified?                   │
│    └── DENY: sp_not_verified                    │
├─────────────────────────────────────────────────┤
│ 3. Service Provider Suspended?                  │
│    └── DENY: sp_suspended                       │
├─────────────────────────────────────────────────┤
│ 4. User Blocked SP?                             │
│    └── DENY: sp_blocked_by_user                 │
├─────────────────────────────────────────────────┤
│ 5. Category Enabled by User?                    │
│    ├── Personal: AllowPersonalNotifications      │
│    ├── Service Provider: AllowSPNotifications    │
│    └── Advertisement: AllowAdvertisements        │
│    └── DENY: category_disabled                  │
├─────────────────────────────────────────────────┤
│ 6. DND Active?                                  │
│    ├── Check current time against DND rules     │
│    ├── Supports overnight windows (22:00-07:00) │
│    └── DENY: dnd_active                         │
├─────────────────────────────────────────────────┤
│ 7. Callback Approval Required?                  │
│    ├── If RequireCallbackApproval = true         │
│    └── DENY: callback_approval_required          │
│       (for callback requests only)               │
├─────────────────────────────────────────────────┤
│ 8. Ad Cap Exceeded?                             │
│    ├── Max 3 ads per SP per user per day        │
│    └── DENY: ad_cap_exceeded                    │
├─────────────────────────────────────────────────┤
│ 9. Spam Score Check                             │
│    ├── Threshold: 8.0                           │
│    └── DENY: spam_score_exceeded                │
├─────────────────────────────────────────────────┤
│ ✅ ALL CHECKS PASSED → ALLOW                    │
└─────────────────────────────────────────────────┘
```

## Input Context

Every policy evaluation receives:

```go
type EvaluationInput struct {
    UserID            string    // Target customer
    ServiceProviderID string    // Requesting SP
    Category          string    // personal / service_provider / advertisement
    Action            string    // notification / callback / campaign / bot_action
    Channel           string    // in_app / sms / email / push
    ScheduledTime     time.Time // For DND check (optional)
}
```

## Output Decision

```go
type EvaluationResult struct {
    Allowed bool
    Reason  string  // Empty if allowed, denial code if denied
    Details string  // Human-readable explanation
}
```

## Category-Specific Rules

### Personal Notifications
- Controlled by `AllowPersonalNotifications` preference
- Not subject to ad caps
- Exempt from spam scoring (trusted contacts only)

### Service Provider Notifications
- Controlled by `AllowSPNotifications` preference
- SP must be VERIFIED
- Subject to DND rules
- Subject to spam scoring

### Advertisements
- Controlled by `AllowAdvertisements` preference (opt-in)
- Subject to ad cap: **3 per SP per user per day**
- Subject to DND rules
- Subject to spam scoring
- Must be explicitly opted in by the user

## DND Rule Evaluation

```
DND Rule: { start_time: "22:00", end_time: "07:00", days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }

Evaluation at 23:30 on Tuesday:
  → Is Tuesday in the day list? YES
  → Is 23:30 between 22:00 and 07:00? YES (overnight window handling)
  → DENY: dnd_active

Evaluation at 08:00 on Tuesday:
  → Is Tuesday in the day list? YES
  → Is 08:00 between 22:00 and 07:00? NO
  → PASS (continue to next check)
```

## Audit Logging

Every policy evaluation is logged:

```json
{
  "evaluation_id": "uuid",
  "user_id": "uuid",
  "service_provider_id": "uuid",
  "category": "advertisement",
  "action": "notification",
  "decision": "DENY",
  "reason": "ad_cap_exceeded",
  "details": "SP has already sent 3 ads to this user today",
  "evaluated_at": "2025-01-15T10:30:00Z",
  "trace_id": "otel-trace-id"
}
```

Audit logs are:
- Stored in PostgreSQL for 365 days (configurable per industry)
- Visible to SP in the Compliance Center
- Visible to Platform Admin in the admin dashboard
- Exported for regulatory compliance

## Business Rules

- **Sequential evaluation**: Checks run in order; first DENY stops the chain
- **All communication types gated**: Notifications, callbacks, campaigns, bot actions, document shares
- **Immutable decisions**: Once evaluated, the decision is logged and not revisited
- **Industry compliance**: Healthcare (730-day retention), Banking (365-day retention)
- **DND priority**: DND rules override all other ALLOW decisions
- **Verified-only**: Unverified SPs cannot pass policy for any communication type
- **Real-time evaluation**: Policy is checked at delivery time, not at creation time (preferences may change)

## Integration Points

| Service | How It Uses Policy |
|---------|-------------------|
| notification-service | Evaluates before creating notification |
| communication-service | Evaluates before creating callback request |
| bot-service | Evaluates before executing bot action |
| worker-service | Re-evaluates at delivery time for scheduled items |
| campaign fan-out | Evaluates each individual target |
| webhook-service | Does NOT go through policy (SP's own endpoint) |

## Error Cases

- Policy service unavailable → fail-closed (DENY all communication)
- User preferences not found → default to most restrictive settings
- SP record not found → DENY with `sp_not_found`
- Invalid category → DENY with `invalid_category`

## Events Published

| Event | Trigger |
|-------|---------|
| `policy.evaluated` | Every evaluation (allow or deny) |
| `policy.denied` | Specifically when a communication is denied |
