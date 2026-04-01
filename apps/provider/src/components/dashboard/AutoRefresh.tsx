'use client';

import { formatRelativeTime } from '@/lib/format';

interface AutoRefreshProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  lastUpdated: Date | null;
}

export function AutoRefresh({ enabled, onToggle, lastUpdated }: AutoRefreshProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onToggle(!enabled)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-bg-hover hover:bg-bg-active transition-colors"
      >
        <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-status-success animate-pulse' : 'bg-text-muted'}`} />
        <span className={enabled ? 'text-status-success' : 'text-text-muted'}>
          {enabled ? 'Live' : 'Paused'}
        </span>
      </button>
      {lastUpdated && (
        <span className="text-[10px] text-text-muted">{formatRelativeTime(lastUpdated.toISOString())}</span>
      )}
    </div>
  );
}
