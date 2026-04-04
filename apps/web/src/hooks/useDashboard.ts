'use client';

import { useQuery } from '@apollo/client';
import { DASHBOARD_SUMMARY } from '@/lib/graphql/dashboard';

export function useDashboard() {
  const { data, loading, error, refetch } = useQuery(DASHBOARD_SUMMARY);

  return {
    summary: data?.myDashboardSummary ?? null,
    loading,
    error,
    refetch,
  };
}
