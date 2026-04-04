# Task 4.6 — Notification Sound

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.6 — Notification Sound
> **Files**: `apps/web/src/lib/notification-context.tsx`, `apps/web/src/lib/sounds.ts` (new), `apps/web/src/app/(dashboard)/settings/preferences/page.tsx`
> **Dependencies**: Phase 3E (Settings preferences wired)
> **Existing Pattern**: `apps/web/src/lib/chat-context.tsx` — `playMessageSound()` using Web Audio API

---

## Objective

Add audible notification sounds when SSE `notification` events arrive while the tab is active. Reuse the existing Web Audio API pattern from chat-context for an in-code generated tone (no external audio file needed), and provide a user toggle in notification preferences to enable/disable sounds.

---

## Current State

### Chat Sound — Already Working (Reference Pattern)
```typescript
// apps/web/src/lib/chat-context.tsx — playMessageSound()
function playMessageSound(): void {
  try {
    const AudioCtx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx  = new AudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch {
    // ignore – AudioContext unavailable
  }
}
```
- Uses Web Audio API oscillator — no external audio files
- Already handles browser compatibility (`AudioContext` / `webkitAudioContext`)
- Works within browser autoplay policy (triggered by user interaction context)

### Notification Context — SSE Event Handler
```typescript
// apps/web/src/lib/notification-context.tsx
// On 'notification' event → updates notifications array + unreadCount
// ❌ No sound playback on notification event
// EventSource events: 'notification', 'chat_message', 'presence_update'
```

### No Sound Preference Toggle
```
❌ No sound preference in settings
❌ No localStorage flag for notification sound enabled/disabled
```

### No Public Directory / Audio Files
```
❌ apps/web/public/ — directory does NOT exist
✅ Web Audio API approach eliminates need for audio files
```

---

## Requirements

### 4.6.1 — Create Sound Utility
- [x] Create `apps/web/src/lib/sounds.ts`:
  - [x] `playNotificationSound()` — notification alert tone (different from chat message)
  - [x] Use Web Audio API (same pattern as chat-context `playMessageSound`)
  - [x] Notification tone: higher pitch, two-note chime (e.g., C5→E5 ascending)
  - [x] Chat tone stays as-is (descending pitch in chat-context)
  - [x] `isSoundEnabled()` — check localStorage preference
  - [x] `setSoundEnabled(enabled: boolean)` — persist to localStorage
  - [x] Handle browser autoplay policy gracefully (only play after user interaction)

### 4.6.2 — Wire Sound to SSE Notification Events
- [x] Update `apps/web/src/lib/notification-context.tsx`:
  - [x] Import `playNotificationSound` and `isSoundEnabled` from `@/lib/sounds`
  - [x] On `notification` SSE event → check if sound is enabled → play notification sound
  - [x] Only play when tab is active (`!document.hidden`) — when tab is hidden, push notification handles it (Task 4.1)
  - [x] Don't play sound if the user is currently on the inbox page (they're already seeing notifications)
  - [x] Debounce sound: don't play more than once per 3 seconds (avoid rapid-fire sounds)

### 4.6.3 — Add Sound Toggle in Settings
- [x] Update `apps/web/src/app/(dashboard)/settings/preferences/page.tsx`:
  - [x] Add "Notification Sounds" toggle in notification preferences section
  - [x] Default: enabled (`true`)
  - [x] Toggle saves to localStorage: `trustinbox:notification-sound` key
  - [x] Show description: "Play a sound when new notifications arrive"
  - [x] Visual feedback: brief sound preview when toggling ON

### 4.6.4 — Respect Browser Autoplay Policy
- [x] First call to `playNotificationSound()` may be blocked by browser
- [x] After any user interaction (click, keypress) → AudioContext is unlocked
- [x] Never throw or show error if sound fails to play — silently ignore
- [x] Use AudioContext resume if suspended: `ctx.resume()`

---

## Implementation Details

### Sound Utility (`apps/web/src/lib/sounds.ts`)

```typescript
// apps/web/src/lib/sounds.ts
'use client';

const SOUND_ENABLED_KEY = 'trustinbox:notification-sound';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === 'true'; // default: enabled
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

export function playNotificationSound(): void {
  if (!isSoundEnabled()) return;

  try {
    const AudioCtx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // Resume if autoplay policy suspended it
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Notification tone: ascending two-note chime (C5 → E5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);       // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch {
    // ignore – AudioContext unavailable or autoplay blocked
  }
}

// Debounced version — no more than one sound per interval
let lastSoundTime = 0;
const SOUND_DEBOUNCE_MS = 3000;

export function playNotificationSoundDebounced(): void {
  const now = Date.now();
  if (now - lastSoundTime < SOUND_DEBOUNCE_MS) return;
  lastSoundTime = now;
  playNotificationSound();
}
```

### Notification Context Integration

```typescript
// apps/web/src/lib/notification-context.tsx — add to SSE 'notification' event handler

import { playNotificationSoundDebounced } from '@/lib/sounds';

// Inside the EventSource 'notification' event listener:
es.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  // ... existing notification state update logic ...

  // Play sound if tab is active
  if (!document.hidden) {
    playNotificationSoundDebounced();
  }
});
```

### Settings Toggle

```typescript
// In apps/web/src/app/(dashboard)/settings/preferences/page.tsx
// Add to the notification preferences section:

import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '@/lib/sounds';
import { useState, useEffect } from 'react';

function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setSoundEnabled(newValue);
    if (newValue) {
      // Preview the sound when enabling
      playNotificationSound();
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">Notification Sounds</p>
        <p className="text-xs text-text-muted mt-0.5">Play a sound when new notifications arrive</p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          enabled ? 'bg-accent-blue' : 'bg-bg-tertiary'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-5' : 'left-1'
        }`} />
      </button>
    </div>
  );
}
```

---

## Verification

- [x] New notification arrives via SSE → audible chime plays (when tab is active)
- [x] Sound does NOT play when tab is hidden (`document.hidden`)
- [x] Sound does NOT play more than once per 3 seconds (debounce)
- [x] Notification tone is distinct from chat message tone (ascending vs descending)
- [x] Settings → Preferences → "Notification Sounds" toggle works
- [x] Toggling ON plays a preview of the sound
- [x] Toggling OFF → no sound on subsequent notifications
- [x] Sound preference persists across page refreshes (localStorage)
- [x] Default state is enabled (sound on)
- [x] No errors thrown if AudioContext is unavailable (graceful fallback)
- [x] Respects browser autoplay policy — sound works after any user interaction
- [x] Chat message sound (`playMessageSound`) still works independently
- [x] No external audio files required (pure Web Audio API)
