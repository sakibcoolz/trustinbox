# Task 17.19 — Memoization Patterns

> **Section**: 17. Cross-Cutting Concerns — Performance  
> **Priority**: P3 — Performance  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/useMemo.ts`  
> **Status**: ✅ Complete

---

## Objective

Create memoization utility hooks: `useMemoCompare` (custom equality), `useStableCallback` (stable ref callback), `usePrevious`, and `shallowEqualDeps`.

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useMemo.ts` | **Created** | useMemoCompare, useStableCallback, usePrevious, shallowEqualDeps |

---

## Acceptance Criteria

- [x] `useMemoCompare` with custom equality function
- [x] `useStableCallback` — identity-stable callback
- [x] `usePrevious` — returns previous render value
- [x] `shallowEqualDeps` helper
