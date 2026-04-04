'use client';

import { useMemo, useState } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useQuery } from '@apollo/client';
import { MY_NOTIFICATIONS } from '@/lib/graphql/notifications';
import { MY_CALLBACKS } from '@/lib/graphql/callbacks';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ActivityItem {
  id: string;
  type: 'notification' | 'callback' | 'message';
  title: string;
  description: string;
  timestamp: string;
  href: string;
  metadata: {
    serviceProviderName?: string;
    category?: string;
    status?: string;
  };
}

export type ActivityFilter = 'all' | 'notification' | 'callback' | 'message';

export function useActivityFeed(filter: ActivityFilter = 'all') {
  const { notifications: sseNotifications } = useNotifications();
  const { conversations } = useChat();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const { data: notifsData, loading: notifsLoading, refetch: refetchNotifs } = useQuery(MY_NOTIFICATIONS, {
    variables: { limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: callbacksData, loading: callbacksLoading, refetch: refetchCallbacks } = useQuery(MY_CALLBACKS, {
    variables: { limit: 10, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const seen = new Set<string>();

    // Notifications from GraphQL, falling back to SSE
    const allNotifs = notifsData?.myNotifications?.nodes || sseNotifications;
    allNotifs.forEach((n: any) => {
      const key = `notif-${n.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        id: key,
        type: 'notification',
        title: n.title,
        description: n.body || '',
        timestamp: n.createdAt,
        href: `/inbox?id=${n.id}`,
        metadata: {
          serviceProviderName: n.serviceProvider?.name,
          category: n.category,
          status: n.status,
        },
      });
    });

    // Callbacks
    (callbacksData?.myCallbackRequests?.nodes || []).forEach((cb: any) => {
      const key = `callback-${cb.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        id: key,
        type: 'callback',
        title: `Callback from ${cb.serviceProvider?.name || 'Unknown'}`,
        description: cb.reason || '',
        timestamp: cb.requestedAt || cb.createdAt,
        href: `/callbacks?id=${cb.id}`,
        metadata: {
          serviceProviderName: cb.serviceProvider?.name,
          status: cb.status,
        },
      });
    });

    // Recent messages from conversations
    conversations.forEach((conv: any) => {
      if (conv.lastMessagePreview) {
        const key = `msg-${conv.id}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          id: key,
          type: 'message',
          title: `Message from ${conv.name || conv.otherUser?.fullName || 'Unknown'}`,
          description: conv.lastMessagePreview?.slice(0, 100) || '',
          timestamp: conv.lastMessageAt || conv.createdAt,
          href: '/conversations',
          metadata: {},
        });
      }
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filter
    if (filter !== 'all') {
      return items.filter((i) => i.type === filter);
    }
    return items;
  }, [notifsData, sseNotifications, callbacksData, conversations, filter]);

  const loading = notifsLoading || callbacksLoading;
  const paged = activities.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < activities.length;

  const refetch = () => {
    refetchNotifs();
    refetchCallbacks();
  };

  const loadMore = () => setPage((p) => p + 1);

  // Counts per type
  const counts = useMemo(() => {
    const all = activities.length;
    let notifications = 0;
    let callbacks = 0;
    let messages = 0;
    for (const a of activities) {
      if (a.type === 'notification') notifications++;
      else if (a.type === 'callback') callbacks++;
      else if (a.type === 'message') messages++;
    }
    return { all, notifications, callbacks, messages };
  }, [activities]);

  return { activities: paged, loading, refetch, loadMore, hasMore, counts };
}
