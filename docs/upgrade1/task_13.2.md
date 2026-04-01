# Task 13.2 — Verification Status Card

> **Section**: 13. Compliance  
> **Priority**: P1 — Trust indicator  
> **Estimated Scope**: Small  
> **Route**: `/compliance`  
> **Status**: ✅ Complete

---

## Objective

Add a verification status card to the compliance page showing the organization's verification badge, documents submitted, pending review items, and verification date.

---

## Current State

No verification status card exists. Data should come from `organization-service` via the `serviceProvider(id)` query which returns org details.

---

## Requirements

### Display

- **Verification Badge**: Large badge — Verified (green shield + checkmark), Pending Review (yellow), Not Verified (gray)
- **Documents Submitted**: Count (e.g., "3 of 4 documents submitted")
- **Pending Review**: List of items awaiting review (e.g., "Business license", "Tax certificate")
- **Verified Date**: When the org was verified (if applicable)

### Card Layout

```
┌──────────────────────────────────────┐
│ 🛡️ Organization Verification         │
│                                       │
│ Status: ✅ Verified                   │
│ Verified: March 1, 2026              │
│ Documents: 4/4 submitted             │
│                                       │
│ No outstanding requirements           │
└──────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/compliance/page.tsx` | **Modify** | Add verification status card to Policy Status tab |

---

## Acceptance Criteria

- [ ] Verification badge (Verified/Pending/Not Verified)
- [ ] Documents submitted count
- [ ] Pending review items listed
- [ ] Verification date displayed
- [ ] Styled consistently with existing compliance page

---

## Dependencies

- **Blocked by**: Task 13.7 (verification status from organization-service)
- **Blocks**: None
