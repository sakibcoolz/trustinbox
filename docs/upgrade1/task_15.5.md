# Task 15.5 — Industry Profile Selector

> **Section**: 15. Settings  
> **Priority**: P1 — Configuration  
> **Estimated Scope**: Medium  
> **Route**: `/settings/industry`  
> **File**: `apps/provider/src/app/settings/industry/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded industry settings with a dropdown that fetches available industry profiles from the GraphQL `industryProfiles()` query.

---

## Current State

`apps/provider/src/app/settings/industry/page.tsx` (154 lines):
- Hardcoded `industries` array: Banking & Finance, Healthcare, Insurance, etc.
- `mockProfile` with industry, subIndustry, regulatoryBody, complianceFrameworks, communicationDefaults, templates
- All data is client-side state only, no backend integration
- Save button triggers a 2-second fake save

### GraphQL Schema

```graphql
type IndustryProfile {
  id: ID!
  industryKey: String!
  displayName: String!
  description: String
  defaultCategories: [String!]!
  complianceHintsJson: String
  documentTypesJson: String
  callbackWorkflowsJson: String
  botPromptPackJson: String
  dashboardPresetsJson: String
  analyticsPresetsJson: String
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

query industryProfile(industryKey: String!): IndustryProfile!
query industryProfiles(activeOnly: Boolean, limit: Int, offset: Int): IndustryProfileConnection!
```

---

## Requirements

- Fetch `industryProfiles(activeOnly: true)` for dropdown options
- Display `displayName` and `description` for each option
- On selection, load that profile's details
- Replace hardcoded `industries` array
- Replace `mockProfile` with fetched data

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/industry/page.tsx` | **Modify** | Replace hardcoded industries with live query |
| `apps/provider/src/lib/graphql/settings.ts` | **Modify** | Add industry profile query |

---

## Acceptance Criteria

- [ ] Dropdown fetches from `industryProfiles()` query
- [ ] Shows displayName + description
- [ ] Selecting profile loads its details
- [ ] Hardcoded `industries` array removed

---

## Dependencies

- **Blocked by**: Task 15.12 (GraphQL queries for industry profiles)
- **Blocks**: Tasks 15.6, 15.7
