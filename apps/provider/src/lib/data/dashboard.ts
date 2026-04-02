import { serverFetch, transformKeys } from '@/lib/server-fetch';

// ─── Dashboard ──────────────────────────────────────────

export async function fetchDashboardAnalytics(dateRange?: { from: string; to: string }) {
  const params = new URLSearchParams();
  if (dateRange?.from) params.set('from', dateRange.from);
  if (dateRange?.to) params.set('to', dateRange.to);
  const q = params.toString() ? `?${params}` : '';
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/dashboard${q}`);
  return transformKeys(data) as Record<string, unknown>;
}
