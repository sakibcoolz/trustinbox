# Task 13.4 — Export Audit Log

> **Section**: 13. Compliance  
> **Priority**: P2 — Regulatory  
> **Estimated Scope**: Small  
> **Route**: `/compliance`  
> **Status**: ✅ Complete

---

## Objective

Add a CSV export button to the Audit Log and Communication Audit tabs for regulatory compliance. Uses the existing `csv-export.ts` utility.

---

## Current State

`apps/provider/src/lib/utils/csv-export.ts` already has `sanitizeCsvField`, `buildCsvString`, `downloadCsv`.

---

## Requirements

### Audit Log Export

- Headers: Timestamp, Actor, Action, Details, Resource
- Filename: `audit_log_{spName}_{from}_{to}.csv`

### Communication Audit Export

- Headers: Timestamp, Action, Result, Category, Channel, Target, Reason Code
- Filename: `communication_audit_{spName}_{from}_{to}.csv`

### Security

- Use `sanitizeCsvField` for all values (CSV injection prevention)
- No PII in export (virtual IDs only, no real phone numbers)
- Export button only visible to SP_ADMIN role

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/compliance/page.tsx` | **Modify** | Add export buttons to Audit Log and Communication Audit tabs |

---

## Acceptance Criteria

- [ ] Export button on Audit Log tab
- [ ] Export button on Communication Audit tab
- [ ] CSV uses sanitized fields
- [ ] Filenames include date range
- [ ] SP_ADMIN role guard on export

---

## Dependencies

- **Blocked by**: Task 13.1 (tab structure), existing csv-export utility
- **Blocks**: None
- **Related**: Task 11.8 (analytics export — same pattern)
