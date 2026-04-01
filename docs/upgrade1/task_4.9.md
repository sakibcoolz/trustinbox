# Task 4.9 — Customer Communication Timeline

> **Section**: 4. Customers  
> **Priority**: P1  
> **Estimated Scope**: Large  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`

---

## Objective

Implement a chronological communication timeline showing all notifications, callbacks, messages, and documents shared with this customer, replacing the separate mock notification and callback tables.

---

## Current State

```tsx
// Notifications tab — separate static table
const mockNotifications = [
  { id: '1', type: 'Personal', channel: 'SMS', status: 'Delivered', sentAt: '2024-03-10 14:30', subject: 'Account verification' },
  // ... 3 more
];

// Callbacks tab — separate static table
const mockCallbacks = [
  { id: '1', status: 'Completed', requestedAt: '2024-03-09 10:00', scheduledAt: '2024-03-09 14:00', topic: 'Account inquiry' },
  // ... 1 more
];
```

**Issues**: Separate tabs for notifications and callbacks (should be unified timeline), static mock data, no messages/documents in timeline.

---

## Requirements

### 1. Timeline Event Types

| Type | Icon | Color | Source |
|------|------|-------|--------|
| Notification Sent | `Bell` | `accent-blue` | `notifications` query |
| Notification Delivered | `CheckCircle` | `status-success` | `notifications` query |
| Notification Failed | `XCircle` | `status-error` | `notifications` query |
| Callback Requested | `PhoneCall` | `accent-orange` | `callbackRequests` query |
| Callback Approved | `CheckCircle` | `status-success` | `callbackRequests` query |
| Callback Rejected | `XCircle` | `status-error` | `callbackRequests` query |
| Callback Completed | `PhoneOff` | `accent-cyan` | `callbackRequests` query |
| Message Sent | `MessageSquare` | `accent-blue` | `conversation.messages` |
| Message Received | `MessageSquare` | `text-muted` | `conversation.messages` |
| Document Shared | `FileText` | `accent-purple` | Documents query |
| Policy Blocked | `Shield` | `status-warning` | Policy decision events |

### 2. Timeline Entry Structure
```typescript
interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    channel?: string;
    category?: string;
    status?: string;
    reason?: string;
  };
}
```

### 3. Timeline Component (reuse from task 1.19)
- Vertical timeline with connecting line
- Icon circle at each node
- Title + description + relative timestamp
- Click-through to source (e.g., click notification → notification detail)
- Infinite scroll or "Load more" for large histories

### 4. Filtering
- Filter by event type: All, Notifications, Callbacks, Messages, Documents
- Date range filter
- Combined with existing tab system or replace tabs entirely

### 5. Unified Data Aggregation
- Fetch notifications, callbacks, messages, and documents in parallel
- Merge and sort by timestamp descending
- Use `useMemo` to merge data from multiple queries

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/CommunicationTimeline.tsx
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { Bell, CheckCircle, XCircle, PhoneCall, MessageSquare, FileText, Shield } from 'lucide-react';

const EVENT_CONFIG: Record<TimelineEventType, { icon: any; color: string }> = {
  NOTIFICATION_SENT: { icon: Bell, color: 'text-accent-blue' },
  NOTIFICATION_DELIVERED: { icon: CheckCircle, color: 'text-status-success' },
  NOTIFICATION_FAILED: { icon: XCircle, color: 'text-status-error' },
  CALLBACK_REQUESTED: { icon: PhoneCall, color: 'text-accent-orange' },
  CALLBACK_APPROVED: { icon: CheckCircle, color: 'text-status-success' },
  CALLBACK_COMPLETED: { icon: PhoneCall, color: 'text-accent-cyan' },
  MESSAGE_SENT: { icon: MessageSquare, color: 'text-accent-blue' },
  MESSAGE_RECEIVED: { icon: MessageSquare, color: 'text-text-muted' },
  DOCUMENT_SHARED: { icon: FileText, color: 'text-accent-purple' },
  POLICY_BLOCKED: { icon: Shield, color: 'text-status-warning' },
};

export function CommunicationTimeline({ entries, loading, onLoadMore, hasMore }: Props) {
  if (loading) return <TimelineSkeleton count={5} />;

  return (
    <Timeline>
      {entries.map(entry => {
        const config = EVENT_CONFIG[entry.type];
        return (
          <TimelineItem
            key={entry.id}
            icon={<config.icon size={14} />}
            iconColor={config.color}
            timestamp={entry.timestamp}
          >
            <p className="text-sm font-medium">{entry.title}</p>
            {entry.description && <p className="text-xs text-text-muted mt-0.5">{entry.description}</p>}
            {entry.metadata?.channel && (
              <span className="text-xs text-text-muted">via {entry.metadata.channel}</span>
            )}
          </TimelineItem>
        );
      })}
      {hasMore && (
        <button onClick={onLoadMore} className="text-sm text-accent-blue hover:underline py-2">
          Load more events
        </button>
      )}
    </Timeline>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/CommunicationTimeline.tsx` | Create |
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — replace notification/callback tabs with unified timeline |

---

## Acceptance Criteria

- [ ] Unified timeline shows all event types in chronological order
- [ ] Each event has type icon, color, title, description, timestamp
- [ ] Click notification event → notification detail
- [ ] Click callback event → callback detail
- [ ] Filter by event type works
- [ ] "Load more" button for pagination
- [ ] Loading skeleton during fetch
- [ ] Empty state if no communication history
- [ ] Events sorted newest first

---

## Dependencies

- **Blocked by**: Task 1.19 (Timeline component), Task 4.7 (Customer detail page), Task 4.13 (GraphQL customer data)
- **Blocks**: None
- **Related**: Task 3.4 (Dashboard recent activity timeline — shares Timeline component), Task 5.4 (Notification detail expansion)
