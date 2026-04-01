# Task 6.8 — Typing Indicator

> **Section**: 6. Conversations  
> **Priority**: P2  
> **Estimated Scope**: Small  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/TypingIndicator.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement a typing indicator that shows when the customer is typing, displayed as an animated bubble at the bottom of the message thread.

---

## Current State

No typing indicator exists in the conversation view.

---

## Requirements

### 1. Visual Design
- Animated three-dot bubble (⋯ with sequential bounce)
- Positioned at the bottom of the message area, left-aligned (same position as customer messages)
- Show customer label: "VID-xxxx is typing…"
- Appears/disappears with fade animation

### 2. Data Source
- Via WebSocket subscription or polling
- Customer typing status sent from web-app
- Timeout: auto-hide after 5 seconds of no typing signal

### 3. Component API

```typescript
interface TypingIndicatorProps {
  isTyping: boolean;
  senderName?: string;
}
```

### 4. Agent-Side Typing Signal
- When agent types in MessageComposer, emit typing event (debounced, every 3 seconds while typing)
- Stops emitting when idle for 3 seconds
- This is sent to customer's web-app view

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/TypingIndicator.tsx
'use client';

import { User } from 'lucide-react';

export function TypingIndicator({ isTyping, senderName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex justify-start animate-in fade-in duration-200">
      <div className="max-w-[70%]">
        <div className="flex items-center gap-1.5 mb-1">
          <User size={12} className="text-text-muted" />
          <span className="text-xs text-text-muted">{senderName ?? 'Customer'} is typing</span>
        </div>
        <div className="px-4 py-3 rounded-xl bg-bg-card border border-border-primary inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
```

```tsx
// Agent-side typing emission (in MessageComposer)
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

const emitTyping = useDebouncedCallback(() => {
  // Send typing event via GraphQL mutation or WebSocket
  emitTypingEvent(conversationId);
}, 3000, { leading: true, trailing: false });

// In textarea onChange:
onChange={(e) => {
  setText(e.target.value);
  emitTyping();
}};
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/conversations/TypingIndicator.tsx` | Create |
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — render TypingIndicator at bottom of messages |
| `apps/provider/src/components/conversations/MessageComposer.tsx` | Modify — emit typing events on keystroke |

---

## Acceptance Criteria

- [ ] Animated three-dot bubble when customer is typing
- [ ] Customer label: "VID-xxxx is typing…"
- [ ] Fade in/out animation
- [ ] Auto-hide after 5 seconds of no signal
- [ ] Agent emits typing signal (debounced, 3s intervals)
- [ ] No typing indicator when conversation is closed

---

## Dependencies

- **Blocked by**: Task 6.5 (ConversationPanel), Task 16.1 (WebSocket — for receiving typing events)
- **Blocks**: None
- **Related**: Task 6.16 (`messageReceived` subscription — similar real-time pattern)
