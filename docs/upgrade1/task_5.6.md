# Task 5.6 — Notification Export (CSV)

> **Section**: 5. Notifications  
> **Priority**: P2  
> **Estimated Scope**: Small  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement CSV export of the currently filtered notification history, allowing providers to download notification logs for reporting and compliance.

---

## Current State

No export functionality exists on the notifications page.

---

## Requirements

### 1. Export Button
- Position: rightmost in the header actions area, secondary style
- Icon: `Download` + "Export CSV"
- Visible when `notifications.totalCount > 0`
- Permission: `analytics:read` (ANALYST+ role)

### 2. Export Behavior
- Exports all notifications matching current filters (not just current page)
- Maximum export limit: 10,000 rows (show warning if exceeding)
- Respects current search, status, category, channel, and date range filters
- File name: `notifications_export_YYYY-MM-DD.csv`

### 3. CSV Format

| Column | Source |
|--------|--------|
| ID | `notification.id` |
| Recipient | `notification.recipientVirtualId` (never real phone) |
| Subject | `notification.title` |
| Category | `notification.category` |
| Channel | `notification.channel` |
| Status | `notification.status` |
| Priority | `notification.priority` |
| Sent At | ISO 8601 datetime |
| Delivered At | ISO 8601 datetime (if delivered) |

### 4. Implementation Approach
- Client-side CSV generation (no backend endpoint needed)
- Fetch all matching notifications via GraphQL (paginate through all pages)
- Use Blob + URL.createObjectURL for download
- Show progress indicator if > 1 page of results

### 5. Security
- Never include real phone numbers or PII beyond virtual ID
- Sanitize fields to prevent CSV injection (prefix `=`, `+`, `-`, `@` with `'`)

---

## Implementation Plan

```typescript
// apps/provider/src/lib/utils/csv-export.ts
export function sanitizeCsvField(value: string): string {
  // Prevent CSV injection
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(sanitizeCsvField).join(',');
  const dataLines = rows.map(row => row.map(sanitizeCsvField).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

```tsx
// In notifications/page.tsx
import { Download } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

function ExportButton({ filters }: { filters: NotificationFilters }) {
  const canExport = usePermission('analytics:read');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    // Fetch all pages
    const allNotifications = await fetchAllNotifications(filters);
    const csv = generateCsv(HEADERS, allNotifications.map(notificationToRow));
    downloadCsv(csv, `notifications_export_${new Date().toISOString().split('T')[0]}.csv`);
    setExporting(false);
  }

  if (!canExport) return null;

  return (
    <button onClick={handleExport} disabled={exporting}
      className="flex items-center gap-2 px-3 py-2 text-sm border border-border-secondary rounded-lg text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
      <Download size={14} className={exporting ? 'animate-pulse' : ''} />
      {exporting ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/utils/csv-export.ts` | Create — CSV generation + download utility |
| `apps/provider/src/app/notifications/page.tsx` | Modify — add ExportButton |

---

## Acceptance Criteria

- [ ] Export button visible for ANALYST+ roles
- [ ] Exports all filtered notifications (not just current page)
- [ ] CSV includes: ID, Recipient (virtual ID), Subject, Category, Channel, Status, Priority, timestamps
- [ ] Never exports real phone numbers
- [ ] CSV injection prevention (sanitize special chars)
- [ ] Progress indicator during export
- [ ] File named `notifications_export_YYYY-MM-DD.csv`
- [ ] Maximum 10,000 row limit with warning
- [ ] Respects all current filters

---

## Dependencies

- **Blocked by**: Task 5.1 (Notification table), Task 5.3 (Filter bar — filters applied to export), Task 2.10 (usePermission)
- **Blocks**: None
- **Related**: Task 11.8 (Analytics export — same CSV utility), Task 13.4 (Audit log export)
