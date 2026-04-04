/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

const SOUND_ENABLED_KEY = 'trustinbox:notification-sound';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
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

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Notification tone: ascending two-note chime (C5 → E5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);        // C5
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
