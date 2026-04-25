# TrustInbox · Web ↔ Hybrid Parity Plan

> Owner: Principal Engineering · Mobile / UI-UX
> Scope: customer-facing apps only — `apps/web/` (Next.js 14) and `apps/hybrid-app/` (Flutter).
> Provider portal (`apps/provider/`) and Admin (`apps/admin/`) are **out of scope**.

This folder contains the phased execution plan to bring the Flutter hybrid app to feature parity with the web app, plus close the small set of gaps that exist on both sides (auth flows, push, document upload).

Each phase document is self-contained with:
- Goal & exit criteria
- Affected files / new files to create
- Backend dependencies (proto, gateway, services)
- Detailed todo checklist (one task per checkbox)
- Test plan
- Risks

---

## Phase Index

| Phase | ID | Title | Owner Surface | Priority | Status |
|-------|----|-------|---------------|----------|--------|
| 1 | [`phase-01-hybrid-chat-parity.md`](phase-01-hybrid-chat-parity.md) | Hybrid Chat Parity (attachments, reactions, typing, voice, forward/star/pin) | Hybrid | P0 | ✅ Implementation done · ⏳ widget tests pending |
| 2 | [`phase-02-service-providers-bot-chat.md`](phase-02-service-providers-bot-chat.md) | Service Provider Detail + Bot Chat | Hybrid | P0 | ✅ Implementation done · ⏳ widget tests pending |
| 3 | [`phase-03-onboarding-preferences.md`](phase-03-onboarding-preferences.md) | Onboarding Wizard + Category Preferences + Sound Toggle | Hybrid | P0 | ✅ Implementation done · ⏳ widget tests pending |
| 4 | [`phase-04-profile-career.md`](phase-04-profile-career.md) | Profile Tabs · Avatar Upload · Career CRUD | Hybrid | P1 |
| 5 | [`phase-05-inbox-callbacks-documents.md`](phase-05-inbox-callbacks-documents.md) | Inbox SSE Refetch · Expired Callbacks · Documents UX | Hybrid | P1 |
| 6 | [`phase-06-dashboard-ai-realtime.md`](phase-06-dashboard-ai-realtime.md) | AI Summary Widget · XMPP Transport · Theme Settings | Hybrid | P2 |
| 7 | [`phase-07-cross-platform-auth-push.md`](phase-07-cross-platform-auth-push.md) | Forgot-Password · OTP · Document Upload · FCM/APNS Push | Web + Hybrid | P3 |
| 8 | [`phase-08-hardening-tests.md`](phase-08-hardening-tests.md) | Tests · Empty States · Accessibility · Polish | Web + Hybrid | P4 |

---

## Tracking convention

Mark a checkbox as done by replacing `- [ ]` with `- [x]`. Each task line should be **one PR or one commit**. When a phase reaches 100%, append a `## Closeout` section with:
- PR links
- Build/test artifacts
- Demo screenshots/screencasts
- Deviation notes

A phase is **complete** only when every checkbox is ticked **and** the test plan passes on CI.

---

## Cross-phase tenets (apply to all)

- Follow [.github/copilot-instructions.md](../../.github/copilot-instructions.md) — clean architecture, no business logic in handlers/resolvers, typed errors, structured logging.
- No new frameworks without explicit approval. Hybrid: stick with `graphql_flutter`, `provider`, `go_router`, `flutter_contacts`, `permission_handler`.
- All gateway changes ship with proto + resolver + REST proxy + GraphQL schema regeneration.
- Every new screen ships with at least one widget test (Hybrid) or Vitest test (Web).
- Every new GraphQL field is reflected in `gateway/graphql-bff/graph/schema.graphqls` and regenerated via `make gqlgen`.
