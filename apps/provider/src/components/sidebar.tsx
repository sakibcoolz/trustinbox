'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Bot, Megaphone, Webhook, BarChart3, Settings,
  Bell, MessageSquare, PhoneCall, FileText, Shield, Plug, ChevronDown, Check,
  BookOpen, Image, UserCog, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { auth } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SPInfo { id: string; name: string; industry?: string }
interface UserInfo { id: string; fullName: string; email: string; username: string; role: string }

const mainNav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Callbacks', href: '/callbacks', icon: PhoneCall },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Bots', href: '/bots', icon: Bot },
];

const cmsNav = [
  { label: 'Content', href: '/cms', icon: BookOpen },
  { label: 'Media Library', href: '/cms/media', icon: Image },
  { label: 'CMS Roles', href: '/cms/roles', icon: UserCog },
];

const bottomNav = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook, adminOnly: true },
  { label: 'Compliance', href: '/compliance', icon: Shield },
  { label: 'Integrations', href: '/integrations', icon: Plug, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Role-based visibility
const ROLE_NAV: Record<string, string[]> = {
  ANALYST: ['/', '/analytics', '/compliance'],
  AGENT: ['/', '/customers', '/conversations', '/callbacks', '/documents'],
  CONTENT_MANAGER: ['/', '/customers', '/notifications', '/conversations', '/callbacks', '/documents', '/campaigns', '/bots', '/cms', '/cms/media', '/cms/roles', '/analytics', '/settings'],
};

export default function SidebarWrapper() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeSP, setActiveSP] = useState<SPInfo | null>(null);
  const [spList, setSPList] = useState<SPInfo[]>([]);
  const [spOpen, setSPOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const me = await auth.me();
        setUser(me);
        const storedSPs = localStorage.getItem('userSPs');
        if (storedSPs) {
          const parsed: SPInfo[] = JSON.parse(storedSPs);
          setSPList(parsed);
          const activeId = localStorage.getItem('activeSpId');
          const active = parsed.find((sp) => sp.id === activeId) || parsed[0];
          if (active) {
            setActiveSP(active);
            localStorage.setItem('activeSpId', active.id);
          }
        }
      } catch {
        // Not logged in
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSPOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchSP(sp: SPInfo) {
    setActiveSP(sp);
    localStorage.setItem('activeSpId', sp.id);
    setSPOpen(false);
    window.location.reload();
  }

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  const isAdmin = user?.role === 'SP_ADMIN' || user?.role === 'PLATFORM_ADMIN';
  const roleAllowed = user?.role && ROLE_NAV[user.role];

  function filterNav(items: typeof mainNav | typeof bottomNav) {
    return items.filter((item) => {
      if ('adminOnly' in item && item.adminOnly && !isAdmin) return false;
      if (roleAllowed && !roleAllowed.includes(item.href)) return false;
      return true;
    });
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function NavItem({ item }: { item: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> } }) {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative',
          active
            ? 'bg-bg-hover text-text-primary font-medium border-l-2 border-accent-blue -ml-px'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
          collapsed && 'justify-center px-2',
        )}
      >
        <Icon size={16} className={cn(active ? 'text-accent-blue shrink-0' : 'text-text-muted shrink-0')} />
        {!collapsed && item.label}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        'bg-bg-secondary border-r border-border-primary flex flex-col shrink-0 transition-all duration-200 ease-in-out hidden lg:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className={cn('p-4 border-b border-border-primary', collapsed && 'px-2 text-center')}>
        <h1 className={cn('text-lg font-semibold text-accent-blue', collapsed && 'text-sm')}>
          {collapsed ? 'TI' : 'TrustInbox'}
        </h1>
        {!collapsed && <p className="text-xs text-text-muted mt-0.5">Provider Portal</p>}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {!collapsed && <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Main</p>}
        {filterNav(mainNav).map((item) => <NavItem key={item.href} item={item} />)}

        {!collapsed && <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Content</p>}
        {collapsed && <div className="h-3" />}
        {cmsNav.map((item) => <NavItem key={item.href} item={item} />)}

        {!collapsed && <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Platform</p>}
        {collapsed && <div className="h-3" />}
        {filterNav(bottomNav).map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-2 border-t border-border-primary">
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors text-xs"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span>Collapse</span></>}
        </button>
      </div>

      {/* SP Switcher */}
      {!collapsed && (
        <div className="p-4 border-t border-border-primary relative" ref={dropdownRef}>
          <button onClick={() => spList.length > 1 && setSPOpen(!spOpen)}
            className="w-full flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">
              {activeSP?.name?.charAt(0) || user?.fullName?.charAt(0) || 'SP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{activeSP?.name || user?.fullName || 'Provider'}</p>
              <p className="text-xs text-text-muted truncate">
                {user?.username || activeSP?.industry || ''}
              </p>
            </div>
            {spList.length > 1 && (
              <ChevronDown size={14} className={cn('text-text-muted transition-transform', spOpen && 'rotate-180')} />
            )}
          </button>

          {spOpen && spList.length > 1 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-bg-card border border-border-primary rounded-lg shadow-xl py-1 z-50">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Switch Organization</p>
              {spList.map((sp) => (
                <button key={sp.id} onClick={() => switchSP(sp)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover transition-colors">
                  <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple text-[10px] font-semibold">
                    {sp.name.charAt(0)}
                  </div>
                  <span className="flex-1 truncate text-text-secondary">{sp.name}</span>
                  {sp.id === activeSP?.id && <Check size={14} className="text-accent-blue shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
