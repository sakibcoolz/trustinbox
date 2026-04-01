# Task 13.5 — Spam Report Summary

> **Section**: 13. Compliance  
> **Priority**: P1 — Trust & safety  
> **Estimated Scope**: Small  
> **Route**: `/compliance`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the spam reports tab to show a summary of spam reports received, trends, impacted communications, and actionable resolution workflow.

---

## Current State

The spam tab has a hardcoded `mockSpamReports` array (3 items) with Reported By, Notification ID, Reason, Status, Reported At, and Resolve/Dismiss actions.

---

## Requirements

### Summary Section

- Total spam reports (period)
- Open reports count
- Trend: increasing/decreasing vs previous period
- Most reported categories
- Impact: number of communications affected

### Reports Table (upgrade existing)

- Fetch from backend instead of mock data
- Columns: Reported By (VID), Notification ID, Reason, Status (Under Review/Resolved/Dismissed), Reported At, Actions
- Status filter: All, Under Review, Resolved, Dismissed
- Resolve action: changes status to Resolved
- Dismiss action: changes status to Dismissed
- Pagination

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/compliance/page.tsx` | **Modify** | Replace mock spam data with live queries, add summary |

---

## Acceptance Criteria

- [ ] Summary section with totals and trends
- [ ] Reports table fetches from backend
- [ ] Status filter (All, Under Review, Resolved, Dismissed)
- [ ] Resolve/Dismiss actions call mutations
- [ ] Pagination
- [ ] Mock data removed

---

## Dependencies

- **Blocked by**: Task 13.1 (tab structure)
- **Blocks**: None
