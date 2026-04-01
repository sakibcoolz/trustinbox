# Task 17.14 — Focus Trap

> **Section**: 17. Cross-Cutting Concerns — Accessibility  
> **Priority**: P2 — Accessibility  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/useFocusTrap.ts`  
> **Status**: ✅ Complete

---

## Objective

Create a reusable `useFocusTrap` hook that traps keyboard focus within a container. Integrate into Modal and Drawer components.

---

## Requirements

- Tab/Shift+Tab cycles between first and last focusable elements
- Auto-focuses first focusable element on open
- Restores previous focus on close
- SSR-safe

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useFocusTrap.ts` | **Created** | Reusable focus trap hook |
| `apps/provider/src/components/ui/Modal.tsx` | **Modified** | Replaced inline focus logic with useFocusTrap |
| `apps/provider/src/components/ui/Drawer.tsx` | **Modified** | Replaced inline focus logic with useFocusTrap |

---

## Acceptance Criteria

- [x] Focus trapped inside modal when open
- [x] Focus trapped inside drawer when open
- [x] Auto-focus first element on open
- [x] Focus restored to trigger on close
- [x] Tab wraps from last → first, Shift+Tab from first → last
