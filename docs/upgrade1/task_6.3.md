# Task 6.3 — Conversation Filter

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Small  
> **Route**: `/conversations`  
> **File**: `apps/provider/src/app/conversations/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Upgrade conversation filters to support status (active, archived), unread-only toggle, and date range, with URL state synchronization and server-side filtering.

---

## Current State

```tsx
// apps/provider/src/app/conversations/page.tsx
const [statusFilter, setStatusFilter] = useState('All');
const statuses = ['All', 'Active', 'Waiting', 'Escalated', 'Resolved'];
```

**Issues**: Status values don't match schema enum (Active/Waiting/Escalated/Resolved vs OPEN/CLOSED/ARCHIVED), client-side filtering only, no unread toggle, no date range.

---

## Requirements

### 1. Status Filter (aligned to schema)

| Chip | GraphQL Value | Color |
|------|---------------|-------|
| All | — (no filter) | — |
| Open | `OPEN` | Green |
| Closed | `CLOSED` | Gray |
| Archived | `ARCHIVED` | Muted |

### 2. Unread-Only Toggle
- Toggle button: "Unread" with badge count of total unread conversations
- When active, filter to conversations with `unreadCount > 0`
- Visual: filled blue when active, outline when inactive

### 3. Date Range
- Optional date range: conversations last active within range
- Reuse DateRangeSelector (task 3.6) or simple "Last 24h / 7d / 30d" presets
- Default: no date filter (show all)

### 4. URL State Sync
- `?status=OPEN&unread=true&from=2024-03-01&to=2024-03-31`
- All filter values passed as GraphQL variables
- Resets pagination on filter change

### 5. Filter Layout
- Status chips in a row (same position as current)
- Unread toggle to the right of status chips
- Date range as dropdown (optional, less prominent)

---

## Implementation Plan

```tsx
const CONVERSATION_STATUSES = [
  { value: 'All', label: 'All' },
  { value: 'OPEN', label: 'Open', color: 'text-status-success' },
  { value: 'CLOSED', label: 'Closed', color: 'text-text-muted' },
  { value: 'ARCHIVED', label: 'Archived', color: 'text-text-muted' },
];

// In page component:
const statusFilter = searchParams.get('status') ?? 'All';
const unreadOnly = searchParams.get('unread') === 'true';

function setFilter(key: string, value: string) {
  const params = new URLSearchParams(searchParams);
  if (!value || value === 'All') { params.delete(key); }
  else { params.set(key, value); }
  params.delete('cursor');
  router.replace(`/conversations?${params.toString()}`);
}

// Pass to GraphQL:
const { data } = useConversations({
  status: statusFilter !== 'All' ? statusFilter : undefined,
  unreadOnly,
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/conversations/page.tsx` | Modify — align status values to schema, add unread toggle, URL sync |

---

## Acceptance Criteria

- [ ] Status chips: All, Open, Closed, Archived (matching schema enum)
- [ ] Unread-only toggle with badge showing unread count
- [ ] Optional date range filter
- [ ] URL synced: `?status=OPEN&unread=true`
- [ ] Server-side filtering via GraphQL variables
- [ ] Client-side filtering removed
- [ ] Pagination resets on filter change

---

## Dependencies

- **Blocked by**: Task 6.1 (Conversation list), Task 6.12 (GraphQL query supports filter variables)
- **Blocks**: None
- **Related**: Task 4.3 (Customer filter chips — same pattern), Task 5.3 (Notification filter bar)
