# Task 5.3 — Notification Filter Bar

> **Section**: 5. Notifications  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`

---

## Objective

Implement a combinable filter bar for the notification history table, filtering by status, category (Personal/Org/Ad), channel (push/sms/email), and date range, with URL state synchronization.

---

## Current State

```tsx
// apps/provider/src/app/notifications/page.tsx — Type filter only
const [typeFilter, setTypeFilter] = useState('All');
const types = ['All', 'Personal', 'Organizational', 'Advertisement'];

<div className="flex gap-1">
  {types.map((t) => (
    <button key={t} onClick={() => setTypeFilter(t)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-accent-blue/10 text-accent-blue' : '...'}`}>
      {t}
    </button>
  ))}
</div>
```

**Issues**: Only type/category filter, single-select (should be multi), no status filter, no channel filter, no date range, client-side filtering only, no URL sync.

---

## Requirements

### 1. Filter Groups

**Status (multi-select)**:
| Chip | Value |
|------|-------|
| Delivered | `DELIVERED` |
| Pending | `PENDING` |
| Failed | `FAILED` |
| Blocked | `BLOCKED` |
| Rate Limited | `RATE_LIMITED` |

**Category (multi-select)**:
| Chip | Value |
|------|-------|
| Personal | `PERSONAL` |
| Organizational | `SERVICE_PROVIDER` |
| Advertisement | `ADVERTISEMENT` |

**Channel (multi-select)**:
| Chip | Value |
|------|-------|
| SMS | `SMS` |
| Email | `EMAIL` |
| Push | `PUSH` |
| In-App | `IN_APP` |

**Date Range**:
- Reuse DateRangeSelector from task 3.6
- Presets: Today, Last 7d, Last 30d, Custom

### 2. Layout
- Row 1: Search input (left) + Date range (right)
- Row 2: Status chips | Category chips | Channel chips | Clear all
- Use FilterChipBar component (task 1.14)

### 3. URL State Sync
- `?status=DELIVERED,FAILED&category=PERSONAL&channel=SMS&from=2024-03-01&to=2024-03-31`
- Resets pagination on filter change
- Use `useFilters` hook

### 4. Server-Side Filtering
- All filter values passed as GraphQL variables to `notifications(...)` query
- Client-side filtering removed entirely

---

## Implementation Plan

```tsx
const NOTIFICATION_FILTER_GROUPS: FilterGroup[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'DELIVERED', label: 'Delivered', color: 'text-status-success' },
      { value: 'PENDING', label: 'Pending', color: 'text-status-warning' },
      { value: 'FAILED', label: 'Failed', color: 'text-status-error' },
      { value: 'BLOCKED', label: 'Blocked', color: 'text-text-muted' },
      { value: 'RATE_LIMITED', label: 'Rate Limited', color: 'text-accent-orange' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    options: [
      { value: 'PERSONAL', label: 'Personal' },
      { value: 'SERVICE_PROVIDER', label: 'Organizational' },
      { value: 'ADVERTISEMENT', label: 'Advertisement' },
    ],
  },
  {
    key: 'channel',
    label: 'Channel',
    options: [
      { value: 'SMS', label: 'SMS' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'PUSH', label: 'Push' },
      { value: 'IN_APP', label: 'In-App' },
    ],
  },
];

// In NotificationsPage:
const { filters, setFilter, clearAll, hasActiveFilters } = useFilters(NOTIFICATION_FILTER_GROUPS);
const { dateRange } = useDateRange();

// Replace client-side filtering:
// REMOVE: const filtered = mockNotifications.filter(...)
// ADD: pass filters to GraphQL query
const { data } = useNotifications({ ...filters, dateRange });
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/notifications/page.tsx` | Modify — replace type filter with full FilterChipBar + date range |

---

## Acceptance Criteria

- [ ] 3 filter groups: Status (5), Category (3), Channel (4)
- [ ] Multi-select chips within each group
- [ ] Date range selector with presets
- [ ] "Clear all" when any filters active
- [ ] URL synced: `?status=X&category=Y&channel=Z&from=A&to=B`
- [ ] Server-side filtering via GraphQL variables
- [ ] Client-side filtering removed
- [ ] Pagination resets on filter change

---

## Dependencies

- **Blocked by**: Task 1.14 (FilterChipBar), Task 3.6 (DateRangeSelector), Task 5.1 (notification table)
- **Blocks**: None
- **Related**: Task 4.3 (customer filter chips — same pattern), Task 5.12 (GraphQL query with filter variables)
