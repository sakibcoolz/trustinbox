'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Bot, Megaphone, Webhook, BarChart3, Settings,
  Bell, MessageSquare, PhoneCall, FileText, Shield, Plug,
  BookOpen, Image, UserCog, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, type Permission, type Role } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { ServiceProviderSwitcher } from '@/components/ServiceProviderSwitcher';

// ─── Nav Items with Permission Requirements ─────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  requiredPermission?: Permission;
  badge?: () => number | null;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users, requiredPermission: 'customers:view' },
  { label: 'Notifications', href: '/notifications', icon: Bell, requiredPermission: 'notifications:view' },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare, requiredPermission: 'conversations:view' },
  { label: 'Callbacks', href: '/callbacks', icon: PhoneCall, requiredPermission: 'callbacks:view' },
  { label: 'Documents', href: '/documents', icon: FileText, requiredPermission: 'documents:view' },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone, requiredPermission: 'campaigns:view' },
  { label: 'Bots', href: '/bots', icon: Bot, requiredPermission: 'bots:view' },
];

const cmsNav: NavItem[] = [
  { label: 'Content', href: '/cms', icon: BookOpen },
  { label: 'Media Library', href: '/cms/media', icon: Image },
  { label: 'CMS Roles', href: '/cms/roles', icon: UserCog },
];

const bottomNav: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3, requiredPermission: 'analytics:view' },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook, requiredPermission: 'webhooks:view' },
  { label: 'Compliance', href: '/compliance', icon: Shield, requiredPermission: 'compliance:view' },
  { label: 'Integrations', href: '/integrations', icon: Plug, requiredPermission: 'integrations:view' },
  { label: 'Settings', href: '/settings', icon: Settings, requiredPermission: 'settings:view' },
];

export default function SidebarWrapper() {
  const pathname = usePathname();
  const { user, role, serviceProviders, activeServiceProvider, switchServiceProvider } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  function filterNav(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      if (!item.requiredPermission) return true; // always visible (e.g. Dashboard)
      if (!role) return false;
      return hasPermission(role as Role, item.requiredPermission);
    });
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function NavItemComponent({ item }: { item: NavItem }) {
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

  // Convert activeServiceProvider to the membership shape for the switcher
  const currentSP = activeServiceProvider
    ? { ...activeServiceProvider, role: role || '', industry: activeServiceProvider.industry }
    : null;

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
        {filterNav(mainNav).map((item) => <NavItemComponent key={item.href} item={item} />)}

        {!collapsed && <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Content</p>}
        {collapsed && <div className="h-3" />}
        {cmsNav.map((item) => <NavItemComponent key={item.href} item={item} />)}

        {!collapsed && <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Platform</p>}
        {collapsed && <div className="h-3" />}
        {filterNav(bottomNav).map((item) => <NavItemComponent key={item.href} item={item} />)}
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
      <ServiceProviderSwitcher
        current={currentSP}
        providers={serviceProviders}
        onSwitch={switchServiceProvider}
        collapsed={collapsed}
      />
    </aside>
  );
}
