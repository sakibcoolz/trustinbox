# Task 5.14 — GraphQL checkCommunicationPolicy Integration for Notifications

> **Section**: 5. Notifications — Connected Backend  
> **Priority**: P0  
> **Estimated Scope**: Small  
> **Route**: N/A (Data layer, shared with Customers section)  
> **File**: `apps/provider/src/lib/graphql/notifications.ts`

---

## Objective

Wire the `checkCommunicationPolicy` query into the notifications compose workflow, reusing the hook from task 4.14 and integrating it into the send flow as a mandatory pre-send validation.

---

## Current State

Mock policy check in compose page (see task 5.8 current state). The `useCheckPolicy` hook is defined in task 4.14 under `customers.ts`. This task ensures it's properly imported and integrated in the notifications flow.

---

## Requirements

### 1. Import from Customers GraphQL Module

```typescript
// In compose page or notification-specific wrapper
import { useCheckPolicy } from '@/lib/graphql/customers';
```

### 2. Pre-Send Validation Flow

```
User fills form → Policy auto-check → 
  IF allowed → Enable Send button → Confirmation modal → sendNotification
  IF blocked → Disable Send button → Show reason → Allow override for network errors only
```

### 3. Batch Policy Check (for multi-recipient)
When sending to multiple recipients:
- Check policy for each recipient (or first recipient as sample)
- Show summary: "X of Y recipients pass policy"
- Option: "Send to allowed recipients only" or "Cancel"

### 4. Re-Export Hook (optional convenience)

```typescript
// apps/provider/src/lib/graphql/notifications.ts — re-export for notification-specific import
export { useCheckPolicy } from './customers';
// OR wrap with notification-specific defaults:
export function useNotificationPolicyCheck() {
  const { checkPolicy, result, loading, error } = useCheckPolicy();
  return {
    checkBeforeSend: (spId: string, category: string, channel: string) =>
      checkPolicy(spId, category, channel),
    policyResult: result,
    checking: loading,
    checkError: error,
  };
}
```

### 5. Integration with Send Confirmation (task 5.10)
- Pass `policyResult` to `SendConfirmModal`
- Show warning in modal if policy has issues
- Block modal primary button if policy = blocked AND no override

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/notifications.ts` | Modify — add re-export or wrapper for policy check |
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — integrate policy check into send flow |

---

## Acceptance Criteria

- [ ] `checkCommunicationPolicy` called before every notification send
- [ ] Policy result passed to confirmation modal
- [ ] Send blocked when policy denies (blocked button)
- [ ] Graceful degradation on policy check failure (warning + allow)
- [ ] Multi-recipient: summarize allowed/blocked counts
- [ ] Reuses `useCheckPolicy` from task 4.14 (no duplication)

---

## Dependencies

- **Blocked by**: Task 4.14 (useCheckPolicy hook), Task 5.7 (NotificationComposer), Task 5.8 (policy pre-check UI)
- **Blocks**: None
- **Related**: Task 4.11 (customer detail policy check — same query), Task 7.13 (callback policy check)
