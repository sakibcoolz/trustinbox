# Task 1.4 — Header Component

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/Header.tsx`

---

## Objective

Build the top header bar with dynamic page title, global search trigger, notification bell with badge, and user avatar dropdown menu.

---

## Current State

Header exists at `apps/provider/src/components/Header.tsx` with:
- Dynamic page title derived from `PAGE_TITLES` map + pathname
- Search icon button (non-functional)
- Notification bell with static red dot
- Profile dropdown with user info, "My Profile", "Settings", and "Sign out"

---

## Requirements

### 1. Page Title
- [x] Dynamic title from pathname map (already done)
- [ ] Add breadcrumb trail below/beside title for nested routes (e.g., `Bots > Bot Name > Knowledge`)
- [ ] Support dynamic titles for `[id]` routes by reading from page context or prop

### 2. Global Search (Cmd+K)
- [ ] Search button opens a command palette / search modal (centered overlay)
- [ ] Keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- [ ] Search across: customers, conversations, notifications, campaigns, bots, documents
- [ ] Fuzzy search with type-ahead results grouped by category
- [ ] Navigate to result on selection
- [ ] Recent searches shown when empty

### 3. Notification Bell
- [x] Bell icon with red dot indicator (already done)
- [ ] Replace static dot with dynamic unread count badge (number)
- [ ] Click opens notification dropdown panel (not full page):
  - Last 5 notifications with type icon, message, timestamp
  - "View All" link → `/notifications`
  - "Mark all read" action
- [ ] Real-time badge update via GraphQL subscription (`providerNotificationDelivered`)
- [ ] Animate badge on new notification (pulse effect)

### 4. User Profile Dropdown
- [x] Avatar circle with initials (already done)
- [x] Dropdown with user info + role badge + profile/settings links + logout (already done)
- [ ] Add "Switch Organization" option (links to sidebar SP switcher or opens inline)
- [ ] Add "Keyboard Shortcuts" option → opens shortcut reference modal
- [ ] Add online status indicator (green dot on avatar)

### 5. Org Context Display
- [ ] Show current org name as small text next to or below page title
- [ ] Org verification badge (checkmark for verified orgs)

---

## Implementation Plan

### Search Modal Skeleton
```tsx
function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-bg-elevated border border-border-primary rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
          <Search size={16} className="text-text-muted" />
          <input autoFocus type="text" placeholder="Search customers, conversations, bots..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none" />
          <kbd className="text-[10px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="py-2 max-h-80 overflow-y-auto">
          {/* Search results grouped by category */}
        </div>
      </div>
    </div>
  );
}
```

### Notification Dropdown
```tsx
function NotificationDropdown({ notifications, onMarkRead, onViewAll }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-border-primary rounded-xl shadow-2xl z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <span className="text-sm font-medium">Notifications</span>
        <button onClick={onMarkRead} className="text-xs text-accent-blue hover:underline">Mark all read</button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
      <div className="border-t border-border-primary p-2">
        <Link href="/notifications" className="block text-center text-xs text-accent-blue hover:underline py-1">
          View all notifications
        </Link>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/Header.tsx` | Modify — add search modal, notification dropdown, breadcrumbs |
| `apps/provider/src/components/SearchModal.tsx` | Create — global search command palette |
| `apps/provider/src/components/NotificationDropdown.tsx` | Create — header notification panel |
| `apps/provider/src/hooks/useKeyboardShortcut.ts` | Create — `Cmd+K` handler |

---

## Acceptance Criteria

- [ ] Page title updates dynamically for every route including nested dynamic routes
- [ ] `Cmd+K` / `Ctrl+K` opens search modal from any page
- [ ] Search modal closes on `Escape` or backdrop click
- [ ] Notification bell shows unread count (number, not just dot)
- [ ] Clicking bell opens dropdown with recent notifications
- [ ] "Mark all read" clears badge count
- [ ] Profile dropdown shows user info, role, and all action links
- [ ] Logout clears tokens and redirects to `/auth/login`
- [ ] Header is fixed height (h-14 / 56px) and doesn't scroll

---

## Dependencies

- **Blocked by**: Task 1.1, Task 1.2
- **Blocks**: Task 1.6 (breadcrumbs)  
- **Related**: Task 16.2 (notification subscription), Task 3.1 (dashboard KPIs)
