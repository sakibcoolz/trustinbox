# Task 4.6 — Customer Bulk Actions Toolbar

> **Section**: 4. Customers  
> **Priority**: P2  
> **Estimated Scope**: Medium  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement a floating bulk actions toolbar that appears when one or more customers are selected via checkboxes, providing "Send Notification" and "Add to Campaign" actions.

---

## Current State

No checkbox selection or bulk actions exist. The table has no selection mechanism.

---

## Requirements

### 1. Selection Mechanism
- Each row has a checkbox in the leftmost column
- Header checkbox selects/deselects all visible rows (current page only)
- Indeterminate state when some (not all) rows are selected
- Selected count tracked in `Set<string>` by `virtualId`

### 2. Bulk Actions Toolbar
- Appears as a sticky bar at bottom of viewport when `selectedIds.size > 0`
- Slide-up animation (`animate-slide-up`)
- Background: `bg-bg-elevated border border-border-primary rounded-xl shadow-lg`

### 3. Toolbar Contents

| Element | Position | Behavior |
|---------|----------|----------|
| Selected count | Left | `"3 customers selected"` |
| "Send Notification" | Center | Opens compose page with pre-filled recipients |
| "Add to Campaign" | Center | Opens campaign selector modal |
| "Deselect All" | Right | Clears selection |

### 4. Actions

**Send Notification**:
- Navigate to `/notifications/compose?recipients=VID-a,VID-b,VID-c`
- Compose page reads recipients from URL and pre-fills target

**Add to Campaign**:
- Open modal with campaign list (active drafts/scheduled)
- Select campaign → mutation to add recipients
- Requires `CONTENT_MANAGER+` role

### 5. Component API

```typescript
interface BulkActionsToolbarProps {
  selectedCount: number;
  onSendNotification: () => void;
  onAddToCampaign: () => void;
  onDeselectAll: () => void;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/BulkActionsToolbar.tsx
import { Send, Megaphone, X } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

export function BulkActionsToolbar({ selectedCount, onSendNotification, onAddToCampaign, onDeselectAll }: BulkActionsToolbarProps) {
  const canManageCampaigns = usePermission('campaigns:write');

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-bg-elevated border border-border-primary rounded-xl shadow-lg animate-slide-up">
      <span className="text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{selectedCount}</span> customer{selectedCount > 1 ? 's' : ''} selected
      </span>
      <div className="h-4 w-px bg-border-secondary" />
      <button onClick={onSendNotification}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
        <Send size={14} /> Send Notification
      </button>
      {canManageCampaigns && (
        <button onClick={onAddToCampaign}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors">
          <Megaphone size={14} /> Add to Campaign
        </button>
      )}
      <div className="h-4 w-px bg-border-secondary" />
      <button onClick={onDeselectAll}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
        <X size={12} /> Deselect
      </button>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/BulkActionsToolbar.tsx` | Create |
| `apps/provider/src/app/customers/page.tsx` | Modify — add selection state + render BulkActionsToolbar |

---

## Acceptance Criteria

- [ ] Checkbox on each row + select-all in header
- [ ] Indeterminate header checkbox when partial selection
- [ ] Floating toolbar appears on selection with slide-up animation
- [ ] Shows selected count
- [ ] "Send Notification" navigates to compose with pre-filled recipients
- [ ] "Add to Campaign" opens campaign selector (permission-gated)
- [ ] "Deselect All" clears all selections
- [ ] Toolbar disappears when no rows selected
- [ ] Checkbox click doesn't trigger row navigation

---

## Dependencies

- **Blocked by**: Task 4.1 (Customer table with checkboxes), Task 2.10 (usePermission)
- **Blocks**: None
- **Related**: Task 5.7 (NotificationComposer recipient pre-fill), Task 9.5 (Campaign audience selection)
