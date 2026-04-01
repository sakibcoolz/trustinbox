'use client';

import { Bell, CheckCircle, XCircle, PhoneCall, PhoneOff, MessageSquare, FileText } from 'lucide-react';
import { Timeline } from '@/components/ui/Timeline';
import { EmptyState } from '@/components/EmptyState';
import type { TimelineEvent as TimelineEventType } from '@/lib/graphql/customers';
import { formatRelativeTime } from '@/lib/format';

// ─── Event Type Mappings ────────────────────────────────

const EVENT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: 'success' | 'error' | 'warning' | 'info' | 'neutral' }
> = {
  NOTIFICATION_SENT: { icon: Bell, color: 'info' },
  NOTIFICATION_DELIVERED: { icon: CheckCircle, color: 'success' },
  NOTIFICATION_FAILED: { icon: XCircle, color: 'error' },
  CALLBACK_REQUESTED: { icon: PhoneCall, color: 'warning' },
  CALLBACK_APPROVED: { icon: CheckCircle, color: 'success' },
  CALLBACK_REJECTED: { icon: XCircle, color: 'error' },
  CALLBACK_COMPLETED: { icon: PhoneOff, color: 'info' },
  MESSAGE_SENT: { icon: MessageSquare, color: 'info' },
  MESSAGE_RECEIVED: { icon: MessageSquare, color: 'neutral' },
  DOCUMENT_SHARED: { icon: FileText, color: 'info' },
};

function getEventHref(type: string, id: string): string | undefined {
  if (type.startsWith('NOTIFICATION_')) return `/notifications?highlight=${id}`;
  if (type.startsWith('CALLBACK_')) return `/callbacks?highlight=${id}`;
  if (type.startsWith('MESSAGE_')) return `/conversations?highlight=${id}`;
  if (type === 'DOCUMENT_SHARED') return `/documents?highlight=${id}`;
  return undefined;
}

// ─── Component ──────────────────────────────────────────

interface CommunicationTimelineProps {
  events: TimelineEventType[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function CommunicationTimeline({ events, loading, onLoadMore, hasMore }: CommunicationTimelineProps) {
  if (!loading && events.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No communication history"
        description="Communication events will appear here once interactions begin"
      />
    );
  }

  const timelineEvents = events.map((event) => {
    const config = EVENT_CONFIG[event.type] ?? { icon: Bell, color: 'neutral' as const };
    const href = getEventHref(event.type, event.id);

    return {
      id: event.id,
      type: config.color,
      icon: config.icon,
      title: event.title,
      description: event.description,
      timestamp: formatRelativeTime(event.timestamp),
      metadata: event.metadata,
      action: href ? { label: 'View details', href } : undefined,
    };
  });

  return (
    <Timeline
      events={timelineEvents}
      showLoadMore={hasMore}
      onLoadMore={onLoadMore}
    />
  );
}
