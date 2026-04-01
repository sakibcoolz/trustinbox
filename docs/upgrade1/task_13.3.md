# Task 13.3 — Compliance Checklist

> **Section**: 13. Compliance  
> **Priority**: P1 — Trust & audit  
> **Estimated Scope**: Small  
> **Route**: `/compliance`  
> **Status**: ✅ Complete

---

## Objective

Add a compliance checklist to the Policy Status tab showing required items and their completion status: verified identity, ToS accepted, data processing agreement (DPA) signed, etc.

---

## Requirements

### Checklist Items

| Item | Status Options |
|------|---------------|
| Organization Identity Verified | ✅ Complete / ⏳ Pending / ❌ Not Started |
| Terms of Service Accepted | ✅ Complete / ❌ Not Started |
| Data Processing Agreement Signed | ✅ Complete / ⏳ Under Review / ❌ Not Started |
| Business License Uploaded | ✅ Complete / ❌ Not Started |
| Communication Policy Configured | ✅ Complete / ❌ Not Started |
| Admin Contact Verified | ✅ Complete / ❌ Not Started |
| Webhook Security (HMAC) Configured | ✅ Complete / ⚠️ Optional |

### Display

- Green checkmark for complete items
- Yellow clock for pending items
- Gray circle for not started
- Progress bar showing overall completion (e.g., "5 of 7 complete")

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/compliance/page.tsx` | **Modify** | Add compliance checklist to Policy Status tab |

---

## Acceptance Criteria

- [ ] Checklist with 7+ items
- [ ] Status icons (green/yellow/gray) per item
- [ ] Overall progress bar
- [ ] Items that are actionable link to relevant settings page

---

## Dependencies

- **Blocked by**: Task 13.1 (tab structure), Task 13.7 (org data)
- **Blocks**: None
