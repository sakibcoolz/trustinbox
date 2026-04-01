'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Search, User, Settings, LogOut, ChevronDown, UserCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  // Match dynamic routes
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== '/') return title;
  }
  return 'Provider Portal';
}

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
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

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeSpId');
    localStorage.removeItem('userSPs');
    window.location.href = '/auth/login';
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SP';

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-14 bg-bg-secondary border-b border-border-primary flex items-center justify-between px-6 shrink-0">
      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{pageTitle}</h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors" title="Search">
          <Search size={16} />
        </button>

        {/* Notifications bell */}
        <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative" title="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-error rounded-full"></span>
        </button>

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
                <p className="text-[10px] text-text-muted leading-none mt-0.5">{user.role?.replace('_', ' ')}</p>
              </div>
            )}
            <ChevronDown size={12} className={`text-text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-bg-card border border-border-primary rounded-xl shadow-2xl py-1 z-50">
              {/* User info header */}
              {user && (
                <div className="px-4 py-3 border-b border-border-primary">
                  <p className="text-sm font-medium text-text-primary truncate">{user.fullName}</p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-accent-purple/10 text-accent-purple">
                    {user.role}
                  </span>
                </div>
              )}

              {/* Menu items */}
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

              {/* Logout */}
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
  );
}
