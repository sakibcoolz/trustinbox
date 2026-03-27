'use client';

import { useState } from 'react';

export interface Conversation {
  id: string;
  name: string;
  orgSlug?: string;
  username?: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
  verified?: boolean;
  isFriend?: boolean;
  category: 'personal' | 'organizational' | 'advertisement';
  pinned?: boolean;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'Acme Bank',
    orgSlug: 'o/acmebank',
    lastMessage: 'Your loan application has been approved. Please review the terms and conditions.',
    time: '2m',
    unread: 3,
    online: true,
    verified: true,
    category: 'organizational',
    pinned: true,
  },
  {
    id: 'f1',
    name: 'Bob Wilson',
    username: 'c/bob',
    lastMessage: 'Hey! Are you free for coffee this weekend?',
    time: '5m',
    unread: 2,
    online: true,
    isFriend: true,
    category: 'personal',
    pinned: true,
  },
  {
    id: '2',
    name: 'City Hospital',
    orgSlug: 'o/cityhospital',
    lastMessage: 'Your lab results are ready. Please visit your nearest branch.',
    time: '15m',
    unread: 1,
    online: true,
    verified: true,
    category: 'personal',
    pinned: true,
  },
  {
    id: 'f2',
    name: 'Carol Martinez',
    username: 'c/carol',
    lastMessage: 'Thanks for sharing that article! Really insightful.',
    time: '30m',
    unread: 0,
    online: true,
    isFriend: true,
    category: 'personal',
  },
  {
    id: '3',
    name: 'Quick Realty',
    orgSlug: 'o/quickrealty',
    lastMessage: 'New property listing matches your criteria in downtown area.',
    time: '1h',
    unread: 0,
    online: false,
    verified: true,
    category: 'advertisement',
  },
  {
    id: '4',
    name: 'TrustInbox Support',
    orgSlug: 'o/trustinbox',
    lastMessage: 'Welcome to TrustInbox! Your privacy is our priority.',
    time: '2h',
    unread: 0,
    online: true,
    verified: true,
    category: 'organizational',
  },
  {
    id: '5',
    name: 'SecurePay',
    orgSlug: 'o/securepay',
    lastMessage: 'Transaction #8291 completed successfully. Amount: ₹15,000',
    time: '5h',
    unread: 0,
    online: false,
    verified: true,
    category: 'organizational',
  },
  {
    id: '6',
    name: 'MediCare Plus',
    orgSlug: 'o/medicareplus',
    lastMessage: 'Your health insurance renewal is due in 15 days.',
    time: '1d',
    unread: 0,
    online: false,
    verified: true,
    category: 'personal',
  },
  {
    id: 'f3',
    name: 'Dave Chen',
    username: 'c/dave',
    lastMessage: 'See you at the meetup tomorrow!',
    time: '3h',
    unread: 0,
    online: false,
    isFriend: true,
    category: 'personal',
  },
];

const filters = ['All', 'Unread', 'Friends', 'Personal', 'Business', 'Ads'] as const;

const categoryColors: Record<string, string> = {
  personal: 'bg-accent-blue',
  organizational: 'bg-accent-green',
  advertisement: 'bg-accent-orange',
};

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');

  const filtered = mockConversations.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === 'Unread' && c.unread === 0) return false;
    if (activeFilter === 'Friends' && !c.isFriend) return false;
    if (activeFilter === 'Personal' && c.category !== 'personal') return false;
    if (activeFilter === 'Business' && c.category !== 'organizational') return false;
    if (activeFilter === 'Ads' && c.category !== 'advertisement') return false;
    return true;
  });

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

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
        {pinned.length > 0 && (
          <>
            <div className="px-4 py-1.5">
              <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Pinned</span>
            </div>
            {pinned.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeId === conv.id}
                onClick={() => onSelect(conv)}
                categoryColor={categoryColors[conv.category]}
              />
            ))}
            <div className="px-4 py-1.5">
              <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Recent</span>
            </div>
          </>
        )}
        {rest.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={activeId === conv.id}
            onClick={() => onSelect(conv)}
            categoryColor={categoryColors[conv.category]}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">No conversations found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  categoryColor,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  categoryColor: string;
}) {
  const initials = conversation.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
          conversation.isFriend
            ? 'bg-gradient-to-br from-accent-blue to-accent-purple'
            : categoryColor
        } flex items-center justify-center text-white text-sm font-semibold`}>
          {initials}
        </div>
        {conversation.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-bg-secondary" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-sm font-medium truncate ${conversation.unread > 0 ? 'text-text-primary' : 'text-text-secondary'}`}>
              {conversation.name}
            </span>
            {conversation.verified && (
              <svg className="w-3.5 h-3.5 text-accent-blue shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
              </svg>
            )}
            {conversation.isFriend && (
              <svg className="w-3.5 h-3.5 text-accent-purple shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
            )}
          </div>
          <span className={`text-2xs shrink-0 ${conversation.unread > 0 ? 'text-accent-blue font-medium' : 'text-text-muted'}`}>
            {conversation.time}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs truncate ${conversation.unread > 0 ? 'text-text-secondary' : 'text-text-muted'}`}>
            {conversation.lastMessage}
          </p>
          {conversation.unread > 0 && (
            <span className="badge-count ml-2 shrink-0">{conversation.unread}</span>
          )}
        </div>
      </div>
    </div>
  );
}
