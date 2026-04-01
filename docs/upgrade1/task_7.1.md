# Task 7.1 — CallbackRequestTable Component

> **Section**: 7. Callback Requests  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/callbacks`  
> **File**: `apps/provider/src/app/callbacks/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Upgrade the callback requests page from hardcoded mock data to a dynamic, GraphQL-powered table showing all callback requests with customer virtual ID, requested time, preferred time, status, assigned agent, and action buttons.

---

## Current State

```tsx
// apps/provider/src/app/callbacks/page.tsx — ~120 lines
const mockCallbacks = [
  { id: '1', customerVid: 'VID-8a3f2b', topic: 'Account inquiry', status: 'Pending', priority: 'High', requestedAt: '2024-03-10 11:30', scheduledAt: null, agent: null },
  { id: '2', customerVid: 'VID-4c9e1d', topic: 'Billing dispute', status: 'Pending', priority: 'Urgent', requestedAt: '2024-03-10 10:15', scheduledAt: null, agent: null },
  // ... 5 more hardcoded rows
];
```

**Existing features**: Tab-filtered table (Pending/Approved/Completed/Missed/Rejected), 4 stats cards (Pending Approval, Scheduled Today, Completed This Week, Missed This Week — hardcoded), search input, Approve/Reject buttons for Pending tab, priority color-coding.

**Issues**:
- All 7 callbacks hardcoded — no real data
- Status values (Pending/Approved/Completed/Missed/Rejected) partially misalign with schema enum (`PENDING`/`APPROVED`/`REJECTED`/`RESCHEDULED`/`EXPIRED`)
- Stats cards show hardcoded values ('3', '14', '2')
- No pagination or infinite scroll
- No link to individual callback detail
- No real-time updates when new requests arrive
- Approve/Reject buttons non-functional (no GraphQL mutation)
- No assigned agent column from real data

---

## Requirements

### 1. Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| **Customer** | `callbackRequest.userId` → resolve to VID | Monospace `font-mono text-xs` |
| **Reason** | `callbackRequest.reason` | Truncate at 50 chars |
| **Priority** | Derive from metadata or default Normal | Color: Low=muted, Normal=secondary, High=orange, Urgent=red |
| **Status** | `callbackRequest.status` | Badge: PENDING (yellow), APPROVED (green), REJECTED (red), RESCHEDULED (blue), EXPIRED (gray) |
| **Requested At** | `callbackRequest.requestedAt` | Relative + absolute on hover |
| **Scheduled** | `callbackRequest.approvedSlotStart` — `approvedSlotEnd` | Show range or "—" if null |
| **Agent** | Assigned agent name | Or "Unassigned" |
| **Actions** | Approve / Reject / Assign / Complete | Conditional per status |

### 2. Status Alignment

Map schema enum to UI:

| Schema | UI Label | Color |
|--------|----------|-------|
| `PENDING` | Pending | `bg-status-warning/10 text-status-warning` |
| `APPROVED` | Approved | `bg-status-success/10 text-status-success` |
| `REJECTED` | Rejected | `bg-status-error/10 text-status-error` |
| `RESCHEDULED` | Rescheduled | `bg-accent-blue/10 text-accent-blue` |
| `EXPIRED` | Expired | `bg-border-secondary text-text-muted` |

### 3. Data Integration
- Fetch from `callbackRequests(status, limit, offset)` GraphQL query (task 7.10)
- Replace `mockCallbacks` entirely
- Include cursor-based pagination with page size selector (10/25/50)

### 4. Stats Cards (dynamic)
- Pending Approval → `totalCount` where status=PENDING
- Scheduled Today → derived from approved callbacks with today's slot
- Completed This Week → count of completed callbacks (need extension or derive from data)
- Missed (Expired) This Week → count of expired callbacks this week
- Fetch from aggregated query or derive from paginated data

### 5. Loading & Empty States
- Loading: Table skeleton with 5 shimmer rows
- Empty: "No callback requests" with illustration
- Error: Error card with retry button

---

## Implementation Plan

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PhoneCall, Search, Clock, CheckCircle2, XCircle, Calendar, AlertCircle } from 'lucide-react';
import { useCallbackRequests } from '@/lib/graphql/callbacks';
import { CallbackRequestStatus } from '@/lib/graphql/callbacks';
import { formatRelativeTime } from '@/lib/utils/date';

const statusConfig: Record<CallbackRequestStatus, { label: string; color: string }> = {
  PENDING:     { label: 'Pending',     color: 'bg-status-warning/10 text-status-warning' },
  APPROVED:    { label: 'Approved',    color: 'bg-status-success/10 text-status-success' },
  REJECTED:    { label: 'Rejected',    color: 'bg-status-error/10 text-status-error' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-accent-blue/10 text-accent-blue' },
  EXPIRED:     { label: 'Expired',     color: 'bg-border-secondary text-text-muted' },
};

const tabs: CallbackRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'EXPIRED'];

export default function CallbacksPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CallbackRequestStatus>(
    (searchParams.get('status') as CallbackRequestStatus) ?? 'PENDING'
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const { data, loading, error, refetch } = useCallbackRequests({
    status: tab,
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const callbacks = data?.callbackRequests.nodes ?? [];
  const totalCount = data?.callbackRequests.totalCount ?? 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Callback Requests</h1>
        <p className="text-text-secondary mt-1">Manage and schedule callback requests from customers</p>
      </div>

      {/* Dynamic Stats Cards */}
      {/* Tab Filters with counts from server */}
      {/* Search Bar */}
      {/* CallbackRequestTable with actions */}
      {/* Pagination controls */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/callbacks/page.tsx` | Modify — replace mock data with GraphQL, align status enum |
| `apps/provider/src/components/CallbackRequestTable.tsx` | Modify — accept GraphQL data types, add action handlers |

---

## Acceptance Criteria

- [ ] Callback list fetched from GraphQL (not hardcoded)
- [ ] Columns: Customer VID, Reason, Priority, Status, Requested At, Scheduled, Agent, Actions
- [ ] Status badges match schema: PENDING (yellow), APPROVED (green), REJECTED (red), RESCHEDULED (blue), EXPIRED (gray)
- [ ] Tab filters show counts from server
- [ ] Pagination with page size selector (10/25/50)
- [ ] Stats cards fetch live data
- [ ] Loading skeleton (5 rows)
- [ ] Empty state per tab
- [ ] Search filters by customer VID or reason

---

## Dependencies

- **Blocked by**: Task 1.8 (Skeleton), Task 1.13 (Table), Task 1.18 (Badge), Task 7.10 (GraphQL callbackRequests query)
- **Blocks**: Task 7.2 (status badges), Task 7.3 (filter bar), Task 7.4 (detail expansion), Task 7.5 (create callback)
- **Related**: Task 5.1 (notification table — similar pattern), Task 4.1 (customer table — similar pattern)
