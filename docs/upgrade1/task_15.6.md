# Task 15.6 — Industry-Specific Configuration

> **Section**: 15. Settings  
> **Priority**: P1 — Configuration  
> **Estimated Scope**: Medium  
> **Route**: `/settings/industry`  
> **Status**: ✅ Complete

---

## Objective

Display industry-specific configuration loaded from the selected `IndustryProfile`: workflow templates, default notification categories, callback rules, bot prompt pack, and compliance hints.

---

## Current State

The page shows hardcoded `communicationDefaults` (max daily notifications, preferred channels, quiet hours, callback window) and `templates` (notification footer, callback greeting). These should be replaced by data from the selected industry profile.

### IndustryProfile Fields

```graphql
defaultCategories: [String!]!
complianceHintsJson: String    # JSON with compliance guidelines
documentTypesJson: String       # JSON with required document types
callbackWorkflowsJson: String   # JSON with callback workflow templates
botPromptPackJson: String       # JSON with bot prompt templates
dashboardPresetsJson: String    # JSON with dashboard configuration
analyticsPresetsJson: String    # JSON with analytics presets
```

---

## Requirements

### Display Sections

1. **Default Notification Categories**: chips showing which categories are pre-configured
2. **Communication Defaults**: max daily notifications, quiet hours, callback windows (editable)
3. **Compliance Hints**: parsed from `complianceHintsJson`, shown as a checklist or info cards
4. **Document Types**: required document types for the industry
5. **Bot Prompt Templates**: available bot templates from `botPromptPackJson`

### Editability

- Communication defaults are editable (override industry defaults)
- Other fields shown read-only with "Industry default" badge
- Save overrides to org-specific settings

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/industry/page.tsx` | **Modify** | Show industry-specific config from profile |

---

## Acceptance Criteria

- [ ] Default categories shown as chips
- [ ] Communication defaults editable
- [ ] Compliance hints displayed
- [ ] Document types listed
- [ ] Bot templates shown
- [ ] "Industry default" badges on read-only fields
- [ ] Hardcoded `mockProfile` removed

---

## Dependencies

- **Blocked by**: Task 15.5 (industry selector)
- **Blocks**: None
