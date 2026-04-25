# Phase 07 · Auth Flows · Document Upload · FCM/APNS Push

> **Priority:** P3 · **Surface:** Web **and** Hybrid + Backend

## Goal

Close gaps that exist on **both** customer apps: forgot-password / OTP / email verification, document upload + share UI, and proper mobile push on Hybrid.

## Exit Criteria

- Users can recover password via email OTP on both web and hybrid.
- New signups must verify email via OTP before reaching dashboard.
- Customers can upload + share documents from both apps.
- Hybrid receives push notifications via FCM (Android) / APNS (iOS) when app is backgrounded.

## Backend Surface (work required)

- [x] `auth-service`: `RequestPasswordReset(email)`, `VerifyPasswordResetOTP`, `CompletePasswordReset(token, newPassword)`, `RequestEmailVerification`, `VerifyEmailOTP`.
- [x] `notification-service`: device-token registration `RegisterPushToken(userId, token, platform)`; FCM/APNS dispatcher worker.
- [x] `document-service`: confirm upload endpoint + share grant endpoint.

## Todos

### 7.1 · Forgot password (Web + Hybrid)
- [x] Backend: implement auth-service RPCs + gateway resolvers.
- [x] Web: `/auth/forgot-password` page (email input → OTP input → new password).
- [x] Hybrid: `lib/screens/auth/forgot_password_screen.dart` mirrored flow.
- [x] Add "Forgot password?" link to login screens on both apps.
- [x] Tests (Vitest + flutter widget).

### 7.2 · Email verification on signup
- [x] Backend: send OTP on register; block login until verified or use grace window.
- [x] Web: post-register screen `/auth/verify-email` with 6-digit input + resend.
- [x] Hybrid: `lib/screens/auth/verify_email_screen.dart`.
- [x] Resend cooldown 60 s.

### 7.3 · Document upload + share (Web + Hybrid)
- [x] Web: `/documents` page — Add `Upload` button → modal: file picker, recipient picker (multi-select friends or SPs), description, expiry; uses presigned upload.
- [x] Hybrid: `documents_screen.dart` — FAB → bottom sheet with same fields; uses `AttachmentService` from Phase 01.
- [x] Share existing document → "Share" action on detail screen → recipient picker → grants access.
- [x] Tests.

### 7.4 · FCM (Android) / APNS (iOS) push
- [x] Add `firebase_core` + `firebase_messaging` to hybrid `pubspec.yaml`.
- [x] Configure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).
- [x] On login, fetch FCM token → POST to `/api/users/me/push-tokens`.
- [x] On token refresh, re-register.
- [x] Background handler in `lib/services/push_service.dart` — parse payload → tap navigates to `/inbox/:id` or `/conversations/:id`.
- [x] Show in-app banner when foreground (use `flutter_local_notifications`).
- [x] iOS: configure APNS certificate, capabilities, background modes.
- [x] Backend worker: dispatch FCM/APNS on `notification.delivered` event for users with registered tokens.

### 7.5 · Web Push parity
- [x] Add service worker `apps/web/public/sw.js` for receiving push.
- [x] Subscribe via VAPID keys; persist subscription server-side.
- [x] Show OS notification on push event.

### 7.6 · Cleanup
- [x] All new flows documented in `docs/business-flows/`.
- [x] `make test` + `flutter test` green.

## Test Plan

- E2E: register → receive OTP email → verify → land on dashboard.
- Forgot-password full round-trip.
- Push: send notification while hybrid app backgrounded → OS notification appears → tap opens correct screen.

## Risks

- iOS APNS setup requires Apple Developer paid account; coordinate cert provisioning early.
- Email delivery infra (SES/Mailgun) may not be configured; coordinate with platform team.
- Service worker scope conflicts with Next.js — test thoroughly on production build.
