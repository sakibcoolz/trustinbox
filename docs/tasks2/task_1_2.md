# Task 1.2 — Customer GraphQL Mutations

> **Phase**: 1 — Gateway: Customer Portal API Surface  
> **Priority**: P0 — Must complete alongside Task 1.1  
> **Estimated Scope**: Medium  
> **File**: `gateway/graphql-bff/graph/schema.graphqls`  
> **Status**: ✅ Complete

---

## Objective

Add **customer-facing mutations** to the GraphQL schema that the Web App will use to update user preferences, manage DND rules, handle callback requests, and interact with notifications. These mutations operate on the authenticated user's own data (via `x-user-id` from JWT).

---

## Current State

The schema already defines several mutations that overlap with customer needs:

### Existing Mutations (Reusable As-Is)
| Mutation | Status | Notes |
|----------|--------|-------|
| `updatePrivacyPreference(input: UpdatePrivacyPreferenceInput!)` | ✅ Exists | Can be reused for customer — uses `user_id` from context |
| `createDNDRule(input: CreateDNDRuleInput!)` | ✅ Exists | Already matches customer need |
| `updateDNDRule(input: UpdateDNDRuleInput!)` | ✅ Exists | Already matches customer need |
| `deleteDNDRule(id: ID!)` | ✅ Exists | Already matches customer need |
| `createAvailabilitySlot(input: CreateAvailabilitySlotInput!)` | ✅ Exists | Already matches customer need |
| `deleteAvailabilitySlot(id: ID!)` | ✅ Exists | Already matches customer need |
| `approveCallbackRequest(input: ApproveCallbackRequestInput!)` | ✅ Exists | Uses `callbackRequestId` + slots |
| `rejectCallbackRequest(input: RejectCallbackRequestInput!)` | ✅ Exists | Uses `callbackRequestId` + reason |
| `blockServiceProvider(serviceProviderId: ID!)` | ✅ Exists | No reason field currently |
| `unblockServiceProvider(serviceProviderId: ID!)` | ✅ Exists | Already matches customer need |
| `markNotificationAsRead(id: ID!)` | ✅ Exists | Already matches customer need |
| `archiveNotification(id: ID!)` | ✅ Exists | Already matches customer need |
| `reportSpam(input: ReportSpamInput!)` | ✅ Exists | Already matches customer need |
| `sendMessage(input: SendMessageInput!)` | ✅ Exists | Already matches customer need |

### Mutations That Need to Be Added
| Mutation | Reason |
|----------|--------|
| `updateMyProfile` | No profile update mutation exists |
| `updateMyAvatar` | No avatar update mutation exists |
| `markAllNotificationsRead` | Bulk action not available |
| `blockServiceProvider` (with reason) | Existing mutation lacks `reason` field |

### Input Types That Need Changes
| Input | Change Needed |
|-------|---------------|
| `UpdateProfileInput` | **New** — for `updateMyProfile` |
| `blockServiceProvider` | Add optional `reason: String` parameter |

---

## Requirements

### 1. Add New Customer Mutations to `type Mutation`

- [x] Add `updateMyProfile(input: UpdateProfileInput!): UserProfile!`
  - Calls: `user-service.UpdateUserProfile` with `user_id` from JWT context
  - Proto: `UpdateUserProfileRequest { user_id, full_name, avatar_url, timezone, language }`

- [x] Add `updateMyAvatar(url: String!): UserProfile!`
  - Calls: `user-service.UpdateUserProfile` with only `avatar_url` field
  - Alternative: could be part of `updateMyProfile` — but separate for UX (avatar upload flow)

- [x] Add `markAllNotificationsRead: Boolean!`
  - Calls: `notification-service.ListNotifications` (to get unread) then batch `MarkAsRead` per notification
  - Or: add a dedicated `MarkAllAsRead` RPC to notification-service proto (preferred)
  - Fallback: iterate unread notifications and mark each

### 2. Modify Existing Mutations

- [x] Update `blockServiceProvider` signature to include optional `reason`:
  ```graphql
  # Before:
  blockServiceProvider(serviceProviderId: ID!): Boolean!
  
  # After:
  blockServiceProvider(serviceProviderId: ID!, reason: String): Boolean!
  ```
  - Proto: `BlockServiceProviderRequest { user_id, service_provider_id }` — may need `reason` field added to proto too

### 3. Add New Input Types

- [x] Add `UpdateProfileInput`:
  ```graphql
  input UpdateProfileInput {
    firstName: String
    lastName: String
    avatarUrl: String
    timezone: String
    language: String
  }
  ```
  - All fields optional — partial updates
  - Maps to `user.v1.UpdateUserProfileRequest` (note: proto uses `full_name` not split first/last — decide approach)

### 4. Organize Schema Sections

- [x] Add clear section header:
  ```graphql
  # ─── Customer Portal Mutations ──────────────────────────
  ```
- [x] Place after existing provider mutations in `type Mutation` block

---

## Implementation Details

### Mutation → Backend Service Mapping

| GraphQL Mutation | Backend Service | gRPC RPC | Input → Proto Mapping |
|---|---|---|---|
| `updateMyProfile` | user-service | `UpdateUserProfile` | `UpdateProfileInput` → `UpdateUserProfileRequest { user_id (from ctx), full_name, avatar_url, timezone, language }` |
| `updateMyAvatar` | user-service | `UpdateUserProfile` | `url` → `UpdateUserProfileRequest { user_id (from ctx), avatar_url: url }` |
| `markAllNotificationsRead` | notification-service | `MarkAsRead` (batched) | user_id from ctx, fetch unread → mark each |
| `blockServiceProvider` | user-service | `BlockServiceProvider` | `{ user_id (from ctx), service_provider_id, reason }` |
| `updatePrivacyPreference` | user-service | `UpdatePrivacyPreference` | Existing input → `UpdatePrivacyPreferenceRequest { user_id (from ctx), ...fields }` |
| `createDNDRule` | user-service | `CreateDNDRule` | Existing input → `CreateDNDRuleRequest { user_id (from ctx), ...fields }` |
| `deleteDNDRule` | user-service | `DeleteDNDRule` | `id` → `DeleteDNDRuleRequest { rule_id, user_id (from ctx) }` |
| `createAvailabilitySlot` | user-service | `CreateAvailabilitySlot` | Existing input → `CreateAvailabilitySlotRequest { user_id (from ctx), ...fields }` |
| `deleteAvailabilitySlot` | user-service | `DeleteAvailabilitySlot` | `id` → `DeleteAvailabilitySlotRequest { slot_id, user_id (from ctx) }` |
| `approveCallbackRequest` | communication-service | `ApproveCallbackRequest` | Existing input → `ApproveCallbackRequestRequest { callback_request_id, user_id (from ctx), approved_slot_start, approved_slot_end }` |
| `rejectCallbackRequest` | communication-service | `RejectCallbackRequest` | Existing input → `RejectCallbackRequestRequest { callback_request_id, user_id (from ctx), reason }` |
| `markNotificationAsRead` | notification-service | `MarkAsRead` | `id` → `MarkAsReadRequest { notification_id, user_id (from ctx) }` |
| `archiveNotification` | notification-service | `ArchiveNotification` | `id` → `ArchiveNotificationRequest { notification_id, user_id (from ctx) }` |
| `unblockServiceProvider` | user-service | `UnblockServiceProvider` | `serviceProviderId` → `UnblockServiceProviderRequest { user_id (from ctx), service_provider_id }` |

### Key Design Decision: user_id Injection

All customer mutations inject `user_id` from the JWT context — the client **never** passes their own user ID. This prevents IDOR (Insecure Direct Object Reference) attacks.

```go
// Resolver pattern:
func (r *mutationResolver) UpdateMyProfile(ctx context.Context, input model.UpdateProfileInput) (*model.UserProfile, error) {
    userID := requestctx.UserID(ctx)  // Always from JWT — never from client input
    // ...
}
```

---

## Verification

- [x] Schema file validates with `make gqlgen` or gqlgen validate
- [x] All new mutations are in the `type Mutation` block
- [x] New `UpdateProfileInput` type is defined in schema
- [x] `blockServiceProvider` mutation updated with optional `reason` parameter
- [x] No duplicate mutation names
- [ ] All mutations return appropriate types (not void — GraphQL doesn't have void)
- [ ] Existing mutations remain untouched (avoid breaking provider portal)

---

## Dependencies

- **Blocks**: Task 1.4 (resolver implementation)
- **Depends on**: Task 1.1 (new types like `UserProfile` must be defined first)
- **Proto consideration**: If `BlockServiceProviderRequest` needs a `reason` field, update `packages/proto/user/v1/user.proto` and regenerate (`make proto`)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `gateway/graphql-bff/graph/schema.graphqls` | **Edit** — Add mutations and input types |
| `packages/proto/user/v1/user.proto` | **Reference** — User RPCs for profile, privacy, DND, availability, blocked |
| `packages/proto/notification/v1/notification.proto` | **Reference** — MarkAsRead, ArchiveNotification RPCs |
| `packages/proto/communication/v1/communication.proto` | **Reference** — Approve/Reject callback RPCs |

---

## Notes

- Most mutations already exist in the schema — the customer resolvers will just inject `user_id` from JWT context instead of requiring it as input.
- The `markAllNotificationsRead` mutation is new and has no corresponding batch RPC. Implementation options:
  1. Add `MarkAllAsRead` RPC to notification-service proto (cleanest)
  2. Fetch unread list → batch individual `MarkAsRead` calls (works but N+1)
  3. Implement in resolver with a database-level batch update via gateway direct DB access (anti-pattern — avoid)
- Recommendation: Option 1 (new proto RPC) for clean architecture, but Option 2 as interim if proto changes are deferred.
