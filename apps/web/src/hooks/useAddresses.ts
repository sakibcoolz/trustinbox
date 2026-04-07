'use client';

import { useQuery, useMutation } from '@apollo/client';
import {
  MY_ADDRESSES,
  MY_CURRENT_ADDRESS,
  CREATE_ADDRESS,
  UPDATE_ADDRESS,
  DELETE_ADDRESS,
  SET_CURRENT_ADDRESS,
} from '@/lib/graphql/addresses';

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useAddresses() {
  const { data, loading, error, refetch } = useQuery(MY_ADDRESSES);

  const [createMutation, { loading: creating }] = useMutation(CREATE_ADDRESS, {
    refetchQueries: [{ query: MY_ADDRESSES }, { query: MY_CURRENT_ADDRESS }],
  });

  const [updateMutation, { loading: updating }] = useMutation(UPDATE_ADDRESS, {
    refetchQueries: [{ query: MY_ADDRESSES }, { query: MY_CURRENT_ADDRESS }],
  });

  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_ADDRESS, {
    refetchQueries: [{ query: MY_ADDRESSES }, { query: MY_CURRENT_ADDRESS }],
  });

  const [setCurrentMutation, { loading: settingCurrent }] = useMutation(SET_CURRENT_ADDRESS, {
    refetchQueries: [{ query: MY_ADDRESSES }, { query: MY_CURRENT_ADDRESS }],
  });

  const createAddress = (input: {
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    isCurrent?: boolean;
  }) => createMutation({ variables: { input } });

  const updateAddress = (input: {
    id: string;
    label?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isCurrent?: boolean;
  }) => updateMutation({ variables: { input } });

  const deleteAddress = (id: string) => deleteMutation({ variables: { id } });

  const setCurrentAddress = (id: string) => setCurrentMutation({ variables: { id } });

  return {
    addresses: (data?.myAddresses ?? []) as UserAddress[],
    loading,
    error,
    refetch,
    createAddress,
    updateAddress,
    deleteAddress,
    setCurrentAddress,
    saving: creating || updating || deleting || settingCurrent,
  };
}

export function useCurrentAddress() {
  const { data, loading, error } = useQuery(MY_CURRENT_ADDRESS);
  return {
    currentAddress: data?.myCurrentAddress as UserAddress | null,
    loading,
    error,
  };
}
