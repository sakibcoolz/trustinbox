import { serverFetch, transformKeys } from '@/lib/server-fetch';

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchConversations(opts?: {
  status?: string; search?: string; unreadOnly?: boolean; limit?: number; offset?: number;
}) {
  const data = await serverFetch<unknown>(`/api/conversations${qs(opts ?? {})}`);
  if (Array.isArray(data)) return transformKeys(data);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.conversations ?? d;
}

export async function fetchConversation(id: string) {
  const data = await serverFetch<Record<string, unknown>>(`/api/conversations/${encodeURIComponent(id)}`);
  return transformKeys(data) as Record<string, unknown>;
}

export async function fetchConversationMessages(id: string, opts?: { limit?: number; offset?: number }) {
  const data = await serverFetch<unknown>(`/api/conversations/${encodeURIComponent(id)}/messages${qs(opts ?? {})}`);
  if (Array.isArray(data)) return transformKeys(data);
  const d = transformKeys(data) as Record<string, unknown>;
  return d.messages ?? d;
}

export async function fetchConversationStats() {
  try {
    const data = await serverFetch<Record<string, unknown>>('/api/v1/analytics/dashboard');
    const d = transformKeys(data) as Record<string, unknown>;
    return {
      totalActive: d.activeConversations ?? 0,
      totalMessages: (Number(d.messagesSent ?? 0)) + (Number(d.messagesReceived ?? 0)),
    };
  } catch {
    return { totalActive: 0, totalMessages: 0 };
  }
}
