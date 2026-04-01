# Task 15.7 — Preview Industry Defaults

> **Section**: 15. Settings  
> **Priority**: P2 — UX  
> **Estimated Scope**: Small  
> **Route**: `/settings/industry`  
> **Status**: ✅ Complete

---

## Objective

Add a preview panel that shows what policies and templates will be applied when an industry profile is selected, before the user saves.

---

## Requirements

### Preview Layout

- Shown beside or below the industry selector
- Shows a summary of what the selected profile includes:
  - Number of default categories
  - Compliance requirements count
  - Communication rules summary
  - Available bot templates count
- "Apply" button to confirm selection
- "Compare" view: diff between current settings and new industry defaults

### Features

- Updates dynamically when a different industry is selected from the dropdown
- Non-destructive: doesn't save until "Apply" is clicked
- Warning banner if switching from one industry to another: "Changing industry profile will reset custom overrides"

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/industry/page.tsx` | **Modify** | Add preview panel |

---

## Acceptance Criteria

- [ ] Preview updates on industry selection
- [ ] Shows summary of what profile includes
- [ ] "Apply" confirmation button
- [ ] Warning when changing industries

---

## Dependencies

- **Blocked by**: Task 15.5 (industry selector), Task 15.6 (industry config display)
- **Blocks**: None
