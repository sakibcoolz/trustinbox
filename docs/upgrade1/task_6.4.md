# Task 6.4 — Conversation Sort

> **Section**: 6. Conversations  
> **Priority**: P2  
> **Estimated Scope**: Small  
> **Route**: `/conversations`  
> **File**: `apps/provider/src/app/conversations/page.tsx`

---

## Objective

Add sort controls for the conversation list, supporting sort by last message time (default) and by unread-first, with URL state synchronization.

---

## Current State

No sorting exists. Conversations render in mock array order.

---

## Requirements

### 1. Sort Options

| Option | GraphQL Variable | Description |
|--------|-----------------|-------------|
| **Recent** (default) | `orderBy: { field: "updatedAt", direction: "DESC" }` | Most recently active first |
| **Oldest** | `orderBy: { field: "updatedAt", direction: "ASC" }` | Oldest active first |
| **Unread First** | `orderBy: { field: "unreadCount", direction: "DESC" }` | Conversations with unread messages on top |

### 2. Sort Control
- Small dropdown or segmented control next to search/filters
- Current sort displayed as label
- URL parameter: `?sort=recent` / `?sort=oldest` / `?sort=unread`

### 3. URL State Sync
- Persisted in URL for shareable state
- Default: `recent` (no URL param needed)

---

## Implementation Plan

```tsx
const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent', orderBy: { field: 'updatedAt', direction: 'DESC' } },
  { value: 'oldest', label: 'Oldest', orderBy: { field: 'updatedAt', direction: 'ASC' } },
  { value: 'unread', label: 'Unread First', orderBy: { field: 'unreadCount', direction: 'DESC' } },
];

const sortParam = searchParams.get('sort') ?? 'recent';
const sortConfig = SORT_OPTIONS.find(o => o.value === sortParam) ?? SORT_OPTIONS[0];

const { data } = useConversations({
  ...filters,
  orderBy: sortConfig.orderBy,
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/conversations/page.tsx` | Modify — add sort dropdown with URL sync |

---

## Acceptance Criteria

- [ ] 3 sort options: Recent, Oldest, Unread First
- [ ] Sort passed as GraphQL `orderBy` variable
- [ ] URL synced: `?sort=recent`
- [ ] Default: Recent (most recently active first)
- [ ] Dropdown/segmented control UI

---

## Dependencies

- **Blocked by**: Task 6.1 (Conversation list), Task 6.12 (GraphQL query supports orderBy)
- **Blocks**: None
- **Related**: Task 4.4 (Customer sort — same pattern)
