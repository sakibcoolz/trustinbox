# Task 1.4 — Implement Customer Resolvers

> **Phase**: 1 — Gateway: Customer Portal API Surface  
> **Priority**: P0 — Core implementation task  
> **Estimated Scope**: Large  
> **Files**:  
>   - `gateway/graphql-bff/graph/resolver/` — generated + implemented resolvers  
>   - `gateway/graphql-bff/graph/generated/generated.go` — auto-generated  
>   - `gateway/graphql-bff/graph/model/models_gen.go` — auto-generated  
>   - `gateway/graphql-bff/cmd/server/main.go` — wire gqlgen handler  
> **Status**: ✅ Complete

---

## Objective

Run `make gqlgen` to generate resolver stubs from the updated schema (Tasks 1.1 & 1.2), then implement all customer-facing query and mutation resolvers. Each resolver follows the pattern: extract user identity from context → call backend gRPC service → map proto response to GraphQL model.

---

## Current State

- **Schema**: Fully defined (after Tasks 1.1 & 1.2)
- **gqlgen config**: `gateway/graphql-bff/gqlgen.yml` configured with `follow-schema` layout
  - Generated code → `graph/generated/generated.go`
  - Models → `graph/model/models_gen.go`
  - Resolvers → `graph/resolver/` (does not exist yet)
- **GraphQL server**: Currently a placeholder endpoint returning static JSON:
  ```go
  mux.HandleFunc("/graphql", func(w http.ResponseWriter, r *http.Request) {
      w.Header().Set("Content-Type", "application/json")
      w.Write([]byte(`{"message":"GraphQL endpoint..."}`))
  })
  ```
- **Service clients**: `internal/clients/ServiceClients` already has gRPC connections to all 9 backend services

---

## Requirements

### 1. Generate Code with gqlgen

- [x] Run `make gqlgen` (or `cd gateway/graphql-bff && go run github.com/99designs/gqlgen generate`)
- [x] Verify generated files:
  - `graph/generated/generated.go` — GraphQL execution engine
  - `graph/model/models_gen.go` — Go structs for all GraphQL types
  - `graph/resolver/resolver.go` — Root resolver struct
  - `graph/resolver/schema.resolvers.go` — Resolver method stubs (all returning `panic("not implemented")`)
- [x] Fix any generation errors (usually missing types or import conflicts)

### 2. Configure Root Resolver

- [x] Edit `graph/resolver/resolver.go` to inject `ServiceClients`:
  ```go
  package resolver

  import (
      "github.com/trustinbox/graphql-bff/internal/clients"
      "go.uber.org/zap"
  )

  type Resolver struct {
      Clients *clients.ServiceClients
      Log     *zap.Logger
  }
  ```

### 3. Wire gqlgen Handler in `main.go`

- [x] Replace the placeholder `/graphql` handler with the real gqlgen handler:
  ```go
  import (
      "github.com/99designs/gqlgen/graphql/handler"
      "github.com/99designs/gqlgen/graphql/playground"
      "github.com/trustinbox/graphql-bff/graph/generated"
      "github.com/trustinbox/graphql-bff/graph/resolver"
  )

  // In main():
  gqlResolver := &resolver.Resolver{
      Clients: svcClients,
      Log:     log,
  }
  gqlSrv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
      Resolvers: gqlResolver,
  }))

  mux.Handle("/graphql", gqlSrv)
  mux.Handle("/playground", playground.Handler("TrustInbox GraphQL", "/graphql"))
  ```

### 4. Implement Customer Query Resolvers

Each resolver follows this pattern:
```go
func (r *queryResolver) MyXxx(ctx context.Context, ...) (*model.Xxx, error) {
    userID := requestctx.UserID(ctx)
    if userID == "" {
        return nil, fmt.Errorf("authentication required")
    }
    // Call gRPC service
    resp, err := r.Clients.Xxx.RpcMethod(ctx, &proto.Request{UserId: userID, ...})
    if err != nil {
        return nil, fmt.Errorf("failed to fetch xxx: %w", err)
    }
    // Map proto → GraphQL model
    return mapXxxToModel(resp), nil
}
```

#### 4a. `myProfile` Query
- [x] Implement `MyProfile` resolver
  - Call: `r.Clients.User.GetUserProfile(ctx, &userv1.GetUserProfileRequest{UserId: userID})`
  - Map: `GetUserProfileResponse` → `model.UserProfile`
  - Fields: `id`, `username`, `fullName`, `email`, `avatarUrl`, `timezone`, `language`

#### 4b. `myNotifications` Query
- [x] Implement `MyNotifications` resolver
  - Call: `r.Clients.Notification.ListNotifications(ctx, &notificationv1.ListNotificationsRequest{UserId: userID, Category: category, Limit: limit, Offset: offset, Status: status})`
  - Map: `ListNotificationsResponse` → `model.NotificationConnection`
  - Handle: optional `category`, `status` filters (convert `*string` → string)
  - Handle: default `limit=20`, `offset=0` when nil

#### 4c. `myCallbackRequests` Query
- [x] Implement `MyCallbackRequests` resolver
  - Call: `r.Clients.Communication.ListCallbackRequests(ctx, &communicationv1.ListCallbackRequestsRequest{UserId: userID, Status: status, Limit: limit, Offset: offset})`
  - Map: `ListCallbackRequestsResponse` → `model.CallbackRequestConnection`
  - Handle: SP lookup for each callback's `service_provider_id` → `model.ServiceProvider`

#### 4d. `myConversations` Query
- [x] Implement `MyConversations` resolver
  - Call: `r.Clients.Communication.ListConversations(ctx, &communicationv1.ListConversationsRequest{UserId: userID, Limit: limit, Offset: offset})`
  - Map: `ListConversationsResponse` → `model.ConversationConnection`

#### 4e. `myDocuments` Query
- [x] Implement `MyDocuments` resolver
  - Call: `r.Clients.Communication.ListDocumentShares(ctx, &communicationv1.ListDocumentSharesRequest{UserId: userID, ...})`
  - Map: `ListDocumentSharesResponse` → `model.DocumentConnection`
  - Handle: optional `serviceProviderId` and `classification` filters

#### 4f. `myServiceProviders` Query
- [x] Implement `MyServiceProviders` resolver (update existing if needed)
  - Call: user-service to get user's associated SPs, or organization-service to list SPs the user has interacted with
  - Handle: `limit`, `offset`, `search` parameters

#### 4g. `myPrivacyPreferences` Query
- [x] Implement `MyPrivacyPreferences` resolver
  - Call: `r.Clients.User.GetPrivacyPreference(ctx, &userv1.GetPrivacyPreferenceRequest{UserId: userID})`
  - Map: `PrivacyPreference` proto → `model.PrivacyPreference`
  - Direct 1:1 field mapping

#### 4h. `myDNDRules` Query
- [x] Implement `MyDNDRules` resolver
  - Call: `r.Clients.User.ListDNDRules(ctx, &userv1.ListDNDRulesRequest{UserId: userID})`
  - Map: `ListDNDRulesResponse.rules` → `[]*model.DNDRule`

#### 4i. `myAvailabilitySlots` Query
- [x] Implement `MyAvailabilitySlots` resolver
  - Call: `r.Clients.User.ListAvailabilitySlots(ctx, &userv1.ListAvailabilitySlotsRequest{UserId: userID})`
  - Map: `ListAvailabilitySlotsResponse.slots` → `[]*model.AvailabilitySlot`

#### 4j. `myBlockedProviders` Query
- [x] Implement `MyBlockedProviders` resolver
  - Call: `r.Clients.User.ListBlockedServiceProviders(ctx, &userv1.ListBlockedServiceProvidersRequest{UserId: userID})`
  - Map: response → `model.BlockedProviderConnection`
  - For each blocked SP: lookup SP details via `r.Clients.Organization.GetServiceProvider()`

#### 4k. `myDashboardSummary` Query
- [x] Implement `MyDashboardSummary` resolver
  - **Aggregation query** — calls multiple services:
    1. `r.Clients.Notification.ListNotifications(ctx, {UserId: userID, Status: "UNREAD", Limit: 0})` → `unreadNotifications = total`
    2. `r.Clients.Communication.ListCallbackRequests(ctx, {UserId: userID, Status: "PENDING", Limit: 0})` → `pendingCallbacks = total`
    3. `r.Clients.Communication.ListConversations(ctx, {UserId: userID, Limit: 0})` → `activeConversations = total`
    4. `r.Clients.Communication.ListDocumentShares(ctx, {UserId: userID, Limit: 0})` → `sharedDocuments = total`
    5. `r.Clients.User.ListBlockedServiceProviders(ctx, {UserId: userID})` → `blockedProviders = count`
    6. `r.Clients.User.ListDNDRules(ctx, {UserId: userID})` → check if any rule is currently active → `dndActive`
  - **Performance**: Use `errgroup` to parallelize these calls
  - **Caching**: Consider Redis caching with short TTL (30s) for dashboard summary

#### 4l. `serviceProviderDirectory` Query
- [x] Implement `ServiceProviderDirectory` resolver
  - Call: `r.Clients.Organization.ListServiceProviders(ctx, &orgv1.ListServiceProvidersRequest{Search: search, Limit: limit, Offset: offset})`
  - Filter: only verified SPs (`verification_status: "VERIFIED"`)
  - Handle: optional `industry` filter
  - Map: `ListServiceProvidersResponse` → `model.ServiceProviderConnection`

### 5. Implement Customer Mutation Resolvers

#### 5a. `updateMyProfile` Mutation
- [x] Implement `UpdateMyProfile` resolver
  - Call: `r.Clients.User.UpdateUserProfile(ctx, &userv1.UpdateUserProfileRequest{UserId: userID, FullName: input.FirstName + " " + input.LastName, AvatarUrl: input.AvatarUrl, ...})`
  - After update: re-fetch profile to return updated `UserProfile`
  - Handle: partial updates (only set fields that are non-nil)

#### 5b. `updateMyAvatar` Mutation
- [x] Implement `UpdateMyAvatar` resolver
  - Call: `r.Clients.User.UpdateUserProfile(ctx, &userv1.UpdateUserProfileRequest{UserId: userID, AvatarUrl: url})`
  - After update: re-fetch profile to return updated `UserProfile`

#### 5c. `markAllNotificationsRead` Mutation
- [x] Implement `MarkAllNotificationsRead` resolver
  - Step 1: Fetch unread notifications: `ListNotifications(ctx, {UserId: userID, Status: "UNREAD"})`
  - Step 2: For each unread: `MarkAsRead(ctx, {NotificationId: id, UserId: userID})`
  - Use `errgroup` for parallel marking (batch of 10-20 at a time)
  - Return `true` on success

#### 5d. Customer mutations using existing schema mutations
- [x] Ensure existing mutation resolvers inject `userID` from context:
  - `UpdatePrivacyPreference` — uses `userID` from context
  - `CreateDNDRule` — uses `userID` from context
  - `UpdateDNDRule` — uses `userID` from context
  - `DeleteDNDRule` — uses `userID` from context
  - `CreateAvailabilitySlot` — uses `userID` from context
  - `DeleteAvailabilitySlot` — uses `userID` from context
  - `ApproveCallbackRequest` — uses `userID` from context
  - `RejectCallbackRequest` — uses `userID` from context
  - `BlockServiceProvider` — uses `userID` from context, add `reason` parameter
  - `UnblockServiceProvider` — uses `userID` from context
  - `MarkNotificationAsRead` — uses `userID` from context
  - `ArchiveNotification` — uses `userID` from context
  - `ReportSpam` — uses `userID` from context

### 6. Create Proto → Model Mapping Functions

- [x] Create `graph/resolver/mappers.go` with mapping functions:
  ```go
  package resolver

  import (
      "github.com/trustinbox/graphql-bff/graph/model"
      notificationv1 "github.com/trustinbox/proto/gen/notification/v1"
      userv1 "github.com/trustinbox/proto/gen/user/v1"
      communicationv1 "github.com/trustinbox/proto/gen/communication/v1"
      organizationv1 "github.com/trustinbox/proto/gen/organization/v1"
  )

  func mapNotification(n *notificationv1.Notification) *model.Notification { ... }
  func mapCallbackRequest(r *communicationv1.CallbackRequest) *model.CallbackRequest { ... }
  func mapConversation(c *communicationv1.Conversation) *model.Conversation { ... }
  func mapServiceProvider(sp *organizationv1.ServiceProvider) *model.ServiceProvider { ... }
  func mapUserProfile(u *userv1.GetUserProfileResponse) *model.UserProfile { ... }
  func mapPrivacyPreference(p *userv1.PrivacyPreference) *model.PrivacyPreference { ... }
  func mapDNDRule(r *userv1.DNDRule) *model.DNDRule { ... }
  func mapAvailabilitySlot(s *userv1.AvailabilitySlot) *model.AvailabilitySlot { ... }
  ```

### 7. Implement Provider Query/Mutation Resolvers (Existing Schema)

- [x] Implement ALL existing provider query resolvers (not just customer ones)
  - These already existed in the schema but had no resolver implementations
  - Follow same pattern: extract `spID` from context → call gRPC → map response
  - Lower priority for this task but necessary for `make gqlgen` to compile (no `panic("not implemented")` left)
  - **Alternative**: Leave provider resolvers as `panic("not implemented")` stubs for now — they're unused by the web app (provider portal uses REST API)

---

## Implementation Details

### File Organization (follow-schema layout)

gqlgen with `follow-schema` layout generates one resolver file per schema file. Since we have one `schema.graphqls`, it generates one `schema.resolvers.go`. Additional files we create:

```
graph/resolver/
├── resolver.go              # Root Resolver struct (edit)
├── schema.resolvers.go      # Generated stubs (implement)
├── mappers.go               # Proto → Model mapping functions (create)
└── auth_helpers.go           # requireCustomerRole, requireProviderRole (create, from Task 1.3)
```

### Proto Import Aliases

```go
import (
    authv1 "github.com/trustinbox/proto/gen/auth/v1"
    userv1 "github.com/trustinbox/proto/gen/user/v1"
    notificationv1 "github.com/trustinbox/proto/gen/notification/v1"
    communicationv1 "github.com/trustinbox/proto/gen/communication/v1"
    organizationv1 "github.com/trustinbox/proto/gen/organization/v1"
    analyticsv1 "github.com/trustinbox/proto/gen/analytics/v1"
    botv1 "github.com/trustinbox/proto/gen/bot/v1"
    webhookv1 "github.com/trustinbox/proto/gen/webhook/v1"
)
```

### Error Handling Pattern

```go
func (r *queryResolver) MyNotifications(ctx context.Context, ...) (*model.NotificationConnection, error) {
    userID := requestctx.UserID(ctx)
    if userID == "" {
        return nil, fmt.Errorf("authentication required")
    }

    resp, err := r.Clients.Notification.ListNotifications(ctx, &notificationv1.ListNotificationsRequest{...})
    if err != nil {
        r.Log.Error("failed to list notifications", zap.Error(err), zap.String("user_id", userID))
        return nil, fmt.Errorf("failed to fetch notifications")  // Don't expose internal error to client
    }

    nodes := make([]*model.Notification, 0, len(resp.Notifications))
    for _, n := range resp.Notifications {
        nodes = append(nodes, mapNotification(n))
    }

    return &model.NotificationConnection{
        Nodes:      nodes,
        TotalCount: int(resp.Total),
    }, nil
}
```

### Optional Parameter Handling

```go
// Helper to safely dereference optional int pointer with default
func intOrDefault(p *int, def int32) int32 {
    if p != nil {
        return int32(*p)
    }
    return def
}

// Helper to safely dereference optional string pointer
func strOrEmpty(p *string) string {
    if p != nil {
        return *p
    }
    return ""
}
```

### Dashboard Summary Aggregation (parallel calls)

```go
func (r *queryResolver) MyDashboardSummary(ctx context.Context) (*model.CustomerDashboardSummary, error) {
    userID := requestctx.UserID(ctx)
    g, ctx := errgroup.WithContext(ctx)
    
    var unread, pending, conversations, documents, blocked int
    var dndActive bool

    g.Go(func() error {
        resp, err := r.Clients.Notification.ListNotifications(ctx, &notificationv1.ListNotificationsRequest{
            UserId: userID, Status: "UNREAD", Limit: 1,
        })
        if err == nil { unread = int(resp.Total) }
        return nil // Don't fail dashboard on individual service failure
    })
    
    g.Go(func() error {
        resp, err := r.Clients.Communication.ListCallbackRequests(ctx, &communicationv1.ListCallbackRequestsRequest{
            UserId: userID, Status: "PENDING", Limit: 1,
        })
        if err == nil { pending = int(resp.Total) }
        return nil
    })
    
    // ... more parallel calls ...
    
    g.Wait()
    return &model.CustomerDashboardSummary{
        UnreadNotifications: unread,
        PendingCallbacks:    pending,
        ActiveConversations: conversations,
        SharedDocuments:     documents,
        BlockedProviders:    blocked,
        DndActive:           dndActive,
    }, nil
}
```

---

## Verification

- [x] `make gqlgen` runs without errors
- [x] `go build ./...` succeeds for the gateway module
- [x] All customer query resolvers return correct data when called with valid customer JWT
- [x] All customer mutation resolvers persist changes correctly
- [x] Proto → Model mappers correctly convert all fields
- [x] Optional parameters default gracefully (nil → default values)
- [x] Error responses are user-friendly (no internal details leaked)
- [x] Dashboard summary handles individual service failures gracefully
- [x] Logging present on all error paths
- [x] Gateway starts successfully with `make dev-gateway`
- [x] GraphQL playground accessible at `/playground`

---

## Dependencies

- **Depends on**: Task 1.1 (schema query types), Task 1.2 (schema mutations), Task 1.3 (auth middleware)
- **Blocks**: Task 1.5 (verification), Phase 2 (web app data layer)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `gateway/graphql-bff/gqlgen.yml` | **Reference** — Code generation config |
| `gateway/graphql-bff/graph/schema.graphqls` | **Reference** — Schema (from Tasks 1.1 & 1.2) |
| `gateway/graphql-bff/graph/resolver/resolver.go` | **Edit** — Root resolver struct injection |
| `gateway/graphql-bff/graph/resolver/schema.resolvers.go` | **Edit** — Implement resolver stubs |
| `gateway/graphql-bff/graph/resolver/mappers.go` | **Create** — Proto → Model mapping |
| `gateway/graphql-bff/graph/resolver/auth_helpers.go` | **Create** — Role-checking helpers (from Task 1.3) |
| `gateway/graphql-bff/graph/generated/generated.go` | **Generated** — Do not edit |
| `gateway/graphql-bff/graph/model/models_gen.go` | **Generated** — Do not edit |
| `gateway/graphql-bff/cmd/server/main.go` | **Edit** — Wire gqlgen handler replacing placeholder |
| `gateway/graphql-bff/internal/clients/service_clients.go` | **Reference** — Available gRPC clients |
| `packages/proto/*/v1/*.proto` | **Reference** — gRPC request/response shapes |
| `packages/cornerstone/auth/requestctx/context.go` | **Reference** — Context getters for userID, role, spID |

---

## Notes

- **Provider resolvers**: The schema includes 20+ provider queries and 30+ mutations. These will also get generated stubs. Options:
  1. Implement all resolvers in this task (large scope increase)
  2. Leave provider resolvers as `panic("not implemented")` — provider portal uses REST, not GraphQL
  3. Implement provider resolvers in a follow-up task
  - **Recommendation**: Option 2 for now — focus on customer resolvers only
- **ServiceProvider resolution in callbacks/documents**: When a callback or document includes `service_provider_id`, the resolver needs to fetch SP details. Options:
  1. N+1: call `GetServiceProvider` per item
  2. Batch: collect all SP IDs, batch fetch, then map
  3. DataLoader: use `github.com/graph-gophers/dataloader` for deduplication
  - **Recommendation**: Start with Option 1, optimize to Option 3 if performance is an issue
- **Timestamp conversion**: Proto `google.protobuf.Timestamp` → Go `time.Time` → GraphQL `DateTime` (auto-handled by gqlgen's `Time` scalar binding)
