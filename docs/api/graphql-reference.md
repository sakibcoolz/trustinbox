# TrustInbox API Reference

## GraphQL Gateway

**Endpoint**: `http://localhost:4000/graphql`

### Authentication
All authenticated requests require a JWT bearer token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

### Queries

| Query | Description | Auth Required |
|-------|-------------|---------------|
| `me` | Current user profile | Yes |
| `myPrivacyPreferences` | User's privacy settings | Yes |
| `myDNDRules` | User's DND rules | Yes |
| `myAvailabilitySlots` | User's availability windows | Yes |
| `notifications` | Paginated notifications | Yes |
| `callbackRequests` | Paginated callback requests | Yes |
| `conversations` | User's conversation threads | Yes |
| `messages` | Messages in a conversation | Yes |
| `organization` | Organization by ID | Yes |
| `organizations` | Paginated org list | Admin |
| `dashboardSummary` | Dashboard stats | Yes |
| `checkPolicy` | Test a policy evaluation | Admin |
| `spamReports` | List spam reports | Admin |
| `auditLogs` | Platform audit log | Admin |

### Mutations

| Mutation | Description | Auth Required |
|----------|-------------|---------------|
| `register` | Create user account | No |
| `login` | Authenticate user | No |
| `refreshToken` | Rotate tokens | No |
| `updatePrivacyPreference` | Update privacy settings | Yes |
| `createDNDRule` | Add DND schedule | Yes |
| `deleteDNDRule` | Remove DND schedule | Yes |
| `createAvailabilitySlot` | Add availability window | Yes |
| `blockOrganization` | Block an org | Yes |
| `unblockOrganization` | Unblock an org | Yes |
| `createNotification` | Send notification | Org |
| `markNotificationRead` | Mark as read | Yes |
| `createCallbackRequest` | Request callback | Org |
| `approveCallbackRequest` | Approve callback | Yes |
| `rejectCallbackRequest` | Reject callback | Yes |
| `sendMessage` | Send chat message | Yes |
| `reportSpam` | Report spam | Yes |
| `verifyOrganization` | Verify org | Admin |
| `suspendOrganization` | Suspend org | Admin |

### Subscriptions

| Subscription | Description |
|--------------|-------------|
| `notificationReceived` | Real-time notification push |
| `callbackRequestUpdated` | Callback status changes |
| `newMessage` | New message in conversation |

## gRPC Services

See `packages/proto/` for full proto definitions. Each service exposes its gRPC API on the port listed in the architecture overview.
