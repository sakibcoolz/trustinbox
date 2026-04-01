# Task 14.4 — Rate Limit Dashboard

> **Section**: 14. Integrations  
> **Priority**: P2 — Monitoring  
> **Estimated Scope**: Small  
> **Route**: `/integrations`  
> **Status**: ✅ Complete

---

## Objective

Add a rate limit dashboard showing current API usage vs limits and throttle warnings.

---

## Requirements

### Display

- Current usage bar (e.g., "4,200 / 10,000 requests today")
- Progress bar colored: green (< 70%), yellow (70-90%), red (> 90%)
- Per-scope breakdown if available
- Throttle warning banner when approaching limit (> 80%)
- Reset time indicator (e.g., "Resets in 4h 22m")

### Layout

- Summary card at top of integrations page or in a dedicated sub-tab
- Visible to SP_ADMIN role

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/integrations/page.tsx` | **Modify** | Add rate limit dashboard |

---

## Acceptance Criteria

- [ ] Usage vs limit display with progress bar
- [ ] Color-coded progress (green/yellow/red)
- [ ] Throttle warning banner at > 80%
- [ ] Reset time indicator
- [ ] SP_ADMIN role guard

---

## Dependencies

- **Blocked by**: Task 14.5 (API usage metrics from backend)
- **Blocks**: None
