# Task 4.1 — Push Notification Support

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.1 — Push Notification Support
> **Files**: `apps/web/public/sw.js` (new), `apps/web/src/lib/push-notifications.ts` (new), `apps/web/src/components/providers.tsx`, `apps/web/src/lib/notification-context.tsx`
> **Dependencies**: Phase 3A (Inbox/Notifications must be wired to GraphQL)
> **Backend**: `notification-service` supports PUSH channel in delivery

---

## Objective

Add browser push notification support so users receive native OS-level notifications when the browser tab is not active or the browser is in the background. This includes creating a service worker, requesting notification permission, registering the push subscription with the backend, and dispatching browser notifications for incoming SSE `notification` events.

---

## Current State

### No Service Worker
```
❌ apps/web/public/sw.js — does NOT exist
❌ apps/web/public/ — directory does NOT exist at all
```

### No Push Permission Request
```
❌ No Notification.requestPermission() call anywhere in the web app
❌ No push subscription registration with backend
```

### SSE Notifications — Already Working
```typescript
// apps/web/src/lib/notification-context.tsx — SSE event handling
// EventSource: GET /api/notifications/stream?token=${token}
// Events listened: 'notification', 'chat_message', 'presence_update'
// Reconnection: exponential backoff 3s → 30s cap
// On 'notification' event → updates in-memory notifications array + unreadCount
```

### App Configuration — No PWA Setup
```javascript
// apps/web/next.config.js — plain Next.js config
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${GATEWAY_URL}/api/:path*` },
      { source: '/graphql', destination: `${GATEWAY_URL}/graphql` },
    ];
  },
};
```

### Existing Sound Infrastructure
```typescript
// apps/web/src/lib/chat-context.tsx — Web Audio API for chat sounds
function playMessageSound(): void {
  const AudioCtx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  // ... generates sine wave tone programmatically
}
```

### Providers Component — Current State
```typescript
// apps/web/src/components/providers.tsx
'use client';
import { AuthProvider } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { ToastContainer } from '@/components/ui/toast-container';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}
```

---

## Requirements

### 4.1.1 — Create Service Worker
- [x] Create `apps/web/public/` directory
- [x] Create `apps/web/public/sw.js` with push event listener:
  - [x] Listen for `push` event
  - [x] Parse notification payload from push data (JSON: `{ title, body, icon, url, notificationId }`)
  - [x] Show browser notification via `self.registration.showNotification(title, options)`
  - [x] Include notification icon, badge, and action buttons
- [x] Handle `notificationclick` event:
  - [x] Open the app URL from notification data (e.g., `/inbox?id=<notificationId>`)
  - [x] Focus existing tab if open, otherwise open new tab
- [x] Handle `notificationclose` event for analytics (optional)

### 4.1.2 — Create Push Notification Utility
- [x] Create `apps/web/src/lib/push-notifications.ts`:
  - [x] `requestNotificationPermission()` — requests `Notification.permission` and returns result
  - [x] `registerServiceWorker()` — registers `/sw.js` and returns `ServiceWorkerRegistration`
  - [x] `subscribeToPush(registration)` — creates a `PushSubscription` using VAPID public key
  - [x] `sendSubscriptionToServer(subscription)` — POST subscription to gateway endpoint
  - [x] `isNotificationSupported()` — checks `'Notification' in window && 'serviceWorker' in navigator`
  - [x] `getNotificationPermission()` — returns current `Notification.permission` value

### 4.1.3 — Request Permission on First Login
- [x] In `notification-context.tsx`, after successful SSE connection:
  - [x] Check if notification permission is `'default'` (not yet asked)
  - [x] Show a non-intrusive in-app prompt: "Enable push notifications to stay updated even when the tab is closed"
  - [x] On "Enable" → call `requestNotificationPermission()`
  - [x] On "Maybe later" → dismiss, don't ask again for this session (localStorage flag)
  - [x] If granted → register service worker → subscribe to push → send subscription to server
- [x] Do NOT use the browser's default permission popup immediately — show custom UI first

### 4.1.4 — Wire SSE Events to Browser Notifications
- [x] In `notification-context.tsx`, when an SSE `notification` event arrives:
  - [x] Check if `document.hidden === true` (tab is not active)
  - [x] If hidden AND permission is `'granted'` → show native `new Notification(title, { body, icon })`
  - [x] If hidden AND service worker registered → let service worker handle via `showNotification()`
  - [x] Include notification click handler to focus the tab and navigate to `/inbox?id=<notificationId>`
- [x] Do NOT show browser notification when tab is active (in-app notification is sufficient)

### 4.1.5 — Add Permission Toggle in Settings
- [x] In `apps/web/src/app/(dashboard)/settings/preferences/page.tsx`:
  - [x] Add "Push Notifications" toggle in notification preferences section
  - [x] Show current permission state: Enabled / Disabled / Not Supported
  - [x] Toggle ON → request permission if needed → register SW
  - [x] Toggle OFF → unsubscribe from push → unregister SW subscription

---

## Implementation Details

### Service Worker (`apps/web/public/sw.js`)

```javascript
// apps/web/public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, url, notificationId, category } = data;

  const options = {
    body: body || 'New notification from TrustInbox',
    icon: icon || '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    tag: notificationId || 'trustinbox-notification',
    renotify: true,
    data: { url: url || '/inbox', notificationId },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title || 'TrustInbox', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/inbox';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if found
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      // Open new tab
      return clients.openWindow(url);
    })
  );
});
```

### Push Notification Utility (`apps/web/src/lib/push-notifications.ts`)

```typescript
// apps/web/src/lib/push-notifications.ts

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('[push] Service worker registration failed:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    return subscription;
  } catch (err) {
    console.error('[push] Push subscription failed:', err);
    return null;
  }
}

export async function sendSubscriptionToServer(
  subscription: PushSubscription,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok;
  } catch (err) {
    console.error('[push] Failed to send subscription to server:', err);
    return false;
  }
}
```

### Notification Permission Prompt Component

```typescript
// apps/web/src/components/ui/push-permission-prompt.tsx
'use client';

import { useState } from 'react';

interface PushPermissionPromptProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export function PushPermissionPrompt({ onEnable, onDismiss }: PushPermissionPromptProps) {
  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 max-w-sm animate-fade-in">
      <div className="card border border-accent-blue/20 shadow-elevated">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Enable Push Notifications</p>
            <p className="text-xs text-text-muted mt-1">Stay updated even when the tab is closed</p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={onEnable} className="btn-primary text-xs px-3 py-1.5">
                Enable
              </button>
              <button onClick={onDismiss} className="btn-ghost text-xs px-3 py-1.5">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### SSE → Browser Notification Bridge (in notification-context.tsx)

```typescript
// Add to notification-context.tsx — inside SSE 'notification' event handler
function showBrowserNotification(notification: { id: string; title: string; body?: string }) {
  if (document.hidden && Notification.permission === 'granted') {
    const browserNotif = new Notification(notification.title, {
      body: notification.body || '',
      icon: '/icons/notification-icon.png',
      tag: notification.id,
    });
    browserNotif.onclick = () => {
      window.focus();
      window.location.href = `/inbox?id=${notification.id}`;
      browserNotif.close();
    };
  }
}
```

---

## Verification

- [x] Service worker registers successfully (`navigator.serviceWorker.ready` resolves)
- [x] Permission prompt appears on first authenticated visit (only if permission is `'default'`)
- [x] Granting permission → push subscription is created and sent to server
- [x] When tab is hidden → receiving SSE notification → browser push notification appears
- [x] Clicking browser notification → tab focuses → navigates to `/inbox?id=<id>`
- [x] When tab is active → NO browser notification (in-app notification handles it)
- [x] "Maybe later" → no re-prompt until next session
- [x] Settings toggle correctly reflects and controls push notification state
- [x] Works in Chrome, Firefox, Edge (Safari has limited Push API support — graceful fallback)
- [x] Service worker does not interfere with Next.js routing or hydration
