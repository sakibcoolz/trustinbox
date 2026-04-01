# Task 1.14 — Filter Chip Bar

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/FilterChipBar.tsx`
> **Status**: ✅ Complete

---

## Objective

Build a combinable filter chip bar that sits above data tables, allowing users to apply, combine, and clear filter criteria visually.

---

## Current State

No filter component exists. Feature pages would need to implement filtering ad-hoc.

---

## Requirements

### 1. Filter Chip Types

| Type | UI | Example |
|------|-----|---------|
| **Select** | Dropdown chip with options | Status: Delivered, Pending, Failed |
| **Multi-select** | Dropdown with checkboxes | Category: Personal, Org, Ad |
| **Date range** | Calendar picker chip | Date: Last 7 days |
| **Search** | Text input chip | Search: "user_abc" |
| **Toggle** | Binary on/off chip | Unread only |

### 2. Chip Appearance
- Inactive: `bg-bg-hover border border-border-primary text-text-secondary rounded-full px-3 py-1 text-xs`
- Active: `bg-accent-blue/10 border border-accent-blue text-accent-blue rounded-full px-3 py-1 text-xs`
- Removable: active chips show `X` button to clear

### 3. Filter Bar Features
- [x] Horizontal scrolling if chips overflow container
- [x] "Clear All" button appears when any filter is active
- [x] URL sync — active filters reflected in query params (`?status=DELIVERED&category=PERSONAL`)
- [x] `onFilterChange(filters: FilterState)` callback

### 4. Component API
```typescript
interface FilterChip {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'date-range' | 'search' | 'toggle';
  options?: { value: string; label: string }[];
}

interface FilterChipBarProps {
  filters: FilterChip[];
  activeFilters: Record<string, string | string[] | boolean | [Date, Date]>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
}
```

---

## Implementation Plan

```tsx
export function FilterChipBar({ filters, activeFilters, onFilterChange, onClearAll }: FilterChipBarProps) {
  const hasActive = Object.values(activeFilters).some(v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {filters.map((filter) => (
        <FilterChipItem key={filter.key} filter={filter} value={activeFilters[filter.key]} onChange={(v) => onFilterChange(filter.key, v)} />
      ))}
      {hasActive && (
        <button onClick={onClearAll} className="text-xs text-text-muted hover:text-status-error shrink-0 ml-2">
          Clear all
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
| `apps/provider/src/components/ui/FilterChipBar.tsx` | Create |
| `apps/provider/src/hooks/useFilters.ts` | Create — filter state manager with URL sync |

---

## Acceptance Criteria

- [x] Filter chips render for all defined filter types
- [x] Clicking a select chip opens dropdown with options
- [x] Active filters show blue highlight and X button
- [x] "Clear All" resets all filters
- [x] Filters sync to URL query params
- [x] Horizontal scroll works when many filters are active
- [x] Works with DataTable component (task 1.13) — filters update table data

---

## Dependencies

- **Blocked by**: Task 1.11 (color tokens)
- **Blocks**: Tasks 4.3, 5.3, 7.3, 9.2 (all filter-based pages)
- **Related**: Task 1.13 (table integration), Task 17.8 (URL state)
