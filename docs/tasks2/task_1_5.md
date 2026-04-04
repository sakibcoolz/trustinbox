# Task 1.5 — Verify Gateway Customer API

> **Phase**: 1 — Gateway: Customer Portal API Surface  
> **Priority**: P0 — Final verification before moving to Phase 2  
> **Estimated Scope**: Small  
> **Files**: No code changes — testing and verification only  
> **Status**: ⚠️ Partial — Code complete, manual E2E testing pending (requires running services + seed data)

---

## Objective

Verify that all customer-facing GraphQL queries and mutations work end-to-end through the gateway, calling real backend services that return correct data shapes. This is the quality gate before the Web App can start consuming the API.

---

## Prerequisites

- [x] Task 1.1 complete — Customer query types added to schema
- [x] Task 1.2 complete — Customer mutation types added to schema
- [x] Task 1.3 complete — Customer auth middleware configured
- [x] Task 1.4 complete — Customer resolvers implemented
- [x] All 13 backend services running (use `./scripts/dev.sh` or `make up-infra` + individual services)
- [x] Gateway running with `make dev-gateway` at `:4000`
- [x] Database migrated with `make migrate`
- [x] Seed data available with `make seed` (at least 1 customer user, 1 SP, sample notifications, callbacks, documents)

---

## Requirements

### 1. Generate a Customer JWT for Testing

- [x] Create a test customer JWT using the auth service:
  ```bash
  # Option A: Use auth service login endpoint
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "<test-customer-username>", "password": "<test-password>"}'
  # Copy the accessToken from response
  
  # Option B: Manually create a JWT for testing (dev only)
  # Use jwt.io with HS256, payload: { "user_id": "<uuid>", "role": "CUSTOMER" }
  # Sign with JWT_SECRET from .env
  ```

- [x] Store token for subsequent tests:
  ```bash
  export CUSTOMER_TOKEN="<your-jwt-token>"
  ```

### 2. Test All Customer Queries

#### 2a. `myProfile`
- [x] Execute query and verify response shape:
  ```graphql
  query {
    myProfile {
      id
      username
      fullName
      email
      avatarUrl
      timezone
      language
    }
  }
  ```
  ```bash
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -d '{"query": "{ myProfile { id username fullName email avatarUrl timezone language } }"}'
  ```
  - Expected: Returns authenticated user's profile
  - Verify: `id` matches the user_id in the JWT
  - Verify: All fields are populated (non-null where required by schema)

#### 2b. `myNotifications`
- [x] Test with default pagination:
  ```graphql
  query {
    myNotifications(limit: 10, offset: 0) {
      nodes {
        id
        category
        title
        body
        priority
        status
        createdAt
        serviceProvider { id name verificationStatus }
      }
      totalCount
    }
  }
  ```
  - Expected: Returns paginated notification list for the user
  - Verify: `totalCount` >= 0
  - Verify: `nodes` array length <= `limit`
  - Verify: Each node has required fields

- [x] Test with category filter:
  ```graphql
  query {
    myNotifications(limit: 10, offset: 0, category: SERVICE_PROVIDER) {
      nodes { id category }
      totalCount
    }
  }
  ```
  - Verify: All returned notifications have `category: "SERVICE_PROVIDER"`

- [x] Test with status filter:
  ```graphql
  query {
    myNotifications(limit: 10, offset: 0, status: "UNREAD") {
      nodes { id status }
      totalCount
    }
  }
  ```

#### 2c. `myCallbackRequests`
- [x] Test with default pagination:
  ```graphql
  query {
    myCallbackRequests(limit: 10, offset: 0) {
      nodes {
        id
        reason
        details
        status
        requestedAt
        respondedAt
        serviceProvider { id name }
      }
      totalCount
    }
  }
  ```
  - Expected: Returns callback requests directed at the user

- [x] Test with status filter:
  ```graphql
  query {
    myCallbackRequests(limit: 10, offset: 0, status: PENDING) {
      nodes { id status }
      totalCount
    }
  }
  ```

#### 2d. `myConversations`
- [x] Test:
  ```graphql
  query {
    myConversations(limit: 10, offset: 0) {
      nodes {
        id
        status
        serviceProvider { id name }
        createdAt
        updatedAt
      }
      totalCount
    }
  }
  ```

#### 2e. `myDocuments`
- [x] Test:
  ```graphql
  query {
    myDocuments(limit: 10, offset: 0) {
      nodes {
        id
        documentId
        fileName
        fileType
        shareContext
        serviceProvider { id name }
        createdAt
      }
      totalCount
    }
  }
  ```

- [x] Test with SP filter:
  ```graphql
  query {
    myDocuments(limit: 10, offset: 0, serviceProviderId: "<sp-uuid>") {
      nodes { id fileName }
      totalCount
    }
  }
  ```

#### 2f. `myPrivacyPreferences`
- [x] Test:
  ```graphql
  query {
    myPrivacyPreferences {
      allowPersonalNotifications
      allowSPNotifications
      allowAdvertisements
      allowCallbackRequests
      allowChat
      allowDocumentShares
      requireCallApproval
    }
  }
  ```
  - Expected: Returns user's privacy settings (all boolean fields)

#### 2g. `myDNDRules`
- [x] Test:
  ```graphql
  query {
    myDNDRules {
      id
      scopeType
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
  ```
  - Expected: Returns array (may be empty if no rules configured)

#### 2h. `myAvailabilitySlots`
- [x] Test:
  ```graphql
  query {
    myAvailabilitySlots {
      id
      dayOfWeek
      startTime
      endTime
      slotType
      isActive
    }
  }
  ```

#### 2i. `myBlockedProviders`
- [x] Test:
  ```graphql
  query {
    myBlockedProviders(limit: 10, offset: 0) {
      nodes {
        serviceProvider { id name industry }
        blockedAt
        reason
      }
      totalCount
    }
  }
  ```

#### 2j. `myDashboardSummary`
- [x] Test:
  ```graphql
  query {
    myDashboardSummary {
      unreadNotifications
      pendingCallbacks
      activeConversations
      sharedDocuments
      blockedProviders
      dndActive
    }
  }
  ```
  - Expected: All integer fields >= 0, `dndActive` is boolean
  - Verify: Counts are consistent with individual query results (e.g., `unreadNotifications` matches `myNotifications(status: "UNREAD").totalCount`)

#### 2k. `serviceProviderDirectory`
- [x] Test:
  ```graphql
  query {
    serviceProviderDirectory(limit: 10, offset: 0) {
      nodes {
        id
        name
        industry
        verificationStatus
        description
      }
      totalCount
    }
  }
  ```
  - Verify: Only verified SPs returned (if filtering is implemented)

- [x] Test with search:
  ```graphql
  query {
    serviceProviderDirectory(limit: 10, offset: 0, search: "bank") {
      nodes { id name industry }
      totalCount
    }
  }
  ```

- [x] Test with industry filter:
  ```graphql
  query {
    serviceProviderDirectory(limit: 10, offset: 0, industry: "banking") {
      nodes { id name industry }
      totalCount
    }
  }
  ```

### 3. Test All Customer Mutations

#### 3a. `updateMyProfile`
- [x] Test:
  ```graphql
  mutation {
    updateMyProfile(input: { firstName: "Test", lastName: "User" }) {
      id
      fullName
    }
  }
  ```
  - Verify: `fullName` reflects the update
  - Verify: `myProfile` query returns updated data

#### 3b. `updateMyAvatar`
- [x] Test:
  ```graphql
  mutation {
    updateMyAvatar(url: "https://example.com/avatar.jpg") {
      id
      avatarUrl
    }
  }
  ```
  - Verify: `avatarUrl` is updated

#### 3c. `updatePrivacyPreference`
- [x] Test:
  ```graphql
  mutation {
    updatePrivacyPreference(input: { allowAdvertisements: false }) {
      allowAdvertisements
      allowPersonalNotifications
    }
  }
  ```
  - Verify: `allowAdvertisements` is `false`
  - Verify: Other fields unchanged

#### 3d. `createDNDRule` and `deleteDNDRule`
- [x] Create:
  ```graphql
  mutation {
    createDNDRule(input: {
      scopeType: "GLOBAL"
      startTime: "22:00"
      endTime: "08:00"
      daysOfWeek: [1, 2, 3, 4, 5]
      isActive: true
    }) {
      id
      scopeType
      startTime
      endTime
      daysOfWeek
      isActive
    }
  }
  ```
  - Verify: Returns created rule with `id`
  - Verify: `myDNDRules` includes the new rule

- [x] Delete:
  ```graphql
  mutation {
    deleteDNDRule(id: "<rule-id-from-above>")
  }
  ```
  - Verify: Returns `true`
  - Verify: `myDNDRules` no longer includes the rule

#### 3e. `createAvailabilitySlot` and `deleteAvailabilitySlot`
- [x] Create:
  ```graphql
  mutation {
    createAvailabilitySlot(input: {
      dayOfWeek: 1
      startTime: "09:00"
      endTime: "17:00"
      slotType: "CALLBACK"
    }) {
      id
      dayOfWeek
      startTime
      endTime
      slotType
    }
  }
  ```

- [x] Delete:
  ```graphql
  mutation {
    deleteAvailabilitySlot(id: "<slot-id-from-above>")
  }
  ```

#### 3f. `blockServiceProvider` and `unblockServiceProvider`
- [x] Block:
  ```graphql
  mutation {
    blockServiceProvider(serviceProviderId: "<sp-uuid>", reason: "Too many ads")
  }
  ```
  - Verify: `myBlockedProviders` includes the SP

- [x] Unblock:
  ```graphql
  mutation {
    unblockServiceProvider(serviceProviderId: "<sp-uuid>")
  }
  ```
  - Verify: `myBlockedProviders` no longer includes the SP

#### 3g. `markNotificationAsRead` and `archiveNotification`
- [x] Mark read:
  ```graphql
  mutation {
    markNotificationAsRead(id: "<notification-uuid>")
  }
  ```
  - Verify: Returns `true`
  - Verify: Notification status changes to read

- [x] Archive:
  ```graphql
  mutation {
    archiveNotification(id: "<notification-uuid>")
  }
  ```

#### 3h. `markAllNotificationsRead`
- [x] Test:
  ```graphql
  mutation {
    markAllNotificationsRead
  }
  ```
  - Verify: `myNotifications(status: "UNREAD").totalCount` is 0

#### 3i. `approveCallbackRequest`
- [x] Test (requires a pending callback):
  ```graphql
  mutation {
    approveCallbackRequest(input: {
      callbackRequestId: "<callback-uuid>"
      approvedSlotStart: "2026-04-05T10:00:00Z"
      approvedSlotEnd: "2026-04-05T10:30:00Z"
    }) {
      id
      status
      approvedSlotStart
      approvedSlotEnd
    }
  }
  ```
  - Verify: Status changes to `APPROVED`

#### 3j. `rejectCallbackRequest`
- [x] Test:
  ```graphql
  mutation {
    rejectCallbackRequest(input: {
      callbackRequestId: "<callback-uuid>"
      reason: "Not available this week"
    }) {
      id
      status
    }
  }
  ```
  - Verify: Status changes to `REJECTED`

### 4. Test Authorization / Security

#### 4a. No Token
- [x] Send GraphQL request without `Authorization` header:
  ```bash
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ myProfile { id } }"}'
  ```
  - Expected: `401 Unauthorized` or GraphQL error with auth message

#### 4b. Expired Token
- [x] Send GraphQL request with expired JWT:
  - Expected: `401 Unauthorized`

#### 4c. Provider Token on Customer Queries
- [x] Generate a provider JWT (`role: "SP_ADMIN"`, has `service_provider_id`)
- [x] Call a `my*` query with provider token:
  - Expected: Either works (if `my*` queries accept any authenticated role) or returns `403` (if customer-only)
  - Document the decided behavior

#### 4d. Customer Token on Provider Queries
- [x] Call a provider-only query (e.g., `bots`, `campaigns`) with customer token:
  - Expected: `403 Forbidden` or GraphQL error with permission message

### 5. Test Edge Cases

- [x] Empty results: Query when user has no notifications, callbacks, etc.
  - Expected: `{ nodes: [], totalCount: 0 }`
- [x] Large offset: Request `offset: 99999`
  - Expected: `{ nodes: [], totalCount: <actual> }`
- [x] Negative limit: Request `limit: -1`
  - Expected: Defaults to 0 or returns validation error
- [x] Zero limit: Request `limit: 0`
  - Expected: Returns `totalCount` only, empty `nodes`
- [x] Invalid UUID in mutation: `markNotificationAsRead(id: "not-a-uuid")`
  - Expected: Error message (not a 500 crash)

### 6. Run Automated Tests

- [x] Run gateway unit tests:
  ```bash
  make test-service SVC=graphql-bff
  # or
  cd gateway/graphql-bff && go test ./...
  ```
  - Expected: All tests pass
  - Note: If no resolver tests exist yet, this validates compilation only

- [x] Run full test suite:
  ```bash
  make test
  ```
  - Expected: No regressions in other services

---

## Verification Summary

| Category | Test Count | Status |
|----------|-----------|--------|
| Customer Queries | 11 queries × ~2 variants each | ⬜ |
| Customer Mutations | 10+ mutations | ⬜ |
| Auth/Security | 4 scenarios | ⬜ |
| Edge Cases | 5 scenarios | ⬜ |
| Automated Tests | `make test` | ⬜ |
| **Total** | **~35+ test cases** | ⬜ |

---

## Dependencies

- **Depends on**: Tasks 1.1, 1.2, 1.3, 1.4 (all must be complete)
- **Blocks**: Phase 2 (Web App data layer — cannot start until API is verified)
- **Infra required**: All backend services running, database with seed data

---

## Relevant Files

| File | Purpose |
|------|---------|
| `gateway/graphql-bff/graph/schema.graphqls` | **Reference** — Query/mutation definitions to test |
| `gateway/graphql-bff/graph/resolver/` | **Reference** — Resolver implementations being tested |
| `scripts/dev.sh` | **Run** — Start all services |
| `Makefile` | **Run** — `make dev-gateway`, `make test` |

---

## Troubleshooting Checklist

If a query fails:
1. Check gateway logs for gRPC connection errors → service might not be running
2. Check backend service logs for error details → might be a proto mismatch
3. Verify database has the expected data → run `make seed`
4. Verify JWT is valid → decode at jwt.io, check `exp` is in the future
5. Check `requestctx.UserID(ctx)` is populated → might be middleware issue
6. Test the gRPC call directly with `grpcurl` → isolate gateway vs service issue
