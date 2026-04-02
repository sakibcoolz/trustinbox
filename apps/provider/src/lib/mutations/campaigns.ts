'use client';

import { useCallback } from 'react';
import { useMutation, post, put } from './base';

export function useCreateCampaign() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/campaigns', input), [],
  ));
}

export function useUpdateCampaign() {
  return useMutation(useCallback(
    (id: unknown, input: unknown) => put(`/api/campaigns/${id}`, input), [],
  ));
}

export function useLaunchCampaign() {
  return useMutation(useCallback(
    (id: unknown) => post(`/api/campaigns/${id}/launch`), [],
  ));
}

export function useCancelCampaign() {
  return useMutation(useCallback(
    (id: unknown) => post(`/api/campaigns/${id}/cancel`), [],
  ));
}
