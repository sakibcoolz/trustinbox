# Task 1.3 — Sidebar Component

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Large  
> **File**: `apps/provider/src/components/sidebar.tsx`

---

## Objective

Build a collapsible, role-aware navigation sidebar with icon + label groups, service provider switcher, and active route highlighting.

---

## Current State

The sidebar already exists at `apps/provider/src/components/sidebar.tsx` with:
- Three nav groups: Main (8 items), Content/CMS (3 items), Platform (5 items)
- SP switcher dropdown reading from localStorage
- Role-based filtering (SP_ADMIN-only paths: `/webhooks`, `/integrations`)
- Active route detection via `usePathname()`

---

## Requirements

### 1. Navigation Groups

| Group | Items | Icons |
|-------|-------|-------|
| **Main** | Dashboard, Customers, Notifications, Conversations, Callbacks, Documents, Campaigns, Bots | LayoutDashboard, Users, Bell, MessageSquare, PhoneCall, FileText, Megaphone, Bot |
| **Content** | Content, Media Library, CMS Roles | BookOpen, Image, UserCog |
| **Platform** | Analytics, Webhooks*, Compliance, Integrations*, Settings | BarChart3, Webhook, Shield, Plug, Settings |

*SP_ADMIN only

- [x] All nav items with correct icons and routes (already implemented)
- [x] Add unread/notification badges next to relevant items:
  - Notifications: unread count badge
  - Conversations: unread conversation count
  - Callbacks: pending count
- [x] Add tooltip on icon-only (collapsed) state showing label

### 2. Collapsible Sidebar
- [x] Toggle button (hamburger / chevron) at bottom or top of sidebar
- [x] Collapsed state: 64px wide, show only icons centered
- [x] Expanded state: 256px wide, show icon + label
- [x] Persist collapse state in `localStorage('sidebarCollapsed')`
- [x] Smooth CSS transition on width change (200ms ease)
- [x] Hover on collapsed sidebar temporarily expands with overlay (not pushing content)

### 3. Service Provider Switcher
- [x] Dropdown at sidebar top showing current SP name (already done)
- [x] List of available SPs with check mark on active (already done)
- [x] Show SP industry badge/icon next to name
- [x] Show verification status indicator (green check for verified, yellow for pending)
- [x] Handle case: user has no SPs yet (show "Setup required" with link to settings)
- [x] Store switch in localStorage and trigger page reload (already done)

### 4. Active Route Highlighting
- [x] Active item: `bg-bg-hover text-text-primary font-medium` with blue icon (already done)
- [x] Inactive: `text-text-secondary hover:text-text-primary hover:bg-bg-hover` (already done)
- [x] Add left border accent: `border-l-2 border-accent-blue` on active item
- [x] Ensure nested routes highlight parent (e.g., `/bots/new` highlights "Bots")

### 5. Role-Based Filtering
- [x] Admin-only paths hidden for non-admin roles (already done)
- [x] Extend to CONTENT_MANAGER: hide Compliance
- [x] ANALYST: show only Dashboard, Analytics, Compliance (read-only views)
- [x] AGENT: show Dashboard, Customers, Conversations, Callbacks, Documents

### 6. Responsive Behavior
- [x] On screens < 1024px: sidebar becomes off-screen drawer
- [x] Toggle via hamburger in Header
- [x] Backdrop overlay when drawer is open
- [x] Swipe-to-close gesture on mobile

---

## Implementation Plan

### CSS Classes for Collapse
```css
/* In globals.css or a sidebar-specific module */
.sidebar-expanded { width: 256px; transition: width 200ms ease; }
.sidebar-collapsed { width: 64px; transition: width 200ms ease; }
.sidebar-collapsed .nav-label { display: none; }
.sidebar-collapsed .nav-icon { margin: 0 auto; }
```

### Badge Component
```tsx
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto bg-status-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

### Role → Visible Routes Map
```typescript
const ROLE_NAV_ACCESS: Record<Role, string[]> = {
  PLATFORM_ADMIN: ['*'],  // all routes
  SP_ADMIN: ['*'],        // all routes
  CONTENT_MANAGER: mainNav.map(i => i.href).concat(cmsNav.map(i => i.href)).concat(['/analytics', '/settings']),
  AGENT: ['/', '/customers', '/conversations', '/callbacks', '/documents', '/notifications', '/settings'],
  ANALYST: ['/', '/analytics', '/compliance'],
};
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/sidebar.tsx` | Modify — add collapse, badges, role map, responsive drawer |
| `apps/provider/src/app/globals.css` | Modify — add sidebar transition classes |
| `apps/provider/src/hooks/useSidebar.ts` | Create — collapse state hook with localStorage |

---

## Acceptance Criteria

- [x] Sidebar renders all 3 navigation groups with correct icons and labels
- [x] Collapse toggle shrinks sidebar to 64px, showing only icons
- [x] Collapse state persists across page refreshes (localStorage)
- [x] SP switcher shows current org, allows switching, reloads page
- [x] Active route has blue left border accent and blue icon
- [x] Admin-only items hidden for non-admin roles
- [x] AGENT and ANALYST see restricted menu items
- [x] Unread badges appear for Notifications, Conversations, Callbacks
- [x] Mobile: sidebar becomes drawer with backdrop
- [x] Keyboard: `Ctrl+B` toggles sidebar collapse

---

## Dependencies

- **Blocked by**: Task 1.1 (root layout), Task 1.2 (LayoutShell)
- **Blocks**: Task 1.5 (mobile nav), all page navigation
- **Related**: Task 2.8 (role definitions), Task 2.12 (sidebar role filtering), Task 2.17 (myServiceProviders query)
