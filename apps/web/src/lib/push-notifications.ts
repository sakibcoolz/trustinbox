// Push notification utilities for TrustInbox web app

const SW_PATH = '/sw.js';
const STORAGE_KEY = 'trustinbox:push-dismissed';

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
    const registration = await navigator.serviceWorker.register(SW_PATH);
    return registration;
  } catch {
    return null;
  }
}

export function showBrowserNotification(title: string, body: string, notificationId?: string): void {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/icons/notification-icon.png',
    tag: notificationId || 'trustinbox-notification',
  });

  notification.onclick = () => {
    window.focus();
    if (notificationId) {
      window.location.href = `/inbox?id=${notificationId}`;
    }
    notification.close();
  };
}

export function wasPushDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

export function dismissPushPrompt(): void {
  sessionStorage.setItem(STORAGE_KEY, 'true');
}

export function isPushEnabled(): boolean {
  return isNotificationSupported() && Notification.permission === 'granted';
}
