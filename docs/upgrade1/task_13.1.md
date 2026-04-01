# Task 13.1 — ComplianceViewer Component

> **Section**: 13. Compliance  
> **Priority**: P1 — Core component  
> **Estimated Scope**: Large  
> **Route**: `/compliance`  
> **File**: `apps/provider/src/app/compliance/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the existing compliance page from mock data to a fully functional `ComplianceViewer` with three tabs: **Policy Status**, **Audit Log**, and **Communication Audit**. Currently the page has 143 lines with hardcoded mock data for policy logs, audit timeline, and spam reports.

---

## Current State

`apps/provider/src/app/compliance/page.tsx` (143 lines):
- Three tabs: `policy`, `audit`, `spam`
- `mockPolicyLogs` — 6 hardcoded items (action, result, category, channel, target, reason, time)
- `mockSpamReports` — 3 hardcoded items
- Policy tab: search filter on mock logs, table with Action/Result/Category/Target/Reason/Time columns
- Audit tab: hardcoded timeline (5 events)
- Spam tab: table with Reported By/Notification/Reason/Status/Actions
- Stats cards: hardcoded (Policy Decisions 2,480, Blocked 312, Spam Reports 2, Compliance Score 96.2%)

### Required Tab Structure

1. **Policy Status tab** — org verification status, compliance score, outstanding requirements
2. **Audit Log tab** — all admin actions with actor, action, timestamp, details
3. **Communication Audit tab** — filterable log of all policy decisions with reason codes

---

## Requirements

### Tab 1: Policy Status

| Element | Description |
|---------|-------------|
| Org Verification Badge | Verified (green), Pending (yellow), Not Verified (red) |
| Compliance Score | Percentage with visual ring |
| Outstanding Requirements | Checklist of items needed |
| Documents Submitted | Count of verification documents |

### Tab 2: Audit Log

| Column | Description |
|--------|-------------|
| Timestamp | When the action occurred |
| Actor | Who performed it (name + role) |
| Action | What was done (team change, webhook update, campaign launch, bot config change) |
| Details | Specific details of the action |
| Resource | What was affected |

### Tab 3: Communication Audit

| Column | Description |
|--------|-------------|
| Action | Notification Sent, Blocked, Callback Approved/Rejected, Rate Limited |
| Result | Allowed (green), Blocked (red) |
| Category | Personal, Organizational, Advertisement |
| Channel | SMS, Email, Push, Phone |
| Target | Virtual ID |
| Reason Code | Policy reason for the decision |
| Timestamp | When it occurred |

### Stats Cards (top of page, all tabs)

- Policy Decisions (24h) — from analytics or dedicated endpoint
- Blocked (24h) — count of blocked decisions
- Spam Reports (Open) — count of unresolved spam reports
- Compliance Score — overall compliance percentage

---

## Implementation Plan

- Replace `mockPolicyLogs` with GraphQL query for policy decision logs
- Replace audit timeline with admin action log query
- Replace `mockSpamReports` with spam report query
- Keep existing tab structure but rename tabs to match the plan
- Add search, filter, and pagination to each tab
- Keep existing Lucide icons and styling patterns

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/compliance/page.tsx` | **Modify** | Replace mock data with live queries, restructure tabs |

---

## Acceptance Criteria

- [ ] Three tabs: Policy Status, Audit Log, Communication Audit
- [ ] Policy Status shows verification badge, compliance score, outstanding requirements
- [ ] Audit Log shows admin actions with actor, action, timestamp, details
- [ ] Communication Audit shows filterable policy decision log
- [ ] Stats cards at top (Policy Decisions, Blocked, Spam Reports, Compliance Score)
- [ ] Search/filter on each tab
- [ ] Pagination
- [ ] Loading states
- [ ] All mock data removed

---

## Dependencies

- **Blocked by**: Task 13.6 (audit log data source), Task 13.7 (verification status), Task 13.8 (policy decision logs)
- **Blocks**: Tasks 13.2-13.5
