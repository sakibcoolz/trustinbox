# Task 17.12 — Color Contrast and WCAG AA

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P2 — Accessibility  
> **Estimated Scope**: Small  
> **File**: `apps/provider/tailwind.config.js`, component files  
> **Status**: ✅ Complete

---

## Objective

Ensure all text and interactive elements meet WCAG AA color contrast requirements (4.5:1 for normal text, 3:1 for large text and UI components).

---

## Current Theme

| Token | Color | Purpose |
|-------|-------|---------|
| `bg-primary` | `#0b0d0f` | Page background |
| `bg-surface` | `#10141a` | Card background |
| `text` | `#e4e4e7` (zinc-200) | Primary text |
| `text-muted` | `#71717a` (zinc-500) | Secondary text |
| `accent` | `#3b82f6` (blue-500) | Primary actions |
| `border` | `#27272a` (zinc-800) | Borders |

### Contrast Issues to Check

| Pair | Ratio | Requirement | Status |
|------|-------|------------|--------|
| `#e4e4e7` on `#0b0d0f` | ~17:1 | 4.5:1 | ✅ Pass |
| `#e4e4e7` on `#10141a` | ~14:1 | 4.5:1 | ✅ Pass |
| `#71717a` on `#0b0d0f` | ~4.2:1 | 4.5:1 | ⚠️ Borderline |
| `#71717a` on `#10141a` | ~3.6:1 | 4.5:1 | ❌ Fail |
| `#3b82f6` on `#0b0d0f` | ~4.7:1 | 3:1 (UI) | ✅ Pass |

---

## Requirements

### Fixes

1. **Muted text on surface**: Change `text-zinc-500` to `text-zinc-400` (`#a1a1aa`) for muted text on surface cards — ratio improves to ~6.5:1
2. **Placeholder text**: Ensure `placeholder:text-zinc-500` on dark inputs meets 4.5:1
3. **Status badges**: Verify green/yellow/red badge text on colored backgrounds
4. **Focus rings**: Visible focus indicator with sufficient contrast

### Audit Approach

- Run `axe-core` in browser dev tools
- Check all color pairs programmatically
- Verify with Chrome DevTools contrast checker

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/tailwind.config.js` | **Modify** | Adjust muted text color token if needed |
| Component files using `text-zinc-500` | **Modify** | Switch to `text-zinc-400` where on surface BG |

---

## Acceptance Criteria

- [ ] All normal text ≥ 4.5:1 contrast ratio
- [ ] All large text ≥ 3:1 contrast ratio
- [ ] All UI components ≥ 3:1 contrast ratio
- [ ] Focus indicators visible on all backgrounds
- [ ] No WCAG AA violations in axe audit

---

## Dependencies

- **Blocked by**: None
- **Blocks**: None
