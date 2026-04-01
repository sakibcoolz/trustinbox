# Task 15.1 — Settings Overview Page

> **Section**: 15. Settings  
> **Priority**: P1 — Navigation  
> **Estimated Scope**: Small  
> **Route**: `/settings`  
> **File**: `apps/provider/src/app/settings/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Create a settings overview page with navigation cards linking to sub-sections: Profile, Industry, and Team.

---

## Requirements

### Navigation Cards

| Card | Route | Icon | Description |
|------|-------|------|-------------|
| Profile | `/settings/profile` | User icon | Manage account details, password, sessions |
| Industry | `/settings/industry` | Building icon | Configure industry-specific settings |
| Team | `/settings/team` | Users icon | Manage agents and team members |
| Branding | `/settings/branding` | Palette icon | Customize notification templates (future) |

### Layout

- Grid of cards (2 columns)
- Each card: icon, title, description, arrow indicator
- Hover effect: slight elevation
- Role guard: Team settings requires SP_ADMIN

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/page.tsx` | **Create or Modify** | Settings overview with nav cards |

---

## Acceptance Criteria

- [ ] Grid of navigation cards linking to sub-sections
- [ ] Proper icons and descriptions
- [ ] Hover effects
- [ ] Role-based visibility (Team → SP_ADMIN+)

---

## Dependencies

- **Blocked by**: None
- **Blocks**: None
