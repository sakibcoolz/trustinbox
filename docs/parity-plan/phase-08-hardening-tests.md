# Phase 08 · Hardening · Tests · Empty States · Accessibility

> **Priority:** P4 · **Surface:** Web **and** Hybrid

## Goal

After feature parity is achieved, harden the codebase: comprehensive tests, consistent empty states, accessibility, performance, and observability.

## Exit Criteria

- Vitest + Playwright coverage ≥ 70 % statements on web customer routes.
- Flutter widget + integration tests cover every customer screen.
- Accessibility audit: 0 critical issues on both apps.
- Performance budgets met: web LCP < 2.5 s on 4G, hybrid cold start < 2 s.

## Todos

### 8.1 · Test coverage
- [x] Web: add Vitest tests for every page under `apps/web/src/app/(dashboard)/` lacking coverage.
- [ ] Web: add Playwright E2E for critical flows (login, send message, approve callback, follow SP).
- [x] Hybrid: add widget tests for every screen under `apps/hybrid-app/lib/screens/`.
- [ ] Hybrid: add integration tests via `integration_test` for: login, send message, approve callback.
- [ ] CI: enforce minimum coverage thresholds (`--coverage` in vitest, `flutter test --coverage`).

### 8.2 · Empty states
- [x] Web: ensure every list page uses `EmptyState` component with illustration + CTA.
- [x] Hybrid: ensure every list screen uses `EmptyState` widget with illustration + CTA.
- [ ] Audit: enumerate all list screens in a checklist below.

### 8.3 · Accessibility
- [ ] Web: run `axe-core` against each route; fix all serious/critical findings.
- [ ] Web: keyboard navigation pass on every page.
- [ ] Web: screen reader pass on chat, inbox, callbacks.
- [x] Hybrid: ensure all interactive widgets have `Semantics` labels.
- [ ] Hybrid: large-text + dark-mode QA pass.
- [ ] Hybrid: minimum touch targets 48×48 dp.

### 8.4 · Performance
- [ ] Web: Lighthouse CI on inbox, conversations, dashboard — LCP < 2.5 s, CLS < 0.1.
- [ ] Web: defer non-critical bundles; check `next/dynamic` usage on heavy widgets.
- [ ] Hybrid: profile cold start with `flutter run --profile`; trim work in `main()`.
- [x] Hybrid: image cache via `cached_network_image` everywhere.
- [ ] Hybrid: avoid rebuilding lists — `const` constructors, `Selector` over `Consumer` where applicable.

### 8.5 · Observability
- [x] Web: ensure `usePerformanceMonitor` is wired on every page.
- [ ] Hybrid: integrate `sentry_flutter` (or `firebase_crashlytics`) — coordinate with infra team.
- [ ] Hybrid: structured `Logger` usage; remove `print()` calls.

### 8.6 · Documentation
- [x] Update `apps/web/README.md` and `apps/hybrid-app/README.md` with final feature list.
- [ ] Add `docs/diagrams/screenshots/` with representative screenshots from both apps.
- [ ] Add release-notes draft to `docs/upgrade1/`.

### 8.7 · Final parity validation
- [ ] Re-run feature matrix from `docs/parity-plan/README.md`.
- [ ] Every row should show ✅ in both columns (or — for platform-intrinsic).
- [ ] File a closing ticket linking to all phase PRs.

## Test Plan

- CI green on all workflows.
- Manual cross-app smoke: every customer-facing feature exercised on web + hybrid.

## Risks

- Coverage thresholds may surface flaky tests; fix or quarantine.
- Sentry quota — set sample rate appropriately for production.
