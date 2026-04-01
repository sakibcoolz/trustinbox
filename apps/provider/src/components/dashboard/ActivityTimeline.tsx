'use client';

import { Bell, PhoneCall, Shield, Bot, Megaphone, MessageSquare, FileText, PhoneOff, BellOff } from 'lucide-react';
import { Timeline } from '@/components/ui/Timeline';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/format';
import type { ActivityEvent } from '@/lib/graphql/dashboard';

// ─── Event type mapping ─────────────────────────────────

const EVENT_MAP: Record<string, { type: 'success' | 'error' | 'warning' | 'info' | 'neutral'; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  NOTIFICATION_DELIVERED: { type: 'success', icon: Bell },
  NOTIFICATION_FAILED: { type: 'error', icon: BellOff },
  CALLBACK_APPROVED: { type: 'success', icon: PhoneCall },
  CALLBACK_REJECTED: { type: 'error', icon: PhoneOff },
  POLICY_DENIED: { type: 'error', icon: Shield },
  BOT_ESCALATED: { type: 'warning', icon: Bot },
  CAMPAIGN_LAUNCHED: { type: 'info', icon: Megaphone },
  CONVERSATION_STARTED: { type: 'info', icon: MessageSquare },
  DOCUMENT_SHARED: { type: 'success', icon: FileText },
};

function getEventHref(event: ActivityEvent): string {
  switch (event.targetType) {
    case 'USER': return `/customers/${event.targetId}`;
    case 'CONVERSATION': return `/conversations/${event.targetId}`;
    case 'CAMPAIGN': return `/campaigns/${event.targetId}`;
    case 'BOT': return `/bots/${event.targetId}`;
    case 'NOTIFICATION': return `/notifications/${event.targetId}`;
    case 'CALLBACK': return `/callbacks/${event.targetId}`;
    case 'DOCUMENT': return `/documents/${event.targetId}`;
    default: return '#';
  }
}

function SkeletonTimeline() {
  return (
    <Card>
      <div className="px-6 py-4 border-b border-border-primary">
        <div className="h-4 w-28 bg-border-primary rounded animate-pulse" />
      </div>
      <div className="px-6 py-4 space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 bg-border-primary rounded-full animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-48 bg-border-primary rounded animate-pulse" />
              <div className="h-2.5 w-32 bg-border-primary rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ActivityTimeline({ activities, loading }: { activities: ActivityEvent[]; loading: boolean }) {
  if (loading) return <SkeletonTimeline />;

  const events = activities.map((a) => {
    const mapping = EVENT_MAP[a.type] ?? { type: 'neutral' as const, icon: undefined };
    return {
      id: a.id,
      type: mapping.type,
      icon: mapping.icon,
      title: a.title,
      description: a.description,
      timestamp: formatRelativeTime(a.timestamp),
      action: { label: 'View', href: getEventHref(a) },
    };
  });

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Recent Activity"
          action={<a href="/analytics?tab=activity" className="text-xs text-accent-blue hover:underline">View all</a>}
        />
        <CardContent>
          <div className="h-32 flex items-center justify-center text-sm text-text-muted">No recent activity</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Recent Activity"
        action={<a href="/analytics?tab=activity" className="text-xs text-accent-blue hover:underline">View all</a>}
      />
      <CardContent>
        <Timeline events={events} maxItems={10} />
      </CardContent>
    </Card>
  );
}
