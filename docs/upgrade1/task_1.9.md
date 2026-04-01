# Task 1.9 — Empty State Components

> **Section**: 1. Foundation & Shell  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/EmptyState.tsx`

---

## Objective

Create reusable empty state components with illustrations and CTA buttons for each feature area, shown when lists/tables have no data.

---

## Current State

No empty state components exist. Empty pages would show blank content.

---

## Requirements

### 1. Base EmptyState Component
```typescript
interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; href?: string };
  secondaryAction?: { label: string; onClick: () => void };
}
```

### 2. Visual Design
- [x] Centered in container, vertical stack
- [x] Icon: 48px, `text-text-muted` with `bg-bg-hover` circular background (80px)
- [x] Title: `text-lg font-medium text-text-primary`
- [x] Description: `text-sm text-text-secondary` max-w-sm centered
- [x] Primary CTA: blue button (`bg-accent-blue text-white rounded-lg px-4 py-2`)
- [x] Secondary action: text link below primary

### 3. Per-Feature Empty States

| Feature | Icon | Title | Description | CTA |
|---------|------|-------|-------------|-----|
| Customers | Users | No customers yet | Customers will appear here when they interact with your service | — |
| Notifications | Bell | No notifications sent | Start by composing your first notification | Compose Notification |
| Conversations | MessageSquare | No conversations | Conversations appear when customers message you | — |
| Callbacks | PhoneCall | No callback requests | Callback requests from customers will appear here | — |
| Documents | FileText | No documents | Upload documents to share with customers | Upload Document |
| Campaigns | Megaphone | No campaigns | Create a campaign to reach multiple customers | Create Campaign |
| Bots | Bot | No bots configured | Set up an AI bot to automate conversations | Create Bot |
| Webhooks | Webhook | No webhooks | Set up webhooks to receive real-time events | Create Webhook |

---

## Implementation Plan

```tsx
import Link from 'next/link';

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mb-4">
        <Icon size={32} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary text-center max-w-sm mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href}
            className="px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors">
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick}
            className="px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors">
            {action.label}
          </button>
        )
      )}
      {secondaryAction && (
        <button onClick={secondaryAction.onClick}
          className="mt-3 text-sm text-text-secondary hover:text-accent-blue transition-colors">
          {secondaryAction.label}
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
| `apps/provider/src/components/EmptyState.tsx` | Create |

---

## Acceptance Criteria

- [ ] `<EmptyState icon={Bell} title="..." description="..." />` renders correctly
- [ ] CTA button navigates or fires callback
- [ ] Visually centered and looks polished in dark theme
- [ ] Used by all feature pages when data is empty
- [ ] Accessible: proper heading hierarchy, button semantics

---

## Dependencies

- **Blocked by**: Task 1.11 (color palette)
- **Blocks**: None directly (used incrementally by feature pages)
- **Related**: All feature page tasks (4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 12.1)
