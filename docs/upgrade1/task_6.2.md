# Task 6.2 — Search Conversations

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Small  
> **Route**: `/conversations`  
> **File**: `apps/provider/src/app/conversations/page.tsx`

---

## Objective

Upgrade the conversation search to query by customer name/virtual ID or message content, with debounced server-side search via GraphQL and URL state synchronization.

---

## Current State

```tsx
// apps/provider/src/app/conversations/page.tsx
const [search, setSearch] = useState('');
const filtered = mockConversations.filter((c) =>
  (search === '' || c.customerVid.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase()))
);
```

**Issues**: Client-side only, searches mock data, no debounce, no URL sync, no server-side search.

---

## Requirements

### 1. Search Behavior
- Debounce: 300ms after last keystroke
- Minimum query length: 2 characters (clear results below 2)
- Search targets: customer virtual ID, customer display name, message content
- Server-side: pass search term as GraphQL variable

### 2. URL State Sync
- URL parameter: `?q=search+term`
- Persist across navigation — returning to page restores search
- Resets pagination on new search

### 3. Search Input
- Reuse existing Search icon + input pattern
- Add clear button (X) when search has value
- Loading indicator while results fetching
- Placeholder: "Search by name, VID, or message…"

### 4. Component API

```typescript
// Reuse SearchBar component (task 4.2 pattern)
<SearchBar
  value={search}
  onChange={setSearch}
  placeholder="Search by name, VID, or message…"
  debounceMs={300}
  minLength={2}
  loading={loading}
/>
```

---

## Implementation Plan

```tsx
// In conversations/page.tsx — replace local search with URL-synced debounced search
import { useSearchParams, useRouter } from 'next/navigation';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

const searchParams = useSearchParams();
const router = useRouter();
const [search, setSearch] = useState(searchParams.get('q') ?? '');

const debouncedSearch = useDebouncedCallback((value: string) => {
  const params = new URLSearchParams(searchParams);
  if (value && value.length >= 2) {
    params.set('q', value);
  } else {
    params.delete('q');
  }
  params.delete('cursor'); // Reset pagination
  router.replace(`/conversations?${params.toString()}`);
}, 300);

function handleSearch(value: string) {
  setSearch(value);
  debouncedSearch(value);
}

// Pass to GraphQL query:
const { data, loading } = useConversations({
  search: searchParams.get('q') || undefined,
  ...otherFilters,
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/conversations/page.tsx` | Modify — replace client-side filter with debounced server-side search |

---

## Acceptance Criteria

- [ ] Server-side search via GraphQL variable
- [ ] 300ms debounce
- [ ] Minimum 2 characters to trigger search
- [ ] Clear button (X) when search has value
- [ ] URL synced: `?q=search+term`
- [ ] Pagination resets on new search
- [ ] Search placeholder: "Search by name, VID, or message…"
- [ ] Client-side filtering removed

---

## Dependencies

- **Blocked by**: Task 6.1 (Conversation list page), Task 6.12 (GraphQL query supports search variable)
- **Blocks**: None
- **Related**: Task 4.2 (Customer search — same debounce pattern), Task 5.3 (Notification search)
