# Phase 05 · Inbox SSE Refetch · Expired Callbacks · Documents UX

> **Priority:** P1 · **Surface:** `apps/hybrid-app/`

## Goal

Tighten three list-based screens to match web behavior: Inbox auto-refreshes on SSE, Callbacks gains the Expired tab, and Documents gets search + detail panel + presigned download.

## Exit Criteria

- New notification arrives via SSE → inbox list reflects it without manual pull-to-refresh.
- Callbacks tabs: All / Pending / Approved / Rejected / **Expired**.
- Documents: search bar, detail screen, working presigned-URL download with progress.

## Reference Files

- Web inbox: [apps/web/src/app/(dashboard)/inbox/page.tsx](../../apps/web/src/app/(dashboard)/inbox/page.tsx)
- Web callbacks: [apps/web/src/app/(dashboard)/callbacks/page.tsx](../../apps/web/src/app/(dashboard)/callbacks/page.tsx)
- Web documents: [apps/web/src/app/(dashboard)/documents/page.tsx](../../apps/web/src/app/(dashboard)/documents/page.tsx)
- Hybrid inbox: [apps/hybrid-app/lib/screens/inbox/inbox_screen.dart](../../apps/hybrid-app/lib/screens/inbox/inbox_screen.dart)
- Hybrid callbacks: [apps/hybrid-app/lib/screens/callbacks/callbacks_screen.dart](../../apps/hybrid-app/lib/screens/callbacks/callbacks_screen.dart)
- Hybrid documents: [apps/hybrid-app/lib/screens/documents/documents_screen.dart](../../apps/hybrid-app/lib/screens/documents/documents_screen.dart)

## Todos

### 5.1 · Inbox SSE-driven refetch
- [x] In `inbox_screen.dart`, subscribe to `NotificationProvider.onNotification` stream.
- [x] On new event, call the GraphQL `refetch()` (debounced 500 ms) so badges and ordering update.
- [x] Add unread count badge on each tab header.
- [x] Empty-state CTA → "Browse providers" deep-link to `/service-providers`.
- [x] Pagination UI: "Load more" button at list bottom (or auto-page on scroll).
- [ ] Widget test: emit fake SSE event → list rebuilds.

### 5.2 · Callbacks Expired tab
- [x] Add 5th tab `Expired`.
- [x] Filter by `status == 'EXPIRED'`.
- [x] Style chip with grey/muted color.
- [x] Empty state copy: "No expired callbacks. Approved windows will appear here after expiry."
- [ ] Widget test: load page with mixed statuses → tab counts correct.

### 5.3 · Documents — search bar
- [x] Add `SearchBar` at top of `documents_screen.dart`; debounce 300 ms.
- [x] Filter on filename + sender + tag (client-side initially; backend search later).
- [ ] Widget test: typing filters list.

### 5.4 · Documents — detail screen
- [x] Add `lib/screens/documents/document_detail_screen.dart`, route `/documents/:id` (root navigator).
- [x] List tile `onTap` → `context.push('/documents/<id>')`.
- [x] Show: filename, mime, size, sender, sharedAt, expiresAt, description.
- [ ] Preview: image inline; PDF via `flutter_pdfview`; other types show generic icon + "Open" button.

### 5.5 · Documents — presigned download
- [x] On "Download" tap → call `GET /api/gateway/documents/signed-url/:id` → fetch URL → save to device using `http` + `path_provider`.
- [x] Show progress dialog during download.
- [x] Open file via `url_launcher` on success.
- [x] Error handling: revoke / expired → friendly toast + retry.

### 5.6 · Cleanup
- [x] `flutter analyze lib/screens/inbox/ lib/screens/callbacks/ lib/screens/documents/`.

## Test Plan

- Widget tests for each new feature.
- Manual: send notification from web → verify hybrid inbox auto-refreshes within ~1 s.

## Risks

- Large documents (>50 MB) — show download size warning before starting.
- iOS scoped-storage requires `path_provider.getApplicationDocumentsDirectory()` not external storage.
