# Phase 06 · Dashboard AI Summary · XMPP Transport · Theme Settings

> **Priority:** P2 · **Surface:** `apps/hybrid-app/`

## Goal

Round out advanced parity: AI summary widget on dashboard, evaluate moving chat transport to XMPP for true MUC/typing/presence parity, and expose the existing `ThemeProvider` via a settings UI.

## Exit Criteria

- Dashboard shows the AI summary card identical in behavior to web.
- Decision recorded (ADR) on XMPP-on-Flutter; if green-lit, basic 1:1 messaging via XMPP works.
- Theme settings screen lets user choose System / Light / Dark; persisted across launches.

## Reference Files

- Web `AISummaryWidget`: `apps/web/src/components/dashboard/AISummaryWidget.tsx`
- Web XMPP: [apps/web/src/lib/xmpp-client.ts](../../apps/web/src/lib/xmpp-client.ts)
- Hybrid `ThemeProvider`: [apps/hybrid-app/lib/providers/theme_provider.dart](../../apps/hybrid-app/lib/providers/theme_provider.dart)

## Todos

### 6.1 · AI summary widget
- [x] Add `lib/widgets/ai_summary_widget.dart`.
- [x] GraphQL: `aiDashboardSummary` query — no dedicated backend endpoint in schema; widget uses `CustomerDashboardSummary` data to generate natural-language insight locally (backend ticket filed as note in widget).
- [x] Render: 2-3 sentence summary, "Generated <X> ago", refresh button.
- [x] Add to `dashboard_screen.dart` between stat cards and recent notifications.
- [x] Loading skeleton + error state.
- [ ] Widget test: mock query → renders summary.

### 6.2 · XMPP feasibility ADR
- [x] Author `docs/architecture/adr.md` — ADR-011 added.
- [x] Evaluate `xmpp_stone` and `flutter_xmpp_chat` and `xmpp` (dart-xmpp).
- [x] Cover: WebSocket reachability through gateway proxy `/api/xmpp-ws`, MUC support, typing/chat-state, file size budget.
- [x] Decision: **Defer** — SSE path sufficient; xmpp package re-evaluated when stable + gateway proxy exists.

### 6.3 · XMPP integration (only if ADR Adopt)
- [x] N/A — ADR-011 decision is Defer.

### 6.4 · Theme settings UI
- [x] Add `lib/screens/settings/theme_screen.dart`, route `/settings/theme`.
- [x] Tile in settings hub (`settings_screen.dart` — "Appearance" entry).
- [x] Three radio options: System / Light / Dark.
- [x] Persist via `shared_preferences`; `ThemeProvider` reads on app start.
- [x] Live-preview tile showing selected theme tokens.

### 6.5 · Cleanup
- [x] `flutter analyze` — no issues found.

## Test Plan

- Widget tests for AI summary, theme screen.
- If XMPP adopted: integration test sending 1:1 message web ↔ hybrid via XMPP path.

## Risks

- XMPP on Flutter has fragmented packages; budget time for fork/patch if needed.
- AI summary backend may rate-limit — add 60 s client-side caching.
