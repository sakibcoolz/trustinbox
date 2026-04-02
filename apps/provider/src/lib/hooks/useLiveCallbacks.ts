'use client';

import { useCallback, useState } from 'react';
import { useSSE, SSEEvent } from './useSSE';

interface LiveCallback {
  id: string;
  status: string;
  requestedAt: string;
  reason?: string;
}

/**
 * Provides real-time callback request updates via SSE.
 */
export function useLiveCallbacks(skip = false) {
  const [latest, setLatest] = useState<LiveCallback | null>(null);

  const onEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'callback_created' || event.type === 'callback_updated') {
      setLatest(event.data as LiveCallback);
    }
  }, []);

  const { status, reconnect } = useSSE(onEvent, { skip });

  return { latest, status, reconnect };
}
