# Phase 03 · Onboarding Wizard + Category Preferences + Sound Toggle

> **Priority:** P0 · **Surface:** `apps/hybrid-app/`

## Goal

Add the post-permission onboarding wizard (Privacy → DND → Availability → Complete), a Category Preferences screen, and the missing notification-sound toggle. Match the web's first-launch UX so users land in a configured state.

## Exit Criteria

- Fresh install runs: Permission Setup → Privacy → DND → Availability → Complete → Dashboard.
- Wizard completion persisted; never shown again.
- Category Preferences screen reachable from Settings hub.
- Sound toggle bidirectionally synced with `privacyPreferences.notificationSoundEnabled`.

## Reference Files

- Web wizard: [apps/web/src/components/onboarding/OnboardingWizard.tsx](../../apps/web/src/components/onboarding/OnboardingWizard.tsx)
- Web preferences: [apps/web/src/app/(dashboard)/settings/preferences/page.tsx](../../apps/web/src/app/(dashboard)/settings/preferences/page.tsx)
- Hybrid permission setup: [apps/hybrid-app/lib/screens/setup/permission_setup_screen.dart](../../apps/hybrid-app/lib/screens/setup/permission_setup_screen.dart)
- Hybrid settings hub: [apps/hybrid-app/lib/screens/settings/settings_screen.dart](../../apps/hybrid-app/lib/screens/settings/settings_screen.dart)

## Todos

### 3.1 · Onboarding wizard scaffold
- [x] Add `lib/screens/onboarding/onboarding_wizard_screen.dart` with stepper (5 steps).
- [x] Register route `/onboarding` (root navigator).
- [x] In `lib/main.dart` (or AuthProvider), after permission setup completes and `onboarding_complete` flag is false → push `/onboarding`.
- [x] Persist `onboarding_complete` in `shared_preferences`.
- [x] Add "Skip for now" link on each non-final step (still records progress).

### 3.2 · Step 1 — Welcome
- [x] Hero illustration, value-prop bullets, CTA "Let's go".

### 3.3 · Step 2 — Privacy preferences
- [x] Embedded compact privacy form: profile visibility, allow-discovery toggles.
- [x] Save via existing `updatePrivacyPreferenceMutation` on Next.

### 3.4 · Step 3 — DND
- [x] "Add a default quiet window" form (e.g., 22:00–07:00, all days).
- [x] Save via `createDndRuleMutation`.
- [x] Allow skip.

### 3.5 · Step 4 — Availability
- [x] Add a default callback availability slot (e.g., Mon–Fri 10:00–17:00).
- [x] Save via `createAvailabilitySlotMutation`.
- [x] Allow skip.

### 3.6 · Step 5 — Complete
- [x] Confirmation screen with "You're all set" + CTA "Go to dashboard".
- [x] Set `onboarding_complete=true`; route replace to `/`.

### 3.7 · Category Preferences screen
- [x] Add `lib/screens/settings/category_preferences_screen.dart`.
- [x] Register route `/settings/preferences`.
- [x] Add tile to settings hub.
- [x] List categories (Personal / Service Provider / Advertisement) with toggles for: receive in-app, allow email, allow SMS, allow push.
- [x] Wire to `updateCategoryPreferenceMutation`.

### 3.8 · Notification sound toggle
- [x] Add Switch on Category Preferences screen for `notificationSoundEnabled`.
- [x] Wire to `updatePrivacyPreferenceMutation { notificationSoundEnabled }`.
- [x] In `NotificationProvider`, respect this flag locally — only play sound when `soundEnabled !== false`.
- [x] Add `lib/services/sound_service.dart` (already may exist — verify) using `audioplayers`. _(implemented with `SystemSound` instead of `audioplayers` — no asset bundling required, matches platform alert UX)_
- [ ] Widget test: toggle off → no sound played on incoming notification. _(deferred — phase test pass)_

### 3.9 · Cleanup
- [x] `flutter analyze`.
- [ ] Manual flow: clear app data → relaunch → run full onboarding. _(deferred — manual QA pass)_

## Closeout

**Status:** ✅ Implementation complete · ⏳ widget tests + manual flow QA deferred.

**What shipped:**
- 5-step onboarding wizard ([onboarding_wizard_screen.dart](../../apps/hybrid-app/lib/screens/onboarding/onboarding_wizard_screen.dart)) — Welcome → Privacy (4 toggles, saves via `updatePrivacyPreference`) → DND (default 22:00–07:00 all-week, saves via `createDNDRule`) → Availability (Mon–Fri 10:00–17:00, saves 5 slots via `createAvailabilitySlot`) → Complete. Each step has a Skip action; the wizard is gated by an `onboarding_complete` SharedPreferences flag.
- Router redirect: authenticated user with `!onboardingComplete` is forced to `/onboarding`; the dashboard becomes reachable only after the user taps *Go to dashboard*.
- [CategoryPreferencesScreen](../../apps/hybrid-app/lib/screens/settings/category_preferences_screen.dart) at `/settings/preferences` — three category cards (Personal / Service Provider / Advertisement) plus the **Notification sounds** switch. All toggles bind to `updatePrivacyPreference` and roll back on mutation failure.
- New tile **Notification Preferences** at the top of the [Settings hub](../../apps/hybrid-app/lib/screens/settings/settings_screen.dart).
- New [SoundService](../../apps/hybrid-app/lib/services/sound_service.dart) with hydrate/setEnabled/play API — backed by `SharedPreferences` and `SystemSound.alert` (no asset, no extra plugin).
- [NotificationProvider](../../apps/hybrid-app/lib/providers/notification_provider.dart) now plays the sound on incoming `notification` SSE events, honoring both server-provided `suppressed`/`soundEnabled` flags AND the local cache.
- [AuthProvider](../../apps/hybrid-app/lib/providers/auth_provider.dart) hydrates `onboardingComplete` from SharedPreferences during session restore and exposes `markOnboardingComplete()` to nudge the router.

**Verification:** `flutter analyze` against all Phase 03 files → **No issues found**.

**Known deferrals:**
- Widget tests + manual fresh-install flow → dedicated QA pass.
- i18n: copy is English-only (no `app_localizations` setup in the app yet).
- Sound implementation uses `SystemSound.alert` rather than the `audioplayers` plugin — zero-asset, but the chime is the OS default. Swap to a bundled `assets/sounds/notification.mp3` whenever a brand sound is shipped.

## Test Plan

- Widget tests per step.
- Integration test: launch fresh app → complete wizard → verify backend has DND/availability/preferences rows.

## Risks

- Don't block users who skip — every step must be optional except the final completion tap.
- Locale: all wizard copy must go through `app_localizations` if i18n is in scope (defer if not yet enabled).
