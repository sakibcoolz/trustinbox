import { serverFetch, transformKeys } from '@/lib/server-fetch';

// ─── Analytics ──────────────────────────────────────────

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchAnalyticsOverview(from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/dashboard${qs({ from, to })}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchDailyAnalytics(from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/daily${qs({ from, to })}`);
  return (transformKeys(data) as Record<string, unknown[]>).entries ?? [];
}

export async function fetchNotificationAnalytics(from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/notifications${qs({ from, to })}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchCallbackAnalytics(from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/callbacks${qs({ from, to })}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchBotPerformanceAnalytics(botId: string, from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/bots${qs({ botId, from, to })}`);
  return transformKeys(data) as Record<string, unknown>;
}
