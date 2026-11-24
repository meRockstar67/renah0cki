/* PWA renah0cki: регистрирует /service-worker.js и даёт кнопку «Установить приложение».
   Общий для сайта (v2) и Y (/rp/). В настройках: PWA.card(t, 'renah0cki') → html, затем PWA.bind(корень).
   Chrome/Edge/Android — системное окно установки; iPhone/iPad (Safari) — подсказка «Поделиться → На экран „Домой“». */
(function () {
  let deferred = null;
  const listeners = new Set();
  const ua = navigator.userAgent || '';
  const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const changed = () => listeners.forEach(fn => { try { fn(); } catch {} });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => { navigator.serviceWorker.register('/service-worker.js').catch(() => {}); });
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; changed(); });
  addEventListener('appinstalled', () => { deferred = null; changed(); });

  async function install() {
    if (!deferred) return false;
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    deferred = null; changed();
    return r?.outcome === 'accepted';
  }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // карточка для страницы настроек; t — функция перевода
  function card(t, app, cls = 'rules-card sets-card') {
    return `<section class="${cls} pwa-card" data-pwa-card><h2>${esc(t('Приложение'))}</h2><div data-pwa-body>${body(t, app)}</div></section>`;
  }
  function body(t, app) {
    if (standalone()) return `<p class="muted">${esc(t('Вы уже открыли {0} как приложение.', { 0: app }))}</p>`;
    const lead = `<p class="muted">${esc(t('Установите {0} как приложение: своя иконка на экране, отдельное окно без адресной строки, быстрый запуск.', { 0: app }))}</p>`;
    if (deferred) return lead + `<button class="btn accent" type="button" data-pwa-install>${esc(t('Установить приложение'))}</button>`;
    if (isIos) return lead + `<ol class="sets-steps"><li>${esc(t('Откройте сайт в Safari.'))}</li><li>${esc(t('Нажмите «Поделиться» внизу экрана.'))}</li><li>${esc(t('Выберите «На экран „Домой“».'))}</li></ol>`;
    return lead + `<p class="muted">${esc(t('Если кнопки нет: откройте меню браузера (⋮) и выберите «Установить приложение» или «Добавить на главный экран».'))}</p>`;
  }
  function bind(root, t, app) {
    const box = root?.querySelector('[data-pwa-card]'); if (!box) return;
    const draw = () => { if (!box.isConnected) { listeners.delete(draw); return; } box.querySelector('[data-pwa-body]').innerHTML = body(t, app); };
    listeners.add(draw);
    box.addEventListener('click', async e => {
      if (!e.target.closest('[data-pwa-install]')) return;
      await install();
    });
  }
  window.PWA = { install, card, bind, canInstall: () => !!deferred, isIos, standalone };
})();
