# Task 1.1 — Customer GraphQL Query Types

> **Phase**: 1 — Gateway: Customer Portal API Surface  
> **Priority**: P0 — Must complete first (before resolvers)  
> **Estimated Scope**: Medium  
> **File**: `gateway/graphql-bff/graph/schema.graphqls`  
> **Status**: ✅ Complete

---

## Objective

Extend the existing GraphQL schema to add **customer-facing query types** that the Web App (Customer Portal) will use to fetch user-specific data. These queries are prefixed with `my*` and use the authenticated user's `x-user-id` from the JWT context — **not** `x-service-provider-id`.

---

## Current State

The schema (`gateway/graphql-bff/graph/schema.graphqls`) currently defines:

- **Provider-facing queries** (20+): `notifications`, `callbackRequests`, `conversations`, `bots`, `campaigns`, `webhookSubscriptions`, `analyticsView`, `teamMembers`, etc.
- **One customer query exists**: `myServiceProviders: [ServiceProvider!]!` (line ~1007)
- **Existing types reusable for customer queries**: `Notification`, `NotificationConnection`, `CallbackRequest`, `CallbackRequestConnection`, `Conversation`, `ConversationConnection`, `DocumentShare`, `PrivacyPreference`, `DNDRule`, `AvailabilitySlot`, `ServiceProvider`, `DashboardSummary`
- **Missing types**: `CustomerDashboardSummary`, `BlockedProviderConnection`, `BlockedProvider`, `DocumentConnection`, `ServiceProviderConnection`

---

## Requirements

### 1. Add Customer-Facing Queries to `type Query`

- [x] Add `myProfile` query returning `UserProfile!` (new type — or reuse `User` type)
- [x] Add `myNotifications` query with `limit`, `offset`, `category`, `status` parameters returning `NotificationConnection!`
- [x] Add `myCallbackRequests` query with `limit`, `offset`, `status` parameters returning `CallbackRequestConnection!`
- [x] Add `myConversations` query with `limit`, `offset`, `status` parameters returning `ConversationConnection!`
- [x] Add `myDocuments` query with `limit`, `offset`, `serviceProviderId`, `classification` parameters returning `DocumentConnection!`
- [x] Add `myServiceProviders` — update existing to accept `limit`, `offset`, `search` parameters returning `ServiceProviderConnection!`
- [x] Add `myPrivacyPreferences` query returning `PrivacyPreference!`
- [x] Add `myDNDRules` query returning `[DNDRule!]!`
- [x] Add `myAvailabilitySlots` query returning `[AvailabilitySlot!]!`
- [x] Add `myBlockedProviders` query with `limit`, `offset` parameters returning `BlockedProviderConnection!`
- [x] Add `myDashboardSummary` query returning `CustomerDashboardSummary!`
- [x] Add `serviceProviderDirectory` query with `limit`, `offset`, `search`, `industry` parameters returning `ServiceProviderConnection!`

### 2. Add New GraphQL Types

- [x] Add `CustomerDashboardSummary` type:
  ```graphql
  type CustomerDashboardSummary {
    unreadNotifications: Int!
    pendingCallbacks: Int!
    activeConversations: Int!
    sharedDocuments: Int!
    blockedProviders: Int!
    dndActive: Boolean!
  }
  ```

- [x] Add `BlockedProviderConnection` type:
  ```graphql
  type BlockedProviderConnection {
    nodes: [BlockedProvider!]!
    totalCount: Int!
  }
  ```

- [x] Add `BlockedProvider` type:
  ```graphql
  type BlockedProvider {
    serviceProvider: ServiceProvider!
    blockedAt: Time!
    reason: String
  }
  ```

- [x] Add `DocumentConnection` type:
  ```graphql
  type DocumentConnection {
    nodes: [DocumentShare!]!
    totalCount: Int!
  }
  ```

- [x] Add `ServiceProviderConnection` type:
  ```graphql
  type ServiceProviderConnection {
    nodes: [ServiceProvider!]!
    totalCount: Int!
  }
  ```

- [x] Add `UserProfile` type (if `User` type is insufficient for customer self-view):
  ```graphql
  type UserProfile {
    id: ID!
    username: String!
    fullName: String!
    email: String
    avatarUrl: String
    timezone: String!
    language: String!
  }
  ```

### 3. Organize Schema Sections

- [x] Add clear section header comment before customer queries:
  ```graphql
  # ─── Customer Portal Queries ────────────────────────────
  ```
- [x] Add clear section header comment before new types:
  ```graphql
  # ─── Customer Portal Types ─────────────────────────────
  ```
- [x] Place customer queries after existing provider queries in `type Query`

---

## Implementation Details

### Query → Backend Service Mapping

| GraphQL Query | Backend Service | gRPC RPC | Proto Package |
|---|---|---|---|
| `myProfile` | user-service | `GetUserProfile(user_id)` | `user.v1` |
| `myNotifications` | notification-service | `ListNotifications(user_id, category, limit, offset, status)` | `notification.v1` |
| `myCallbackRequests` | communication-service | `ListCallbackRequests(user_id, status, limit, offset)` | `communication.v1` |
| `myConversations` | communication-service | `ListConversations(user_id, limit, offset)` | `communication.v1` |
| `myDocuments` | communication-service | `ListDocumentShares(user_id, sp_id, limit, offset)` | `communication.v1` |
| `myServiceProviders` | organization-service | `ListServiceProviders(search, limit, offset)` | `organization.v1` |
| `myPrivacyPreferences` | user-service | `GetPrivacyPreference(user_id)` | `user.v1` |
| `myDNDRules` | user-service | `ListDNDRules(user_id)` | `user.v1` |
| `myAvailabilitySlots` | user-service | `ListAvailabilitySlots(user_id)` | `user.v1` |
| `myBlockedProviders` | user-service | `ListBlockedServiceProviders(user_id)` | `user.v1` |
| `myDashboardSummary` | **multiple services** (aggregation) | Calls notification / communication / user services | multiple |
| `serviceProviderDirectory` | organization-service | `ListServiceProviders(search, industry, limit, offset)` | `organization.v1` |

### Existing Types Being Reused

- `NotificationConnection` — already has `nodes: [Notification!]!` + `totalCount: Int!`
- `CallbackRequestConnection` — already has `nodes: [CallbackRequest!]!` + `totalCount: Int!`
- `ConversationConnection` — already has `nodes: [Conversation!]!` + `totalCount: Int!`
- `PrivacyPreference` — already matches `user.v1.PrivacyPreference` proto
- `DNDRule` — already matches `user.v1.DNDRule` proto
- `AvailabilitySlot` — already matches `user.v1.AvailabilitySlot` proto
- `ServiceProvider` — already matches `organization.v1.ServiceProvider` proto

---

## Verification

- [x] Schema file has no syntax errors (validate with `go run github.com/99designs/gqlgen validate` or `make gqlgen`)
- [x] All new types are properly defined with required fields
- [x] All new queries are in the `type Query` block
- [x] Existing queries/types are untouched
- [x] New types follow existing naming convention (`PascalCase` for types, `camelCase` for fields)
- [x] Connection types follow the `{ nodes: [...], totalCount: Int! }` pattern

---

## Dependencies

- **Blocks**: Task 1.2 (mutations), Task 1.4 (resolver implementation)
- **Blocked by**: Nothing — this is the first task

---

## Relevant Files

| File | Purpose |
|------|---------|
| `gateway/graphql-bff/graph/schema.graphqls` | **Edit** — Add query types and new types |
| `packages/proto/user/v1/user.proto` | **Reference** — User, Privacy, DND, Availability, Blocked RPCs |
| `packages/proto/notification/v1/notification.proto` | **Reference** — ListNotifications RPC |
| `packages/proto/communication/v1/communication.proto` | **Reference** — Callbacks, Conversations, Documents RPCs |
| `packages/proto/organization/v1/organization.proto` | **Reference** — ListServiceProviders RPC |
| `packages/proto/analytics/v1/analytics.proto` | **Reference** — Dashboard aggregation RPCs |
