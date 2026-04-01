# Task 1.6 — Breadcrumb Component

> **Section**: 1. Foundation & Shell  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/Breadcrumb.tsx`
> **Status**: ✅ Complete

---

## Objective

Auto-generate breadcrumb navigation from route segments, allowing users to navigate back up the route hierarchy.

---

## Current State

No breadcrumb component exists. Only the page title in the Header provides location context.

---

## Requirements

### 1. Auto-Generation from Route Segments
- [x] Parse `pathname` into segments: `/campaigns/abc123` → `["campaigns", "abc123"]`
- [x] Map each segment to a human-readable label using a lookup map
- [x] Final segment is plain text (current page), all others are links
- [x] Dynamic segments (`[id]`, `[virtualId]`, `[token]`) show entity name if available, fallback to truncated ID

### 2. Label Map
```typescript
const SEGMENT_LABELS: Record<string, string> = {
  customers: 'Customers',
  notifications: 'Notifications',
  compose: 'Compose',
  conversations: 'Conversations',
  callbacks: 'Callbacks',
  documents: 'Documents',
  campaigns: 'Campaigns',
  new: 'New',
  bots: 'Bots',
  knowledge: 'Knowledge Base',
  analytics: 'Analytics',
  webhooks: 'Webhooks',
  compliance: 'Compliance',
  integrations: 'Integrations',
  settings: 'Settings',
  profile: 'Profile',
  team: 'Team',
  industry: 'Industry',
  cms: 'Content',
  editor: 'Editor',
  media: 'Media Library',
  roles: 'CMS Roles',
};
```

### 3. Rendering
- [x] Format: `Dashboard / Campaigns / Campaign Name`
- [x] Separator: `/` or `›` in `text-text-muted`
- [x] Links: `text-text-secondary hover:text-accent-blue`
- [x] Current: `text-text-primary font-medium`
- [x] Don't show breadcrumb on root `/` (Dashboard)
- [x] Max 4 segments visible, collapse middle with `...` if deeper

### 4. Integration
- [x] Render in Header component below the page title
- [x] Or render as first element inside page content area
- [x] Support page-provided `breadcrumbLabel` for dynamic entities (via React Context or prop)

---

## Implementation Plan

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { SEGMENT_LABELS } from '@/lib/constants';

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: SEGMENT_LABELS[seg] || (seg.length > 12 ? `${seg.slice(0, 8)}…` : seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      <Link href="/" className="text-text-muted hover:text-accent-blue transition-colors">Dashboard</Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-text-muted" />
          {crumb.isLast ? (
            <span className="text-text-secondary">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-text-muted hover:text-accent-blue transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/Breadcrumb.tsx` | Create |
| `apps/provider/src/components/Header.tsx` | Modify — render Breadcrumb below title |
| `apps/provider/src/lib/constants.ts` | Create — segment label map |

---

## Acceptance Criteria

- [x] Breadcrumb renders correctly for all route depths
- [x] Links navigate to correct intermediate routes
- [x] Dynamic IDs shown as truncated strings or entity names
- [x] No breadcrumb shown on Dashboard (`/`)
- [x] Separator chevrons properly spaced
- [x] Accessible: `<nav aria-label="Breadcrumb">` with proper link semantics

---

## Dependencies

- **Blocked by**: Task 1.4 (header)
- **Blocks**: None
- **Related**: Task 1.4 (header integration)
