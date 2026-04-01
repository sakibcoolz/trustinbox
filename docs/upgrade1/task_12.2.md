# Task 12.2 — Create Webhook Form

> **Section**: 12. Webhooks  
> **Priority**: P1 — CRUD  
> **Estimated Scope**: Medium  
> **Route**: `/webhooks`  
> **File**: `apps/provider/src/app/webhooks/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Implement a "Create Webhook" form that collects endpoint URL (validated HTTPS), event type multi-select, secret key auto-generation + display (HMAC signing), and active/paused toggle. Calls `createWebhookSubscription` mutation on submit.

---

## Current State

The "+ Add Webhook" button exists but has no onClick handler and no form.

### GraphQL Schema

```graphql
input CreateWebhookSubscriptionInput {
  serviceProviderId: ID!
  url: String!
  description: String
  events: [String!]!
  secret: String
}

mutation createWebhookSubscription(input: CreateWebhookSubscriptionInput!): WebhookSubscription!
```

---

## Requirements

### Form Fields

| Field | Type | Validation |
|-------|------|------------|
| Endpoint URL | Text input | Required, must start with `https://` |
| Description | Text input | Optional, max 200 chars |
| Event Types | Multi-select checkboxes | At least 1 required |
| Secret Key | Auto-generated + copy | Generated client-side, shown once |
| Status | Toggle | Active (default) / Paused |

### Event Types

```
NotificationDelivered, NotificationFailed, NotificationBlocked,
CallbackCreated, CallbackApproved, CallbackRejected, CallbackCompleted,
MessageReceived, MessageSent,
CampaignLaunched, CampaignCompleted,
BotActionExecuted, BotEscalated
```

### Secret Key Generation

- Generate a 32-byte random hex string client-side
- Display in a "show once" banner with copy button
- Warn user to save the secret (HMAC signing for payload verification)

### Validation

- URL must be valid HTTPS
- At least one event type selected
- Show inline validation errors

---

## Implementation Plan

```tsx
function CreateWebhookForm({ spId, onCreated }: { spId: string; onCreated: () => void }) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [secret] = useState(() => crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), ''));
  const [showSecret, setShowSecret] = useState(false);

  const [createWebhook, { loading }] = useMutation(CREATE_WEBHOOK_SUBSCRIPTION, {
    refetchQueries: [{ query: GET_WEBHOOK_SUBSCRIPTIONS, variables: { serviceProviderId: spId } }],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.startsWith('https://')) return;
    if (events.length === 0) return;
    await createWebhook({
      variables: { input: { serviceProviderId: spId, url, description, events, secret } },
    });
    setShowSecret(true);
    onCreated();
  }

  // ... form JSX
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Add create form toggle |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Modify** | Add CREATE_WEBHOOK_SUBSCRIPTION mutation |

---

## Acceptance Criteria

- [ ] Form validates HTTPS URL
- [ ] Multi-select event type checkboxes (13 event types)
- [ ] Secret key auto-generated (32-byte hex)
- [ ] Secret displayed once with copy button and warning
- [ ] Calls `createWebhookSubscription` mutation
- [ ] Refetches webhook list on success
- [ ] Inline validation errors
- [ ] Cancel button closes form

---

## Dependencies

- **Blocked by**: Task 12.1 (page structure), Task 12.9 (mutations)
- **Blocks**: None
- **Related**: Task 12.3 (edit uses similar form)
