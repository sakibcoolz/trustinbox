// TrustInbox Service Worker — Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'TrustInbox', body: event.data.text() };
  }

  const { title, body, url, notificationId, category } = data;

  const options = {
    body: body || 'New notification from TrustInbox',
    icon: '/icons/notification-icon.png',
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
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
