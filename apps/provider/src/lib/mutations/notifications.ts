'use client';

import { useCallback } from 'react';
import { useMutation, post } from './base';

export function useSendNotification() {
  return useMutation(useCallback((input: unknown) => post('/api/notifications', input), []));
}

export function useRetryNotification() {
  return useMutation(useCallback(
    (id: unknown) => post(`/api/notifications/${id}/retry`), [],
  ));
}
