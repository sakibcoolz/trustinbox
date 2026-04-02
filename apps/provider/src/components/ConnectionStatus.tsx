'use client';

import { useState, useCallback } from 'react';
import { useSSE, type SSEStatus } from '@/lib/hooks/useSSE';

const STATE_CONFIG: Record<SSEStatus, { color: string; pulse: boolean; label: string; tooltip: string }> = {
  connected: {
    color: 'bg-status-success',
    pulse: false,
    label: 'Live',
    tooltip: 'SSE connected — receiving real-time updates',
  },
  connecting: {
    color: 'bg-status-warning',
    pulse: true,
    label: 'Connecting…',
    tooltip: 'Connecting to server — updates may be delayed',
  },
  disconnected: {
    color: 'bg-status-error',
    pulse: false,
    label: 'Offline',
    tooltip: 'Disconnected — click to reconnect',
  },
  error: {
    color: 'bg-status-error',
    pulse: false,
    label: 'Error',
    tooltip: 'Connection error — will retry automatically',
  },
};

export default function ConnectionStatus() {
  const [showTooltip, setShowTooltip] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = useCallback(() => {}, []);
  const { status } = useSSE(noop);

  const config = STATE_CONFIG[status];

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
