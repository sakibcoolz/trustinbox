'use client';

import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

// ─── Web Vitals via PerformanceObserver ─────────────────

interface PerfMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function rate(name: string, value: number): PerfMetric['rating'] {
  const t = THRESHOLDS[name];
  if (!t) return 'good';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

/**
 * Installs a PerformanceObserver for paint, layout-shift, and navigation metrics.
 * Call once in root layout via `usePerformanceMonitor()`.
 */
export function usePerformanceMonitor(): void {
  const installed = useRef(false);

  useEffect(() => {
    if (installed.current || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    installed.current = true;

    function report(metric: PerfMetric) {
      logger.info(`[perf] ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
      } as Record<string, unknown>);
    }

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) report({ name: 'LCP', value: last.startTime, rating: rate('LCP', last.startTime) });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* unsupported */ }

    // FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            report({ name: 'FCP', value: entry.startTime, rating: rate('FCP', entry.startTime) });
          }
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch { /* unsupported */ }

    // CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as PerformanceEntry & { value: number }).value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report CLS on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          report({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) });
        }
      }, { once: true });
    } catch { /* unsupported */ }

    // Navigation timing (TTFB)
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const nav = entry as PerformanceNavigationTiming;
          const ttfb = nav.responseStart - nav.requestStart;
          if (ttfb > 0) report({ name: 'TTFB', value: ttfb, rating: rate('TTFB', ttfb) });
        }
      });
      navObserver.observe({ type: 'navigation', buffered: true });
    } catch { /* unsupported */ }
  }, []);
}

/**
 * Measure query latency in milliseconds.
 * Returns { start, end } functions.
 */
export function createTimer(label: string) {
  let t0 = 0;
  return {
    start() { t0 = performance.now(); },
    end() {
      const duration = performance.now() - t0;
      logger.info(`[perf] ${label}`, { durationMs: Math.round(duration), page: typeof window !== 'undefined' ? window.location.pathname : '' } as Record<string, unknown>);
      return duration;
    },
  };
}
