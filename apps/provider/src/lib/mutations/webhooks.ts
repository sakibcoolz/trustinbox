'use client';

import { useCallback } from 'react';
import { useMutation, post, put, del } from './base';

export function useCreateWebhook() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/webhooks', input), [],
  ));
}

export function useUpdateWebhook() {
  return useMutation(useCallback(
    (id: unknown, input: unknown) => put(`/api/webhooks/${id}`, input), [],
  ));
}

export function useDeleteWebhook() {
  return useMutation(useCallback(
    (id: unknown) => del(`/api/webhooks/${id}`), [],
  ));
}

export function useTestWebhook() {
  return useMutation(useCallback(
    (id: unknown) => post(`/api/webhooks/${id}/test`), [],
  ));
}
