import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchCustomers(opts?: { search?: string; category?: string; status?: string; first?: number; after?: string }) {
  const data = await serverFetch<unknown>(`/api/conversations${qs(opts ?? {})}`);
  return transformKeys(Array.isArray(data) ? data : []);
}

export async function fetchCustomerDetail(_virtualId: string) {
  return { notifications: [], callbackRequests: [] };
}

export async function fetchCustomerTimeline(_virtualId: string, _opts?: { limit?: number; offset?: number }) {
  return [];
}

export async function fetchCustomerNotes(_virtualId: string) {
  return [];
}

export async function fetchCustomerTags(_virtualId: string) {
  return [];
}
