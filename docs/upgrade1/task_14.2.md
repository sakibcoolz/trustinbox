# Task 14.2 — Available Integrations Grid

> **Section**: 14. Integrations  
> **Priority**: P2 — Discovery  
> **Estimated Scope**: Medium  
> **Route**: `/integrations`  
> **File**: `apps/provider/src/app/integrations/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add an "Available Integrations" grid showing cards for supported integrations (Slack, Salesforce, HubSpot, Zendesk, Custom) with connection status, and a configure button that opens integration-specific settings.

---

## Current State

The integrations page has a `webhooks` tab and `accounts` tab with mock data, but no dedicated integrations grid.

---

## Requirements

### Integration Cards

| Integration | Icon | Status Options |
|-------------|------|---------------|
| Slack | Slack logo | Connected, Not Connected |
| Salesforce | Salesforce logo | Connected, Not Connected |
| HubSpot | HubSpot logo | Coming Soon |
| Zendesk | Zendesk logo | Coming Soon |
| Custom Webhook | Webhook icon | Connected (link to /webhooks) |

### Card Layout

```
┌──────────────────────┐
│ [Icon]               │
│ Integration Name     │
│ Description          │
│                      │
│ Status: ✅ Connected │
│ [Configure] button   │
└──────────────────────┘
```

### Features

- Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- "Coming Soon" integrations have disabled configure button
- Configure button → opens drawer with integration-specific settings
- Connected integrations show last sync time

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/integrations/page.tsx` | **Modify** | Add integrations grid tab |

---

## Acceptance Criteria

- [ ] Grid shows 5+ integration cards
- [ ] Status badges: Connected (green), Not Connected (gray), Coming Soon (blue)
- [ ] Configure button opens settings drawer
- [ ] Coming Soon integrations disabled
- [ ] Responsive grid layout

---

## Dependencies

- **Blocked by**: Task 14.7 (integration config in organization-service)
- **Blocks**: None
