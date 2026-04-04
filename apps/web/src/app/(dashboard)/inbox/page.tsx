'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/notification-context';
import { useNotificationsGql } from '@/hooks/useNotificationsGql';
import { useDetailParam } from '@/hooks/useDetailParam';
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox, Bell } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

const tabs = ['All', 'Personal', 'Business', 'Ads'] as const;

const categoryChip: Record<string, string> = {
  Personal: 'chip-blue',
  Business: 'chip-green',
  Ads: 'chip-orange',
  PERSONAL: 'chip-blue',
  SERVICE_PROVIDER: 'chip-green',
  ADVERTISEMENT: 'chip-orange',
};

const categoryMap: Record<string, string | undefined> = {
  All: undefined,
  Personal: 'PERSONAL',
  Business: 'SERVICE_PROVIDER',
  Ads: 'ADVERTISEMENT',
};

function getCategoryLabel(category?: string): string {
  if (category === 'PERSONAL') return 'Personal';
  if (category === 'SERVICE_PROVIDER') return 'Business';
  if (category === 'ADVERTISEMENT') return 'Ads';
  return 'Business';
}

const PAGE_SIZE = 20;

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-sm text-text-muted">Loading…</p></div>}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  // SSE context for real-time overlay and unread badge
  const { notifications: sseNotifications } = useNotifications();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [page, setPage] = useState(0);

  const categoryFilter = categoryMap[activeTab];
  const { notifications: gqlNotifications, totalCount, loading, error, refetch, markRead, archive, markAllRead } = useNotificationsGql({
    category: categoryFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Refetch when SSE delivers new notifications
  const sseLength = sseNotifications.length;
  useEffect(() => {
    if (sseLength > 0) {
      refetch();
    }
  }, [sseLength, refetch]);

  // Use GraphQL data as primary, fall back to SSE if GraphQL hasn't loaded yet
  const displayNotifications = gqlNotifications.length > 0 || !loading ? gqlNotifications : [];

  const selected = displayNotifications.find((n: any) => n.id === selectedId) || null;

  // Auto-open mobile detail when deep-linked
  useEffect(() => {
    if (selectedId) setMobileShowDetail(true);
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    const n = displayNotifications.find((n: any) => n.id === id);
    if (n && n.status !== 'READ') {
      markRead(id);
    }
  }, [displayNotifications, markRead]);

  const handleArchive = useCallback(async () => {
    if (!selectedId) return;
    try {
      await archive(selectedId);
      clearSelectedId();
    } catch {
      // Error handled by Apollo
    }
  }, [selectedId, archive, clearSelectedId]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead();
    } catch {
      // Error handled by Apollo
    }
  }, [markAllRead]);

  const handleTabChange = useCallback((t: typeof tabs[number]) => {
    setActiveTab(t);
    setPage(0);
    clearSelectedId();
  }, [clearSelectedId]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && displayNotifications.length === 0) {
    return (
      <>
        <div className="flex w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0">
          <div className="px-4 pt-4 pb-2 space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Inbox</h2>
          </div>
          <div className="flex-1 px-4 space-y-1 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tertiary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 bg-bg-tertiary rounded" />
                  <div className="h-3 w-64 bg-bg-tertiary rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
          <p className="text-sm text-text-muted">Loading notifications…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load notifications</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Notification list panel */}
      <div className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0`}>
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Inbox</h2>
              {totalCount > 0 && <span className="badge-count">{totalCount}</span>}
            </div>
            <button onClick={handleMarkAllRead} className="text-2xs text-accent-blue hover:underline">Mark all read</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
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
          {displayNotifications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No notifications yet"
              description="Service providers you interact with will send you updates here."
              action={{ label: 'Browse providers', onClick: () => router.push('/service-providers') }}
            />
          ) : (
            displayNotifications.map((n: any) => (
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
                    <span className={`text-sm font-medium truncate ${n.status !== 'READ' ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</span>
                    <span className="text-2xs text-text-muted shrink-0 ml-2">{n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${n.status !== 'READ' ? 'text-text-secondary' : 'text-text-muted'}`}>{n.body}</p>
                </div>
                {n.status !== 'READ' && <span className="w-2 h-2 rounded-full bg-accent-blue shrink-0 mt-2" />}
              </div>
            ))
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost text-2xs disabled:opacity-50">← Prev</button>
              <span className="text-2xs text-text-muted">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-ghost text-2xs disabled:opacity-50">Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className={`${!mobileShowDetail ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-bg-primary min-w-0 overflow-hidden`}>
          <div className="h-[60px] px-4 sm:px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                onClick={() => setMobileShowDetail(false)}
                className="sm:hidden btn-icon mr-1"
                aria-label="Back to inbox"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-lg bg-accent-blue/15 text-accent-blue flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selected.title}</h3>
                <p className="text-2xs text-text-muted">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={categoryChip[selected.category] || 'chip-blue'}>{getCategoryLabel(selected.category)}</span>
              <button onClick={handleArchive} className="btn-ghost text-2xs" title="Archive">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
        <div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
          <EmptyState
            icon={Bell}
            title="Select a notification"
            description="Choose a notification from the list to view its details"
            size="lg"
          />
        </div>
      )}
    </>
  );
}
