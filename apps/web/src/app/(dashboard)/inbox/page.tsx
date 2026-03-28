'use client';

import { useState } from 'react';
import { useNotifications, Notification } from '@/lib/notification-context';

const tabs = ['All', 'Personal', 'Business', 'Ads'] as const;

const categoryChip: Record<string, string> = {
  Personal: 'chip-blue',
  Business: 'chip-green',
  Ads: 'chip-orange',
  FRIEND_REQUEST: 'chip-blue',
  FRIEND_ACCEPTED: 'chip-green',
};

function getCategory(n: Notification): string {
  if (n.type === 'FRIEND_REQUEST' || n.type === 'FRIEND_ACCEPTED') return 'Personal';
  return 'Business';
}

export default function InboxPage() {
  const { notifications, markRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = activeTab === 'All'
    ? notifications
    : notifications.filter((n) => getCategory(n) === activeTab);

  const selected = notifications.find((n) => n.id === selectedId) || null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const n = notifications.find((n) => n.id === id);
    if (n && !n.read) {
      markRead([id]);
    }
  };

  return (
    <>
      {/* Notification list panel */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Inbox</h2>
              {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                  activeTab === t
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15A2.25 2.25 0 0121.75 6.75v6.75m-17.5 0v4.5A2.25 2.25 0 006.5 20h11a2.25 2.25 0 002.25-2.25v-4.5" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">No notifications yet</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleSelect(n.id)}
                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2 ${
                  selectedId === n.id
                    ? 'bg-bg-active border-l-accent-blue'
                    : `border-l-transparent hover:bg-bg-hover`
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-accent-blue/15 text-accent-blue flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-medium truncate ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</span>
                    <span className="text-2xs text-text-muted shrink-0 ml-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${!n.read ? 'text-text-secondary' : 'text-text-muted'}`}>{n.body}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-accent-blue shrink-0 mt-2" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/15 text-accent-blue flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selected.title}</h3>
                <p className="text-2xs text-text-muted">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <span className={categoryChip[selected.type] || 'chip-blue'}>{getCategory(selected)}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <h1 className="text-xl font-semibold text-text-primary">{selected.title}</h1>
              <div className="h-px bg-border-primary" />
              <div className="text-sm text-text-secondary leading-relaxed space-y-4">
                <p>{selected.body}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15A2.25 2.25 0 0121.75 6.75v6.75m-17.5 0v4.5A2.25 2.25 0 006.5 20h11a2.25 2.25 0 002.25-2.25v-4.5" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">Select a notification to view details</p>
          </div>
        </div>
      )}
    </>
  );
}
