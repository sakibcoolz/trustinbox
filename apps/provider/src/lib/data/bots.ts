import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchBots(opts?: { status?: string; limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots${qs(opts ?? {})}`);
  return (transformKeys(data) as Record<string, unknown>).bots ?? transformKeys(data);
}

export async function fetchBot(id: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/${encodeURIComponent(id)}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchBotConfiguration(botId: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/${encodeURIComponent(botId)}/config`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchBotPermissions(_botId: string) {
  return [] as Record<string, unknown>[];
}

export async function fetchBotKnowledgeSources(_botId: string) {
  return [] as Record<string, unknown>[];
}

export async function fetchBotActionLogs(botId: string, opts?: { conversationId?: string; limit?: number; offset?: number }) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/${encodeURIComponent(botId)}/actions${qs(opts ?? {})}`);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.actions ?? d.actionLogs ?? [];
}

export async function fetchBotAnalytics(botId: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/${encodeURIComponent(botId)}/analytics`);
  return transformKeys(data) as Record<string, unknown>;
}
