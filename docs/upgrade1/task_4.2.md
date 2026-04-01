# Task 4.2 — Customer Search Bar

> **Section**: 4. Customers  
> **Priority**: P0  
> **Estimated Scope**: Small  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`

---

## Objective

Implement debounced search by virtual ID or customer name with URL state synchronization and server-side filtering.

---

## Current State

```tsx
// apps/provider/src/app/customers/page.tsx — Static input, no state, no debounce
<input
  type="text"
  placeholder="Search customers..."
  className="px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm ..."
/>
```

**Issues**: No state binding, no debounce, no URL sync, no server-side search, no clear button, no search icon.

---

## Requirements

### 1. Search Input
- Prefix: `Search` icon (Lucide)
- Placeholder: `"Search by virtual ID or name…"`
- Suffix: Clear button (X icon) when query is non-empty
- Width: `w-80` on desktop, full width on mobile
- Debounce: 300ms before triggering search (task 17.18)

### 2. URL State Sync
- Sync search query to URL: `?q=searchterm`
- On page load, read `q` from URL and pre-fill input
- Use `useSearchParams` + `useRouter` with `replace` (no history push)

### 3. Server-Side Integration
- Pass `search` variable to GraphQL `conversations` query (or customer-derived query)
- Search matches against `virtualPublicId` and `fullName` fields
- Minimum 2 characters to trigger search; clear on empty

### 4. Component API

```typescript
interface CustomerSearchProps {
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
  loading?: boolean;
}
```

---

## Implementation Plan

```tsx
// Inline within customers/page.tsx or extract to components/customers/CustomerSearch.tsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebounce';

function CustomerSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery.length >= 2) {
      params.set('q', debouncedQuery);
    } else {
      params.delete('q');
    }
    params.delete('cursor'); // Reset pagination on search
    router.replace(`?${params.toString()}`);
  }, [debouncedQuery]);

  return (
    <div className="relative w-80">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by virtual ID or name…"
        className="w-full pl-10 pr-10 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
        >
          <X size={14} />
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
| `apps/provider/src/app/customers/page.tsx` | Modify — replace static input with CustomerSearch |
| `apps/provider/src/hooks/useDebounce.ts` | Create (if not exists) — debounce utility hook |

---

## Acceptance Criteria

- [ ] Search icon prefix, clear (X) suffix when non-empty
- [ ] 300ms debounce before triggering server query
- [ ] URL synced with `?q=` parameter
- [ ] Pagination resets on search
- [ ] Minimum 2 characters to trigger search
- [ ] Pre-fills from URL on page load
- [ ] Clear button empties input and removes URL param

---

## Dependencies

- **Blocked by**: Task 4.1 (Customer table), Task 17.18 (debounced search)
- **Blocks**: None
- **Related**: Task 4.3 (filter chips)
