# Task 4.8 — Customer Privacy Status Display

> **Section**: 4. Customers  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Display the customer's privacy preference status for this organization within the Overview tab, showing which communication categories and channels are allowed, restricted, or blocked.

---

## Current State

```tsx
// Overview tab — static policy consent data
const mockCustomer = {
  policies: {
    personalNotifications: true,
    orgNotifications: true,
    advertisements: false,
    callbacksAllowed: true,
  },
};

// Renders a simple list with CheckCircle2 / XCircle icons
{Object.entries(mockCustomer.policies).map(([key, val]) => (
  <div key={key} className="flex items-center justify-between">
    <span className="text-sm text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
    {val ? <CheckCircle2 size={16} className="text-status-success" /> : <XCircle size={16} className="text-status-error" />}
  </div>
))}
```

**Issues**: Hardcoded mock data, no GraphQL integration, limited to 4 boolean flags (should show full PrivacyPreference + DND rules + availability slots).

---

## Requirements

### 1. Privacy Preference Card
Display from `User.privacyPreference` GraphQL type:

| Setting | Type | Display |
|---------|------|---------|
| Personal Notifications | Boolean | ✅ Allowed / ❌ Blocked |
| SP Notifications | Boolean | ✅ Allowed / ❌ Blocked |
| Advertisements | Boolean | ✅ Allowed / ❌ Blocked |
| Callback Requests | Boolean | ✅ Allowed / ❌ Blocked |
| Chat | Boolean | ✅ Allowed / ❌ Blocked |
| Document Shares | Boolean | ✅ Allowed / ❌ Blocked |
| Require Call Approval | Boolean | 🔒 Required / ✅ Not required |

### 2. DND Rules Display
- List active DND rules for this customer
- Show: days of week, start time, end time, scope (global or SP-specific)
- Visual timeline bar showing DND windows
- "Currently in DND" indicator if current time falls within a rule

### 3. Availability Slots
- Show preferred contact times
- Day of week + time range grid
- Highlight slots that overlap with current time

### 4. Visual Design
- Two-column layout on desktop: Preferences (left) + DND/Availability (right)
- Single column on mobile
- Card with section headers
- Color coding: green = allowed, red = blocked, orange = restricted, gray = not applicable

### 5. Component API

```typescript
interface PrivacyStatusProps {
  preference: PrivacyPreference;
  dndRules: DNDRule[];
  availabilitySlots: AvailabilitySlot[];
  loading?: boolean;
}

// From GraphQL schema
interface PrivacyPreference {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/PrivacyStatusDisplay.tsx
import { CheckCircle2, XCircle, Lock, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const PREFERENCE_ITEMS = [
  { key: 'allowPersonalNotifications', label: 'Personal Notifications', icon: Bell },
  { key: 'allowSPNotifications', label: 'Organization Notifications', icon: Building },
  { key: 'allowAdvertisements', label: 'Advertisements', icon: Megaphone },
  { key: 'allowCallbackRequests', label: 'Callback Requests', icon: PhoneCall },
  { key: 'allowChat', label: 'Chat Messages', icon: MessageSquare },
  { key: 'allowDocumentShares', label: 'Document Sharing', icon: FileText },
];

export function PrivacyStatusDisplay({ preference, dndRules, availabilitySlots }: PrivacyStatusProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h3 className="text-sm font-semibold mb-4">Communication Preferences</h3>
        <div className="space-y-3">
          {PREFERENCE_ITEMS.map(item => {
            const allowed = preference[item.key as keyof PrivacyPreference];
            return (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon size={14} className="text-text-muted" />
                  <span className="text-sm text-text-secondary">{item.label}</span>
                </div>
                {allowed ? (
                  <span className="flex items-center gap-1 text-xs text-status-success"><CheckCircle2 size={14} /> Allowed</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-status-error"><XCircle size={14} /> Blocked</span>
                )}
              </div>
            );
          })}
          {/* Require Call Approval — separate row */}
        </div>
      </Card>
      <Card>
        <h3 className="text-sm font-semibold mb-4">Do Not Disturb</h3>
        {/* DND rules list + availability slots */}
      </Card>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/PrivacyStatusDisplay.tsx` | Create |
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — replace mock policy display in Overview tab |

---

## Acceptance Criteria

- [ ] 7 privacy preference settings displayed with allow/block indicators
- [ ] DND rules shown with day/time ranges
- [ ] Current DND status indicated if active
- [ ] Availability slots displayed as time grid
- [ ] Two-column layout on desktop, single on mobile
- [ ] Data fetched from GraphQL (not mock)
- [ ] Loading skeleton for preference card
- [ ] Color-coded: green = allowed, red = blocked

---

## Dependencies

- **Blocked by**: Task 4.7 (Customer detail page), Task 1.12 (Card), Task 4.13 (GraphQL query with user privacy data)
- **Blocks**: None
- **Related**: Task 4.11 (policy check indicator — pre-send check), Task 4.14 (checkCommunicationPolicy query)
