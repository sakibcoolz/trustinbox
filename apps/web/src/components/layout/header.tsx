'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notification-context';
import { useTheme } from '@/lib/theme-context';
import { SearchModal } from '@/components/ui/search-modal';

type Theme = 'dark' | 'light' | 'system';

const PAGE_TITLES: Record<string, string> = {
  '/inbox': 'Inbox',
  '/conversations': 'Chats',
  '/callbacks': 'Callback Requests',
  '/friends': 'People',
  '/service-providers': 'Service Providers',
  '/documents': 'Files',
  '/activity': 'Activity',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string) {
  for (const [prefix, label] of Object.entries(PAGE_TITLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return label;
  }
  return 'TrustInbox';
}

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const { theme, setTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const recentNotifs = notifications.slice(0, 8);

  // Relative time helper
  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Event type icon SVGs
  function notifIcon(type: string) {
    if (type.startsWith('callback.')) {
      return (
        <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      );
    }
    if (type.startsWith('message.') || type === 'chat_message') {
      return (
        <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      );
    }
    if (type.startsWith('document.')) {
      return (
        <svg className="w-4 h-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    }
    // Default: bell for notifications
    return (
      <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    );
  }

  return (
    <header className="h-14 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
      {/* Left: page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="hidden sm:block text-sm font-bold text-text-primary tracking-tight">TrustInbox</span>
        </div>
        <span className="text-border-primary hidden sm:block">|</span>
        <h1 className="text-sm font-semibold text-text-secondary truncate hidden sm:block">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Center: search trigger */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 bg-bg-tertiary border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-muted hover:border-accent-blue/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="flex-1 text-left">Search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg-elevated border border-border-secondary rounded-xl shadow-elevated z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
                <span className="text-sm font-semibold text-text-primary">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={() => markAllRead()} className="text-xs text-accent-blue hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">No notifications</div>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-border-primary last:border-0 hover:bg-bg-tertiary transition-colors ${!n.read ? 'bg-accent-blue/5' : ''} ${'suppressed' in n && n.suppressed ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-text-primary leading-snug truncate">{n.title}</p>
                            <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
                              {n.createdAt ? timeAgo(n.createdAt) : ''}
                            </span>
                          </div>
                          {n.body && <p className="text-xs text-text-muted mt-0.5 truncate">{n.body}</p>}
                          {'suppressed' in n && n.suppressed && (
                            <p className="text-[10px] text-text-muted mt-0.5 italic">Delivered during DND</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border-primary">
                <Link href="/inbox" onClick={() => setNotifOpen(false)} className="text-xs text-accent-blue hover:underline">
                  View all in Inbox
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-bg-tertiary transition-colors"
            aria-label="Profile menu"
          >
            <div className="w-7 h-7 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-accent-blue text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-semibold text-text-primary leading-none truncate max-w-[100px]">
                {user?.fullName ?? user?.username ?? 'User'}
              </p>
              <p className="text-[10px] text-text-muted leading-none mt-0.5">member</p>
            </div>
            <svg className="hidden sm:block w-3 h-3 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-bg-elevated border border-border-secondary rounded-xl shadow-elevated z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-primary">
                <p className="text-sm font-semibold text-text-primary truncate">{user?.fullName ?? user?.username}</p>
                <p className="text-xs text-text-muted truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                <div className="border-t border-border-primary my-1" />
                <div className="px-4 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">Theme</p>
                  <div className="flex gap-1">
                    {([['dark', '🌙'], ['light', '☀️'], ['system', '💻']] as [Theme, string][]).map(([t, icon]) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex-1 text-xs py-1 rounded-md transition-colors capitalize ${
                          theme === t
                            ? 'bg-accent-blue/20 text-accent-blue font-medium'
                            : 'text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      >
                        {icon} {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border-primary my-1" />
                <button
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-accent-red hover:bg-bg-tertiary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
