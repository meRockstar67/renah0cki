/* renah0cki — аукцион за баллы. Зрители: лоты, ставка coin. Стример: таймер, лоты, очередь, возвраты, кошельки, история, подключения. */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const API = (LOCAL && QS.get('api')) || 'https://cdn.renah0cki.xyz';      // сервер аукциона (server.mjs)
const SB = (LOCAL && QS.get('sb')) || SB_URL;
const LS_SESSION = 'fh_session';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
const SRC = { da: 'DonationAlerts', donatepay: 'DonatePay', donatex: 'DonateX', twitch: 'Twitch', site: 'coin', wallet: 'кошелёк', manual: 'вручную' };
const ST = { active: 'на лоте', queue: 'в очереди', won: 'победа', refunded: 'возвращено', kept: 'оставлено', failed: 'ошибка возврата' };
const AST = { idle: 'не начат', running: 'идёт', paused: 'пауза', ended: 'ставки закрыты', closed: 'завершён' };
const time = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dtime = t => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

let toastT;
function toast(msg, err = false) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

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
async function sbApi(path, { method = 'GET', body } = {}) {
  const t = await getToken();
  const r = await fetch(`${SB}/rest/v1/${path}`, { method, headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.message || 'HTTP ' + r.status);
  return d;
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
  pub: null, adm: null, isAdmin: false, tab: 'lots', off: 0,
  uid: readSession()?.user?.id || null,
  hist: { q: '', scope: 'cur', items: [], end: false },
};
const A = () => S.adm || S.pub;                              // самые свежие данные
const lotsMap = () => new Map((A()?.lots || []).map(l => [l.id, l]));
const lotLabel = id => { const l = lotsMap().get(id); return l ? `#${l.num} ${l.name}` : 'очередь'; };
const open = () => ['running', 'paused'].includes(A()?.auction?.status);

/* ── живые обновления ── */
let es, admT;
function connect() {
  es = new EventSource(API + '/auc/events');
  es.onopen = () => $('#live').classList.add('on');
  es.onerror = () => $('#live').classList.remove('on');
  es.onmessage = ev => {
    let d; try { d = JSON.parse(ev.data); } catch { return; }
    if (!d) return;
    S.pub = d; S.off = Date.parse(d.now) - Date.now();
    if (S.isAdmin) { clearTimeout(admT); admT = setTimeout(loadAdmin, 250); }
    render();
    if (S.uid) loadMine();
  };
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
let mineT = 0;
async function loadMine() {
  if (Date.now() - mineT < 1500) return; mineT = Date.now();
  try {
    const [bal, mine] = await Promise.all([
      sbApi('rpc/coin_balance', { method: 'POST', body: {} }),
      A()?.auction ? sbApi(`auc_bids?auction_id=eq.${A().auction.id}&select=id,points,orig_amount,lot_id,status,refund_to,message,created_at&order=id.desc&limit=30`) : [],
    ]);
    if (bal != null) { $('#bal').hidden = false; $('#balN').textContent = fmt(bal); S.balance = bal; }
    $('#myBox').hidden = !mine.length;
    $('#myBids').innerHTML = mine.map(b => `<li><span class="who">${esc(b.lot_id ? lotLabel(b.lot_id) : (b.message || 'новый лот'))}</span><span class="pts">${fmt(b.orig_amount)} coin</span>
      <span class="sub"><span class="st ${b.status}">${ST[b.status]}</span> ${b.refund_to ? '→ ' + esc(b.refund_to) : ''} · ${time(b.created_at)}</span></li>`).join('');
  } catch {}
}

/* ── отрисовка ── */
function render() {
  const d = A(); if (!d) return;
  const a = d.auction;
  $('#aTitle').textContent = a.title;
  const ch = $('#aStatus'); ch.textContent = AST[a.status] || a.status; ch.className = 'chip ' + a.status;
  $('#aTotal').textContent = `${fmt(d.total)} б. · лотов ${d.lots.length}`;
  $('#tabs').hidden = !S.isAdmin;
  const qb = $('#qBadge'); qb.hidden = !d.queue_count; qb.textContent = d.queue_count;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  renderCtl(); renderView(); renderBidBox(); renderFeed(); tickTimer();
  $('#fab').hidden = !(S.uid && open()) || S.tab !== 'lots';
}

function tickTimer() {
  const a = A()?.auction; const el = $('#timer'); if (!a) return;
  let ms = null;
  if (a.status === 'running' && a.ends_at) ms = Date.parse(a.ends_at) - (Date.now() + S.off);
  else if (a.status === 'paused') ms = a.left_ms;
  if (ms == null) { el.textContent = a.status === 'idle' ? '--:--' : '00:00'; el.className = 'timer idle'; return; }
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  el.textContent = (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0');
  el.className = 'timer' + (a.status === 'running' && s <= 30 ? ' low' : '');
}
setInterval(tickTimer, 250);

function renderCtl() {
  const el = $('#ctl'); el.hidden = !S.isAdmin; if (!S.isAdmin) return;
  const st = A().auction.status;
  const b = (act, label, cls = '') => `<button class="btn ${cls}" data-act="${act}">${label}</button>`;
  let h = '';
  if (st === 'idle') h = `<label class="min-in"><span class="muted">мин</span><input id="minIn" type="number" inputmode="numeric" min="1" value="10" aria-label="Минут на таймере"></label>${b('start', 'Старт', 'pri')}${b('title', 'Название')}`;
  else if (st === 'running') h = b('pause', 'Пауза') + b('add60', '+1 мин') + b('add-60', '−1 мин') + b('add10', '+10 с') + b('stop', 'Закрыть ставки', 'bad') + b('finish', 'Завершить', 'ok');
  else if (st === 'paused') h = b('resume', 'Продолжить', 'pri') + b('add60', '+1 мин') + b('add-60', '−1 мин') + b('stop', 'Закрыть ставки', 'bad') + b('finish', 'Завершить', 'ok');
  else if (st === 'ended') h = b('finish', 'Выбрать победителя и вернуть баллы', 'ok grow') + b('reopen', 'Открыть ставки снова') + b('retry', 'Повторить возвраты') + b('close', 'Закрыть');
  else if (st === 'closed') h = b('new', 'Новый аукцион', 'pri');
  el.innerHTML = h;
}

function renderView() {
  const v = $('#view');
  if (!S.isAdmin || S.tab === 'lots') return v.innerHTML = lotsHtml();
  if (S.tab === 'queue') return v.innerHTML = queueHtml();
  if (S.tab === 'bids') return v.innerHTML = bidsHtml();
  if (S.tab === 'wallets') return v.innerHTML = walletsHtml();
  if (S.tab === 'history') { if (!v.querySelector('#histList')) v.innerHTML = historyShell(); return paintHistory(); }
  if (S.tab === 'settings') { if (!v.querySelector('#setForm') || !v.contains(document.activeElement)) v.innerHTML = settingsHtml(); }
}

function lotsHtml() {
  const d = A(); const lots = d.lots; const max = Math.max(1, ...lots.map(l => +l.total)); const sum = lots.reduce((s, l) => s + +l.total, 0) || 1;
  const win = d.auction.winner_lot;
  const add = S.isAdmin && d.auction.status !== 'closed' ? `<form class="lot-add" data-form="lotAdd"><input class="in" name="name" maxlength="80" placeholder="Новый лот" aria-label="Название нового лота" autocomplete="off"><button class="btn pri">Добавить</button></form>` : '';
  if (!lots.length) return `<section class="card">${add}<p class="empty">Лотов пока нет${S.isAdmin ? '' : ' — предложи свой'}.</p></section>`;
  return `<section class="card">${add}<ol class="lots">${lots.map((l, i) => `
    <li class="lot ${S.isAdmin ? 'adm' : open() && S.uid ? 'click' : ''} ${win === l.id ? 'win' : ''}" ${!S.isAdmin && open() && S.uid ? `data-act="bidLot" data-id="${l.id}" tabindex="0" role="button"` : ''}>
      <span class="bar" style="width:${(+l.total / max * 100).toFixed(1)}%"></span>
      <span class="rank">${i + 1}</span>
      <span class="nm"><b>${esc(l.name)}</b><small>#${l.num} · ставок ${l.bids}</small></span>
      <span class="tot">${fmt(l.total)}<small>${(+l.total / sum * 100).toFixed(1)}%</small></span>
      ${S.isAdmin ? `<span class="lot-acts"><button class="btn sm" data-act="lotPlus" data-id="${l.id}" title="Добавить баллы вручную">+ баллы</button><button class="btn sm ghost" data-act="lotRename" data-id="${l.id}">Имя</button><button class="btn sm ghost" data-act="lotDel" data-id="${l.id}" aria-label="Удалить лот">✕</button></span>` : ''}
    </li>`).join('')}</ol></section>`;
}

const bidLine = b => `${fmt(b.points)} б.${b.orig_amount != null && b.source !== 'manual' ? ` <span class="muted">(${fmt(b.orig_amount)} ${esc(b.orig_unit || '')})</span>` : ''}`;
function bidItem(b, acts = true) {
  const can = ['active', 'queue', 'failed'].includes(b.status);
  return `<li class="item">
    <span class="main"><b>${esc(b.user_name)}</b> <span class="src ${b.source}">${SRC[b.source]}</span> <span class="st ${b.status}">${ST[b.status]}</span></span>
    <span class="side">${bidLine(b)}</span>
    <span class="meta">${time(b.created_at)} · ${esc(b.lot_id ? lotLabel(b.lot_id) : 'без лота')}${b.message ? ` · «${esc(b.message)}»` : ''}${b.refund_to ? ` · → ${esc(b.refund_to)}` : ''}${b.note ? ` · ${esc(b.note)}` : ''}</span>
    ${acts && can ? `<span class="acts">
      ${b.status !== 'failed' ? `<button class="btn sm" data-act="assign" data-id="${b.id}">${b.status === 'queue' ? 'На лот' : 'Перенести'}</button>` : ''}
      ${b.status === 'queue' && b.message ? `<button class="btn sm ok" data-act="assignNew" data-id="${b.id}">Создать лот «${esc(b.message.slice(0, 30))}»</button>` : ''}
      <button class="btn sm bad" data-act="refund" data-id="${b.id}">Вернуть</button>
      ${b.status === 'failed' ? `<button class="btn sm ghost" data-act="markDone" data-id="${b.id}">Уже вернул сам</button>` : ''}
    </span>` : ''}
  </li>`;
}
function queueHtml() {
  const q = (S.adm?.bids || []).filter(b => b.status === 'queue');
  return `<section class="card"><h2 class="h2">Очередь — лот не распознан</h2>
    <p class="hint">Зритель не указал лот или написал непонятно. Перенеси ставку на лот, создай лот из сообщения или верни баллы.</p>
    ${q.length ? `<ol class="items">${q.map(b => bidItem(b)).join('')}</ol>` : '<p class="empty">Очередь пустая</p>'}</section>`;
}
let bidFilter = 'all';
function bidsHtml() {
  const all = S.adm?.bids || [];
  const f = { all: () => true, live: b => ['active', 'queue'].includes(b.status), refunded: b => b.status === 'refunded', failed: b => b.status === 'failed', won: b => b.status === 'won' }[bidFilter];
  const list = all.filter(f);
  const sum = s => all.filter(b => b.status === s).reduce((x, b) => x + +b.points, 0);
  return `<section class="card"><h2 class="h2">Все ставки аукциона</h2>
    <div class="filters"><div class="seg" role="tablist">${[['all', 'Все'], ['live', 'Активные'], ['won', 'Победа'], ['refunded', 'Возвраты'], ['failed', 'Ошибки']].map(([k, t]) => `<button data-act="bidFilter" data-id="${k}" class="${bidFilter === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <button class="btn sm" data-act="manual">+ Ставка вручную</button></div>
    <div class="summary"><div><span>На лотах</span><b>${fmt(sum('active'))} б.</b></div><div><span>У победителя</span><b>${fmt(sum('won'))} б.</b></div><div><span>Возвращено</span><b>${fmt(sum('refunded'))} б.</b></div></div>
    ${list.length ? `<ol class="items">${list.map(b => bidItem(b)).join('')}</ol>` : '<p class="empty">Пусто</p>'}</section>`;
}
function walletsHtml() {
  const w = S.adm?.wallets || [];
  return `<section class="card"><h2 class="h2">Кошельки аукциона</h2>
    <p class="hint">Сюда возвращаются баллы с донатов (деньги не вернуть). Баллы можно поставить на лот в любом аукционе — по просьбе зрителя.</p>
    <div class="filters"><button class="btn sm" data-act="walletAdd">+ Начислить вручную</button></div>
    ${w.length ? `<ol class="items">${w.map(x => `<li class="item"><span class="main"><b>${esc(x.name)}</b></span><span class="side">${fmt(x.balance)} б.</span>
      <span class="acts"><button class="btn sm ok" data-act="walletSpend" data-id="${esc(x.name)}" ${open() ? '' : 'disabled title="Аукцион не идёт"'}>Поставить на лот</button><button class="btn sm ghost" data-act="walletAdj" data-id="${esc(x.name)}">Изменить</button></span></li>`).join('')}</ol>` : '<p class="empty">Пока пусто</p>'}</section>`;
}

/* история */
function historyShell() {
  const opts = (S.adm?.auctions || []).map(x => `<option value="${x.id}">${esc(x.title)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</option>`).join('');
  return `<section class="card"><h2 class="h2">История: что, откуда и куда</h2>
    <div class="filters"><input class="in" id="hq" type="search" placeholder="Поиск по нику или тексту" aria-label="Поиск по истории">
      <select class="in" id="hsc" aria-label="Какой аукцион"><option value="cur">Текущий аукцион</option><option value="all">Все аукционы</option>${opts}</select>
      <button class="btn sm" data-act="csv">Скачать CSV</button></div>
    <ol class="items hist" id="histList"></ol><button class="btn sm ghost" id="histMore" data-act="histMore" hidden>Показать ещё</button></section>`;
}
async function loadHistory(more = false) {
  const scope = $('#hsc')?.value || 'cur';
  const auction = scope === 'cur' ? A().auction.id : scope === 'all' ? null : Number(scope);
  const before = more ? S.hist.items.at(-1)?.id : null;
  try {
    const rows = await aucApi('/auc/admin/history', { q: $('#hq')?.value.trim() || '', auction, before, limit: 200 });
    S.hist.items = more ? S.hist.items.concat(rows) : rows; S.hist.end = rows.length < 200;
    paintHistory();
  } catch (e) { toast(e.message, true); }
}
function paintHistory() {
  const el = $('#histList'); if (!el) return;
  el.innerHTML = S.hist.items.length ? S.hist.items.map(h => `<li class="item"><span class="t">${dtime(h.ts)}</span>
    <span class="main"><span class="k k-${h.kind}">${{ bid: 'ставка', assign: 'перенос', refund: 'возврат', won: 'победа', kept: 'без возврата', wallet: 'кошелёк', lot: 'лот', auction: 'аукцион', error: 'ошибка', info: 'инфо' }[h.kind] || h.kind}</span> ${esc(h.text)}</span></li>`).join('')
    : '<p class="empty">Ничего не найдено</p>';
  $('#histMore').hidden = S.hist.end;
}
async function exportCsv() {
  const scope = $('#hsc')?.value || 'cur';
  const auction = scope === 'cur' ? A().auction.id : scope === 'all' ? null : Number(scope);
  const rows = await aucApi('/auc/admin/history', { q: $('#hq')?.value.trim() || '', auction, limit: 5000 });
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + ['время;тип;ник;источник;баллы;лот;куда;текст', ...rows.reverse().map(h =>
    [dtime(h.ts), h.kind, h.user_name, SRC[h.source] || h.source || '', h.points ?? '', h.lot_name, h.target, h.text].map(q).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `auc-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* настройки и подключения */
function settingsHtml() {
  const d = S.adm; const c = d.config; const I = d.integrations || {};
  const st = s => `<span class="dot ${s?.state || ''}"></span>`;
  const r = c.rates || {};
  const rate = (k, label) => `<label>${label}<input class="in" name="rate_${k}" type="number" step="any" min="0" inputmode="decimal" value="${esc(r[k] ?? '')}"></label>`;
  return `<section class="card"><h2 class="h2">Подключения</h2><div class="ints">
    <div class="int"><div class="int-h">${st(I.twitch)}<b>Twitch — баллы канала</b><span class="muted">${esc(I.twitch?.login || '')}</span></div>
      <p>${esc(I.twitch?.text || '')}${I.twitch?.rewards?.length ? ` · награды: ${I.twitch.rewards.join(', ')}` : ''}</p>
      <p>Зритель берёт награду «Аукцион · N» и пишет номер или название лота. Проигравшим баллы возвращаются автоматически (отмена награды).</p>
      <div class="row">${I.twitch?.login ? `<button class="btn sm" data-act="twRewards">Обновить награды</button><button class="btn sm ghost" data-act="disc" data-id="twitch">Отключить</button>` : ''}
        <button class="btn sm ${I.twitch?.login ? 'ghost' : 'pri'}" data-act="conn" data-id="twitch" ${I.twitch?.configured ? '' : 'disabled'}>${I.twitch?.login ? 'Переподключить' : 'Подключить Twitch'}</button></div></div>
    <div class="int"><div class="int-h">${st(I.da)}<b>DonationAlerts</b><span class="muted">${esc(I.da?.name || '')}</span></div><p>${esc(I.da?.text || '')}</p>
      <div class="row"><button class="btn sm ${I.da?.name ? 'ghost' : 'pri'}" data-act="conn" data-id="da" ${I.da?.configured ? '' : 'disabled'}>${I.da?.name ? 'Переподключить' : 'Подключить DonationAlerts'}</button>${I.da?.name ? '<button class="btn sm ghost" data-act="disc" data-id="da">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h">${st(I.donatepay)}<b>DonatePay</b></div><p>${esc(I.donatepay?.text || '')} · API-ключ: donatepay.ru → Настройки → API</p>
      <div class="row"><button class="btn sm ${I.donatepay?.connected ? 'ghost' : 'pri'}" data-act="tok" data-id="donatepay">${I.donatepay?.connected ? 'Сменить ключ' : 'Ввести ключ'}</button>${I.donatepay?.connected ? '<button class="btn sm ghost" data-act="disc" data-id="donatepay">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h">${st(I.donatex)}<b>DonateX</b></div><p>${esc(I.donatex?.text || '')} · токен: donatex.gg → Настройки → API и доступ</p>
      <div class="row"><button class="btn sm ${I.donatex?.connected ? 'ghost' : 'pri'}" data-act="tok" data-id="donatex">${I.donatex?.connected ? 'Сменить токен' : 'Ввести токен'}</button>${I.donatex?.connected ? '<button class="btn sm ghost" data-act="disc" data-id="donatex">Отключить</button>' : ''}</div></div>
    <div class="int"><div class="int-h"><span class="dot ok"></span><b>renah0cki coin</b></div><p>Зрители ставят coin прямо на этой странице. Проигравшим coin возвращаются на баланс сайта.</p></div>
  </div></section>
  <form class="card" id="setForm" data-form="settings"><h2 class="h2">Курсы и таймер</h2>
    <p class="hint">Сколько баллов аукциона даёт 1 единица. Донаты во время аукциона становятся ставками; донат с кодом RN-… — это пополнение coin, его аукцион не трогает.</p>
    <div class="rates">${rate('RUB', '1 ₽')}${rate('UAH', '1 ₴')}${rate('USD', '1 $')}${rate('EUR', '1 €')}${rate('KZT', '1 ₸')}${rate('BYN', '1 BYN')}${rate('twitch', '1 балл канала')}${rate('site', '1 coin')}</div>
    <div class="rates" style="margin-top:12px">
      <label>+сек к таймеру при ставке<input class="in" name="add_sec" type="number" min="0" max="600" inputmode="numeric" value="${c.add_sec}"></label>
      <label>…если осталось меньше (сек)<input class="in" name="add_below_sec" type="number" min="0" max="3600" inputmode="numeric" value="${c.add_below_sec}"></label>
      <label>Мин. ставка coin<input class="in" name="min_site_bid" type="number" min="1" inputmode="numeric" value="${c.min_site_bid}"></label>
      <label>Награды Twitch (цены)<input class="in" name="twitch_costs" value="${esc((c.twitch_costs || []).join(', '))}"></label>
    </div>
    <div class="sheet-acts"><button class="btn pri">Сохранить</button></div></form>
  <section class="card"><h2 class="h2">Оверлей для OBS</h2><p class="hint">Источник «Браузер», ширина 600, высота 800. Показывает таймер и топ лотов.</p>
    <div class="row"><code class="code">${esc(d.overlay)}</code><button class="btn sm" data-act="copy" data-id="${esc(d.overlay)}">Копировать</button></div></section>`;
}

/* боковая колонка */
function renderBidBox() {
  const el = $('#bidBox'); const a = A().auction;
  if (!S.uid) { el.innerHTML = `<h2 class="h2">Ставка coin</h2><p class="hint">Войди на сайт, чтобы ставить renah0cki coin.</p><a class="btn pri" href="/">Войти на renah0cki</a>`; return; }
  if (!open()) { el.innerHTML = `<h2 class="h2">Ставка coin</h2><p class="hint">${a.status === 'idle' ? 'Аукцион ещё не начался.' : 'Ставки закрыты.'}</p>`; return; }
  el.innerHTML = `<h2 class="h2">Ставка coin</h2><p class="hint">Выбери лот или предложи свой. Если лот не победит — coin вернутся на баланс.</p><button class="btn pri" data-act="bid" style="width:100%">Поставить coin</button>`;
}
function renderFeed() {
  const r = A().recent || [];
  $('#feed').innerHTML = r.length ? r.map(b => `<li><span class="who">${esc(b.user_name)} <span class="src ${b.source}">${SRC[b.source]}</span></span><span class="pts">+${fmt(b.points)}</span>
    <span class="sub">${esc(b.lot_id ? lotLabel(b.lot_id) : 'в очереди')} · ${time(b.created_at)}${b.status === 'refunded' ? ' · возвращено' : ''}</span></li>`).join('') : '<li class="sub muted">Ставок пока нет</li>';
}

/* ── нижний лист ── */
let sheetSubmit = null;
function sheet(title, html, onSubmit) {
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; sheetSubmit = onSubmit;
  const d = $('#sheet'); if (!d.open) d.showModal();
  setTimeout(() => d.querySelector('.sheet-body input:not([type=radio]):not([type=checkbox]), .sheet-body select')?.focus(), 50);
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
  ${withNew ? `<li><label><input type="radio" name="${name}" value="new" ${sel == null && !A().lots.length ? 'checked' : ''}><span class="grow">Новый лот…</span></label></li>` : ''}</ul>`;

async function admDo(body, okMsg) {
  const r = await aucApi('/auc/admin/do', body);
  if (okMsg) toast(okMsg);
  loadAdmin();
  return r;
}

function bidSheet(lotId = null) {
  sheet('Ставка coin', `${lotPick(lotId)}
    <label class="field" id="newLotF" ${lotId != null || A().lots.length ? 'hidden' : ''}><span>Название нового лота</span><input class="in" name="lot_name" maxlength="80" autocomplete="off"></label>
    <label class="field"><span>Сколько coin${S.balance != null ? ` (у тебя ${fmt(S.balance)})` : ''}</span><input class="in" name="amount" type="number" inputmode="numeric" min="${A().config?.min_site_bid || 1}" required></label>
    <div class="amounts">${[50, 100, 250, 500, 1000].map(n => `<button type="button" data-amt="${n}">${n}</button>`).join('')}</div>${acts('Поставить')}`,
    async f => {
      const lot = f.get('lot');
      if (!lot) throw new Error('Выбери лот');
      const r = await aucApi('/auc/bid', { lot_id: lot === 'new' ? null : Number(lot), lot_name: lot === 'new' ? f.get('lot_name') : null, amount: Number(f.get('amount')) });
      toast(r.status === 'queue' ? 'Ставка принята — стример добавит твой лот' : `Ставка принята: ${r.lot}`);
      mineT = 0; loadMine();
    });
}

function finishSheet() {
  const d = A(); const top = d.lots[0];
  const bids = S.adm?.bids || [];
  const live = bids.filter(b => ['active', 'queue', 'failed'].includes(b.status));
  const by = s => live.filter(b => b.source === s).length;
  sheet('Завершить аукцион', `<p class="hint">Победитель по умолчанию — лот с наибольшей суммой. Ставки на него остаются, остальным баллы возвращаются.</p>
    ${lotPick(top?.id ?? null, false, 'winner')}
    <label class="check"><input type="checkbox" name="refund" checked><span>Вернуть баллы всем, кроме победителя</span></label>
    <div class="summary">
      <div><span>coin → на баланс сайта</span><b>${by('site')}</b></div>
      <div><span>Twitch → баллы канала обратно</span><b>${by('twitch')}</b></div>
      <div><span>Донаты, вручную → кошелёк аукциона</span><b>${by('da') + by('donatepay') + by('donatex') + by('manual') + by('wallet')}</b></div>
    </div>${acts('Завершить', 'ok')}`,
    async f => {
      const r = await admDo({ a: 'finish', winner: f.get('winner') ? Number(f.get('winner')) : null, refund: f.get('refund') === 'on' });
      toast(`Готово: победа ${r.won}, возвращено ${r.refunded}${r.kept ? `, оставлено ${r.kept}` : ''}${r.failed ? `, ошибок ${r.failed} — см. «Ставки»` : ''}`, !!r.failed);
    });
}

/* ── клики ── */
document.addEventListener('click', async e => {
  const amt = e.target.closest('[data-amt]');
  if (amt) { const i = $('#sheetBody input[name=amount]'); if (i) i.value = amt.dataset.amt; return; }
  const tab = e.target.closest('#tabs button');
  if (tab) { S.tab = tab.dataset.tab; if (S.tab === 'history') { $('#view').innerHTML = ''; } render(); if (S.tab === 'history') loadHistory(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id, nid = Number(id);
  const minIn = () => Math.round(Number($('#minIn')?.value || 10) * 60);
  try {
    switch (act) {
      case 'bid': return bidSheet();
      case 'bidLot': return bidSheet(nid);
      case 'start': return admDo({ a: 'control', op: 'start', sec: minIn() }, 'Аукцион начался');
      case 'resume': return admDo({ a: 'control', op: 'start' });
      case 'pause': return admDo({ a: 'control', op: 'pause' });
      case 'add60': return admDo({ a: 'control', op: 'add', sec: 60 });
      case 'add-60': return admDo({ a: 'control', op: 'add', sec: -60 });
      case 'add10': return admDo({ a: 'control', op: 'add', sec: 10 });
      case 'stop': if (confirm('Закрыть приём ставок?')) return admDo({ a: 'control', op: 'stop' }); return;
      case 'reopen': return admDo({ a: 'control', op: 'reopen', sec: 60 }, 'Ставки снова открыты (на паузе, 1 мин)');
      case 'finish': return finishSheet();
      case 'retry': { const r = await admDo({ a: 'retry' }); return toast(`Повторено: ${r.retried}, успешно: ${r.ok}`); }
      case 'close': { const r = await admDo({ a: 'close' }); return toast(r.closed === 'closed' ? 'Аукцион закрыт' : 'Есть нерассчитанные ставки — завершите или верните их', r.closed !== 'closed'); }
      case 'new': return sheet('Новый аукцион', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="Аукцион"></label>${acts('Создать')}`,
        f => admDo({ a: 'new', title: f.get('t') }, 'Создан новый аукцион'));
      case 'title': return sheet('Название аукциона', `<label class="field"><span>Название</span><input class="in" name="t" maxlength="80" value="${esc(A().auction.title)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'control', op: 'title', title: f.get('t') }));
      case 'lotRename': { const l = lotsMap().get(nid); return sheet(`Лот #${l.num}`, `<label class="field"><span>Название</span><input class="in" name="n" maxlength="80" value="${esc(l.name)}"></label>${acts('Сохранить')}`,
        f => admDo({ a: 'lot', op: 'rename', id: nid, name: f.get('n') })); }
      case 'lotDel': { const l = lotsMap().get(nid); if (confirm(`Удалить лот «${l.name}»? Его ставки уйдут в очередь.`)) return admDo({ a: 'lot', op: 'delete', id: nid }, 'Лот удалён'); return; }
      case 'lotPlus': case 'manual': return sheet('Ставка вручную', `${act === 'manual' ? lotPick(null, false) : `<input type="hidden" name="lot" value="${nid}">`}
        <label class="field"><span>Ник</span><input class="in" name="u" maxlength="60" required autocomplete="off"></label>
        <label class="field"><span>Баллы</span><input class="in" name="p" type="number" step="any" min="0.01" inputmode="decimal" required></label>
        <label class="field"><span>Заметка (необязательно)</span><input class="in" name="n" maxlength="200"></label>${acts('Добавить')}`,
        f => admDo({ a: 'manual', lot: f.get('lot') ? Number(f.get('lot')) : null, user: f.get('u'), points: Number(f.get('p')), note: f.get('n') }, 'Баллы добавлены'));
      case 'assign': return sheet('Перенести ставку', `${lotPick(null)}<label class="field" id="newLotF" hidden><span>Название нового лота</span><input class="in" name="n" maxlength="80"></label>${acts('Перенести')}`,
        f => { const l = f.get('lot'); if (!l) throw new Error('Выбери лот'); return admDo({ a: 'assign', bid: nid, lot: l === 'new' ? null : Number(l), name: l === 'new' ? f.get('n') : null }, 'Перенесено'); });
      case 'assignNew': { const b = S.adm.bids.find(x => x.id === nid); return admDo({ a: 'assign', bid: nid, lot: null, name: b.message.slice(0, 80) }, 'Лот создан'); }
      case 'refund': {
        const b = S.adm.bids.find(x => x.id === nid);
        const where = b.source === 'site' ? 'coin вернутся на баланс сайта' : b.source === 'twitch' ? 'баллы вернутся на Twitch' : 'баллы уйдут в кошелёк аукциона';
        if (confirm(`Вернуть ставку ${b.user_name} (${fmt(b.points)} б.)? ${where}.`)) { const r = await admDo({ a: 'refund', bid: nid }); toast(r.status === 'failed' ? 'Не получилось вернуть — см. ошибку в ставке' : 'Возвращено', r.status === 'failed'); }
        return;
      }
      case 'markDone': if (confirm('Отметить как возвращённую (без автоматического возврата)?')) return admDo({ a: 'mark', bid: nid, result: 'refunded' }, 'Отмечено'); return;
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
      case 'tok': return sheet(id === 'donatepay' ? 'Ключ DonatePay' : 'Токен DonateX', `<p class="hint">Ключ хранится только на сервере и больше нигде не показывается.</p>
        <label class="field"><span>${id === 'donatepay' ? 'API-ключ' : 'Внешний токен'}</span><input class="in" name="t" type="password" autocomplete="off" required></label>${acts('Сохранить')}`,
        f => admDo({ a: 'token', service: id, token: f.get('t') }, 'Подключено'));
      case 'twRewards': { const r = await admDo({ a: 'twitch_rewards' }); return toast('Награды: ' + r.rewards.map(x => x.cost).join(', ')); }
      case 'copy': await navigator.clipboard.writeText(id).catch(() => {}); return toast('Скопировано');
    }
  } catch (err) { toast(err.message, true); }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.lot[role=button]')) { e.preventDefault(); e.target.click(); } });
$('#fab').addEventListener('click', () => bidSheet());

document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const fd = new FormData(f);
  try {
    if (f.dataset.form === 'lotAdd') {
      const n = String(fd.get('name') || '').trim(); if (!n) return;
      await admDo({ a: 'lot', op: 'add', name: n }); f.reset(); f.querySelector('input').focus();
    } else if (f.dataset.form === 'settings') {
      const rates = { ...S.adm.config.rates };
      for (const [k, v] of fd) if (k.startsWith('rate_') && v !== '') rates[k.slice(5)] = Number(v);
      await admDo({ a: 'config', config: { rates, add_sec: +fd.get('add_sec'), add_below_sec: +fd.get('add_below_sec'), min_site_bid: +fd.get('min_site_bid'),
        twitch_costs: String(fd.get('twitch_costs')).split(/[,\s]+/).filter(Boolean) } }, 'Сохранено');
    }
  } catch (err) { toast(err.message, true); }
});
let hqT;
document.addEventListener('input', e => { if (e.target.id === 'hq') { clearTimeout(hqT); hqT = setTimeout(() => loadHistory(), 300); } });
document.addEventListener('change', e => { if (e.target.id === 'hsc') loadHistory(); });

/* ── старт ── */
connect();
if (S.uid) loadAdmin();
fetch(API + '/auc/state').then(r => r.json()).then(d => { if (!S.pub && d?.auction) { S.pub = d; S.off = Date.parse(d.now) - Date.now(); render(); if (S.uid) loadMine(); } }).catch(() => {});
})();
