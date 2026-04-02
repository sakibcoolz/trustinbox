'use client';

import { useCallback, useState } from 'react';
import { useSSE, SSEEvent } from './useSSE';

interface LiveMessage {
  id: string;
  conversationId: string;
  senderType: string;
  senderName: string;
  content: string;
  messageType: string;
  readStatus: string;
  createdAt: string;
}

/**
 * Provides real-time message updates via SSE.
 * Optionally filter to a specific conversation.
 */
export function useLiveMessages(conversationId?: string, skip = false) {
  const [latest, setLatest] = useState<LiveMessage | null>(null);

  const onEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'message_received') {
      const msg = event.data as LiveMessage;
      if (!conversationId || msg.conversationId === conversationId) {
        setLatest(msg);
      }
    }
  }, [conversationId]);

  const { status, reconnect } = useSSE(onEvent, { skip });

  return { latest, status, reconnect };
}
