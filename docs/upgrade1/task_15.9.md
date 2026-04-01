# Task 15.9 — Team Activity Log

> **Section**: 15. Settings  
> **Priority**: P2 — Audit  
> **Estimated Scope**: Small  
> **Route**: `/settings/team`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the team activity log section to fetch real team actions (logins, role changes, invitations) instead of using the generic `profile.activity()` call.

---

## Current State

Activity log fetches from `profile.activity()` REST endpoint, which returns generic activity items. Should be replaced with team-specific audit data.

---

## Requirements

### Activity Types

| Type | Description |
|------|-------------|
| Member Invited | "Sarah invited john@acme.com as Agent" |
| Invitation Accepted | "John accepted invitation" |
| Role Changed | "Admin changed John's role from Agent to Analyst" |
| Member Removed | "Admin removed John from the team" |
| Login | "John logged in from Chrome/Mac" |

### Display

- Timeline format (keep existing vertical timeline)
- Type-specific icons and colors
- Relative timestamps
- Filter by activity type (optional)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/team/page.tsx` | **Modify** | Replace generic activity with team-specific log |

---

## Acceptance Criteria

- [ ] Team activity fetches from dedicated endpoint/query
- [ ] Shows invite, role change, remove, login events
- [ ] Timeline format preserved
- [ ] Type-specific icons

---

## Dependencies

- **Blocked by**: Task 15.8 (team page GraphQL migration)
- **Blocks**: None
