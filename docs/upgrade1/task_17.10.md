# Task 17.10 — Keyboard Navigation

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P2 — Accessibility  
> **Estimated Scope**: Medium  
> **File**: Multiple component files  
> **Status**: ✅ Complete

---

## Objective

Ensure full keyboard navigation across all interactive elements: tables, modals, tabs, forms, and drawers.

---

## Requirements

### Global Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift+Tab` | Move focus to previous interactive element |
| `Escape` | Close modal/drawer/dropdown |
| `Enter` / `Space` | Activate focused element |

### Table Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move row focus |
| `Enter` | Open row detail / expand row |
| `Delete` | Trigger delete action (with confirmation) |

### Tab Navigation

| Key | Action |
|-----|--------|
| `←` / `→` | Switch between tab panels |
| `Home` | Go to first tab |
| `End` | Go to last tab |

### Modal/Drawer

- Focus trap: Tab cycles within modal when open
- Auto-focus first interactive element on open
- Return focus to trigger element on close

### Implementation Approach

- Use `tabIndex`, `role`, `aria-*` props
- Use `onKeyDown` handlers for custom keyboard interactions
- For focus trap: use a `useFocusTrap` hook or `@headlessui/react` Dialog

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| All table components | **Modify** | Arrow key navigation |
| All tab components | **Modify** | Left/right navigation |
| All modal/drawer components | **Modify** | Focus trap + Escape |

---

## Acceptance Criteria

- [ ] All interactive elements reachable via Tab
- [ ] Table rows navigable with arrow keys
- [ ] Tabs navigable with arrow keys
- [ ] Modals have focus trap
- [ ] Escape closes overlays
- [ ] Focus returns to trigger after close

---

## Dependencies

- **Blocked by**: UI components must exist
- **Blocks**: None
