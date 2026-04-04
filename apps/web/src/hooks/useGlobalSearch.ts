'use client';

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useLazyQuery } from '@apollo/client';
import { MY_SERVICE_PROVIDERS } from '@/lib/graphql/service-providers';

interface SearchResult {
  id: string;
  type: 'notification' | 'conversation' | 'service-provider' | 'document';
  title: string;
  subtitle: string;
  href: string;
}

interface SearchResults {
  notifications: SearchResult[];
  conversations: SearchResult[];
  serviceProviders: SearchResult[];
  documents: SearchResult[];
  total: number;
}

const emptyResults: SearchResults = {
  notifications: [],
  conversations: [],
  serviceProviders: [],
  documents: [],
  total: 0,
};

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const { notifications } = useNotifications();
  const { conversations } = useChat();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [searchSPs] = useLazyQuery(MY_SERVICE_PROVIDERS);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(emptyResults);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const q = query.toLowerCase();

      const notifResults: SearchResult[] = notifications
        .filter((n) => n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          type: 'notification' as const,
          title: n.title || 'Notification',
          subtitle: n.body?.slice(0, 60) || '',
          href: `/inbox?id=${n.id}`,
        }));

      const convResults: SearchResult[] = conversations
        .filter((c) => c.name?.toLowerCase().includes(q) || c.otherUser?.fullName?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          type: 'conversation' as const,
          title: c.name || c.otherUser?.fullName || 'Conversation',
          subtitle: c.lastMessagePreview?.slice(0, 60) || '',
          href: '/conversations',
        }));

      let spResults: SearchResult[] = [];
      try {
        const { data } = await searchSPs({ variables: { search: query, limit: 5 } });
        const nodes = data?.myServiceProviders?.nodes ?? [];
        spResults = nodes.map((sp: { id: string; name: string; industry: string }) => ({
          id: sp.id,
          type: 'service-provider' as const,
          title: sp.name,
          subtitle: sp.industry || 'Service Provider',
          href: `/service-providers`,
        }));
      } catch {
        // search failure is non-critical
      }

      const combined: SearchResults = {
        notifications: notifResults,
        conversations: convResults,
        serviceProviders: spResults,
        documents: [],
        total: notifResults.length + convResults.length + spResults.length,
      };

      setResults(combined);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query, notifications, conversations, searchSPs]);

  return { results, loading };
}
