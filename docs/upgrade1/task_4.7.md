# Task 4.7 — Customer Detail Page (Profile Card)

> **Section**: 4. Customers  
> **Priority**: P0  
> **Estimated Scope**: Large  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Upgrade the customer detail page to fetch real data from GraphQL, display a profile card with virtual ID, display name, and avatar, and serve as the container for the tabbed detail view.

---

## Current State

```tsx
// apps/provider/src/app/customers/[virtualId]/page.tsx — 160+ lines
const mockCustomer = {
  virtualId: 'VID-8a3f2b',
  displayName: 'Virtual User #8a3f2b',
  userType: 'Customer',
  joinedAt: '2024-01-15',
  lastContact: '2024-03-10',
  consentStatus: 'Active',
  policies: {
    personalNotifications: true,
    orgNotifications: true,
    advertisements: false,
    callbacksAllowed: true,
  },
};
```

**Existing features**: Back button, 4 summary cards (name, type, last contact, consent), 3-tab interface (overview, notifications, callbacks) with mock data, StatusBadge component.

**Issues**: All data hardcoded, no GraphQL integration, no avatar, no loading/error states, `virtualId` from params not used for data fetching.

---

## Requirements

### 1. Profile Header Card
- Avatar: Generated from initials or default `User` icon
- Virtual ID: Monospace, `VID-xxxxxxxx` format
- Display name: Large text
- Customer type badge: "Customer", "Subscriber" etc.
- Joined date: Relative time
- Last contact: Relative time
- Consent status: Color-coded badge

### 2. Summary Stats (4 cards)
| Card | Data Source |
|------|------------|
| Total Notifications | Count from customer notification history |
| Delivered vs Failed | Success/failure counts |
| Callbacks | Count of callback requests |
| Documents Shared | Count of shared documents |

### 3. GraphQL Integration

```graphql
# Derive customer from conversation participant
query CustomerDetail($virtualId: String!) {
  conversations(participantVirtualId: $virtualId, first: 1) {
    nodes {
      id
    }
    totalCount
  }
  # The customer's notifications for this SP
  notifications(recipientVirtualId: $virtualId) {
    totalCount
    nodes {
      status
    }
  }
  callbackRequests(virtualId: $virtualId) {
    totalCount
  }
  checkCommunicationPolicy(
    serviceProviderId: $spId
    category: PERSONAL
    channel: "SMS"
  ) {
    allowed
    decisionCode
  }
}
```

### 4. Loading & Error States
- Skeleton profile card during load
- Error boundary with retry for failed fetch
- 404 handling if virtual ID not found

### 5. Tab Navigation (preserved)
- Overview (task 4.8 — policy consent display)
- Notifications (customer's notification history)
- Callbacks (customer's callback history)
- Add: Conversations, Documents tabs

### 6. Action Buttons (on profile header)
- "Send Notification" → `/notifications/compose?recipient=VID-xxxx`
- "Request Callback" → opens callback creation modal
- "Start Conversation" → `/conversations/new?recipient=VID-xxxx`
- "Share Document" → opens document share modal

---

## Implementation Plan

```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { CUSTOMER_DETAIL_QUERY } from '@/lib/graphql/customers';
import { ArrowLeft, User, Bell, PhoneCall, MessageSquare, FileText, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/utils/date';

export default function CustomerDetailPage({ params }: { params: Promise<{ virtualId: string }> }) {
  const { virtualId } = use(params);
  const { data, loading, error } = useQuery(CUSTOMER_DETAIL_QUERY, {
    variables: { virtualId },
  });

  if (loading) return <CustomerDetailSkeleton />;
  if (error) return <ErrorCard error={error} />;

  return (
    <div className="p-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
              <User size={20} className="text-text-muted" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{data.customer.displayName}</h1>
              <code className="text-xs font-mono text-text-muted">{virtualId}</code>
            </div>
          </div>
        </div>
        {/* Quick action buttons (task 4.10) */}
      </div>

      {/* Summary cards */}
      {/* Tabs: overview | notifications | callbacks | conversations | documents */}
      {/* Tab content */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — replace mock with GraphQL + dynamic profile |
| `apps/provider/src/lib/graphql/customers.ts` | Create — customer queries and hooks |

---

## Acceptance Criteria

- [ ] Profile header shows avatar, virtual ID (monospace), display name, type badge
- [ ] 4 summary stat cards with real data
- [ ] Back button navigates to `/customers`
- [ ] Loading state shows skeleton
- [ ] Error state shows error card with retry
- [ ] Tab navigation works (overview, notifications, callbacks)
- [ ] Quick action buttons visible on header
- [ ] Virtual ID from URL used for data fetch (never real phone)

---

## Dependencies

- **Blocked by**: Task 1.12 (Card), Task 1.18 (Badge), Task 4.13 (GraphQL customer query)
- **Blocks**: Task 4.8 (privacy status), Task 4.9 (timeline), Task 4.10 (quick actions), Task 4.11 (policy check), Task 4.12 (notes)
- **Related**: Task 4.1 (customer list links here)
