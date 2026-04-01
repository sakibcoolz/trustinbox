# Task 16.2 — Subscription Connections

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P1 — Live updates  
> **Estimated Scope**: Large  
> **File**: Multiple subscription hooks  
> **Status**: ✅ Complete

---

## Objective

Wire all 6 provider-specific subscriptions to their respective pages, updating UI in real-time when events arrive.

---

## GraphQL Schema

```graphql
type Subscription {
  providerNotificationDelivered(serviceProviderId: ID!): Notification!
  providerCallbackRequestCreated(serviceProviderId: ID!): CallbackRequest!
  providerMessageReceived(serviceProviderId: ID!): Message!
  providerWebhookDeliveryCompleted(serviceProviderId: ID!): WebhookDelivery!
  providerBotActionExecuted(serviceProviderId: ID!): BotActionLog!
  providerCampaignProgressUpdated(serviceProviderId: ID!): Campaign!
}
```

---

## Requirements

### Subscription → Page Mapping

| Subscription | Target Page | Update Action |
|-------------|------------|---------------|
| `providerNotificationDelivered` | `/notifications`, Dashboard | Update notification table row status, increment dashboard KPIs |
| `providerCallbackRequestCreated` | `/callbacks`, Dashboard | Add new row to callback table, show toast, increment KPI |
| `providerMessageReceived` | `/conversations` | Update conversation list, increment unread badge |
| `providerWebhookDeliveryCompleted` | `/webhooks` | Add to delivery log (Task 12.11) |
| `providerBotActionExecuted` | `/bots/[id]` | Add to bot activity log |
| `providerCampaignProgressUpdated` | `/campaigns/[id]` | Update progress bar and delivery counts |

### Implementation Pattern

Each subscription should:
1. Be defined in the relevant GraphQL file (e.g., `notifications.ts`, `callbacks.ts`)
2. Have a hook: `useProviderXxxSubscription(spId, onData)`
3. Subscribe when the page mounts, unsubscribe on unmount
4. Update Apollo cache or trigger refetch

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/notifications.ts` | **Modify** | Add notification subscription |
| `apps/provider/src/lib/graphql/callbacks.ts` | **Modify** | Add callback subscription |
| `apps/provider/src/lib/graphql/conversations.ts` | **Modify** | Add message subscription |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add webhook delivery subscription |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add bot action subscription |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add campaign progress subscription |

---

## Acceptance Criteria

- [ ] All 6 subscriptions defined with correct fields
- [ ] Hooks for each subscription
- [ ] Subscribe on mount, unsubscribe on unmount
- [ ] Cache updates or refetch on event
- [ ] Dashboard KPIs update from notification + callback subscriptions

---

## Dependencies

- **Blocked by**: Task 16.1 (WebSocket link)
- **Blocks**: None
