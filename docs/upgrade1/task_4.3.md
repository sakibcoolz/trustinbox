# Task 4.3 — Customer Filter Chips

> **Section**: 4. Customers  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`

---

## Objective

Replace the static filter buttons with a dynamic, combinable filter chip bar that filters customers by category (Personal, Organizational, Advertisement) and by status (Active, Blocked, DND, Opted Out), with URL state sync and a "Clear all" action.

---

## Current State

```tsx
// apps/provider/src/app/customers/page.tsx — Static filter buttons, no functionality
<div className="flex gap-2 mb-6">
  {['All', 'Customer', 'Subscriber', 'Lead', 'Opted Out'].map((filter) => (
    <button key={filter}
      className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors">
      {filter}
    </button>
  ))}
</div>
```

**Issues**: Labels don't match business model (Customer/Subscriber/Lead vs Personal/Organizational/Advertisement), no active state, no multi-select, no URL sync, no clear-all.

---

## Requirements

### 1. Filter Groups

**Category (multi-select)**:
| Chip | Value | Note |
|------|-------|------|
| Personal | `PERSONAL` | Customers with personal consent |
| Organizational | `SERVICE_PROVIDER` | Customers with org consent |
| Advertisement | `ADVERTISEMENT` | Customers with ad opt-in |

**Status (multi-select)**:
| Chip | Value | Color |
|------|-------|-------|
| Active | `ACTIVE` | Green |
| Blocked | `BLOCKED` | Red |
| DND | `DND` | Orange |
| Opted Out | `OPTED_OUT` | Gray |

### 2. Behavior
- Chips are combinable (multi-select within and across groups)
- Active chip: `bg-accent-blue/10 text-accent-blue border-accent-blue/30`
- Inactive chip: `border-border-secondary text-text-muted hover:text-text-secondary`
- "Clear all" link appears when any filter is active
- Filters are AND within a group (e.g., Active AND Blocked shows both), OR across groups

### 3. URL State Sync
- Category: `?category=PERSONAL,SERVICE_PROVIDER`
- Status: `?status=ACTIVE,BLOCKED`
- Resets pagination cursor on filter change
- Use `useFilters` hook (from `hooks/useFilters.ts`)

### 4. Use FilterChipBar Component (task 1.14)

```typescript
interface FilterChipBarProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onChange: (groupKey: string, value: string) => void;
  onClearAll: () => void;
}

interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string; color?: string }[];
}
```

---

## Implementation Plan

```tsx
const CUSTOMER_FILTER_GROUPS: FilterGroup[] = [
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
    key: 'status',
    label: 'Status',
    options: [
      { value: 'ACTIVE', label: 'Active', color: 'text-status-success' },
      { value: 'BLOCKED', label: 'Blocked', color: 'text-status-error' },
      { value: 'DND', label: 'DND', color: 'text-status-warning' },
      { value: 'OPTED_OUT', label: 'Opted Out', color: 'text-text-muted' },
    ],
  },
];

// In CustomersPage:
const { filters, setFilter, clearAll, hasActiveFilters } = useFilters(CUSTOMER_FILTER_GROUPS);

<FilterChipBar
  groups={CUSTOMER_FILTER_GROUPS}
  activeFilters={filters}
  onChange={setFilter}
  onClearAll={clearAll}
/>
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/customers/page.tsx` | Modify — replace static filters with FilterChipBar |

---

## Acceptance Criteria

- [ ] Two filter groups: Category (3 chips) and Status (4 chips)
- [ ] Multiple chips selectable within each group
- [ ] Active chips visually distinct (blue accent)
- [ ] "Clear all" link appears when filters are active
- [ ] URL synced: `?category=X,Y&status=Z`
- [ ] Pagination resets on filter change
- [ ] Filter values passed to GraphQL query

---

## Dependencies

- **Blocked by**: Task 1.14 (FilterChipBar component), Task 4.1 (Customer table)
- **Blocks**: None
- **Related**: Task 4.2 (search), Task 4.4 (sort)
