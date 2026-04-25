'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Hooks into Next.js web vitals reporting to surface LCP/FID/CLS/FCP/TTFB/INP
 * for the given page. Logs to console in development; extend to send to an
 * analytics endpoint in production.
 */
export function usePerformanceMonitor(pageName: string): void {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[perf] ${pageName} ${metric.name}: ${Math.round(metric.value)}ms`);
    }
    // TODO: forward to analytics in production
    // e.g. analytics.track('web_vital', { page: pageName, ...metric });
  });
}
