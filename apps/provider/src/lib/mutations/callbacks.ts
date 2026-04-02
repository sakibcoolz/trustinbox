'use client';

import { useCallback } from 'react';
import { useMutation, post } from './base';

export function useApproveCallback() {
  return useMutation(useCallback(
    (id: unknown, input?: unknown) => post(`/api/callbacks/${id}/approve`, input), [],
  ));
}

export function useRejectCallback() {
  return useMutation(useCallback(
    (id: unknown, input?: unknown) => post(`/api/callbacks/${id}/reject`, input), [],
  ));
}

export function useCreateCallback() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/callbacks', input), [],
  ));
}

export function useCompleteCallback() {
  return useMutation(useCallback(
    (id: unknown, input?: unknown) => post(`/api/callbacks/${id}/complete`, input), [],
  ));
}

export function useAssignCallback() {
  return useMutation(useCallback(
    (id: unknown, agentId: unknown) => post(`/api/callbacks/${id}/assign`, { agentId }), [],
  ));
}
