# Task 3.4 — Recent Activity Timeline

> **Section**: 3. Dashboard  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/ActivityTimeline.tsx`

---

## Objective

Replace the static activity list with a dynamic Timeline component (task 1.19) connected to real analytics data.

---

## Current State

```tsx
{[
  { action: 'Notification delivered', target: 'user_a1b2c3', time: '2m ago', status: 'success' },
  { action: 'Callback approved', target: 'user_d4e5f6', time: '8m ago', status: 'success' },
  { action: 'Policy denied', target: 'user_g7h8i9', time: '15m ago', status: 'error' },
  { action: 'Bot escalated', target: 'conv_j0k1l2', time: '22m ago', status: 'warning' },
].map((item, i) => (
  <div key={i}>...</div>
))}
```

Static hardcoded activity. Uses simple dot + text layout (not Timeline component).

---

## Requirements

### 1. Data Source
```graphql
fragment RecentActivityData on DashboardAnalytics {
  recentActivity {
    id
    type  # NOTIFICATION_DELIVERED, CALLBACK_APPROVED, POLICY_DENIED, BOT_ESCALATED, CAMPAIGN_LAUNCHED, etc.
    title
    description
    targetId
    targetType  # USER, CONVERSATION, CAMPAIGN, BOT
    timestamp
  }
}
```

### 2. Event Type Mapping
| Type | Timeline Variant | Icon | Click Action |
|------|-----------------|------|-------------|
| NOTIFICATION_DELIVERED | success | Bell | Navigate to notification detail |
| NOTIFICATION_FAILED | error | BellOff | Navigate to notification detail |
| CALLBACK_APPROVED | success | PhoneCall | Navigate to callback |
| CALLBACK_REJECTED | error | PhoneOff | Navigate to callback |
| POLICY_DENIED | error | Shield | Navigate to compliance log |
| BOT_ESCALATED | warning | Bot | Navigate to conversation |
| CAMPAIGN_LAUNCHED | info | Megaphone | Navigate to campaign |
| CONVERSATION_STARTED | info | MessageSquare | Navigate to conversation |
| DOCUMENT_SHARED | success | FileText | Navigate to document |

### 3. Component Features
- [x] Use `<Timeline>` component from task 1.19
- [x] Show last 10 events by default
- [x] "View all" link → navigates to dedicated activity page or expands
- [x] Relative timestamps (e.g., "2m ago", "1h ago")
- [x] Each event clickable → navigates to relevant entity

### 4. formatRelativeTime Utility
```typescript
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
```

---

## Implementation Plan

```tsx
import { Timeline, TimelineEvent } from '@/components/ui/Timeline';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Bell, PhoneCall, Shield, Bot, Megaphone, MessageSquare, FileText } from 'lucide-react';

const EVENT_MAP = {
  NOTIFICATION_DELIVERED: { type: 'success', icon: Bell },
  NOTIFICATION_FAILED: { type: 'error', icon: Bell },
  CALLBACK_APPROVED: { type: 'success', icon: PhoneCall },
  POLICY_DENIED: { type: 'error', icon: Shield },
  BOT_ESCALATED: { type: 'warning', icon: Bot },
  CAMPAIGN_LAUNCHED: { type: 'info', icon: Megaphone },
  CONVERSATION_STARTED: { type: 'info', icon: MessageSquare },
  DOCUMENT_SHARED: { type: 'success', icon: FileText },
} as const;

export function ActivityTimeline({ activities, loading }: { activities: ActivityEvent[]; loading: boolean }) {
  const events: TimelineEvent[] = activities.map(a => ({
    id: a.id,
    type: EVENT_MAP[a.type]?.type ?? 'neutral',
    icon: EVENT_MAP[a.type]?.icon,
    title: a.title,
    description: a.description,
    timestamp: formatRelativeTime(a.timestamp),
    action: { label: 'View', href: getEventHref(a) },
  }));

  return (
    <Card>
      <CardHeader title="Recent Activity" action={<a href="/analytics?tab=activity" className="text-xs text-accent-blue hover:underline">View all</a>} />
      <CardContent>
        <Timeline events={events} maxItems={10} />
      </CardContent>
    </Card>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/ActivityTimeline.tsx` | Create |
| `apps/provider/src/lib/format.ts` | Create — formatRelativeTime + other formatters |
| `apps/provider/src/app/page.tsx` | Modify — replace static activity list |

---

## Acceptance Criteria

- [x] Timeline renders last 10 events from GraphQL data
- [x] Each event type shows correct icon and color
- [x] Relative timestamps display correctly
- [x] Clicking "View" navigates to the related entity
- [x] "View all" link available in card header
- [x] Loading state uses skeleton
- [x] Empty state shows when no activity

---

## Dependencies

- **Blocked by**: Task 1.19 (Timeline component), Task 1.12 (Card), Task 3.8 (GraphQL query)
- **Blocks**: None
- **Related**: Task 3.9 (subscription for live updates)
