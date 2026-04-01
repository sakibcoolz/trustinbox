# Task 4.10 — Customer Quick Actions

> **Section**: 4. Customers  
> **Priority**: P1  
> **Estimated Scope**: Small  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Add contextual quick action buttons to the customer detail page header: "Send Notification", "Request Callback", "Start Conversation", and "Share Document".

---

## Current State

No action buttons exist on the customer detail page. The header only has a back button and title.

---

## Requirements

### 1. Action Buttons

| Button | Icon | Action | Permission | Condition |
|--------|------|--------|------------|-----------|
| Send Notification | `Bell` | Navigate to `/notifications/compose?recipient={virtualId}` | `notifications:write` | Always |
| Request Callback | `PhoneCall` | Open callback creation modal (pre-filled customer) | `callbacks:write` | Only if `callbacksAllowed` |
| Start Conversation | `MessageSquare` | Navigate to `/conversations/new?recipient={virtualId}` | `conversations:write` | Only if `allowChat` |
| Share Document | `FileText` | Open document share modal | `documents:write` | Only if `allowDocumentShares` |

### 2. Visual Design
- Button group aligned to the right of the header
- Secondary variant: `border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active`
- Icon + label on desktop, icon-only on mobile with tooltip
- Disabled state: `opacity-50 cursor-not-allowed` with tooltip explaining why (e.g., "Customer has blocked callbacks")

### 3. Policy Pre-Check
- Before showing buttons as enabled, check customer's privacy preferences
- If a channel is blocked, show button as disabled with reason tooltip
- For "Send Notification", run inline `checkCommunicationPolicy` before navigation

### 4. Component API

```typescript
interface CustomerActionsProps {
  virtualId: string;
  privacyPreference: PrivacyPreference;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/CustomerActions.tsx
import { Bell, PhoneCall, MessageSquare, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { Tooltip } from '@/components/ui/Tooltip';

const ACTIONS = [
  { key: 'notify', label: 'Send Notification', icon: Bell, permission: 'notifications:write', preferenceKey: null },
  { key: 'callback', label: 'Request Callback', icon: PhoneCall, permission: 'callbacks:write', preferenceKey: 'allowCallbackRequests' },
  { key: 'conversation', label: 'Start Conversation', icon: MessageSquare, permission: 'conversations:write', preferenceKey: 'allowChat' },
  { key: 'document', label: 'Share Document', icon: FileText, permission: 'documents:write', preferenceKey: 'allowDocumentShares' },
] as const;

export function CustomerActions({ virtualId, privacyPreference }: CustomerActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {ACTIONS.map(action => {
        const hasPermission = usePermission(action.permission);
        const customerAllows = !action.preferenceKey || privacyPreference[action.preferenceKey];
        const disabled = !hasPermission || !customerAllows;
        const reason = !hasPermission ? 'Insufficient permissions' : !customerAllows ? 'Blocked by customer preference' : '';

        return (
          <Tooltip key={action.key} content={disabled ? reason : action.label}>
            <button
              disabled={disabled}
              onClick={() => handleAction(action.key, virtualId)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border-secondary rounded-lg text-text-secondary hover:text-text-primary hover:border-border-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <action.icon size={14} />
              <span className="hidden lg:inline">{action.label}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/CustomerActions.tsx` | Create |
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — add CustomerActions to header |

---

## Acceptance Criteria

- [ ] 4 action buttons visible on customer detail header
- [ ] Each button permission-gated via `usePermission`
- [ ] Buttons disabled when customer preference blocks the action
- [ ] Disabled buttons show reason tooltip
- [ ] "Send Notification" navigates to compose with pre-filled recipient
- [ ] "Request Callback" opens callback creation modal
- [ ] "Start Conversation" navigates to conversation creation
- [ ] "Share Document" opens document sharing modal
- [ ] Responsive: icon + label on desktop, icon-only on mobile

---

## Dependencies

- **Blocked by**: Task 4.7 (Customer detail page), Task 4.8 (Privacy status — provides preference data), Task 2.10 (usePermission)
- **Blocks**: None
- **Related**: Task 4.11 (policy check indicator), Task 5.7 (compose recipient pre-fill)
