'use client';

import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Paperclip, Smile, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

export interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
  uploading: boolean;
  progress: number;
}

interface MessageComposerProps {
  conversationId: string;
  onSend: (text: string, attachments?: PendingAttachment[]) => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const EMOJI_GRID = [
  '😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😍',
  '🥰', '😎', '🤔', '😅', '😂', '🤣', '😇', '🙃',
  '👍', '👎', '👋', '🤝', '🙏', '💪', '❤️', '✅',
  '⭐', '🔥', '💡', '📎', '📝', '✨', '🎉', '👏',
];

// ─── Component ──────────────────────────────────────────

export function MessageComposer({
  conversationId,
  onSend,
  sending = false,
  disabled = false,
  placeholder = 'Type a message…',
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !sending && !disabled;

  // ── Auto-grow textarea ──
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxHeight = 6 * 24; // ~6 lines
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    adjustHeight();
  }

  // ── Enter to send, Shift+Enter for newline ──
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowEmoji(false);
    }
  }

  // ── Send ──
  function handleSend() {
    if (!canSend) return;
    onSend(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  // ── File attachment ──
  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        return; // silently skip oversized
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return; // silently skip unsupported
      }

      const attachment: PendingAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        uploading: false,
        progress: 0,
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === attachment.id ? { ...a, preview: ev.target?.result as string } : a)),
          );
        };
        reader.readAsDataURL(file);
      }

      setAttachments((prev) => [...prev, attachment]);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Paste image ──
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && file.size <= MAX_FILE_SIZE) {
          const attachment: PendingAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file,
            uploading: false,
            progress: 0,
          };
          const reader = new FileReader();
          reader.onload = (ev) => {
            setAttachments((prev) =>
              prev.map((a) => (a.id === attachment.id ? { ...a, preview: ev.target?.result as string } : a)),
            );
          };
          reader.readAsDataURL(file);
          setAttachments((prev) => [...prev, attachment]);
        }
        break;
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
      }, 0);
    } else {
      setText((prev) => prev + emoji);
    }
    setShowEmoji(false);
  }

  return (
    <div className="border-t border-border-primary bg-bg-secondary">
      {/* Pending attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-bg-hover rounded-lg border border-border-secondary"
            >
              {att.preview ? (
                <img src={att.preview} alt="" className="w-8 h-8 rounded object-cover" />
              ) : (
                <FileText size={16} className="text-text-muted" />
              )}
              <span className="text-xs text-text-secondary max-w-[100px] truncate">
                {att.file.name}
              </span>
              <span className="text-[10px] text-text-muted">
                {(att.file.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* File attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted disabled:opacity-50"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Emoji picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={disabled}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted disabled:opacity-50"
            title="Emoji"
          >
            <Smile size={16} />
          </button>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full left-0 mb-2 z-20 bg-bg-card border border-border-primary rounded-xl shadow-xl p-3 w-[280px]">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_GRID.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg-hover text-base transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none disabled:opacity-50"
          placeholder={placeholder}
          style={{ minHeight: '38px', maxHeight: `${6 * 24}px` }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          title="Send message"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
