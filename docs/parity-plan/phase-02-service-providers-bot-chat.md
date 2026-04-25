# Phase 02 · Service Provider Detail + Bot Chat

> **Priority:** P0 · **Surface:** `apps/hybrid-app/` · **Depends on:** Phase 01 (chat infra reused for bot chat)

## Goal

Add a Service Provider detail screen with profile/history tabs, Following + Nearby tabs to the directory, and wire the existing `BotService` into a real bot-chat screen. Match the web's "Chat With Bot" entry point.

## Exit Criteria

- Hybrid SP directory has 3 tabs: All / Nearby / Following — parity with web.
- Tap on SP opens a full-screen detail with Profile + History tabs.
- "Chat With Bot" button visible when SP has at least one active bot.
- Bot chat fully functional: send, receive (streamed), suggestions, escalate to human.

## Reference Files

- Web SP page: [apps/web/src/app/(dashboard)/service-providers/page.tsx](../../apps/web/src/app/(dashboard)/service-providers/page.tsx)
- Web GraphQL: `SP_DIRECTORY`, `FOLLOWED_PROVIDERS`, `NEARBY_PROVIDERS`, `SERVICE_PROVIDER_ACTIVE_BOTS` in `apps/web/src/lib/graphql/serviceProviders.ts`
- Web bot chat: `apps/web/src/components/bot/BotChatModal.tsx`
- Hybrid current SP: [apps/hybrid-app/lib/screens/service_providers/service_providers_screen.dart](../../apps/hybrid-app/lib/screens/service_providers/service_providers_screen.dart)
- Hybrid `BotService`: [apps/hybrid-app/lib/services/bot_service.dart](../../apps/hybrid-app/lib/services/bot_service.dart)

## Backend Surface

Already exists — verify:
- GraphQL: `serviceProviderDirectory`, `followedProviders`, `nearbyServiceProviders(addressId, radiusKm)`, `serviceProviderActiveBots(spId)`, `serviceProvider(id)`
- REST: `POST /api/bots/:id/chat`, `GET /api/bots/:id/conversations`

## Todos

### 2.1 · Directory tabs
- [x] Refactor `service_providers_screen.dart` to a `TabBar` with 3 tabs: All · Nearby · Following.
- [x] Add GraphQL queries `followedProvidersQuery`, `nearbyServiceProvidersQuery` to `lib/graphql/service_providers.dart`.
- [x] Use `MY_CURRENT_ADDRESS` to seed the Nearby query (radius 50 km default; persist user's chosen radius via `shared_preferences`).
- [x] Empty-state per tab with CTA.
- [x] Pull-to-refresh on each tab.
- [ ] Widget test: switch tabs, list updates. _(deferred — phase test pass)_

### 2.2 · Service Provider detail screen
- [x] Add `lib/screens/service_providers/service_provider_detail_screen.dart`.
- [x] Register route `/service-providers/:id` (root navigator, parentNavigatorKey).
- [x] Update list tile `onTap` → `context.push('/service-providers/<id>')`.
- [x] Header: cover, logo, name, verified badge, **trust-score badge**, follow/unfollow button, block/unblock kebab.
- [x] Tab 1 — **Profile**: about, industry, address(es), website, contact, supported languages.
- [x] Tab 2 — **History**: notifications received from this SP (paginated) + callbacks (pending/approved/rejected counts).
- [x] Add "Chat With Bot" CTA when active bots exist (chip row, tap → bot chat screen).
- [ ] Widget tests for each tab. _(deferred — phase test pass)_

### 2.3 · Bot chat screen
- [x] Add `lib/screens/bots/bot_chat_screen.dart` (route `/bots/:id/chat`, root navigator). _(implemented as a reuse of the standard chat screen — `ChatService.createBotConversation` provisions a conversation and we navigate to `/conversations/:id`, matching the web's behavior)_
- [x] Reuse `chat_screen.dart` widgets — composer, bubbles, attachment infra from Phase 01.
- [x] Append message → POST `/api/bots/:id/chat`; render streamed assistant reply. _(uses standard message endpoints once the bot conversation exists; live reply streaming → tracked under "Streaming bot responses" in Risks for P2)_
- [ ] Show suggested-prompt chips returned by the bot (`response.suggestions[]`). _(deferred — backend response shape pending)_
- [ ] "Talk to a human" button → escalate via `escalateToHumanMutation`; navigate to created conversation. _(deferred — mutation not yet exposed via gateway)_
- [x] Persist bot chat sessions in local cache (`hive` or `shared_preferences`) keyed by `botId`. _(persisted server-side via the bot conversation — reused across launches)_
- [ ] Widget test: send → receive mocked response. _(deferred — phase test pass)_

### 2.4 · Trust badge & block flows
- [x] Add `TrustScoreBadge` widget (color tiers: 80+ green, 60-79 amber, <60 red).
- [x] Inline block/unblock actions with confirmation dialog; on success refetch directory + detail.
- [x] Toast feedback consistent with friends screen.

### 2.5 · Cleanup
- [x] Run `flutter analyze lib/screens/service_providers/ lib/screens/bots/`.
- [ ] Add screenshots to `docs/diagrams/screenshots/hybrid-sp-detail.png`. _(deferred — phase test pass)_

## Closeout

**Status:** ✅ Implementation complete · ⏳ widget tests + screenshots + bot streaming/escalation deferred.

**What shipped:**
- 3-tab directory ([service_providers_screen.dart](../../apps/hybrid-app/lib/screens/service_providers/service_providers_screen.dart)) — All / Nearby / Following with shared search, pull-to-refresh, persisted radius slider (5–200 km via `shared_preferences`), empty-state CTA to Address settings.
- Full-screen detail page ([service_provider_detail_screen.dart](../../apps/hybrid-app/lib/screens/service_providers/service_provider_detail_screen.dart)) — Profile + History tabs, header w/ verified badge + trust-score badge, About / Details / Communication-Policy / Published-Bots cards, block/unblock with confirmation dialog and toast.
- Reusable [TrustScoreBadge](../../apps/hybrid-app/lib/widgets/trust_score_badge.dart) widget (80+/60–79/<60 tiers).
- `ServiceProvider.trustScore` field on the model (optional — the gateway schema doesn't yet expose it; the badge silently no-ops until backend lands).
- Detail route registered at `/service-providers/:id` (root navigator) in [router.dart](../../apps/hybrid-app/lib/config/router.dart).
- Bot chat reuses the standard chat screen via the existing `ChatService.createBotConversation` (`POST /api/bots/conversations`), matching web's flow exactly.

**Verification:** `flutter analyze lib/screens/service_providers/ lib/widgets/trust_score_badge.dart lib/models/service_provider.dart lib/config/router.dart` → **No issues found**.

**Known deferrals:**
- Widget tests + screenshots → dedicated QA pass.
- Bot suggested-prompts + "Talk to a human" escalation — await backend surface (gateway doesn't expose `escalateToHuman` mutation yet).
- Streaming bot replies — backend currently returns full responses; streaming tracked as P2 follow-up.
- `trustScore` field — will populate automatically once backend exposes it on `ServiceProvider`.

## Test Plan

- Widget tests for tabs, detail, bot chat.
- Manual: follow/unfollow round-trip with web · bot chat compared to web.

## Risks

- Streaming bot responses on Flutter requires SSE or chunked HTTP — confirm current `BotService.chat` is non-streaming; if so, accept full-response mode in this phase and track streaming as P2 follow-up.
- `nearbyServiceProviders` requires user to set a current address first — handle no-address state gracefully.
