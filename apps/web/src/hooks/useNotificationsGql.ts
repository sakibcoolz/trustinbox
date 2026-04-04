'use client';

import { useQuery, useMutation } from '@apollo/client';
import {
  MY_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  ARCHIVE_NOTIFICATION,
  MARK_ALL_NOTIFICATIONS_READ,
} from '@/lib/graphql/notifications';

interface UseNotificationsOptions {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useNotificationsGql(options?: UseNotificationsOptions) {
  const { data, loading, error, refetch } = useQuery(MY_NOTIFICATIONS, {
    variables: {
      category: options?.category ?? null,
      status: options?.status ?? null,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    },
  });

  const [markReadMutation] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS }],
  });

  const [archiveMutation] = useMutation(ARCHIVE_NOTIFICATION, {
    refetchQueries: [{ query: MY_NOTIFICATIONS }],
  });

  const [markAllReadMutation] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS }],
  });

  const markRead = (id: string) => markReadMutation({ variables: { id } });
  const archive = (id: string) => archiveMutation({ variables: { id } });
  const markAllRead = () => markAllReadMutation();

  return {
    notifications: data?.myNotifications?.nodes ?? [],
    totalCount: data?.myNotifications?.totalCount ?? 0,
    loading,
    error,
    refetch,
    markRead,
    archive,
    markAllRead,
  };
}
