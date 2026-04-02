'use client';

import { useCallback } from 'react';
import { useMutation, post } from './base';

export function useSendMessage() {
  return useMutation(useCallback(
    (conversationId: unknown, input: unknown) =>
      post(`/api/conversations/${conversationId}/messages`, input), [],
  ));
}

export function useCreateConversation() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/conversations', input), [],
  ));
}
