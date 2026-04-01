'use client';

import Link from 'next/link';
import { Bell, Megaphone, Bot, PhoneCall, FileText, BarChart3 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/lib/roles';

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  permission: Permission;
  primary?: boolean;
}

const ACTIONS: QuickAction[] = [
  { label: 'Send Notification', icon: Bell, href: '/notifications/compose', permission: 'notifications:send', primary: true },
  { label: 'Create Campaign', icon: Megaphone, href: '/campaigns/new', permission: 'campaigns:create' },
  { label: 'Create Bot', icon: Bot, href: '/bots/new', permission: 'bots:create' },
  { label: 'Request Callback', icon: PhoneCall, href: '/callbacks/new', permission: 'callbacks:manage' },
  { label: 'Upload Document', icon: FileText, href: '/documents/upload', permission: 'documents:upload' },
  { label: 'View Reports', icon: BarChart3, href: '/analytics', permission: 'analytics:view' },
];

function QuickActionButton({ label, icon: Icon, href, permission, primary }: QuickAction) {
  const allowed = usePermission(permission);
  if (!allowed) return null;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
        primary
          ? 'border-accent-blue text-accent-blue hover:bg-accent-blue/10'
          : 'border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary hover:bg-bg-hover'
      }`}
    >
      <Icon size={14} />
      {label}
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {ACTIONS.map((action) => (
        <QuickActionButton key={action.href} {...action} />
      ))}
    </div>
  );
}
