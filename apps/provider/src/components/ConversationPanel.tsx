'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Bot, User, Check, CheckCheck } from 'lucide-react';
import { MessageComposer, type PendingAttachment } from '@/components/conversations/MessageComposer';
import { FileAttachment } from '@/components/conversations/FileAttachment';
import type { MessageNode, ReadStatus } from '@/lib/graphql/conversations';

// ─── Types ──────────────────────────────────────────────

interface ConversationPanelProps {
  conversationId: string;
  messages: MessageNode[];
  loading: boolean;
  onSend: (content: string, attachments?: PendingAttachment[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  botSuggestion?: string;
  sending?: boolean;
  disabled?: boolean;
}

// ─── Helpers ────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDay(messages: MessageNode[]): { label: string; messages: MessageNode[] }[] {
  const groups: { label: string; messages: MessageNode[] }[] = [];
  let cur = '';
  for (const msg of messages) {
    const label = getDayLabel(msg.createdAt);
    if (label !== cur) {
      groups.push({ label, messages: [msg] });
      cur = label;
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

function ReadReceipt({ status }: { status: ReadStatus }) {
  if (status === 'READ') return <CheckCheck size={12} className="text-accent-blue" />;
  if (status === 'DELIVERED') return <CheckCheck size={12} className="text-text-muted" />;
  return <Check size={12} className="text-text-muted" />;
}

// ─── Component ──────────────────────────────────────────

export default function ConversationPanel({
  conversationId,
  messages,
  loading,
  onSend,
  botSuggestion,
  sending,
  disabled,
}: ConversationPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );
  const groups = useMemo(() => groupByDay(sorted), [sorted]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length]);

  return (
    <div className="flex flex-col h-full bg-bg-primary rounded-xl border border-border-primary overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading && sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Loading messages…
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              {/* Day divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-border-secondary" />
                <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border-secondary" />
              </div>

              {group.messages.map((msg) => {
                const isSystem = msg.senderType === 'SYSTEM' || msg.messageType === 'SYSTEM';
                const isCustomer = msg.senderType === 'CUSTOMER';
                const isRight = !isCustomer && !isSystem;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center py-1">
                      <span className="px-3 py-1 text-xs text-text-muted bg-bg-tertiary rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className="max-w-[75%]">
                      <div className={`flex items-center gap-1 mb-0.5 ${isRight ? 'justify-end' : ''}`}>
                        {msg.senderType === 'CUSTOMER' && <User size={12} className="text-text-muted" />}
                        {msg.senderType === 'BOT' && <Bot size={12} className="text-accent-purple" />}
                        {msg.senderType === 'AGENT' && <User size={12} className="text-accent-blue" />}
                        <span className="text-[10px] text-text-muted">
                          {msg.senderName} · {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                          isCustomer
                            ? 'bg-bg-card border border-border-primary'
                            : msg.senderType === 'BOT'
                              ? 'bg-accent-purple/10 border border-accent-purple/20'
                              : 'bg-accent-blue/10 border border-accent-blue/20'
                        } text-text-primary`}
                      >
                        {msg.messageType === 'FILE' && msg.metadata && (
                          <div className="mb-1">
                            <FileAttachment
                              fileUrl={(msg.metadata.url as string) ?? '#'}
                              fileName={(msg.metadata.fileName as string) ?? 'File'}
                              fileSize={msg.metadata.fileSize as number | undefined}
                              fileType={(msg.metadata.mimeType as string) ?? ''}
                              isImage={((msg.metadata.mimeType as string) ?? '').startsWith('image/')}
                            />
                          </div>
                        )}
                        {msg.content && <span>{msg.content}</span>}
                      </div>
                      {isRight && msg.readStatus && (
                        <div className="flex justify-end mt-0.5">
                          <ReadReceipt status={msg.readStatus} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {botSuggestion && (
        <div className="px-4 py-2 border-t border-border-primary bg-bg-tertiary flex items-center gap-2 text-xs text-text-muted">
          <Bot size={14} className="text-accent-purple shrink-0" />
          <span className="text-accent-purple font-medium">Suggestion:</span>
          <span className="truncate">{botSuggestion}</span>
        </div>
      )}

      <MessageComposer
        conversationId={conversationId}
        onSend={onSend}
        sending={sending}
        disabled={disabled}
      />
    </div>
  );
}
