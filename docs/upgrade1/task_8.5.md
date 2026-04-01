# Task 8.5 — Document Search

> **Section**: 8. Documents  
> **Priority**: P1 — Search  
> **Estimated Scope**: Small  
> **Route**: `/documents`  
> **Component**: Search bar
> **Status**: ✅ Complete

---

## Objective

Implement search functionality for documents by filename, classification, and date range with debounced server-side filtering.

---

## Current State

```tsx
// apps/provider/src/app/documents/page.tsx
const [search, setSearch] = useState('');
const filtered = mockDocuments.filter((d) =>
  (categoryFilter === 'All' || d.category === categoryFilter) &&
  (search === '' || d.name.toLowerCase().includes(search.toLowerCase()))
);
```

Client-side filtering against mock data. No server-side search, no date range, no debounce.

---

## Requirements

### Search Inputs

| Input | Type | Behavior |
|-------|------|----------|
| **Text search** | Input field | Search filename + content metadata |
| **Classification** | Filter chips | Invoice, Identity, Contract, Report, General, All |
| **Date range** | Date picker | Filter by `createdAt` |

### Server-Side Search
- Debounced 300ms before sending query
- Pass search text as variable to GraphQL query
- URL sync: `?q=invoice&classification=contract&from=2024-03-01`
- Reset pagination on search change

### UX
- Search icon in input
- Clear button (X) when search has text
- Results count: "Showing X of Y documents"
- Empty search result: "No documents match your search"

---

## Implementation Plan

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

function DocumentSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
        className="w-full pl-10 pr-8 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm"
        placeholder="Search documents…" />
      {value && (
        <button onClick={() => setValue('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
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
| `apps/provider/src/app/documents/page.tsx` | Modify — integrate debounced search with server query |

---

## Acceptance Criteria

- [ ] 300ms debounced search input
- [ ] Server-side search by filename
- [ ] Classification filter chips
- [ ] Date range filter
- [ ] URL sync for all filters
- [ ] Clear button in search input
- [ ] Results count displayed
- [ ] Empty search results state
- [ ] Pagination resets on search change

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager), Task 8.12 (GraphQL query with search)
- **Blocks**: None
- **Related**: Task 7.3 (callback filter — similar pattern), Task 6.2 (conversation search)
