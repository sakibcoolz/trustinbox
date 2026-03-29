'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Strikethrough, Code, Code2, List, ListOrdered,
  Paperclip, Smile, Mic, Send, Check, X, AtSign, Film, FileText,
} from 'lucide-react';
import { Attachment } from '@/lib/chat-context';
import EmojiPicker from './emoji-picker';
import { VoiceRecorder } from './voice-recorder';
import { formatFileSize } from './file-attachment-card';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type PendingFile = {
  id: string;
  file: File;
  previewUrl?: string;    // object URL for images
  attachment?: Attachment;
  uploading: boolean;
  error?: string;
};

function fileCategory(file: File): 'image' | 'video' | 'audio' | 'generic' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'generic';
}

function deriveMessageType(pendingFiles: PendingFile[], hasText: boolean): string {
  const ready = pendingFiles.filter(p => p.attachment && !p.uploading);
  if (ready.length === 0) return 'TEXT';
  if (hasText) return 'FILE'; // mixed
  const cats = ready.map(p => fileCategory(p.file));
  if (cats.every(c => c === 'image')) return 'IMAGE';
  if (cats.every(c => c === 'video')) return 'VIDEO';
  if (cats.every(c => c === 'audio')) return 'VOICE';
  return 'FILE';
}

// ────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────

interface MessageComposerProps {
  /** Called when the user submits a message */
  onSend: (text: string, attachmentIds: string[], messageType: string) => void;
  onTyping: (isTyping: boolean) => void;
  uploadFile: (file: File) => Promise<Attachment | null>;
  /** Pre-fill text when editing an existing message */
  initialText?: string;
  isEditing?: boolean;
  /** Called on Escape or cancel button */
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Format button helper
// ────────────────────────────────────────────────────────────────────────────

function FmtBtn({
  icon, title, onClick, active,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-bg-hover transition-colors ${
        active ? 'text-accent-blue bg-accent-blue/10' : 'text-text-muted hover:text-text-primary'
      }`}
    >
      {icon}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pending file thumbnail
// ────────────────────────────────────────────────────────────────────────────

function PendingThumb({
  pf,
  onRemove,
}: {
  pf: PendingFile;
  onRemove: (id: string) => void;
}) {
  const cat = fileCategory(pf.file);

  return (
    <div className="relative group shrink-0">
      {cat === 'image' && pf.previewUrl ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-border-primary bg-bg-tertiary">
          <img src={pf.previewUrl} alt={pf.file.name} className="w-full h-full object-cover" />
        </div>
      ) : cat === 'video' ? (
        <div className="w-16 h-16 rounded-lg border border-border-primary bg-bg-tertiary flex flex-col items-center justify-center gap-1 px-1">
          <Film size={18} className="text-purple-400" />
          <span className="text-2xs text-text-muted text-center truncate w-full px-0.5 leading-tight">
            {pf.file.name.length > 10 ? pf.file.name.slice(0, 8) + '…' : pf.file.name}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-primary bg-bg-tertiary max-w-[150px]">
          <FileText size={15} className="text-text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-text-primary truncate">{pf.file.name}</p>
            <p className="text-2xs text-text-muted">{formatFileSize(pf.file.size)}</p>
          </div>
        </div>
      )}

      {/* Upload spinner */}
      {pf.uploading && (
        <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {pf.error && (
        <div className="absolute inset-0 rounded-lg bg-red-500/20 flex items-center justify-center" title={pf.error}>
          <X size={14} className="text-red-400" />
        </div>
      )}

      {/* Remove */}
      {!pf.uploading && (
        <button
          type="button"
          onClick={() => onRemove(pf.id)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-secondary border border-border-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
        >
          <X size={10} className="text-text-muted" />
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main composer
// ────────────────────────────────────────────────────────────────────────────

export function MessageComposer({
  onSend,
  onTyping,
  uploadFile,
  initialText,
  isEditing = false,
  onCancel,
  placeholder,
  disabled = false,
}: MessageComposerProps) {
  const [text, setText] = useState(initialText ?? '');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial text for editing
  useEffect(() => {
    setText(initialText ?? '');
  }, [initialText]);

  // Auto focus when mounted
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
  }, []);

  useEffect(() => { autoResize(); }, [text, autoResize]);

  // ── Text formatting ──────────────────────────────────────────────────────

  const wrapSelection = useCallback((prefix: string, suffix: string = prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    // Unwrap if already wrapped
    if (before.endsWith(prefix) && after.startsWith(suffix)) {
      const newText = before.slice(0, -prefix.length) + selected + after.slice(suffix.length);
      setText(newText);
      setTimeout(() => {
        ta.selectionStart = start - prefix.length;
        ta.selectionEnd = end - prefix.length;
        ta.focus();
      }, 0);
      return;
    }

    const newText = before + prefix + selected + suffix + after;
    setText(newText);
    setTimeout(() => {
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = end + prefix.length;
      ta.focus();
    }, 0);
  }, [text]);

  const insertAtCursor = useCallback((snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const newText = text.slice(0, start) + snippet + text.slice(ta.selectionEnd);
    setText(newText);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
      ta.focus();
    }, 0);
  }, [text]);

  // ── File handling ────────────────────────────────────────────────────────

  const enqueueFiles = useCallback(async (files: File[]) => {
    const created: PendingFile[] = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      uploading: true,
    }));
    setPendingFiles(prev => [...prev, ...created]);

    for (const pf of created) {
      const att = await uploadFile(pf.file);
      setPendingFiles(prev =>
        prev.map(p =>
          p.id === pf.id
            ? { ...p, uploading: false, attachment: att ?? undefined, error: att ? undefined : 'Upload failed' }
            : p
        )
      );
    }
  }, [uploadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) enqueueFiles(Array.from(e.target.files));
    e.target.value = '';
  }, [enqueueFiles]);

  const removePending = useCallback((id: string) => {
    setPendingFiles(prev => {
      const f = prev.find(p => p.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // ── Drag & drop ──────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) enqueueFiles(files);
  }, [enqueueFiles]);

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const ready = pendingFiles.filter(p => p.attachment && !p.uploading);
    if (!trimmed && ready.length === 0) return;

    const attachmentIds = ready.map(p => p.attachment!.id);
    const messageType = deriveMessageType(pendingFiles, trimmed.length > 0);

    onSend(trimmed, attachmentIds, messageType);
    setText('');
    setPendingFiles(prev => {
      prev.forEach(p => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
      return [];
    });
    setShowFormatBar(false);
    setShowEmojiPicker(false);
    onTyping(false);
  }, [text, pendingFiles, onSend, onTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    if (e.key === 'Escape') { onCancel?.(); return; }
    if ((e.ctrlKey || e.metaKey)) {
      if (e.key === 'b') { e.preventDefault(); wrapSelection('**'); }
      else if (e.key === 'i') { e.preventDefault(); wrapSelection('_'); }
      else if (e.key === 'k') { e.preventDefault(); wrapSelection('`'); }
    }
  }, [handleSend, onCancel, wrapSelection]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(e.target.value.length > 0);
  }, [onTyping]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojiPicker(false);
  }, [insertAtCursor]);

  const handleVoiceSend = useCallback((attachment: Attachment) => {
    onSend('', [attachment.id], 'VOICE');
    setShowVoiceRecorder(false);
    onTyping(false);
  }, [onSend, onTyping]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const hasContent = text.trim().length > 0 || pendingFiles.some(p => p.attachment);
  const isUploading = pendingFiles.some(p => p.uploading);
  const hasFormatBar = showFormatBar;
  const hasPendingQueue = pendingFiles.length > 0;
  const topRounded = hasFormatBar || hasPendingQueue ? 'rounded-b-2xl rounded-t-none' : 'rounded-2xl';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`relative transition-all ${
        isDragging ? 'ring-2 ring-accent-blue ring-offset-1 ring-offset-bg-primary rounded-2xl' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* ── Emoji picker ── */}
      {showEmojiPicker && (
        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
      )}

      {/* ── Voice recorder (replaces main input) ── */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          uploadFile={uploadFile}
          onSend={handleVoiceSend}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        <>
          {/* ── Formatting toolbar ── */}
          {hasFormatBar && (
            <div className="flex items-center gap-0.5 px-2 py-1.5 bg-bg-tertiary border border-border-primary border-b-0 rounded-t-xl overflow-x-auto no-scrollbar">
              <FmtBtn icon={<Bold size={13} />}          title="Bold (Ctrl+B)"       onClick={() => wrapSelection('**')} />
              <FmtBtn icon={<Italic size={13} />}        title="Italic (Ctrl+I)"     onClick={() => wrapSelection('_')} />
              <FmtBtn icon={<Strikethrough size={13} />} title="Strikethrough"       onClick={() => wrapSelection('~~')} />
              <div className="w-px h-4 bg-border-primary mx-0.5 shrink-0" />
              <FmtBtn icon={<Code size={13} />}          title="Inline code (Ctrl+K)" onClick={() => wrapSelection('`')} />
              <FmtBtn icon={<Code2 size={13} />}         title="Code block"          onClick={() => insertAtCursor('\n```\n\n```')} />
              <div className="w-px h-4 bg-border-primary mx-0.5 shrink-0" />
              <FmtBtn icon={<List size={13} />}          title="Bullet list"         onClick={() => insertAtCursor('\n• ')} />
              <FmtBtn icon={<ListOrdered size={13} />}   title="Numbered list"       onClick={() => insertAtCursor('\n1. ')} />
              <div className="w-px h-4 bg-border-primary mx-0.5 shrink-0" />
              <FmtBtn icon={<AtSign size={13} />}        title="Mention someone"     onClick={() => insertAtCursor('@')} />
            </div>
          )}

          {/* ── Pending file thumbnails ── */}
          {hasPendingQueue && (
            <div
              className={`flex flex-wrap gap-2 px-3 pt-2.5 pb-2 bg-bg-input border border-border-primary border-b-0 ${
                hasFormatBar ? '' : 'rounded-t-2xl'
              }`}
            >
              {pendingFiles.map(pf => (
                <PendingThumb key={pf.id} pf={pf} onRemove={removePending} />
              ))}
            </div>
          )}

          {/* ── Main input row ── */}
          <div
            className={`flex items-end gap-2 bg-bg-input border border-border-primary px-3 py-2 focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/30 transition-all ${topRounded}`}
          >
            {/* Emoji */}
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(p => !p); }}
              className={`btn-icon shrink-0 w-8 h-8 ${showEmojiPicker ? 'text-accent-blue' : ''}`}
              title="Emoji"
              disabled={disabled}
            >
              <Smile size={20} />
            </button>

            {/* Toggle format bar */}
            <button
              type="button"
              onClick={() => setShowFormatBar(p => !p)}
              className={`btn-icon shrink-0 w-8 h-8 ${hasFormatBar ? 'text-accent-blue' : ''}`}
              title="Formatting (Bold/Italic/Code…)"
              disabled={disabled}
            >
              <Bold size={17} />
            </button>

            {/* Attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-icon shrink-0 w-8 h-8"
              title="Attach files (images, videos, documents…)"
              disabled={disabled || isUploading}
            >
              {isUploading
                ? <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                : <Paperclip size={18} />
              }
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar,.7z,.tar,.gz"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isEditing
                  ? 'Edit message… (Escape to cancel)'
                  : (placeholder ?? 'Type a message… (Shift+Enter for new line)')
              }
              rows={1}
              disabled={disabled}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none py-1"
              style={{ minHeight: '24px', maxHeight: '128px' }}
            />

            {/* Send or Voice */}
            {hasContent ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={disabled || isUploading}
                className={`w-8 h-8 rounded-full ${
                  isEditing ? 'bg-accent-orange' : 'bg-accent-blue'
                } text-white flex items-center justify-center hover:opacity-90 transition-colors shrink-0 disabled:opacity-50`}
                title={isEditing ? 'Save edit' : 'Send'}
              >
                {isEditing ? <Check size={16} /> : <Send size={15} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="btn-icon shrink-0 w-8 h-8"
                title="Record voice message"
                disabled={disabled}
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Drag overlay ── */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-accent-blue bg-accent-blue/5 flex flex-col items-center justify-center pointer-events-none gap-2">
          <Paperclip size={22} className="text-accent-blue" />
          <p className="text-sm text-accent-blue font-medium">Drop files to attach</p>
        </div>
      )}
    </div>
  );
}
