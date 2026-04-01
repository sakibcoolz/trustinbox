# Task 16.5 — Notification Sounds

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P3 — Polish  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/useNotificationSound.ts`  
> **Status**: ✅ Complete

---

## Objective

Add optional audio cues for new callbacks and messages. User can toggle notification sounds on/off in settings (stored in localStorage).

---

## Requirements

### Sound Triggers

| Event | Sound | Description |
|-------|-------|-------------|
| New callback request | Soft chime | Short notification sound |
| New message | Message bubble | Quick pop sound |
| Campaign completed | Success tone | Completion sound |

### User Setting

- Toggle in user preferences (localStorage key: `notificationSoundsEnabled`)
- Default: off
- Toggle accessible from header menu or settings
- Respect browser autoplay policy (require user interaction first)

### Implementation

```typescript
export function useNotificationSound() {
  const enabled = localStorage.getItem('notificationSoundsEnabled') === 'true';

  function playSound(type: 'callback' | 'message' | 'success') {
    if (!enabled) return;
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Silently fail if blocked by browser
  }

  return { playSound, enabled };
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useNotificationSound.ts` | **Create** | Sound hook |
| `apps/provider/public/sounds/` | **Create** | Sound files (callback.mp3, message.mp3, success.mp3) |

---

## Acceptance Criteria

- [ ] Sound plays on new callback
- [ ] Sound plays on new message
- [ ] Toggle in localStorage
- [ ] Respects browser autoplay policy
- [ ] Volume at 30%

---

## Dependencies

- **Blocked by**: Task 16.2 (subscriptions — triggers for sounds)
- **Blocks**: None
