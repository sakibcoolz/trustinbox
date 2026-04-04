'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_BLOCKED_PROVIDERS } from '@/lib/graphql/profile';
import { UNBLOCK_SP } from '@/lib/graphql/service-providers';

interface UseBlockedProvidersOptions {
  limit?: number;
  offset?: number;
}

export function useBlockedProviders(options?: UseBlockedProvidersOptions) {
  const { data, loading, error, refetch } = useQuery(MY_BLOCKED_PROVIDERS, {
    variables: {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    },
  });

  const [unblockMutation] = useMutation(UNBLOCK_SP, {
    refetchQueries: [{ query: MY_BLOCKED_PROVIDERS }],
  });

  const unblock = (serviceProviderId: string) =>
    unblockMutation({ variables: { serviceProviderId } });

  return {
    blockedProviders: data?.myBlockedProviders?.nodes ?? [],
    totalCount: data?.myBlockedProviders?.totalCount ?? 0,
    loading,
    error,
    refetch,
    unblock,
  };
}
