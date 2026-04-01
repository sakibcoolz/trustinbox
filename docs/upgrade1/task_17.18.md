# Task 17.18 — Debounced Search

> **Section**: 17. Cross-Cutting Concerns — Performance  
> **Priority**: P2 — Performance  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/useDebounce.ts`  
> **Status**: ✅ Complete

---

## Objective

Create `useDebounce` (value debouncer) and `useDebouncedCallback` (function debouncer) hooks with 300ms default delay for all search inputs.

---

## Requirements

- `useDebounce<T>(value, delay)` — returns debounced value
- `useDebouncedCallback(fn, delay)` — returns debounced function
- Default 300ms delay
- Cleanup on unmount

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useDebounce.ts` | **Created** | useDebounce + useDebouncedCallback hooks |

---

## Acceptance Criteria

- [x] Value debounce with configurable delay
- [x] Callback debounce with ref-stable function
- [x] Timer cleanup on unmount
- [x] TypeScript generics
