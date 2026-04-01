# Task 7.13 — Policy Integration for Callbacks

> **Section**: 7. Callback Requests — Connected Backend  
> **Priority**: P0 — Policy gating  
> **Estimated Scope**: Medium  
> **Route**: N/A (integration)  
> **File**: `apps/provider/src/lib/graphql/callbacks.ts`
> **Status**: ✅ Complete

---

## Objective

Integrate the policy engine check (`checkCommunicationPolicy`) before creating callback requests, ensuring the mandatory policy gatekeeper is enforced.

---

## Current State

`checkCommunicationPolicy` query exists in the schema:

```graphql
checkCommunicationPolicy(
  serviceProviderId: ID!
  category: NotificationCategory!
  channel: String!
): PolicyCheckResult!
```

```graphql
type PolicyCheckResult {
  allowed: Boolean!
  decisionCode: String!
  reason: String!
  appliedRules: [String!]!
}
```

No frontend integration exists for callbacks. `customers.ts` has a reference to `checkCommunicationPolicy` for general policy checks.

---

## Requirements

### Pre-Check Hook

```typescript
export function useCheckCallbackPermission(userId: string, spId: string) {
  return useQuery(CHECK_COMMUNICATION_POLICY, {
    variables: {
      serviceProviderId: spId,
      category: 'PERSONAL',  // Callbacks are personal communications
      channel: 'CALLBACK',
    },
    skip: !userId || !spId,
    fetchPolicy: 'network-only',  // Always fresh check
  });
}
```

### Integration Points

| Location | Behavior |
|----------|----------|
| **Create Callback Form** (task 7.5) | Run check on customer selection, block submit if denied |
| **Detail Expansion** (task 7.4) | Show policy result for review |
| **Customer Actions** | "Request Callback" grayed out if policy denies |

### Policy Result Display

```tsx
function PolicyCheckResult({ result }: { result: PolicyCheckResult }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${
      result.allowed ? 'bg-status-success/10' : 'bg-status-error/10'
    }`}>
      {result.allowed ? (
        <CheckCircle2 className="text-status-success" size={16} />
      ) : (
        <XCircle className="text-status-error" size={16} />
      )}
      <div>
        <p className="text-sm font-medium">
          {result.allowed ? 'Callback allowed' : `Blocked: ${result.reason}`}
        </p>
        <p className="text-xs text-text-muted">
          Decision: {result.decisionCode} • Rules: {result.appliedRules.join(', ')}
        </p>
      </div>
    </div>
  );
}
```

### Policy Enforcement Rules
- `allowCallbackRequests` must be true in user's privacy preferences
- DND rules must not block the preferred time slot
- Rate limits must not be exceeded for this user
- Organization must be verified

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/callbacks.ts` | Modify — add policy check hook |
| `apps/provider/src/components/callbacks/PolicyCheckResult.tsx` | Create — policy result display |
| `apps/provider/src/app/callbacks/new/page.tsx` | Modify — integrate policy check |

---

## Acceptance Criteria

- [ ] Policy check runs on customer selection in create form
- [ ] "Callback allowed" / "Blocked: {reason}" displayed
- [ ] Submit button disabled when policy denies
- [ ] Decision code and applied rules shown
- [ ] Policy result displayed in detail expansion
- [ ] Network-only fetch (no stale cache)
- [ ] Customer Actions button disabled when blocked

---

## Dependencies

- **Blocked by**: Task 7.5 (create form), Task 7.4 (detail expansion), Task 4.14 (policy check query exists)
- **Blocks**: None
- **Related**: Task 5.8 (notification policy pre-check), Task 4.11 (policy check indicator)
