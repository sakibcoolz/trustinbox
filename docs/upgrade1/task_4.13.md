# Task 4.13 — GraphQL Customer Queries

> **Section**: 4. Customers — Connected Backend  
> **Priority**: P0 — Blocks all customer UI  
> **Estimated Scope**: Large  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/customers.ts`

---

## Objective

Create the GraphQL query definitions, TypeScript types, and React hooks for all customer-related data fetching — customer list (derived from conversation participants), customer detail, notification history, callback history, and communication timeline.

---

## Current State

No `customers.ts` file exists in `apps/provider/src/lib/graphql/`. Customer data is entirely hardcoded in page components. Existing GraphQL lib files:
- `types.ts` — shared types (Auth, User, ServiceProvider)
- `dashboard.ts` — dashboard analytics queries
- `auth.ts` — auth mutations

---

## Requirements

### 1. GraphQL Queries

**Customer List** (derived from conversations endpoint):
```graphql
query CustomerList(
  $search: String
  $category: NotificationCategory
  $status: String
  $orderBy: OrderByInput
  $first: Int
  $after: String
) {
  conversations(
    search: $search
    category: $category
    status: $status
    orderBy: $orderBy
    first: $first
    after: $after
  ) {
    nodes {
      id
      status
      serviceProvider { id name }
      createdAt
      updatedAt
    }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

**Customer Detail**:
```graphql
query CustomerDetail($virtualId: String!) {
  # Lookup customer via conversations or user query
  notifications(recipientVirtualId: $virtualId, limit: 20) {
    nodes {
      id
      category
      title
      body
      priority
      status
      createdAt
    }
    totalCount
  }
  callbackRequests(virtualId: $virtualId, limit: 10) {
    nodes {
      id
      reason
      details
      status
      requestedAt
      respondedAt
    }
    totalCount
  }
}
```

**Policy Check**:
```graphql
query CheckCommunicationPolicy(
  $serviceProviderId: ID!
  $category: NotificationCategory!
  $channel: String!
) {
  checkCommunicationPolicy(
    serviceProviderId: $serviceProviderId
    category: $category
    channel: $channel
  ) {
    allowed
    decisionCode
    reason
    appliedRules
  }
}
```

### 2. TypeScript Type Definitions

```typescript
// Customer list row
export interface CustomerRow {
  virtualId: string;
  displayName: string;
  category: 'Personal' | 'Organizational' | 'Advertisement';
  lastContactAt: string;
  status: 'Active' | 'Blocked' | 'DND' | 'Opted Out';
  interactionCount: number;
}

// Customer detail
export interface CustomerDetail {
  virtualId: string;
  displayName: string;
  userType: string;
  joinedAt: string;
  lastContactAt: string;
  privacyPreference: PrivacyPreference;
  dndRules: DNDRule[];
  availabilitySlots: AvailabilitySlot[];
}

// Reuse from GraphQL schema types
export interface PrivacyPreference {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

export interface DNDRule {
  id: string;
  scopeType: string;
  scopeRefId?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface PolicyCheckResult {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
}
```

### 3. React Hooks

```typescript
// Customer list hook
export function useCustomers(options: {
  search?: string;
  filters?: Record<string, string[]>;
  sort?: { field: string; direction: 'asc' | 'desc' };
  pagination?: { first: number; after?: string };
}) {
  return useQuery(CUSTOMER_LIST_QUERY, {
    variables: { ... },
    fetchPolicy: 'cache-and-network',
  });
}

// Customer detail hook
export function useCustomerDetail(virtualId: string) {
  return useQuery(CUSTOMER_DETAIL_QUERY, {
    variables: { virtualId },
    skip: !virtualId,
  });
}

// Policy check hook (lazy)
export function useCheckPolicy() {
  return useLazyQuery(CHECK_COMMUNICATION_POLICY);
}
```

### 4. Cache Configuration
- Customer list: `cache-and-network` fetch policy
- Customer detail: normalized by `virtualId`
- Policy check: `no-cache` (always fresh)

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/customers.ts
import { gql, useQuery, useLazyQuery } from '@apollo/client';

// ─── Queries ───
export const CUSTOMER_LIST_QUERY = gql`...`;
export const CUSTOMER_DETAIL_QUERY = gql`...`;
export const CHECK_COMMUNICATION_POLICY = gql`...`;

// ─── Types ───
export interface CustomerRow { ... }
export interface CustomerDetail { ... }
export interface PolicyCheckResult { ... }

// ─── Hooks ───
export function useCustomers(options: CustomerListOptions) { ... }
export function useCustomerDetail(virtualId: string) { ... }
export function useCheckPolicy() { ... }
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/customers.ts` | Create — all customer queries, types, and hooks |

---

## Acceptance Criteria

- [ ] `CUSTOMER_LIST_QUERY` with search, filter, sort, pagination variables
- [ ] `CUSTOMER_DETAIL_QUERY` with notifications, callbacks, privacy data
- [ ] `CHECK_COMMUNICATION_POLICY` query definition
- [ ] TypeScript interfaces for all response types
- [ ] `useCustomers()` hook with cache-and-network policy
- [ ] `useCustomerDetail()` hook with skip on empty virtualId
- [ ] `useCheckPolicy()` lazy query hook with no-cache policy
- [ ] All queries aligned with GraphQL schema in `schema.graphqls`

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client setup)
- **Blocks**: Task 4.1 (Customer list table), Task 4.7 (Customer detail), Task 4.8 (Privacy display), Task 4.11 (Policy check indicator), Task 4.14 (policy query)
- **Related**: Task 3.8 (Dashboard analytics query — same pattern)
