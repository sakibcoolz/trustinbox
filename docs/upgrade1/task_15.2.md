# Task 15.2 — Organization Profile Form

> **Section**: 15. Settings  
> **Priority**: P1 — Core settings  
> **Estimated Scope**: Medium  
> **Route**: `/settings/profile`  
> **File**: `apps/provider/src/app/settings/profile/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

The profile settings page already exists (224 lines) with functional profile editing (full name, timezone, language), password change, and session management via REST API. This task upgrades it to include organization-level fields: org name, display name, logo upload, description, website URL, contact email, support phone, and address fields.

---

## Current State

`apps/provider/src/app/settings/profile/page.tsx` (224 lines):
- Account info (read-only): avatar, full name, role badge, username, email, user ID
- Edit profile form: full name, timezone, language → calls `profileApi.update()`
- Change password form: current/new/confirm passwords
- Session management: active sessions, 2FA status, last login, password updated
- All functional via REST API (`@/lib/api`)

### Missing Organization Fields

The page manages personal profile only. Organization profile fields are missing:
- Org name, display name
- Logo upload
- Description, website URL
- Contact email, support phone
- Address fields

---

## Requirements

### New Section: Organization Profile

Add a new card/section below the existing personal profile:

| Field | Type | Validation |
|-------|------|------------|
| Organization Name | Text | Required, max 100 |
| Display Name | Text | Required, max 50 |
| Logo | File upload | Image only, max 2MB |
| Description | Textarea | Max 500 chars |
| Website URL | URL input | Valid URL format |
| Contact Email | Email input | Valid email |
| Support Phone | Tel input | Optional |
| Address Line 1 | Text | Optional |
| Address Line 2 | Text | Optional |
| City | Text | Optional |
| State/Region | Text | Optional |
| Postal Code | Text | Optional |
| Country | Dropdown | Optional |

### Save Action

- Submit via GraphQL mutation (or existing REST API pattern)
- Show success/error messages using existing pattern
- Only visible/editable by SP_ADMIN role

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/profile/page.tsx` | **Modify** | Add organization profile section |

---

## Acceptance Criteria

- [ ] Organization profile section with all fields
- [ ] Logo upload with preview
- [ ] Save button calls backend
- [ ] Success/error messages
- [ ] SP_ADMIN role guard on org fields
- [ ] Existing personal profile functionality preserved

---

## Dependencies

- **Blocked by**: Task 15.4 (save profile mutation)
- **Blocks**: None
