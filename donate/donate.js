/* renah0cki — личная ссылка для донатов renah0cki coin (/donate/?u=<username>).
   Для ссылки стримера во время аукциона можно выбрать лот. Каждый аккаунт может включать и отключать приём донатов. */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const API = (LOCAL && QS.get('api')) || 'https://cdn.renah0cki.xyz';
const SB = (LOCAL && QS.get('sb')) || SB_URL;
const LS_SESSION = 'fh_session';
const PATH_U = (() => {
  const m = location.pathname.match(/^\/donate\/([^/]+)\/?$/i);
  if (!m) return '';
  try { const s = decodeURIComponent(m[1]); return /^index\.html$/i.test(s) ? '' : s; } catch { return ''; }
})();
const TARGET_U = (QS.get('u') || PATH_U || '').trim().replace(/^@/, '');

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
let toastT;
function toast(msg, err = false) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

function readSession() { try { return JSON.parse(localStorage.getItem(LS_SESSION)); } catch { return null; } }
function jwtExp(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; } }
let refreshing = null;
async function getToken() {
  const s = readSession();
  if (!s?.token) return null;
  if (jwtExp(s.token) - Date.now() > 60e3) return s.token;
  if (!s.refreshToken) return null;
  if (!refreshing) refreshing = (async () => {
    try {
      const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refreshToken }) });
      if (!r.ok) return null;
      const d = await r.json();
      localStorage.setItem(LS_SESSION, JSON.stringify({ ...(readSession() || s), token: d.access_token, refreshToken: d.refresh_token }));
      return d.access_token;
    } catch { return null; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}
async function sb(path, body, strict = false) {
  const t = await getToken();
  const r = await fetch(`${SB}/rest/v1/${path}`, { method: body !== undefined ? 'POST' : 'GET', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) { if (strict) throw new Error(j?.message || j?.error || 'HTTP ' + r.status); return null; }
  return j;
}
async function aucApi(path, body) {
  const t = await getToken();
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  return d;
}

const S = { pub: null, off: 0, uid: readSession()?.user?.id || null, me: null, target: null, targetLoaded: false, balance: null, lot: '' };
const aucOpen = () => {
  const a = S.pub?.auction;
  return !!a && (['running', 'paused'].includes(a.status) || (a.status === 'idle' && a.accepting));
};
const canUseAuc = () => !!(S.target?.is_streamer && S.target.site_enabled !== false && S.pub?.config?.site_enabled !== false && aucOpen());
const targetEnabled = () => {
  if (!S.target) return true;
  if (S.target.coin_donate_enabled === false) return false;
  if (S.target.is_streamer && (S.target.site_enabled === false || S.pub?.config?.site_enabled === false)) return false;
  return true;
};

/* ── отрисовка ── */
function render() {
  const d = S.pub;
  const t = S.target || (d?.streamer && !TARGET_U ? { id: d.streamer.id, username: d.streamer.name, display_name: d.streamer.name, avatar_url: d.streamer.avatar, coin_donate_enabled: d.config?.site_enabled !== false, is_streamer: true, site_enabled: d.config?.site_enabled !== false } : null);
  if (S.targetLoaded && !t) {
    $('#sName').textContent = TARGET_U || 'не найден';
    $('#notFound').hidden = false; $('#disabledBox').hidden = true; $('#needLogin').hidden = true; $('#formBody').hidden = true;
    renderOwn(); return;
  }
  $('#notFound').hidden = true;
  if (t) {
    const label = t.display_name || t.username || 'пользователя';
    $('#sName').textContent = label;
    if (t.avatar_url) $('#sAva').src = t.avatar_url;
    document.title = `Донат coin для ${label} — renah0cki`;
  }
  const on = targetEnabled();
  $('#disabledBox').hidden = on;
  $('#enableSelf').hidden = !(S.uid && t && S.uid === t.id && !on);
  $('#needLogin').hidden = !on || !!S.uid;
  $('#formBody').hidden = !on || !S.uid;

  const min = (t?.is_streamer ? d?.config?.min_site_bid : 1) || 1;
  $('#amount').min = min;
  const chips = [min, 50, 100, 250, 500, 1000].filter((v, i, a) => v >= min && a.indexOf(v) === i).slice(0, 6);
  const ch = chips.join(',');
  if ($('#chips').dataset.v !== ch) { $('#chips').dataset.v = ch; $('#chips').innerHTML = chips.map(n => `<button type="button" data-amt="${n}">${n}</button>`).join(''); }

  // аукцион — только на личной ссылке стримера, пока аукцион открыт
  const showAuc = canUseAuc() && !!d;
  $('#aucBox').hidden = !showAuc;
  if (showAuc) {
    const lots = d.lots.slice().sort((a, b) => a.num - b.num);
    if (S.lot && S.lot !== 'own' && !lots.some(l => String(l.id) === S.lot)) S.lot = '';
    const html = `<li><label><input type="radio" name="lot" value="" ${S.lot === '' ? 'checked' : ''}><span class="grow">Просто донат, без лота</span></label></li>` +
      lots.map(l => `<li><label><input type="radio" name="lot" value="${l.id}" ${S.lot === String(l.id) ? 'checked' : ''}><span class="grow">#${l.num} ${esc(l.name)}</span><span class="muted num">${fmt(l.total)}</span></label></li>`).join('') +
      `<li><label><input type="radio" name="lot" value="own" ${S.lot === 'own' ? 'checked' : ''}><span class="grow">Свой вариант…</span></label></li>`;
    if ($('#lotPick').dataset.h !== html) { $('#lotPick').innerHTML = html; $('#lotPick').dataset.h = html; }
    $('#ownLot').hidden = S.lot !== 'own';
  } else S.lot = '';
  $('#note').textContent = showAuc && S.lot ? 'coin спишутся сейчас; вернутся, если лот проиграет' : `coin сразу уйдут ${t?.display_name || t?.username || 'получателю'}`;
  tick();
  renderOwn();
}
function tick() {
  const a = S.pub?.auction; const el = $('#aTimer'); if (!a || !el) return;
  let ms = a.status === 'running' && a.ends_at ? Date.parse(a.ends_at) - (Date.now() + S.off) : a.status === 'paused' ? a.left_ms : null;
  if (ms == null) { el.textContent = ''; return; }
  const s = Math.ceil(Math.max(0, ms) / 1000);
  el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}${a.status === 'paused' ? ' (пауза)' : ''}`;
}
setInterval(tick, 500);

let wFilled = false;
function renderOwn() {
  const me = S.me;
  if (!S.uid || !me?.username) { $('#streamer').hidden = true; return; }
  $('#streamer').hidden = false;
  const link = `${location.origin}/donate/${encodeURIComponent(me.username)}`;
  $('#myLink').textContent = link;
  const on = me.coin_donate_enabled !== false;
  $('#myDot').className = 'dot' + (on ? ' ok' : '');
  $('#myState').textContent = on ? 'Приём донатов coin включён' : 'Приём донатов coin отключён';
  const tb = $('#myToggle');
  tb.textContent = on ? 'Отключить' : 'Подключить';
  tb.className = 'btn sm ' + (on ? 'ghost' : 'pri');

  const isStr = S.pub?.config?.streamer_id === S.uid;
  $('#obsWrap').hidden = !isStr;
  if (isStr) {
    $('#widgetLink').textContent = `${location.origin}/auc/alert.html`;
    if (!wFilled && S.pub?.config) {
      const a = S.pub.config.alert || {}; const f = $('#wForm');
      f.duration.value = a.duration ?? 8; f.min.value = a.min ?? 1;
      f.show_message.checked = a.show_message !== false; f.sound.checked = a.sound !== false;
      wFilled = true;
    }
  }
}

async function toggleMyDonate(nextOn) {
  try {
    const r = await sb('rpc/coin_donate_toggle', { p_enabled: !!nextOn }, true);
    const val = r?.coin_donate_enabled ?? !!nextOn;
    if (S.me) S.me.coin_donate_enabled = val;
    if (S.target && S.target.id === S.uid) { S.target.coin_donate_enabled = val; if (S.target.is_streamer) S.target.site_enabled = val; }
    if (S.pub?.config && S.pub.config.streamer_id === S.uid) S.pub.config.site_enabled = val;
    toast(val ? 'Приём донатов coin подключён' : 'Приём донатов coin отключён');
    render();
  } catch (err) { toast(err.message, true); }
}

async function loadTarget() {
  try {
    const r = await sb('rpc/coin_donate_target', { p_username: TARGET_U || null });
    S.target = r || null;
  } catch { S.target = null; }
  S.targetLoaded = true;
  render();
}

async function loadMe() {
  if (!S.uid) return;
  const [bal, profs, mine] = await Promise.all([
    sb('rpc/coin_balance', {}),
    sb(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,coin_donate_enabled`),
    sb('auc_donations?select=id,user_id,recipient_id,user_name,amount,message,kind,lot_label,created_at,bid_id&order=id.desc&limit=15'),
  ]);
  if (bal != null) { S.balance = bal; $('#bal').hidden = false; $('#balN').textContent = fmt(bal); }
  if (Array.isArray(profs) && profs[0]) { S.me = profs[0]; renderOwn(); }
  if (Array.isArray(mine) && mine.length) {
    $('#mineBox').hidden = false;
    $('#mine').innerHTML = mine.map(m => {
      const incoming = m.recipient_id === S.uid && m.user_id !== S.uid;
      const tag = incoming
        ? `<span class="src wallet">получено от ${esc(m.user_name)}</span>`
        : m.kind === 'bid'
          ? `<span class="src site">ставка${m.lot_label ? ': ' + esc(m.lot_label) : ''}</span>`
          : '<span class="src">донат</span>';
      return `<li class="item"><span class="main"><b>${incoming ? '+' : ''}${fmt(m.amount)} coin</b> ${tag}</span>
        <span class="side muted">${new Date(m.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>${m.message ? `<span class="meta">«${esc(m.message)}»</span>` : ''}</li>`;
    }).join('');
  }
}

/* ── события ── */
$('#msg').addEventListener('input', e => { $('#cnt').textContent = e.target.value.length; });
document.addEventListener('click', e => {
  const a = e.target.closest('[data-amt]'); if (a) { $('#amount').value = a.dataset.amt; $('#amount').focus(); }
  const c = e.target.closest('[data-copy]'); if (c) navigator.clipboard.writeText($('#' + c.dataset.copy).textContent).then(() => toast('Скопировано'), () => {});
});
$('#lotPick').addEventListener('change', e => { if (e.target.name === 'lot') { S.lot = e.target.value; render(); if (S.lot === 'own') $('#ownLot input').focus(); } });
$('#myToggle').addEventListener('click', () => toggleMyDonate(!(S.me?.coin_donate_enabled !== false)));
$('#enableSelf').addEventListener('click', () => toggleMyDonate(true));

$('#dForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = Math.floor(Number($('#amount').value));
  const min = (S.target?.is_streamer ? S.pub?.config?.min_site_bid : 1) || 1;
  if (!amount || amount < min) return toast(`Минимум — ${min} coin`, true);
  if (S.balance != null && amount > S.balance) return toast('Не хватает coin', true);
  const lotName = S.lot === 'own' ? $('#ownLot input').value.trim() : '';
  if (S.lot === 'own' && !lotName) return toast('Напиши свой вариант лота', true);
  const btn = $('#send'); btn.disabled = true; btn.textContent = 'Отправляю…';
  try {
    const recId = S.target?.id || null;
    const isStr = !S.target || !!S.target.is_streamer;
    const r = isStr
      ? await aucApi('/auc/donate', { amount, message: $('#msg').value.trim(), lot_id: S.lot && S.lot !== 'own' ? Number(S.lot) : null, lot_name: lotName || null, recipient_id: recId })
      : await sb('rpc/auc_coin_donate', { p_amount: amount, p_message: $('#msg').value.trim() || null, p_lot_id: null, p_lot_name: null, p_recipient_id: recId }, true);
    $('#dForm').hidden = true; $('#done').hidden = false;
    $('#doneT').textContent = `${fmt(r.amount)} coin отправлено!`;
    $('#doneS').textContent = r.kind === 'bid'
      ? (r.status === 'queue' ? 'Ставка принята — стример добавит твой лот. Если он не победит, coin вернутся.' : `Ставка на ${r.lot}. Если лот не победит, coin вернутся.`)
      : `Спасибо! Донат уже у ${S.target?.display_name || S.target?.username || 'получателя'}.`;
    S.balance = r.balance; $('#balN').textContent = fmt(r.balance);
    loadMe();
  } catch (err) { toast(err.message, true); }
  finally { btn.disabled = false; btn.textContent = 'Отправить'; }
});
$('#again').addEventListener('click', () => { $('#done').hidden = true; $('#dForm').hidden = false; $('#dForm').reset(); $('#cnt').textContent = '0'; S.lot = ''; render(); $('#amount').focus(); });

$('#wForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  try {
    await aucApi('/auc/admin/do', { a: 'config', config: { alert: { duration: Math.min(60, Math.max(3, +f.duration.value || 8)), min: Math.max(1, +f.min.value || 1),
      show_message: f.show_message.checked, sound: f.sound.checked } } });
    toast('Виджет сохранён');
  } catch (err) { toast(err.message, true); }
});
$('#testAlert').addEventListener('click', async () => {
  try { await aucApi('/auc/admin/do', { a: 'test_alert' }); toast('Тестовый донат отправлен в виджет'); } catch (err) { toast(err.message, true); }
});

/* ── старт ── */
loadTarget();
loadMe();
const es = new EventSource(API + '/auc/events');
es.onmessage = ev => { try { const d = JSON.parse(ev.data); if (d) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } } catch {} };
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } }).catch(() => {});
})();
