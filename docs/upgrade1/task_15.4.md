# Task 15.4 — Save Organization Profile

> **Section**: 15. Settings — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Small  
> **Route**: `/settings/profile`  
> **Status**: ✅ Complete

---

## Objective

Wire the organization profile form to update the organization-service via GraphQL mutation. Saves org name, display name, logo, description, website, contact info, and branding settings.

---

## Requirements

### Mutation

```graphql
mutation UpdateOrganizationProfile($input: UpdateOrganizationProfileInput!) {
  updateOrganizationProfile(input: $input) {
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
  }
}
```

### Implementation

- Use existing REST API pattern or add GraphQL mutation
- On success: show success toast, update local state
- On error: show error message, preserve form state
- Logo upload: use presigned URL flow (same as document upload)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/settings.ts` | **Create** | Settings-related queries/mutations |
| `apps/provider/src/app/settings/profile/page.tsx` | **Modify** | Wire save action |

---

## Acceptance Criteria

- [ ] Save calls mutation/API with all org fields
- [ ] Logo upload via presigned URL
- [ ] Success/error feedback
- [ ] Form state preserved on error

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Tasks 15.2, 15.3
