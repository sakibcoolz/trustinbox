'use client';

import { useCallback } from 'react';
import { useMutation, post } from './base';

export function useAddCustomer() {
  return useMutation(useCallback(
    (virtualId: unknown, relationshipType?: unknown) =>
      post<{ id: string; virtualId: string; status: string }>('/api/gateway/v1/customers', { virtualId, relationshipType: relationshipType || 'CUSTOMER' }),
    [],
  ));
}

export function useRemoveCustomer() {
  return useMutation(useCallback(
    (virtualId: unknown) =>
      fetch('/api/gateway/v1/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ virtualId }),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to remove customer');
        return data as { success: boolean };
      }),
    [],
  ));
}
