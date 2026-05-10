import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

self.skipWaiting();
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Precache hashed JS/CSS/images (not HTML — HTML is handled via NetworkFirst below)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// HTML navigations always go to the network so new deploys are picked up immediately.
// Falls back to the precached /index.html only when offline.
registerRoute(
  new NavigationRoute(new NetworkFirst({
    cacheName: 'pages-cache',
    networkTimeoutSeconds: 5,
  }))
);

// API calls — always network first
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 10 })
);

// ── Push notification handlers (preserved from original sw.js) ──────────────

self.addEventListener('push', (event) => {
  let data = { title: 'FantasyRater', body: 'You have a new notification', url: '/' };
  try {
    data = { ...data, ...JSON.parse(event.data.text()) };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
