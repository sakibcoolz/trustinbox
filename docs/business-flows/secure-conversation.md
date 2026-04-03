# Business Flow: Secure Conversation & Messaging

## Overview

TrustInbox provides secure messaging between customers and service providers. All conversations are mediated through the platform -- real identities are never exposed. Conversations support text messages, file attachments, bot integration, and human agent handoff.

## Actors

- **Customer**: Initiates or responds to conversations
- **SP Agent**: Handles conversations on behalf of the service provider
- **Bot Service**: Optionally handles initial bot-mediated conversations
- **Communication Service**: Manages conversation lifecycle and message storage
- **Policy Service**: Validates that messaging is allowed

## Flow Steps

### Phase 1: Conversation Initiation

**Customer-Initiated:**
1. Customer opens SP profile in web app and clicks **Message**
2. Policy check: SP is verified, customer has not blocked SP, messaging consent is active
3. If ALLOWED: new conversation created with `ACTIVE` status
4. If bot is configured for SP: bot handles initial interaction (see bot-interaction.md)

**SP-Initiated:**
1. SP agent opens customer profile in provider portal and clicks **Start Conversation**
2. Policy check: same as above plus DND check
3. If ALLOWED: conversation created, customer notified
4. If DENIED: agent sees denial reason

### Phase 2: Message Exchange

5. Sender composes message (text, up to 5000 characters)
6. Communication service validates:
   - Sender is a participant in the conversation
   - Conversation is active (not closed/archived)
   - Message content is non-empty
7. Message persisted with:
   - Sender ID, conversation ID, content, timestamp
   - `SENT` status
8. Recipient notified via:
   - In-app real-time push (SSE for provider, WebSocket/XMPP for web)
   - Push notification (if enabled)
9. Events published: `message.sent`

### Phase 3: File Attachments

10. Sender attaches file(s) via the message composer
11. Files uploaded to MinIO via document service
12. Message created with attachment references (document IDs)
13. Recipient views attachments via presigned URLs (15-minute expiry)

### Phase 4: Message Actions

**Read Receipts:**
- When recipient opens message: `message.read` event published
- Sender sees read status in conversation UI

**Message Edit:**
- Sender can edit their own messages within 15 minutes
- Original content preserved in edit history
- Edited messages marked with "edited" indicator

**Message Delete:**
- Sender can soft-delete their own messages
- Content replaced with "This message was deleted"
- Admin audit trail preserves original content

**Reactions:**
- Users can react to messages (emoji reactions)
- Reactions are visible to all conversation participants

### Phase 5: Bot to Human Handoff

14. If conversation started with bot and escalation triggers:
    - Bot generates conversation summary
    - Conversation marked as `escalated`
    - Available human agent notified
    - Agent sees summary + full history
15. Agent takes over -- bot stops responding
16. Agent can transfer to another agent if needed

### Phase 6: Conversation Closure

17. Either party can close the conversation
18. Conversation status changes to `CLOSED`
19. Closed conversations can be reopened (creates new conversation thread)
20. Customer can provide feedback/rating after closure

## Conversation Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Open and accepting messages |
| `ESCALATED` | Handed off from bot to human agent |
| `CLOSED` | Completed by either party |
| `ARCHIVED` | Moved to archive (after closure) |
| `BLOCKED` | Customer blocked the SP mid-conversation |

## Message Statuses

| Status | Description |
|--------|-------------|
| `SENT` | Message stored and delivered to platform |
| `DELIVERED` | Push notification sent to recipient |
| `READ` | Recipient opened the message |
| `EDITED` | Message content was modified |
| `DELETED` | Message soft-deleted by sender |

## Business Rules

- **Identity protection**: Customer sees SP name; SP sees customer's virtual public ID only
- **Policy gating**: SP must be verified, customer must have consent for messaging
- **DND respect**: SP-initiated messages are held during customer DND windows
- **Encryption**: Message content encrypted at rest (AES-256-GCM for PII-containing messages)
- **Audit trail**: All messages stored with immutable audit log
- **Rate limiting**: Max 100 messages per conversation per hour (anti-spam)
- **Attachment limits**: Max 5 files per message, 25 MB per file
- **Edit window**: 15 minutes after sending
- **Bot precedence**: If bot is active, customer messages go to bot first

## Real-Time Transport

| App | Transport | Protocol |
|-----|-----------|----------|
| Web (customer) | WebSocket + XMPP | ejabberd |
| Provider portal | SSE (Server-Sent Events) | Gateway |
| Push notifications | Firebase/APNs | Worker service |

## Error Cases

- SP not verified: reject conversation initiation
- Customer blocked SP: reject with `sp_blocked_by_user`
- Conversation closed: reject new messages with `conversation_closed`
- Rate limit exceeded: reject with `rate_limit_exceeded`
- File too large: reject attachment with `file_too_large`
- DND active (SP-initiated): queue message for delivery after DND window

## Events Published

| Event | Trigger |
|-------|---------|
| `conversation.created` | New conversation started |
| `conversation.closed` | Conversation completed |
| `message.sent` | New message sent |
| `message.received` | Message delivered to recipient |
| `message.read` | Recipient read the message |
| `message.edited` | Message content modified |
| `message.deleted` | Message soft-deleted |
| `bot.escalated` | Bot conversation escalated to human |
