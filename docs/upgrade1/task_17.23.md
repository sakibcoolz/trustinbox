# Task 17.23 — User Action Tracking

> **Section**: 17. Cross-Cutting Concerns — Logging & Observability  
> **Priority**: P3 — Analytics  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/analytics.ts`  
> **Status**: ✅ Complete

---

## Objective

Implement anonymized user action tracking with batched event queue, periodic flushing, and optional remote endpoint.

---

## Requirements

- `trackEvent({ category, action, label?, value? })` — queue an event
- Batch queue (max 50 events), auto-flush every 30s
- Flush on page hide via `visibilitychange`
- `usePageViewTracking()` hook — auto-tracks route changes
- `useTrack(category)` hook — returns bound `track(action, label?)` function
- `onTrackEvent()` — subscribe for debugging
- Remote endpoint via `NEXT_PUBLIC_ANALYTICS_URL` (optional)
- No PII captured

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/analytics.ts` | **Created** | trackEvent, usePageViewTracking, useTrack, onTrackEvent |

---

## Acceptance Criteria

- [x] Event queue with batching
- [x] Auto-flush every 30s + on page hide
- [x] Configurable remote endpoint
- [x] Page view tracking hook
- [x] Category-bound track hook
- [x] No PII in events
