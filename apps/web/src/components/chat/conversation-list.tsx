'use client';

import { useState } from 'react';
import { useChat, Conversation } from '@/lib/chat-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageCircle } from 'lucide-react';

const filters = ['All', 'Unread', 'Friends'] as const;

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
}

export type { Conversation } from '@/lib/chat-context';

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { conversations, isLoadingConversations, typingConversationIds } = useChat();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');

  const filtered = conversations.filter((c) => {
    const name = c.name || c.otherUser?.fullName || '';
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === 'Unread' && c.unreadCount === 0) return false;
    if (activeFilter === 'Friends' && c.type !== 'DIRECT') return false;
    return true;
  });

  return (
    <div className="w-full sm:w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Messages</h2>
          <button className="btn-icon" title="New conversation">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="input-field w-full pl-9 h-9 text-sm"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                activeFilter === f
                  ? 'bg-accent-blue text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading conversations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Start chatting with your friends! Select a contact to begin."
          />
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeId === conv.id}
              onClick={() => onSelect(conv)}
              isTyping={typingConversationIds.has(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  isTyping,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  isTyping: boolean;
}) {
  const displayName = conversation.name || conversation.otherUser?.fullName || 'Unknown';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isOnline = conversation.otherUser?.online ?? false;
  const isDirect = conversation.type === 'DIRECT';

  // Format time
  const timeStr = formatRelativeTime(conversation.lastMessageAt || conversation.createdAt);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${
        isActive
          ? 'bg-bg-active border-l-accent-blue'
          : 'border-l-transparent hover:bg-bg-hover'
      }`}
    >
      {/* Avatar with status */}
      <div className="relative shrink-0">
        <div className={`w-11 h-11 rounded-full ${
          isDirect
            ? 'bg-gradient-to-br from-accent-blue to-accent-purple'
            : 'bg-accent-green'
        } flex items-center justify-center text-white text-sm font-semibold`}>
          {initials}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-bg-secondary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-sm font-medium truncate ${conversation.unreadCount > 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
              {displayName}
            </span>
            {isDirect && (
              <svg className="w-3.5 h-3.5 text-accent-purple shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            )}
          </div>
          <span className={`text-2xs shrink-0 ${conversation.unreadCount > 0 ? 'text-accent-blue font-medium' : 'text-text-muted'}`}>
            {timeStr}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {isTyping ? (
            <div className="flex items-center gap-0.5 text-accent-blue">
              <span className="text-xs">typing</span>
              <span className="w-1 h-1 bg-accent-blue rounded-full animate-bounce ml-0.5" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'text-text-secondary' : 'text-text-muted'}`}>
              {conversation.lastMessagePreview || 'No messages yet'}
            </p>
          )}
          {conversation.unreadCount > 0 && (
            <span className="badge-count ml-2 shrink-0">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
