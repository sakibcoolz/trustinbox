# Phase 04 · Profile Tabs · Avatar Upload · Career CRUD

> **Priority:** P1 · **Surface:** `apps/hybrid-app/`

## Goal

Rebuild the hybrid profile screen with the same tabbed layout as web — Overview / Activity / Privacy / Security / Career — and add avatar upload plus full career CRUD (work experience, education, skills).

## Exit Criteria

- `/profile` shows all 5 tabs with feature parity to web.
- Users can upload/change/remove avatar.
- Users can add, edit, delete work experience, education entries, skills.
- Cover gradient picker with 5 presets.

## Reference Files

- Web profile: [apps/web/src/app/(dashboard)/profile/page.tsx](../../apps/web/src/app/(dashboard)/profile/page.tsx)
- Web `useAvatarUpload`: `apps/web/src/lib/hooks/useAvatarUpload.ts`
- Web `useCareer`: `apps/web/src/lib/hooks/useCareer.ts`
- Hybrid current: [apps/hybrid-app/lib/screens/profile/profile_screen.dart](../../apps/hybrid-app/lib/screens/profile/profile_screen.dart)

## Todos

### 4.1 · Tabbed layout
- [ ] Refactor `profile_screen.dart` into a `DefaultTabController` with 5 tabs.
- [ ] Sticky header (cover gradient, avatar, name, badges); content below switches per tab.
- [ ] Cover gradient picker bottom sheet (5 presets matching web tokens).
- [ ] Persist gradient choice via `updateUserProfileMutation { coverGradient }`.

### 4.2 · Avatar upload
- [ ] Tap on avatar → bottom sheet: Camera / Gallery / Remove.
- [ ] Use `image_picker` + `image_cropper` to crop to 1:1.
- [ ] Upload to `/api/users/me/avatar` (presigned-URL flow) → mutate `updateUserProfile { avatarUrl }`.
- [ ] Show progress indicator overlay.
- [ ] Optimistic local cache update.
- [ ] Widget test: pick → crop → bubble shows new image.

### 4.3 · Overview tab
- [ ] Bio (editable inline), gender, language, joined date, privacy score gauge.
- [ ] Connected providers count → tap navigates to `/service-providers?tab=following`.

### 4.4 · Activity tab
- [ ] Embed `ActivityFeedWidget` (same component used in `/activity`) filtered to current user.

### 4.5 · Privacy tab
- [ ] Read-only summary of current privacy preferences with edit shortcut to `/settings/privacy`.

### 4.6 · Security tab
- [ ] Last-login info (from `me { lastLoginAt }`).
- [ ] Change password CTA → `/auth/change-password` (Phase 07 dependency — placeholder for now).
- [ ] Active sessions list (if backend exposes it; otherwise show "Coming soon").
- [ ] 2FA toggle placeholder.

### 4.7 · Career tab
- [ ] Sections: Work experience · Education · Skills.
- [ ] Each section: list with edit/delete actions + "Add" CTA.
- [ ] Forms in modal bottom sheets:
  - Work: title, company, location, startDate, endDate (or current), description.
  - Education: institution, degree, field, startYear, endYear.
  - Skills: name + level (Beginner/Intermediate/Advanced/Expert) chips.
- [ ] Wire to `createWorkExperienceMutation`, `updateWorkExperienceMutation`, `deleteWorkExperienceMutation` (and education/skills equivalents).
- [ ] Widget tests for each form.

### 4.8 · Cleanup
- [ ] `flutter analyze lib/screens/profile/`.

## Test Plan

- Widget tests for tabs and each career form.
- Integration: add work + edit + delete → verify via GraphQL `me { workExperience { ... } }`.

## Risks

- Cropper plugin sometimes fails on Android 14 emulator — pin a tested version.
- Avatar upload may require image-resize on-device (Android camera produces 4K) — compress to ≤ 1024px before upload.
