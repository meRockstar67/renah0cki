/* renah0cki — донат coin по личной ссылке. Пока идёт аукцион, донат можно поставить на лот. */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const API = (LOCAL && QS.get('api')) || 'https://cdn.renah0cki.xyz';
const SB = (LOCAL && QS.get('sb')) || SB_URL;
const LS_SESSION = 'fh_session';

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
async function sb(path, body) {
  const t = await getToken();
  const r = await fetch(`${SB}/rest/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.ok ? r.json() : null;
}
async function aucApi(path, body) {
  const t = await getToken();
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  return d;
}

const S = { pub: null, off: 0, uid: readSession()?.user?.id || null, balance: null, lot: '' };
const open = () => ['running', 'paused'].includes(S.pub?.auction?.status);

/* ── отрисовка ── */
function render() {
  const d = S.pub; if (!d) return;
  if (d.streamer) {
    $('#sName').textContent = d.streamer.name || 'стримера';
    if (d.streamer.avatar) $('#sAva').src = d.streamer.avatar;
    document.title = `Донат coin для ${d.streamer.name || 'стримера'} — renah0cki`;
  }
  const min = d.config?.min_site_bid || 1;
  $('#amount').min = min;
  const chips = [min, 50, 100, 250, 500, 1000].filter((v, i, a) => v >= min && a.indexOf(v) === i).slice(0, 6);
  const ch = chips.join(',');
  if ($('#chips').dataset.v !== ch) { $('#chips').dataset.v = ch; $('#chips').innerHTML = chips.map(n => `<button type="button" data-amt="${n}">${n}</button>`).join(''); }
  // аукцион
  const box = $('#aucBox'); box.hidden = !open();
  if (open()) {
    const lots = d.lots.slice().sort((a, b) => a.num - b.num);
    if (S.lot && S.lot !== 'own' && !lots.some(l => String(l.id) === S.lot)) S.lot = '';
    const html = `<li><label><input type="radio" name="lot" value="" ${S.lot === '' ? 'checked' : ''}><span class="grow">Просто донат, без лота</span></label></li>` +
      lots.map(l => `<li><label><input type="radio" name="lot" value="${l.id}" ${S.lot === String(l.id) ? 'checked' : ''}><span class="grow">#${l.num} ${esc(l.name)}</span><span class="muted num">${fmt(l.total)}</span></label></li>`).join('') +
      `<li><label><input type="radio" name="lot" value="own" ${S.lot === 'own' ? 'checked' : ''}><span class="grow">Свой вариант…</span></label></li>`;
    if ($('#lotPick').dataset.h !== html) { $('#lotPick').innerHTML = html; $('#lotPick').dataset.h = html; }
    $('#ownLot').hidden = S.lot !== 'own';
  } else S.lot = '';
  $('#note').textContent = open() && S.lot ? 'coin спишутся сейчас; вернутся, если лот проиграет' : 'coin сразу уйдут стримеру';
  tick();
  renderStreamer();
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
function renderStreamer() {
  const d = S.pub; const me = S.uid && d?.config?.streamer_id === S.uid;
  $('#streamer').hidden = !me; if (!me) return;
  $('#myLink').textContent = `${location.origin}/donate/`;
  $('#widgetLink').textContent = `${location.origin}/auc/alert.html`;
  if (!wFilled) {
    const a = d.config.alert || {}; const f = $('#wForm');
    f.duration.value = a.duration ?? 8; f.min.value = a.min ?? 1;
    f.show_message.checked = a.show_message !== false; f.sound.checked = a.sound !== false;
    wFilled = true;
  }
}

async function loadMe() {
  if (!S.uid) return;
  const [bal, mine] = await Promise.all([sb('rpc/coin_balance', {}), sb('auc_donations?select=id,amount,message,kind,lot_label,created_at,bid_id&order=id.desc&limit=10')]);
  if (bal != null) { S.balance = bal; $('#bal').hidden = false; $('#balN').textContent = fmt(bal); }
  if (Array.isArray(mine) && mine.length) {
    $('#mineBox').hidden = false;
    $('#mine').innerHTML = mine.map(m => `<li class="item"><span class="main"><b>${fmt(m.amount)} coin</b> ${m.kind === 'bid' ? `<span class="src site">ставка${m.lot_label ? ': ' + esc(m.lot_label) : ''}</span>` : '<span class="src">донат</span>'}</span>
      <span class="side muted">${new Date(m.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>${m.message ? `<span class="meta">«${esc(m.message)}»</span>` : ''}</li>`).join('');
  }
}

/* ── события ── */
$('#msg').addEventListener('input', e => { $('#cnt').textContent = e.target.value.length; });
document.addEventListener('click', e => {
  const a = e.target.closest('[data-amt]'); if (a) { $('#amount').value = a.dataset.amt; $('#amount').focus(); }
  const c = e.target.closest('[data-copy]'); if (c) navigator.clipboard.writeText($('#' + c.dataset.copy).textContent).then(() => toast('Скопировано'), () => {});
});
$('#lotPick').addEventListener('change', e => { if (e.target.name === 'lot') { S.lot = e.target.value; render(); if (S.lot === 'own') $('#ownLot input').focus(); } });

$('#dForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amount = Math.floor(Number($('#amount').value));
  const min = S.pub?.config?.min_site_bid || 1;
  if (!amount || amount < min) return toast(`Минимум — ${min} coin`, true);
  if (S.balance != null && amount > S.balance) return toast('Не хватает coin', true);
  const lotName = S.lot === 'own' ? $('#ownLot input').value.trim() : '';
  if (S.lot === 'own' && !lotName) return toast('Напиши свой вариант лота', true);
  const btn = $('#send'); btn.disabled = true; btn.textContent = 'Отправляю…';
  try {
    const r = await aucApi('/auc/donate', { amount, message: $('#msg').value.trim(), lot_id: S.lot && S.lot !== 'own' ? Number(S.lot) : null, lot_name: lotName || null });
    $('#dForm').hidden = true; $('#done').hidden = false;
    $('#doneT').textContent = `${fmt(r.amount)} coin отправлено!`;
    $('#doneS').textContent = r.kind === 'bid'
      ? (r.status === 'queue' ? 'Ставка принята — стример добавит твой лот. Если он не победит, coin вернутся.' : `Ставка на ${r.lot}. Если лот не победит, coin вернутся.`)
      : 'Спасибо! Донат уже у стримера.';
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
if (!S.uid) { $('#needLogin').hidden = false; $('#formBody').hidden = true; }
const es = new EventSource(API + '/auc/events');
es.onmessage = ev => { try { const d = JSON.parse(ev.data); if (d) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } } catch {} };
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } }).catch(() => {});
loadMe();
})();
