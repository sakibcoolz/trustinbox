# Task 6.6 — Message Composer Bar

> **Section**: 6. Conversations  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/MessageComposer.tsx`

---

## Objective

Extract and upgrade the message input area into a dedicated MessageComposer component with text input, file attachment button, emoji picker, send button, and GraphQL mutation integration.

---

## Current State

```tsx
// apps/provider/src/app/conversations/[id]/page.tsx — inline form
<form onSubmit={handleSend} className="px-6 py-3 border-t border-border-primary bg-bg-secondary">
  <div className="flex items-center gap-3">
    <button type="button" className="..."><Paperclip size={16} /></button>
    <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
      className="..." placeholder="Type a message…" />
    <button type="submit" disabled={!message.trim()} className="..."><Send size={16} /></button>
  </div>
</form>
```

**Issues**: No file upload, no emoji picker, no multi-line support, inline in page (not reusable), send is client-side only.

---

## Requirements

### 1. Input Field
- Multi-line support: auto-grow textarea (min 1 line, max 6 lines)
- Shift+Enter for new line, Enter to send
- Character limit indication for long messages (optional, soft limit)
- Paste image support: paste clipboard image → auto-attach

### 2. File Attachment (triggers task 6.7)
- Paperclip button opens file picker
- Accepted types: images (jpg, png, gif, webp), documents (pdf, doc, xlsx)
- Max file size: 10MB
- Show pending attachments as preview chips above input
- Remove attachment with X button

### 3. Emoji Picker
- Emoji button opens popover with emoji grid
- Categories: Recent, Smileys, People, Animals, Food, Travel, Objects
- Click to insert at cursor position
- Can use lightweight library or custom grid

### 4. Send Button
- Calls `sendMessage` GraphQL mutation (task 6.14)
- Disabled while no text and no attachments
- Loading spinner during send
- Optimistic: message appears immediately in thread

### 5. Component API

```typescript
interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, attachments?: File[]) => Promise<void>;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}
```

### 6. Keyboard Shortcuts
- `Enter` → Send message
- `Shift+Enter` → New line
- `Ctrl+V` / `Cmd+V` with image → Attach image
- `Escape` → Close emoji picker

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/MessageComposer.tsx
'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';

export function MessageComposer({ conversationId, onSend, sending, disabled, placeholder = 'Type a message…' }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleSend() {
    if (!text.trim() && attachments.length === 0) return;
    await onSend(text, attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    textareaRef.current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) setAttachments(prev => [...prev, file]);
      }
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
    setAttachments(prev => [...prev, ...valid]);
  }

  return (
    <div className="border-t border-border-primary bg-bg-secondary">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex gap-2 flex-wrap">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary rounded-lg text-xs">
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} className="text-text-muted hover:text-text-primary">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 flex items-end gap-3">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-bg-hover text-text-muted">
          <Paperclip size={16} />
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx" onChange={handleFileSelect} className="hidden" />

        <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-bg-hover text-text-muted">
          <Smile size={16} />
        </button>

        <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown} onPaste={handlePaste}
          rows={1} className="flex-1 px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none max-h-[150px]"
          placeholder={placeholder} disabled={disabled}
          style={{ height: 'auto', minHeight: '40px' }} />

        <button onClick={handleSend} disabled={(!text.trim() && attachments.length === 0) || sending || disabled}
          className="p-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
          <Send size={16} className={sending ? 'animate-pulse' : ''} />
        </button>
      </div>

      {/* Emoji picker popover */}
      {showEmoji && <EmojiPicker onSelect={(emoji) => { setText(t => t + emoji); setShowEmoji(false); }} />}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/conversations/MessageComposer.tsx` | Create — extracted message composer |
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — replace inline form with MessageComposer |
| `apps/provider/src/components/ConversationPanel.tsx` | Modify — use new MessageComposer |

---

## Acceptance Criteria

- [ ] Multi-line textarea with auto-grow (max 6 lines)
- [ ] Enter to send, Shift+Enter for new line
- [ ] File attachment: Paperclip → file picker, preview chips, remove button
- [ ] Paste image → auto-attach
- [ ] Emoji picker button with popover
- [ ] Send button disabled when empty, loading state during send
- [ ] File size limit: 10MB per file
- [ ] Accepted types: images, PDF, DOC, XLSX
- [ ] Calls `sendMessage` mutation on send

---

## Dependencies

- **Blocked by**: Task 6.5 (ConversationPanel), Task 6.14 (sendMessage mutation)
- **Blocks**: Task 6.7 (File attachment — uses same file picker), Task 6.8 (Typing indicator — triggers on keystroke)
- **Related**: Task 8.2 (Document upload — similar file handling)
