'use client';

import { useCallback, useEffect, useState } from 'react';

type PermissionState = 'default' | 'granted' | 'denied';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as PermissionState);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, url?: string) => {
      if (permission !== 'granted') return;
      if (typeof document !== 'undefined' && document.hasFocus()) return;

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `${title}-${Date.now()}`,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (url) {
          window.location.href = url;
        }
      };
    },
    [permission],
  );

  return { permission, requestPermission, showNotification };
}
