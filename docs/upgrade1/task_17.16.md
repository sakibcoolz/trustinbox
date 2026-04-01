# Task 17.16 — Virtual Scrolling

> **Section**: 17. Cross-Cutting Concerns — Performance  
> **Priority**: P3 — Performance  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/ui/VirtualList.tsx`  
> **Status**: ✅ Complete

---

## Objective

Create a lightweight virtual scroll component for long lists (conversations, notifications, customers) that only renders visible rows.

---

## Requirements

- Fixed row height virtual scrolling
- Overscan buffer (default 5 rows above/below)
- ARIA `role="list"` / `role="listitem"`
- No external dependencies (built-in, zero-bundle-cost)
- Generic `items` + `renderItem` API

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/components/ui/VirtualList.tsx` | **Created** | Generic virtual scroll component |

---

## Acceptance Criteria

- [x] Only visible rows rendered in DOM
- [x] Smooth scrolling with overscan buffer
- [x] Accessible list/listitem roles
- [x] TypeScript generics for item type
- [x] No external dependencies
