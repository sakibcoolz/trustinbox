'use client';

import { useEffect, useState } from 'react';

interface ExpiryIndicatorProps {
  requestedAt: string;
}

export default function ExpiryIndicator({ requestedAt }: ExpiryIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = new Date(requestedAt).getTime() + 48 * 60 * 60 * 1000;
  const remaining = expiresAt - now;
  const totalMs = 48 * 60 * 60 * 1000;
  const progress = Math.max(0, Math.min(100, (remaining / totalMs) * 100));

  if (remaining <= 0) {
    return <span className="text-xs text-text-muted">Expired</span>;
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  const color = hours > 24 ? 'bg-status-success' : hours > 12 ? 'bg-status-warning' : 'bg-status-error';
  const pulse = hours < 1 ? 'animate-pulse' : '';
  const label = hours < 1 ? `${minutes}m left` : `${hours}h left`;
  const textColor = hours > 24 ? 'text-status-success' : hours > 12 ? 'text-status-warning' : 'text-status-error';

  return (
    <div className="flex items-center gap-2" title={`Expires: ${new Date(expiresAt).toLocaleString()}`}>
      <div className="w-16 h-1.5 bg-border-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color} ${pulse}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor} ${pulse}`}>{label}</span>
    </div>
  );
}
