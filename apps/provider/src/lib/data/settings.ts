import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchTeamMembers(opts?: { limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(`/api/team/members${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.items ?? d;
}

export async function fetchPendingInvitations(opts?: { limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(`/api/team/invitations${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.items ?? d;
}

export async function fetchOrganizationProfile() {
  const data = await serverFetch<Record<string, unknown>>('/api/profile');
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchIndustryProfiles(_opts?: { activeOnly?: boolean; limit?: number; offset?: number }) {
  return [];
}

export async function fetchIndustryProfile(_industryKey: string) {
  return null;
}

export async function fetchTeamActivity(_opts?: { limit?: number; offset?: number }) {
  return [];
}
