'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// --- Types ---
interface Tab {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  defaultTab?: string;
  onTabChange?: (key: string) => void;
  syncUrl?: boolean;
  children: React.ReactNode;
}

interface TabPanelProps {
  tabKey: string;
  children: React.ReactNode;
}

// --- Components ---
export function Tabs({ tabs, activeTab: controlled, defaultTab, onTabChange, syncUrl, children }: TabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlTab = syncUrl ? searchParams.get('tab') : null;
  const [internal, setInternal] = useState(urlTab || defaultTab || tabs[0]?.key);
  const active = controlled ?? internal;
  const [mounted, setMounted] = useState<Set<string>>(new Set([active]));

  function switchTab(key: string) {
    const tab = tabs.find((t) => t.key === key);
    if (tab?.disabled) return;

    setInternal(key);
    setMounted((prev) => new Set(prev).add(key));
    onTabChange?.(key);

    if (syncUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }

  // Map children to find TabPanels
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div>
      {/* Tab row */}
      <div className="flex items-center gap-0 border-b border-border-primary overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => switchTab(tab.key)}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary',
                tab.disabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-status-error/10 text-status-error">
                  {tab.badge}
                </span>
              )}
              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div>
        {childArray.map((child) => {
          if (!child || typeof child !== 'object' || !('props' in child)) return null;
          const panelKey = (child.props as { tabKey?: string }).tabKey;
          if (!panelKey) return child;

          const isActive = active === panelKey;
          const isMounted = mounted.has(panelKey);

          if (!isMounted) return null;

          return (
            <div
              key={panelKey}
              role="tabpanel"
              className={cn(isActive ? 'animate-fade-in' : 'hidden')}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TabPanel({ children }: TabPanelProps) {
  return <>{children}</>;
}
