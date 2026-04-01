# Task 17.15 — Route-Based Code Splitting

> **Section**: 17. Cross-Cutting Concerns — Performance  
> **Priority**: P3 — Performance  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/lazy.tsx`  
> **Status**: ✅ Complete

---

## Objective

Use Next.js `dynamic()` imports for heavy components (Recharts, editors) so they are only loaded on pages that need them.

---

## Requirements

- Lazy-loaded Recharts: AreaChart, BarChart, LineChart, PieChart
- `dynamicLoad()` utility for any heavy component
- Loading skeletons (chart + editor variants)
- SSR disabled for chart components

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/lazy.tsx` | **Created** | Lazy chart exports + dynamicLoad utility |

---

## Acceptance Criteria

- [x] Recharts loaded on demand (not in initial bundle)
- [x] Shimmer skeleton shown while loading
- [x] `dynamicLoad()` utility for custom lazy imports
- [x] SSR disabled for client-only components
