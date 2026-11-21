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
  search: '', hist: { items: [], end: false }, busy: 0, ver: 0, tmp: 0, shown: null,
  view: { pct: ls.get('auc_pct') !== '0', bars: ls.get('auc_bars') !== '0', hide: ls.get('auc_hide') === '1', rules: ls.get('auc_rules') !== '0', compact: ls.get('auc_compact') === '1' },
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
  if (S.busy) return;                          // ответ на действие сам принесёт свежее состояние
  const v = S.ver;
  try {
    const d = await aucApi('/auc/admin/state');
    if (S.busy || v !== S.ver) return;          // пока шёл запрос, на экране уже что-то поменяли
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
  const lft = $('#lfTotal'); if (lft) lft.innerHTML = `<span class="dim">Всего:</span> <b>${fmt(d.total)}</b> <span class="dim">₽</span>`;
  const rh = rulesHtml(d.config?.rules);
  if ($('#rules').dataset.h !== rh) { $('#rules').innerHTML = rh; $('#rules').dataset.h = rh; }
  $('#lotCount').textContent = `${d.lots.length} ${plural(d.lots.length, 'лот', 'лота', 'лотов')}`;
  $('#eyeBtn').classList.toggle('off', S.view.hide);
  document.body.classList.toggle('hide-sums', S.view.hide);
  document.body.classList.toggle('no-pct', !S.view.pct);
  document.body.classList.toggle('no-bars', !S.view.bars);
  document.body.classList.toggle('pa-no-rules', !S.view.rules);
  document.body.classList.toggle('pa-compact', !!S.view.compact);
  document.querySelectorAll('[data-pa]').forEach(b => b.classList.toggle('on', !!S.view[b.dataset.pa]));
  const wheel = S.tab === 'wheel';
  document.body.classList.toggle('tab-wheel', wheel); $('#wapp').hidden = !wheel;
  renderView(); if (!wheel) renderRight(); tickClock();
  if (S.isAdmin && WH.auto && S.prevStatus === 'running' && ((a.status === 'paused' && (a.left_ms || 0) <= 0) || a.status === 'ended') && !WH.spinning) { setTab('wheel'); setTimeout(doSpin, 700); }
  S.prevStatus = a.status; S.ready = true;
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
  const target = left ?? (a.status === 'idle' ? S.startMin * 60 : 0);
  // при ±минуте цифры плавно «перелетают» к новому значению (~0,35 с), обычный ход — без задержки
  const tnow = performance.now(), dt = Math.min(500, tnow - (S.shownAt || tnow)); S.shownAt = tnow;
  let shown = target, jump = false;
  if (S.ready && S.shown != null && S.shownFor === a.id && Math.abs(target - S.shown) > 1.2) {
    shown = target + (S.shown - target) * Math.pow(0.8, dt / 16.7); jump = Math.abs(target - shown) > 1.2;
    if (!jump) shown = target;
  }
  S.shown = shown; S.shownFor = a.id;
  const txt = (el2, t) => { if (el2.textContent !== t) el2.textContent = t; };
  txt(big, mmss(shown));
  const cls = 'clock-big ' + (left == null ? 'idle' : a.status === 'paused' ? 'pause' : left <= 30 ? 'low' : 'run') + (jump ? ' jump' : '');
  if (big.className !== cls) big.className = cls;
  txt($('#limit'), left == null ? (a.status === 'idle' ? mmss(shown) : mmss(el)) : mmss(el + shown));
  txt($('#elapsed'), mmss(el));
  const p = $('#playBtn'); const run = a.status === 'running';
  p.classList.toggle('on', run);
  const icon = run ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>';
  if (p.dataset.i !== String(run)) { p.innerHTML = icon; p.dataset.i = String(run); }
  p.disabled = false;
}
(function frame() { tickClock(); requestAnimationFrame(frame); })();
setInterval(tickClock, 500);   // если вкладка в фоне и кадры не рисуются

function renderView() {
  const v = $('#view'); const t = S.tab;
  if (t === 'wheel') return renderWheelTab();
  if (t === 'lots') return renderLots(v);
  if (v.dataset.tab !== t) { v.dataset.tab = t; v.className = 'pane'; v.style.cssText = ''; v.innerHTML = ''; }
  if (t === 'bids') return v.innerHTML = bidsHtml();
  if (t === 'wallets') return v.innerHTML = walletsHtml();
  if (t === 'history') { if (!$('#histList')) { v.innerHTML = historyShell(); loadHistory(); } return; }
  if (t === 'settings') { if (!$('#setForm') || !v.contains(document.activeElement)) v.innerHTML = settingsHtml(); }
}

/* ── плавные списки: новые въезжают, ушедшие сворачиваются, остальные плавно переезжают (FLIP) ── */
function leave(el) {
  if (el.classList.contains('leaving')) return;
  el.style.height = el.offsetHeight + 'px'; el.classList.add('leaving');
  requestAnimationFrame(() => { el.style.height = '0px'; el.style.opacity = '0'; el.style.paddingTop = el.style.paddingBottom = '0px'; el.style.marginTop = '-4px'; });
  setTimeout(() => el.remove(), 330);
}
function keyed(box, items, keyOf, build, update, emptyHtml) {
  box.querySelectorAll(':scope > .empty').forEach(e => { if (items.length) e.remove(); });
  const old = new Map([...box.children].filter(c => c.dataset.k && !c.classList.contains('leaving')).map(c => [c.dataset.k, c]));
  if (!items.length) {
    old.forEach(leave);
    let e = box.querySelector(':scope > .empty');
    if (!e) { box.insertAdjacentHTML('beforeend', emptyHtml); } else if (e.outerHTML !== emptyHtml) e.outerHTML = emptyHtml;
    return;
  }
  const first = new Map(); old.forEach((el, k) => first.set(k, el.getBoundingClientRect().top));
  const keep = new Set(); let prev = null;
  for (const it of items) {
    const k = String(keyOf(it)); keep.add(k);
    let el = old.get(k);
    if (!el) { el = build(it); el.dataset.k = k; if (S.ready) { el.classList.add('enter'); el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true }); } }
    update(el, it);
    const want = prev ? prev.nextSibling : box.firstChild;
    if (want !== el) box.insertBefore(el, want);
    prev = el;
  }
  old.forEach((el, k) => { if (!keep.has(k)) leave(el); });
  old.forEach((el, k) => {
    if (!keep.has(k)) return;
    const dy = first.get(k) - el.getBoundingClientRect().top; if (Math.abs(dy) < 1) return;
    el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'; el.style.transform = ''; }));
  });
}
// число плавно «досчитывается» до нового значения
function tween(el, to, f = fmt) {
  to = Number(to) || 0;
  const from = el._v ?? to; el._v = to;
  cancelAnimationFrame(el._raf);
  if (from === to || !S.ready) { el.textContent = f(to); return; }
  const t0 = performance.now(), d = 650;
  const step = now => { const p = Math.min(1, (now - t0) / d); el.textContent = f(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
  const row = el.closest('.lrow');
  if (row && to > from) { row.classList.add('bump'); clearTimeout(row._bt); row._bt = setTimeout(() => row.classList.remove('bump'), 800); }
}

/* ── лоты (таблица) ── */
const LOT_ACTS = id => `<button class="ib" data-act="lotPlus" data-id="${id}" title="Прибавить" aria-label="Добавить баллы">+</button><input class="pa-only pa-extra" type="number" step="any" inputmode="decimal" placeholder="₽" data-extra="${id}" aria-label="Прибавить к лоту"><button class="ib" data-act="lotDel" data-id="${id}" title="Удалить слот" aria-label="Удалить"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button><button class="ib" data-act="lotRename" data-id="${id}" title="Дополнительно / Переименовать" aria-label="Переименовать"><svg class="pa-hide" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg><svg class="pa-only pa-fill" viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2"/></svg></button>`;
function renderLots(v) {
  if (v.dataset.tab !== 'lots') {
    v.dataset.tab = 'lots'; v.className = 'lots-view';
    v.innerHTML = `<div class="lots-top"><div class="thead"><span class="c">N</span><span class="c hash">#</span><span>Название</span><input id="lotSearch" type="search" placeholder="Поиск среди лотов…" aria-label="Поиск лота" value="${esc(S.search)}"><span class="r">Сумма</span></div>
      <form class="addbar" data-form="lotAdd">
        <input class="in" name="name" maxlength="80" placeholder="Название нового лота" aria-label="Название лота" autocomplete="off">
        <input class="in sum-in" name="sum" type="number" step="any" min="0" inputmode="decimal" placeholder="₽" aria-label="Сумма">
        <select class="in" name="unit" aria-label="Единица"><option value="pts">б.</option><option value="RUB">₽</option></select>
        <button class="add-btn">+ Добавить лот</button>
      </form></div>
      <div class="tbody" id="lotRows"></div>`;
  }
  const f = $('.addbar', v);
  if (f) {
    f.hidden = !S.isAdmin;
    f.classList.toggle('is-closed', A().auction.status === 'closed');
    f.querySelectorAll('input,select,button').forEach(x => { x.disabled = false; });
  }
  const d = A(); const all = d.lots;
  const max = Math.max(1, ...all.map(l => +l.total)); const sum = all.reduce((s, l) => s + +l.total, 0) || 1;
  const q = S.search.trim().toLowerCase();
  const lots = q ? all.filter(l => l.name.toLowerCase().includes(q) || String(l.num) === q.replace('#', '')) : all;
  const win = d.auction.winner_lot;
  keyed($('#lotRows'), lots, l => l.id,
    l => { const el = document.createElement('div'); el.className = 'lrow'; el.dataset.lot = l.id;
      el.innerHTML = `<span class="bar"></span><span class="c n"></span><span class="c hash"></span><span class="nm"></span><span class="acts"></span><span class="r sum"><b></b><small></small></span>`; return el; },
    (el, l) => {
      el.classList.toggle('win', win === l.id);
      $('.bar', el).style.width = (+l.total / max * 100).toFixed(1) + '%';
      $('.n', el).textContent = all.indexOf(l) + 1; $('.hash', el).textContent = l.num; $('.nm', el).textContent = l.name;
      if (el._adm !== S.isAdmin) { $('.acts', el).innerHTML = S.isAdmin ? LOT_ACTS(l.id) : ''; el._adm = S.isAdmin; }
      tween($('.sum b', el), +l.total);
      $('.sum small', el).textContent = (+l.total / sum * 100).toFixed(1) + '%';
    },
    `<div class="empty">${q ? 'Ничего не нашлось' : 'Лотов пока нет — добавьте первый'}</div>`);
}

/* ── правая колонка: донаты ── */
function normTxt(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9#]+/gi, ' ').trim();
}
function bigrams(s) {
  const m = new Map();
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); }
  return m;
}
function findSimilarLot(msg, lots) {
  const m = normTxt(msg);
  if (!m || !lots?.length) return null;
  const numM = m.match(/#(\d+)/);
  if (numM) { const byNum = lots.find(l => l.num === Number(numM[1])); if (byNum) return byNum; }
  const mClean = m.replace(/#\d+/g, '').trim();
  if (mClean.length < 2) return null;
  const mWords = mClean.split(' ').filter(w => w.length >= 2);
  const mBi = bigrams(mClean.replace(/\s+/g, ''));
  let best = null, bestScore = 0;
  for (const l of lots) {
    const ln = normTxt(l.name);
    if (!ln) continue;
    let sc = 0;
    if (mClean === ln) sc = 1;
    else if (mClean.length >= 3 && (ln.includes(mClean) || mClean.includes(ln))) {
      sc = 0.8 + 0.15 * (Math.min(mClean.length, ln.length) / Math.max(mClean.length, ln.length));
    } else {
      const lWords = ln.split(' ').filter(w => w.length >= 2);
      let hits = 0;
      for (const w of mWords) {
        if (lWords.some(lw => lw === w || (w.length >= 3 && (lw.startsWith(w) || w.startsWith(lw))))) hits++;
      }
      const wordSc = mWords.length && lWords.length ? hits / Math.max(mWords.length, lWords.length) : 0;
      const lBi = bigrams(ln.replace(/\s+/g, ''));
      let inter = 0, tot = 0;
      mBi.forEach((c, g) => { tot += c; inter += Math.min(c, lBi.get(g) || 0); });
      lBi.forEach(c => { tot += c; });
      const dice = tot ? (2 * inter) / tot : 0;
      sc = Math.max(wordSc * 0.85, dice);
    }
    if (sc > bestScore) { bestScore = sc; best = l; }
  }
  return bestScore >= 0.35 ? best : null;
}
function donHtml(b, opts, lots, idx = -1) {
  const msg = b.message || b.meta?.message || '';
  const unit = b.orig_amount != null && !['manual', 'wallet'].includes(b.source) ? `${fmt(b.orig_amount)} ${esc(b.orig_unit || '')}` : '';
  const sim = S.isAdmin && b.status === 'queue' ? findSimilarLot(msg, lots) : null;
  const isQ = S.isAdmin && b.status === 'queue';
  return `${isQ ? `<span class="pa-only pa-bh"><span class="pa-bt">${fmt(b.points)} ${esc(b.user_name)}</span><button class="pa-bx" data-act="dismiss" data-id="${b.id}" title="Удалить" aria-label="Удалить">✕</button></span>` : ''}
    <span class="who${isQ ? ' pa-hide' : ''}">${esc(b.user_name)}</span><span class="amt${isQ ? ' pa-hide' : ''}">+${fmt(b.points)}${unit ? `<small>${unit}</small>` : ''}</span>
    ${msg ? `<span class="msg">${esc(msg)}</span>` : ''}
    <span class="meta${isQ ? ' pa-hide' : ''}"><span class="src ${b.source}">${SRC[b.source]}</span>${b.status !== 'queue' ? `<span class="st ${b.status}">${ST[b.status]}</span>${b.lot_id ? ' ' + esc(lotLabel(b.lot_id)) : ''}` : ''}<span>${time(b.created_at)}</span>${b.refund_to ? `<span>→ ${esc(b.refund_to)}</span>` : ''}</span>
    ${isQ ? `<span class="q-btns">${sim ? `<button class="btn sm ok q-sim" data-act="assignSim" data-id="${b.id}" data-lot="${sim.id}" title="Вкинуть в похожий лот #${sim.num} «${esc(sim.name)}»"><span class="pa-hide">→ #${sim.num} ${esc(sim.name)}</span><span class="pa-only">К ${esc(sim.name)}</span></button>` : ''}<span class="pa-split"><button class="btn sm outline q-new" data-act="assignNew" data-id="${b.id}" title="${msg ? `Создать новый лот «${esc(msg.slice(0, 60))}»` : 'Создать новый лот'}">${idx === 0 ? '<kbd class="pa-only pa-hk">1</kbd>' : ''}<span class="pa-hide">+ Новый лот</span><span class="pa-only">Новый</span></button><select class="pa-only pa-drop" data-assign="${b.id}" aria-label="Выбрать лот"><option value="">▾</option>${opts}</select></span><button class="ib bad pa-hide" data-act="dismiss" data-id="${b.id}" title="Удалить из ожидающих (без возврата)" aria-label="Удалить">✕</button></span><span class="acts pa-hide"><select data-assign="${b.id}" aria-label="Поставить на лот"><option value="">На лот…</option>${opts}</select><button class="ib" data-act="refund" data-id="${b.id}" title="Вернуть" aria-label="Вернуть">↩</button></span>` : ''}
    ${S.isAdmin && b.status === 'failed' ? `<span class="acts"><button class="btn sm" data-act="retry">Повторить</button><button class="btn sm ghost" data-act="markDone" data-id="${b.id}">Уже вернул</button></span>` : ''}`;
}
function renderRight() {
  document.querySelectorAll('.seg2 button').forEach(b => b.classList.toggle('on', b.dataset.q === S.q));
  const d = A();
  const bids = S.isAdmin ? (S.adm?.bids || []) : (d.recent || []);
  const pending = bids.filter(b => b.status === 'queue');
  $('#qN').textContent = pending.length || '';
  let list = S.q === 'wait' ? pending : bids.filter(b => b.status !== 'queue');
  list = list.filter(b => PTS.has(b.source) ? S.flt.pts : S.flt.don);
  list = list.slice().sort((x, y) => S.qSort === 'old' ? x.id - y.id : y.id - x.id).slice(0, 150);
  const a = d.auction;
  const empty = S.q === 'wait' && S.isAdmin && !accepting() && a.status === 'idle'
    ? `<div class="empty"><b>Донатов пока нет</b><p>Включите приём — донаты и баллы будут приходить до старта таймера.</p><button class="btn outline" data-act="acceptOn">Начать принимать донаты</button></div>`
    : `<div class="empty"><b>${S.q === 'wait' ? 'Ожидающих нет' : 'Пока пусто'}</b>${S.q === 'wait' ? '<p>Сюда попадают донаты без понятного лота. Перетащите донат на лот или выберите лот из списка.</p>' : ''}</div>`;
  const fresh = Date.now() + S.off - 15000;
  const opts = d.lots.slice().sort((x, y) => x.num - y.num).map(l => `<option value="${l.id}">#${l.num} ${esc(l.name)}</option>`).join('');
  keyed($('#dlist'), list, b => S.q + b.id,
    () => document.createElement('div'),
    (el, b) => {
      el.className = 'don don-' + (b.source || 'manual') + (b.status === 'queue' ? ' don-q' : '') + (Date.parse(b.created_at) > fresh ? ' fresh' : '') + (el.classList.contains('enter') ? ' enter' : '');
      if (S.isAdmin && b.status === 'queue') { el.draggable = true; el.dataset.bid = b.id; } else { el.draggable = false; delete el.dataset.bid; }
      const h = donHtml(b, opts, d.lots, list.indexOf(b));
      if (el._h !== h && !el.contains(document.activeElement)) { el.innerHTML = h; el._h = h; }
    }, empty);
  if (S.isAdmin && S.adm) {
    const c = S.adm.config;
    if (document.activeElement !== $('#autoAdd')) $('#autoAdd').value = c.auto_add || 'match';
    $('#qSort').value = S.qSort;
    $('#acceptTg').checked = !!a.accepting || ['running', 'paused'].includes(a.status);
    $('#acceptTg').disabled = ['running', 'paused', 'ended', 'closed'].includes(a.status);
    $('#noRefTg').checked = !!c.no_refund;
    document.querySelectorAll('.flt').forEach(b => b.classList.toggle('on', S.flt[b.dataset.flt]));
    const pDa = $('#paPillDa'), pTw = $('#paPillTw');
    if (pDa) pDa.classList.toggle('on', !!S.flt.don);
    if (pTw) pTw.classList.toggle('on', !!S.flt.pts);
  }
}

/* ══ вкладка «Колесо» ══ */
const LOGO = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';
const DEFAULT_PRESETS = [
  { id: 'watch', title: 'Просмотровый', rules: '# Просмотровый аукцион\nКидайте видео/ролики без запрещёнки Twitch.', start_min: 15, mode: 'normal', no_refund: false, reroll_on: false, reroll_price: 500, reroll_sec: 60, reroll_x2: false },
  { id: 'all',   title: 'Аук на всё',   rules: '# Аукцион на всё\nЛюбые лоты в рамках правил Twitch.', start_min: 60, mode: 'normal', no_refund: false, reroll_on: false, reroll_price: 1000, reroll_sec: 60, reroll_x2: true },
  { id: 'movie', title: 'Аук на фильм', rules: '# Аукцион на фильм\nЗагадывайте фильмы, аниме или сериалы.', start_min: 30, mode: 'normal', no_refund: false, reroll_on: true, reroll_price: 1000, reroll_sec: 60, reroll_x2: true },
  { id: 'game',  title: 'Игровой аук',  rules: '# Игровой аукцион\nИгры на прохождение или челлендж.', start_min: 30, mode: 'normal', no_refund: false, reroll_on: false, reroll_price: 1000, reroll_sec: 60, reroll_x2: false },
];
function getPresets() {
  const saved = A()?.config?.wheel?.presets;
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_PRESETS;
}
function activePreset() {
  const list = getPresets();
  const aid = A()?.config?.wheel?.active_preset;
  return list.find(p => p.id === aid) || list.find(p => p.title === A()?.auction?.title) || list[0];
}
async function applyPreset(p) {
  if (!p) return;
  WH.rerollCount = 0;
  if (p.start_min > 0) { S.startMin = Math.max(1, Math.min(600, Math.round(p.start_min))); ls.set('auc_startmin', S.startMin); }
  const wheelPatch = {
    active_preset: p.id,
    mode: p.mode === 'elim' ? 'elim' : 'normal',
    reroll_on: !!p.reroll_on,
    reroll_price: Math.max(0, Number(p.reroll_price) || 0),
    reroll_sec: Math.max(5, Math.min(3600, Math.round(Number(p.reroll_sec) || 60))),
    reroll_x2: !!p.reroll_x2,
  };
  Object.assign(WH.local, wheelPatch);
  await batch(async () => {
    await admDo({ a: 'control', op: 'title', title: p.title });
    await admDo({ a: 'config', config: { rules: p.rules ?? '', no_refund: !!p.no_refund, wheel: wheelPatch } });
  });
  for (const k of Object.keys(wheelPatch)) delete WH.local[k];
  toast(`Пресет «${p.title}» применён`);
}
function openPresetEditor(p, isNew = false) {
  const c = wcfg(), cfg = A()?.config || {};
  const cur = isNew
    ? { id: 'p_' + Date.now().toString(36), title: '', rules: cfg.rules || '', start_min: S.startMin || 30, mode: c.mode || 'normal', no_refund: !!cfg.no_refund, reroll_on: !!c.reroll_on, reroll_price: c.reroll_price ?? 1000, reroll_sec: c.reroll_sec ?? 60, reroll_x2: !!c.reroll_x2 }
    : { ...p };
  const list = getPresets();
  const delBtn = !isNew && list.length > 1 ? `<button type="button" class="btn bad" data-act="presetDel" data-id="${esc(cur.id)}">Удалить</button>` : '';
  sheet(isNew ? 'Новый пресет' : `Пресет «${cur.title}»`, `
    <label class="field"><span>Название пресета</span><input class="in" name="title" maxlength="80" required placeholder="Например: Аук на фильм" value="${esc(cur.title)}"></label>
    <div class="rates">
      <label>Таймер (мин)<input class="in" name="start_min" type="number" min="1" max="600" inputmode="numeric" value="${esc(cur.start_min || 30)}"></label>
      <label>Режим колеса<select class="in" name="mode"><option value="normal" ${cur.mode !== 'elim' ? 'selected' : ''}>Обычный</option><option value="elim" ${cur.mode === 'elim' ? 'selected' : ''}>Выбывание</option></select></label>
    </div>
    <label class="check"><input type="checkbox" name="no_refund" ${cur.no_refund ? 'checked' : ''}><span>Без возврата баллов проигравшим</span></label>
    <label class="check"><input type="checkbox" name="reroll_on" ${cur.reroll_on ? 'checked' : ''}><span>Показывать «Реролл — сумма + таймер» над лотом</span></label>
    <div class="rates">
      <label>Сумма реролла (₽)<input class="in" name="reroll_price" type="number" min="0" step="any" inputmode="decimal" value="${esc(cur.reroll_price ?? 1000)}"></label>
      <label>Таймер реролла (сек)<input class="in" name="reroll_sec" type="number" min="5" max="3600" inputmode="numeric" value="${esc(cur.reroll_sec ?? 60)}"></label>
    </div>
    <label class="check"><input type="checkbox" name="reroll_x2" ${cur.reroll_x2 ? 'checked' : ''}><span>Умножать сумму ×2 при реролле</span></label>
    <label class="field" style="margin-top:8px"><span>Правила для этого пресета</span><textarea class="in" name="rules" maxlength="5000" rows="6" placeholder="# Заголовок, **жирный**">${esc(cur.rules || '')}</textarea></label>
    <div class="sheet-acts">${delBtn}<button class="btn ghost" value="cancel" formnovalidate>Отмена</button><button class="btn pri" value="ok">Сохранить</button></div>`,
    async f => {
      const title = String(f.get('title') || '').trim().slice(0, 80);
      if (!title) throw new Error('Укажи название пресета');
      const next = {
        id: cur.id, title,
        rules: String(f.get('rules') || ''),
        start_min: Math.max(1, Math.min(600, Math.round(Number(f.get('start_min')) || 30))),
        mode: f.get('mode') === 'elim' ? 'elim' : 'normal',
        no_refund: f.get('no_refund') === 'on',
        reroll_on: f.get('reroll_on') === 'on',
        reroll_price: Math.max(0, Number(f.get('reroll_price')) || 0),
        reroll_sec: Math.max(5, Math.min(3600, Math.round(Number(f.get('reroll_sec')) || 60))),
        reroll_x2: f.get('reroll_x2') === 'on',
      };
      const curList = getPresets().map(x => ({ ...x }));
      const idx = curList.findIndex(x => x.id === next.id);
      if (idx >= 0) curList[idx] = next; else curList.push(next);
      await admDo({ a: 'config', config: { wheel: { presets: curList } } });
      await applyPreset(next);
    });
}

const WDEF = { mode: 'normal', palette: 'rainbow', labels: 'radial', hide_sum: false, full_text: false, image: '', accel: false, sound: 'ticks', volume: 0.5, reroll_on: false, reroll_price: 1000, reroll_sec: 60, reroll_x2: false };
const PAL_NAMES = { rainbow: 'Радуга', ocean: 'Океан', sunset: 'Закат', forest: 'Лес', noir: 'Нуар', cyber: 'Кибер', pastel: 'Пастель', berry: 'Ягода', gold: 'Золото', ice: 'Лёд', pointauc: 'PointAuc' };
const THEMES = [
  ['violet',   'Фиолетовый', '#a78bfa'],
  ['pointauc', 'PointAuc',   '#228be6'],
  ['ice',      'Лёд / Зима', '#6cc4ff'],
  ['emerald',  'Изумруд',    '#34d399'],
  ['sakura',   'Сакура',     '#f472b6'],
  ['sunset',   'Закат',      '#fb923c'],
  ['cyber',    'Киберпанк',  '#22d3ee'],
  ['gold',     'Золото',     '#fbbf24'],
];
const curTheme = () => ls.get('auc_theme') || 'violet';
function applyTheme(t) {
  if (!t || t === 'violet') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  ls.set('auc_theme', t || 'violet');
}
WH.local = {}; WH.out = new Set(); WH.lastSeg = null; WH.lastTick = 0; WH.msg = ''; WH.rerollCount = 0; WH.rerollAuc = null;
WH.wl = { num: ls.get('auc_wl_num') !== '0', pct: ls.get('auc_wl_pct') !== '0', sum: ls.get('auc_wl_sum') === '1' };
const wcfg = () => ({ ...WDEF, ...(A()?.config?.wheel || {}), ...WH.local });
function syncCenterImg() {
  const src = wcfg().image || LOGO;
  const ci = $('#wCenterImg'); if (ci && ci.dataset.src !== src) { ci.dataset.src = src; ci.src = src; }
  const pr = $('#wImgPrev'); if (pr && pr.dataset.src !== src) { pr.dataset.src = src; pr.src = src; }
}
/* ── 7TV эмодзи канала meowh0cki для центра колеса ── */
const STV = { all: null, loading: false, q: '' };
function stvUrl(e) {
  const h = e.host || e.data?.host;
  if (h?.url) {
    const base = h.url.startsWith('//') ? 'https:' + h.url : h.url;
    const files = (h.files || []).filter(f => f.format === 'WEBP' || /\.webp$/i.test(f.name));
    const pick = files.find(f => /^3x\./i.test(f.name)) || files.find(f => /^4x\./i.test(f.name)) || files.find(f => /^2x\./i.test(f.name)) || files[0];
    if (pick) return `${base}/${pick.name}`;
  }
  return `https://cdn.7tv.app/emote/${e.id}/3x.webp`;
}
function render7tv() {
  const g = $('#w7tvGrid'); if (!g) return;
  if (STV.loading) { g.innerHTML = '<div class="w7tv-msg">Загрузка 7TV…</div>'; return; }
  const ql = STV.q.toLowerCase();
  const list = (STV.all || []).filter(e => !ql || e.name.toLowerCase().includes(ql));
  if (!list.length) { g.innerHTML = '<div class="w7tv-msg">Ничего не нашлось</div>'; return; }
  const cur = wcfg().image || '';
  g.innerHTML = list.map(e => `<button type="button" class="w7tv-btn${cur === e.url ? ' on' : ''}" data-act="set7tv" data-url="${esc(e.url)}" title="${esc(e.name)}"><img src="${esc(e.url)}" alt="${esc(e.name)}" loading="lazy"></button>`).join('');
}
async function load7tv(q = '') {
  STV.q = q.trim();
  if (STV.all) return render7tv();
  STV.loading = true; render7tv();
  try {
    let emotes = null;
    for (const url of ['https://7tv.io/v3/users/twitch/926384072', 'https://7tv.io/v3/users/01HTCNBS6R0004PQK0CR95YHP0']) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const d = await r.json();
        emotes = d.emote_set?.emotes;
        const setId = d.emote_set?.id || (d.connections || []).map(c => c.emote_set_id).find(Boolean);
        if ((!emotes || !emotes.length) && setId) {
          const r2 = await fetch(`https://7tv.io/v3/emote-sets/${setId}`);
          if (r2.ok) emotes = (await r2.json()).emotes;
        }
        if (emotes && emotes.length) break;
      } catch {}
    }
    STV.all = (emotes || []).map(e => ({ id: e.id, name: e.name, url: stvUrl(e) }));
  } catch { STV.all = []; }
  STV.loading = false; render7tv();
}
// лоты на колесе: в «Выбывании» сектор обратно пропорционален баллам и выбывшие убраны
function wheelLots() {
  const c = wcfg();
  const lots = (A()?.lots || []).filter(l => +l.total > 0 && !(c.mode === 'elim' && WH.out.has(l.id)));
  return c.mode === 'elim' ? lots.map(l => ({ id: l.id, num: l.num, name: l.name, total: +l.total, w: 1 / +l.total })) : lots.map(l => ({ id: l.id, num: l.num, name: l.name, total: +l.total }));
}
const drawOpts = hi => { const c = wcfg(); syncCenterImg(); return { hi, labels: c.labels, hideSum: c.hide_sum, fullText: c.full_text, htmlImg: true, accel: c.accel }; };
function drawStatic() {
  if (S.tab !== 'wheel' || WH.spinning) return;
  const S2 = W_.segs(wheelLots(), wcfg().palette);
  W_.draw($('#wheelCv'), S2, WH.rot, drawOpts(WH.result?.id));
  if (!WH.result && !WH.msg) { const s = W_.at(S2, WH.rot); setTop(s ? s.name : ' ', false); }
}
function setTop(text, win) { const t = $('#wTop'); if (t.textContent !== text) t.textContent = text; t.classList.toggle('win', !!win); }

function renderWheelTab() {
  const c = wcfg(); const d = A(); if (!d) return;
  const segs = W_.segs(wheelLots(), c.palette); const wsum = segs.reduce((x, s) => x + s.weight, 0) || 1;
  const chance = new Map(segs.map(s => [s.id, s.weight / wsum * 100]));
  // список лотов слева
  const lots = d.lots.filter(l => +l.total > 0).slice().sort((x, y) => (chance.get(y.id) ?? -1) - (chance.get(x.id) ?? -1) || y.total - x.total);
  $('#wlN').textContent = lots.length;
  document.querySelectorAll('[data-wl]').forEach(b => b.classList.toggle('on', WH.wl[b.dataset.wl]));
  keyed($('#wlItems'), lots, l => l.id,
    () => { const el = document.createElement('div'); el.className = 'wli'; el.innerHTML = '<i></i><span class="no"></span><span class="nm"></span><span class="pc"></span>'; return el; },
    (el, l) => {
      const col = W_.colorOf(l.num, c.palette);
      $('i', el).style.background = col;
      const no = $('.no', el); no.hidden = !WH.wl.num; no.textContent = '#' + l.num; no.style.color = col;
      $('.nm', el).textContent = l.name;
      const out = c.mode === 'elim' && WH.out.has(l.id);
      el.classList.toggle('out', out); el.classList.toggle('hot', !out && WH.result?.id === l.id);
      $('.pc', el).innerHTML = (WH.wl.pct ? (out ? '—' : (chance.get(l.id) ?? 0).toFixed(1) + '%') : '') + (WH.wl.sum ? `<small>${fmt(l.total)}</small>` : '');
    }, '<div class="empty" style="min-height:120px;padding:20px">Нет лотов с баллами</div>');
  const outBox = $('#wlOut');
  outBox.hidden = !(c.mode === 'elim' && WH.out.size);
  if (!outBox.hidden) outBox.innerHTML = `<span>Выбыло: ${WH.out.size}</span>${S.isAdmin ? '<button class="btn sm" data-act="elimReset">Вернуть всех на колесо</button>' : ''}`;
  // настройки справа
  if (S.isAdmin) {
    document.querySelectorAll('[data-wv]').forEach(b => { const [k, v] = b.dataset.wv.split(':'); b.classList.toggle('on', c[k] === v); });
    const pals = $('#wPals');
    if (!pals.children.length) pals.innerHTML = Object.keys(W_.PALETTES).map(p => `<button class="pal" data-pal="${p}"><i style="background:linear-gradient(90deg,${W_.PALETTES[p].slice(0, 5).join(',')})"></i>${PAL_NAMES[p]}</button>`).join('');
    pals.querySelectorAll('.pal').forEach(b => b.classList.toggle('on', b.dataset.pal === c.palette));
    document.querySelectorAll('[data-wb]').forEach(i => { i.checked = !!c[i.dataset.wb]; });
    if (document.activeElement !== $('#wSound')) $('#wSound').value = c.sound;
    if (document.activeElement !== $('#wVol')) $('#wVol').value = c.volume;
    if (document.activeElement !== $('#wRrPrice')) $('#wRrPrice').value = c.reroll_price ?? 1000;
    if (document.activeElement !== $('#wRrSec')) $('#wRrSec').value = c.reroll_sec ?? 60;
    syncCenterImg();
    if (!STV.all && !STV.loading) load7tv(''); else render7tv();
    $('#autoSpin').checked = WH.auto;
    if (document.activeElement !== $('#spinSec')) $('#spinSec').value = WH.sec ?? d.config?.wheel_sec ?? 20;
    $('#spinBtn').disabled = WH.spinning;
    const res = $('#wRes');
    const can = WH.result && !WH.spinning && d.auction.status !== 'closed';
    const h = can ? `<button class="btn ok" data-act="finishWin">Завершить: победил «${esc(WH.result.name)}»</button>` : '';
    if (res.dataset.h !== h) { res.innerHTML = h; res.dataset.h = h; }
  }
  if (WH.result && !WH.spinning) setTop(`Победитель: ${WH.result.name}`, true);
  else if (WH.msg && !WH.spinning) setTop(WH.msg, false);
  drawStatic();
}
window.addEventListener('resize', drawStatic);

async function doSpin() {
  if (WH.spinning) return;
  const c = wcfg();
  const lots = wheelLots();
  if (!lots.length) return toast('На лотах нет баллов', true);
  if (c.mode === 'elim' && lots.length === 1) { WH.result = { ...lots[0] }; WH.msg = ''; toast(`Победитель: ${lots[0].name}`); return renderWheelTab(); }
  const segs = W_.segs(lots, c.palette);
  const sec = Math.min(120, Math.max(3, Number($('#spinSec')?.value) || A().config?.wheel_sec || 20));
  WH.sec = sec;
  const win = W_.pick(segs);
  const from = WH.rot % (Math.PI * 2);
  const to = W_.target(win, from, Math.max(5, Math.round(sec / 1.3)));
  try {
    const ev = await aucApi('/auc/admin/do', { a: 'spin', lots, winner: win.id, from, to, ms: sec * 1000, mode: c.mode });
    setTimeout(() => { if (WH.lastSpin !== ev.id) onSpin(ev); }, 1200);
  } catch (e) { toast(e.message, true); }
}
let winFxStop = null, winRrT = null;
function stopWinRr() { if (winRrT) { clearInterval(winRrT); winRrT = null; } }
function burstConfetti(accentHex) {
  winFxStop?.();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#winFx'); if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = [accentHex || '#a78bfa', '#fde047', '#38bdf8', '#f472b6', '#4ade80', '#ffffff'];
  const ps = Array.from({ length: 78 }, (_, i) => {
    const left = i % 2 === 0;
    const ang = left ? (-0.95 + Math.random() * 0.7) : (-2.19 - Math.random() * 0.7);
    const spd = 7 + Math.random() * 11;
    return {
      x: left ? W * 0.14 : W * 0.86, y: H * 0.62,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 3,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
      r: Math.random() * 6.28, vr: (Math.random() - .5) * .25,
      col: cols[i % cols.length], life: 1,
    };
  });
  let dead = false;
  const step = () => {
    if (dead) return;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.24; p.vx *= 0.99; p.r += p.vr;
      if (p.y > H * 0.72) p.life -= 0.022;
      if (p.life <= 0 || p.y > H + 30) continue;
      alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
  winFxStop = () => { dead = true; ctx.clearRect(0, 0, W, H); };
}
function hideWinner() {
  winFxStop?.(); winFxStop = null;
  stopWinRr();
  const ov = $('#winOver'); if (ov) ov.hidden = true;
}
function showWinner(lot) {
  if (!lot) return;
  const ov = $('#winOver'), card = $('#winCard'); if (!ov || !card) return;
  stopWinRr();
  const d = A(), c = wcfg();
  if (d?.auction?.id !== WH.rerollAuc) { WH.rerollAuc = d?.auction?.id ?? null; WH.rerollCount = 0; }
  const sum = +lot.total || 0;
  const totalAll = (d?.lots || []).reduce((s, l) => s + (+l.total || 0), 0) || 1;
  const pct = Math.min(100, (sum / totalAll) * 100);
  const pctStr = pct.toFixed(1);
  const bids = S.isAdmin ? (S.adm?.bids || []) : (d?.recent || []);
  const donCount = bids.filter(b => b.lot_id === lot.id && ['active', 'won'].includes(b.status)).length;
  const segCol = lot.color || W_.colorOf(lot.num, c.palette);
  const rrOn = !!c.reroll_on;
  const rrMult = c.reroll_x2 ? Math.pow(2, WH.rerollCount) : 1;
  const rrPrice = Math.max(0, Number(c.reroll_price) || 0) * rrMult;
  const rrSec = Math.max(5, Math.min(3600, Math.round(Number(c.reroll_sec) || 60)));
  card.style.setProperty('--win-glow', segCol);
  card.innerHTML = `<div class="win-badge"><svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg></div>
    <div class="win-sub">Победитель розыгрыша</div>
    ${rrOn ? `<div class="win-reroll"><span>Реролл — <b>${fmt(rrPrice)}р</b></span><span class="wr-tm" id="winRerollTm">${mmss(rrSec)}</span>${c.reroll_x2 && WH.rerollCount > 0 ? `<span class="wr-x">×${rrMult}</span>` : ''}</div>` : ''}
    <div class="win-title-wrap">
      ${lot.num ? `<span class="win-lotno">Лот #${lot.num}</span>` : ''}
      <div class="win-title-row">
        <h2 class="win-title">${esc(lot.name)}</h2>
        <button type="button" class="win-copy" data-act="copy" data-id="${esc(lot.name)}" title="Скопировать название" aria-label="Скопировать название"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      </div>
    </div>
    <div class="win-stats">
      <div class="win-stat hi"><span>Сумма</span><b>${fmt(sum)} <small>б.</small></b></div>
      <div class="win-stat hi"><span>Доля</span><b>${pctStr}%</b></div>
      <div class="win-stat"><span>Донатов</span><b>${donCount}</b></div>
    </div>
    <div class="win-share">
      <div class="win-share-h"><span>Доля в аукционе</span><b>${pctStr}%</b></div>
      <div class="win-bar"><i style="width:0%" data-w="${pct.toFixed(2)}%"></i></div>
    </div>
    ${S.isAdmin ? `<div class="win-acts">
      <button type="button" class="btn win-pri" data-act="winFinish">✓ Подтвердить и завершить аукцион</button>
      <div class="win-acts-row">
        <button type="button" class="btn win-out" data-act="winOk">Подтвердить</button>
        <button type="button" class="btn win-sec" data-act="winReroll">↻ Реролл</button>
      </div>
    </div>` : `<div class="win-acts"><button type="button" class="btn win-sec" data-act="winOk">Закрыть</button></div>`}`;
  ov.hidden = false;
  burstConfetti(segCol);
  if (rrOn) {
    const endAt = Date.now() + rrSec * 1000;
    winRrT = setInterval(() => {
      const tm = $('#winRerollTm'); if (!tm) return stopWinRr();
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      tm.textContent = mmss(left);
      tm.className = 'wr-tm' + (left === 0 ? ' done' : left <= 10 ? ' low' : '');
      if (left <= 0) stopWinRr();
    }, 200);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { const bar = $('.win-bar i', ov); if (bar) bar.style.width = bar.dataset.w; }));
}
function onSpin(ev) {
  if (WH.lastSpin === ev.id) return;
  hideWinner();
  WH.lastSpin = ev.id; WH.spinning = true; WH.result = null; WH.msg = '';
  if (S.tab !== 'wheel') setTab('wheel'); else renderWheelTab();
  const cv = $('#wheelCv'); const ptr = $('#wPtr');
  const segs = W_.segs(ev.lots, wcfg().palette);
  WH.stop?.();
  WH.stop = W_.spin(cv, segs, ev.from, ev.to, ev.ms, ev.startAt - S.off, drawOpts(),
    s => {
      if (!s || s.id === WH.lastSeg) return;
      WH.lastSeg = s.id; setTop(s.name, false);
      const now = performance.now();
      if (now - WH.lastTick > 35) {
        WH.lastTick = now;
        const c = wcfg(); if (c.sound === 'ticks') W_.tick(+c.volume);
        ptr.classList.add('kick'); requestAnimationFrame(() => requestAnimationFrame(() => ptr.classList.remove('kick')));
      }
    },
    rot => {
      WH.rot = rot; WH.spinning = false;
      const landed = segs.find(s => s.id === ev.winner) || W_.at(segs, rot);
      if (ev.mode === 'elim' && landed) {
        WH.out.add(landed.id);
        const rest = (A()?.lots || []).filter(l => +l.total > 0 && !WH.out.has(l.id));
        if (rest.length === 1) { WH.result = { ...rest[0] }; renderWheelTab(); showWinner(WH.result); return; }
        else { WH.msg = `Выбыл: ${landed.name}`; toast(`Выбыл: ${landed.name} · осталось ${rest.length}`); }
      } else if (landed) { WH.result = landed; renderWheelTab(); showWinner(WH.result); return; }
      renderWheelTab();
    });
}

/* настройки колеса: применяются сразу, на сервер уходят пачкой */
let wSaveT = null, wPatch = {};
function setW(patch) {
  Object.assign(WH.local, patch); Object.assign(wPatch, patch);
  if ('mode' in patch) { WH.out.clear(); WH.result = null; WH.msg = ''; }
  renderWheelTab();
  clearTimeout(wSaveT);
  wSaveT = setTimeout(async () => {
    const p = wPatch; wPatch = {};
    try { await aucApi('/auc/admin/do', { a: 'config', config: { wheel: p } }); await loadAdmin(); for (const k of Object.keys(p)) if (WH.local[k] === p[k]) delete WH.local[k]; }
    catch (e) { toast(e.message, true); }
  }, 350);
}
async function uploadImage(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('Картинка больше 5 МБ', true);
  const t = await getToken();
  const r = await fetch(API + '/upload', { method: 'POST', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name).slice(0, 100), ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: file });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) return toast(d.error || 'Не удалось загрузить', true);
  setW({ image: d.url }); toast('Картинка обновлена');
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
  const siteOn = c.site_enabled !== false;
  const sNick = d.streamer?.name || '';
  const donate = sNick ? `${location.origin}/donate/?u=${encodeURIComponent(sNick)}` : `${location.origin}/donate/`;
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
    <div class="int"><div class="int-h"><span class="dot ${siteOn ? 'ok' : ''}"></span><b>renah0cki coin</b><span class="muted">${esc(sNick)}</span></div><p>${siteOn ? 'Подключён · зрители донатят coin по личной ссылке и могут выбрать лот.' : 'Отключён · приём донатов coin по личной ссылке остановлен.'}</p>
      <div class="row"><code class="code">${esc(donate)}</code><button class="btn sm" data-act="copy" data-id="${esc(donate)}">Копировать</button><a class="btn sm ghost" href="${esc(donate)}">Открыть</a><button class="btn sm ${siteOn ? 'ghost' : 'pri'}" data-act="siteToggle" data-id="${siteOn ? '0' : '1'}">${siteOn ? 'Отключить' : 'Подключить'}</button></div></div>
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
    <h2 class="h2" style="margin-top:16px">Реролл победителя</h2>
    <label class="check"><input type="checkbox" name="reroll_on" ${wcfg().reroll_on ? 'checked' : ''}><span>Показывать «Реролл — сумма + таймер» над выпавшим лотом</span></label>
    <div class="rates">
      <label>Сумма реролла (₽)<input class="in" name="reroll_price" type="number" min="0" step="any" inputmode="decimal" value="${esc(wcfg().reroll_price ?? 1000)}"></label>
      <label>Таймер реролла (сек)<input class="in" name="reroll_sec" type="number" min="5" max="3600" inputmode="numeric" value="${esc(wcfg().reroll_sec ?? 60)}"></label>
    </div>
    <label class="check"><input type="checkbox" name="reroll_x2" ${wcfg().reroll_x2 ? 'checked' : ''}><span>Умножать сумму ×2 при каждом нажатии «Реролл»</span></label>
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
  if (document.documentElement.dataset.theme === 'pointauc' && innerWidth >= 1100 && r.right < 90) {
    const top = Math.min(Math.max(8, r.top), innerHeight - p.offsetHeight - 8);
    p.style.top = top + 'px'; p.style.left = Math.min(r.right + 10, innerWidth - p.offsetWidth - 8) + 'px';
    return;
  }
  const top = r.bottom + 6 + p.offsetHeight > innerHeight ? Math.max(8, r.top - 6 - p.offsetHeight) : r.bottom + 6;
  p.style.top = top + 'px'; p.style.left = Math.min(Math.max(8, r.left), innerWidth - p.offsetWidth - 8) + 'px';
}
const closePop = () => { $('#pop').hidden = true; };

/* мгновенные действия: экран меняется сразу, сервер подтверждает следом */
const isoAt = ms => new Date(ms).toISOString();
function applyLocal(b) {
  const d = S.adm; if (!d) return null;
  const a = d.auction, now = Date.now() + S.off;
  const lot = id => d.lots.find(l => l.id === id);
  const onLot = (id, p) => { const l = lot(id); if (l) { l.total = +l.total + p; l.bids = (+l.bids || 0) + (p > 0 ? 1 : -1); } };
  const newLot = (name, pts = 0) => {
    name = String(name || '').trim().slice(0, 80);
    if (!name) return null;
    const ex = d.lots.find(l => l.name.toLowerCase() === name.toLowerCase()); if (ex) return ex.id;
    const id = 'tmp' + (++S.tmp);
    d.lots.push({ id, num: d.lots.reduce((m, l) => Math.max(m, l.num), 0) + 1, name, total: pts, bids: pts ? 1 : 0 });
    return id;
  };
  let key = null;
  switch (b.a) {
    case 'control': {
      const s = Number(b.sec) || 0;
      if (b.op === 'start' && a.status === 'idle') Object.assign(a, { status: 'running', ends_at: isoAt(now + s * 1000), started_at: isoAt(now), left_ms: null });
      else if (b.op === 'start' && a.status === 'paused') Object.assign(a, { status: 'running', ends_at: isoAt(now + Math.max(1000, a.left_ms || 0)), left_ms: null });
      else if (b.op === 'pause' && a.status === 'running') Object.assign(a, { status: 'paused', left_ms: Math.max(0, Date.parse(a.ends_at) - now), ends_at: null });
      else if (b.op === 'add' && a.status === 'running') a.ends_at = isoAt(Math.max(now + 1000, Date.parse(a.ends_at) + s * 1000));
      else if (b.op === 'add' && a.status === 'paused') a.left_ms = Math.max(1000, (a.left_ms || 0) + s * 1000);
      else if (b.op === 'stop') Object.assign(a, { status: 'ended', ends_at: null, left_ms: null, ended_at: isoAt(now) });
      else if (b.op === 'reopen') Object.assign(a, { status: 'paused', left_ms: Math.max(10, s) * 1000, ended_at: null });
      else if (b.op === 'title' && b.title) a.title = String(b.title).trim().slice(0, 80);
      break;
    }
    case 'accept': a.accepting = !!b.on; break;
    case 'config': {
      const { wheel, alert, ...rest } = b.config || {};
      Object.assign(d.config, rest);
      if (wheel) d.config.wheel = { ...(d.config.wheel || {}), ...wheel };
      if (alert) d.config.alert = { ...(d.config.alert || {}), ...alert };
      break;
    }
    case 'lot':
      if (b.op === 'add') { const id = newLot(b.name, +b._pts || 0); if (id && String(id).startsWith('tmp')) { key = id; d.total = +d.total + (+b._pts || 0); } }
      else if (b.op === 'rename') { const l = lot(b.id); if (l && b.name) l.name = String(b.name).trim().slice(0, 80); }
      else if (b.op === 'delete') {
        const l = lot(b.id); if (!l) break;
        d.lots = d.lots.filter(x => x !== l);
        (d.bids || []).forEach(x => { if (x.lot_id === l.id && x.status === 'active') { x.lot_id = null; x.status = 'queue'; d.queue_count++; } });
      }
      break;
    case 'manual': if (!b._noLocal && b.lot) { onLot(b.lot, Number(b.points) || 0); d.total = +d.total + (Number(b.points) || 0); } break;
    case 'assign': {
      const x = (d.bids || []).find(y => y.id === b.bid); if (!x || !['active', 'queue'].includes(x.status)) break;
      const to = b.name ? newLot(b.name) : b.lot; if (to == null || !lot(to)) break;
      if (x.status === 'active' && x.lot_id) onLot(x.lot_id, -x.points);
      if (x.status === 'queue') d.queue_count = Math.max(0, d.queue_count - 1);
      x.status = 'active'; x.lot_id = to; onLot(to, +x.points);
      break;
    }
    case 'refund': case 'mark': {
      const x = (d.bids || []).find(y => y.id === b.bid); if (!x || !['active', 'queue', 'failed'].includes(x.status)) break;
      if (x.status === 'active' && x.lot_id) onLot(x.lot_id, -x.points);
      if (x.status !== 'failed') d.total = +d.total - x.points;
      if (x.status === 'queue') d.queue_count = Math.max(0, d.queue_count - 1);
      x.status = b.a === 'mark' && b.result === 'kept' ? 'kept' : 'refunded';
      break;
    }
    case 'wallet':
      if (b.op === 'spend') { const w = (d.wallets || []).find(x => x.name === b.name); if (w) w.balance -= +b.points; if (b.lot) { onLot(b.lot, +b.points); d.total = +d.total + +b.points; } }
      break;
    default: return null;
  }
  d.lots.sort((x, y) => y.total - x.total || x.num - y.num);
  S.ver++; render();
  return key;
}
// временный лот получил настоящий номер — переносим ключ, чтобы строка не «перерождалась»
function rekey(tmp, id) {
  document.querySelectorAll(`[data-k="${tmp}"]`).forEach(el => { el.dataset.k = String(id); if (el.dataset.lot) el.dataset.lot = id; el._adm = null; });
}
function applyState(d) { S.adm = d; S.isAdmin = true; S.off = Date.parse(d.now) - Date.now(); render(); }
async function admDo(body, okMsg) {
  const key = applyLocal(body);
  S.busy++;
  try {
    const r = await aucApi('/auc/admin/do', body);
    if (key && r.id) rekey(key, r.id);
    if (okMsg) toast(okMsg);
    if (--S.busy === 0) { if (r.state) applyState(r.state); else loadAdmin(); }
    return r;
  } catch (e) {
    if (--S.busy === 0) { S.ver++; loadAdmin(); }   // откат к тому, что на сервере
    throw e;
  }
}
// несколько действий подряд: экран не дёргается промежуточными ответами
async function batch(fn) { S.busy++; try { return await fn(); } finally { if (--S.busy === 0) loadAdmin(); } }
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
      if (r.new_auction) { WH.result = null; WH.out.clear(); WH.msg = ''; }
      toast(r.new_auction
        ? `Завершено (победа ${r.won}, возвращено ${r.refunded}${r.kept ? `, оставлено ${r.kept}` : ''}) — начат новый аукцион`
        : `Готово: победа ${r.won}, возвращено ${r.refunded}${r.kept ? `, оставлено ${r.kept}` : ''}${r.failed ? `, ошибок ${r.failed} — см. «Все ставки»` : ''}`, !!r.failed);
    });
}
const setTab = t => {
  const was = S.tab; S.tab = t; closePop(); render();
  if (was !== t) { const el = t === 'wheel' ? $('#wapp') : $('#view'); el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); }
};

/* ── клики ── */
document.addEventListener('click', async e => {
  if (!e.target.closest('#pop') && !e.target.closest('[data-act=aucList],[data-act=view],[data-act=theme]')) closePop();
  const tab = e.target.closest('#tabs [data-tab]'); if (tab) return setTab(tab.dataset.tab);
  const q = e.target.closest('.seg2 button'); if (q) { S.q = q.dataset.q; return renderRight(); }
  const wv = e.target.closest('[data-wv]'); if (wv) { const [k, v] = wv.dataset.wv.split(':'); return setW({ [k]: v }); }
  const pl = e.target.closest('[data-pal]'); if (pl) return setW({ palette: pl.dataset.pal });
  const wl = e.target.closest('[data-wl]'); if (wl) { const k = wl.dataset.wl; WH.wl[k] = !WH.wl[k]; ls.set('auc_wl_' + k, WH.wl[k] ? '1' : '0'); return renderWheelTab(); }
  const pa = e.target.closest('[data-pa]'); if (pa) {
    const k = pa.dataset.pa;
    if (k === 'connect') return setTab('settings');
    if (k === 'int') { document.body.classList.toggle('pa-int-open'); return; }
    if (k === 'pillDon') { S.flt.don = !S.flt.don; return renderRight(); }
    if (k === 'pillPts') { S.flt.pts = !S.flt.pts; return renderRight(); }
    S.view[k] = !S.view[k]; ls.set('auc_' + k, S.view[k] ? '1' : '0'); return render();
  }
  const fl = e.target.closest('.flt'); if (fl) { S.flt[fl.dataset.flt] = !S.flt[fl.dataset.flt]; return renderRight(); }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, nid = Number(id);
  const a = A()?.auction;
  try {
    switch (act) {
      case 'play':
        if (a.status === 'closed') {
          WH.result = null;
          await batch(async () => {
            await admDo({ a: 'new', title: activePreset()?.title || a.title || 'Аукцион' });
            await admDo({ a: 'control', op: 'start', sec: S.startMin * 60 });
          });
          return toast('Новый аукцион запущен');
        }
        if (a.status === 'idle') return admDo({ a: 'control', op: 'start', sec: S.startMin * 60 }, 'Аукцион начался');
        if (a.status === 'running') return admDo({ a: 'control', op: 'pause' });
        if (a.status === 'paused') return admDo({ a: 'control', op: 'start' });
        if (a.status === 'ended') return admDo({ a: 'control', op: 'reopen', sec: 60 }, 'Ставки снова открыты (на паузе)');
        return;
      case 'minus': case 'plus': case 'plus2': {
        const dlt = act === 'plus2' ? 2 : act === 'plus' ? 1 : -1;
        if (a.status === 'closed') {
          WH.result = null;
          S.startMin = Math.max(1, Math.min(600, S.startMin + dlt)); ls.set('auc_startmin', S.startMin);
          await admDo({ a: 'new', title: activePreset()?.title || a.title || 'Аукцион' }, 'Открыт новый аукцион');
          return tickClock();
        }
        if (a.status === 'idle') { S.startMin = Math.max(1, Math.min(600, S.startMin + dlt)); ls.set('auc_startmin', S.startMin); return tickClock(); }
        if (a.status === 'ended') return admDo({ a: 'control', op: 'reopen', sec: Math.max(60, 60 * dlt) }, 'Ставки снова открыты');
        if (['running', 'paused'].includes(a.status)) return admDo({ a: 'control', op: 'add', sec: 60 * dlt });
        return;
      }
      case 'reset':
        if (a.status === 'closed') { WH.result = null; return admDo({ a: 'new', title: activePreset()?.title || a.title || 'Аукцион' }, 'Открыт новый аукцион'); }
        if (['running', 'paused'].includes(a.status)) return admDo({ a: 'control', op: 'set', sec: S.startMin * 60 }, 'Таймер сброшен');
        if (a.status === 'ended') return admDo({ a: 'control', op: 'reopen', sec: S.startMin * 60 }, 'Таймер сброшен');
        if (a.status === 'idle') { S.startMin = 60; ls.set('auc_startmin', 60); return tickClock(); }
        return;
      case 'acceptOn': return admDo({ a: 'accept', on: true }, 'Приём донатов включён');
      case 'finish': if (a.status === 'closed') return sheet('Новый аукцион', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="Аукцион"></label>${acts('Создать')}`,
          f => { WH.result = null; return admDo({ a: 'new', title: f.get('t') }, 'Создан новый аукцион'); });
        return finishSheet();
      case 'finishWin': return finishSheet(WH.result?.id);
      case 'winOk': hideWinner(); WH.rerollCount = 0; return;
      case 'winReroll': hideWinner(); WH.rerollCount++; WH.result = null; WH.out.clear(); WH.msg = ''; return doSpin();
      case 'winFinish': {
        const w = WH.result; hideWinner(); WH.rerollCount = 0;
        if (!w) return finishSheet();
        const r = await admDo({ a: 'finish', winner: w.id, refund: !S.adm?.config?.no_refund });
        if (r.new_auction) { WH.result = null; WH.out.clear(); WH.msg = ''; setTab('lots'); }
        toast(r.new_auction
          ? `Победил «${w.name}» — начат новый аукцион`
          : `Готово: победа ${r.won}, возвращено ${r.refunded}${r.failed ? `, ошибок ${r.failed}` : ''}`, !!r.failed);
        return;
      }
      case 'spin': return doSpin();
      case 'dice': { const v = 15 + Math.floor(Math.random() * 46); $('#spinSec').value = v; WH.sec = v; return; }
      case 'elimReset': WH.out.clear(); WH.result = null; WH.msg = ''; return renderWheelTab();
      case 'imgReset': return setW({ image: '' });
      case 'set7tv': return setW({ image: el.dataset.url || '' });
      case 'theme': {
        const cur = curTheme();
        return pop(el, THEMES.map(([k, n, c]) => `<button class="${cur === k ? 'on' : ''}" data-act="setTheme" data-id="${k}"><i class="theme-dot" style="background:${c}"></i>${n}${cur === k ? '<small>✓</small>' : ''}</button>`).join(''));
      }
      case 'setTheme': applyTheme(id); closePop(); return;
      case 'soundTest': { const c = wcfg(); [0, 90, 170, 240, 300].forEach(t => setTimeout(() => W_.tick(+c.volume), t)); return; }
      case 'retry': { const r = await admDo({ a: 'retry' }); return toast(`Повторено: ${r.retried}, успешно: ${r.ok}`); }
      case 'archive': S.histAuction = 'all'; $('#view').dataset.tab = ''; return setTab('history');
      case 'aucList': {
        const list = getPresets();
        const cur = activePreset();
        const rows = list.map(p => `<button class="${cur?.id === p.id ? 'on' : ''}" data-act="presetPick" data-id="${esc(p.id)}">${esc(p.title)}<small>${cur?.id === p.id ? '✓' : (p.start_min ? p.start_min + 'м' : '')}</small></button>`).join('');
        const extra = S.isAdmin ? `<div class="pop-sep"></div><button data-act="presetEdit">✎ Редактировать пресет</button><button class="pop-add" data-act="presetNew">+ Новый пресет</button>` : '';
        return pop(el, rows + extra);
      }
      case 'presetPick': {
        closePop();
        if (!S.isAdmin) return;
        const p = getPresets().find(x => x.id === id);
        if (p) return applyPreset(p);
        return;
      }
      case 'presetEdit': closePop(); return openPresetEditor(activePreset(), false);
      case 'presetNew': closePop(); return openPresetEditor(null, true);
      case 'presetDel': {
        const curList = getPresets().filter(x => x.id !== id);
        if (!curList.length) return;
        closeSheet();
        await admDo({ a: 'config', config: { wheel: { presets: curList } } });
        await applyPreset(curList[0]);
        return;
      }
      case 'openAuc': closePop(); if (nid === A().auction.id) return setTab('lots'); S.histAuction = nid; $('#view').dataset.tab = ''; return setTab('history');
      case 'view': return pop(el, `<label><input type="checkbox" data-view="pct" ${S.view.pct ? 'checked' : ''}>Проценты</label><label><input type="checkbox" data-view="bars" ${S.view.bars ? 'checked' : ''}>Полоски</label><label><input type="checkbox" data-view="hide" ${S.view.hide ? 'checked' : ''}>Скрыть суммы</label>`);
      case 'eye': S.view.hide = !S.view.hide; ls.set('auc_hide', S.view.hide ? '1' : '0'); return render();
      case 'title': return sheet('Название аукциона', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="${esc(a.title)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'control', op: 'title', title: f.get('t') }));
      case 'rules': return sheet('Правила', `<p class="hint"><b># Заголовок</b>, <b>## Подзаголовок</b>, <b>**жирный**</b>. Пустое поле — правил нет.</p>
        <label class="field"><span>Текст</span><textarea class="in" name="r" maxlength="5000" rows="12">${esc(A().config?.rules || '')}</textarea></label>${acts('Сохранить')}`,
        async f => {
          const rules = String(f.get('r') || '');
          const cur = activePreset();
          const list = getPresets().map(x => x.id === cur?.id ? { ...x, rules } : x);
          return admDo({ a: 'config', config: { rules, wheel: { presets: list } } }, 'Правила сохранены');
        });
      case 'lotRename': { const l = lotsMap().get(nid); return sheet(`Лот #${l.num}`, `<label class="field"><span>Название</span><input class="in" name="n" maxlength="80" value="${esc(l.name)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'lot', op: 'rename', id: nid, name: f.get('n') })); }
      case 'lotDel': { const l = lotsMap().get(nid); return admDo({ a: 'lot', op: 'delete', id: nid }, `Лот «${l?.name || ''}» удалён`); }
      case 'lotPlus': {
        const ex = el.closest('.lrow')?.querySelector('.pa-extra');
        const v = Number(ex?.value);
        if (ex && v) { ex.value = ''; return admDo({ a: 'manual', lot: nid, user: 'Стример', points: v }, 'Баллы добавлены'); }
        return sheet('Добавить баллы', `<input type="hidden" name="lot" value="${nid}"><p class="hint">Лот ${esc(lotLabel(nid))}</p>
          <label class="field"><span>Ник</span><input class="in" name="u" maxlength="60" required autocomplete="off" value="Стример"></label>
          <label class="field"><span>Баллы</span><input class="in" name="p" type="number" step="any" min="0.01" inputmode="decimal" required></label>${acts('Добавить')}`,
          f => admDo({ a: 'manual', lot: f.get('lot') ? Number(f.get('lot')) : null, user: f.get('u'), points: Number(f.get('p')) }, 'Баллы добавлены'));
      }
      case 'manual': return sheet('Добавить баллы', `${lotPick(null, false)}
        <label class="field"><span>Ник</span><input class="in" name="u" maxlength="60" required autocomplete="off" value="Стример"></label>
        <label class="field"><span>Баллы</span><input class="in" name="p" type="number" step="any" min="0.01" inputmode="decimal" required></label>${acts('Добавить')}`,
        f => admDo({ a: 'manual', lot: f.get('lot') ? Number(f.get('lot')) : null, user: f.get('u'), points: Number(f.get('p')) }, 'Баллы добавлены'));
      case 'assign': return sheet('Перенести ставку', `${lotPick(null)}<label class="field" id="newLotF" hidden><span>Название нового лота</span><input class="in" name="n" maxlength="80"></label>${acts('Перенести')}`,
        f => { const l = f.get('lot'); if (!l) throw new Error('Выбери лот'); return admDo({ a: 'assign', bid: nid, lot: l === 'new' ? null : Number(l), name: l === 'new' ? f.get('n') : null }, 'Перенесено'); });
      case 'assignSim': {
        const lotId = Number(el.dataset.lot);
        return admDo({ a: 'assign', bid: nid, lot: lotId }, `Вкинуто в ${lotLabel(lotId)}`);
      }
      case 'assignNew': {
        const b = S.adm.bids.find(x => x.id === nid);
        const msg = String(b?.message || b?.meta?.message || '').trim().slice(0, 80);
        if (msg) return admDo({ a: 'assign', bid: nid, lot: null, name: msg }, `Новый лот «${msg}»`);
        return sheet('Новый лот из ставки', `<label class="field"><span>Название лота</span><input class="in" name="n" maxlength="80" required placeholder="Название нового лота"></label>${acts('Создать')}`,
          f => { const n = String(f.get('n') || '').trim(); if (!n) throw new Error('Укажи название'); return admDo({ a: 'assign', bid: nid, lot: null, name: n }, `Новый лот «${n}»`); });
      }
      case 'dismiss': {
        const b = S.adm.bids.find(x => x.id === nid);
        if (!b) return;
        return admDo({ a: 'mark', bid: nid, result: 'kept' }, 'Удалено из ожидающих');
      }
      case 'refund': {
        const r = await admDo({ a: 'refund', bid: nid });
        toast(r.status === 'failed' ? 'Не получилось вернуть — см. ошибку' : 'Возвращено', r.status === 'failed');
        return;
      }
      case 'markDone': return admDo({ a: 'mark', bid: nid, result: 'refunded' }, 'Отмечено');
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
      case 'disc': return admDo({ a: 'disconnect', service: id }, 'Отключено');
      case 'siteToggle': { const on = id === '1'; return admDo({ a: 'config', config: { site_enabled: on } }, on ? 'Донаты renah0cki coin подключены' : 'Донаты renah0cki coin отключены'); }
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
    if (t.dataset.wb) return setW({ [t.dataset.wb]: t.checked });
    if (t.id === 'wSound') return setW({ sound: t.value });
    if (t.id === 'wRrPrice') { WH.rerollCount = 0; return setW({ reroll_price: Math.max(0, Number(t.value) || 0) }); }
    if (t.id === 'wRrSec') return setW({ reroll_sec: Math.max(5, Math.min(3600, Math.round(Number(t.value) || 60))) });
    if (t.id === 'wImgFile') { await uploadImage(t.files[0]); t.value = ''; return; }
    if (t.id === 'spinSec') { WH.sec = Number(t.value) || 20; return; }
  } catch (err) { toast(err.message, true); render(); }
});
let hqT, stvT;
document.addEventListener('input', e => {
  if (e.target.id === 'hq') { clearTimeout(hqT); hqT = setTimeout(() => loadHistory(), 300); }
  if (e.target.id === 'w7tvSearch') { STV.q = e.target.value.trim(); render7tv(); }
  if (e.target.id === 'lotSearch') { S.search = e.target.value; renderLots($('#view')); }
  if (e.target.id === 'wVol') setW({ volume: Number(e.target.value) });
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
      f.name.value = ''; f.sum.value = ''; f.name.focus();
      await batch(async () => {
        if (A()?.auction?.status === 'closed') { WH.result = null; await admDo({ a: 'new', title: activePreset()?.title || A()?.auction?.title || 'Аукцион' }); }
        const r = await admDo({ a: 'lot', op: 'add', name: n, _pts: pts });
        if (pts > 0 && r.id) await admDo({ a: 'manual', lot: r.id, user: 'Стример', points: pts, _noLocal: true });
      });
    } else if (f.dataset.form === 'settings') {
      const rates = { ...S.adm.config.rates };
      for (const [k, v] of fd) if (k.startsWith('rate_') && v !== '') rates[k.slice(5)] = Number(v);
      const wheel = {
        reroll_on: fd.get('reroll_on') === 'on',
        reroll_price: Math.max(0, Number(fd.get('reroll_price')) || 0),
        reroll_sec: Math.max(5, Math.min(3600, Math.round(Number(fd.get('reroll_sec')) || 60))),
        reroll_x2: fd.get('reroll_x2') === 'on',
      };
      WH.rerollCount = 0;
      await admDo({ a: 'config', config: { rates, add_sec: +fd.get('add_sec'), add_below_sec: +fd.get('add_below_sec'), min_site_bid: +fd.get('min_site_bid'),
        wheel_sec: +fd.get('wheel_sec'), twitch_costs: String(fd.get('twitch_costs')).split(/[,\s]+/).filter(Boolean), wheel } }, 'Сохранено');
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

$('#winOver').addEventListener('click', e => { if (e.target === $('#winOver')) hideWinner(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches?.('.pa-extra')) {
    e.preventDefault();
    const v = Number(e.target.value), lid = Number(e.target.dataset.extra);
    if (v && lid) { e.target.value = ''; admDo({ a: 'manual', lot: lid, user: 'Стример', points: v }, 'Баллы добавлены').catch(err => toast(err.message, true)); }
    return;
  }
  if (e.key === 'Escape' && !$('#winOver').hidden) { hideWinner(); return; }
  if (e.code !== 'Space' || S.tab !== 'wheel' || !S.isAdmin || $('#sheet').open || !$('#winOver').hidden) return;
  if (e.target.closest('input, textarea, select, button, [contenteditable]')) return;
  e.preventDefault(); doSpin();
});

/* ── старт ── */
connect();
if (S.uid) loadAdmin();
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } }).catch(() => {});
})();
