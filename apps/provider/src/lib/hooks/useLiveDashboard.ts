'use client';

import { useCallback, useState } from 'react';
import { useSSE, SSEEvent } from './useSSE';

interface DashboardUpdate {
  notificationsDelivered?: number;
  callbacksPending?: number;
  activeCampaigns?: number;
  unreadMessages?: number;
}

/**
 * Provides real-time dashboard counter updates via SSE.
 */
export function useLiveDashboard(skip = false) {
  const [latest, setLatest] = useState<DashboardUpdate | null>(null);

  const onEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'dashboard_update') {
      setLatest(event.data as DashboardUpdate);
    }
  }, []);

  const { status, reconnect } = useSSE(onEvent, { skip });

  return { latest, status, reconnect };
}
