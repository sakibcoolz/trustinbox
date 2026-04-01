# Task 4.5 — Customer Pagination

> **Section**: 4. Customers  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`

---

## Objective

Implement cursor-based pagination with page size selector (10, 25, 50) for the customer list, including URL state sync and "Showing X-Y of Z" display.

---

## Current State

No pagination. All 4 hardcoded rows displayed in a single non-scrolling table.

---

## Requirements

### 1. Cursor-Based Pagination
- Use `after` / `before` cursors from GraphQL response
- "Next" and "Previous" buttons
- Disable "Previous" on first page, "Next" on last page
- Total count from `totalCount` field

### 2. Page Size Selector
- Options: 10, 25, 50
- Dropdown at bottom-right of table
- Default: 25
- Changing page size resets to first page

### 3. Display
- Left: `"Showing 1-25 of 2,347 customers"`
- Center: Page navigation (if total > 1 page)
- Right: Page size dropdown

### 4. URL State
- `?limit=25&cursor=abc123`
- Preserve across filter/sort changes (except cursor resets on filter change)
- `limit` persisted to localStorage for user preference (task 17.9)

### 5. Component API

```typescript
interface PaginationProps {
  totalCount: number;
  pageSize: number;
  currentCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: (cursor: string) => void;
  onPrevious: (cursor: string) => void;
  onPageSizeChange: (size: number) => void;
}
```

### 6. GraphQL Variables

```graphql
query Customers($first: Int, $after: String, $before: String) {
  conversations(first: $first, after: $after, before: $before) {
    nodes { ... }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

---

## Implementation Plan

```tsx
// In customers/page.tsx
const searchParams = useSearchParams();
const limit = parseInt(searchParams.get('limit') ?? '25', 10);
const cursor = searchParams.get('cursor');

const { data } = useCustomers({ first: limit, after: cursor, ...filters });

const pageInfo = data?.conversations?.pageInfo;

function goNext() {
  updateURL({ cursor: pageInfo.endCursor });
}

function goPrevious() {
  updateURL({ cursor: pageInfo.startCursor, direction: 'before' });
}

// Bottom bar
<div className="flex items-center justify-between px-5 py-3 border-t border-border-primary">
  <span className="text-sm text-text-muted">
    Showing {startIndex}–{endIndex} of {data.totalCount.toLocaleString()} customers
  </span>
  <div className="flex items-center gap-4">
    <div className="flex gap-1">
      <button disabled={!pageInfo?.hasPreviousPage} onClick={goPrevious}
        className="px-3 py-1.5 text-sm border border-border-secondary rounded-lg disabled:opacity-40">
        Previous
      </button>
      <button disabled={!pageInfo?.hasNextPage} onClick={goNext}
        className="px-3 py-1.5 text-sm border border-border-secondary rounded-lg disabled:opacity-40">
        Next
      </button>
    </div>
    <select value={limit} onChange={(e) => onPageSizeChange(Number(e.target.value))}
      className="px-2 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-sm">
      <option value={10}>10 / page</option>
      <option value={25}>25 / page</option>
      <option value={50}>50 / page</option>
    </select>
  </div>
</div>
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/customers/page.tsx` | Modify — add pagination controls at bottom of table |
| `apps/provider/src/components/ui/Pagination.tsx` | Create — reusable pagination component |

---

## Acceptance Criteria

- [ ] Previous/Next buttons with proper disabled states
- [ ] Page size selector with 10/25/50 options
- [ ] "Showing X-Y of Z" count display
- [ ] URL synced: `?limit=25&cursor=abc`
- [ ] Page size persists to localStorage
- [ ] Filter/search changes reset cursor
- [ ] Sort changes reset cursor
- [ ] Works with cursor-based GraphQL pagination

---

## Dependencies

- **Blocked by**: Task 4.1 (Customer table), Task 4.13 (GraphQL query with pagination)
- **Blocks**: None
- **Related**: Task 4.2 (search resets pagination), Task 4.3 (filters reset pagination), Task 17.9 (localStorage preference)
