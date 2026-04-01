# Task 17.13 — Screen Reader Live Regions

> **Section**: 17. Cross-Cutting Concerns — Accessibility  
> **Priority**: P2 — Accessibility  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/LiveRegion.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add ARIA live regions for real-time updates so screen readers announce new messages, toasts, and subscription events.

---

## Requirements

- `LiveRegionProvider` wraps the app with two visually-hidden live regions (`aria-live="polite"` and `aria-live="assertive"`)
- `useLiveRegion()` hook returns `announce(message, politeness?)` function
- Messages auto-clear after 10 seconds
- Uses `requestAnimationFrame` to re-trigger announcements for same-text messages

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/components/LiveRegion.tsx` | **Created** | LiveRegionProvider + useLiveRegion hook |
| `apps/provider/src/app/layout.tsx` | **Modified** | Wrapped LayoutShell with LiveRegionProvider |

---

## Acceptance Criteria

- [x] `aria-live="polite"` region for general updates
- [x] `aria-live="assertive"` region for errors/alerts
- [x] Visually hidden (`sr-only`) — not visible on screen
- [x] `useLiveRegion()` hook with `announce()` function
- [x] Integrated into root layout
