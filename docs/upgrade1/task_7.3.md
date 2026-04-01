# Task 7.3 — Callback Filter Bar

> **Section**: 7. Callback Requests  
> **Priority**: P1 — Filtering  
> **Estimated Scope**: Medium  
> **Route**: `/callbacks`  
> **Component**: Filter bar above table
> **Status**: ✅ Complete

---

## Objective

Implement a filter bar for callback requests with filters by status, date range, and assigned agent, synced to URL search params.

---

## Current State

```tsx
// apps/provider/src/app/callbacks/page.tsx
const [tab, setTab] = useState('Pending');
const tabs = ['Pending', 'Approved', 'Completed', 'Missed', 'Rejected'];
// Client-side filter only, no date range, no agent filter
```

**Issues**:
- Tabs function as primary filter but don't sync to URL
- No date range picker for filtering requests by time
- No agent assignment filter
- No "clear all filters" action
- Status values don't match schema enum

---

## Requirements

### Filter Controls

| Filter | Type | Options | Notes |
|--------|------|---------|-------|
| **Status** | Tab chips | PENDING, APPROVED, REJECTED, RESCHEDULED, EXPIRED, All | Default: All |
| **Date Range** | Date picker | Today, Last 7d, Last 30d, Custom | Filters by `requestedAt` |
| **Agent** | Dropdown | Team members + "Unassigned" | Filter by assigned agent |
| **Clear All** | Button | Resets all filters | Visible when any filter active |

### URL Sync
- Store filters in URL params: `?status=PENDING&agent=user-123&from=2024-03-01&to=2024-03-10`
- Browser back/forward navigates filter state
- Shareable URLs

### Server-Side Filtering
- Pass filters to `callbackRequests(status, limit, offset)` query
- Date range and agent filters sent as query variables
- Reset pagination to page 0 on filter change

---

## Implementation Plan

```tsx
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';
import { CallbackRequestStatus } from '@/lib/graphql/callbacks';
import { useDateRange } from '@/hooks/useDateRange';

const statusChips: Array<{ value: CallbackRequestStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'EXPIRED', label: 'Expired' },
];

function CallbackFilterBar({ counts }: { counts: Record<string, number> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get('status') ?? 'ALL';

  const setFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page'); // reset pagination
    router.push(`/callbacks?${params.toString()}`);
  }, [searchParams, router]);

  const hasActiveFilters = searchParams.toString() !== '';

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Status chips */}
      <div className="flex gap-1">
        {statusChips.map((chip) => (
          <button key={chip.value} onClick={() => setFilter('status', chip.value === 'ALL' ? null : chip.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              status === chip.value ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}>
            {chip.label} {counts[chip.value] !== undefined ? `(${counts[chip.value]})` : ''}
          </button>
        ))}
      </div>

      {/* Date range picker */}
      {/* Agent dropdown */}
      {/* Clear all button */}
      {hasActiveFilters && (
        <button onClick={() => router.push('/callbacks')} className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
          <X size={12} /> Clear all
        </button>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/callbacks/page.tsx` | Modify — integrate filter bar, pass filters to query |

---

## Acceptance Criteria

- [ ] Status filter chips with server-side filtering (PENDING/APPROVED/REJECTED/RESCHEDULED/EXPIRED/All)
- [ ] Date range picker filters by requestedAt
- [ ] Agent dropdown filters by assigned agent
- [ ] All filters sync to URL params
- [ ] Clear all button resets filters
- [ ] Pagination resets on filter change
- [ ] Tab counts fetched from server

---

## Dependencies

- **Blocked by**: Task 1.14 (Filter chip bar), Task 7.1 (CallbackRequestTable), Task 7.2 (status badges), Task 7.10 (GraphQL query with filters)
- **Blocks**: Task 7.4 (detail expansion)
- **Related**: Task 5.3 (notification filter — same pattern), Task 6.3 (conversation filter)
