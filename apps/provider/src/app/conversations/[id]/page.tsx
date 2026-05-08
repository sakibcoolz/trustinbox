'use client';

import { Suspense, use, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronDown, Bot, User, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { ConversationHeader } from '@/components/conversations/ConversationHeader';
import { ConversationInfoSidebar } from '@/components/conversations/ConversationInfoSidebar';
import { AIInsightsPanel } from '@/components/conversations/AIInsightsPanel';
import { AgentAssignDrawer } from '@/components/conversations/AgentAssignDrawer';
import { MessageComposer } from '@/components/conversations/MessageComposer';
import { FileAttachment } from '@/components/conversations/FileAttachment';
import { TypingIndicator } from '@/components/conversations/TypingIndicator';
import {
  useConversation,
  useSendMessage,
  useMessageSubscription,
  getSenderStyle,
} from '@/lib/graphql/conversations';
import type { MessageNode, SenderType, ReadStatus } from '@/lib/graphql/conversations';
import { useToast } from '@/components/Toast';

// ─── Day grouping helpers ───────────────────────────────

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

function groupMessagesByDay(messages: MessageNode[]): { label: string; messages: MessageNode[] }[] {
  const groups: { label: string; messages: MessageNode[] }[] = [];
  let currentLabel = '';

  for (const msg of messages) {
    const label = getDayLabel(msg.createdAt);
    if (label !== currentLabel) {
      groups.push({ label, messages: [msg] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isImageFile(metadata?: Record<string, unknown>): boolean {
  const mime = (metadata?.mimeType as string) ?? '';
  return mime.startsWith('image/');
}

// ─── Read Receipt ───────────────────────────────────────

function ReadReceipt({ status }: { status: ReadStatus }) {
  if (status === 'READ') {
    return <CheckCheck size={12} className="text-accent-blue" />;
  }
  if (status === 'DELIVERED') {
    return <CheckCheck size={12} className="text-text-muted" />;
  }
  return <Check size={12} className="text-text-muted" />;
}

// ─── Message Bubble ─────────────────────────────────────

function MessageBubble({ message }: { message: MessageNode }) {
  const isSystem = message.senderType === 'SYSTEM' || message.messageType === 'SYSTEM';
  const isCustomer = message.senderType === 'CUSTOMER';
  const isRight = !isCustomer && !isSystem;

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="px-3 py-1 text-xs text-text-muted bg-bg-tertiary rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const style = getSenderStyle(message.senderType);

  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="max-w-[70%]">
        {/* Sender label */}
        <div className={`flex items-center gap-1.5 mb-0.5 ${isRight ? 'justify-end' : ''}`}>
          {message.senderType === 'CUSTOMER' && <User size={12} className="text-text-muted" />}
          {message.senderType === 'BOT' && <Bot size={12} className="text-accent-purple" />}
          {(message.senderType === 'AGENT') && <User size={12} className="text-accent-blue" />}
          <span className="text-[10px] text-text-muted">{message.senderName}</span>
          <span className="text-[10px] text-text-muted">· {formatTime(message.createdAt)}</span>
        </div>

        {/* Bubble */}
        <div
          className={`px-4 py-2.5 text-sm whitespace-pre-wrap ${
            isCustomer
              ? 'bg-bg-card border border-border-primary rounded-2xl rounded-bl-sm'
              : message.senderType === 'BOT'
                ? 'bg-accent-purple/10 border border-accent-purple/20 rounded-2xl rounded-br-sm'
                : 'bg-accent-blue/10 border border-accent-blue/20 rounded-2xl rounded-br-sm'
          } text-text-primary`}
        >
          {/* File attachment */}
          {message.messageType === 'FILE' && message.metadata && (
            <div className="mb-2">
              <FileAttachment
                fileUrl={(message.metadata.url as string) ?? '#'}
                fileName={(message.metadata.fileName as string) ?? 'File'}
                fileSize={message.metadata.fileSize as number | undefined}
                fileType={(message.metadata.mimeType as string) ?? ''}
                isImage={isImageFile(message.metadata)}
              />
            </div>
          )}

          {/* Text content */}
          {message.content && <span>{message.content}</span>}
        </div>

        {/* Read receipt for outgoing */}
        {isRight && message.readStatus && (
          <div className="flex justify-end mt-0.5">
            <ReadReceipt status={message.readStatus} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day Divider ────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border-secondary" />
      <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border-secondary" />
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="px-4 py-3 border-b border-border-primary">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex ${i % 2 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className="h-16 w-60 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border-primary">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main Content ───────────────────────────────────────

function ConversationDetailContent({ id }: { id: string }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { error: toastError } = useToast();

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);

  const { data, loading, refetch, fetchMoreMessages, hasMoreMessages } = useConversation(id);
  const { sendMessage, loading: sending } = useSendMessage();

  // Real-time
  useMessageSubscription(id);

  const conversation = data?.conversation ?? null;
  const messages = conversation?.messages?.nodes ?? [];

  // Sorted messages (oldest first for display)
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  const dayGroups = useMemo(() => groupMessagesByDay(sortedMessages), [sortedMessages]);

  // Auto-scroll to bottom on new messages
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (sortedMessages.length > prevCountRef.current && !showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = sortedMessages.length;
  }, [sortedMessages.length, showScrollBtn]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Show "scroll to bottom" if scrolled up more than 200px
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(fromBottom > 200);

    // Load older messages when near top
    if (el.scrollTop < 100 && hasMoreMessages) {
      const prevHeight = el.scrollHeight;
      fetchMoreMessages().then(() => {
        // Preserve scroll position
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMoreMessages, fetchMoreMessages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend(content: string) {
    try {
      await sendMessage({
        conversationId: id,
        content,
      });
    } catch {
      toastError('Failed to send message');
    }
  }

  if (loading && !conversation) return <DetailSkeleton />;
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-text-muted">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        <ConversationHeader
          conversation={conversation}
          onToggleInfo={() => setInfoOpen(!infoOpen)}
          onAssign={() => setAssignOpen(true)}
          infoOpen={infoOpen}
        />

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          {/* Load more indicator */}
          {hasMoreMessages && (
            <div className="flex justify-center py-2">
              <Loader2 size={16} className="text-text-muted animate-spin" />
            </div>
          )}

          {dayGroups.map((group) => (
            <div key={group.label}>
              <DayDivider label={group.label} />
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))}

          {typingLabel && <TypingIndicator label={typingLabel} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1 px-3 py-1.5 bg-bg-card border border-border-primary rounded-full shadow-lg text-xs text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <ChevronDown size={14} />
              New messages
            </button>
          </div>
        )}

        {/* Composer */}
        <MessageComposer
          conversationId={id}
          onSend={handleSend}
          sending={sending}
          disabled={conversation.status === 'ARCHIVED'}
        />
      </div>

      {/* Info sidebar */}
      <ConversationInfoSidebar
        conversation={conversation}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      {/* AI insights right rail */}
      <AIInsightsPanel conversationId={id} />

      {/* Agent assign drawer */}
      <AgentAssignDrawer
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        conversationId={id}
        currentAssigneeId={conversation.assignee?.id}
        onAssigned={() => { refetch(); }}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ConversationDetailContent id={id} />
    </Suspense>
  );
}
