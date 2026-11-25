(() => {
'use strict';
const ruCoin = n => { const x = Math.abs(Math.trunc(Number(String(n ?? '').replace(/[^\d.-]/g, '')) || 0)), a = x % 10, b = x % 100; return a === 1 && b !== 11 ? 'пузокоин' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'пузокоина' : 'пузокоинов'; };

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const API = 'https://cdn.renah0cki.xyz';
const COIN_IMG = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';
const LS_DOCK = 'feed_dock_token';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
let toastT;
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

(() => {
  const qs = new URLSearchParams(location.search);
  const k = (qs.get('key') || '').trim();
  if (k) {
    try { localStorage.setItem(LS_DOCK, k); } catch {}
    qs.delete('key');
    const clean = location.pathname + (qs.toString() ? '?' + qs.toString() : '');
    history.replaceState(null, '', clean);
  }
})();

function getDockToken() { try { return localStorage.getItem(LS_DOCK) || ''; } catch { return ''; } }
function readSession() { try { return JSON.parse(localStorage.getItem('fh_session')); } catch { return null; } }
function jwtExp(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; } }
let refreshing = null;
async function getJwt() {
  const s = readSession();
  if (!s?.token) return null;
  if (jwtExp(s.token) - Date.now() > 60e3) return s.token;
  if (!s.refreshToken) return null;
  if (!refreshing) refreshing = (async () => {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refreshToken }) });
      if (!r.ok) return null;
      const d = await r.json();
      localStorage.setItem('fh_session', JSON.stringify({ ...(readSession() || s), token: d.access_token, refreshToken: d.refresh_token }));
      return d.access_token;
    } catch { return null; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}
async function post(path, body) {
  const dk = getDockToken();
  const jwt = dk ? null : await getJwt();
  const auth = dk ? 'Dock ' + dk : jwt ? 'Bearer ' + jwt : '';
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body || {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) { try { localStorage.removeItem(LS_DOCK); } catch {} }
    throw new Error(d.error || 'HTTP ' + r.status);
  }
  return d;
}

const S = { events: [], cfg: null, ints: null, filter: 'all', sse: null };

const LOGO_DA = '<svg viewBox="0 0 69 80" aria-hidden="true"><path fill="#f57507" d="M34.86 46.59h-5.42a1.1 1.1 0 0 1-1.11-1.1l.48-4.89a1.1 1.1 0 0 1 1.11-.91h5.42a1.1 1.1 0 0 1 1.11 1.1l-.48 4.88a1.1 1.1 0 0 1-1.11.92zm.87-9.57h-5.52a1.1 1.1 0 0 1-1.11-1.06l1.5-16.51a1.1 1.1 0 0 1 1.11-.94h5.52a1.1 1.1 0 0 1 1.11 1.06l-1.54 16.52a1.1 1.1 0 0 1-1.06.93zm32.46-19.25c.59.68.88 1.57.8 2.46l-2.16 24.53c-.07.8-.43 1.55-1.01 2.11L48.17 63.91a3.3 3.3 0 0 1-2.35.94H27.04L10.5 80l1.28-15.16H3.37A3.37 3.37 0 0 1 .01 61.2L5.15 3.01A3.38 3.38 0 0 1 8.5 0h42.83c.99 0 1.92.43 2.56 1.17l14.3 16.6zM55.11 40.08l1.37-15.14a3.3 3.3 0 0 0-.86-2.45l-8.07-9.25a3.3 3.3 0 0 0-2.54-1.16H19.6a3.38 3.38 0 0 0-3.36 3.01l-3.03 34.07a3.37 3.37 0 0 0 3.36 3.64h24.99c.87 0 1.7-.33 2.33-.92l10.21-9.67c.59-.56.94-1.32 1.01-2.13z"/></svg>';
const LOGO_TW = '<svg viewBox="0 0 2400 2800" aria-hidden="true"><path fill="#9146ff" d="M500 0 0 500v1800h600v500l500-500h400l900-900V0H500zm1700 1300-400 400h-400l-350 350v-350H600V200h1600v1100z"/><rect fill="#9146ff" x="1700" y="550" width="200" height="600"/><rect fill="#9146ff" x="1150" y="550" width="200" height="600"/></svg>';

const LOGO_DN = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#ffc21a"/><path fill="#1d4fd7" d="M32 49s-15-9.2-15-20.1C17 23.4 21.2 19 26.3 19c2.6 0 4.6 1.3 5.7 3.2 1.1-1.9 3.1-3.2 5.7-3.2C42.8 19 47 23.4 47 28.9 47 39.8 32 49 32 49z"/></svg>';
const FEED_TYPES = ['coin', 'da', 'dn', 'tw_follow', 'tw_sub', 'tw_gift', 'tw_points'];
const ALERT_TYPES = ['coin', 'da', 'dn'];

function iconHtml(ev) {
  if (ev.type === 'coin') return `<img src="${COIN_IMG}" alt="">`;
  if (ev.type === 'da') return LOGO_DA;
  if (ev.type === 'dn') return LOGO_DN;
  if (ev.source === 'twitch' || /^tw_/.test(ev.type || '')) return LOGO_TW;
  return '✨';
}
function amountLabel(ev) {
  if (ev.type === 'coin') return `${fmt(ev.amount)} ${ruCoin(ev.amount)}`;
  if (ev.type === 'da') return `${fmt(ev.amount)} ${ev.unit || 'RUB'}`;
  if (ev.type === 'dn') return `${fmt(ev.amount)} ${ev.unit || 'UAH'}`;
  if (ev.type === 'tw_follow') return 'Фолловер';
  if (ev.type === 'tw_sub') return ev.amount > 1 ? `Саб ${ev.amount}м` : 'Подписка';
  if (ev.type === 'tw_gift') return `+${fmt(ev.amount)} саб`;
  if (ev.type === 'tw_points') return ev.amount ? `${fmt(ev.amount)} б.` : 'Баллы';
  return '';
}
function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 45) return 'сейчас';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function renderStatus() {
  const paused = !!S.cfg?.paused;
  $('#ldot').classList.toggle('paused', paused);
  $('#liveTxt').textContent = paused ? 'На паузе' : 'Лента';
  const pb = $('#pauseBtn');
  pb.textContent = paused ? '▶ Старт' : '⏸ Пауза';
  pb.className = 'btn sm ' + (paused ? 'warn' : '');
}

function renderConnList() {
  const box = $('#connList'); if (!box || !S.ints) return;
  const tw = S.ints.twitch || {}, da = S.ints.da || {}, dn = S.ints.donatello || {};
  const dnOk = dn.state === 'ok', dnBad = dn.state === 'error';
  const twOk = tw.state === 'ok';
  const twNeedScope = twOk && tw.subs && (!tw.subs.follow || !tw.subs.sub);
  const daOk = da.state === 'ok';
  const daNeedScope = daOk && !da.hasCustomAlert;
  box.innerHTML = `
    <div class="conn-row ${twOk ? (twNeedScope ? 'warn' : 'ok') : ''}">
      <b><i></i>Twitch${tw.login ? ' · ' + esc(tw.login) : ''}</b>
      <button type="button" class="btn xs ${twOk && !twNeedScope ? 'ghost' : 'pri'}" data-connect="twitch">${!twOk ? 'Подключить' : twNeedScope ? 'Обновить права' : 'Переподкл.'}</button>
    </div>
    <div class="conn-row ${daOk ? 'ok' : ''}">
      <b><i></i>DonationAlerts${da.name ? ' · ' + esc(da.name) : ''}</b>
      <button type="button" class="btn xs ${daOk ? 'ghost' : 'pri'}" data-connect="da">${daOk ? 'Переподкл.' : 'Подключить'}</button>
    </div>
    <div class="conn-row ${dnOk ? 'ok' : dnBad ? 'warn' : ''}" title="${esc(dn.text || '')}">
      <b><i></i>Donatello${dnBad ? ' · ошибка' : ''}</b>
      <button type="button" class="btn xs ${dnOk ? 'ghost' : 'pri'}" data-dn-connect>${dn.connected ? 'Сменить' : 'Подключить'}</button>
    </div>`;
}

function matchesFilter(ev) {
  if (S.filter === 'all') return true;
  if (S.filter === 'twitch') return ev.source === 'twitch';
  return ev.source === S.filter;
}
const ICO_REPLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
const ICO_SKIP   = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l10 7-10 7V5zm12 0h2.5v14H17V5z"/></svg>';
const ICO_DEL    = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>';

function actionBtnHtml(ev) {
  if (!ALERT_TYPES.includes(ev.type)) return '';
  if (ev.playState === 'queued') {
    return `<button type="button" class="is-skip" data-skip="${esc(ev.id)}" title="Пропустить алерт" aria-label="Пропустить">${ICO_SKIP}</button>`;
  }
  return `<button type="button" data-replay="${esc(ev.id)}" title="Повторить донат" aria-label="Повторить">${ICO_REPLAY}</button>`;
}
function cardHtml(ev, isNew = false) {
  return `<article class="ev${isNew ? ' is-new' : ''}" data-t="${esc(ev.type)}" data-id="${esc(ev.id)}">
    <div class="ev-r1">
      <span class="ev-ico">${iconHtml(ev)}</span>
      <span class="ev-user">${esc(ev.user)}</span>
      <span class="ev-amt">${esc(amountLabel(ev))}</span>
    </div>
    ${ev.title && ev.source === 'twitch' && ev.type !== 'tw_follow' ? `<div class="ev-title">${esc(ev.title)}</div>` : ''}
    ${ev.message ? `<p class="ev-msg">${esc(ev.message)}</p>` : ''}
    <div class="ev-foot">
      <span class="ev-time" data-at="${esc(ev.at)}">${esc(fmtTime(ev.at))}</span>
      <div class="ev-acts">
        <span class="ev-act-slot">${actionBtnHtml(ev)}</span>
        <button type="button" class="del" data-del="${esc(ev.id)}" title="Удалить" aria-label="Удалить">${ICO_DEL}</button>
      </div>
    </div>
  </article>`;
}
function updateCardState(id, playState) {
  const ev = S.events.find(x => x.id === id);
  if (ev) ev.playState = playState;
  const el = $('#feedList').querySelector(`.ev[data-id="${CSS.escape(id)}"] .ev-act-slot`);
  if (el && ev) el.innerHTML = actionBtnHtml(ev);
}
function renderList() {
  renderStatus();
  const list = S.events.filter(matchesFilter);
  $('#empty').hidden = list.length > 0;
  $('#feedList').innerHTML = list.map(ev => cardHtml(ev, false)).join('');
}
function prependEvent(ev) {
  if (!matchesFilter(ev)) return;
  const box = $('#feedList');
  if (box.querySelector(`[data-id="${CSS.escape(ev.id)}"]`)) return;
  $('#empty').hidden = true;
  box.insertAdjacentHTML('afterbegin', cardHtml(ev, true));
  while (box.children.length > 100) box.lastElementChild.remove();
}
function refreshTimes() {
  document.querySelectorAll('#feedList .ev-time[data-at]').forEach(el => {
    const txt = fmtTime(el.dataset.at);
    if (el.textContent !== txt) el.textContent = txt;
  });
}

function fillCfgForm() {
  const c = S.cfg; if (!c) return;
  const f = $('#cfgForm');
  $('#obsWidgetUrl').textContent = `${location.origin}/donate-settings/feed-widget.html`;
  $('#obsAlertUrl').textContent = `${location.origin}/auc/alert.html`;
  FEED_TYPES.forEach(k => {
    f['en_' + k].checked = c.enabled?.[k] !== false;
  });
  f.min_coin.value = c.min_coin ?? 1;
  f.min_da.value = c.min_da ?? 1;
  f.min_dn.value = c.min_dn ?? 1;
  f.min_points.value = c.min_points ?? 0;
  f.mode.value = c.mode || 'list';
  f.theme.value = c.theme || 'glass';
  f.limit.value = c.limit ?? 6;
  f.font.value = c.font || 'Inter';
  f.accent.value = c.accent || '#8b5cf6';
  f.text_color.value = c.text_color || '#f3f4fa';
  f.bg_color.value = c.bg_color || '#0d0d17';
  f.bg_alpha.value = c.bg_alpha ?? 82;
  f.font_size.value = c.font_size ?? 14;
  f.show_message.checked = c.show_message !== false;
  f.show_time.checked = c.show_time !== false;
  f.show_icon.checked = c.show_icon !== false;
  $('#aVal').textContent = `${f.bg_alpha.value}%`;
  $('#fVal').textContent = `${f.font_size.value}px`;
  renderConnList();
}

function setUiAuth(ok) {
  $('#needAuth').hidden = ok;
  $('#pauseBtn').hidden = !ok;
  $('#skipBtn').hidden = !ok;
  $('#cfgBtn').hidden = !ok;
  $('#testMenuBtn').hidden = !ok;
  $('#filters').hidden = !ok;
}

async function init() {
  try {
    const d = await post('/auc/feed/admin', { a: 'state' });
    setUiAuth(true);
    S.events = d.events || [];
    S.cfg = d.cfg || {};
    S.ints = d.integrations || null;
    renderList();
    fillCfgForm();
    connectSse();
  } catch {
    setUiAuth(false);
    $('#empty').hidden = true;
  }
}

function connectSse() {
  if (S.sse) S.sse.close();
  const es = new EventSource(API + '/auc/feed/events');
  S.sse = es;
  es.addEventListener('feed_item', e => {
    try {
      const ev = JSON.parse(e.data);
      if (!S.events.some(x => x.id === ev.id)) {
        S.events.unshift(ev);
        if (S.events.length > 100) S.events.length = 100;
        prependEvent(ev);
      }
    } catch {}
  });
  es.addEventListener('feed_cfg', e => { try { S.cfg = { ...S.cfg, ...JSON.parse(e.data) }; renderStatus(); } catch {} });
  es.addEventListener('feed_state', e => { try { const d = JSON.parse(e.data); if (d?.id) updateCardState(d.id, d.playState); } catch {} });
  es.addEventListener('feed_sync', e => { try { const d = JSON.parse(e.data); if (Array.isArray(d.events)) S.events = d.events; renderList(); } catch {} });
}

let pollT = null;
$('#browserLoginBtn').addEventListener('click', async () => {
  clearInterval(pollT);
  const btn = $('#browserLoginBtn'); btn.disabled = true; btn.textContent = 'Открываю браузер…';
  try {
    const r = await fetch(API + '/auc/feed/dock-start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    if (!r.ok || !d.code) throw new Error('Не удалось создать код входа');
    const url = `${location.origin}/donate-settings/dock-auth.html?code=${encodeURIComponent(d.code)}`;
    $('#pairUrl').textContent = url;
    $('#pairWait').hidden = false;
    window.open(url, '_blank', 'noopener');
    btn.textContent = 'Открыть браузер ещё раз'; btn.disabled = false;
    pollT = setInterval(async () => {
      try {
        const pr = await fetch(`${API}/auc/feed/dock-poll?code=${encodeURIComponent(d.code)}`);
        const pd = await pr.json();
        if (pd.ok && pd.token) {
          clearInterval(pollT);
          try { localStorage.setItem(LS_DOCK, pd.token); } catch {}
          $('#pairWait').hidden = true;
          toast('Вход выполнен!');
          init();
        } else if (pd.expired) {
          clearInterval(pollT);
          toast('Время входа истекло — нажми кнопку ещё раз', true);
        }
      } catch {}
    }, 2000);
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false; btn.textContent = 'Войти через браузер';
  }
});

document.addEventListener('click', async e => {
  if (!e.target.closest('.test-wrap')) $('#testMenu').hidden = true;

  const flt = e.target.closest('#filters [data-f]');
  if (flt) {
    S.filter = flt.dataset.f;
    document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('on', b === flt));
    return renderList();
  }
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    navigator.clipboard.writeText($('#' + cp.dataset.copy).textContent).then(() => toast('Скопировано'), () => {});
    return;
  }
  const test = e.target.closest('[data-test]');
  if (test) {
    $('#testMenu').hidden = true;
    try {
      await post('/auc/feed/admin', { a: 'test', type: test.dataset.test });
      toast(S.cfg?.paused ? 'В очереди (лента на паузе)' : 'Отправлено на стрим');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const dnc = e.target.closest('[data-dn-connect]');
  if (dnc) {
    const link = prompt('Ссылка виджета Donatello для стрима (donatello.to → Віджети → Алерти → скопировать ссылку).\nНужен ОТДЕЛЬНЫЙ виджет, не тот, что для пузокоїнів на сайте.');
    if (!link) return;
    try {
      const r = await post('/auc/feed/admin', { a: 'token', service: 'donatello', token: link.trim() });
      if (r.integrations) { S.ints = r.integrations; renderConnList(); }
      toast('Donatello подключён');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const conn = e.target.closest('[data-connect]');
  if (conn) {
    try {
      const r = await post('/auc/feed/admin', { a: 'connect', service: conn.dataset.connect });
      if (r.url) window.open(r.url, '_blank', 'noopener');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const rep = e.target.closest('[data-replay]');
  if (rep) {
    const id = rep.dataset.replay;
    rep.disabled = true;
    try {
      const r = await post('/auc/feed/admin', { a: 'replay', id });
      updateCardState(id, 'queued');
      toast(r?.paused || S.cfg?.paused ? 'В очереди (лента на паузе)' : 'Воспроизводится на стриме');
    } catch (err) { toast(err.message, true); rep.disabled = false; }
    return;
  }
  const sk = e.target.closest('[data-skip], #skipBtn');
  if (sk) {
    const id = sk.dataset?.skip || null;
    sk.disabled = true;
    try {
      await post('/auc/feed/admin', { a: 'skip', id });
      if (id) updateCardState(id, 'done');
      else S.events.forEach(x => { if (x.playState === 'queued') updateCardState(x.id, 'done'); });
      toast('Пропущено');
    } catch (err) { toast(err.message, true); }
    finally { sk.disabled = false; }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const id = del.dataset.del;
    del.disabled = true;
    try {
      await post('/auc/feed/admin', { a: 'delete', id });
      S.events = S.events.filter(x => x.id !== id);
      del.closest('.ev')?.remove();
      $('#empty').hidden = $('#feedList').children.length > 0;
    } catch (err) { toast(err.message, true); del.disabled = false; }
  }
});

$('#testMenuBtn').addEventListener('click', () => { $('#testMenu').hidden = !$('#testMenu').hidden; });
$('#pauseBtn').addEventListener('click', async () => {
  const next = !S.cfg?.paused;
  try {
    const r = await post('/auc/feed/admin', { a: 'pause', paused: next });
    S.cfg = r.cfg;
    renderStatus();
    toast(next ? 'На паузе' : 'Отображение включено');
  } catch (err) { toast(err.message, true); }
});

$('#cfgBtn').addEventListener('click', () => { fillCfgForm(); $('#drawerOv').hidden = false; });
$('#closeDrawer').addEventListener('click', () => { $('#drawerOv').hidden = true; });
$('#drawerOv').addEventListener('click', e => { if (e.target === $('#drawerOv')) $('#drawerOv').hidden = true; });
$('#cfgForm').addEventListener('input', () => {
  $('#aVal').textContent = `${$('#cfgForm').bg_alpha.value}%`;
  $('#fVal').textContent = `${$('#cfgForm').font_size.value}px`;
});
$('#cfgForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const enabled = {};
  FEED_TYPES.forEach(k => {
    enabled[k] = f['en_' + k].checked;
  });
  const btn = $('#saveCfgBtn'); btn.disabled = true; btn.textContent = 'Сохраняю…';
  try {
    const r = await post('/auc/feed/admin', {
      a: 'cfg',
      cfg: {
        enabled,
        min_coin: Number(f.min_coin.value) || 0,
        min_da: Number(f.min_da.value) || 0,
        min_dn: Number(f.min_dn.value) || 0,
        min_points: Number(f.min_points.value) || 0,
        mode: f.mode.value, theme: f.theme.value, limit: Number(f.limit.value) || 6,
        font: f.font.value, accent: f.accent.value, text_color: f.text_color.value, bg_color: f.bg_color.value,
        bg_alpha: Number(f.bg_alpha.value), font_size: Number(f.font_size.value),
        show_message: f.show_message.checked, show_time: f.show_time.checked, show_icon: f.show_icon.checked,
      },
    });
    S.cfg = r.cfg;
    $('#drawerOv').hidden = true;
    toast('Сохранено');
  } catch (err) { toast(err.message, true); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
});

$('#clearAllBtn').addEventListener('click', async () => {
  if (!confirm('Очистить всю историю ленты?')) return;
  try {
    await post('/auc/feed/admin', { a: 'clear' });
    S.events = [];
    renderList();
    $('#drawerOv').hidden = true;
    toast('Лента очищена');
  } catch (err) { toast(err.message, true); }
});

setInterval(refreshTimes, 30000);
init();
})();
