# Task 2.13 — Field-Level Auth

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **File**: Various component files
> **Status**: ✅ Complete

---

## Objective

Implement field-level authorization: disable edit buttons, hide action columns, and restrict form submission for users with read-only roles.

---

## Current State

No field-level auth. All visible UI elements are interactive. An ANALYST could potentially click "Send Notification" if they navigated to the page.

---

## Requirements

### 1. Read-Only Mode Detection
```typescript
// In table components:
const canSend = usePermission('notifications:send');

// Action column:
{canSend && <button onClick={...}>Send</button>}

// Or disabled:
<button disabled={!canSend} className={!canSend ? 'opacity-50 cursor-not-allowed' : ''}>Send</button>
```

### 2. Patterns to Apply

| Feature | Element | Permission | Behavior |
|---------|---------|-----------|----------|
| Notifications | "Send" button | notifications:send | Hide for ANALYST |
| Notifications | Template editor | notifications:template:manage | Disable for AGENT/ANALYST |
| Campaigns | "Create Campaign" | campaigns:create | Hide for AGENT/ANALYST |
| Campaigns | "Launch" button | campaigns:launch | Hide for non-admin |
| Bots | "Create Bot" | bots:create | Hide for non-admin |
| Bots | "Deploy" button | bots:deploy | Hide for non-admin |
| Documents | "Delete" button | documents:delete | Hide for non-admin |
| Webhooks | All CRUD | webhooks:manage | Full page hidden (task 2.11) |
| Settings | Team tab | settings:team:manage | Tab hidden for non-admin |
| Table | Bulk action bar | varies | Hide specific actions based on permission |

### 3. Tooltip for Disabled Elements
- [x] When button is disabled due to permissions, show tooltip: "You don't have permission to perform this action"
- [x] Use title attribute or custom tooltip component

### 4. Form Read-Only Mode
- [x] For detail/edit views, detect if user has edit permission
- [x] If read-only: all form inputs disabled, no submit button
- [x] Show "View only" badge in form header

---

## Implementation Plan

```tsx
// Pattern 1: PermissionGate
<PermissionGate permission="notifications:send">
  <button onClick={handleSend}>Send Notification</button>
</PermissionGate>

// Pattern 2: Disabled with tooltip
const canDelete = usePermission('documents:delete');
<button 
  disabled={!canDelete} 
  title={!canDelete ? "You don't have permission to delete documents" : undefined}
  className={cn('...', !canDelete && 'opacity-50 cursor-not-allowed')}
  onClick={canDelete ? handleDelete : undefined}
>
  Delete
</button>

// Pattern 3: Read-only form
function DocumentForm({ readOnly }: { readOnly?: boolean }) {
  const canEdit = usePermission('documents:upload');
  const isReadOnly = readOnly || !canEdit;
  
  return (
    <form>
      {isReadOnly && <Badge variant="neutral">View only</Badge>}
      <input disabled={isReadOnly} ... />
      {!isReadOnly && <button type="submit">Save</button>}
    </form>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Multiple component files | Modify — add PermissionGate wrapping around action buttons |
| `apps/provider/src/components/ui/ActionButton.tsx` | Create (optional) — permission-aware button |

---

## Acceptance Criteria

- [x] ANALYST cannot see send/create/delete buttons
- [x] AGENT cannot see campaign create or bot create buttons
- [x] Disabled buttons show permission tooltip
- [x] Read-only views disable form inputs
- [x] "View only" badge shown on read-only forms
- [x] No action buttons are visible that the user can't actually perform

---

## Dependencies

- **Blocked by**: Task 2.10 (usePermission), Task 2.9 (permission matrix)
- **Blocks**: None (applied during feature implementation)
- **Related**: Task 2.12 (sidebar filtering)
