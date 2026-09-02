// Service Worker for Lopes Captação PWA
const CACHE_NAME = 'lopes-captacao-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first strategy with offline fallback
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listen to messages from app clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'lopes-imoveis-alerta',
        renotify: true,
        ...options
      });
    }
  }
});

// Push notification event listener (Web Push / VAPID)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Lopes Captação', body: event.data.text() };
    }
  }

  const title = data.title || 'Lopes Captação - Lembrete de Imóvel';
  const options = {
    body: data.body || 'Você possui imóveis que precisam de confirmação de status com o proprietário.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    data: data.data || { url: '/?view=reminder' },
    tag: data.tag || 'lopes-overdue-alert',
    renotify: true,
    requireInteraction: data.requireInteraction ?? true,
    actions: data.actions || [
      { action: 'open_reminder', title: 'Ver Imóveis Pendentes' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks on mobile device / desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=reminder';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and notify it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return client;
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

