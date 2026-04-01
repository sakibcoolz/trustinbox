# Task 4.11 — Policy Check Indicator

> **Section**: 4. Customers  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`

---

## Objective

Add a real-time policy check indicator that shows whether a proposed communication with this customer would be allowed before sending, calling the `checkCommunicationPolicy` GraphQL query.

---

## Current State

No policy check indicator exists. The Overview tab has a static "Policy Consent Summary" card with hardcoded boolean values.

---

## Requirements

### 1. Policy Check Widget
- Positioned in the Overview tab or as a persistent sidebar section
- "Check Policy" interactive panel where provider can test a communication scenario
- Selectable parameters: Category (dropdown), Channel (dropdown)
- "Check" button → calls `checkCommunicationPolicy` query
- Results display: allowed/blocked with decision code and applied rules

### 2. GraphQL Integration

```graphql
query CheckPolicy($serviceProviderId: ID!, $category: NotificationCategory!, $channel: String!) {
  checkCommunicationPolicy(
    serviceProviderId: $serviceProviderId
    category: $category
    channel: $channel
  ) {
    allowed       # Boolean
    decisionCode  # "ALLOWED", "BLOCKED_DND", "BLOCKED_PREFERENCE", "RATE_LIMITED"
    reason        # "User is in Do Not Disturb window"
    appliedRules  # ["DND_CHECK", "PREFERENCE_CHECK", "RATE_LIMIT"]
  }
}
```

### 3. Result Display

| Result | Visual |
|--------|--------|
| Allowed | Green card: ✅ "Communication Allowed" — reason text, applied rules |
| Blocked (DND) | Orange card: 🕒 "Blocked: Do Not Disturb" — DND window details |
| Blocked (Preference) | Red card: ❌ "Blocked: User Preference" — which preference blocked |
| Rate Limited | Yellow card: ⚠ "Rate Limited" — current rate, limit, reset time |

### 4. Applied Rules List
- Show each rule that was evaluated as a tag/chip
- Green chip = passed, Red chip = blocked, Gray chip = skipped

### 5. Component API

```typescript
interface PolicyCheckIndicatorProps {
  serviceProviderId: string;
  defaultCategory?: NotificationCategory;
  defaultChannel?: string;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/PolicyCheckIndicator.tsx
import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { CHECK_COMMUNICATION_POLICY } from '@/lib/graphql/customers';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const DECISION_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  ALLOWED: { icon: CheckCircle, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
  BLOCKED_DND: { icon: Clock, color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20' },
  BLOCKED_PREFERENCE: { icon: XCircle, color: 'text-status-error', bg: 'bg-status-error/10 border-status-error/20' },
  RATE_LIMITED: { icon: AlertTriangle, color: 'text-accent-orange', bg: 'bg-accent-orange/10 border-accent-orange/20' },
};

export function PolicyCheckIndicator({ serviceProviderId }: PolicyCheckIndicatorProps) {
  const [category, setCategory] = useState<string>('PERSONAL');
  const [channel, setChannel] = useState<string>('SMS');
  const [check, { data, loading }] = useLazyQuery(CHECK_COMMUNICATION_POLICY);

  const result = data?.checkCommunicationPolicy;
  const config = result ? DECISION_CONFIG[result.decisionCode] : null;

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Shield size={14} /> Policy Check
      </h3>
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="...">
            <option value="PERSONAL">Personal</option>
            <option value="SERVICE_PROVIDER">Organizational</option>
            <option value="ADVERTISEMENT">Advertisement</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-text-muted mb-1">Channel</label>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="...">
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="PUSH">Push</option>
            <option value="IN_APP">In-App</option>
          </select>
        </div>
        <button onClick={() => check({ variables: { serviceProviderId, category, channel } })}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/10 transition-colors">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </div>
      {result && config && (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg}`}>
          <config.icon size={16} className={`${config.color} mt-0.5`} />
          <div>
            <p className={`text-sm font-medium ${config.color}`}>
              {result.allowed ? 'Communication Allowed' : `Blocked: ${result.decisionCode.replace('BLOCKED_', '').replace('_', ' ')}`}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{result.reason}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {result.appliedRules.map((rule: string) => (
                <span key={rule} className={`text-xs px-2 py-0.5 rounded-full ${result.allowed ? 'bg-status-success/10 text-status-success' : 'bg-bg-tertiary text-text-muted'}`}>
                  {rule}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/PolicyCheckIndicator.tsx` | Create |
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — add PolicyCheckIndicator to Overview tab |
| `apps/provider/src/lib/graphql/customers.ts` | Modify — add CHECK_COMMUNICATION_POLICY query |

---

## Acceptance Criteria

- [ ] Category and Channel dropdowns allow scenario selection
- [ ] "Check" button triggers `checkCommunicationPolicy` GraphQL query
- [ ] Result displays allowed/blocked with decision code and reason
- [ ] Applied rules shown as chips
- [ ] Color-coded result cards (green/orange/red/yellow)
- [ ] Loading state during query
- [ ] Updates on each check (not cached)

---

## Dependencies

- **Blocked by**: Task 4.7 (Customer detail page), Task 4.14 (checkCommunicationPolicy query), Task 1.12 (Card)
- **Blocks**: None
- **Related**: Task 4.8 (privacy status display — shows static preferences), Task 5.8 (notification compose policy pre-check)
