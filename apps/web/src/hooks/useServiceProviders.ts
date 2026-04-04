'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_SERVICE_PROVIDERS, BLOCK_SP, UNBLOCK_SP } from '@/lib/graphql/service-providers';
import { MY_BLOCKED_PROVIDERS } from '@/lib/graphql/profile';

interface UseServiceProvidersOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export function useServiceProviders(options?: UseServiceProvidersOptions) {
  const { data, loading, error, refetch } = useQuery(MY_SERVICE_PROVIDERS, {
    variables: {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      search: options?.search ?? null,
    },
  });

  const [blockMutation] = useMutation(BLOCK_SP, {
    refetchQueries: [{ query: MY_SERVICE_PROVIDERS }, { query: MY_BLOCKED_PROVIDERS }],
  });

  const [unblockMutation] = useMutation(UNBLOCK_SP, {
    refetchQueries: [{ query: MY_SERVICE_PROVIDERS }, { query: MY_BLOCKED_PROVIDERS }],
  });

  const block = (serviceProviderId: string, reason?: string) =>
    blockMutation({ variables: { serviceProviderId, reason } });

  const unblock = (serviceProviderId: string) =>
    unblockMutation({ variables: { serviceProviderId } });

  return {
    providers: data?.myServiceProviders?.nodes ?? [],
    totalCount: data?.myServiceProviders?.totalCount ?? 0,
    loading,
    error,
    refetch,
    block,
    unblock,
  };
}
