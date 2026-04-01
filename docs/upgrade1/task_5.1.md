# Task 5.1 — Notification History Table

> **Section**: 5. Notifications  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`

---

## Objective

Upgrade the notification history table from hardcoded mock data to a dynamic, GraphQL-powered table with columns: recipient (virtual ID), subject, category, channel, status, and sent_at.

---

## Current State

```tsx
// apps/provider/src/app/notifications/page.tsx — ~110 lines
const mockNotifications = [
  { id: '1', subject: 'Account verification reminder', type: 'Personal', category: 'Transactional', channel: 'SMS', status: 'Delivered', recipients: 1, sentAt: '2024-03-10 14:30' },
  { id: '2', subject: 'Monthly statement available', type: 'Organizational', category: 'Informational', channel: 'Email', status: 'Delivered', recipients: 2480, sentAt: '2024-03-09 09:00' },
  // ... 4 more hardcoded rows
];
```

**Existing features**: Search input with `useState`, type filter chips (All/Personal/Organizational/Advertisement), 4 stats cards (hardcoded), table with 6 columns, status/type color mappings.

**Issues**:
- All data hardcoded (6 mock rows)
- No pagination
- No expand-to-see-details
- "Recipients" column exists but plan calls for "Recipient (Virtual ID)"
- No sorting on column headers
- Stats cards are hardcoded
- No retry action for failed notifications
- No export

---

## Requirements

### 1. Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| **Recipient** | `notification.recipientVirtualId` or recipient count | Virtual ID for single, count for bulk |
| **Subject** | `notification.title` | Truncate at 50 chars |
| **Category** | `notification.category` | Badge: Personal (blue), Org (purple), Ad (orange) |
| **Channel** | `notification.channel` | SMS, Email, Push, In-App |
| **Status** | `notification.status` | Badge with color from task 5.2 |
| **Sent At** | `notification.createdAt` | Relative time + absolute on hover tooltip |

### 2. Data Integration
- Fetch from `notifications(spId, filters, pagination)` GraphQL query
- Replace `mockNotifications` with live data
- Use `<Table>` component (task 1.13)

### 3. Performance
- Virtual scrolling for lists > 100 rows (task 17.16)
- Table renders within 200ms for 50 rows

### 4. Row Click Behavior
- Click row → expand to show notification details (task 5.4)
- Keyboard: Enter to expand focused row

### 5. Component API

```typescript
interface NotificationHistoryTable {
  notifications: NotificationRow[];
  loading: boolean;
  error?: Error;
  totalCount: number;
  onRowExpand: (id: string) => void;
  expandedId?: string;
}

interface NotificationRow {
  id: string;
  recipientVirtualId: string;
  recipientCount: number;
  subject: string;
  category: NotificationCategory;
  channel: string;
  status: string;
  sentAt: string;
}
```

---

## Implementation Plan

```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/lib/graphql/notifications';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/utils/date';

const categoryVariants: Record<string, string> = {
  PERSONAL: 'blue',
  SERVICE_PROVIDER: 'purple',
  ADVERTISEMENT: 'orange',
};

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useNotifications({
    category: searchParams.get('category'),
    status: searchParams.get('status'),
    search: searchParams.get('q'),
    // pagination from URL
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-text-secondary mt-1">Send and track notifications to your customers</p>
        </div>
        <Link href="/notifications/compose" className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium ...">
          <Plus size={16} /> Compose
        </Link>
      </div>

      {/* Filters (task 5.3) */}
      {/* Stats cards — now from GraphQL */}

      {loading && <TableSkeleton rows={10} cols={6} />}
      {!loading && data?.notifications.nodes.length === 0 && (
        <EmptyState icon={Bell} title="No notifications sent yet" />
      )}
      {!loading && data && (
        <Table>
          {/* ... table content */}
        </Table>
      )}

      {/* Pagination */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/notifications/page.tsx` | Modify — replace mock data with GraphQL, use Table component |

---

## Acceptance Criteria

- [ ] 6-column table: recipient, subject, category, channel, status, sent at
- [ ] Data fetched from GraphQL (not hardcoded)
- [ ] Category badges color-coded (blue/purple/orange)
- [ ] Status badges color-coded (task 5.2)
- [ ] Row click expands notification details (task 5.4)
- [ ] Loading state with skeleton table
- [ ] Empty state with icon + message
- [ ] "Compose" button links to `/notifications/compose`
- [ ] Relative timestamps with absolute on hover

---

## Dependencies

- **Blocked by**: Task 1.13 (Table), Task 1.18 (Badge), Task 1.8 (Skeleton), Task 5.12 (GraphQL notifications query)
- **Blocks**: Task 5.2 (status badges), Task 5.3 (filter bar), Task 5.4 (expand row), Task 5.5 (retry), Task 5.6 (export)
- **Related**: Task 5.15 (subscription for live status updates)
