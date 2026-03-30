'use client';

import { useState } from 'react';
import { MessageSquare, Search, Bot, Clock, User } from 'lucide-react';
import Link from 'next/link';

const mockConversations = [
  { id: 'conv-1', customerVid: 'VID-8a3f2b', lastMessage: 'Thank you for the quick response!', lastAt: '2 min ago', unread: 0, assignee: 'Bot: Support Assistant', status: 'Active' },
  { id: 'conv-2', customerVid: 'VID-4c9e1d', lastMessage: 'I need help with my account settings', lastAt: '15 min ago', unread: 2, assignee: 'Agent: Sarah K.', status: 'Active' },
  { id: 'conv-3', customerVid: 'VID-7f2a8c', lastMessage: 'When will the maintenance be completed?', lastAt: '1 hr ago', unread: 1, assignee: 'Bot: Support Assistant', status: 'Waiting' },
  { id: 'conv-4', customerVid: 'VID-1b5d3e', lastMessage: 'Got it, thanks for the information.', lastAt: '3 hrs ago', unread: 0, assignee: 'Agent: Mike T.', status: 'Resolved' },
  { id: 'conv-5', customerVid: 'VID-9e6f4a', lastMessage: 'Can I upgrade my subscription?', lastAt: '5 hrs ago', unread: 0, assignee: 'Bot: Sales Bot', status: 'Escalated' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Waiting: 'bg-status-warning/10 text-status-warning',
  Resolved: 'bg-border-secondary text-text-muted',
  Escalated: 'bg-accent-orange/10 text-accent-orange',
};

export default function ConversationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const statuses = ['All', 'Active', 'Waiting', 'Escalated', 'Resolved'];

  const filtered = mockConversations.filter((c) =>
    (statusFilter === 'All' || c.status === statusFilter) &&
    (search === '' || c.customerVid.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-text-secondary mt-1">Manage customer conversations with bot assist</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active', value: '12', color: 'text-status-success' },
          { label: 'Waiting', value: '5', color: 'text-status-warning' },
          { label: 'Escalated', value: '3', color: 'text-accent-orange' },
          { label: 'Resolved Today', value: '28', color: 'text-text-primary' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className={`text-xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search conversations…" />
        </div>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="space-y-2">
        {filtered.map((conv) => (
          <Link key={conv.id} href={`/conversations/${conv.id}`}
            className="flex items-center gap-4 bg-bg-card border border-border-primary rounded-xl p-4 hover:bg-bg-hover transition-colors group">
            <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
              <MessageSquare size={18} className="text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{conv.customerVid}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[conv.status]}`}>{conv.status}</span>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-accent-blue text-white text-xs flex items-center justify-center">{conv.unread}</span>
                )}
              </div>
              <p className="text-sm text-text-muted truncate mt-0.5">{conv.lastMessage}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-text-muted">{conv.lastAt}</p>
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1 justify-end">
                {conv.assignee.startsWith('Bot') ? <Bot size={12} /> : <User size={12} />}
                {conv.assignee}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
