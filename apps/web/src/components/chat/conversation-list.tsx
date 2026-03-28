'use client';

import { useState } from 'react';
import { useChat, Conversation } from '@/lib/chat-context';

const filters = ['All', 'Unread', 'Friends'] as const;

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
}

export type { Conversation } from '@/lib/chat-context';

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { conversations, isLoadingConversations } = useChat();
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
    <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
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
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <p className="text-sm font-medium mb-1">No conversations yet</p>
            <p className="text-xs text-text-muted">Start chatting with your friends!</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeId === conv.id}
              onClick={() => onSelect(conv)}
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
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
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
          <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'text-text-secondary' : 'text-text-muted'}`}>
            {conversation.lastMessagePreview || 'No messages yet'}
          </p>
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
