'use client';

import { useCallback } from 'react';
import { useMutation, post, put, del } from './base';

// ─── Bots ────────────────────────────────────────────────
// Backed by gateway REST: /api/v1/bots (see gateway/graphql-bff/cmd/server/provider_api.go).

export interface CreateBotInput {
  name: string;
  purpose: string;
  description?: string;
  department?: string;
  avatarUrl?: string;
  industryProfileId?: string;
}

export function useCreateBot() {
  return useMutation(useCallback((input: unknown) => post('/api/gateway/v1/bots', input), []));
}

export function useUpdateBot() {
  return useMutation(useCallback(
    (args: unknown) => {
      const { id, ...rest } = args as { id: string; [k: string]: unknown };
      return put(`/api/gateway/v1/bots/${encodeURIComponent(id)}`, rest);
    },
    [],
  ));
}

export function useDeleteBot() {
  return useMutation(useCallback(
    (id: unknown) => del(`/api/gateway/v1/bots/${encodeURIComponent(String(id))}`),
    [],
  ));
}

export function useToggleBotStatus() {
  return useMutation(useCallback(
    (args: unknown) => {
      const { id, status } = args as { id: string; status: string };
      return put(`/api/gateway/v1/bots/${encodeURIComponent(id)}`, { status });
    },
    [],
  ));
}

// ─── Knowledge ───────────────────────────────────────────

export function useUploadKnowledgeSource() {
  return useMutation(useCallback(async (args: unknown) => {
    const { botId, file } = args as { botId: string; file: File };
    const fd = new FormData();
    fd.append('file', file);
    fd.append('botId', botId);
    const res = await fetch('/api/gateway/v1/ai/knowledge/upload', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  }, []));
}

export function useDeleteKnowledgeSource() {
  return useMutation(useCallback(
    (id: unknown) => del(`/api/gateway/v1/ai/knowledge/${encodeURIComponent(String(id))}`),
    [],
  ));
}

export function useReindexKnowledgeSource() {
  return useMutation(useCallback(
    (id: unknown) => post(`/api/gateway/v1/ai/knowledge/${encodeURIComponent(String(id))}/reindex`),
    [],
  ));
}

// ─── Conversation insights ───────────────────────────────

export function useRefreshConversationSummary() {
  return useMutation(useCallback(
    (conversationId: unknown) =>
      post(`/api/gateway/v1/ai/conversations/${encodeURIComponent(String(conversationId))}/insights/refresh`),
    [],
  ));
}
