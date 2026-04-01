# Task 10.4 — Bot Search and Filter

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — List filtering  
> **Estimated Scope**: Small  
> **Route**: `/bots`  
> **File**: `apps/provider/src/app/bots/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Make the status filter chips functional and add a search input to filter bots by name. Connect the status filter to the `bots` GraphQL query's `status` parameter and implement client-side name search.

---

## Current State

```tsx
<div className="flex gap-2 mb-6">
  {['All', 'Active', 'Draft', 'Paused', 'Archived'].map((status) => (
    <button key={status}
      className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors">
      {status}
    </button>
  ))}
</div>
```

**Issues**:
- No onClick handlers — filter chips are decorative
- No active state styling
- No search input
- Status labels need mapping to `BotStatus` enum

---

## Requirements

### 1. Status Filter Chips

| Chip Label | Schema Value |
|------------|-------------|
| All | `null` (no filter) |
| Active | `ACTIVE` |
| Draft | `DRAFT` |
| Paused | `PAUSED` |
| Archived | `ARCHIVED` |

### 2. Search Input

- Position: inline with filter chips or in header area
- Client-side filtering by `bot.name` (case-insensitive)
- Debounced by 300ms
- Clear (X) button

### 3. Combined Filtering

- Status filter (server-side via GraphQL variable) + search (client-side)
- Changing filter resets search

---

## Implementation Plan

```tsx
const STATUS_CHIPS = [
  { label: 'All', value: null },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

// Inside BotsPage:
const [statusFilter, setStatusFilter] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

const filteredBots = useMemo(() => {
  if (!debouncedSearch) return bots;
  return bots.filter((b) => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
}, [bots, debouncedSearch]);
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/page.tsx` | **Modify** | Wire filter chips + add search input |

---

## Acceptance Criteria

- [ ] Five filter chips: All, Active, Draft, Paused, Archived
- [ ] Clicking chip sets `statusFilter` → re-fetches from GraphQL
- [ ] Active chip has distinct styling
- [ ] Search input filters bots by name (client-side, debounced)
- [ ] Combined filter + search works correctly
- [ ] Clear button on search input

---

## Dependencies

- **Blocked by**: Task 10.1 (bot list with data)
- **Blocks**: None
- **Related**: Task 10.22 (GraphQL query accepts `status` variable)
