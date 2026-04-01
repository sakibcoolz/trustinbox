'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceProviderMembership } from '@/lib/graphql/types';

interface ServiceProviderSwitcherProps {
  current: ServiceProviderMembership | null;
  providers: ServiceProviderMembership[];
  onSwitch: (spId: string) => void;
  collapsed?: boolean;
}

export function ServiceProviderSwitcher({
  current,
  providers,
  onSwitch,
  collapsed = false,
}: ServiceProviderSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (collapsed) {
    return (
      <div className="p-2 flex justify-center" title={current?.name || 'Organization'}>
        <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold">
          {current?.name?.charAt(0) || 'SP'}
        </div>
      </div>
    );
  }

  if (providers.length <= 1) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">
            {current?.name?.charAt(0) || 'SP'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">{current?.name || 'Provider'}</p>
            <p className="text-xs text-text-muted truncate">{current?.industry || ''}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border-primary relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 text-left hover:bg-bg-hover rounded-lg p-1 -m-1 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold shrink-0">
          {current?.name?.charAt(0) || 'SP'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">{current?.name || 'Provider'}</p>
          <p className="text-xs text-text-muted truncate">{current?.industry || ''}</p>
        </div>
        <ChevronDown
          size={14}
          className={cn('text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-bg-card border border-border-primary rounded-lg shadow-xl py-1 z-50">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Switch Organization
          </p>
          {providers.map((sp) => (
            <button
              key={sp.id}
              onClick={() => {
                onSwitch(sp.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-bg-hover transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple text-[10px] font-semibold">
                {sp.name.charAt(0)}
              </div>
              <span className="flex-1 truncate text-text-secondary">{sp.name}</span>
              {sp.id === current?.id && (
                <Check size={14} className="text-accent-blue shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
