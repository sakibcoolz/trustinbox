# Task 4.1 — Customer List Table

> **Section**: 4. Customers  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/customers`  
> **File**: `apps/provider/src/app/customers/page.tsx`

---

## Objective

Replace the hardcoded mock customer table with a dynamic, sortable, paginated customer list that fetches data from GraphQL and displays virtual IDs (never real phone numbers), name, last contact date, status, and category.

---

## Current State

```tsx
// apps/provider/src/app/customers/page.tsx — Static mock data
{[
  { name: 'Masked User #a1b2', type: 'Customer', lastContact: '2h ago', notifications: 12, consent: 'Personal + Org', status: 'Active' },
  { name: 'Masked User #c3d4', type: 'Subscriber', lastContact: '1d ago', notifications: 45, consent: 'All', status: 'Active' },
  { name: 'Masked User #e5f6', type: 'Lead', lastContact: '3d ago', notifications: 3, consent: 'Org only', status: 'Active' },
  { name: 'Masked User #g7h8', type: 'Customer', lastContact: '7d ago', notifications: 28, consent: 'None', status: 'Opted Out' },
].map((customer, i) => (
  <tr key={i} className="border-b border-border-primary last:border-0 hover:bg-bg-hover ...">
```

**Issues**:
- Only 4 hardcoded rows — no pagination, no real data
- No `'use client'` directive (no interactivity)
- No sorting on column headers
- No click-through to customer detail page
- No bulk selection checkboxes
- No loading/empty states
- Column set doesn't match plan (missing virtual ID column, "Type" should be "Category")

---

## Requirements

### 1. Table Columns

| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| **Checkbox** | — | No | Bulk select, header = select all |
| **Virtual ID** | `user.virtualPublicId` | Yes | Monospace, never show real phone |
| **Name** | `user.fullName` or display name | Yes | Truncate at 30 chars |
| **Category** | Consent preference mapping | No | Personal, Organizational, Advertisement |
| **Last Contact** | Last notification/message timestamp | Yes (default desc) | Relative time: "2h ago", "3d ago" |
| **Status** | Privacy/consent state | No | Active (green), Blocked (red), DND (orange), Opted Out (gray) |
| **Interactions** | Count of notifications + messages | Yes | Numeric |

### 2. Row Behavior
- Click row → navigate to `/customers/[virtualId]`
- Hover: `bg-bg-hover` transition
- Checkbox click stops propagation (doesn't navigate)
- Status column uses `<Badge>` component (task 1.18)

### 3. Sorting
- Click column header to toggle: unsorted → asc → desc → unsorted
- Show sort icon (ChevronUp/ChevronDown) in active column
- Default sort: Last Contact descending

### 4. Loading & Empty States
- Loading: Use `<TableSkeleton rows={10}>` (task 1.8)
- Empty: Use `<EmptyState icon={Users} title="No customers yet" description="Customers will appear here when they interact with your organization." />` (task 1.9)
- Error: Inline error card with retry button

### 5. Component API

```typescript
interface CustomerRow {
  virtualId: string;
  displayName: string;
  category: 'Personal' | 'Organizational' | 'Advertisement';
  lastContactAt: string; // ISO datetime
  status: 'Active' | 'Blocked' | 'DND' | 'Opted Out';
  interactionCount: number;
}

interface CustomerTableProps {
  customers: CustomerRow[];
  loading: boolean;
  error?: Error;
  sortField: string;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (field: string) => void;
  selectedIds: Set<string>;
  onSelectToggle: (virtualId: string) => void;
  onSelectAll: () => void;
  onRowClick: (virtualId: string) => void;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/app/customers/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { useCustomers } from '@/lib/graphql/customers';
import { useFilters } from '@/hooks/useFilters';
import { Table, TableHeader, TableBody, TableRow, TableCell, SortableHeader } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/utils/date';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState('lastContactAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { filters } = useFilters();
  const { data, loading, error } = useCustomers({
    filters,
    sort: { field: sortField, direction: sortDir },
    pagination: { /* from URL params */ },
  });

  // Row click → detail page
  const handleRowClick = (virtualId: string) => router.push(`/customers/${virtualId}`);

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="p-8">
      {/* Header + Search (task 4.2) + Filters (task 4.3) */}
      {/* Bulk actions toolbar (task 4.6) — shown when selectedIds.size > 0 */}

      {loading && <TableSkeleton rows={10} cols={7} />}
      {error && <ErrorCard error={error} onRetry={refetch} />}
      {!loading && !error && data?.customers.nodes.length === 0 && (
        <EmptyState icon={Users} title="No customers yet" description="Customers will appear here when they interact with your organization." />
      )}
      {!loading && !error && data?.customers.nodes.length > 0 && (
        <Table>
          <TableHeader>
            <SortableHeader field="virtualId" current={sortField} direction={sortDir} onSort={handleSort}>Virtual ID</SortableHeader>
            {/* ... more headers */}
          </TableHeader>
          <TableBody>
            {data.customers.nodes.map(customer => (
              <TableRow key={customer.virtualId} onClick={() => handleRowClick(customer.virtualId)} className="cursor-pointer">
                <TableCell><input type="checkbox" ... /></TableCell>
                <TableCell><code className="font-mono text-xs">{customer.virtualId}</code></TableCell>
                <TableCell>{customer.displayName}</TableCell>
                <TableCell><Badge variant={categoryVariant(customer.category)}>{customer.category}</Badge></TableCell>
                <TableCell>{formatRelativeTime(customer.lastContactAt)}</TableCell>
                <TableCell><Badge variant={statusVariant(customer.status)}>{customer.status}</Badge></TableCell>
                <TableCell className="text-right">{customer.interactionCount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination (task 4.5) */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/customers/page.tsx` | Modify — replace static table with dynamic CustomerTable |
| `apps/provider/src/components/customers/CustomerTable.tsx` | Create — extracted table component |

---

## Acceptance Criteria

- [ ] Table displays virtual IDs (never real phone numbers)
- [ ] 7 columns: checkbox, virtual ID, name, category, last contact, status, interactions
- [ ] Column headers are clickable for sorting with visual indicator
- [ ] Default sort by last contact descending
- [ ] Row click navigates to `/customers/[virtualId]`
- [ ] Checkbox selection works (click doesn't trigger row navigation)
- [ ] Loading state shows skeleton table rows
- [ ] Empty state shows illustration + CTA
- [ ] Error state shows retry card
- [ ] Status badges use correct color coding

---

## Dependencies

- **Blocked by**: Task 1.13 (Table component), Task 1.18 (Badge), Task 1.8 (Skeleton), Task 1.9 (EmptyState), Task 4.13 (GraphQL query)
- **Blocks**: Task 4.2 (search), Task 4.3 (filters), Task 4.4 (sort), Task 4.5 (pagination), Task 4.6 (bulk actions)
- **Related**: Task 4.7 (customer detail page)
