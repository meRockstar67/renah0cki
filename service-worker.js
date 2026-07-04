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