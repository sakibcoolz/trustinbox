# Task 7.2 — Callback Status Badges

> **Section**: 7. Callback Requests  
> **Priority**: P0 — Visual indicator  
> **Estimated Scope**: Small  
> **Route**: `/callbacks`  
> **Component**: `CallbackRequestTable` rows
> **Status**: ✅ Complete

---

## Objective

Implement color-coded status badges for callback request statuses using the schema-aligned `CallbackRequestStatus` enum: Pending (yellow), Approved (green), Rejected (red), Expired (gray), Completed (blue).

---

## Current State

```tsx
// apps/provider/src/app/callbacks/page.tsx
const statusColors: Record<string, string> = {
  Pending: 'bg-status-warning/10 text-status-warning',
  Approved: 'bg-accent-blue/10 text-accent-blue',
  Completed: 'bg-status-success/10 text-status-success',
  Missed: 'bg-status-error/10 text-status-error',
  Rejected: 'bg-border-secondary text-text-muted',
};
```

**Issues**:
- Uses string-based statuses not matching GraphQL enum (`PENDING`/`APPROVED`/`REJECTED`/`RESCHEDULED`/`EXPIRED`)
- "Completed" and "Missed" are not schema statuses
- No icon paired with badge
- Colors inconsistent (Approved=blue, Completed=green — schema has no Completed status)

---

## Requirements

### Status Badge Mapping

| Schema Enum | Label | Icon | Color |
|-------------|-------|------|-------|
| `PENDING` | Pending | `Clock` | `bg-status-warning/10 text-status-warning` |
| `APPROVED` | Approved | `CheckCircle2` | `bg-status-success/10 text-status-success` |
| `REJECTED` | Rejected | `XCircle` | `bg-status-error/10 text-status-error` |
| `RESCHEDULED` | Rescheduled | `Calendar` | `bg-accent-blue/10 text-accent-blue` |
| `EXPIRED` | Expired | `AlertCircle` | `bg-border-secondary text-text-muted` |

### Badge Component Pattern
- Reuse project Badge/Status pill component (task 1.18)
- `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium`
- Icon size: 12px

---

## Implementation Plan

```tsx
import { Clock, CheckCircle2, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { CallbackRequestStatus } from '@/lib/graphql/callbacks';

const statusConfig: Record<CallbackRequestStatus, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  PENDING:     { label: 'Pending',     icon: Clock,        color: 'bg-status-warning/10 text-status-warning' },
  APPROVED:    { label: 'Approved',    icon: CheckCircle2, color: 'bg-status-success/10 text-status-success' },
  REJECTED:    { label: 'Rejected',    icon: XCircle,      color: 'bg-status-error/10 text-status-error' },
  RESCHEDULED: { label: 'Rescheduled', icon: Calendar,     color: 'bg-accent-blue/10 text-accent-blue' },
  EXPIRED:     { label: 'Expired',     icon: AlertCircle,  color: 'bg-border-secondary text-text-muted' },
};

function CallbackStatusBadge({ status }: { status: CallbackRequestStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} /> {config.label}
    </span>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/CallbackRequestTable.tsx` | Modify — replace string statuses with enum-based badges |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — update statusColors to match schema |

---

## Acceptance Criteria

- [ ] Badges use schema enum values (PENDING, APPROVED, REJECTED, RESCHEDULED, EXPIRED)
- [ ] Each badge has icon + label + correct color
- [ ] Consistent with Badge component pattern (task 1.18)
- [ ] No "Completed" or "Missed" statuses (not in schema)
- [ ] TypeScript enforces valid status values

---

## Dependencies

- **Blocked by**: Task 1.18 (Badge), Task 7.1 (CallbackRequestTable)
- **Blocks**: Task 7.3 (filter bar uses same status values)
- **Related**: Task 5.2 (notification status badges — same pattern)
