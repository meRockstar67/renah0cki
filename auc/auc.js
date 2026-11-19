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
  const wheel = S.tab === 'wheel';
  document.body.classList.toggle('tab-wheel', wheel); $('#wapp').hidden = !wheel;
  renderView(); if (!wheel) renderRight(); tickClock();
  if (S.isAdmin && WH.auto && S.prevStatus === 'running' && a.status === 'ended' && !WH.spinning) { setTab('wheel'); setTimeout(doSpin, 700); }
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
const LOT_ACTS = id => `<button class="ib" data-act="lotPlus" data-id="${id}" title="Добавить баллы" aria-label="Добавить баллы">+</button><button class="ib" data-act="lotRename" data-id="${id}" title="Переименовать" aria-label="Переименовать"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button class="ib" data-act="lotDel" data-id="${id}" title="Удалить" aria-label="Удалить">✕</button>`;
function renderLots(v) {
  if (v.dataset.tab !== 'lots') {
    v.dataset.tab = 'lots'; v.className = 'lots-view';
    v.innerHTML = `<div class="thead"><span class="c">N</span><span class="c hash">#</span><span>Название</span><input id="lotSearch" type="search" placeholder="Поиск…" aria-label="Поиск лота" value="${esc(S.search)}"><span class="r">Сумма</span></div>
      <div class="tbody" id="lotRows"></div>
      <form class="addbar" data-form="lotAdd">
        <input class="in" name="name" maxlength="80" placeholder="Название лота…" aria-label="Название лота" autocomplete="off">
        <input class="in sum-in" name="sum" type="number" step="any" min="0" inputmode="decimal" placeholder="Сумма" aria-label="Сумма">
        <select class="in" name="unit" aria-label="Единица"><option value="pts">б.</option><option value="RUB">₽</option></select>
        <button class="add-btn">+ Лот</button>
      </form>`;
  }
  const f = $('.addbar', v); if (f) f.hidden = !(S.isAdmin && A().auction.status !== 'closed');
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
function donHtml(b, opts) {
  const msg = b.message || b.meta?.message || '';
  const unit = b.orig_amount != null && !['manual', 'wallet'].includes(b.source) ? `${fmt(b.orig_amount)} ${esc(b.orig_unit || '')}` : '';
  return `<span class="who">${esc(b.user_name)}</span><span class="amt">+${fmt(b.points)}${unit ? `<small>${unit}</small>` : ''}</span>
    ${msg ? `<span class="msg">${esc(msg)}</span>` : ''}
    <span class="meta"><span class="src ${b.source}">${SRC[b.source]}</span>${b.status !== 'queue' ? `<span class="st ${b.status}">${ST[b.status]}</span>${b.lot_id ? ' ' + esc(lotLabel(b.lot_id)) : ''}` : ''}<span>${time(b.created_at)}</span>${b.refund_to ? `<span>→ ${esc(b.refund_to)}</span>` : ''}</span>
    ${S.isAdmin && b.status === 'queue' ? `<span class="acts"><select data-assign="${b.id}" aria-label="Поставить на лот"><option value="">На лот…</option>${opts}${msg ? `<option value="new">+ Новый лот «${esc(msg.slice(0, 30))}»</option>` : ''}</select><button class="ib" data-act="refund" data-id="${b.id}" title="Вернуть" aria-label="Вернуть">↩</button></span>` : ''}
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
      el.className = 'don' + (Date.parse(b.created_at) > fresh ? ' fresh' : '') + (el.classList.contains('enter') ? ' enter' : '');
      if (S.isAdmin && b.status === 'queue') { el.draggable = true; el.dataset.bid = b.id; } else { el.draggable = false; delete el.dataset.bid; }
      const h = donHtml(b, opts);
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
  }
}

/* ══ вкладка «Колесо» ══ */
const LOGO = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';
const WDEF = { mode: 'normal', palette: 'rainbow', labels: 'radial', hide_sum: false, full_text: false, image: '', accel: false, sound: 'ticks', volume: 0.5 };
const PAL_NAMES = { rainbow: 'Радуга', ocean: 'Океан', sunset: 'Закат', forest: 'Лес', noir: 'Нуар' };
WH.local = {}; WH.out = new Set(); WH.lastSeg = null; WH.lastTick = 0; WH.msg = '';
WH.wl = { num: ls.get('auc_wl_num') !== '0', pct: ls.get('auc_wl_pct') !== '0', sum: ls.get('auc_wl_sum') === '1' };
const wcfg = () => ({ ...WDEF, ...(A()?.config?.wheel || {}), ...WH.local });
let wImg = null, wImgSrc = null;
function wheelImg() {
  const src = wcfg().image || LOGO;
  if (src !== wImgSrc) { wImgSrc = src; wImg = new Image(); wImg.crossOrigin = 'anonymous'; wImg.onload = () => drawStatic(); wImg.src = src; }
  return wImg;
}
// лоты на колесе: в «Выбывании» сектор обратно пропорционален баллам и выбывшие убраны
function wheelLots() {
  const c = wcfg();
  const lots = (A()?.lots || []).filter(l => +l.total > 0 && !(c.mode === 'elim' && WH.out.has(l.id)));
  return c.mode === 'elim' ? lots.map(l => ({ id: l.id, num: l.num, name: l.name, total: +l.total, w: 1 / +l.total })) : lots.map(l => ({ id: l.id, num: l.num, name: l.name, total: +l.total }));
}
const drawOpts = hi => { const c = wcfg(); return { hi, labels: c.labels, hideSum: c.hide_sum, fullText: c.full_text, img: wheelImg(), accel: c.accel }; };
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
    $('#wImgPrev').src = c.image || LOGO;
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
function onSpin(ev) {
  if (WH.lastSpin === ev.id) return;
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
        if (rest.length === 1) { WH.result = { ...rest[0] }; toast(`Победитель: ${rest[0].name}`); }
        else { WH.msg = `Выбыл: ${landed.name}`; toast(`Выбыл: ${landed.name} · осталось ${rest.length}`); }
      } else if (landed) { WH.result = landed; toast(`Колесо выбрало: ${landed.name}`); }
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
const setTab = t => {
  const was = S.tab; S.tab = t; closePop(); render();
  if (was !== t) { const el = t === 'wheel' ? $('#wapp') : $('#view'); el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); }
};

/* ── клики ── */
document.addEventListener('click', async e => {
  if (!e.target.closest('#pop') && !e.target.closest('[data-act=aucList],[data-act=view]')) closePop();
  const tab = e.target.closest('#tabs [data-tab]'); if (tab) return setTab(tab.dataset.tab);
  const q = e.target.closest('.seg2 button'); if (q) { S.q = q.dataset.q; return renderRight(); }
  const wv = e.target.closest('[data-wv]'); if (wv) { const [k, v] = wv.dataset.wv.split(':'); return setW({ [k]: v }); }
  const pl = e.target.closest('[data-pal]'); if (pl) return setW({ palette: pl.dataset.pal });
  const wl = e.target.closest('[data-wl]'); if (wl) { const k = wl.dataset.wl; WH.wl[k] = !WH.wl[k]; ls.set('auc_wl_' + k, WH.wl[k] ? '1' : '0'); return renderWheelTab(); }
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
      case 'dice': { const v = 15 + Math.floor(Math.random() * 46); $('#spinSec').value = v; WH.sec = v; return; }
      case 'elimReset': WH.out.clear(); WH.result = null; WH.msg = ''; return renderWheelTab();
      case 'imgReset': return setW({ image: '' });
      case 'soundTest': { const c = wcfg(); [0, 90, 170, 240, 300].forEach(t => setTimeout(() => W_.tick(+c.volume), t)); return; }
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
      case 'lotDel': { const l = lotsMap().get(nid); return admDo({ a: 'lot', op: 'delete', id: nid }, `Лот «${l?.name || ''}» удалён`); }
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
    if (t.dataset.wb) return setW({ [t.dataset.wb]: t.checked });
    if (t.id === 'wSound') return setW({ sound: t.value });
    if (t.id === 'wImgFile') { await uploadImage(t.files[0]); t.value = ''; return; }
    if (t.id === 'spinSec') { WH.sec = Number(t.value) || 20; return; }
  } catch (err) { toast(err.message, true); render(); }
});
let hqT;
document.addEventListener('input', e => {
  if (e.target.id === 'hq') { clearTimeout(hqT); hqT = setTimeout(() => loadHistory(), 300); }
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

document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || S.tab !== 'wheel' || !S.isAdmin || $('#sheet').open) return;
  if (e.target.closest('input, textarea, select, button, [contenteditable]')) return;
  e.preventDefault(); doSpin();
});

/* ── старт ── */
connect();
if (S.uid) loadAdmin();
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); } }).catch(() => {});
})();
