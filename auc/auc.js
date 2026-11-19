/* renah0cki — аукцион за баллы.
   Сверху вкладки и таймер; слева аукцион, правила, «Вид/Архив/Завершить»; по центру лоты; справа донаты (ожидающие/выполненные). */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const API = (LOCAL && QS.get('api')) || 'https://cdn.renah0cki.xyz';
const SB = (LOCAL && QS.get('sb')) || SB_URL;
const LS_SESSION = 'fh_session';
const W_ = window.AucWheel;

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
const SRC = { da: 'DonationAlerts', donatepay: 'DonatePay', donatex: 'DonateX', twitch: 'Twitch', site: 'coin', wallet: 'кошелёк', manual: 'вручную' };
const ST = { active: 'на лоте', queue: 'ожидает', won: 'победа', refunded: 'возвращено', kept: 'оставлено', failed: 'ошибка возврата' };
const AST = { idle: 'не начат', running: 'идёт', paused: 'пауза', ended: 'ставки закрыты', closed: 'завершён' };
const PTS = new Set(['twitch']);   // «Баллы»; остальное — «Донаты»
const time = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dtime = t => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
// 60:00, 125:30 — минуты без часов, как привычно в аукционах
const mmss = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

let toastT;
function toast(msg, err = false) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

/* ── сессия основного сайта ── */
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
      if (!r.ok) { const f = readSession(); return f?.token && jwtExp(f.token) - Date.now() > 60e3 ? f.token : null; }
      const d = await r.json();
      localStorage.setItem(LS_SESSION, JSON.stringify({ ...(readSession() || s), token: d.access_token, refreshToken: d.refresh_token }));
      return d.access_token;
    } catch { return null; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}
async function aucApi(path, body) {
  const t = await getToken();
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return d;
}

/* ── состояние ── */
const S = {
  pub: null, adm: null, isAdmin: false, tab: 'lots', off: 0, prevStatus: null,
  uid: readSession()?.user?.id || null,
  q: 'wait', qSort: ls.get('auc_qsort') || 'new', flt: { don: true, pts: true },
  startMin: Number(ls.get('auc_startmin')) || 60,
  search: '', hist: { items: [], end: false },
  view: { pct: ls.get('auc_pct') !== '0', bars: ls.get('auc_bars') !== '0', hide: ls.get('auc_hide') === '1' },
};
const WH = { rot: 0, spinning: false, lastSpin: null, result: null, stop: null, auto: ls.get('auc_autospin') === '1' };
const A = () => S.adm || S.pub;
const lotsMap = () => new Map((A()?.lots || []).map(l => [l.id, l]));
const lotLabel = id => { const l = lotsMap().get(id); return l ? `#${l.num} ${l.name}` : '—'; };
const accepting = () => { const a = A()?.auction; return !!a && (['running', 'paused'].includes(a.status) || (a.status === 'idle' && a.accepting)); };

/* ── живые обновления ── */
let admT;
function connect() {
  const es = new EventSource(API + '/auc/events');
  es.onmessage = ev => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (!d) return;
    S.pub = d; S.off = Date.parse(d.now) - Date.now();
    if (S.isAdmin) { clearTimeout(admT); admT = setTimeout(loadAdmin, 200); }
    render();
  };
  es.addEventListener('spin', ev => { try { onSpin(JSON.parse(ev.data)); } catch {} });
}
async function loadAdmin() {
  try {
    const d = await aucApi('/auc/admin/state');
    S.adm = d; S.isAdmin = true; S.off = Date.parse(d.now) - Date.now();
    render();
  } catch (e) {
    if (e.status === 401 || e.status === 403) { S.isAdmin = false; S.adm = null; render(); }
  }
}

/* ── правила: # заголовок, ## подзаголовок, **жирный** ── */
function rulesHtml(t) {
  return String(t || '').split(/\r?\n/).map(line => {
    let h = esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^#\s/.test(line)) return `<h3>${h.replace(/^#\s+/, '')}</h3>`;
    if (/^##\s/.test(line)) return `<h4>${h.replace(/^##\s+/, '')}</h4>`;
    return line.trim() ? `<p>${h}</p>` : '';
  }).join('');
}

/* ── отрисовка ── */
function render() {
  const d = A(); if (!d) return;
  const a = d.auction;
  document.querySelectorAll('[data-adm]').forEach(el => { el.hidden = !S.isAdmin; });
  if (!S.isAdmin && !['lots', 'wheel'].includes(S.tab)) S.tab = 'lots';
  document.querySelectorAll('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  $('#aTitle').textContent = a.title;
  const ch = $('#aStatus');
  ch.textContent = a.status === 'idle' && a.accepting ? 'приём донатов' : (AST[a.status] || a.status);
  ch.className = 'chip ' + (a.status === 'idle' && a.accepting ? 'accept' : a.status);
  $('#aTotal').textContent = `${fmt(d.total)} б.`;
  const rh = rulesHtml(d.config?.rules);
  if ($('#rules').dataset.h !== rh) { $('#rules').innerHTML = rh; $('#rules').dataset.h = rh; }
  $('#lotCount').textContent = `${d.lots.length} ${plural(d.lots.length, 'лот', 'лота', 'лотов')}`;
  $('#eyeBtn').classList.toggle('off', S.view.hide);
  document.body.classList.toggle('hide-sums', S.view.hide);
  document.body.classList.toggle('no-pct', !S.view.pct);
  document.body.classList.toggle('no-bars', !S.view.bars);
  renderView(); renderRight(); tickClock();
  if (S.isAdmin && WH.auto && S.prevStatus === 'running' && a.status === 'ended' && !WH.spinning) { S.tab = 'wheel'; renderView(); setTimeout(doSpin, 600); }
  S.prevStatus = a.status;
}

/* таймер в шапке */
function tickClock() {
  const a = A()?.auction; if (!a) return;
  const now = Date.now() + S.off;
  let left = null, el = 0;
  if (a.status === 'running' && a.ends_at) left = (Date.parse(a.ends_at) - now) / 1000;
  else if (a.status === 'paused') left = (a.left_ms || 0) / 1000;
  if (a.started_at) el = ((a.ended_at && a.status !== 'running' && a.status !== 'paused' ? Date.parse(a.ended_at) : now) - Date.parse(a.started_at)) / 1000;
  const big = $('#timer');
  if (left == null) {
    big.textContent = a.status === 'idle' ? mmss(S.startMin * 60) : '00:00';
    big.className = 'clock-big idle';
    $('#limit').textContent = a.status === 'idle' ? mmss(S.startMin * 60) : mmss(el);
  } else {
    big.textContent = mmss(left);
    big.className = 'clock-big ' + (a.status === 'paused' ? 'pause' : left <= 30 ? 'low' : 'run');
    $('#limit').textContent = mmss(el + left);
  }
  $('#elapsed').textContent = mmss(el);
  const p = $('#playBtn'); const run = a.status === 'running';
  p.classList.toggle('on', run);
  const icon = run ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>';
  if (p.dataset.i !== String(run)) { p.innerHTML = icon; p.dataset.i = String(run); }
  p.disabled = a.status === 'closed';
}
setInterval(tickClock, 250);

function renderView() {
  const v = $('#view'); const t = S.tab;
  if (t === 'wheel') return renderWheel(v);
  if (t === 'lots') return renderLots(v);
  if (v.dataset.tab !== t) { v.dataset.tab = t; v.className = 'pane'; v.style.cssText = ''; v.innerHTML = ''; }
  if (t === 'bids') return v.innerHTML = bidsHtml();
  if (t === 'wallets') return v.innerHTML = walletsHtml();
  if (t === 'history') { if (!$('#histList')) { v.innerHTML = historyShell(); loadHistory(); } return; }
  if (t === 'settings') { if (!$('#setForm') || !v.contains(document.activeElement)) v.innerHTML = settingsHtml(); }
}

/* ── лоты (таблица) ── */
function renderLots(v) {
  if (v.dataset.tab !== 'lots') {
    v.dataset.tab = 'lots'; v.className = 'lots-view'; v.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
    v.innerHTML = `<div class="thead"><span class="c">N</span><span class="c hash">#</span><span>Название</span><input id="lotSearch" type="search" placeholder="Поиск…" aria-label="Поиск лота" value="${esc(S.search)}"><span class="r">Сумма</span></div>
      <div class="tbody" id="lotRows"></div>
      <form class="addbar" data-form="lotAdd" ${S.isAdmin && A().auction.status !== 'closed' ? '' : 'hidden'}>
        <input class="in" name="name" maxlength="80" placeholder="Название лота…" aria-label="Название лота" autocomplete="off">
        <input class="in sum-in" name="sum" type="number" step="any" min="0" inputmode="decimal" placeholder="Сумма" aria-label="Сумма">
        <select class="in" name="unit" aria-label="Единица"><option value="pts">б.</option><option value="RUB">₽</option></select>
        <button class="add-btn">+ Лот</button>
      </form>`;
  } else v.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
  const f = $('.addbar', v); if (f) f.hidden = !(S.isAdmin && A().auction.status !== 'closed');
  const d = A(); const all = d.lots;
  const max = Math.max(1, ...all.map(l => +l.total)); const sum = all.reduce((s, l) => s + +l.total, 0) || 1;
  const q = S.search.trim().toLowerCase();
  const lots = q ? all.filter(l => l.name.toLowerCase().includes(q) || String(l.num) === q.replace('#', '')) : all;
  const win = d.auction.winner_lot;
  const rowsHtml = lots.length ? lots.map(l => `
    <div class="lrow ${win === l.id ? 'win' : ''}" data-lot="${l.id}">
      <span class="bar" style="width:${(+l.total / max * 100).toFixed(1)}%"></span>
      <span class="c n">${all.indexOf(l) + 1}</span><span class="c hash">${l.num}</span>
      <span class="nm">${esc(l.name)}</span>
      <span class="acts">${S.isAdmin ? `<button class="ib" data-act="lotPlus" data-id="${l.id}" title="Добавить баллы" aria-label="Добавить баллы">+</button><button class="ib" data-act="lotRename" data-id="${l.id}" title="Переименовать" aria-label="Переименовать"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button class="ib" data-act="lotDel" data-id="${l.id}" title="Удалить" aria-label="Удалить">✕</button>` : ''}</span>
      <span class="r sum"><b>${fmt(l.total)}</b><small>${(+l.total / sum * 100).toFixed(1)}%</small></span>
    </div>`).join('')
    : `<div class="empty">${q ? 'Ничего не нашлось' : 'Лотов пока нет — добавьте первый'}</div>`;
  const rows = $('#lotRows'); if (rows.dataset.h !== rowsHtml) { rows.innerHTML = rowsHtml; rows.dataset.h = rowsHtml; }
}

/* ── правая колонка: донаты ── */
function renderRight() {
  document.querySelectorAll('.seg2 button').forEach(b => b.classList.toggle('on', b.dataset.q === S.q));
  const d = A();
  const bids = S.isAdmin ? (S.adm?.bids || []) : (d.recent || []);
  const pending = bids.filter(b => b.status === 'queue');
  $('#qN').textContent = pending.length || '';
  let list = S.q === 'wait' ? pending : bids.filter(b => b.status !== 'queue');
  list = list.filter(b => PTS.has(b.source) ? S.flt.pts : S.flt.don);
  list = list.slice().sort((x, y) => S.qSort === 'old' ? x.id - y.id : y.id - x.id);
  const el = $('#dlist'); let html;
  if (!list.length) {
    const a = d.auction;
    html = S.q === 'wait' && S.isAdmin && !accepting() && ['idle'].includes(a.status)
      ? `<div class="empty"><b>Донатов пока нет</b><p>Включите приём — донаты и баллы будут приходить до старта таймера.</p><button class="btn outline" data-act="acceptOn">Начать принимать донаты</button></div>`
      : `<div class="empty"><b>${S.q === 'wait' ? 'Ожидающих нет' : 'Пока пусто'}</b>${S.q === 'wait' ? '<p>Сюда попадают донаты без понятного лота. Перетащите донат на лот или выберите лот из списка.</p>' : ''}</div>`;
  } else {
    const fresh = Date.now() + S.off - 15000;
    const opts = d.lots.slice().sort((a, b) => a.num - b.num).map(l => `<option value="${l.id}">#${l.num} ${esc(l.name)}</option>`).join('');
    html = list.map(b => {
      const msg = b.message || b.meta?.message || '';
      const unit = b.orig_amount != null && !['manual', 'wallet'].includes(b.source) ? `${fmt(b.orig_amount)} ${esc(b.orig_unit || '')}` : '';
      return `<div class="don ${Date.parse(b.created_at) > fresh ? 'fresh' : ''}" ${S.isAdmin && b.status === 'queue' ? `draggable="true" data-bid="${b.id}"` : ''}>
        <span class="who">${esc(b.user_name)}</span><span class="amt">+${fmt(b.points)}${unit ? `<small>${unit}</small>` : ''}</span>
        ${msg ? `<span class="msg">${esc(msg)}</span>` : ''}
        <span class="meta"><span class="src ${b.source}">${SRC[b.source]}</span>${b.status !== 'queue' ? `<span class="st ${b.status}">${ST[b.status]}</span>${b.lot_id ? ' ' + esc(lotLabel(b.lot_id)) : ''}` : ''}<span>${time(b.created_at)}</span>${b.refund_to ? `<span>→ ${esc(b.refund_to)}</span>` : ''}</span>
        ${S.isAdmin && b.status === 'queue' ? `<span class="acts"><select data-assign="${b.id}" aria-label="Поставить на лот"><option value="">На лот…</option>${opts}${msg ? `<option value="new">+ Новый лот «${esc(msg.slice(0, 30))}»</option>` : ''}</select><button class="ib" data-act="refund" data-id="${b.id}" title="Вернуть" aria-label="Вернуть">↩</button></span>` : ''}
        ${S.isAdmin && b.status === 'failed' ? `<span class="acts"><button class="btn sm" data-act="retry">Повторить</button><button class="btn sm ghost" data-act="markDone" data-id="${b.id}">Уже вернул</button></span>` : ''}
      </div>`;
    }).join('');
  }
  if (el.dataset.h !== html && !el.contains(document.activeElement)) { el.innerHTML = html; el.dataset.h = html; }
  if (S.isAdmin && S.adm) {
    const c = S.adm.config;
    if (document.activeElement !== $('#autoAdd')) $('#autoAdd').value = c.auto_add || 'match';
    $('#qSort').value = S.qSort;
    $('#acceptTg').checked = !!d.auction.accepting || ['running', 'paused'].includes(d.auction.status);
    $('#acceptTg').disabled = ['running', 'paused', 'ended', 'closed'].includes(d.auction.status);
    $('#noRefTg').checked = !!c.no_refund;
    document.querySelectorAll('.flt').forEach(b => b.classList.toggle('on', S.flt[b.dataset.flt]));
  }
}

/* ── колесо ── */
function renderWheel(v) {
  if (v.dataset.tab !== 'wheel' || !$('#wheelCv')) {
    v.dataset.tab = 'wheel'; v.className = 'wheel-pane'; v.style.cssText = '';
    v.innerHTML = `<div class="wheel-box"><canvas id="wheelCv" aria-label="Колесо фортуны"></canvas></div><div class="wheel-res" id="wheelRes" aria-live="polite"></div><div class="wheel-ctl" id="wheelCtl"></div>`;
  }
  if (!WH.spinning) W_.draw($('#wheelCv'), W_.segs(A().lots), WH.rot, WH.result?.id);
  const res = $('#wheelRes');
  if (!WH.spinning) { res.textContent = WH.result ? `Победитель: #${WH.result.num} ${WH.result.name}` : 'Чем больше баллов у лота, тем больше его сектор'; res.className = 'wheel-res' + (WH.result ? ' win' : ''); }
  const c = $('#wheelCtl');
  if (S.isAdmin && !c.contains(document.activeElement)) {
    c.innerHTML = `<label class="min-in"><span class="muted">сек</span><input id="spinSec" type="number" inputmode="numeric" min="3" max="120" value="${A().config?.wheel_sec || 20}" aria-label="Сколько секунд крутится колесо"></label>
      <button class="btn pri" data-act="spin" ${WH.spinning ? 'disabled' : ''}>Крутить</button>
      ${WH.result && !WH.spinning && A().auction.status !== 'closed' ? `<button class="btn ok" data-act="finishWin">Завершить: «${esc(WH.result.name)}»</button>` : ''}
      <label class="check"><input type="checkbox" id="autoSpin" ${WH.auto ? 'checked' : ''}><span>Крутить само, когда время вышло</span></label>`;
  } else if (!S.isAdmin) c.innerHTML = '';
}
window.addEventListener('resize', () => { if (S.tab === 'wheel' && !WH.spinning && $('#wheelCv')) W_.draw($('#wheelCv'), W_.segs(A().lots), WH.rot, WH.result?.id); });
async function doSpin() {
  if (WH.spinning) return;
  const segs = W_.segs(A().lots);
  if (!segs.length) return toast('На лотах нет баллов', true);
  const sec = Math.min(120, Math.max(3, Number($('#spinSec')?.value) || A().config?.wheel_sec || 20));
  const win = W_.pick(segs);
  const from = WH.rot % (Math.PI * 2);
  const to = W_.target(win, from, Math.max(4, Math.round(sec / 1.6)));
  try {
    const ev = await aucApi('/auc/admin/do', { a: 'spin', lots: A().lots, winner: win.id, from, to, ms: sec * 1000 });
    setTimeout(() => { if (WH.lastSpin !== ev.id) onSpin(ev); }, 1200);
  } catch (e) { toast(e.message, true); }
}
function onSpin(ev) {
  if (WH.lastSpin === ev.id) return;
  WH.lastSpin = ev.id; WH.spinning = true; WH.result = null;
  if (S.tab !== 'wheel') { S.tab = 'wheel'; render(); }
  renderWheel($('#view'));
  const cv = $('#wheelCv'); const res = $('#wheelRes'); const segs = W_.segs(ev.lots);
  WH.stop?.();
  WH.stop = W_.spin(cv, segs, ev.from, ev.to, ev.ms, ev.startAt - S.off,
    s => { if (s) { res.textContent = `#${s.num} ${s.name}`; res.className = 'wheel-res'; } },
    rot => {
      WH.rot = rot; WH.spinning = false; WH.result = segs.find(s => s.id === ev.winner) || W_.at(segs, rot);
      W_.draw(cv, segs, rot, WH.result?.id); renderWheel($('#view'));
      if (WH.result) toast(`Колесо выбрало: ${WH.result.name}`);
    });
}

/* ── все ставки, кошельки ── */
function bidItem(b) {
  const can = ['active', 'queue', 'failed'].includes(b.status);
  const msg = b.message || b.meta?.message || '';
  return `<li class="item">
    <span class="main"><b>${esc(b.user_name)}</b> <span class="src ${b.source}">${SRC[b.source]}</span> <span class="st ${b.status}">${ST[b.status]}</span></span>
    <span class="side">${fmt(b.points)} б.${b.orig_amount != null && !['manual', 'wallet'].includes(b.source) ? ` <span class="muted">(${fmt(b.orig_amount)} ${esc(b.orig_unit || '')})</span>` : ''}</span>
    <span class="meta">${dtime(b.created_at)} · ${esc(b.lot_id ? lotLabel(b.lot_id) : 'без лота')}${msg ? ` · «${esc(msg)}»` : ''}${b.refund_to ? ` · → ${esc(b.refund_to)}` : ''}${b.note ? ` · ${esc(b.note)}` : ''}</span>
    ${can ? `<span class="acts">${b.status !== 'failed' ? `<button class="btn sm" data-act="assign" data-id="${b.id}">${b.status === 'queue' ? 'На лот' : 'Перенести'}</button>` : ''}
      <button class="btn sm bad" data-act="refund" data-id="${b.id}">Вернуть</button>
      ${b.status === 'failed' ? `<button class="btn sm ghost" data-act="markDone" data-id="${b.id}">Уже вернул сам</button>` : ''}</span>` : ''}
  </li>`;
}
let bidFilter = 'all';
function bidsHtml() {
  const all = S.adm?.bids || [];
  const f = { all: () => true, live: b => ['active', 'queue'].includes(b.status), won: b => b.status === 'won', refunded: b => b.status === 'refunded', failed: b => b.status === 'failed' }[bidFilter];
  const sum = s => all.filter(b => b.status === s).reduce((x, b) => x + +b.points, 0);
  const list = all.filter(f);
  return `<div class="box"><h2 class="h2">Все ставки аукциона</h2>
    <div class="filters"><div class="seg">${[['all', 'Все'], ['live', 'Активные'], ['won', 'Победа'], ['refunded', 'Возвраты'], ['failed', 'Ошибки']].map(([k, t]) => `<button data-act="bidFilter" data-id="${k}" class="${bidFilter === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <button class="btn sm" data-act="manual">+ Ставка вручную</button></div>
    <div class="summary"><div><span>На лотах</span><b>${fmt(sum('active'))} б.</b></div><div><span>У победителя</span><b>${fmt(sum('won'))} б.</b></div><div><span>Возвращено</span><b>${fmt(sum('refunded'))} б.</b></div></div>
    ${list.length ? `<ol class="items">${list.map(bidItem).join('')}</ol>` : '<div class="empty">Пусто</div>'}</div>`;
}
function walletsHtml() {
  const w = S.adm?.wallets || [];
  return `<div class="box"><h2 class="h2">Кошельки аукциона</h2>
    <p class="hint">Сюда возвращаются баллы с донатов (деньги не вернуть). Их можно поставить на лот в любом аукционе — по просьбе зрителя.</p>
    <div class="filters"><button class="btn sm" data-act="walletAdd">+ Начислить вручную</button></div>
    ${w.length ? `<ol class="items">${w.map(x => `<li class="item"><span class="main"><b>${esc(x.name)}</b></span><span class="side">${fmt(x.balance)} б.</span>
      <span class="acts"><button class="btn sm ok" data-act="walletSpend" data-id="${esc(x.name)}" ${A().auction.status === 'closed' ? 'disabled' : ''}>Поставить на лот</button><button class="btn sm ghost" data-act="walletAdj" data-id="${esc(x.name)}">Изменить</button></span></li>`).join('')}</ol>` : '<div class="empty">Пока пусто</div>'}</div>`;
}

/* ── история ── */
const KIND = { bid: 'ставка', assign: 'перенос', refund: 'возврат', won: 'победа', kept: 'без возврата', wallet: 'кошелёк', lot: 'лот', auction: 'аукцион', error: 'ошибка', info: 'инфо', donation: 'донат' };
function historyShell() {
  const opts = (S.adm?.auctions || []).map(x => `<option value="${x.id}" ${S.histAuction === x.id ? 'selected' : ''}>${esc(x.title)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</option>`).join('');
  return `<div class="box"><h2 class="h2">История: что, откуда и куда</h2>
    <div class="filters"><input class="in" id="hq" type="search" placeholder="Поиск по нику или тексту" aria-label="Поиск по истории">
      <select class="in" id="hsc" aria-label="Какой аукцион"><option value="cur">Текущий аукцион</option><option value="all" ${S.histAuction === 'all' ? 'selected' : ''}>Все аукционы</option>${opts}</select>
      <button class="btn sm" data-act="csv">CSV</button></div>
    <ol class="items hist" id="histList"></ol><button class="btn sm ghost" id="histMore" data-act="histMore" hidden>Показать ещё</button></div>`;
}
const histScope = () => { const v = $('#hsc')?.value || 'cur'; return v === 'cur' ? A().auction.id : v === 'all' ? null : Number(v); };
async function loadHistory(more = false) {
  const before = more ? S.hist.items.at(-1)?.id : null;
  try {
    const rows = await aucApi('/auc/admin/history', { q: $('#hq')?.value.trim() || '', auction: histScope(), before, limit: 200 });
    S.hist.items = more ? S.hist.items.concat(rows) : rows; S.hist.end = rows.length < 200;
    const el = $('#histList'); if (!el) return;
    el.innerHTML = S.hist.items.length ? S.hist.items.map(h => `<li class="item"><span class="t">${dtime(h.ts)}</span><span class="main"><span class="k k-${h.kind}">${KIND[h.kind] || h.kind}</span> ${esc(h.text)}</span></li>`).join('') : '<div class="empty">Ничего не найдено</div>';
    $('#histMore').hidden = S.hist.end;
  } catch (e) { toast(e.message, true); }
}
async function exportCsv() {
  const rows = await aucApi('/auc/admin/history', { q: $('#hq')?.value.trim() || '', auction: histScope(), limit: 5000 });
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + ['время;тип;ник;источник;баллы;лот;куда;текст', ...rows.reverse().map(h =>
    [dtime(h.ts), KIND[h.kind] || h.kind, h.user_name, SRC[h.source] || h.source || '', h.points ?? '', h.lot_name, h.target, h.text].map(q).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `auc-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ── настройки ── */
function settingsHtml() {
  const d = S.adm; const c = d.config; const I = d.integrations || {};
  const st = s => `<span class="dot ${s?.state || ''}"></span>`;
  const r = c.rates || {};
  const rate = (k, label) => `<label>${label}<input class="in" name="rate_${k}" type="number" step="any" min="0" inputmode="decimal" value="${esc(r[k] ?? '')}"></label>`;
  const donate = `${location.origin}/donate/`;
  return `<div class="box"><h2 class="h2">Подключения</h2><div class="ints">
    <div class="int"><div class="int-h">${st(I.twitch)}<b>Twitch — баллы канала</b><span class="muted">${esc(I.twitch?.login || '')}</span></div>
      <p>${esc(I.twitch?.text || '')}${I.twitch?.rewards?.length ? ` · награды: ${I.twitch.rewards.join(', ')}` : ''}</p>
      <div class="row">${I.twitch?.login ? `<button class="btn sm" data-act="twRewards">Обновить награды</button><button class="btn sm ghost" data-act="disc" data-id="twitch">Отключить</button>` : ''}
        <button class="btn sm ${I.twitch?.login ? 'ghost' : 'pri'}" data-act="conn" data-id="twitch" ${I.twitch?.configured ? '' : 'disabled'}>${I.twitch?.login ? 'Переподключить' : 'Подключить Twitch'}</button></div></div>
    <div class="int"><div class="int-h">${st(I.da)}<b>DonationAlerts</b><span class="muted">${esc(I.da?.name || '')}</span></div><p>${esc(I.da?.text || '')}</p>
      <div class="row"><button class="btn sm ${I.da?.name ? 'ghost' : 'pri'}" data-act="conn" data-id="da" ${I.da?.configured ? '' : 'disabled'}>${I.da?.name ? 'Переподключить' : 'Подключить DonationAlerts'}</button>${I.da?.name ? '<button class="btn sm ghost" data-act="disc" data-id="da">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h">${st(I.donatepay)}<b>DonatePay</b></div><p>${esc(I.donatepay?.text || '')} · API-ключ: donatepay.ru → Настройки → API</p>
      <div class="row"><button class="btn sm ${I.donatepay?.connected ? 'ghost' : 'pri'}" data-act="tok" data-id="donatepay">${I.donatepay?.connected ? 'Сменить ключ' : 'Ввести ключ'}</button>${I.donatepay?.connected ? '<button class="btn sm ghost" data-act="disc" data-id="donatepay">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h">${st(I.donatex)}<b>DonateX</b></div><p>${esc(I.donatex?.text || '')} · токен: donatex.gg → Настройки → API и доступ</p>
      <div class="row"><button class="btn sm ${I.donatex?.connected ? 'ghost' : 'pri'}" data-act="tok" data-id="donatex">${I.donatex?.connected ? 'Сменить токен' : 'Ввести токен'}</button>${I.donatex?.connected ? '<button class="btn sm ghost" data-act="disc" data-id="donatex">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h"><span class="dot ok"></span><b>renah0cki coin</b></div><p>Зрители донатят coin по личной ссылке и могут выбрать лот. Там же — виджет для OBS.</p>
      <div class="row"><code class="code">${esc(donate)}</code><button class="btn sm" data-act="copy" data-id="${esc(donate)}">Копировать</button><a class="btn sm ghost" href="/donate/">Открыть</a></div></div>
  </div></div>
  <form class="box" id="setForm" data-form="settings"><h2 class="h2">Курсы и таймер</h2>
    <p class="hint">Сколько баллов аукциона даёт 1 единица. Донат с кодом RN-… — пополнение coin, аукцион его не трогает.</p>
    <div class="rates">${rate('RUB', '1 ₽')}${rate('UAH', '1 ₴')}${rate('USD', '1 $')}${rate('EUR', '1 €')}${rate('KZT', '1 ₸')}${rate('BYN', '1 BYN')}${rate('twitch', '1 балл канала')}${rate('site', '1 coin')}</div>
    <div class="rates" style="margin-top:10px">
      <label>+сек к таймеру при ставке<input class="in" name="add_sec" type="number" min="0" max="600" inputmode="numeric" value="${c.add_sec}"></label>
      <label>…если осталось меньше (сек)<input class="in" name="add_below_sec" type="number" min="0" max="3600" inputmode="numeric" value="${c.add_below_sec}"></label>
      <label>Мин. донат coin<input class="in" name="min_site_bid" type="number" min="1" inputmode="numeric" value="${c.min_site_bid}"></label>
      <label>Колесо крутится (сек)<input class="in" name="wheel_sec" type="number" min="3" max="120" inputmode="numeric" value="${c.wheel_sec || 20}"></label>
      <label style="grid-column:1/-1">Награды Twitch (цены)<input class="in" name="twitch_costs" value="${esc((c.twitch_costs || []).join(', '))}"></label>
    </div>
    <div class="sheet-acts"><button class="btn pri">Сохранить</button></div></form>
  <div class="box"><h2 class="h2">Оверлей для OBS</h2><p class="hint">Источник «Браузер», 600×800: таймер, топ лотов, колесо.</p>
    <div class="row"><code class="code">${esc(d.overlay)}</code><button class="btn sm" data-act="copy" data-id="${esc(d.overlay)}">Копировать</button></div></div>`;
}

/* ── нижний лист и всплывашка ── */
let sheetSubmit = null;
function sheet(title, html, onSubmit) {
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; sheetSubmit = onSubmit;
  const d = $('#sheet'); if (!d.open) d.showModal();
  setTimeout(() => d.querySelector('.sheet-body input:not([type=radio]):not([type=checkbox]):not([type=hidden]), .sheet-body textarea')?.focus(), 50);
}
const closeSheet = () => $('#sheet').close();
$('#sheetBody').addEventListener('change', e => { const n = $('#newLotF'); if (e.target.name === 'lot' && n) n.hidden = e.target.value !== 'new'; });
$('#sheetForm').addEventListener('submit', async e => {
  if (e.submitter?.value === 'cancel') return;
  e.preventDefault();
  if (!sheetSubmit) return closeSheet();
  const btn = e.submitter; if (btn) btn.disabled = true;
  try { const keep = await sheetSubmit(new FormData(e.target)); if (!keep) closeSheet(); }
  catch (err) { toast(err.message, true); }
  finally { if (btn) btn.disabled = false; }
});
const acts = (label, cls = 'pri') => `<div class="sheet-acts"><button class="btn ghost" value="cancel" formnovalidate>Отмена</button><button class="btn ${cls}" value="ok">${label}</button></div>`;
const lotPick = (sel, withNew = true, name = 'lot') => `<ul class="pick">${A().lots.map(l => `<li><label><input type="radio" name="${name}" value="${l.id}" ${sel === l.id ? 'checked' : ''}><span class="grow">#${l.num} ${esc(l.name)}</span><span class="muted num">${fmt(l.total)}</span></label></li>`).join('')}
  ${withNew ? `<li><label><input type="radio" name="${name}" value="new"><span class="grow">Новый лот…</span></label></li>` : ''}</ul>`;
function pop(anchor, html) {
  const p = $('#pop'); p.innerHTML = html; p.hidden = false;
  const r = anchor.getBoundingClientRect();
  const top = r.bottom + 6 + p.offsetHeight > innerHeight ? Math.max(8, r.top - 6 - p.offsetHeight) : r.bottom + 6;
  p.style.top = top + 'px'; p.style.left = Math.min(Math.max(8, r.left), innerWidth - p.offsetWidth - 8) + 'px';
}
const closePop = () => { $('#pop').hidden = true; };

async function admDo(body, okMsg) {
  const r = await aucApi('/auc/admin/do', body);
  if (okMsg) toast(okMsg);
  loadAdmin();
  return r;
}
function finishSheet(winnerId) {
  const d = A(); const top = winnerId ?? d.lots[0]?.id ?? null;
  const live = (S.adm?.bids || []).filter(b => ['active', 'queue', 'failed'].includes(b.status));
  const by = s => live.filter(b => b.source === s).length;
  sheet('Завершить аукцион', `<p class="hint">Ставки на победителя остаются (coin с него уходят тебе), остальным баллы возвращаются.</p>
    ${lotPick(top, false, 'winner')}
    <label class="check"><input type="checkbox" name="refund" ${S.adm?.config?.no_refund ? '' : 'checked'}><span>Вернуть баллы всем, кроме победителя</span></label>
    <div class="summary">
      <div><span>coin → обратно зрителю</span><b>${by('site')}</b></div>
      <div><span>Twitch → баллы канала обратно</span><b>${by('twitch')}</b></div>
      <div><span>Донаты, вручную → кошелёк аукциона</span><b>${by('da') + by('donatepay') + by('donatex') + by('manual') + by('wallet')}</b></div>
    </div>${acts('Завершить', 'ok')}`,
    async f => {
      const r = await admDo({ a: 'finish', winner: f.get('winner') ? Number(f.get('winner')) : null, refund: f.get('refund') === 'on' });
      toast(`Готово: победа ${r.won}, возвращено ${r.refunded}${r.kept ? `, оставлено ${r.kept}` : ''}${r.failed ? `, ошибок ${r.failed} — см. «Все ставки»` : ''}`, !!r.failed);
    });
}
const setTab = t => { S.tab = t; closePop(); render(); };

/* ── клики ── */
document.addEventListener('click', async e => {
  if (!e.target.closest('#pop') && !e.target.closest('[data-act=aucList],[data-act=view]')) closePop();
  const tab = e.target.closest('#tabs [data-tab]'); if (tab) return setTab(tab.dataset.tab);
  const q = e.target.closest('.seg2 button'); if (q) { S.q = q.dataset.q; return renderRight(); }
  const fl = e.target.closest('.flt'); if (fl) { S.flt[fl.dataset.flt] = !S.flt[fl.dataset.flt]; return renderRight(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, nid = Number(id);
  const a = A()?.auction;
  try {
    switch (act) {
      case 'play':
        if (a.status === 'idle') return admDo({ a: 'control', op: 'start', sec: S.startMin * 60 }, 'Аукцион начался');
        if (a.status === 'running') return admDo({ a: 'control', op: 'pause' });
        if (a.status === 'paused') return admDo({ a: 'control', op: 'start' });
        if (a.status === 'ended') return admDo({ a: 'control', op: 'reopen', sec: 60 }, 'Ставки снова открыты (на паузе)');
        return;
      case 'minus': case 'plus': {
        const dlt = act === 'plus' ? 1 : -1;
        if (a.status === 'idle') { S.startMin = Math.max(1, Math.min(600, S.startMin + dlt)); ls.set('auc_startmin', S.startMin); return tickClock(); }
        if (['running', 'paused'].includes(a.status)) return admDo({ a: 'control', op: 'add', sec: 60 * dlt });
        return;
      }
      case 'reset':
        if (['running', 'paused'].includes(a.status)) { if (confirm('Закрыть приём ставок?')) return admDo({ a: 'control', op: 'stop' }); return; }
        if (a.status === 'idle') { S.startMin = 60; ls.set('auc_startmin', 60); return tickClock(); }
        return;
      case 'acceptOn': return admDo({ a: 'accept', on: true }, 'Приём донатов включён');
      case 'finish': if (a.status === 'closed') return sheet('Новый аукцион', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="Аукцион"></label>${acts('Создать')}`,
          f => { WH.result = null; return admDo({ a: 'new', title: f.get('t') }, 'Создан новый аукцион'); });
        return finishSheet();
      case 'finishWin': return finishSheet(WH.result?.id);
      case 'spin': return doSpin();
      case 'retry': { const r = await admDo({ a: 'retry' }); return toast(`Повторено: ${r.retried}, успешно: ${r.ok}`); }
      case 'archive': S.histAuction = 'all'; $('#view').dataset.tab = ''; return setTab('history');
      case 'aucList': {
        const list = S.adm?.auctions || [];
        return pop(el, list.map(x => `<button data-act="openAuc" data-id="${x.id}">${esc(x.title)}<small>${x.id === A().auction.id ? 'текущий' : new Date(x.created_at).toLocaleDateString('ru-RU')}</small></button>`).join('')
          + (S.isAdmin && a.status === 'closed' ? '<button data-act="finish">+ Новый аукцион</button>' : '') || '<button disabled>Нет аукционов</button>');
      }
      case 'openAuc': closePop(); if (nid === A().auction.id) return setTab('lots'); S.histAuction = nid; $('#view').dataset.tab = ''; return setTab('history');
      case 'view': return pop(el, `<label><input type="checkbox" data-view="pct" ${S.view.pct ? 'checked' : ''}>Проценты</label><label><input type="checkbox" data-view="bars" ${S.view.bars ? 'checked' : ''}>Полоски</label><label><input type="checkbox" data-view="hide" ${S.view.hide ? 'checked' : ''}>Скрыть суммы</label>`);
      case 'eye': S.view.hide = !S.view.hide; ls.set('auc_hide', S.view.hide ? '1' : '0'); return render();
      case 'title': return sheet('Название аукциона', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="${esc(a.title)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'control', op: 'title', title: f.get('t') }));
      case 'rules': return sheet('Правила', `<p class="hint"><b># Заголовок</b>, <b>## Подзаголовок</b>, <b>**жирный**</b>. Пустое поле — правил нет.</p>
        <label class="field"><span>Текст</span><textarea class="in" name="r" maxlength="5000" rows="12">${esc(A().config?.rules || '')}</textarea></label>${acts('Сохранить')}`,
        f => admDo({ a: 'config', config: { rules: String(f.get('r') || '') } }, 'Правила сохранены'));
      case 'lotRename': { const l = lotsMap().get(nid); return sheet(`Лот #${l.num}`, `<label class="field"><span>Название</span><input class="in" name="n" maxlength="80" value="${esc(l.name)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'lot', op: 'rename', id: nid, name: f.get('n') })); }
      case 'lotDel': { const l = lotsMap().get(nid); if (confirm(`Удалить лот «${l.name}»? Его ставки уйдут в ожидающие.`)) return admDo({ a: 'lot', op: 'delete', id: nid }, 'Лот удалён'); return; }
      case 'lotPlus': case 'manual': return sheet('Добавить баллы', `${act === 'manual' ? lotPick(null, false) : `<input type="hidden" name="lot" value="${nid}"><p class="hint">Лот ${esc(lotLabel(nid))}</p>`}
        <label class="field"><span>Ник</span><input class="in" name="u" maxlength="60" required autocomplete="off" value="Стример"></label>
        <label class="field"><span>Баллы</span><input class="in" name="p" type="number" step="any" min="0.01" inputmode="decimal" required></label>${acts('Добавить')}`,
        f => admDo({ a: 'manual', lot: f.get('lot') ? Number(f.get('lot')) : null, user: f.get('u'), points: Number(f.get('p')) }, 'Баллы добавлены'));
      case 'assign': return sheet('Перенести ставку', `${lotPick(null)}<label class="field" id="newLotF" hidden><span>Название нового лота</span><input class="in" name="n" maxlength="80"></label>${acts('Перенести')}`,
        f => { const l = f.get('lot'); if (!l) throw new Error('Выбери лот'); return admDo({ a: 'assign', bid: nid, lot: l === 'new' ? null : Number(l), name: l === 'new' ? f.get('n') : null }, 'Перенесено'); });
      case 'refund': {
        const b = S.adm.bids.find(x => x.id === nid);
        const where = b.source === 'site' ? 'coin вернутся зрителю' : b.source === 'twitch' ? 'баллы вернутся на Twitch' : 'баллы уйдут в кошелёк аукциона';
        if (confirm(`Вернуть ${b.user_name} ${fmt(b.points)} б.? ${where}.`)) { const r = await admDo({ a: 'refund', bid: nid }); toast(r.status === 'failed' ? 'Не получилось вернуть — см. ошибку' : 'Возвращено', r.status === 'failed'); }
        return;
      }
      case 'markDone': if (confirm('Отметить как возвращённую?')) return admDo({ a: 'mark', bid: nid, result: 'refunded' }, 'Отмечено'); return;
      case 'bidFilter': bidFilter = id; return renderView();
      case 'walletSpend': { const w = S.adm.wallets.find(x => x.name === id); return sheet(`Кошелёк «${w.name}»`, `<p class="hint">Доступно ${fmt(w.balance)} б.</p>${lotPick(null, false)}
        <label class="field"><span>Сколько поставить</span><input class="in" name="p" type="number" step="any" min="0.01" max="${w.balance}" value="${w.balance}" required></label>${acts('Поставить')}`,
        f => admDo({ a: 'wallet', op: 'spend', name: w.name, points: Number(f.get('p')), lot: f.get('lot') ? Number(f.get('lot')) : null }, 'Поставлено')); }
      case 'walletAdj': case 'walletAdd': return sheet(act === 'walletAdd' ? 'Начислить в кошелёк' : `Кошелёк «${id}»`, `
        <label class="field"><span>Ник</span><input class="in" name="u" maxlength="60" value="${esc(id || '')}" required></label>
        <label class="field"><span>Изменение (минус — списать)</span><input class="in" name="p" type="number" step="any" required></label>${acts('Сохранить')}`,
        f => admDo({ a: 'wallet', op: 'adjust', name: f.get('u'), points: Number(f.get('p')) }, 'Сохранено'));
      case 'histMore': return loadHistory(true);
      case 'csv': return exportCsv();
      case 'conn': { const r = await admDo({ a: 'connect', service: id }); location.href = r.url; return; }
      case 'disc': if (confirm('Отключить?')) return admDo({ a: 'disconnect', service: id }, 'Отключено'); return;
      case 'tok': return sheet(id === 'donatepay' ? 'Ключ DonatePay' : 'Токен DonateX', `<p class="hint">Хранится только на сервере и больше нигде не показывается.</p>
        <label class="field"><span>${id === 'donatepay' ? 'API-ключ' : 'Внешний токен'}</span><input class="in" name="t" type="password" autocomplete="off" required></label>${acts('Сохранить')}`,
        f => admDo({ a: 'token', service: id, token: f.get('t') }, 'Подключено'));
      case 'twRewards': { const r = await admDo({ a: 'twitch_rewards' }); return toast('Награды: ' + r.rewards.map(x => x.cost).join(', ')); }
      case 'copy': await navigator.clipboard.writeText(id).catch(() => {}); return toast('Скопировано');
    }
  } catch (err) { toast(err.message, true); }
});

/* поля и переключатели */
document.addEventListener('change', async e => {
  const t = e.target;
  try {
    if (t.dataset.view) { S.view[t.dataset.view] = t.checked; ls.set('auc_' + t.dataset.view, t.checked ? (t.dataset.view === 'hide' ? '1' : '1') : '0'); return render(); }
    if (t.dataset.assign) {
      const bidId = Number(t.dataset.assign); const v = t.value; if (!v) return;
      const b = S.adm.bids.find(x => x.id === bidId);
      return admDo(v === 'new' ? { a: 'assign', bid: bidId, lot: null, name: String(b.message || b.meta?.message || '').slice(0, 80) } : { a: 'assign', bid: bidId, lot: Number(v) }, 'На лоте');
    }
    if (t.id === 'acceptTg') return admDo({ a: 'accept', on: t.checked }, t.checked ? 'Приём донатов включён' : 'Приём донатов выключен');
    if (t.id === 'noRefTg') return admDo({ a: 'config', config: { no_refund: t.checked } }, t.checked ? 'Без возврата: включено' : 'Возврат проигравшим включён');
    if (t.id === 'autoAdd') return admDo({ a: 'config', config: { auto_add: t.value } }, t.value === 'none' ? 'Донаты не добавляются на лоты сами' : 'Донаты с «#номером» или названием встают на лот сами');
    if (t.id === 'qSort') { S.qSort = t.value; ls.set('auc_qsort', t.value); return renderRight(); }
    if (t.id === 'hsc') return loadHistory();
    if (t.id === 'autoSpin') { WH.auto = t.checked; ls.set('auc_autospin', WH.auto ? '1' : '0'); }
  } catch (err) { toast(err.message, true); render(); }
});
let hqT;
document.addEventListener('input', e => {
  if (e.target.id === 'hq') { clearTimeout(hqT); hqT = setTimeout(() => loadHistory(), 300); }
  if (e.target.id === 'lotSearch') { S.search = e.target.value; renderLots($('#view')); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  try {
    if (f.dataset.form === 'lotAdd') {
      const n = String(fd.get('name') || '').trim(); if (!n) return;
      let pts = Number(fd.get('sum')) || 0;
      if (pts > 0 && fd.get('unit') === 'RUB') pts *= Number(S.adm?.config?.rates?.RUB) || 1;
      const r = await aucApi('/auc/admin/do', { a: 'lot', op: 'add', name: n });
      if (pts > 0) await aucApi('/auc/admin/do', { a: 'manual', lot: r.id, user: 'Стример', points: pts });
      f.name.value = ''; f.sum.value = ''; f.name.focus(); loadAdmin();
    } else if (f.dataset.form === 'settings') {
      const rates = { ...S.adm.config.rates };
      for (const [k, v] of fd) if (k.startsWith('rate_') && v !== '') rates[k.slice(5)] = Number(v);
      await admDo({ a: 'config', config: { rates, add_sec: +fd.get('add_sec'), add_below_sec: +fd.get('add_below_sec'), min_site_bid: +fd.get('min_site_bid'),
        wheel_sec: +fd.get('wheel_sec'), twitch_costs: String(fd.get('twitch_costs')).split(/[,\s]+/).filter(Boolean) } }, 'Сохранено');
    }
  } catch (err) { toast(err.message, true); }
});

/* перетаскивание ожидающего доната на лот */
document.addEventListener('dragstart', e => { const d = e.target.closest?.('.don[data-bid]'); if (d) { e.dataTransfer.setData('text/plain', d.dataset.bid); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => { const r = e.target.closest?.('.lrow'); if (r) { e.preventDefault(); document.querySelectorAll('.lrow.drop').forEach(x => x !== r && x.classList.remove('drop')); r.classList.add('drop'); } });
document.addEventListener('dragleave', e => { const r = e.target.closest?.('.lrow'); if (r && !r.contains(e.relatedTarget)) r.classList.remove('drop'); });
document.addEventListener('drop', async e => {
  const r = e.target.closest?.('.lrow'); if (!r) return;
  e.preventDefault(); r.classList.remove('drop');
  const bid = Number(e.dataTransfer.getData('text/plain')); if (!bid) return;
  try { await admDo({ a: 'assign', bid, lot: Number(r.dataset.lot) }, 'На лоте'); } catch (err) { toast(err.message, true); }
});

/* ── старт ── */
connect();
if (S.uid) loadAdmin();
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } }).catch(() => {});
})();
