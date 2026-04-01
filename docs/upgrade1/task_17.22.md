# Task 17.22 — Performance Monitoring

> **Section**: 17. Cross-Cutting Concerns — Logging & Observability  
> **Priority**: P2 — Observability  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/performance.ts`  
> **Status**: ✅ Complete

---

## Objective

Track Web Vitals (LCP, FCP, CLS, TTFB) via PerformanceObserver and provide a `createTimer` utility for measuring custom operations.

---

## Requirements

- `usePerformanceMonitor()` hook — installs PerformanceObservers for LCP, FCP, CLS, TTFB
- Thresholds + rating system (good / needs-improvement / poor)
- CLS reported on page hide
- `createTimer(label)` — start/end timing utility for queries/operations
- All metrics logged via structured logger

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/performance.ts` | **Created** | usePerformanceMonitor hook + createTimer utility |

---

## Acceptance Criteria

- [x] LCP, FCP, CLS, TTFB tracked
- [x] Metrics rated against standard thresholds
- [x] `createTimer()` for custom operation timing
- [x] Logged via structured logger
- [x] No performance impact from observers
