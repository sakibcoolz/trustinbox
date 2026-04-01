# Task 5.5 — Notification Retry Action

> **Section**: 5. Notifications  
> **Priority**: P2  
> **Estimated Scope**: Small  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/components/notifications/NotificationDetailPanel.tsx`

---

## Objective

Add a retry action button for failed notifications that re-triggers delivery through the policy engine with a fresh policy re-evaluation.

---

## Current State

No retry functionality exists. Failed notifications are displayed but cannot be re-sent.

---

## Requirements

### 1. Retry Button
- Visible only in the expanded detail panel (task 5.4) for notifications with status `FAILED`
- Button: `RefreshCw` icon + "Retry Delivery" label
- Positioned in the expanded panel action bar

### 2. Retry Flow
1. User clicks "Retry Delivery"
2. Confirmation toast: "Retrying notification delivery…"
3. Call `retryNotification(id)` GraphQL mutation
4. Policy engine re-evaluates (may block if user preference changed)
5. On success: update status in table (optimistic update to `PENDING`)
6. On failure: show error toast with reason

### 3. GraphQL Mutation

```graphql
mutation RetryNotification($id: ID!) {
  retryNotification(id: $id) {
    id
    status
    # Updated fields
  }
}
```

> **Note**: If `retryNotification` mutation doesn't exist in schema yet, use `sendNotification` with original notification data as a workaround.
> **Status**: ✅ Complete

### 4. Conditional Rendering
- Only show for `FAILED` status
- Disable while retry is in-progress (loading spinner)
- Hide for `BLOCKED` (user preference won't change via retry)
- Permission: `notifications:write`

### 5. Optimistic Update
- Immediately change status badge to `PENDING`
- Revert to `FAILED` if mutation fails
- Add new delivery attempt to the timeline

---

## Implementation Plan

```tsx
// In NotificationDetailPanel.tsx
import { RefreshCw } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { RETRY_NOTIFICATION } from '@/lib/graphql/notifications';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';

function RetryButton({ notificationId, status }: { notificationId: string; status: string }) {
  const canRetry = usePermission('notifications:write');
  const { toast } = useToast();
  const [retry, { loading }] = useMutation(RETRY_NOTIFICATION, {
    variables: { id: notificationId },
    optimisticResponse: {
      retryNotification: { id: notificationId, status: 'PENDING', __typename: 'Notification' },
    },
    onCompleted: () => toast({ type: 'success', message: 'Notification retry queued' }),
    onError: (err) => toast({ type: 'error', message: `Retry failed: ${err.message}` }),
  });

  if (status !== 'FAILED' || !canRetry) return null;

  return (
    <button onClick={() => retry()} disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/10 transition-colors disabled:opacity-50">
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Retrying…' : 'Retry Delivery'}
    </button>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/notifications/NotificationDetailPanel.tsx` | Modify — add RetryButton |
| `apps/provider/src/lib/graphql/notifications.ts` | Modify — add RETRY_NOTIFICATION mutation |

---

## Acceptance Criteria

- [ ] Retry button visible only for FAILED notifications
- [ ] Permission-gated: requires `notifications:write`
- [ ] Optimistic update: status → PENDING immediately
- [ ] Reverts on mutation failure
- [ ] Loading spinner during retry
- [ ] Success/error toast notifications
- [ ] Not shown for BLOCKED status
- [ ] Disabled while in-progress

---

## Dependencies

- **Blocked by**: Task 5.4 (expanded detail panel), Task 5.12 (GraphQL notifications), Task 2.10 (usePermission), Task 1.7 (Toast)
- **Blocks**: None
- **Related**: Task 5.13 (sendNotification mutation — fallback for retry)
