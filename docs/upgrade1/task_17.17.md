# Task 17.17 — Image Optimization

> **Section**: 17. Cross-Cutting Concerns — Performance  
> **Priority**: P3 — Performance  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/OptimizedImage.tsx`  
> **Status**: ✅ Complete

---

## Objective

Create `OptimizedImage` and `Avatar` components wrapping Next.js `<Image>` with fallback initials, error handling, and proper accessibility.

---

## Requirements

- Wraps `next/image` for automatic optimization
- Fallback to initials on load error
- `Avatar` component with circle crop + size prop
- `aria-label` on fallback elements

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/components/ui/OptimizedImage.tsx` | **Created** | OptimizedImage + Avatar components |

---

## Acceptance Criteria

- [x] Uses Next.js Image for optimized loading
- [x] Fallback initials on error
- [x] Avatar component with size + circle crop
- [x] Accessible `role="img"` + `aria-label` on fallbacks
