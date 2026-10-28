/* Brio Cart service worker: shows push alerts (rider arrived, new booking) even when the site is closed. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Brio Cart', body: event.data ? event.data.text() : '' };
  }
  const booking = data.type === 'RIDER_OFFER' || data.type === 'RIDER_ASSIGNED' || data.type === 'NEW_ORDER';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Brio Cart', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      requireInteraction: !!data.sticky,
      vibrate: booking ? [300, 150, 300, 150, 300] : [200, 100, 200],
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(url).catch(() => undefined);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
