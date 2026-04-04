# Task 4.7 — Mobile Responsive Polish

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.7 — Mobile Responsive Polish
> **Files**: All page files under `apps/web/src/app/(dashboard)/`, `apps/web/src/components/layout/mobile-nav.tsx`, `apps/web/src/components/layout/sidebar.tsx`
> **Dependencies**: Phase 3 (all pages wired and functional)
> **Breakpoints**: Mobile < 640px (`sm:`), Tablet 640-1024px (`md:`), Desktop > 1024px (`lg:`)

---

## Objective

Audit and polish all web app pages for mobile responsiveness (< 640px viewport). Ensure proper touch targets, no horizontal scroll, mobile-optimized layouts, and correct bottom nav interaction. The app already has a mobile nav component and some responsive utilities — this task fills the gaps.

---

## Current State

### Layout — Dual Layout System Exists
```typescript
// apps/web/src/app/(dashboard)/layout.tsx
// Sidebar: hidden on mobile (className="hidden sm:flex w-[72px]")
// Mobile nav: shown on mobile (className="sm:hidden fixed bottom-0")
// Content area: adds pb-16 on mobile for bottom nav clearance (className="pb-16 sm:pb-0")
```

### Mobile Nav — All Routes Covered
```typescript
// apps/web/src/components/layout/mobile-nav.tsx
// 7 items: Inbox, Chats, Calls, People, Services, Files, Settings
// Fixed bottom, z-50, safe-area padding
// Badge support: inbox, chats, calls, people
// Active indicator on top edge
```

### Responsive CSS Utilities — Exist
```css
/* apps/web/src/app/globals.css */
.mobile-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.touch-target { @apply min-h-[44px] min-w-[44px]; }
```

### Current Page Responsive State

| Page | Mobile Status | Issues |
|------|--------------|--------|
| **Dashboard** | ⚠️ Partial | `grid-cols-2 md:grid-cols-4` — stats OK, but AI widget may overflow |
| **Inbox** | ⚠️ Partial | Dual-panel not ideal on mobile — should be single-column |
| **Conversations** | ✅ Good | Chat UI already mobile-optimized |
| **Callbacks** | ❌ Mock data | Needs mobile card layout post Phase 3 |
| **Friends** | ⚠️ Partial | Tab layout may need adjustment |
| **Service Providers** | ❌ Mock data | Grid needs single-column on mobile |
| **Documents** | ❌ Mock data | Grid needs single-column on mobile |
| **Settings** | ⚠️ Partial | Sub-page navigation needs mobile treatment |
| **Profile** | ⚠️ Partial | Multi-tab sections may overflow |

### Header — Mobile Treatment
```typescript
// apps/web/src/components/layout/header.tsx
// Search input: hidden on mobile (className="hidden md:block")
// Page title: hidden on mobile (className="hidden sm:block")
// Logo + notification bell + profile always visible
```

---

## Requirements

### 4.7.1 — Inbox Mobile Layout
- [x] On mobile (< 640px): single-column notification list, no side panel
- [x] Tapping notification → navigate to detail view (full-screen drawer or new view)
- [x] Full-width notification cards with adequate touch targets (min 44px height)
- [x] Swipe action support (optional): swipe left to archive, swipe right to mark read
- [x] Pull-to-refresh gesture for refetching notifications (optional)

### 4.7.2 — Callbacks Mobile Layout
- [x] On mobile: vertical card layout, full-width
- [x] Approve/reject actions as bottom buttons on card (not inline)
- [x] Time slot picker as bottom-sheet modal (not inline dropdown)
- [x] Touch-friendly date/time selection

### 4.7.3 — Settings Mobile Layout
- [x] On mobile: settings sub-pages as separate routes (not sidebar tabs)
- [x] Settings main page: list of settings categories (Privacy, DND, Availability, etc.)
- [x] Each category → full-screen page with back button
- [x] Collapsible sections instead of tab navigation where applicable

### 4.7.4 — Documents Mobile Layout
- [x] Single-column document list on mobile
- [x] Document cards: full-width with file icon, name, SP name, date
- [x] Download/preview actions accessible via tap or long-press
- [x] File preview: full-screen modal on mobile

### 4.7.5 — Service Providers Mobile Layout
- [x] Single-column SP card list on mobile
- [x] Search bar: full-width, sticky at top
- [x] SP cards: compact layout with name, industry, verification badge
- [x] Block/unblock action accessible from card menu

### 4.7.6 — Bottom Nav Route Verification
- [x] Verify all mobile nav routes work correctly with active indicators
- [x] Test navigation between all 7 bottom nav items
- [x] Ensure bottom nav z-index is above page content
- [x] Verify safe-area inset padding on iOS Safari
- [x] Add Activity route to mobile nav if added in Task 4.5

### 4.7.7 — No Horizontal Scroll Audit
- [x] Test every page at 320px, 375px, and 414px viewport widths
- [x] Fix any horizontal overflow (tables, code blocks, long text, fixed-width elements)
- [x] Ensure all `max-w-*` containers respect mobile viewport
- [x] Add `overflow-x-hidden` to problem areas if needed

### 4.7.8 — Touch Target Compliance
- [x] All interactive elements: minimum 44×44px touch target
- [x] Buttons, links, toggles, tabs — verify with `.touch-target` utility
- [x] Spacing between adjacent touch targets: minimum 8px gap
- [x] Icon buttons (close, delete, etc.): ensure sufficient padding

---

## Implementation Details

### Inbox Mobile — Single Column Pattern

```tsx
// apps/web/src/app/(dashboard)/inbox/page.tsx — mobile changes

// Desktop: dual panel (list | detail)
// Mobile: single panel — list only, detail opens as full-screen overlay
<div className="flex-1 flex overflow-hidden">
  {/* List — always visible on desktop, primary view on mobile */}
  <div className="w-full sm:w-80 sm:border-r border-border-primary overflow-y-auto">
    {/* notification list */}
  </div>

  {/* Detail panel — hidden on mobile unless a notification is selected */}
  <div className="hidden sm:flex flex-1 flex-col">
    {/* desktop detail view */}
  </div>

  {/* Mobile detail overlay */}
  {selectedNotification && (
    <div className="fixed inset-0 z-40 bg-bg-primary sm:hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-primary">
        <button onClick={handleClose} className="btn-icon">
          <svg className="w-5 h-5" ...>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-text-primary truncate">Notification</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* notification detail content */}
      </div>
    </div>
  )}
</div>
```

### Callbacks Mobile — Bottom Sheet Pattern

```tsx
// Approve/reject flows on mobile
// Use a bottom-sheet pattern for time slot selection

function MobileBottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border-primary rounded-t-2xl animate-slide-up max-h-[70vh] overflow-y-auto mobile-safe-bottom">
        <div className="w-10 h-1 rounded-full bg-border-secondary mx-auto mt-2 mb-4" />
        {children}
      </div>
    </div>
  );
}
```

### Settings Mobile — Category List

```tsx
// apps/web/src/app/(dashboard)/settings/page.tsx — mobile layout
// On mobile: show list of settings categories
const settingsCategories = [
  { href: '/settings/privacy', label: 'Privacy Preferences', icon: '🔒', description: 'Control who can contact you' },
  { href: '/settings/dnd', label: 'Do Not Disturb', icon: '🌙', description: 'Set quiet hours' },
  { href: '/settings/availability', label: 'Availability', icon: '📅', description: 'Manage your availability slots' },
  { href: '/settings/blocked', label: 'Blocked Providers', icon: '🚫', description: 'Manage blocked service providers' },
  { href: '/settings/preferences', label: 'Preferences', icon: '⚙️', description: 'App preferences and notifications' },
];

// Mobile: vertical list with chevron indicators
// Desktop: sidebar navigation (existing pattern)
```

### Animation for Slide-Up (add to tailwind.config.js)

```javascript
// Add to keyframes in tailwind.config.js
'slide-up': {
  '0%': { transform: 'translateY(100%)' },
  '100%': { transform: 'translateY(0)' },
},
// Add to animation
'slide-up': 'slide-up 0.3s ease-out',
```

---

## Testing Checklist

### Viewport Testing Matrix
- [x] 320px (iPhone SE) — all pages render without horizontal scroll
- [x] 375px (iPhone 12/13) — all pages render correctly
- [x] 414px (iPhone Pro Max) — all pages render correctly
- [x] 768px (iPad) — tablet layout works as expected
- [x] Landscape orientation on mobile — layout adapts

### Per-Page Mobile Verification
- [x] Dashboard: stats grid 2-col, AI widget fits, quick actions 3-col remain or stack
- [x] Inbox: single-column list, notification detail as full-screen overlay
- [x] Conversations: already mobile-optimized — verify still works
- [x] Callbacks: vertical cards, bottom-sheet for actions
- [x] Friends: tabs work, friend cards full-width
- [x] Service Providers: single-column, search bar sticky
- [x] Documents: single-column, download/preview accessible
- [x] Settings: category list on mobile, each sub-page has back nav
- [x] Profile: sections stack vertically, avatar upload works
- [x] Activity (Task 4.5): timeline cards full-width

### General Mobile Checks
- [x] Bottom nav visible on all pages, correct active state
- [x] No content hidden under bottom nav (pb-16 padding)
- [x] Safe-area insets respected on iOS (notch + home indicator)
- [x] All touch targets ≥ 44px
- [x] No text truncation that hides critical information
- [x] Modals and dropdowns fit within mobile viewport
- [x] Keyboard doesn't push content off-screen on input focus
