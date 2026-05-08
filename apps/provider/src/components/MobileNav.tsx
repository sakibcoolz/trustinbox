'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bell, MessageSquare, PhoneCall, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Alerts', href: '/notifications', icon: Bell },
  { label: 'Chat', href: '/conversations', icon: MessageSquare },
  { label: 'Calls', href: '/callbacks', icon: PhoneCall },
  { label: 'More', href: '#more', icon: MoreHorizontal },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border-primary flex items-center justify-around px-2 z-40 sm:hidden safe-area-pb">
        {tabs.map((tab) => {
          const isMore = tab.href === '#more';
          const active = !isMore && (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return isMore ? (
            <button
              key="more"
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-text-muted"
            >
              <Icon size={20} />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1',
                active ? 'text-accent-blue' : 'text-text-muted',
              )}
            >
              <Icon size={20} />
              {active && <span className="text-[10px] font-medium">{tab.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* More overlay */}
      {moreOpen && <MoreMenu onClose={() => setMoreOpen(false)} />}
    </>
  );
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-primary sm:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <h2 className="text-sm font-semibold text-text-primary">All Pages</h2>
        <button onClick={onClose} className="text-sm text-accent-blue">
          Close
        </button>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        {[
          { label: 'Dashboard', href: '/', icon: LayoutDashboard },
          { label: 'Customers', href: '/customers', icon: LayoutDashboard },
          { label: 'Notifications', href: '/notifications', icon: Bell },
          { label: 'Conversations', href: '/conversations', icon: MessageSquare },
          { label: 'Callbacks', href: '/callbacks', icon: PhoneCall },
          { label: 'Documents', href: '/documents', icon: LayoutDashboard },
          { label: 'Campaigns', href: '/campaigns', icon: LayoutDashboard },
          { label: 'Settings', href: '/settings', icon: LayoutDashboard },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-bg-card border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Icon size={20} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
