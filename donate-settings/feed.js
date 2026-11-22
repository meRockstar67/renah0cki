/* renah0cki — контроллер панели последних событий (OBS док + браузер) */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const API = 'https://cdn.renah0cki.xyz';
const COIN_IMG = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
let toastT;
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

function readSession() { try { return JSON.parse(localStorage.getItem('fh_session')); } catch { return null; } }
function jwtExp(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; } }
let refreshing = null;
async function getToken() {
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
  const t = await getToken();
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: JSON.stringify(body || {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  return d;
}

const S = { events: [], cfg: null, ints: null, filter: 'all', isAdmin: false };

function iconHtml(ev) {
  if (ev.type === 'coin') return `<img src="${COIN_IMG}" alt="">`;
  if (ev.type === 'da') return '🧡';
  if (ev.type === 'tw_follow') return '💜';
  if (ev.type === 'tw_sub') return '⭐';
  if (ev.type === 'tw_gift') return '🎁';
  if (ev.type === 'tw_points') return '💎';
  return '✨';
}
function amountLabel(ev) {
  if (ev.type === 'coin') return `${fmt(ev.amount)} coin`;
  if (ev.type === 'da') return `${fmt(ev.amount)} ${ev.unit || 'RUB'}`;
  if (ev.type === 'tw_follow') return 'Фолловер';
  if (ev.type === 'tw_sub') return ev.amount > 1 ? `Саб · ${ev.amount} мес.` : 'Подписка';
  if (ev.type === 'tw_gift') return `+${fmt(ev.amount)} саб.`;
  if (ev.type === 'tw_points') return ev.amount ? `${fmt(ev.amount)} баллов` : 'Баллы';
  return '';
}
function badgeLabel(ev) {
  if (ev.type === 'coin') return 'renah0cki coin';
  if (ev.type === 'da') return 'DonationAlerts';
  if (ev.type === 'tw_follow') return 'Twitch · Фолловер';
  if (ev.type === 'tw_sub') return ev.title || 'Twitch · Подписка';
  if (ev.type === 'tw_gift') return ev.title || 'Twitch · Подарок';
  if (ev.type === 'tw_points') return ev.title || 'Twitch · Баллы';
  return ev.source;
}
function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 45) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function renderStatus() {
  const paused = !!S.cfg?.paused;
  const pill = $('#livePill');
  pill.classList.toggle('paused', paused);
  $('#liveTxt').textContent = paused ? 'ПАУЗА' : 'LIVE';
  const pb = $('#pauseBtn');
  pb.textContent = paused ? '▶ Продолжить' : '⏸ Пауза';
  pb.className = 'btn sm ' + (paused ? 'warn' : '');
}

function renderInts() {
  const strip = $('#intStrip');
  if (!S.ints) { strip.hidden = true; return; }
  const tw = S.ints.twitch || {}, da = S.ints.da || {};
  const twOk = tw.state === 'ok';
  const needRescope = twOk && tw.subs && (!tw.subs.follow || !tw.subs.sub);
  const daOk = da.state === 'ok';
  strip.hidden = false;
  strip.innerHTML = `
    <span class="int-chip ${twOk ? (needRescope ? 'warn' : 'ok') : ''}"><i></i>Twitch${tw.login ? ': ' + esc(tw.login) : ' выкл'}</span>
    <span class="int-chip ${daOk ? 'ok' : ''}"><i></i>DonationAlerts${da.name ? ': ' + esc(da.name) : ' выкл'}</span>
    ${!twOk ? '<button type="button" class="int-btn" data-connect="twitch">Подключить Twitch</button>' : needRescope ? '<button type="button" class="int-btn" data-connect="twitch">Обновить права Twitch (фолловеры + сабки)</button>' : ''}
    ${!daOk ? '<button type="button" class="int-btn" data-connect="da">Подключить DA</button>' : ''}`;
}

function renderList() {
  renderStatus();
  const list = S.events.filter(ev => {
    if (S.filter === 'all') return true;
    if (S.filter === 'twitch') return ev.source === 'twitch';
    return ev.source === S.filter;
  });
  $('#empty').hidden = list.length > 0;
  $('#feedList').innerHTML = list.map(ev => `<article class="ev${ev.hidden ? ' is-hidden' : ''}" data-t="${esc(ev.type)}" data-id="${esc(ev.id)}">
    <div class="ev-ico">${iconHtml(ev)}</div>
    <div class="ev-body">
      <div class="ev-top">
        <span class="ev-user">${esc(ev.user)}</span>
        <span class="ev-amt">${esc(amountLabel(ev))}</span>
      </div>
      <div class="ev-meta">
        <span class="ev-badge">${esc(badgeLabel(ev))}</span>
        <span>${esc(fmtTime(ev.at))}</span>
      </div>
      ${ev.message ? `<p class="ev-msg">${esc(ev.message)}</p>` : ''}
      <div class="ev-acts">
        <button type="button" data-replay="${esc(ev.id)}" title="Проиграть на стриме со звуком">▶ Проиграть</button>
        <button type="button" data-hide="${esc(ev.id)}" title="${ev.hidden ? 'Показать в виджете OBS' : 'Скрыть из виджета OBS'}">${ev.hidden ? '👁 Показать' : '🙈 Скрыть'}</button>
        <button type="button" class="del" data-del="${esc(ev.id)}" title="Удалить">✕</button>
      </div>
    </div>
  </article>`).join('');
}

function fillCfgForm() {
  const c = S.cfg; if (!c) return;
  const f = $('#cfgForm');
  $('#obsWidgetUrl').textContent = `${location.origin}/donate-settings/feed-widget.html`;
  ['coin', 'da', 'tw_follow', 'tw_sub', 'tw_gift', 'tw_points'].forEach(k => {
    f['en_' + k].checked = c.enabled?.[k] !== false;
    f['al_' + k].checked = c.alert_events?.[k] !== false;
  });
  f.min_coin.value = c.min_coin ?? 1;
  f.min_da.value = c.min_da ?? 1;
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
}

async function init() {
  try {
    const d = await post('/auc/feed/admin', { a: 'state' });
    S.isAdmin = true;
    S.events = d.events || [];
    S.cfg = d.cfg || {};
    S.ints = d.integrations || null;
    renderInts();
    renderList();
    fillCfgForm();
    connectSse();
  } catch {
    $('#needAuth').hidden = false;
    $('#pauseBtn').hidden = true;
    $('#cfgBtn').hidden = true;
    $('#testMenuBtn').hidden = true;
  }
}

function connectSse() {
  const es = new EventSource(API + '/auc/feed/events');
  es.addEventListener('feed_item', e => {
    try {
      const ev = JSON.parse(e.data);
      if (!S.events.some(x => x.id === ev.id)) { S.events.unshift(ev); if (S.events.length > 100) S.events.length = 100; }
      renderList();
    } catch {}
  });
  es.addEventListener('feed_cfg', e => { try { S.cfg = { ...S.cfg, ...JSON.parse(e.data) }; renderStatus(); } catch {} });
  es.addEventListener('feed_sync', e => { try { const d = JSON.parse(e.data); if (Array.isArray(d.events)) S.events = d.events; renderList(); } catch {} });
}

/* ── события ── */
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
    navigator.clipboard.writeText($('#' + cp.dataset.copy).textContent).then(() => toast('Ссылка скопирована'), () => {});
    return;
  }
  const test = e.target.closest('[data-test]');
  if (test) {
    $('#testMenu').hidden = true;
    try { await post('/auc/feed/admin', { a: 'test', type: test.dataset.test }); toast('Тестовое событие отправлено'); }
    catch (err) { toast(err.message, true); }
    return;
  }
  const conn = e.target.closest('[data-connect]');
  if (conn) {
    try {
      const r = await post('/auc/admin/do', { a: 'connect', service: conn.dataset.connect });
      if (r.url) window.open(r.url, '_blank', 'noopener');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const rep = e.target.closest('[data-replay]');
  if (rep) {
    try { await post('/auc/feed/admin', { a: 'replay', id: rep.dataset.replay }); toast('Проиграно на стриме'); }
    catch (err) { toast(err.message, true); }
    return;
  }
  const hid = e.target.closest('[data-hide]');
  if (hid) {
    try {
      const r = await post('/auc/feed/admin', { a: 'toggle_hide', id: hid.dataset.hide });
      const ev = S.events.find(x => x.id === hid.dataset.hide);
      if (ev) ev.hidden = !!r.hidden;
      renderList();
      toast(r.hidden ? 'Скрыто на стриме' : 'Снова видно на стриме');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    try {
      await post('/auc/feed/admin', { a: 'delete', id: del.dataset.del });
      S.events = S.events.filter(x => x.id !== del.dataset.del);
      renderList();
    } catch (err) { toast(err.message, true); }
  }
});

$('#testMenuBtn').addEventListener('click', () => { $('#testMenu').hidden = !$('#testMenu').hidden; });
$('#pauseBtn').addEventListener('click', async () => {
  const next = !S.cfg?.paused;
  try {
    const r = await post('/auc/feed/admin', { a: 'pause', paused: next });
    S.cfg = r.cfg;
    renderStatus();
    toast(next ? 'Отображение на стриме остановлено' : 'Отображение на стриме возобновлено');
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
  const enabled = {}, alert_events = {};
  ['coin', 'da', 'tw_follow', 'tw_sub', 'tw_gift', 'tw_points'].forEach(k => {
    enabled[k] = f['en_' + k].checked;
    alert_events[k] = f['al_' + k].checked;
  });
  const btn = $('#saveCfgBtn'); btn.disabled = true; btn.textContent = 'Сохраняю…';
  try {
    const r = await post('/auc/feed/admin', {
      a: 'cfg',
      cfg: {
        enabled, alert_events,
        min_coin: Number(f.min_coin.value) || 0,
        min_da: Number(f.min_da.value) || 0,
        min_points: Number(f.min_points.value) || 0,
        mode: f.mode.value, theme: f.theme.value, limit: Number(f.limit.value) || 6,
        font: f.font.value, accent: f.accent.value, text_color: f.text_color.value, bg_color: f.bg_color.value,
        bg_alpha: Number(f.bg_alpha.value), font_size: Number(f.font_size.value),
        show_message: f.show_message.checked, show_time: f.show_time.checked, show_icon: f.show_icon.checked,
      },
    });
    S.cfg = r.cfg;
    $('#drawerOv').hidden = true;
    toast('Настройки сохранены и применены в OBS');
  } catch (err) { toast(err.message, true); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить и применить'; }
});

$('#clearAllBtn').addEventListener('click', async () => {
  if (!confirm('Очистить всю историю ленты событий?')) return;
  try {
    await post('/auc/feed/admin', { a: 'clear' });
    S.events = [];
    renderList();
    $('#drawerOv').hidden = true;
    toast('Лента очищена');
  } catch (err) { toast(err.message, true); }
});

setInterval(() => { if (S.events.length) renderList(); }, 30000);
init();
})();
