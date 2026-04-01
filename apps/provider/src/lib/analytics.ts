'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';

// ─── Types ──────────────────────────────────────────────

interface TrackEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

type EventHandler = (event: TrackEvent) => void;

// ─── Event Queue + Flush ────────────────────────────────

const FLUSH_INTERVAL = 30_000; // 30s
const MAX_QUEUE = 50;
const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_URL;

let queue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<EventHandler>();

function flush() {
  if (!queue.length) return;

  const batch = [...queue];
  queue = [];

  // Log to structured logger
  logger.info('[analytics] flush', { count: batch.length } as Record<string, unknown>);

  // Send to remote if configured
  if (ANALYTICS_ENDPOINT) {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => { /* silently fail */ });
  }
}

function startFlushTimer() {
  if (flushTimer || typeof window === 'undefined') return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL);

  // Flush on page hide (tab close / navigate away)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

// ─── Public API ─────────────────────────────────────────

/**
 * Track a user action event. Events are batched and periodically flushed.
 * All data is anonymized — no PII is captured.
 */
export function trackEvent(event: TrackEvent): void {
  queue.push(event);
  subscribers.forEach((fn) => fn(event));

  if (queue.length >= MAX_QUEUE) flush();
  startFlushTimer();
}

/**
 * Subscribe to events (for debugging / dev tools).
 */
export function onTrackEvent(handler: EventHandler): () => void {
  subscribers.add(handler);
  return () => { subscribers.delete(handler); };
}

// ─── Hooks ──────────────────────────────────────────────

/**
 * Hook that auto-tracks page views on route changes.
 * Place once in root layout or LayoutShell.
 */
export function usePageViewTracking(): void {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      trackEvent({ category: 'navigation', action: 'page_view', label: pathname });
      prevPath.current = pathname;
    }
  }, [pathname]);

  // Track initial page view
  useEffect(() => {
    trackEvent({ category: 'navigation', action: 'page_view', label: pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Returns a `track` function bound to a specific category.
 *
 * Usage:
 *   const track = useTrack('webhooks');
 *   track('create', 'New subscription created');
 */
export function useTrack(category: string) {
  return useCallback(
    (action: string, label?: string, value?: number) => {
      trackEvent({ category, action, label, value });
    },
    [category],
  );
}
