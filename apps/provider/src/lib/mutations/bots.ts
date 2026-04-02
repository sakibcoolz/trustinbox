'use client';

import { useCallback } from 'react';
import { useMutation, post, put, del } from './base';

export function useCreateBot() {
  return useMutation(useCallback((input: unknown) => post('/api/bots', input), []));
}

export function useUpdateBot() {
  return useMutation(useCallback(
    (id: unknown, input: unknown) => put(`/api/bots/${id}`, input), [],
  ));
}

export function useDeleteBot() {
  return useMutation(useCallback((id: unknown) => del(`/api/bots/${id}`), []));
}

export function useUpdateBotConfiguration() {
  return useMutation(useCallback(
    (botId: unknown, input: unknown) => put(`/api/bots/${botId}/config`, input), [],
  ));
}

export function useSetBotPermission() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/bots/permissions', input), [],
  ));
}

export function useAddKnowledgeSource() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/bots/knowledge', input), [],
  ));
}

export function useRemoveKnowledgeSource() {
  return useMutation(useCallback(
    (id: unknown) => del(`/api/bots/knowledge/${id}`), [],
  ));
}

export function useExecuteBotAction() {
  return useMutation(useCallback(
    (botId: unknown, input: unknown) => post(`/api/bots/${botId}/actions`, input), [],
  ));
}
