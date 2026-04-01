# Task 6.5 — ConversationPanel Component (Chat Thread)

> **Section**: 6. Conversations  
> **Priority**: P0 — Core chat interface  
> **Estimated Scope**: Large  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/app/conversations/[id]/page.tsx`, `apps/provider/src/components/ConversationPanel.tsx`

---

## Objective

Upgrade the conversation detail page and reusable ConversationPanel to a full chat-style message thread with GraphQL-powered messages, differentiated sender bubbles (sent right/blue, received left/gray), timestamps, read receipts, file attachment previews, and system messages.

---

## Current State

**Detail Page** (`conversations/[id]/page.tsx`, ~100 lines):
```tsx
const mockMessages = [
  { id: '1', sender: 'customer', text: 'Hi, I need help…', time: '14:20' },
  { id: '2', sender: 'bot', text: 'Hello! I\'d be happy to help…', time: '14:20' },
  // ... 4 more hardcoded messages
];
const convInfo = { customerVid: 'VID-4c9e1d', status: 'Active', assignee: 'Bot: Support Assistant', ... };
```
- Full-height layout with header, message area, bot suggestion bar, input form
- Messages styled: customer (bg-card), bot (purple), agent (blue)
- Send adds to local state (no GraphQL)
- Next.js 15 `use(params)` for async params

**Reusable Component** (`ConversationPanel.tsx`, ~85 lines):
- Props: `messages`, `onSend`, `botSuggestion`
- Default messages (2 hardcoded)
- Same styling pattern as detail page
- No file attachment handling, no system messages, no read receipts

---

## Requirements

### 1. Message Types

| Sender | Alignment | Bubble Style | Icon |
|--------|-----------|-------------|------|
| **Customer** | Left | `bg-bg-card border-border-primary` | User (gray) |
| **Bot** | Right | `bg-accent-purple/10 border-accent-purple/20` | Bot (purple) |
| **Agent** | Right | `bg-accent-blue/10 border-accent-blue/20` | User (blue) |
| **System** | Center | `bg-bg-tertiary text-text-muted text-xs` | — |

### 2. Message Bubble Content
- Text with whitespace preservation (`whitespace-pre-wrap`)
- Links auto-detected and rendered as clickable
- File attachments: images inline, documents as cards (task 6.7)
- System messages: "Callback approved", "Conversation assigned to Agent X", "Policy blocked"

### 3. Timestamps
- Grouped by day: "Today", "Yesterday", "March 10, 2024"
- Within a group: show timestamp on each message (HH:mm format)
- Time separator bars between day groups

### 4. Read Receipts
- Sent messages show: ✓ (sent), ✓✓ (delivered), ✓✓ (blue, read)
- Below message bubble, right-aligned

### 5. Scroll Behavior
- Auto-scroll to bottom on new messages
- "Scroll to bottom" floating button when scrolled up
- Preserve scroll position when loading older messages
- Load older messages on scroll-to-top (cursor-based pagination, latest first)

### 6. Message Data (from GraphQL)

```typescript
interface MessageNode {
  id: string;
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT' | 'SYSTEM';
  senderRefId?: string;
  messageType: 'TEXT' | 'FILE' | 'SYSTEM';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

### 7. ConversationPanel Props (upgraded)

```typescript
interface ConversationPanelProps {
  conversationId: string;
  messages: MessageNode[];
  loading: boolean;
  onSend: (content: string, attachments?: File[]) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  botSuggestion?: string;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/app/conversations/[id]/page.tsx
'use client';

import { use, useRef, useEffect, useState } from 'react';
import { ArrowLeft, Send, Paperclip, MoreVertical, PhoneCall, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useConversation, useSendMessage } from '@/lib/graphql/conversations';
import { useMessageSubscription } from '@/lib/graphql/conversations';
import { MessageBubble } from '@/components/conversations/MessageBubble';
import { MessageComposer } from '@/components/conversations/MessageComposer';
import { ConversationHeader } from '@/components/conversations/ConversationHeader';
import { DayDivider } from '@/components/conversations/DayDivider';

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { data, loading, fetchMore } = useConversation(id);
  const { sendMessage, loading: sending } = useSendMessage();
  
  // Live updates
  useMessageSubscription(id);

  const messages = data?.conversation.messages.nodes ?? [];
  const conversation = data?.conversation;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleSend(content: string) {
    sendMessage({ conversationId: id, content });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <ConversationHeader conversation={conversation} />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4"
        onScroll={handleScroll}>
        {/* Load more trigger */}
        {/* Day-grouped messages */}
        {groupByDay(messages).map((group) => (
          <div key={group.date}>
            <DayDivider date={group.date} />
            {group.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && <ScrollToBottomButton onClick={scrollToBottom} />}

      {/* Bot suggestion bar */}
      {botSuggestion && <BotSuggestionBar suggestion={botSuggestion} />}

      <MessageComposer onSend={handleSend} sending={sending} />
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — replace mock messages with GraphQL, add scroll behavior |
| `apps/provider/src/components/ConversationPanel.tsx` | Modify — upgrade props, add scroll/read receipts |
| `apps/provider/src/components/conversations/MessageBubble.tsx` | Create — individual message rendering |
| `apps/provider/src/components/conversations/DayDivider.tsx` | Create — day group separator |
| `apps/provider/src/components/conversations/ConversationHeader.tsx` | Create — extracted header with conv info |

---

## Acceptance Criteria

- [ ] Messages fetched from GraphQL (not hardcoded)
- [ ] 4 sender types rendered: customer (left), bot (right/purple), agent (right/blue), system (center)
- [ ] Text with `whitespace-pre-wrap` and auto-linked URLs
- [ ] Day dividers between message groups ("Today", "Yesterday", etc.)
- [ ] Read receipts: ✓ sent, ✓✓ delivered, ✓✓ (blue) read
- [ ] Auto-scroll to bottom on new messages
- [ ] "Scroll to bottom" button when scrolled up
- [ ] Load older messages on scroll-to-top
- [ ] File attachment previews (images inline, docs as cards)
- [ ] System messages styled as centered gray text
- [ ] Bot suggestion bar preserved
- [ ] Loading skeleton while conversation loads

---

## Dependencies

- **Blocked by**: Task 6.12 (GraphQL conversation query), Task 6.13 (messages query), Task 6.14 (sendMessage mutation)
- **Blocks**: Task 6.6 (MessageComposer), Task 6.7 (File attachment), Task 6.8 (Typing indicator), Task 6.11 (Info sidebar)
- **Related**: Task 16.2 (`messageReceived` subscription), Task 6.15/6.16 (subscriptions)
