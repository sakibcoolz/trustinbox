# Task 16.6 — Browser Push Notifications

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P3 — Polish  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/hooks/usePushNotifications.ts`  
> **Status**: ✅ Complete

---

## Objective

Implement browser push notifications via service worker for background tab alerts. When the provider app is not in the active tab, show native OS notifications for important events.

---

## Requirements

### Notification Triggers

| Event | Title | Body |
|-------|-------|------|
| New callback request | "New Callback Request" | "Customer VID-xxx requested a callback" |
| New message | "New Message" | "Message from VID-xxx in conversation" |
| Campaign completed | "Campaign Completed" | "'{campaignName}' delivery complete" |
| Webhook failed | "Webhook Failure" | "Delivery to {url} failed" |

### Permission Flow

1. Show a banner: "Enable notifications to stay updated when you're away"
2. On click: request browser notification permission
3. If granted: store preference in localStorage
4. If denied: hide banner, don't ask again

### Implementation

```typescript
export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission);

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function showNotification(title: string, body: string, url?: string) {
    if (permission !== 'granted') return;
    if (document.hasFocus()) return; // Don't show if tab is active

    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: `trustinbox-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
    };
  }

  return { permission, requestPermission, showNotification };
}
```

### Service Worker (optional enhancement)

- Register service worker for background push
- Can be added later for PWA support

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/usePushNotifications.ts` | **Create** | Push notification hook |
| Layout/Header | **Modify** | Add permission request banner |

---

## Acceptance Criteria

- [ ] Permission request flow (banner → browser prompt)
- [ ] Native notifications when tab is not focused
- [ ] Correct titles and bodies per event type
- [ ] Click notification → focus tab + navigate
- [ ] Respects permission state
- [ ] No notification when tab is active

---

## Dependencies

- **Blocked by**: Task 16.2 (subscriptions — event triggers)
- **Blocks**: None
