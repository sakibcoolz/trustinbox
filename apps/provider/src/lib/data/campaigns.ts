import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchCampaigns(opts?: { status?: string; limit?: number; offset?: number }) {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/campaigns${qs(opts ?? {})}`);
    const d = transformKeys(data) as Record<string, unknown>;
    return d.campaigns ?? d;
  } catch {
    return [];
  }
}

export async function fetchCampaign(id: string) {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/campaigns/${encodeURIComponent(id)}`);
    return transformKeys(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchCampaignAnalytics(campaignId: string, from?: string, to?: string) {
  try {
    const data = await serverFetch<Record<string, unknown>>(
      `/api/v1/campaigns/${encodeURIComponent(campaignId)}/analytics${qs({ from, to })}`,
    );
    return transformKeys(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchCampaignTargets(_campaignId: string, _opts?: { status?: string; limit?: number; offset?: number }) {
  return [];
}
