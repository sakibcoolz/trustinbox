# Task 7.9 — Bulk Actions (Approve/Reject)

> **Section**: 7. Callback Requests  
> **Priority**: P2 — Bulk workflow  
> **Estimated Scope**: Medium  
> **Route**: `/callbacks`  
> **Component**: Bulk action toolbar
> **Status**: ✅ Complete

---

## Objective

Implement multi-select with bulk approve and bulk reject actions for callback requests.

---

## Current State

No multi-select or bulk actions exist. Approve/Reject must be done individually per row.

---

## Requirements

### Multi-Select

| Feature | Detail |
|---------|--------|
| **Select checkbox** | Checkbox in first column of each row |
| **Select all** | Header checkbox selects all visible rows |
| **Count** | "X selected" indicator in toolbar |
| **Persist** | Selection persists across tab changes (within same page) |

### Bulk Actions Toolbar
- Slides up when >= 1 row selected
- Fixed at bottom of table area
- Actions:
  - **Bulk Approve** — opens modal with time slot picker for all selected (PENDING only)
  - **Bulk Reject** — opens modal with shared rejection reason (PENDING only)
  - **Clear Selection** — deselect all

### Constraints
- Only PENDING callbacks can be bulk approved/rejected
- Mixed selection (PENDING + others) → actions disabled with tooltip
- Maximum 50 items per bulk action
- Confirmation modal before execution

### Execution
- Sequential GraphQL mutations (batch not available in schema)
- Progress indicator: "Processing 3 of 10…"
- Summary on completion: "8 approved, 2 failed"
- Failed items shown with retry option

---

## Implementation Plan

```tsx
const [selected, setSelected] = useState<Set<string>>(new Set());

const allPending = [...selected].every(id =>
  callbacks.find(cb => cb.id === id)?.status === 'PENDING'
);

// Toolbar component
{selected.size > 0 && (
  <div className="sticky bottom-0 bg-bg-elevated border-t border-border-primary px-4 py-3 flex items-center gap-4">
    <span className="text-sm text-text-secondary">{selected.size} selected</span>
    <button disabled={!allPending} onClick={handleBulkApprove}
      className="px-3 py-1.5 bg-status-success/10 text-status-success rounded text-xs font-medium disabled:opacity-30">
      Approve Selected
    </button>
    <button disabled={!allPending} onClick={handleBulkReject}
      className="px-3 py-1.5 bg-status-error/10 text-status-error rounded text-xs font-medium disabled:opacity-30">
      Reject Selected
    </button>
    <button onClick={() => setSelected(new Set())} className="text-xs text-text-muted hover:text-text-secondary ml-auto">
      Clear
    </button>
  </div>
)}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/callbacks/BulkActionToolbar.tsx` | Create — bulk action toolbar |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — add checkboxes, selection state, toolbar |

---

## Acceptance Criteria

- [ ] Checkbox on each row + select all in header
- [ ] Toolbar appears when >= 1 selected
- [ ] "X selected" count displayed
- [ ] Bulk Approve/Reject disabled for non-PENDING selections
- [ ] Confirmation modal before execution
- [ ] Progress indicator during batch processing
- [ ] Summary of results (success/failure counts)
- [ ] Maximum 50 items per bulk action
- [ ] Clear selection button

---

## Dependencies

- **Blocked by**: Task 7.1 (CallbackRequestTable), Task 7.11 (approve/reject mutations)
- **Blocks**: None
- **Related**: Task 4.6 (bulk actions in customers — same pattern), Task 1.13 (Table — bulk select)
