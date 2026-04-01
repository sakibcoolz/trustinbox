# Task 4.15 — CustomerLookup Component Upgrade

> **Section**: 4. Customers — Connected Backend  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: N/A (Reusable component, used in compose, callbacks, documents)  
> **File**: `apps/provider/src/components/CustomerLookup.tsx`

---

## Objective

Upgrade the CustomerLookup component from static mock data to GraphQL-powered, debounced search with multi-select support, integrated with `serviceProvider(id)` context.

---

## Current State

```tsx
// apps/provider/src/components/CustomerLookup.tsx — ~65 lines
interface CustomerLookupProps {
  customers?: Customer[];
  onSelect?: (virtualId: string) => void;
}

const defaultCustomers: Customer[] = [
  { virtualId: 'VID-8a3f2b', displayName: 'Virtual User #8a3f2b', type: 'Customer', lastContact: '2024-03-10', consent: 'Active' },
  { virtualId: 'VID-4c9e1d', displayName: 'Virtual User #4c9e1d', type: 'Subscriber', lastContact: '2024-03-09', consent: 'Active' },
  { virtualId: 'VID-7f2a8c', displayName: 'Virtual User #7f2a8c', type: 'Customer', lastContact: '2024-03-08', consent: 'Active' },
];
```

**Issues**: Static default customers, no server search, no multi-select, no debounce, no loading state, limited to 3 hardcoded users.

---

## Requirements

### 1. Server-Side Search
- Debounced search (300ms) against GraphQL backend
- Search by `virtualPublicId` or `fullName`
- Minimum 2 characters to trigger search
- Results scoped to current service provider's customers

### 2. Multi-Select Mode
- Single select mode: click selects one customer, replaces previous
- Multi-select mode: click toggles selection, shows selected as chips above input
- Remove chip to deselect
- Maximum 50 recipients (for bulk operations)

### 3. Component API Upgrade

```typescript
interface CustomerLookupProps {
  mode?: 'single' | 'multi';
  selected: string | string[]; // virtualId(s)
  onSelect: (virtualId: string | string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
}
```

### 4. Visual Enhancements
- Dropdown shows user avatar/initials, virtual ID, name, last contact
- Selected items shown as removable chips (multi-mode)
- Loading spinner during search
- "No results" state with search query echo
- Keyboard navigation (↑/↓ to navigate, Enter to select, Escape to close)

### 5. Context Integration
- SP context from `useAuth()` — scope search to current SP's customers
- Policy indicator per result: green dot = allowed, red dot = blocked (based on privacy preference)

---

## Implementation Plan

```tsx
// apps/provider/src/components/CustomerLookup.tsx — Full rewrite
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_CUSTOMERS } from '@/lib/graphql/customers';
import { useDebouncedValue } from '@/hooks/useDebounce';
import Link from 'next/link';

interface CustomerResult {
  virtualId: string;
  displayName: string;
  type: string;
  lastContactAt: string;
  consentStatus: string;
}

export default function CustomerLookup({ mode = 'single', selected, onSelect, placeholder, maxSelections = 50 }: CustomerLookupProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [search, { data, loading }] = useLazyQuery(SEARCH_CUSTOMERS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      search({ variables: { query: debouncedQuery } });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const results = data?.searchCustomers ?? [];
  const selectedArray = Array.isArray(selected) ? selected : selected ? [selected] : [];

  function handleSelect(virtualId: string) {
    if (mode === 'single') {
      onSelect(virtualId);
      setIsOpen(false);
      setQuery('');
    } else {
      const isSelected = selectedArray.includes(virtualId);
      const next = isSelected
        ? selectedArray.filter(id => id !== virtualId)
        : [...selectedArray, virtualId].slice(0, maxSelections);
      onSelect(next);
    }
  }

  return (
    <div className="relative">
      {/* Multi-select chips */}
      {mode === 'multi' && selectedArray.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedArray.map(id => (
            <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary rounded-full text-xs">
              {id}
              <button onClick={() => handleSelect(id)}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search by Virtual ID…'}
          className="w-full pl-10 pr-10 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm ..." />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />}
      </div>
      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-bg-card border border-border-primary rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.map((c: CustomerResult) => (
            <div key={c.virtualId} onClick={() => handleSelect(c.virtualId)}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-bg-hover cursor-pointer ${selectedArray.includes(c.virtualId) ? 'bg-accent-blue/5' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <User size={14} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.virtualId}</p>
                <p className="text-xs text-text-muted">{c.displayName} · {c.type}</p>
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <p className="text-sm text-text-muted text-center py-4">No customers found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/CustomerLookup.tsx` | Modify — full rewrite with GraphQL, multi-select, debounce |
| `apps/provider/src/lib/graphql/customers.ts` | Modify — add SEARCH_CUSTOMERS query |

---

## Acceptance Criteria

- [ ] Server-side search via GraphQL (not local filtering)
- [ ] 300ms debounce on search input
- [ ] Minimum 2 characters to trigger search
- [ ] Single-select mode: click selects, closes dropdown
- [ ] Multi-select mode: click toggles, shows chips
- [ ] Selected chips are removable
- [ ] Loading spinner during search
- [ ] "No results" state with query echo
- [ ] Keyboard navigation (up/down/enter/escape)
- [ ] Policy indicator per result (green/red dot)
- [ ] Max 50 selections in multi-mode

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client), Task 4.13 (GraphQL customer queries)
- **Blocks**: None
- **Related**: Task 5.7 (NotificationComposer uses CustomerLookup for recipient selection), Task 9.5 (Campaign audience selector)
