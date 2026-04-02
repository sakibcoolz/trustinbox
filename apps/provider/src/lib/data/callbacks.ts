import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchCallbackRequests(opts?: {
  status?: string; search?: string; agentId?: string;
  from?: string; to?: string; limit?: number; offset?: number;
}) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/callbacks${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.requests ?? d;
}

export async function fetchCallbackRequest(id: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/callbacks/${encodeURIComponent(id)}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchCallbackStats() {
  const data = await serverFetch<Record<string, unknown>>('/api/v1/analytics/callbacks');
  return transformKeys(data) as Record<string, unknown>;
}
