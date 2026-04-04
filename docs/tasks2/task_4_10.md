# Task 4.10 — Empty State Illustrations

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.10 — Empty State Illustrations
> **Files**: `apps/web/src/components/ui/EmptyState.tsx` (new), `apps/web/src/app/(dashboard)/inbox/page.tsx`, `apps/web/src/app/(dashboard)/callbacks/page.tsx`, `apps/web/src/app/(dashboard)/documents/page.tsx`, `apps/web/src/app/(dashboard)/service-providers/page.tsx`, `apps/web/src/app/(dashboard)/friends/page.tsx`, `apps/web/src/components/chat/conversation-list.tsx`, `apps/web/src/components/chat/chat-area.tsx`
> **Dependencies**: None — standalone enhancement of existing pages
> **Icons**: Lucide React (`lucide-react ^0.344.0` — already installed)

---

## Objective

Replace the inconsistent, minimal empty state patterns scattered across all list pages with meaningful, branded empty states that include descriptive messaging, Lucide icons (instead of inline SVGs), and CTA (call-to-action) buttons where applicable. Extract a shared `EmptyState` component to ensure visual consistency across all pages.

---

## Current State

### No Shared EmptyState Component
```
❌ apps/web/src/components/ui/EmptyState.tsx — does NOT exist
❌ Every page implements its own inline empty state with structural variations
```

### Existing Empty State Inconsistencies

**Inbox** — `inbox/page.tsx` (161 lines):
```tsx
// List empty state (lines 75–84):
<div className="flex flex-col items-center justify-center py-16 px-4">
  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
    <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25..." />
    </svg>
  </div>
  <p className="text-sm text-text-muted">No notifications yet</p>
</div>
// ❌ No description, no CTA, inline SVG
```

**Callbacks** — `callbacks/page.tsx` (245 lines):
```tsx
// List empty state (lines 101–111):
<div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
    <svg className="w-6 h-6 text-text-muted" ...phone icon... />
  </div>
  <p className="text-sm text-text-muted text-center">No callback requests</p>
</div>
// ❌ No description, no CTA, inline SVG
```

**Documents** — `documents/page.tsx` (192 lines):
```tsx
// List empty state (lines 82–91):
<div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
    <svg className="w-6 h-6 text-text-muted" ...document icon... />
  </div>
  <p className="text-sm text-text-muted">No documents found</p>
</div>
// ❌ No description, no CTA, inline SVG
```

**Service Providers** — `service-providers/page.tsx` (250 lines):
```tsx
// List empty state (lines 82–84) — WORST:
<div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
  <p className="text-sm text-text-muted">No providers found</p>
</div>
// ❌ No icon at all, no description, no CTA
```

**Friends** — `friends/page.tsx` (632 lines):
```tsx
// Friends tab empty state (lines ~393–401) — has CTA:
<div className="flex flex-col items-center justify-center py-16 text-center px-6">
  <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
    <svg className="w-6 h-6 text-text-muted" ...people icon... />
  </div>
  <p className="text-sm text-text-muted">No friends found</p>
  <button onClick={() => setTab('find')} className="text-2xs text-accent-blue hover:underline mt-1">Find people to connect</button>
</div>
// ✅ Has a CTA — but still uses inline SVG
```

**Conversations** — `conversation-list.tsx` (203 lines):
```tsx
// Empty list (lines 80–88):
<div className="flex flex-col items-center justify-center py-12 text-text-muted">
  <svg className="w-12 h-12 mb-3 opacity-30" ...chat icon... />
  <p className="text-sm font-medium mb-1">No conversations yet</p>
  <p className="text-xs text-text-muted">Start chatting with your friends!</p>
</div>
// ✅ Has subtitle — but inconsistent icon size (w-12) and no icon wrapper
```

### Detail Panel Placeholders — Also Inconsistent

| Page | Detail Placeholder | Icon Size |
|------|-------------------|-----------|
| Inbox | "Select a notification to view details" | w-16 h-16 |
| Callbacks | "Select a callback request to view details" | w-16 h-16 |
| Documents | "Select a document to preview" | w-16 h-16 |
| Service Providers | "Select a service provider to view details" | w-16 h-16 |
| Friends | **MISSING** — no detail placeholder | — |
| Conversations | "TrustInbox Messages" + subtitle | w-20 h-20 (different!) |

---

## Requirements

### 4.10.1 — Create Shared EmptyState Component
- [x] Create `apps/web/src/components/ui/EmptyState.tsx`:
  - [x] Props: `icon`, `title`, `description`, `action` (optional CTA), `size` (sm, md, lg)
  - [x] Consistent layout: centered icon → title → description → optional CTA button
  - [x] Icon: Lucide React component passed as prop (not inline SVGs)
  - [x] Icon wrapper: rounded background with accent color at 10% opacity
  - [x] Size variants:
    - `sm`: icon w-10 h-10, `py-8` padding (for inline/compact areas)
    - `md`: icon w-12 h-12, `py-12` padding (for list panels)
    - `lg`: icon w-16 h-16, `py-16` padding (for detail panels and full-page)
  - [x] Named export: `export function EmptyState({ ... })`

### 4.10.2 — Enhance Inbox Empty States
- [x] Replace inline empty state in `inbox/page.tsx`:
  - [x] List empty: Lucide `Inbox` icon, title "No notifications yet", description "Service providers you interact with will send you updates here.", CTA: "Browse providers" → `/service-providers`
  - [x] Detail placeholder: Lucide `Inbox` icon (lg), title "Select a notification", description "Choose a notification from the list to view its details"

### 4.10.3 — Enhance Callbacks Empty States
- [x] Replace inline empty state in `callbacks/page.tsx`:
  - [x] List empty: Lucide `PhoneIncoming` icon, title "No callback requests", description "When a service provider wants to call you, it'll appear here. You stay in control of who can reach you.", CTA: "Manage availability" → `/settings/availability`
  - [x] Detail placeholder: Lucide `PhoneIncoming` icon (lg), title "Select a callback", description "Choose a callback request from the list to view details and respond"

### 4.10.4 — Enhance Documents Empty States
- [x] Replace inline empty state in `documents/page.tsx`:
  - [x] List empty: Lucide `FileText` icon, title "No shared documents", description "Documents shared by service providers will appear here. They'll be securely accessible through presigned links."
  - [x] Detail placeholder: Lucide `FileText` icon (lg), title "Select a document", description "Choose a document from the list to preview or download it"

### 4.10.5 — Enhance Service Providers Empty States
- [x] Replace inline empty state in `service-providers/page.tsx`:
  - [x] List empty: Lucide `Building2` icon, title "No service provider connections", description "Browse the directory to discover verified service providers and control how they contact you.", CTA: "Browse directory" (scroll to directory or reset search filter)
  - [x] Detail placeholder: Lucide `Building2` icon (lg), title "Select a provider", description "Choose a service provider to view their details and communication preferences"

### 4.10.6 — Enhance Friends Empty States
- [x] Replace inline empty states in `friends/page.tsx`:
  - [x] Friends tab empty: Lucide `Users` icon, title "No friends found", description "Connect with people to start messaging securely.", CTA: "Find people" → switches to Find tab
  - [x] Requests tab empty: Lucide `UserPlus` icon, title "No pending requests", description "Friend requests you receive will appear here."
  - [x] Find tab empty: Lucide `Search` icon, title matching search, description "Try a different name or username"
  - [x] (Optional) Add detail panel placeholder: Lucide `Users` icon (lg), title "Select a friend", description "Choose a friend to view their profile"

### 4.10.7 — Enhance Conversation Empty States
- [x] Replace inline empty state in `conversation-list.tsx`:
  - [x] List empty: Lucide `MessageCircle` icon, title "No conversations yet", description "Start chatting with your friends! Select a contact to begin."
- [x] Normalize detail placeholder in `chat-area.tsx`:
  - [x] Use `EmptyState` component with Lucide `MessageCircle` icon (lg), title "TrustInbox Messages", description "Select a conversation to start chatting"

---

## Implementation Details

### Shared EmptyState Component

```tsx
// apps/web/src/components/ui/EmptyState.tsx
'use client';

import { type LucideIcon } from 'lucide-react';

const SIZES = {
  sm: { wrapper: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5', padding: 'py-8 px-4' },
  md: { wrapper: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6', padding: 'py-12 px-4' },
  lg: { wrapper: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8', padding: 'py-16 px-4' },
} as const;

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: keyof typeof SIZES;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const s = SIZES[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${s.padding} ${className}`}>
      <div className={`${s.wrapper} bg-bg-tertiary flex items-center justify-center mb-3`}>
        <Icon className={`${s.icon} text-text-muted`} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-accent-blue hover:underline mt-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### Usage in Inbox

```tsx
// apps/web/src/app/(dashboard)/inbox/page.tsx
import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRouter } from 'next/navigation';

// List empty state — replace inline SVG block:
<EmptyState
  icon={Inbox}
  title="No notifications yet"
  description="Service providers you interact with will send you updates here."
  action={{ label: 'Browse providers', onClick: () => router.push('/service-providers') }}
/>

// Detail panel placeholder — replace inline SVG block:
<div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
  <EmptyState
    icon={Inbox}
    size="lg"
    title="Select a notification"
    description="Choose a notification from the list to view its details"
  />
</div>
```

### Usage in Service Providers (Most Improved)

```tsx
// apps/web/src/app/(dashboard)/service-providers/page.tsx
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

// Before — text-only, no icon:
// <p className="text-sm text-text-muted">No providers found</p>

// After — full empty state:
<EmptyState
  icon={Building2}
  title="No service provider connections"
  description="Browse the directory to discover verified service providers and control how they contact you."
  action={{ label: 'Browse directory', onClick: () => setSearch('') }}
/>
```

### Usage in Callbacks

```tsx
// apps/web/src/app/(dashboard)/callbacks/page.tsx
import { PhoneIncoming } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

// List empty state:
<EmptyState
  icon={PhoneIncoming}
  title="No callback requests"
  description="When a service provider wants to call you, it'll appear here. You stay in control of who can reach you."
  action={{ label: 'Manage availability', onClick: () => router.push('/settings/availability') }}
/>

// Detail placeholder:
<EmptyState
  icon={PhoneIncoming}
  size="lg"
  title="Select a callback"
  description="Choose a callback request from the list to view details and respond"
/>
```

### Lucide Icon Mapping Reference

| Page | List Icon | Detail Icon | Import |
|------|-----------|-------------|--------|
| Inbox | `Inbox` | `Inbox` | `import { Inbox } from 'lucide-react'` |
| Callbacks | `PhoneIncoming` | `PhoneIncoming` | `import { PhoneIncoming } from 'lucide-react'` |
| Documents | `FileText` | `FileText` | `import { FileText } from 'lucide-react'` |
| Service Providers | `Building2` | `Building2` | `import { Building2 } from 'lucide-react'` |
| Friends | `Users` / `UserPlus` / `Search` | `Users` | `import { Users, UserPlus, Search } from 'lucide-react'` |
| Conversations | `MessageCircle` | `MessageCircle` | `import { MessageCircle } from 'lucide-react'` |

---

## Verification

- [x] `EmptyState` component renders correctly with all size variants (sm, md, lg)
- [x] Lucide icons render at appropriate sizes matching the wrapper
- [x] Inbox: empty list shows icon + title + description + "Browse providers" CTA
- [x] Inbox: detail panel shows larger icon + "Select a notification" message
- [x] Callbacks: empty list shows phone icon + title + description + "Manage availability" CTA
- [x] Callbacks: detail panel shows larger icon + selection prompt
- [x] Documents: empty list shows document icon + title + description (no CTA)
- [x] Documents: detail panel shows larger icon + selection prompt
- [x] Service Providers: empty list now shows icon + title + description + "Browse directory" CTA (was text-only)
- [x] Service Providers: detail panel shows building icon + selection prompt
- [x] Friends: all three tab empty states use EmptyState component with appropriate icons
- [x] Friends: "Find people" CTA on friends tab switches to Find tab
- [x] Conversations: list empty state uses Lucide icon instead of inline SVG
- [x] Conversations: detail placeholder is normalized with consistent sizing
- [x] No inline `<svg>` elements remain in empty state blocks (all replaced with Lucide)
- [x] CTA buttons are clickable and navigate to correct routes
- [x] Empty states look correct on mobile (max-w-xs description doesn't overflow)
- [x] Dark mode: all colors use semantic tokens (text-text-muted, bg-bg-tertiary, etc.)
- [x] Visual consistency: all empty states follow the same structural pattern
