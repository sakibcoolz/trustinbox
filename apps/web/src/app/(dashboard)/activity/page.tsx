'use client';

import { useState } from 'react';
import { useActivityFeed, type ActivityFilter, type ActivityItem } from '@/hooks/useActivityFeed';
import { EmptyState } from '@/components/ui/EmptyState';
import { Clock } from 'lucide-react';

const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  notification: { color: 'bg-accent-blue/10 text-accent-blue', icon: '🔔', label: 'Notification' },
  callback: { color: 'bg-accent-green/10 text-accent-green', icon: '📞', label: 'Callback' },
  message: { color: 'bg-accent-purple/10 text-accent-purple', icon: '💬', label: 'Message' },
};

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'notification', label: 'Notifications' },
  { key: 'callback', label: 'Callbacks' },
  { key: 'message', label: 'Messages' },
];

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.notification;
  return (
    <a href={item.href} className="flex items-start gap-3 px-4 py-3.5 hover:bg-bg-hover transition-colors border-b border-border-primary">
      <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center text-base shrink-0 mt-0.5`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
          <span className="text-2xs text-text-muted shrink-0">{formatTimestamp(item.timestamp)}</span>
        </div>
        <p className="text-xs text-text-secondary truncate">{item.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`${config.color} text-2xs px-2 py-0.5 rounded-full font-medium`}>{config.label}</span>
          {item.metadata.serviceProviderName && (
            <span className="text-2xs text-text-muted">{item.metadata.serviceProviderName}</span>
          )}
          {item.metadata.status && (
            <span className="text-2xs text-text-muted">· {item.metadata.status}</span>
          )}
        </div>
      </div>
    </a>
  );
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { activities, loading, refetch, loadMore, hasMore, counts } = useActivityFeed(filter);

  if (loading && activities.length === 0) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <h1 className="text-lg font-semibold text-text-primary">Activity</h1>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-tertiary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 bg-bg-tertiary rounded" />
                  <div className="h-3 w-64 bg-bg-tertiary rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-6 pb-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-text-primary">Activity</h1>
            <button onClick={refetch} className="text-2xs text-accent-blue hover:underline">Refresh</button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? counts.all
                : f.key === 'notification' ? counts.notifications
                : f.key === 'callback' ? counts.callbacks
                : counts.messages;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    filter === f.key
                      ? 'bg-accent-blue text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Your interactions will appear here as a unified timeline."
          />
        ) : (
          <div>
            {activities.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
            {hasMore && (
              <div className="py-4 text-center">
                <button onClick={loadMore} className="text-sm text-accent-blue hover:underline">Load more</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
