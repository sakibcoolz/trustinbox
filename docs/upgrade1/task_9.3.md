# Task 9.3 — Campaign Search by Name

> **Section**: 9. Campaigns  
> **Priority**: P1 — List filtering  
> **Estimated Scope**: Small  
> **Route**: `/campaigns`  
> **File**: `apps/provider/src/app/campaigns/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a search input to the campaigns list that filters campaigns by name. Implement client-side filtering on the loaded page data with debounce, since the GraphQL `campaigns` query does not currently include a search parameter.

---

## Current State

No search input exists on the campaigns page. The filter chips area has no search functionality. The `campaigns` GraphQL query signature is:

```graphql
campaigns(serviceProviderId: ID!, status: CampaignStatus, limit: Int, offset: Int): CampaignConnection!
```

No `search` or `name` filter parameter exists in the schema.

---

## Requirements

### 1. Search Input

- Search icon (magnifying glass) + text input in the header area
- Placeholder: "Search campaigns…"
- Debounce input by 300ms before filtering
- Clear button (X icon) when input has value
- Positioned between header and filter chips, or inline with filter chips

### 2. Filtering Logic

**Option A — Client-side** (recommended for now):
- Filter `campaigns.nodes` array by `campaign.name.toLowerCase().includes(searchTerm.toLowerCase())`
- Works within the current page of data
- Show "(X results)" count after search

**Option B — Server-side** (future, if schema is extended):
- Add `search: String` variable to `campaigns` query
- Pass debounced term to GraphQL

### 3. Interaction with Other Filters

- Search combines with status filter (AND logic)
- Clearing search shows all results for current status filter
- Search persists when status filter changes

---

## Implementation Plan

```tsx
import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

// Inside CampaignsPage component:
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

const filteredCampaigns = useMemo(() => {
  if (!debouncedSearch) return campaigns;
  return campaigns.filter((c) =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
}, [campaigns, debouncedSearch]);

// Search input JSX:
<div className="relative">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search campaigns…"
    className="pl-9 pr-8 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active w-64"
  />
  {searchTerm && (
    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
      <X size={14} className="text-text-muted hover:text-text-primary" />
    </button>
  )}
</div>
```

### useDebounce hook (if not already present)

```tsx
// apps/provider/src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/page.tsx` | **Modify** | Add search input + client-side filtering |
| `apps/provider/src/hooks/useDebounce.ts` | **Create** (if needed) | Debounce hook for search input |

---

## Acceptance Criteria

- [ ] Search input rendered with search icon and placeholder
- [ ] Typing filters campaigns by name (case-insensitive)
- [ ] Filtering is debounced by 300ms
- [ ] Clear (X) button appears when input has value
- [ ] Clearing search restores full list
- [ ] Search works in combination with status filter chips
- [ ] Empty search result shows "No campaigns match your search" message

---

## Dependencies

- **Blocked by**: Task 9.1 (campaign list with data to filter)
- **Blocks**: None
- **Related**: Task 9.2 (status filter chips — combined filtering)
