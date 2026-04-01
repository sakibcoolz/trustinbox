'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationSoundType = 'callback' | 'message' | 'success';

const STORAGE_KEY = 'notificationSoundsEnabled';

const SOUND_URLS: Record<NotificationSoundType, string> = {
  callback: '/sounds/callback.mp3',
  message: '/sounds/message.mp3',
  success: '/sounds/success.mp3',
};

export function useNotificationSound() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEnabled(localStorage.getItem(STORAGE_KEY) === 'true');
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const playSound = useCallback(
    (type: NotificationSoundType) => {
      if (!enabled) return;
      try {
        const audio = new Audio(SOUND_URLS[type]);
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Silently fail if blocked by browser autoplay policy
        });
      } catch {
        // Audio creation failed — ignore
      }
    },
    [enabled],
  );

  return { playSound, enabled, toggle };
}
