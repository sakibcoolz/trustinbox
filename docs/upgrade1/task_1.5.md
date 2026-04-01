# Task 1.5 — Mobile Responsive Navigation

> **Section**: 1. Foundation & Shell  
> **Priority**: P1 — Important  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/MobileNav.tsx`
> **Status**: ✅ Complete

---

## Objective

Provide mobile-optimized navigation: a bottom tab bar on phone viewports and a slide-out drawer on tablets, replacing the desktop sidebar on smaller screens.

---

## Current State

No mobile navigation exists. The sidebar is always 256px fixed and does not adapt to small screens.

---

## Requirements

### 1. Bottom Tab Bar (< 640px / `sm` breakpoint)
- [x] Fixed at bottom of viewport, `h-16` with safe area padding for notched devices
- [x] Show top 5 most-used items as icon tabs: Dashboard, Notifications, Conversations, Callbacks, More
- [x] Active tab: blue icon + label, inactive: muted icon, no label
- [x] "More" tab opens full-screen menu overlay with all remaining nav items
- [x] Tab bar hides when virtual keyboard is open (detect via `visualViewport` API)

### 2. Slide-Out Drawer (640px–1024px / `sm` to `lg`)
- [x] Hamburger button in Header triggers drawer from left
- [x] Drawer overlays content (not pushing) with dark backdrop
- [x] Drawer contains full sidebar content (SP switcher, all nav groups)
- [x] Backdrop click or swipe-left closes drawer
- [x] Transition: `transform translateX` 250ms ease
- [x] Closing transitions smoothly (no jump)

### 3. Responsive Layout Coordination
- [x] Hide desktop sidebar on `< lg` (1024px)
- [x] Show hamburger button in Header on `< lg`
- [x] Show bottom tab bar on `< sm` (640px)
- [x] Show drawer trigger on `sm` to `lg`
- [x] Use `useMediaQuery` hook or Tailwind responsive classes for breakpoint detection

### 4. Gesture Support
- [x] Swipe right from left edge opens drawer
- [x] Swipe left closes drawer
- [x] Use touch event handlers with velocity detection (not passive scroll interference)

---

## Implementation Plan

### Bottom Tab Bar
```tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Bell, MessageSquare, PhoneCall, MoreHorizontal } from 'lucide-react';

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Alerts', href: '/notifications', icon: Bell },
  { label: 'Chat', href: '/conversations', icon: MessageSquare },
  { label: 'Calls', href: '/callbacks', icon: PhoneCall },
  { label: 'More', href: '#more', icon: MoreHorizontal },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-bg-secondary border-t border-border-primary flex items-center justify-around h-16 pb-safe z-40 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 ${
              active ? 'text-accent-blue' : 'text-text-muted'
            }`}>
            <Icon size={20} />
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

### Drawer Component
```tsx
export function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} />
      {/* Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-bg-secondary z-50 transition-transform duration-250 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {children}
      </div>
    </>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/MobileNav.tsx` | Create — bottom tab bar component |
| `apps/provider/src/components/MobileDrawer.tsx` | Create — slide-out drawer |
| `apps/provider/src/components/LayoutShell.tsx` | Modify — integrate mobile nav components |
| `apps/provider/src/components/Header.tsx` | Modify — add hamburger button on `< lg` |
| `apps/provider/src/hooks/useMediaQuery.ts` | Create — breakpoint detection hook |

---

## Acceptance Criteria

- [x] Desktop (≥1024px): full sidebar visible, no mobile nav
- [x] Tablet (640px–1024px): sidebar hidden, hamburger in header, drawer opens on click
- [x] Phone (<640px): sidebar hidden, bottom tab bar visible, "More" tab shows full menu
- [x] Drawer has backdrop and closes on backdrop click
- [x] Swipe gestures work on touch devices
- [x] No layout shift when switching between breakpoints
- [x] Bottom tab bar respects safe area insets (iPhone notch)
- [x] Tab bar hides when keyboard is visible

---

## Dependencies

- **Blocked by**: Task 1.3 (sidebar), Task 1.4 (header)
- **Blocks**: None (progressive enhancement)
- **Related**: Task 1.2 (LayoutShell), Task 1.3 (sidebar content reuse)
