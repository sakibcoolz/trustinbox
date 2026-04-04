# Task 6.3 — Conversation E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete conversation round-trip: Provider starts conversation → Customer receives via XMPP → Customer replies → Messages persist and appear in both apps → File attachments transfer correctly → Typing indicators work bidirectionally.
> **Type**: Integration test scenario validating messaging across XMPP (Web App) and REST/SSE (Provider Portal).

---

## Objective

Verify that a conversation initiated from the Provider Portal reaches the Web App via XMPP, that messages persist in `communication-service`, that file attachments transfer correctly, and that real-time indicators (typing, read receipts) work in both directions.

---

## Architecture Flow

```
Provider Portal (/conversations)
  └─ POST /api/conversations (create)
  └─ POST /api/conversations/{id}/messages (send message)
       └─ Gateway (graphql-bff :4000)
            ├─ gRPC → communication-service (:50056)
            │    ├─ convRepo.Create() / msgRepo.Create() → PostgreSQL
            │    └─ publisher.Publish(ConversationCreated / MessageSent)
            └─ REST/SSE → Provider Portal real-time updates

Web App (/conversations)
  └─ XMPP WebSocket (ws://localhost:4000/api/xmpp-ws)
       └─ ejabberd (XMPP server)
            ├─ Direct: <peer-uuid>@chat.trustinbox.local
            └─ Org: org-<conv-id>@conference.chat.trustinbox.local
       └─ xmpp-client.ts dispatches typed events:
            message, presence, typing, delivery_receipt
```

---

## Current State

### Provider Portal — Conversations Detail (`apps/provider/src/app/conversations/[id]/page.tsx`, ~200 lines)

- **Status**: FULLY IMPLEMENTED
- Features: message grouping by day, read receipts (SENT/DELIVERED/READ), file attachments with image preview, message composer with file support, typing indicator, agent assignment drawer, system messages
- Data: `useConversation(id)` hook → GET `/api/conversations/{id}`
- Send: `useSendMessage()` → POST `/api/conversations/{id}/messages`
- Real-time: `useMessageSubscription(id)` (SSE-based)

### Provider Portal — Conversations List (`apps/provider/src/app/conversations/page.tsx`, ~418 lines)

- Stats cards (Open/Closed/Archived/Unread), search, status filter chips, sort, infinite scroll
- `useConversations(options)` → GET `/api/conversations?...`
- `useConversationStats(spId)` → GET `/api/gateway/conversations/stats`
- `useProviderMessageSubscription(spId)` — SSE stub (returns undefined)

### Provider Portal — Mutations (`apps/provider/src/lib/mutations/conversations.ts`, ~15 lines)

```tsx
useSendMessage(conversationId, input) → POST /api/conversations/{id}/messages
useCreateConversation(input)          → POST /api/conversations
```

### Communication Service (`services/communication-service/internal/usecase/communication.go`, ~300 lines)

- `CreateCallbackRequest`, `ApproveCallbackRequest`, `RejectCallbackRequest` — callback methods
- Implied conversation methods: `CreateConversation`, `SendMessage`, `GetMessages`, `MarkMessageRead`
- Repos: `convRepo`, `msgRepo`, `spamRepo`
- Events: `conversation.created`, `message.sent`, `message.read`

### Web App — Conversations (`apps/web/src/app/(dashboard)/conversations/page.tsx`, ~60 lines)

- Split panel: `ConversationList` (left) + `ChatArea` (right)
- Query param auto-selection: `?id=<conversationId>`
- Responsive mobile handling

### Web App — XMPP Client (`apps/web/src/lib/xmpp-client.ts`, ~400 lines)

- WebSocket connection at `ws://localhost:4000/api/xmpp-ws`
- Direct conversations: stanzas to `<peer-uuid>@chat.trustinbox.local`
- Org conversations: stanzas to `org-<conv-id>@conference.chat.trustinbox.local`
- Event listeners: message, presence, typing, delivery receipts
- Message types: TEXT, VOICE, IMAGE, FILE
- Presence tracking: online/offline/away

### Gateway — Chat Handlers

- `chat.go` — chat-specific REST handlers
- `websocket.go` — WebSocket proxy to ejabberd
- `ejabberd_hooks.go`, `ejabberd_rest.go` — ejabberd integration

---

## Requirements

### Sub-task 6.3.1 — Provider Portal: Start Conversation

- [ ] Open Provider Portal → navigate to `/conversations`
- [ ] Click "New Conversation" or "Start Conversation" button
- [ ] Select a customer (virtual ID)
- [ ] Verify `useCreateConversation()` fires POST `/api/conversations`
  - Payload: `{ userId: "<customer-uuid>", serviceProviderId: "<sp-id>" }`
- [ ] Verify `communication-service.CreateConversation()` executes:
  - Creates conversation entity with status `OPEN`
  - Persists to PostgreSQL
  - Publishes `conversation.created` event
- [ ] Verify redirect to `/conversations/<new-id>`
- [ ] Verify conversation appears in conversation list with:
  - Status: `OPEN` (green badge)
  - Customer virtual ID
  - "No messages yet" placeholder

### Sub-task 6.3.2 — Provider Portal: Send First Message

- [ ] In the conversation detail page, type a message:
  - Message: "Hello, how can we assist you today?"
- [ ] Click send (or press Enter)
- [ ] Verify `useSendMessage()` fires POST `/api/conversations/{id}/messages`
  - Payload: `{ content: "Hello, how can we assist you today?", messageType: "TEXT" }`
- [ ] Verify `communication-service.SendMessage()`:
  - Persists message to PostgreSQL
  - Status: `SENT`
  - Publishes `message.sent` event
- [ ] Verify message appears in provider's message thread:
  - Sent bubble (right-aligned)
  - Read receipt icon: ✓ SENT
  - Timestamp

### Sub-task 6.3.3 — Web App: Receive Conversation & Message

- [ ] Open Web App → navigate to `/conversations`
- [ ] Verify new conversation appears in conversation list:
  - SP name displayed
  - Last message preview: "Hello, how can we assist you today?"
  - Unread indicator
- [ ] Click on conversation to open chat area
- [ ] Verify message displayed:
  - Content: "Hello, how can we assist you today?"
  - Sender type: AGENT (blue bubble)
  - Timestamp
- [ ] Verify XMPP connection:
  - WebSocket connected to `ws://localhost:4000/api/xmpp-ws`
  - Stanza received for conversation room: `org-<conv-id>@conference.chat.trustinbox.local`
  - Message event dispatched and rendered

### Sub-task 6.3.4 — Web App: Customer Replies

- [ ] In Web App chat area, type a reply:
  - Message: "I have a question about my account"
- [ ] Click send
- [ ] Verify XMPP stanza sent:
  - Message type: TEXT
  - To: `org-<conv-id>@conference.chat.trustinbox.local`
- [ ] Verify `communication-service` persists the message:
  - Sender type: CUSTOMER
  - Status: SENT → DELIVERED
- [ ] Verify message appears in Web App chat:
  - Customer bubble (right-aligned in web app)
  - Delivery receipt indicator

### Sub-task 6.3.5 — Provider Portal: Receive Reply

- [ ] Switch to Provider Portal → conversation detail page
- [ ] Verify customer's reply appears in message thread:
  - Content: "I have a question about my account"
  - Sender type: CUSTOMER (different styling)
  - Timestamp
  - Real-time delivery via SSE (`message_received` event)
- [ ] Verify read receipt on provider's original message updates:
  - ✓ SENT → ✓✓ DELIVERED (when web app received)
  - ✓✓ READ (when customer opened)

### Sub-task 6.3.6 — File Attachment Transfer

- [ ] In Provider Portal conversation, attach a file:
  - Click attachment button → select an image (e.g., screenshot.png)
  - Verify upload to MinIO via gateway
  - Verify message sent with `messageType: "IMAGE"` or `"FILE"`
  - Verify image preview shown inline in provider message thread
- [ ] Switch to Web App conversation:
  - Verify file attachment message received
  - Verify image preview displayed inline
  - Click "Download" → verify file downloads via presigned URL
  - Verify downloaded file matches uploaded file (integrity)
- [ ] Reverse: customer uploads file in Web App:
  - Verify provider receives and can preview/download

### Sub-task 6.3.7 — Typing Indicators

- [ ] In Provider Portal, start typing in the message composer
- [ ] Switch to Web App:
  - Verify typing indicator appears: "[Agent Name] is typing..."
  - Indicator disappears after typing stops (timeout ~3 seconds)
- [ ] In Web App, start typing:
  - Switch to Provider Portal
  - Verify typing indicator appears for customer
- [ ] Verify XMPP `<composing/>` and `<paused/>` stanzas are exchanged

### Sub-task 6.3.8 — Persistence Across Refreshes

- [ ] Exchange several messages between both apps (at least 5 messages)
- [ ] Refresh Provider Portal page (F5)
  - Verify all messages load from `communication-service` via API
  - Verify correct ordering (chronological)
  - Verify correct sender types and read receipt statuses
- [ ] Refresh Web App page (F5)
  - Verify all messages load correctly
  - Verify XMPP reconnects and message history restores
- [ ] Verify PostgreSQL has all messages:
  ```sql
  SELECT id, conversation_id, sender_type, content, status, created_at
  FROM messages
  WHERE conversation_id = '<conv-id>'
  ORDER BY created_at;
  ```

---

## Verification Checklist

- [ ] Provider: create conversation → appears in list with OPEN status
- [ ] Provider: send message → appears in thread with SENT receipt
- [ ] Web App: conversation received via XMPP → message displayed correctly
- [ ] Web App: customer replies → message sent via XMPP stanza
- [ ] Provider: customer reply appears in real-time via SSE
- [ ] File attachment: provider uploads → web app previews → downloadable → integrity ok
- [ ] File attachment: reverse direction (customer → provider) also works
- [ ] Typing indicators: bidirectional with proper timeout behavior
- [ ] All messages persist in PostgreSQL and load correctly after page refresh
- [ ] Read receipts: SENT → DELIVERED → READ status progression visible
- [ ] Conversation history: correct ordering, sender types, timestamps across refreshes
- [ ] Jaeger: traces for create conversation, send message, and XMPP message delivery
