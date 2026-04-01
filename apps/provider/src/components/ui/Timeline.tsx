import { cn } from '@/lib/utils';

// --- Types ---
interface TimelineEvent {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  timestamp: string;
  action?: { label: string; href?: string; onClick?: () => void };
  metadata?: Record<string, string>;
}

interface TimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

// --- Dot Colors ---
const DOT_COLORS = {
  success: 'bg-status-success',
  error: 'bg-status-error',
  warning: 'bg-status-warning',
  info: 'bg-status-info',
  neutral: 'bg-text-muted',
} as const;

// --- Component ---
export function Timeline({ events, maxItems, showLoadMore, onLoadMore }: TimelineProps) {
  const visible = maxItems ? events.slice(0, maxItems) : events;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border-primary" />

      <div className="space-y-4">
        {visible.map((event) => {
          const Icon = event.icon;
          return (
            <div key={event.id} className="relative flex gap-3 pl-0">
              {/* Dot */}
              <div className={cn('relative z-10 mt-1.5 w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0', DOT_COLORS[event.type] + '/20')}>
                {Icon ? (
                  <Icon size={12} className={cn('text-current', event.type === 'success' && 'text-status-success', event.type === 'error' && 'text-status-error', event.type === 'warning' && 'text-status-warning', event.type === 'info' && 'text-status-info', event.type === 'neutral' && 'text-text-muted')} />
                ) : (
                  <div className={cn('w-2.5 h-2.5 rounded-full', DOT_COLORS[event.type])} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">{event.title}</p>
                  <time className="text-[10px] text-text-muted whitespace-nowrap shrink-0">{event.timestamp}</time>
                </div>
                {event.description && (
                  <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>
                )}
                {event.metadata && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span key={key} className="text-[10px] text-text-muted">
                        <span className="text-text-secondary">{key}:</span> {value}
                      </span>
                    ))}
                  </div>
                )}
                {event.action && (
                  <div className="mt-1.5">
                    {event.action.href ? (
                      <a href={event.action.href} className="text-xs text-text-link hover:underline">
                        {event.action.label}
                      </a>
                    ) : (
                      <button onClick={event.action.onClick} className="text-xs text-text-link hover:underline">
                        {event.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showLoadMore && onLoadMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Load more…
          </button>
        </div>
      )}
    </div>
  );
}
