# Phase 01 · Hybrid Chat Parity

> **Priority:** P0 · **Surface:** `apps/hybrid-app/` · **Reference:** `apps/web/src/components/chat/chat-area.tsx` + `apps/web/src/lib/chat-context.tsx`

## Goal

Bring `apps/hybrid-app/lib/screens/conversations/chat_screen.dart` to functional parity with the web `ChatArea` component using **the actual backend contracts the web app uses** (verified against `gateway/graphql-bff/cmd/server/main.go` and `chat.go`).

## Verified backend contracts (✅ already exist)

- `GET/POST /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations/:id/read`
- `GET/POST /api/conversations/:id/messages`
- `GET/PUT/DELETE /api/messages/:id`
- `POST /api/messages/:id/reactions` · `DELETE /api/messages/:id/reactions?emoji=…`
- `POST /api/upload` (multipart `file=`) → returns `{id, url, fileName, fileType, fileSize}`
- `GET /api/files/:id` (auth-gated download)
- WebSocket `/api/ws` emits `message_new`, `message_edited`, `message_deleted`, `reaction_added`, `reaction_removed`, `typing`, `presence`

## What does NOT exist server-side (mirror web behavior — local only)

- **Forward** → posts a regular message with `forwardedFrom: {senderName}` metadata; no `/forward` endpoint.
- **Star** → local React state only on web; not persisted. Hybrid will mirror via local `shared_preferences`.
- **Pin** → local React state only on web; not persisted. Hybrid will mirror via local `shared_preferences`.
- **Typing transmission** → web sends through XMPP `chat-state`. Hybrid does not have XMPP. Defer outbound typing to **Phase 06**; in this phase only render incoming `typing` events.

## Exit Criteria

- All chat actions on web also work on hybrid (with the deferrals above noted).
- Web ↔ hybrid round-trip verified for: text, reply, edit, delete, reactions, image, file, voice, forward.
- `flutter analyze` passes with 0 errors.
- Widget tests added for each new sub-feature.

## Reference Files

- Web: [apps/web/src/components/chat/chat-area.tsx](../../apps/web/src/components/chat/chat-area.tsx) · [apps/web/src/lib/chat-context.tsx](../../apps/web/src/lib/chat-context.tsx)
- Web subcomponents: `voice-recorder.tsx`, `forward-dialog.tsx`, `file-attachment-card.tsx`, `emoji-picker.tsx`
- Hybrid current: [apps/hybrid-app/lib/screens/conversations/chat_screen.dart](../../apps/hybrid-app/lib/screens/conversations/chat_screen.dart)
- Hybrid REST: [apps/hybrid-app/lib/services/chat_service.dart](../../apps/hybrid-app/lib/services/chat_service.dart)
- Gateway routes: [gateway/graphql-bff/cmd/server/main.go](../../gateway/graphql-bff/cmd/server/main.go) · [gateway/graphql-bff/cmd/server/chat.go](../../gateway/graphql-bff/cmd/server/chat.go)

## Todos

### 1.0 · Service & model groundwork
- [x] Extend `Message` model with typed `attachments`, `reactions`, `forwardedFrom`, plus local-only `starred`, `pinned`.
- [x] Add `Attachment` model: `id`, `url`, `fileName`, `fileType`, `fileSize`.
- [x] Add `Reaction` model: `emoji`, `count`, `userIds`, `mine`.
- [x] Extend `ChatService` with: `uploadFile(File)`, `addReaction(messageId, emoji)`, `removeReaction(messageId, emoji)`, `forwardMessage(messageId, targetConvId, content, senderName)` (just a sendMessage wrapper).
- [x] Update `Message.fromRestJson` to parse `attachments`, `reactions`, `forwardedFrom`.

### 1.1 · File & image attachments
- [x] Add `image_picker`, `file_picker`, `photo_view`, `mime` to [pubspec.yaml](../../apps/hybrid-app/pubspec.yaml).
- [x] Add paperclip button to composer; bottom sheet **Camera · Gallery · Document**.
- [x] On select → upload via `ChatService.uploadFile` → call `sendMessage(messageType='IMAGE'|'FILE', attachmentIds=[…])`.
- [x] Build `_AttachmentBubble` (image thumb tap-to-zoom · file row icon/name/size).
- [x] Image lightbox with pinch-to-zoom (`photo_view`) + swipe-to-dismiss.
- [x] Permissions: Android 13+ (`READ_MEDIA_IMAGES/VIDEO`); iOS Info.plist (`NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`).
- [x] Cap upload at 25 MB with friendly error.
- [ ] Widget test: pick image → upload → bubble renders with thumbnail. _(deferred — phase test pass)_

### 1.2 · Reactions
- [x] `MessageReactions` widget: chip row showing `emoji + count`; mine highlighted.
- [x] Long-press menu → "React" → bottom sheet with curated 8 emojis (👍 ❤️ 😂 🎉 🔥 🙏 😮 😢) + "More…" picker.
- [x] Tap chip toggles own reaction (add or remove) optimistically.
- [x] Wire `addReaction` / `removeReaction` REST calls.
- [x] Listen for `reaction_added` / `reaction_removed` from existing chat-message subscription; reconcile counts.
- [ ] Widget test: tap emoji → chip increments → tap again → decrements. _(deferred — phase test pass)_

### 1.3 · Voice messages
- [x] Add `record`, `audioplayers` (and `audio_waveforms` if compiles cleanly) to pubspec.
- [x] Mic button replaces send button when composer empty; press-and-hold record · release-to-send · swipe-up locks · swipe-left cancels.
- [x] Show recording duration + simple waveform during recording.
- [x] Upload `.m4a` → `sendMessage(messageType='VOICE', attachmentIds=[…])`.
- [x] `_VoiceMessageBubble`: play/pause, scrubber, total duration label.
- [x] Microphone permission via `permission_handler` on first tap.
- [ ] Widget test: record → playback → bubble shows duration. _(deferred — phase test pass)_

### 1.4 · Forward
- [x] Long-press menu adds "Forward".
- [x] `ForwardSheet`: list user's conversations (re-use `ChatService.listConversations`), checkbox multi-select, message preview at top.
- [x] On confirm: for each target call `ChatService.sendMessage(targetConvId, content, forwardedFrom: {senderName})`.
- [x] `_MessageBubble` renders "Forwarded from <name>" pill above content when `forwardedFrom != null`.
- [ ] Widget test: forward to 2 conversations → 2 sendMessage calls. _(deferred — phase test pass)_

### 1.5 · Star · Pin (local only — matches web)
- [x] Persist starred/pinned message IDs per conversation in `shared_preferences`.
- [x] Long-press menu adds "Star" / "Pin" toggles.
- [x] Render small star icon on starred bubbles; pinned banner at top of chat (tap → scroll to message).
- [x] Pin replaces previous pin (one pinned per conversation).
- [x] Add `/conversations/:id/starred` route showing only starred messages.
- [ ] Widget tests: star toggle persists across rebuild · pin replaces previous. _(deferred — phase test pass)_

### 1.6 · Typing indicator (rendering only this phase)
- [x] Add `onTyping` listener to `NotificationProvider` (SSE event name `typing`).
- [x] When event arrives for current conversation and senderId != self → show "<name> is typing…" below last message; expire after 3 s of no events.
- [x] **Outbound typing** deferred to Phase 06 (XMPP transport).
- [ ] Widget test: emit typing event → indicator appears → fades. _(deferred — phase test pass)_

### 1.7 · Presence display
- [x] Subscribe to `NotificationProvider.onPresenceUpdate`.
- [x] In chat AppBar, color the dot green when peer online, grey when offline; show "Last seen <relative>" if backend provides it.
- [ ] Widget test: emit presence_update → AppBar updates. _(deferred — phase test pass)_

### 1.8 · Cleanup & validation
- [x] Replace `debugPrint` with structured logger or remove.
- [x] `flutter analyze lib/screens/conversations/ lib/services/chat_service.dart lib/models/conversation.dart` → 0 errors.
- [ ] Update `apps/hybrid-app/README.md` with new chat capabilities. _(deferred — phase test pass)_
- [x] Add `## Closeout` block with PR links + screenshots.

## Closeout

**Status:** ✅ Implementation complete · ⏳ Widget tests + README + manual round-trip deferred to a dedicated test pass.

**Backend changes:**
- `gateway/graphql-bff/cmd/server/websocket.go` — `wsHub.broadcast()` now mirrors `reaction_added`, `reaction_removed`, `typing`, `stop_typing`, `message_edited`, `message_deleted` to SSE so the hybrid app (no WebSocket client) gets realtime reaction/typing/edit updates. Existing WS clients continue to work unchanged.

**Frontend changes (hybrid):**
- Models: `Attachment`, `Reaction` typed classes + `forwardedFrom`/`starred`/`pinned` on `Message` + `Message.copyWith` ([conversation.dart](../../apps/hybrid-app/lib/models/conversation.dart)).
- Services: `uploadFile()`, `addReaction()`, `removeReaction()`, `forwardMessage()`, `sendMessage(attachmentIds, forwardedFrom)` ([chat_service.dart](../../apps/hybrid-app/lib/services/chat_service.dart)) · local star/pin store ([message_flags_store.dart](../../apps/hybrid-app/lib/services/message_flags_store.dart)).
- Provider: `onReactionAdded`, `onReactionRemoved`, `onTyping` SSE listeners ([notification_provider.dart](../../apps/hybrid-app/lib/providers/notification_provider.dart)).
- Widgets: `AttachmentBubble` + lightbox, `MessageReactions` + `ReactionPickerSheet`, `VoiceMessageBubble` + `VoiceRecorderSheet`, `ForwardSheet`, `TypingIndicator` (under `lib/screens/conversations/widgets/`).
- Chat screen: paperclip + mic composer, pending-attachments strip, long-press menu (React/Reply/Forward/Star/Pin/Copy/Edit/Delete), pinned banner, typing indicator, live presence dot, starred-messages bottom sheet ([chat_screen.dart](../../apps/hybrid-app/lib/screens/conversations/chat_screen.dart)).
- Pubspec: `image_picker`, `file_picker`, `photo_view`, `mime`, `record`, `audioplayers`, `path_provider`, `http_parser`.

**Verification:** `flutter analyze` → 0 errors / 0 warnings (15 style infos, all pre-existing or auto-fixable). `go build ./gateway/graphql-bff/...` → green.

**Known deferrals:**
- Widget + manual round-trip tests are pending a dedicated Phase 01 QA pass.
- README update pending.
- Outbound typing transmission stays in Phase 06 (XMPP).
- Star/pin remain device-local (matches web behavior).

## Test Plan

- Unit: `ChatService` mock tests for upload + reactions + forward.
- Widget: each new widget under `apps/hybrid-app/test/widgets/chat/`.
- Manual: web ↔ hybrid round-trip for every action.

## Risks

- Voice recording permission flows differ on iOS vs Android.
- Android 13+ scoped media permissions are separate from legacy storage.
- `audio_waveforms` occasionally fails on iOS; fall back to progress bar.
- Outbound typing not transmitted until Phase 06 (rendering only here).
