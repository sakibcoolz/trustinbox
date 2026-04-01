# Task 15.12 — Industry Profile GraphQL Queries

> **Section**: 15. Settings — Connected Backend  
> **Priority**: P1 — Configuration  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/settings.ts`  
> **Status**: ✅ Complete

---

## Objective

Add industry profile GraphQL queries to `settings.ts`: `industryProfile(key)` and `industryProfiles()`.

---

## GraphQL Schema Reference

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

### Queries

- `GET_INDUSTRY_PROFILE` — single profile by key
- `GET_INDUSTRY_PROFILES` — list all active profiles

### TypeScript Types

```typescript
export interface IndustryProfile {
  id: string;
  industryKey: string;
  displayName: string;
  description?: string;
  defaultCategories: string[];
  complianceHintsJson?: string;
  documentTypesJson?: string;
  callbackWorkflowsJson?: string;
  botPromptPackJson?: string;
  dashboardPresetsJson?: string;
  analyticsPresetsJson?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Hooks

```typescript
export function useIndustryProfile(key: string) { ... }
export function useIndustryProfiles(activeOnly?: boolean) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/settings.ts` | **Modify** | Add industry profile queries + types |

---

## Acceptance Criteria

- [ ] Both queries defined with all fields
- [ ] TypeScript types matching schema
- [ ] Hooks with skip logic

---

## Dependencies

- **Blocked by**: Task 15.10 (file creation)
- **Blocks**: Task 15.5 (industry selector)
