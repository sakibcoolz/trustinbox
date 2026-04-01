# Task 11.8 — Export Analytics

> **Section**: 11. Analytics  
> **Priority**: P2 — Utility feature  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add an "Export" button to the analytics page that downloads the current analytics data as a CSV or PDF report. Uses the existing CSV export utility at `apps/provider/src/lib/utils/csv-export.ts`.

---

## Current State

No export functionality on the analytics page. The CSV export utility already exists:

```typescript
// apps/provider/src/lib/utils/csv-export.ts
export function sanitizeCsvField(value: string): string { ... }
export function buildCsvString(headers: string[], rows: string[][]): string { ... }
export function downloadCsv(content: string, filename: string) { ... }
```

---

## Requirements

### 1. Export Button Placement

- In the analytics page header, next to the date range selector
- Dropdown with options: "Export CSV", "Export PDF" (PDF as future)

### 2. CSV Export Content

The CSV should include:

**Summary section:**
- Date range
- Notification totals (sent, delivered, read, rejected)
- Callback totals (requested, approved, rejected, expired)
- Policy breakdown (allowed, DND blocks, preference blocks, rate limited)

**Daily breakdown:**
- All columns from the daily analytics table (Task 11.7)

### 3. Filename Convention

- `analytics_{serviceProviderName}_{from}_{to}.csv`
- e.g. `analytics_acme_corp_2026-03-01_2026-03-31.csv`

### 4. Security

- Use existing `sanitizeCsvField` to prevent CSV injection
- No sensitive data (no PII, user IDs, etc.)

### 5. PDF (Future)

- Show "PDF" option as disabled with "Coming soon" tooltip
- Can be implemented later with a PDF generation library

---

## Implementation Plan

```tsx
import { buildCsvString, downloadCsv, sanitizeCsvField } from '@/lib/utils/csv-export';

function ExportButton({ dateVars, dashboardData, dailyData }: ExportProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  function handleExportCsv() {
    const headers = [
      'Date', 'Notifications Sent', 'Delivered', 'Read',
      'Callbacks Requested', 'Callbacks Approved',
      'Messages Sent', 'Bot Actions', 'Policy Denials', 'Spam Reports',
    ];

    const rows = (dailyData ?? []).map((entry) => [
      entry.date,
      String(entry.notificationsSent),
      String(entry.notificationsDelivered),
      String(entry.notificationsRead),
      String(entry.callbacksRequested),
      String(entry.callbacksApproved),
      String(entry.messagesSent),
      String(entry.botActions),
      String(entry.policyDenials),
      String(entry.spamReports),
    ]);

    const csv = buildCsvString(headers, rows);
    const from = dateVars.from.split('T')[0];
    const to = dateVars.to.split('T')[0];
    downloadCsv(csv, `analytics_${from}_${to}.csv`);
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <button onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors">
        <Download size={14} />
        Export
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-1 bg-bg-surface border border-border-primary rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
          <button onClick={handleExportCsv}
            className="w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors">
            Export CSV
          </button>
          <button disabled
            className="w-full text-left px-3 py-2 text-xs text-text-muted cursor-not-allowed">
            Export PDF (coming soon)
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Add export button in header |

---

## Acceptance Criteria

- [ ] Export button in analytics header
- [ ] Dropdown with "Export CSV" and disabled "Export PDF"
- [ ] CSV includes daily analytics data with all columns
- [ ] CSV uses `sanitizeCsvField` for injection prevention
- [ ] Filename includes date range
- [ ] File downloads immediately on click
- [ ] Dropdown closes after export

---

## Dependencies

- **Blocked by**: Task 11.7 (daily analytics table — provides the data), existing csv-export utility
- **Blocks**: None
- **Related**: Task 13.4 (audit log export — uses same csv-export utility)
