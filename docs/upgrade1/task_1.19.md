# Task 1.19 — Timeline Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Timeline.tsx`

---

## Objective

Create a vertical event timeline component for displaying chronological activity, audit logs, and communication history.

---

## Current State

Dashboard has a basic inline activity list. No reusable timeline component.

---

## Requirements

### 1. Timeline Structure
- [x] Vertical line connecting events (`border-l-2 border-border-primary`)
- [x] Event nodes: colored circle on the timeline line
- [x] Each event: icon, title, description (optional), timestamp, optional action link

### 2. Event Types (by color)
| Type | Color | Example |
|------|-------|---------|
| `success` | `bg-status-success` | Notification delivered, Callback completed |
| `error` | `bg-status-error` | Delivery failed, Policy denied |
| `warning` | `bg-status-warning` | Bot escalated, Rate limited |
| `info` | `bg-status-info` | Message sent, Campaign launched |
| `neutral` | `bg-text-muted` | default/unknown events |

### 3. Component API
```typescript
interface TimelineEvent {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  icon?: React.ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  timestamp: string; // ISO or relative string
  action?: { label: string; href?: string; onClick?: () => void };
  metadata?: Record<string, string>; // key-value pairs shown below description
}

interface TimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}
```

---

## Implementation Plan

```tsx
export function Timeline({ events, maxItems, showLoadMore, onLoadMore }: TimelineProps) {
  const visible = maxItems ? events.slice(0, maxItems) : events;
  
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border-primary" />
      
      <div className="space-y-4">
        {visible.map((event) => (
          <div key={event.id} className="relative flex gap-3 pl-8">
            {/* Dot */}
            <div className={cn('absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center',
              `bg-${EVENT_COLORS[event.type]}/10`)}>
              {event.icon ? (
                <event.icon size={12} className={`text-${EVENT_COLORS[event.type]}`} />
              ) : (
                <div className={cn('w-2 h-2 rounded-full', `bg-${EVENT_COLORS[event.type]}`)} />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-text-primary">{event.title}</p>
                <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">{event.timestamp}</span>
              </div>
              {event.description && <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>}
              {event.metadata && (
                <div className="flex gap-3 mt-1">
                  {Object.entries(event.metadata).map(([k, v]) => (
                    <span key={k} className="text-[10px] text-text-muted"><span className="text-text-secondary">{k}:</span> {v}</span>
                  ))}
                </div>
              )}
              {event.action && (
                <button className="text-xs text-accent-blue hover:underline mt-1">{event.action.label}</button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {showLoadMore && (
        <button onClick={onLoadMore} className="mt-4 ml-8 text-xs text-accent-blue hover:underline">
          Load more events
        </button>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Timeline.tsx` | Create |

---

## Acceptance Criteria

- [x] Vertical line connects all events visually
- [x] Each event shows colored dot, title, optional description, and timestamp
- [x] Event type determines dot color
- [x] Optional action link renders below description
- [x] `maxItems` limits visible events
- [x] "Load more" button shows when truncated
- [x] Accessible: uses semantic list elements
- [x] Used in: Dashboard activity (3.4), Customer timeline (4.9), Compliance audit log (13.1)

---

## Dependencies

- **Blocked by**: Task 1.11 (color tokens)
- **Blocks**: Tasks 3.4, 4.9, 13.1 (timeline-based views)
- **Related**: Task 1.18 (badge for status in timeline metadata)
