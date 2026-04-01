'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// ─── Loading Fallback ───────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-bg-surface border border-border-primary rounded-xl animate-pulse" />
  );
}

function EditorSkeleton() {
  return (
    <div className="w-full h-96 bg-bg-surface border border-border-primary rounded-xl animate-pulse" />
  );
}

// ─── Lazy-Loaded Heavy Components ───────────────────────

/**
 * Recharts components — only loaded on pages that use charts.
 * Next.js dynamic() uses React.lazy + Suspense under the hood.
 */
export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart as ComponentType<Record<string, unknown>> })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart as ComponentType<Record<string, unknown>> })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart as ComponentType<Record<string, unknown>> })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart as ComponentType<Record<string, unknown>> })),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

// ─── Utility: dynamicLoad for any heavy page section ────

/**
 * Wraps next/dynamic with a standard loading skeleton.
 *
 * Usage:
 *   const HeavyComponent = dynamicLoad(() => import('./HeavyComponent'));
 */
export function dynamicLoad<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  skeleton: 'chart' | 'editor' = 'chart',
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => (skeleton === 'editor' ? <EditorSkeleton /> : <ChartSkeleton />),
  });
}
