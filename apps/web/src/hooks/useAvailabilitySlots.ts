'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_AVAILABILITY_SLOTS, CREATE_AVAILABILITY_SLOT, DELETE_AVAILABILITY_SLOT } from '@/lib/graphql/settings';

export function useAvailabilitySlots() {
  const { data, loading, error, refetch } = useQuery(MY_AVAILABILITY_SLOTS);

  const [createMutation] = useMutation(CREATE_AVAILABILITY_SLOT, {
    refetchQueries: [{ query: MY_AVAILABILITY_SLOTS }],
  });

  const [deleteMutation] = useMutation(DELETE_AVAILABILITY_SLOT, {
    refetchQueries: [{ query: MY_AVAILABILITY_SLOTS }],
  });

  const createSlot = (input: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotType: string;
  }) => createMutation({ variables: { input } });

  const deleteSlot = (id: string) => deleteMutation({ variables: { id } });

  return {
    slots: data?.myAvailabilitySlots ?? [],
    loading,
    error,
    refetch,
    createSlot,
    deleteSlot,
  };
}
