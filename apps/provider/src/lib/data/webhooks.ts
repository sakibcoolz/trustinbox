import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchWebhookSubscriptions(opts?: { status?: string; limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/webhooks${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.subscriptions ?? d;
}

export async function fetchWebhookSubscription(id: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/webhooks/${encodeURIComponent(id)}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchWebhookDeliveries(subscriptionId: string, opts?: { status?: string; limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(
    `/api/v1/webhooks/${encodeURIComponent(subscriptionId)}/deliveries${qs(opts ?? {})}`,
  );
  const d = transformKeys(data) as Record<string, unknown>;
  return d.deliveries ?? d;
}
