# Task 5.4 — Notification Expandable Row Detail

> **Section**: 5. Notifications  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement click-to-expand rows in the notification history table that reveal the full notification body, delivery attempts timeline, and policy decision details.

---

## Current State

Table rows are not expandable. No detail view exists for individual notifications.

---

## Requirements

### 1. Expandable Row Content
When a row is expanded, show a detail panel below the row:

| Section | Content |
|---------|---------|
| **Full Body** | Complete notification body (subject + body text) |
| **Delivery Attempts** | Timeline of delivery attempts with status, timestamp, error message |
| **Policy Decision** | Whether policy allowed/blocked, decision code, applied rules |
| **Metadata** | JSON metadata (priority, metadata fields) |
| **Recipient Info** | Virtual ID link to customer detail page |

### 2. Delivery Attempts Timeline
```typescript
interface DeliveryAttempt {
  attemptNumber: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  timestamp: string;
  channel: string;
  errorCode?: string;
  errorMessage?: string;
}
```

- Show as mini-timeline (1→2→3)
- Success: green node, Failed: red node, Pending: yellow node
- Error messages shown below failed attempts

### 3. Policy Decision Display
```typescript
interface PolicyDecision {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
  evaluatedAt: string;
}
```

- Reuses same visual pattern as task 4.11 (PolicyCheckIndicator)
- Shows decision code, reason, and rules as chips

### 4. Visual Design
- Expanded area: `bg-bg-hover/50` with top/bottom border
- Smooth expand/collapse animation (200ms)
- Only one row expanded at a time (accordion mode)
- Close button (X) or click row again to collapse
- Expand/collapse icon: `ChevronRight` → rotates to `ChevronDown`

### 5. Component API

```typescript
interface NotificationDetail {
  id: string;
  title: string;
  body: string;
  category: string;
  channel: string;
  priority: string;
  status: string;
  recipientVirtualId: string;
  deliveryAttempts: DeliveryAttempt[];
  policyDecision?: PolicyDecision;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/notifications/NotificationDetailPanel.tsx
import { ChevronDown, ExternalLink, Clock, CheckCircle, XCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { getNotificationStatusConfig } from '@/lib/utils/notification-status';

export function NotificationDetailPanel({ notification }: { notification: NotificationDetail }) {
  return (
    <tr>
      <td colSpan={6} className="px-0">
        <div className="px-5 py-4 bg-bg-hover/50 border-t border-border-primary space-y-4">
          {/* Body */}
          <div>
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">Message</h4>
            <p className="text-sm">{notification.body}</p>
          </div>

          {/* Recipient */}
          <div>
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">Recipient</h4>
            <Link href={`/customers/${notification.recipientVirtualId}`}
              className="text-sm text-accent-blue hover:underline flex items-center gap-1">
              {notification.recipientVirtualId} <ExternalLink size={12} />
            </Link>
          </div>

          {/* Delivery Attempts */}
          <div>
            <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Delivery Attempts</h4>
            <div className="flex items-center gap-2">
              {notification.deliveryAttempts.map((attempt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    attempt.status === 'SUCCESS' ? 'bg-status-success/20' :
                    attempt.status === 'FAILED' ? 'bg-status-error/20' : 'bg-status-warning/20'
                  }`}>
                    <span className="text-xs font-mono">{attempt.attemptNumber}</span>
                  </div>
                  {i < notification.deliveryAttempts.length - 1 && (
                    <div className="w-8 h-px bg-border-secondary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Policy Decision */}
          {notification.policyDecision && (
            <div>
              <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">Policy Decision</h4>
              {/* Reuse policy result display pattern from task 4.11 */}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/notifications/NotificationDetailPanel.tsx` | Create |
| `apps/provider/src/app/notifications/page.tsx` | Modify — add expand/collapse state, render detail panel |

---

## Acceptance Criteria

- [ ] Click row to expand detail panel below
- [ ] Show: full body, recipient link, delivery attempts, policy decision, metadata
- [ ] Delivery attempts as mini-timeline with colored nodes
- [ ] Policy decision with decision code, reason, rule chips
- [ ] Accordion mode: only one expanded at a time
- [ ] Smooth expand/collapse animation
- [ ] Expand icon rotates on open
- [ ] Recipient virtual ID links to customer detail
- [ ] Close by clicking row again or X button

---

## Dependencies

- **Blocked by**: Task 5.1 (Notification table), Task 1.13 (Table — expandable row support), Task 5.12 (GraphQL query includes detail fields)
- **Blocks**: Task 5.5 (retry action — shown in expanded panel)
- **Related**: Task 4.11 (policy check display — shared pattern)
