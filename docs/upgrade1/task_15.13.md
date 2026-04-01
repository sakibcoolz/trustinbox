# Task 15.13 — Organization Profile CRUD

> **Section**: 15. Settings — Connected Backend  
> **Priority**: P1 — Core  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/settings.ts`  
> **Status**: ✅ Complete

---

## Objective

Add organization profile CRUD operations to the settings GraphQL file: query to fetch current org profile and mutation to update it via organization-service.

---

## Requirements

### Query

```graphql
query GetOrganizationProfile($serviceProviderId: ID!) {
  serviceProvider(id: $serviceProviderId) {
    id
    name
    displayName
    description
    websiteUrl
    contactEmail
    supportPhone
    address
    logoUrl
    primaryColor
    notificationFooter
    industry
    verificationStatus
  }
}
```

### Mutation

```graphql
mutation UpdateOrganizationProfile($input: UpdateOrganizationProfileInput!) {
  updateOrganizationProfile(input: $input) {
    id
    name
    displayName
    logoUrl
  }
}
```

### TypeScript Types

```typescript
export interface OrganizationProfile {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  websiteUrl?: string;
  contactEmail?: string;
  supportPhone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  notificationFooter?: string;
  industry?: string;
  verificationStatus?: string;
}
```

### Hooks

```typescript
export function useOrganizationProfile(spId: string) { ... }
export function useUpdateOrganizationProfile() { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/settings.ts` | **Modify** | Add org profile query/mutation |

---

## Acceptance Criteria

- [ ] Query returns all org profile fields
- [ ] Mutation updates org profile
- [ ] Hooks with loading/error states

---

## Dependencies

- **Blocked by**: Task 15.10 (file creation)
- **Blocks**: Tasks 15.2, 15.3, 15.4
