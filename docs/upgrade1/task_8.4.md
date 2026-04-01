# Task 8.4 — Classification Tags

> **Section**: 8. Documents  
> **Priority**: P1 — Categorization  
> **Estimated Scope**: Medium  
> **Route**: `/documents`  
> **Component**: ClassificationBadge
> **Status**: ✅ Complete

---

## Objective

Implement auto-classified document tags (invoice, ID, contract, report, general) fetched from the document-service's AI classification system, with ability to manually override.

---

## Current State

```tsx
// Mock categories are hardcoded strings
{ ..., category: 'Legal' },
{ ..., category: 'Compliance' },
{ ..., category: 'KYC' },
```

Categories are static strings with no relationship to the backend classification system. The proto defines `DocumentClassification` with `ClassifiedBy` (USER/AI/SYSTEM) enum.

---

## Requirements

### Classification Values

| Classification | Color | Icon |
|---------------|-------|------|
| `invoice` | `bg-purple-500/10 text-purple-400` | Receipt |
| `identity` | `bg-accent-blue/10 text-accent-blue` | CreditCard |
| `contract` | `bg-status-success/10 text-status-success` | FileCheck |
| `report` | `bg-accent-orange/10 text-accent-orange` | BarChart2 |
| `general` | `bg-border-secondary text-text-muted` | File |

### Classification Source
- Primary: AI-classified by document-service on upload
- Fallback: User can manually classify/override
- Display `ClassifiedBy` indicator: "AI" icon or "Manual" icon

### Manual Override
- Click classification badge → dropdown with options
- Select new classification → mutation to update
- Show "AI ✓" or "Manual" indicator

### Filter Integration
- Classification values power the category filter chips in task 8.1
- Replace hardcoded "Legal/Compliance/KYC/Internal/Onboarding" with actual classifications

---

## Implementation Plan

```tsx
import { Receipt, CreditCard, FileCheck, BarChart2, File } from 'lucide-react';

const classificationConfig = {
  invoice:  { label: 'Invoice',  icon: Receipt,    color: 'bg-purple-500/10 text-purple-400' },
  identity: { label: 'Identity', icon: CreditCard,  color: 'bg-accent-blue/10 text-accent-blue' },
  contract: { label: 'Contract', icon: FileCheck,   color: 'bg-status-success/10 text-status-success' },
  report:   { label: 'Report',   icon: BarChart2,   color: 'bg-accent-orange/10 text-accent-orange' },
  general:  { label: 'General',  icon: File,        color: 'bg-border-secondary text-text-muted' },
};

function ClassificationBadge({ classification, classifiedBy, onOverride }: Props) {
  const [open, setOpen] = useState(false);
  const config = classificationConfig[classification] ?? classificationConfig.general;
  const Icon = config.icon;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={10} /> {config.label}
        {classifiedBy === 'AI' && <span className="text-[9px] opacity-60">AI</span>}
      </button>
      {/* Override dropdown */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/ClassificationBadge.tsx` | Create — badge with override dropdown |
| `apps/provider/src/components/documents/DocumentCard.tsx` | Modify — use ClassificationBadge |
| `apps/provider/src/app/documents/page.tsx` | Modify — update filter chips to use classification values |

---

## Acceptance Criteria

- [ ] Badges display classification with color + icon
- [ ] "AI" indicator when auto-classified
- [ ] Click badge opens override dropdown
- [ ] Manual override triggers mutation
- [ ] Classification values used in filter chips
- [ ] TypeScript enum for classification values

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager), Task 8.3 (DocumentCard), Task 8.12 (GraphQL queries)
- **Blocks**: Task 8.5 (search by classification)
- **Related**: Task 1.18 (Badge component — follows same pattern)
