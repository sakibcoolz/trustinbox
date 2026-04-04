'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_CALLBACKS, APPROVE_CALLBACK, REJECT_CALLBACK } from '@/lib/graphql/callbacks';

interface UseCallbacksOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export function useCallbacks(options?: UseCallbacksOptions) {
  const { data, loading, error, refetch } = useQuery(MY_CALLBACKS, {
    variables: {
      status: options?.status ?? null,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    },
  });

  const [approveMutation] = useMutation(APPROVE_CALLBACK, {
    refetchQueries: [{ query: MY_CALLBACKS }],
  });

  const [rejectMutation] = useMutation(REJECT_CALLBACK, {
    refetchQueries: [{ query: MY_CALLBACKS }],
  });

  const approve = (input: { callbackRequestId: string; approvedSlotStart: string; approvedSlotEnd: string }) =>
    approveMutation({ variables: { input } });

  const reject = (input: { callbackRequestId: string; reason?: string }) =>
    rejectMutation({ variables: { input } });

  return {
    callbacks: data?.myCallbackRequests?.nodes ?? [],
    totalCount: data?.myCallbackRequests?.totalCount ?? 0,
    loading,
    error,
    refetch,
    approve,
    reject,
  };
}
