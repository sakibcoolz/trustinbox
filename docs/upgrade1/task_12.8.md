# Task 12.8 — Webhook Health Indicator

> **Section**: 12. Webhooks  
> **Priority**: P2 — Monitoring  
> **Estimated Scope**: Small  
> **Route**: `/webhooks`  
> **Status**: ✅ Complete

---

## Objective

Add a health indicator badge to each webhook in the table showing success rate and last successful delivery timestamp. Visually flag unhealthy webhooks.

---

## Current State

No health indicator exists. The schema provides `failureCount`, `lastDeliveryAt`, and `lastFailureAt`.

---

## Requirements

### Health Badge

- **Healthy** (green): `failureCount === 0` and `lastDeliveryAt` within last 24h
- **Degraded** (yellow): `failureCount > 0 && failureCount < 5`
- **Unhealthy** (red): `failureCount >= 5` or `lastFailureAt` more recent than `lastDeliveryAt`

### Display

- Health dot (colored circle) next to webhook URL
- Tooltip with details: "Success rate: 99.2% | Last delivery: 5 min ago | Failures: 2"
- In the table, a dedicated "Health" column

### Compute Success Rate

- From delivery log data or estimate: `(totalDeliveries - failureCount) / totalDeliveries * 100`
- If no delivery data, show "No deliveries"

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add health indicator column |

---

## Acceptance Criteria

- [ ] Health dot next to each webhook (green/yellow/red)
- [ ] Tooltip with success rate, last delivery, failure count
- [ ] Health column in table
- [ ] Computed from `failureCount`, `lastDeliveryAt`, `lastFailureAt`

---

## Dependencies

- **Blocked by**: Task 12.1 (table with live data)
- **Blocks**: None
