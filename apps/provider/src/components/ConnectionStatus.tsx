'use client';

import { useEffect, useState } from 'react';
import { onWsStateChange, type WsConnectionState } from '@/lib/apollo-provider';

const STATE_CONFIG: Record<WsConnectionState, { color: string; pulse: boolean; label: string; tooltip: string }> = {
  connected: {
    color: 'bg-status-success',
    pulse: false,
    label: 'Live',
    tooltip: 'WebSocket connected — receiving real-time updates',
  },
  reconnecting: {
    color: 'bg-status-warning',
    pulse: true,
    label: 'Reconnecting…',
    tooltip: 'Reconnecting to server — updates may be delayed',
  },
  disconnected: {
    color: 'bg-status-error',
    pulse: false,
    label: 'Offline',
    tooltip: 'Disconnected — using polling fallback',
  },
};

export default function ConnectionStatus() {
  const [state, setState] = useState<WsConnectionState>('disconnected');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    return onWsStateChange(setState);
  }, []);

  const config = STATE_CONFIG[state];

  return (
    <div
      className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      <span className="text-[10px] text-text-muted font-medium hidden md:inline">{config.label}</span>

      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-bg-card border border-border-primary rounded-lg shadow-xl text-xs text-text-secondary whitespace-nowrap z-50">
          {config.tooltip}
        </div>
      )}
    </div>
  );
}
