# Task 2.3 — Create GraphQL Query Files

> **Phase**: 2 — Web App: Foundation & Data Layer
> **Directory**: `apps/web/src/lib/graphql/` (new)
> **Reference**: `gateway/graphql-bff/graph/schema.graphqls`

---

## Objective

Create a complete set of GraphQL query and mutation definitions for all customer-facing data domains. These files define the `gql` tagged template literals that the custom data hooks (Task 2.4) will consume. All queries must match the gateway's GraphQL schema exactly.

---

## Current State

- **Directory `apps/web/src/lib/graphql/` does NOT exist** — needs to be created
- No GraphQL query files exist anywhere in the web app
- The web app currently fetches all data via REST (`fetch()` calls to `/api/*` endpoints)
- The GraphQL schema at `gateway/graphql-bff/graph/schema.graphqls` defines all available queries and mutations

---

## Requirements

### Directory Structure
- [x] Create `apps/web/src/lib/graphql/` directory
- [x] Create the following 8 files:

### File: `notifications.ts`
- [x] `MY_NOTIFICATIONS` — query `notifications(category, status, limit, offset)` → `NotificationConnection`
- [x] `MY_NOTIFICATION` — query `notification(id)` → `Notification`
- [x] `MARK_NOTIFICATION_READ` — mutation `markNotificationAsRead(id)` → `Boolean`
- [x] `ARCHIVE_NOTIFICATION` — mutation `archiveNotification(id)` → `Boolean`

### File: `callbacks.ts`
- [x] `MY_CALLBACKS` — query `callbackRequests(status, limit, offset)` → `CallbackRequestConnection`
- [x] `MY_CALLBACK` — query `callbackRequest(id)` → `CallbackRequest`
- [x] `APPROVE_CALLBACK` — mutation `approveCallbackRequest(input)` → `CallbackRequest`
- [x] `REJECT_CALLBACK` — mutation `rejectCallbackRequest(input)` → `CallbackRequest`

### File: `conversations.ts`
- [x] `MY_CONVERSATIONS` — query `conversations(limit, offset)` → `ConversationConnection`
- [x] `MY_CONVERSATION` — query `conversation(id)` → `Conversation` with nested `messages`

### File: `documents.ts`
- [x] `MY_DOCUMENTS` — query for user's shared documents (if schema supports it)
- [x] Note: Schema has `DocumentShare` type — check if a query exists; if not, defer to Phase 3

### File: `service-providers.ts`
- [x] `MY_SERVICE_PROVIDERS` — query `myServiceProviders` → `[ServiceProvider!]!`
- [x] `SP_DIRECTORY` — query `serviceProviders(search, limit, offset)` → `[ServiceProvider!]!`
- [x] `SERVICE_PROVIDER` — query `serviceProvider(id)` → `ServiceProvider`
- [x] `BLOCK_SP` — mutation `blockServiceProvider(serviceProviderId)` → `Boolean`
- [x] `UNBLOCK_SP` — mutation `unblockServiceProvider(serviceProviderId)` → `Boolean`
- [x] `REPORT_SPAM` — mutation `reportSpam(input)` → `Boolean`

### File: `settings.ts`
- [x] `MY_PRIVACY_PREFERENCES` — part of `me` query → `User.privacyPreference`
- [x] `UPDATE_PRIVACY` — mutation `updatePrivacyPreference(input)` → `PrivacyPreference`
- [x] `MY_DND_RULES` — part of `me` query → `User.dndRules`
- [x] `CREATE_DND_RULE` — mutation `createDNDRule(input)` → `DNDRule`
- [x] `UPDATE_DND_RULE` — mutation `updateDNDRule(input)` → `DNDRule`
- [x] `DELETE_DND_RULE` — mutation `deleteDNDRule(id)` → `Boolean`
- [x] `MY_AVAILABILITY_SLOTS` — part of `me` query → `User.availabilitySlots`
- [x] `CREATE_AVAILABILITY_SLOT` — mutation `createAvailabilitySlot(input)` → `AvailabilitySlot`
- [x] `DELETE_AVAILABILITY_SLOT` — mutation `deleteAvailabilitySlot(id)` → `Boolean`

### File: `dashboard.ts`
- [x] `DASHBOARD_SUMMARY` — query `dashboardSummary` → `DashboardSummary`

### File: `profile.ts`
- [x] `MY_PROFILE` — query `me` → `User` with all fields (profile, privacy, DND, availability)

---

## Implementation Details

### Pattern — All files follow this pattern:
```typescript
import { gql } from '@apollo/client';

export const QUERY_NAME = gql`
  query QueryName($param: Type) {
    queryField(param: $param) {
      field1
      field2
      nested {
        nestedField
      }
    }
  }
`;
```

### notifications.ts
```typescript
import { gql } from '@apollo/client';

export const MY_NOTIFICATIONS = gql`
  query MyNotifications($category: NotificationCategory, $status: String, $limit: Int, $offset: Int) {
    notifications(category: $category, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        category
        title
        body
        priority
        status
        metadata
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const MY_NOTIFICATION = gql`
  query MyNotification($id: ID!) {
    notification(id: $id) {
      id
      category
      title
      body
      priority
      status
      metadata
      serviceProvider {
        id
        name
        industry
        verificationStatus
      }
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`;

export const ARCHIVE_NOTIFICATION = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id)
  }
`;
```

### callbacks.ts
```typescript
import { gql } from '@apollo/client';

export const MY_CALLBACKS = gql`
  query MyCallbacks($status: CallbackRequestStatus, $limit: Int, $offset: Int) {
    callbackRequests(status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        serviceProvider { id name industry }
        reason
        details
        status
        requestedAt
        respondedAt
        approvedSlotStart
        approvedSlotEnd
      }
      totalCount
    }
  }
`;

export const APPROVE_CALLBACK = gql`
  mutation ApproveCallback($input: ApproveCallbackRequestInput!) {
    approveCallbackRequest(input: $input) {
      id
      status
      approvedSlotStart
      approvedSlotEnd
      respondedAt
    }
  }
`;

export const REJECT_CALLBACK = gql`
  mutation RejectCallback($input: RejectCallbackRequestInput!) {
    rejectCallbackRequest(input: $input) {
      id
      status
      respondedAt
    }
  }
`;
```

### service-providers.ts
```typescript
import { gql } from '@apollo/client';

export const MY_SERVICE_PROVIDERS = gql`
  query MyServiceProviders {
    myServiceProviders {
      id
      slug
      name
      industry
      description
      verificationStatus
      status
    }
  }
`;

export const SP_DIRECTORY = gql`
  query SPDirectory($search: String, $limit: Int, $offset: Int) {
    serviceProviders(search: $search, limit: $limit, offset: $offset) {
      id
      slug
      name
      industry
      description
      verificationStatus
      status
      website
    }
  }
`;

export const BLOCK_SP = gql`
  mutation BlockServiceProvider($serviceProviderId: ID!) {
    blockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;

export const UNBLOCK_SP = gql`
  mutation UnblockServiceProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;
```

### settings.ts
```typescript
import { gql } from '@apollo/client';

export const MY_PRIVACY_PREFERENCES = gql`
  query MyPrivacyPreferences {
    me {
      id
      privacyPreference {
        allowPersonalNotifications
        allowSPNotifications
        allowAdvertisements
        allowCallbackRequests
        allowChat
        allowDocumentShares
        requireCallApproval
      }
    }
  }
`;

export const UPDATE_PRIVACY = gql`
  mutation UpdatePrivacy($input: UpdatePrivacyPreferenceInput!) {
    updatePrivacyPreference(input: $input) {
      allowPersonalNotifications
      allowSPNotifications
      allowAdvertisements
      allowCallbackRequests
      allowChat
      allowDocumentShares
      requireCallApproval
    }
  }
`;

export const MY_DND_RULES = gql`
  query MyDNDRules {
    me {
      id
      dndRules {
        id
        scopeType
        scopeRefId
        startTime
        endTime
        daysOfWeek
        isActive
      }
    }
  }
`;

export const CREATE_DND_RULE = gql`
  mutation CreateDNDRule($input: CreateDNDRuleInput!) {
    createDNDRule(input: $input) {
      id
      scopeType
      scopeRefId
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
`;

export const DELETE_DND_RULE = gql`
  mutation DeleteDNDRule($id: ID!) {
    deleteDNDRule(id: $id)
  }
`;

export const MY_AVAILABILITY_SLOTS = gql`
  query MyAvailabilitySlots {
    me {
      id
      availabilitySlots {
        id
        dayOfWeek
        startTime
        endTime
        slotType
        isActive
      }
    }
  }
`;

export const CREATE_AVAILABILITY_SLOT = gql`
  mutation CreateAvailabilitySlot($input: CreateAvailabilitySlotInput!) {
    createAvailabilitySlot(input: $input) {
      id
      dayOfWeek
      startTime
      endTime
      slotType
      isActive
    }
  }
`;

export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
```

### dashboard.ts
```typescript
import { gql } from '@apollo/client';

export const DASHBOARD_SUMMARY = gql`
  query DashboardSummary {
    dashboardSummary {
      unreadPersonal
      unreadServiceProvider
      unreadAdvertisements
      pendingCallbackRequests
      totalConversations
    }
  }
`;
```

### profile.ts
```typescript
import { gql } from '@apollo/client';

export const MY_PROFILE = gql`
  query MyProfile {
    me {
      id
      username
      fullName
      email
      virtualPublicId
      avatarUrl
      timezone
      language
      privacyPreference {
        allowPersonalNotifications
        allowSPNotifications
        allowAdvertisements
        allowCallbackRequests
        allowChat
        allowDocumentShares
        requireCallApproval
      }
      dndRules {
        id
        scopeType
        scopeRefId
        startTime
        endTime
        daysOfWeek
        isActive
      }
      availabilitySlots {
        id
        dayOfWeek
        startTime
        endTime
        slotType
        isActive
      }
    }
  }
`;
```

---

## Schema Reference (Customer-Facing Queries)

From `gateway/graphql-bff/graph/schema.graphqls`:

| Query | Return Type | Customer-Facing |
|-------|------------|-----------------|
| `me` | `User!` | Yes |
| `dashboardSummary` | `DashboardSummary!` | Yes |
| `notifications(...)` | `NotificationConnection!` | Yes |
| `notification(id)` | `Notification!` | Yes |
| `callbackRequests(...)` | `CallbackRequestConnection!` | Yes |
| `callbackRequest(id)` | `CallbackRequest!` | Yes |
| `conversations(...)` | `ConversationConnection!` | Yes |
| `conversation(id)` | `Conversation!` | Yes |
| `serviceProviders(...)` | `[ServiceProvider!]!` | Yes |
| `serviceProvider(id)` | `ServiceProvider!` | Yes |
| `myServiceProviders` | `[ServiceProvider!]!` | Yes |

---

## Verification Checklist

- [x] All 8 files created in `apps/web/src/lib/graphql/`
- [x] Every query matches the schema field names and argument types exactly
- [x] Every mutation matches the schema mutation names and input types exactly
- [x] All connection types request both `nodes { ... }` and `totalCount`
- [x] Nested objects (e.g., `serviceProvider`) include relevant fields
- [x] No TypeScript compilation errors
- [x] Each file uses `import { gql } from '@apollo/client'`
- [x] Query names are UPPER_SNAKE_CASE constants
- [x] GraphQL operation names are PascalCase (e.g., `query MyNotifications`)

---

## Dependencies

- **Depends on**: Task 2.1 (Apollo Client configured), but files can be created independently
- **Blocks**: Task 2.4 (Custom hooks import these query definitions)

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/graphql/*.ts` | **Target files** — all new |
| `gateway/graphql-bff/graph/schema.graphqls` | Source of truth for query/mutation shapes |
| `apps/provider/src/lib/graphql/` | Reference pattern (if exists) |
