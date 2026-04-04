'use client';

import { useQuery } from '@apollo/client';
import { MY_DOCUMENTS } from '@/lib/graphql/documents';

interface UseDocumentsOptions {
  limit?: number;
  offset?: number;
  serviceProviderId?: string;
  classification?: string;
}

export function useDocuments(options?: UseDocumentsOptions) {
  const { data, loading, error, refetch } = useQuery(MY_DOCUMENTS, {
    variables: {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      serviceProviderId: options?.serviceProviderId ?? null,
      classification: options?.classification ?? null,
    },
  });

  return {
    documents: data?.myDocuments?.nodes ?? [],
    totalCount: data?.myDocuments?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
}
