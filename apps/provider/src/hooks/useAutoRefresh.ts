'use client';

import { useState, useEffect, useCallback } from 'react';

export function useAutoRefresh(refetch: () => void, interval = 30_000) {
  const [enabled, setEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const stableRefetch = useCallback(refetch, [refetch]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      stableRefetch();
      setLastUpdated(new Date());
    }, interval);
    return () => clearInterval(timer);
  }, [enabled, stableRefetch, interval]);

  // Pause when tab is hidden
  useEffect(() => {
    if (!enabled) return;
    function onVisibility() {
      if (document.hidden) return;
      stableRefetch();
      setLastUpdated(new Date());
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, stableRefetch]);

  return { enabled, setEnabled, lastUpdated };
}
