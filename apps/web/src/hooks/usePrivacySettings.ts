'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_PRIVACY_PREFERENCES, UPDATE_PRIVACY } from '@/lib/graphql/settings';

export function usePrivacySettings() {
  const { data, loading, error } = useQuery(MY_PRIVACY_PREFERENCES);

  const [updateMutation, { loading: saving }] = useMutation(UPDATE_PRIVACY, {
    optimisticResponse: ({ input }) => ({
      updatePrivacyPreference: {
        __typename: 'PrivacyPreference',
        allowPersonalNotifications: input.allowPersonalNotifications ?? data?.myPrivacyPreferences?.allowPersonalNotifications ?? true,
        allowSPNotifications: input.allowSPNotifications ?? data?.myPrivacyPreferences?.allowSPNotifications ?? true,
        allowAdvertisements: input.allowAdvertisements ?? data?.myPrivacyPreferences?.allowAdvertisements ?? false,
        allowCallbackRequests: input.allowCallbackRequests ?? data?.myPrivacyPreferences?.allowCallbackRequests ?? true,
        allowChat: input.allowChat ?? data?.myPrivacyPreferences?.allowChat ?? true,
        allowDocumentShares: input.allowDocumentShares ?? data?.myPrivacyPreferences?.allowDocumentShares ?? true,
        requireCallApproval: input.requireCallApproval ?? data?.myPrivacyPreferences?.requireCallApproval ?? true,
      },
    }),
    update(cache, { data: result }) {
      if (result?.updatePrivacyPreference) {
        cache.writeQuery({
          query: MY_PRIVACY_PREFERENCES,
          data: { myPrivacyPreferences: result.updatePrivacyPreference },
        });
      }
    },
  });

  const updatePrivacy = (input: {
    allowPersonalNotifications?: boolean;
    allowSPNotifications?: boolean;
    allowAdvertisements?: boolean;
    allowCallbackRequests?: boolean;
    allowChat?: boolean;
    allowDocumentShares?: boolean;
    requireCallApproval?: boolean;
  }) => updateMutation({ variables: { input } });

  return {
    privacy: data?.myPrivacyPreferences ?? null,
    loading,
    error,
    updatePrivacy,
    saving,
  };
}
