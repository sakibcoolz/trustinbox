# Task 4.4 — Customer Sort Controls

> **Section**: 4. Customers  
> **Priority**: P1  
> **Estimated Scope**: Small  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement column-based sorting for the customer table with URL state sync. Sortable columns: last contacted, name, total interactions. Default sort: last contacted descending.

---

## Current State

No sorting exists. Table headers are plain `<th>` elements with no click handlers or sort indicators.

---

## Requirements

### 1. Sortable Columns

| Column | Sort Key | Default |
|--------|----------|---------|
| Virtual ID | `virtualId` | — |
| Name | `displayName` | — |
| Last Contact | `lastContactAt` | desc (default) |
| Interactions | `interactionCount` | — |

Non-sortable: Checkbox, Category, Status

### 2. Sort Behavior
- Click unsorted header → sort desc
- Click desc header → sort asc
- Click asc header → remove sort (revert to default `lastContactAt desc`)
- Sort indicator: `ChevronDown` for desc, `ChevronUp` for asc, subtle `ChevronsUpDown` for sortable-but-inactive
- Active sort column header text uses `text-text-primary`, inactive uses `text-text-muted`

### 3. URL State Sync
- `?sort=displayName&dir=asc`
- On page load, read sort/dir from URL
- Server-side sorting via GraphQL `orderBy` variable

### 4. Integration with Table Component (task 1.13)

```typescript
// Used via <SortableHeader> from the Table component
<SortableHeader
  field="lastContactAt"
  currentSort={sortField}
  direction={sortDir}
  onSort={handleSort}
>
  Last Contact
</SortableHeader>
```

---

## Implementation Plan

```tsx
// In customers/page.tsx
const searchParams = useSearchParams();
const router = useRouter();

const sortField = searchParams.get('sort') ?? 'lastContactAt';
const sortDir = (searchParams.get('dir') as 'asc' | 'desc') ?? 'desc';

function handleSort(field: string) {
  const params = new URLSearchParams(searchParams.toString());
  if (field === sortField) {
    if (sortDir === 'desc') {
      params.set('dir', 'asc');
    } else {
      // Remove custom sort, revert to default
      params.delete('sort');
      params.delete('dir');
    }
  } else {
    params.set('sort', field);
    params.set('dir', 'desc');
  }
  router.replace(`?${params.toString()}`);
}

// Pass to GraphQL
const { data } = useCustomers({
  orderBy: { field: sortField, direction: sortDir },
  // ...
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/customers/page.tsx` | Modify — add sort state + URL sync + pass to table headers |

---

## Acceptance Criteria

- [ ] 4 sortable columns with visual sort indicators
- [ ] Click cycles through: desc → asc → default
- [ ] Default sort: lastContactAt descending
- [ ] Sort state persisted in URL: `?sort=X&dir=Y`
- [ ] Server-side sorting via GraphQL variable
- [ ] Active column header visually distinct
- [ ] Non-sortable columns show no sort indicator

---

## Dependencies

- **Blocked by**: Task 1.13 (Table with SortableHeader), Task 4.1 (Customer table)
- **Blocks**: None
- **Related**: Task 4.3 (filters), Task 4.5 (pagination)
