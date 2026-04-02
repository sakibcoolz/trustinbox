'use client';

import { useCallback, useState } from 'react';
import { useSSE, SSEEvent } from './useSSE';

interface LiveNotification {
  id: string;
  status: string;
  recipientVirtualId: string;
  deliveredAt?: string;
  title: string;
}

/**
 * Provides real-time notification delivery updates via SSE.
 * Returns the latest notification event received.
 */
export function useLiveNotifications(skip = false) {
  const [latest, setLatest] = useState<LiveNotification | null>(null);

  const onEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'notification_delivered' || event.type === 'notification_failed') {
      setLatest(event.data as LiveNotification);
    }
  }, []);

  const { status, reconnect } = useSSE(onEvent, { skip });

  return { latest, status, reconnect };
}
