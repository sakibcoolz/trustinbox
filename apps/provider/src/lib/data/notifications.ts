import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchNotifications(opts?: {
  category?: string; status?: string; channel?: string; search?: string;
  from?: string; to?: string; limit?: number; offset?: number;
}) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/notifications${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.notifications ?? d;
}

export async function fetchNotificationDetail(id: string) {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/notifications/${encodeURIComponent(id)}`);
    return transformKeys(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchNotificationStats(from?: string, to?: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/analytics/notifications${qs({ from, to })}`);
  return transformKeys(data) as Record<string, unknown>;
}
