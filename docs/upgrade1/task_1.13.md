# Task 1.13 — Table Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Large  
> **File**: `apps/provider/src/components/ui/Table.tsx`

---

## Objective

Build a reusable, feature-rich data table with sortable headers, row hover, pagination, bulk selection, expandable rows, and column configuration.

---

## Current State

No shared table component. Feature pages would need to build tables from scratch.

---

## Requirements

### 1. Core Features
- [ ] Typed column definitions with accessor, header label, width, alignment
- [ ] Sortable columns — click header to toggle asc/desc/none
- [ ] Row hover highlight: `hover:bg-bg-hover`
- [ ] Striped rows option (alternating `bg-bg-card` / `bg-bg-primary`)
- [ ] Empty state integration (task 1.9)

### 2. Selection
- [ ] Header checkbox for select-all (current page)
- [ ] Row checkboxes for individual selection
- [ ] Selection count badge in bulk actions bar
- [ ] `onSelectionChange(selectedIds: string[])` callback
- [ ] Indeterminate state when partial selection

### 3. Pagination
- [ ] Footer with: "Showing X–Y of Z" text
- [ ] Page size selector dropdown: 10, 25, 50
- [ ] Previous/Next page buttons
- [ ] Page number indicators (1, 2, 3 ... N)
- [ ] Persist page size in localStorage

### 4. Expandable Rows
- [ ] Optional expand chevron on row start
- [ ] Click expands to show detail content below the row
- [ ] Only one row expanded at a time (or configurable multi-expand)
- [ ] Expand/collapse animation (max-height transition)

### 5. Column Configuration
- [ ] Optional column visibility toggle (gear icon in header)
- [ ] Drag-to-reorder columns (stretch goal)
- [ ] Resize column widths (stretch goal)

### 6. Component API
```typescript
interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string; // Tailwind width class or px
  align?: 'left' | 'center' | 'right';
  hidden?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyState?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  expandable?: boolean;
  renderExpanded?: (row: T) => React.ReactNode;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void };
  sortState?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}
```

---

## Implementation Plan

```tsx
export function DataTable<T>({ columns, data, keyExtractor, loading, emptyState, selectable, expandable, renderExpanded, pagination, sortState, onSort, onSelectionChange }: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ... selection logic, sort logic

  if (loading) return <SkeletonTable rows={pagination?.pageSize || 10} cols={columns.length} />;
  if (data.length === 0) return emptyState || <EmptyState icon={FileText} title="No data" description="..." />;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary">
              {selectable && <th className="w-10 px-3 py-3"><Checkbox ... /></th>}
              {columns.filter(c => !c.hidden).map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {col.sortable ? <SortableHeader ... /> : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <React.Fragment key={keyExtractor(row)}>
                <tr className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                  {selectable && <td className="px-3 py-3"><Checkbox ... /></td>}
                  {columns.filter(c => !c.hidden).map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-text-primary">{col.accessor(row)}</td>
                  ))}
                </tr>
                {expandable && expandedId === keyExtractor(row) && (
                  <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="bg-bg-primary p-4">
                    {renderExpanded?.(row)}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <TablePagination {...pagination} />}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Table.tsx` | Create — DataTable + TablePagination |
| `apps/provider/src/components/ui/Checkbox.tsx` | Create — custom checkbox component |

---

## Acceptance Criteria

- [ ] Renders typed columns with correct data
- [ ] Click sortable header toggles sort direction (visual indicator arrow)
- [ ] Rows highlight on hover
- [ ] Checkbox selection works — header toggles all, indeterminate state for partial
- [ ] Pagination footer shows correct count, page navigation works
- [ ] Page size persists in localStorage
- [ ] Expandable rows show/hide detail content
- [ ] Empty state renders when data is empty
- [ ] Loading state shows skeleton table
- [ ] Table scrolls horizontally on narrow screens without breaking layout
- [ ] Accessible: proper `<table>`, `<thead>`, `<tbody>` semantics, `aria-sort` on sortable headers

---

## Dependencies

- **Blocked by**: Task 1.8 (skeleton table), Task 1.9 (empty state), Task 1.11 (colors)
- **Blocks**: Tasks 4.1, 5.1, 7.1, 9.1, 11.7, 12.1 (all table-based pages)
- **Related**: Task 1.14 (filter chip bar above table)
