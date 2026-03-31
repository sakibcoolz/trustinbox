'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Bot, Megaphone, Webhook, BarChart3, Settings,
  Bell, MessageSquare, PhoneCall, FileText, Shield, Plug, ChevronDown, Check,
} from 'lucide-react';
import { auth } from '@/lib/api';

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

const bottomNav = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook },
  { label: 'Compliance', href: '/compliance', icon: Shield },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// Role-based nav visibility: keys that require SP_ADMIN
const adminOnlyPaths = ['/webhooks', '/integrations'];

export default function SidebarWrapper() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeSP, setActiveSP] = useState<SPInfo | null>(null);
  const [spList, setSPList] = useState<SPInfo[]>([]);
  const [spOpen, setSPOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const me = await auth.me();
        setUser(me);
        // Load SP list from localStorage or API
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
        // Not logged in — sidebar will show defaults
      }
    }
    load();
  }, []);

  // Close dropdown on outside click
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

  const isAdmin = user?.role === 'SP_ADMIN' || user?.role === 'PLATFORM_ADMIN';

  function filterNav(items: typeof mainNav) {
    return items.filter((item) => {
      if (adminOnlyPaths.includes(item.href) && !isAdmin) return false;
      return true;
    });
  }

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border-primary flex flex-col shrink-0">
      <div className="p-4 border-b border-border-primary">
        <h1 className="text-lg font-semibold text-accent-blue">TrustInbox</h1>
        <p className="text-xs text-text-muted mt-0.5">Provider Portal</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Main</p>
        {filterNav(mainNav).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-bg-hover text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}>
              <Icon size={16} className={active ? 'text-accent-blue shrink-0' : 'text-text-muted shrink-0'} />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Platform</p>
        {filterNav(bottomNav).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-bg-hover text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}>
              <Icon size={16} className={active ? 'text-accent-blue shrink-0' : 'text-text-muted shrink-0'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* SP Switcher */}
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
            <ChevronDown size={14} className={`text-text-muted transition-transform ${spOpen ? 'rotate-180' : ''}`} />
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
    </aside>
  );
}
