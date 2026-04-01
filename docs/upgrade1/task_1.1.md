# Task 1.1 — Root Layout (`layout.tsx`)

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/app/layout.tsx`

---

## Objective

Configure the root layout as the top-level wrapper for the entire provider portal, ensuring the dark theme, font stack, and global providers are correctly applied.

---

## Current State

```typescript
// apps/provider/src/app/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { LayoutShell } from '@/components/LayoutShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`} suppressHydrationWarning>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
```

---

## Requirements

### 1. Font Loading
- [x] Import **Inter** as primary sans font (already done)
- [x] Import **JetBrains Mono** from Google Fonts for monospace code/data displays
- [x] Apply both fonts via CSS custom properties or Tailwind classes so `font-sans` → Inter, `font-mono` → JetBrains Mono

### 2. Dark Theme Enforcement
- [x] `<html>` has `className="dark"` (already done)
- [x] `<body>` applies `bg-bg-primary text-text-primary` (already done)
- [x] Add `color-scheme: dark` via `<meta>` to hint browsers for scrollbar and form control theming

### 3. Global Providers
- [x] Wrap `<LayoutShell>` with an Apollo Client `<ApolloProvider>` for GraphQL operations
- [x] Add a `<ToastProvider>` context for the toast notification system (task 1.7)
- [x] Ensure providers are client-side only (`'use client'` boundary handled by provider components)

### 4. Metadata
- [x] Title: "TrustInbox Provider Portal" (already done)
- [x] Add `viewport` meta for mobile: `width=device-width, initial-scale=1`
- [x] Add `themeColor: '#0b0d0f'` for mobile browser chrome color
- [x] Add Open Graph metadata for link previews

### 5. Suppress Hydration Warnings
- [x] `suppressHydrationWarning` on `<body>` (already done) — required because localStorage reads on client differ from server

---

## Implementation Plan

```typescript
// Target: apps/provider/src/app/layout.tsx
import '@/app/globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LayoutShell } from '@/components/LayoutShell';
import { ApolloWrapper } from '@/lib/apollo-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
  themeColor: '#0b0d0f',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-bg-primary text-text-primary min-h-screen" suppressHydrationWarning>
        <ApolloWrapper>
          <LayoutShell>{children}</LayoutShell>
        </ApolloWrapper>
      </body>
    </html>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/layout.tsx` | Modify — add JetBrains Mono, CSS vars, ApolloWrapper |
| `apps/provider/src/lib/apollo-provider.tsx` | Create — Apollo Client provider (see task 17.1) |
| `apps/provider/tailwind.config.js` | Modify — update `fontFamily` to use CSS variables |

---

## Acceptance Criteria

- [ ] Both Inter and JetBrains Mono fonts load correctly
- [ ] `font-sans` resolves to Inter, `font-mono` resolves to JetBrains Mono
- [ ] Dark theme applied globally — no white flash on initial load
- [ ] Browser chrome respects `themeColor` on mobile
- [ ] ApolloProvider wraps the entire app tree
- [ ] Page renders without hydration errors
- [ ] `suppressHydrationWarning` prevents localStorage-driven mismatches

---

## Dependencies

- **Blocked by**: None (foundational)
- **Blocks**: All other tasks (this is the root layout)
- **Related**: Task 1.11 (color palette), Task 17.1 (Apollo Client setup)
