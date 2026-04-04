'use client';

import { useMemo } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useQuery } from '@apollo/client';
import { DASHBOARD_SUMMARY } from '@/lib/graphql/dashboard';

interface BadgeCounts {
  inbox: number;
  chats: number;
  calls: number;
  people: number;
}

export function useBadgeCounts(): BadgeCounts {
  const { unreadCount } = useNotifications();
  const { conversations } = useChat();
  const { data } = useQuery(DASHBOARD_SUMMARY, { pollInterval: 60000 });

  return useMemo(() => {
    const chatUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const pendingCallbacks = data?.myDashboardSummary?.pendingCallbacks ?? 0;

    return {
      inbox: unreadCount,
      chats: chatUnread,
      calls: pendingCallbacks,
      people: 0,
    };
  }, [conversations, unreadCount, data]);
}
