/* renah0cki — контроллер компактной панели последних событий (OBS док + браузер) */
(() => {
'use strict';

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

// подхватываем ?key=<dockToken> из ссылки для мгновенного входа в OBS
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
  const tw = S.ints.twitch || {}, da = S.ints.da || {};
  const twOk = tw.state === 'ok';
  const twNeedScope = twOk && tw.subs && (!tw.subs.follow || !tw.subs.sub);
  const daOk = da.state === 'ok';
  box.innerHTML = `
    <div class="conn-row ${twOk ? (twNeedScope ? 'warn' : 'ok') : ''}">
      <b><i></i>Twitch${tw.login ? ' · ' + esc(tw.login) : ''}</b>
      <button type="button" class="btn xs ${twOk && !twNeedScope ? 'ghost' : 'pri'}" data-connect="twitch">${!twOk ? 'Подключить' : twNeedScope ? 'Обновить права' : 'Переподкл.'}</button>
    </div>
    <div class="conn-row ${daOk ? 'ok' : ''}">
      <b><i></i>DonationAlerts${da.name ? ' · ' + esc(da.name) : ''}</b>
      <button type="button" class="btn xs ${daOk ? 'ghost' : 'pri'}" data-connect="da">${daOk ? 'Переподкл.' : 'Подключить'}</button>
    </div>`;
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
    <div class="ev-r1">
      <span class="ev-ico">${iconHtml(ev)}</span>
      <span class="ev-user">${esc(ev.user)}</span>
      <span class="ev-amt">${esc(amountLabel(ev))}</span>
    </div>
    ${ev.title && ev.source === 'twitch' && ev.type !== 'tw_follow' ? `<div class="ev-title">${esc(ev.title)}</div>` : ''}
    ${ev.message ? `<p class="ev-msg">${esc(ev.message)}</p>` : ''}
    <div class="ev-foot">
      <span class="ev-time">${esc(fmtTime(ev.at))}</span>
      <div class="ev-acts">
        ${ev.type === 'coin' || ev.type === 'da' ? `<button type="button" data-replay="${esc(ev.id)}" title="${ev.type === 'da' ? 'Повторить в виджете DonationAlerts' : 'Повторить донат coin на стриме'}">↻ Повтор</button>` : ''}
        <button type="button" data-hide="${esc(ev.id)}" title="${ev.hidden ? 'Показать на стриме' : 'Скрыть со стрима'}">${ev.hidden ? '👁' : '🙈'}</button>
        <button type="button" class="del" data-del="${esc(ev.id)}" title="Удалить">✕</button>
      </div>
    </div>
  </article>`).join('');
}

function fillCfgForm() {
  const c = S.cfg; if (!c) return;
  const f = $('#cfgForm');
  $('#obsWidgetUrl').textContent = `${location.origin}/donate-settings/feed-widget.html`;
  $('#obsAlertUrl').textContent = `${location.origin}/auc/alert.html`;
  ['coin', 'da', 'tw_follow', 'tw_sub', 'tw_gift', 'tw_points'].forEach(k => {
    f['en_' + k].checked = c.enabled?.[k] !== false;
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
  renderConnList();
}

function setUiAuth(ok) {
  $('#needAuth').hidden = ok;
  $('#pauseBtn').hidden = !ok;
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
      if (!S.events.some(x => x.id === ev.id)) { S.events.unshift(ev); if (S.events.length > 100) S.events.length = 100; }
      renderList();
    } catch {}
  });
  es.addEventListener('feed_cfg', e => { try { S.cfg = { ...S.cfg, ...JSON.parse(e.data) }; renderStatus(); } catch {} });
  es.addEventListener('feed_sync', e => { try { const d = JSON.parse(e.data); if (Array.isArray(d.events)) S.events = d.events; renderList(); } catch {} });
}

/* ── вход из OBS через обычный браузер ── */
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
    navigator.clipboard.writeText($('#' + cp.dataset.copy).textContent).then(() => toast('Скопировано'), () => {});
    return;
  }
  const test = e.target.closest('[data-test]');
  if (test) {
    $('#testMenu').hidden = true;
    try { await post('/auc/feed/admin', { a: 'test', type: test.dataset.test }); toast('Отправлено на стрим'); }
    catch (err) { toast(err.message, true); }
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
  ['coin', 'da', 'tw_follow', 'tw_sub', 'tw_gift', 'tw_points'].forEach(k => {
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

setInterval(() => { if (S.events.length) renderList(); }, 30000);
init();
})();
