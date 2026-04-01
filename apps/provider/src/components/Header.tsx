'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Search, Settings, LogOut, ChevronDown, UserCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumb } from '@/components/Breadcrumb';
import ConnectionStatus from '@/components/ConnectionStatus';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, type Role } from '@/lib/roles';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/notifications': 'Notifications',
  '/notifications/compose': 'Compose Notification',
  '/conversations': 'Conversations',
  '/callbacks': 'Callbacks',
  '/documents': 'Documents',
  '/campaigns': 'Campaigns',
  '/bots': 'Bots',
  '/cms': 'Content Management',
  '/cms/editor': 'Content Editor',
  '/cms/media': 'Media Library',
  '/cms/roles': 'CMS Roles',
  '/analytics': 'Analytics',
  '/webhooks': 'Webhooks',
  '/compliance': 'Compliance',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
  '/settings/profile': 'Profile Settings',
  '/settings/team': 'Team Settings',
  '/settings/industry': 'Industry Settings',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== '/') return title;
  }
  return 'Provider Portal';
}

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleLogout() {
    logout();
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SP';

  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <header className="h-14 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-6 shrink-0">
        {/* Left: Page title + breadcrumbs */}
        <div className="flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-text-primary">{pageTitle}</h2>
          <Breadcrumb />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors text-xs border border-border-primary"
            title="Search (Ctrl+K)"
          >
            <Search size={14} />
            <span className="hidden md:inline text-text-muted">Search…</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] text-text-muted font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Notifications bell */}
          <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative" title="Notifications">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full"></span>
          </button>

          {/* Connection status indicator */}
          <ConnectionStatus />

          {/* Divider */}
          <div className="w-px h-6 bg-border-primary mx-1"></div>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">
                {initials}
              </div>
              {user && (
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-text-primary leading-none">{user.fullName}</p>
                  <p className="text-[10px] text-text-muted leading-none mt-0.5">{ROLE_LABELS[user.role as Role] || user.role?.replace('_', ' ')}</p>
                </div>
              )}
              <ChevronDown size={12} className={cn('text-text-muted transition-transform', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-bg-card border border-border-primary rounded-xl shadow-2xl py-1 z-50">
                {user && (
                  <div className="px-4 py-3 border-b border-border-primary">
                    <p className="text-sm font-medium text-text-primary truncate">{user.fullName}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-accent-purple/10 text-accent-purple">
                      {user.role}
                    </span>
                  </div>
                )}

                <div className="py-1">
                  <Link href="/settings/profile" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
                    <UserCircle size={14} className="text-text-muted" />
                    My Profile
                  </Link>
                  <Link href="/settings" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
                    <Settings size={14} className="text-text-muted" />
                    Settings
                  </Link>
                </div>

                <div className="border-t border-border-primary py-1">
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-status-error hover:bg-status-error/5 transition-colors">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

// --- Search Modal (Cmd+K Palette) ---
function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-bg-card border border-border-primary rounded-xl shadow-2xl animate-modal-in overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, notifications, campaigns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-bg-hover border border-border-secondary text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="px-4 py-6 text-center">
          {query ? (
            <p className="text-sm text-text-muted">Search results will appear here</p>
          ) : (
            <p className="text-sm text-text-muted">Type to search across all resources</p>
          )}
        </div>
      </div>
    </div>
  );
}
