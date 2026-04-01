# Task 15.3 — Branding Settings

> **Section**: 15. Settings  
> **Priority**: P2 — Customization  
> **Estimated Scope**: Small  
> **Route**: `/settings/profile`  
> **Status**: ✅ Complete

---

## Objective

Add branding settings to the organization profile: primary color picker and notification template customization.

---

## Requirements

### Branding Fields

| Field | Type | Description |
|-------|------|-------------|
| Primary Color | Color picker | Hex value (e.g., `#3b82f6`) |
| Notification Footer | Textarea | Default footer text for all notifications |
| Email Template | Select | Choose from predefined email templates |

### Features

- Color picker with hex input
- Live preview: shows a sample notification with the selected color/footer
- Save with the organization profile

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/profile/page.tsx` | **Modify** | Add branding section |

---

## Acceptance Criteria

- [ ] Color picker with hex input
- [ ] Notification footer textarea
- [ ] Live preview of branding
- [ ] Saved with organization profile
- [ ] SP_ADMIN role guard

---

## Dependencies

- **Blocked by**: Task 15.2 (org profile form), Task 15.4 (save mutation)
- **Blocks**: None
