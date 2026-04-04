'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_DND_RULES, CREATE_DND_RULE, UPDATE_DND_RULE, DELETE_DND_RULE } from '@/lib/graphql/settings';

export function useDNDRules() {
  const { data, loading, error, refetch } = useQuery(MY_DND_RULES);

  const [createMutation] = useMutation(CREATE_DND_RULE, {
    refetchQueries: [{ query: MY_DND_RULES }],
  });

  const [updateMutation] = useMutation(UPDATE_DND_RULE, {
    refetchQueries: [{ query: MY_DND_RULES }],
  });

  const [deleteMutation] = useMutation(DELETE_DND_RULE, {
    refetchQueries: [{ query: MY_DND_RULES }],
  });

  const createRule = (input: {
    scopeType: string;
    scopeRefId?: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    isActive: boolean;
  }) => createMutation({ variables: { input } });

  const updateRule = (input: {
    id: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    isActive?: boolean;
  }) => updateMutation({ variables: { input } });

  const deleteRule = (id: string) => deleteMutation({ variables: { id } });

  return {
    rules: data?.myDNDRules ?? [],
    loading,
    error,
    refetch,
    createRule,
    updateRule,
    deleteRule,
  };
}
