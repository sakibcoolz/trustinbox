# Task 17.8 — URL State for Filters and Pagination

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P2 — UX / shareability  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/hooks/useUrlState.ts`  
> **Status**: ✅ Complete

---

## Objective

Implement a `useUrlState` hook that syncs filter, sort, pagination, and tab state to URL search params. This enables shareable links and browser back/forward navigation.

---

## Requirements

### Hook API

```typescript
function useUrlState<T extends Record<string, string>>(defaults: T): [T, (updates: Partial<T>) => void];

// Usage:
const [filters, setFilters] = useUrlState({
  status: 'all',
  search: '',
  page: '1',
  tab: 'overview',
});
```

### URL Mapping

| Page | URL Params |
|------|-----------|
| Webhooks | `?status=active&page=1&search=...` |
| Compliance | `?tab=policy&search=...&page=1` |
| Integrations | `?tab=keys&page=1` |
| Settings | `?tab=profile` |
| Team | `?tab=members&search=...` |

### Behavior

- Sync state to `searchParams` on change
- Read initial state from URL on mount
- Fall back to defaults for missing params
- Use `router.replace` (not `push`) for filter changes to avoid polluting history
- Use `router.push` for tab changes (navigable)

### Next.js App Router Integration

```typescript
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function useUrlState<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      result[key] = searchParams.get(key) || defaults[key];
    }
    return result;
  }, [searchParams, defaults]);

  const setState = useCallback((updates: Partial<T>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === defaults[key]) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname, defaults]);

  return [state, setState] as const;
}
```

---

## Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useUrlState.ts` | **Create** | URL state sync hook |

---

## Acceptance Criteria

- [ ] Filters reflected in URL
- [ ] Browser back/forward works for tab changes
- [ ] Default values not serialized to URL (clean URLs)
- [ ] Works with Next.js App Router (Suspense compatible)
- [ ] Shareable URLs reproduce same view

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Filter/tab pages (12.3, 13.1, 14.1)
