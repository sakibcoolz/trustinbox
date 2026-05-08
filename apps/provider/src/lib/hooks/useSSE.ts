'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SSEEvent {
  type: string;
  data: unknown;
}

interface UseSSEOptions {
  /** Skip connecting */
  skip?: boolean;
  /** Max reconnection attempts (default: 10) */
  maxRetries?: number;
}

/**
 * Hook that manages an EventSource connection to /api/sse.
 * Calls onEvent for each SSE message. Reconnects with exponential backoff.
 */
export function useSSE(
  onEvent: (event: SSEEvent) => void,
  options?: UseSSEOptions,
) {
  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const maxRetries = options?.maxRetries ?? 10;

  const connect = useCallback(() => {
    if (options?.skip) return;

    esRef.current?.close();
    setStatus('connecting');

    const es = new EventSource('/api/sse');
    esRef.current = es;

    es.addEventListener('connected', () => {
      setStatus('connected');
      retriesRef.current = 0;
    });

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        onEventRef.current({ type: 'message', data });
      } catch {
        onEventRef.current({ type: 'message', data: evt.data });
      }
    };

    // Listen for typed events
    const eventTypes = [
      'notification_delivered',
      'notification_failed',
      'callback_created',
      'callback_updated',
      'campaign_progress',
      'message_received',
      'webhook_delivery',
      'dashboard_update',
      // AI Studio events
      'bot_action_executed',
      'agent_delegated',
      'knowledge_indexed',
      'conversation_summary_updated',
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          onEventRef.current({ type: eventType, data });
        } catch {
          onEventRef.current({ type: eventType, data: evt.data });
        }
      });
    }

    es.addEventListener('error', () => {
      setStatus('error');
      es.close();

      if (retriesRef.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 30000);
        retriesRef.current++;
        setTimeout(connect, delay);
      } else {
        setStatus('disconnected');
      }
    });
  }, [options?.skip, maxRetries]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    connect();
  }, [connect]);

  return { status, reconnect };
}
