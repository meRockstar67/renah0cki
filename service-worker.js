// Минимальный service worker — нужен в первую очередь для того, чтобы браузер
// считал сайт "устанавливаемым" (иконка на главный экран телефона). Сознательно
// НЕ кэширует ничего динамического (запросы к Supabase/B2, сам index.html) —
// сайт живой, с частым обновлением контента (лента, комментарии, лайки), и
// подсовывать устаревшую версию из кэша было бы хуже, чем отсутствие офлайн-режима.
// Кэшируются только полностью статичные файлы (иконки) — как запасной вариант
// на случай отсутствия соединения.
const CACHE_NAME = 'renah0cki-static-v1';
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Сеть в приоритете всегда; кэш — только запасной вариант, и только для тех
// самых статичных иконок из списка выше. Всё остальное (сам сайт, API-запросы)
// этот service worker не трогает вообще.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── Web Push: уведомления модераторам о новых работах на проверку ─────────
// Пришедший push — это просто JSON { title, body, url } (см. воркер,
// notify-moderators). Показываем системное уведомление; иконку/бейдж берём
// из уже существующих статичных файлов сайта.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'renah0cki', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'renah0cki';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Клик по уведомлению — открываем сайт (уже открытую вкладку фокусируем,
// вместо того чтобы плодить новые).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});