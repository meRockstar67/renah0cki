/* OvosheAwards 2026 — голосование зрителей в стиле SLAY Award. Та же база и тот же вход, что у renah0cki. */
(() => {
'use strict';
const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const CDN = 'https://cdn.renah0cki.xyz';
const OWNER = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
const STAFF_ROLES = ['moderator', 'gl_moder', 'admin'];
const EVENT_AT = Date.parse('2026-12-31T17:00:00Z'); // 31.12.2026 20:00 МСК
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = $('#page');
let toastT;
const toast = (m, err) => { const t = $('#toast'); t.textContent = m; t.classList.toggle('err', !!err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); };

/* ── сессия основного сайта ── */
const readSession = () => { try { return JSON.parse(localStorage.getItem('fh_session')); } catch { return null; } };
const jwtExp = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; } };
let refreshing = null;
async function getToken() {
  const s = readSession(); if (!s?.token) return null;
  if (jwtExp(s.token) - Date.now() > 60e3) return s.token;
  if (!s.refreshToken) return null;
  refreshing ||= (async () => {
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
async function api(path, { method = 'GET', body, prefer } = {}) {
  const t = await getToken();
  const h = { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY) };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let d = null; try { d = txt ? JSON.parse(txt) : null; } catch { d = txt; }
  if (!r.ok) throw new Error(d?.message || 'HTTP ' + r.status);
  return d;
}
const rpc = (fn, a = {}) => api('rpc/' + fn, { method: 'POST', body: a });
async function upload(file, onPct) {
  const token = await getToken(); if (!token) throw new Error('Нужно войти');
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open('POST', CDN + '/upload'); x.timeout = 180000;
    x.setRequestHeader('Content-Type', file.type); x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    x.setRequestHeader('X-User-Id', S.uid); x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.upload.onprogress = e => { if (e.lengthComputable) onPct?.(Math.round(e.loaded / e.total * 100)); };
    x.onload = () => { try { const j = JSON.parse(x.responseText); x.status < 300 && j.url ? ok(j.url) : bad(new Error(j.error || 'Ошибка загрузки')); } catch { bad(new Error('Ошибка загрузки')); } };
    x.onerror = () => bad(new Error('Нет соединения')); x.ontimeout = () => bad(new Error('Слишком долго'));
    x.send(file);
  });
}

/* ── состояние ── */
const S = { uid: readSession()?.user?.id || null, me: null, admin: false, noms: [], nees: [], votes: new Map(), results: null, showRes: false, flatGrid: false, carIdx: 0 };
const ytId = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/) || [])[1] || null;
const thumb = (u, w = 720) => { const m = String(u || '').match(/^https:\/\/cdn\.renah0cki\.xyz\/file\/(.+\.(?:jpe?g|png|webp))$/i); return m ? `${CDN}/thumb/${w}/${m[1]}` : u; };
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
const neesOf = id => S.nees.filter(x => x.nomination_id === id).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

/* ── кристаллические 3D-эмблемы в стиле SLAY (янтарь + расплавленный рубин) ── */
let svgUid = 0;
const CR_BASE = (id) => `
  <defs>
    <linearGradient id="gA${id}" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#ffe099"/>
      <stop offset="28%" stop-color="#ff7a14"/>
      <stop offset="68%" stop-color="#b8160c"/>
      <stop offset="100%" stop-color="#3e0604"/>
    </linearGradient>
    <linearGradient id="gB${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff5e14"/>
      <stop offset="50%" stop-color="#9c0e08"/>
      <stop offset="100%" stop-color="#2c0403"/>
    </linearGradient>
    <linearGradient id="gC${id}" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#fff4cc"/>
      <stop offset="40%" stop-color="#ff9926"/>
      <stop offset="100%" stop-color="#cc240a"/>
    </linearGradient>
    <linearGradient id="gD${id}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#610906"/>
      <stop offset="55%" stop-color="#e0430c"/>
      <stop offset="100%" stop-color="#ffd27a"/>
    </linearGradient>
  </defs>`;
const SHARDS = (id) => `
  <polygon points="32,162 18,118 44,126 56,162" fill="url(#gB${id})" stroke="#ffad54" stroke-width="1.2"/>
  <polygon points="18,118 32,162 34,132" fill="url(#gD${id})" opacity=".75"/>
  <polygon points="168,162 182,118 156,126 144,162" fill="url(#gB${id})" stroke="#ffad54" stroke-width="1.2"/>
  <polygon points="182,118 168,162 166,132" fill="url(#gA${id})" opacity=".65"/>
  <polygon points="56,166 44,134 74,142 82,174" fill="url(#gA${id})" stroke="#ffc675" stroke-width="1.2"/>
  <polygon points="144,166 156,134 126,142 118,174" fill="url(#gA${id})" stroke="#ffc675" stroke-width="1.2"/>
  <polygon points="100,144 122,164 100,186 78,164" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.5"/>
  <polygon points="100,144 122,164 100,164" fill="#fff0c4" opacity=".45"/>
  <polygon points="100,164 122,164 100,186" fill="#7a0a06" opacity=".6"/>`;

function crystalKind(nom, idx) {
  const s = `${nom.title || ''} ${nom.emoji || ''}`.toLowerCase();
  if (/king|корол/.test(s)) return 'crownKing';
  if (/queen|королев/.test(s)) return 'crownQueen';
  if (/ирл|irl|тикток|tiktok|телеф|📹|📱/.test(s)) return 'phone';
  if (/шип|любов|пара|💞|❤/.test(s)) return 'heart';
  if (/игр|кооп|гейм|мульти|🎮/.test(s)) return 'gamepad';
  if (/мем|эмоут|7tv|клоун|😺|🤡/.test(s)) return 'jester';
  if (/косплей|шоу|театр|🎭|🎬/.test(s)) return 'mask';
  if (/клип|видео|момент|🎞/.test(s)) return 'film';
  if (/dota|cs|шутер|меч/.test(s)) return 'sword';
  const order = ['crownKing', 'crownQueen', 'phone', 'gamepad', 'sword', 'heart', 'mask', 'film', 'jester', 'trophy'];
  return order[idx % order.length];
}

function crystalSvg(nom, idx) {
  const id = ++svgUid;
  const k = crystalKind(nom, idx);
  let body = '';
  if (k === 'crownKing') {
    body = `
      <polygon points="100,22 119,64 100,118 81,64" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.6"/>
      <polygon points="100,22 119,64 100,64" fill="#fff4d0" opacity=".5"/>
      <polygon points="100,64 119,64 100,118" fill="#6b0805" opacity=".55"/>
      <polygon points="48,46 78,86 74,132 42,102" fill="url(#gA${id})" stroke="#ffbe6b" stroke-width="1.4"/>
      <polygon points="152,46 122,86 126,132 158,102" fill="url(#gA${id})" stroke="#ffbe6b" stroke-width="1.4"/>
      <polygon points="24,84 56,118 56,154 24,142" fill="url(#gB${id})" stroke="#ffa348" stroke-width="1.4"/>
      <polygon points="176,84 144,118 144,154 176,142" fill="url(#gB${id})" stroke="#ffa348" stroke-width="1.4"/>
      <polygon points="26,148 92,148 92,168 38,168" fill="url(#gD${id})" stroke="#ffcf82" stroke-width="1.5"/>
      <polygon points="174,148 108,148 108,168 162,168" fill="url(#gD${id})" stroke="#ffcf82" stroke-width="1.5"/>
      <polygon points="100,112 118,140 100,168 82,140" fill="url(#gC${id})" stroke="#ffe6ad" stroke-width="1.5"/>`;
  } else if (k === 'crownQueen') {
    body = `
      <polygon points="100,24 118,68 100,130 82,68" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.6"/>
      <polygon points="100,24 118,68 100,68" fill="#fff5d6" opacity=".55"/>
      <polygon points="62,48 84,82 78,128 52,96" fill="url(#gA${id})" stroke="#ffba66" stroke-width="1.4"/>
      <polygon points="138,48 116,82 122,128 148,96" fill="url(#gA${id})" stroke="#ffba66" stroke-width="1.4"/>
      <polygon points="34,76 58,104 54,136 28,116" fill="url(#gB${id})" stroke="#ff9c40" stroke-width="1.3"/>
      <polygon points="166,76 142,104 146,136 172,116" fill="url(#gB${id})" stroke="#ff9c40" stroke-width="1.3"/>
      <path d="M24,146 Q100,114 176,146 L160,168 Q100,140 40,168 Z" fill="url(#gD${id})" stroke="#ffd284" stroke-width="1.5"/>
      <polygon points="100,122 114,144 100,166 86,144" fill="url(#gC${id})" stroke="#ffebbc" stroke-width="1.4"/>`;
  } else if (k === 'phone') {
    body = `
      ${SHARDS(id)}
      <g transform="rotate(14 100 94)">
        <rect x="64" y="30" width="72" height="122" rx="14" fill="url(#gA${id})" stroke="#ffcf82" stroke-width="2"/>
        <polygon points="64,62 136,36 136,106 64,132" fill="url(#gC${id})" opacity=".35"/>
        <polygon points="64,30 104,30 82,152 64,152" fill="#fff0c4" opacity=".14"/>
        <rect x="74" y="42" width="28" height="28" rx="7" fill="#4f0705" stroke="#ff9b3d" stroke-width="1.4"/>
        <circle cx="82" cy="50" r="4.5" fill="url(#gC${id})"/>
        <circle cx="94" cy="50" r="4.5" fill="url(#gC${id})"/>
        <circle cx="88" cy="61" r="4.5" fill="url(#gC${id})"/>
        <polygon points="100,86 116,108 100,130 84,108" fill="url(#gC${id})" opacity=".55"/>
      </g>`;
  } else if (k === 'gamepad') {
    body = `
      ${SHARDS(id)}
      <g transform="rotate(-10 100 92)">
        <path d="M44,70 C54,54 74,56 84,64 L116,64 C126,56 146,54 156,70 L168,112 C172,126 158,136 146,128 L128,112 L72,112 L54,128 C42,136 28,126 32,112 Z" fill="url(#gA${id})" stroke="#ffcf82" stroke-width="1.8"/>
        <polygon points="50,68 100,64 92,112 42,112" fill="#ffe29c" opacity=".18"/>
        <polygon points="100,64 152,68 158,112 92,112" fill="#5e0705" opacity=".4"/>
        <path d="M58,88 h18 M67,79 v18" stroke="#ffe5a8" stroke-width="4.5" stroke-linecap="square"/>
        <circle cx="132" cy="80" r="4.2" fill="#ffe5a8"/>
        <circle cx="142" cy="88" r="4.2" fill="#ffad42"/>
        <circle cx="122" cy="88" r="4.2" fill="#ffad42"/>
        <circle cx="132" cy="96" r="4.2" fill="#ffe5a8"/>
      </g>`;
  } else if (k === 'heart') {
    body = `
      ${SHARDS(id)}
      <polygon points="100,152 44,96 50,54 76,40 100,64 124,40 150,54 156,96" fill="url(#gA${id})" stroke="#ffd48a" stroke-width="1.8"/>
      <polygon points="100,64 76,40 50,54 76,94" fill="#ffe9b3" opacity=".32"/>
      <polygon points="100,64 124,40 150,54 124,94" fill="#ff8424" opacity=".36"/>
      <polygon points="100,64 76,94 100,152 124,94" fill="url(#gC${id})" opacity=".65"/>
      <polygon points="100,152 124,94 156,96" fill="#590604" opacity=".55"/>`;
  } else if (k === 'jester') {
    body = `
      ${SHARDS(id)}
      <polygon points="100,26 120,76 172,94 120,112 100,162 80,112 28,94 80,76" fill="url(#gA${id})" stroke="#ffd791" stroke-width="1.8"/>
      <polygon points="100,26 120,76 100,94 80,76" fill="#fff0c4" opacity=".52"/>
      <polygon points="100,94 172,94 120,112" fill="#700906" opacity=".52"/>
      <polygon points="100,56 122,94 100,132 78,94" fill="url(#gC${id})" stroke="#ffebbc" stroke-width="1.4"/>`;
  } else if (k === 'mask') {
    body = `
      ${SHARDS(id)}
      <polygon points="52,44 100,32 148,44 142,108 100,150 58,108" fill="url(#gA${id})" stroke="#ffd48a" stroke-width="1.8"/>
      <polygon points="100,32 148,44 142,108 100,150" fill="#5c0805" opacity=".42"/>
      <polygon points="68,78 90,72 86,88 70,88" fill="#1a0202" stroke="#ffb85c" stroke-width="1.2"/>
      <polygon points="132,78 110,72 114,88 130,88" fill="#1a0202" stroke="#ffb85c" stroke-width="1.2"/>
      <path d="M78,112 Q100,130 122,112" stroke="#ffe5a8" stroke-width="3.2" fill="none"/>`;
  } else if (k === 'film') {
    body = `
      ${SHARDS(id)}
      <polygon points="44,48 156,48 164,136 36,136" fill="url(#gA${id})" stroke="#ffd48a" stroke-width="1.8"/>
      <polygon points="44,48 156,48 100,92" fill="#ffe6a8" opacity=".2"/>
      <polygon points="84,66 132,92 84,118" fill="url(#gC${id})" stroke="#fff2cc" stroke-width="1.8"/>`;
  } else if (k === 'sword') {
    body = `
      ${SHARDS(id)}
      <g transform="rotate(34 100 94)">
        <polygon points="100,18 116,44 110,122 90,122 84,44" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.6"/>
        <polygon points="100,18 116,44 100,122" fill="#730906" opacity=".48"/>
        <polygon points="68,120 132,120 124,132 76,132" fill="url(#gD${id})" stroke="#ffd282" stroke-width="1.5"/>
        <rect x="94" y="132" width="12" height="28" rx="3" fill="url(#gB${id})" stroke="#ffa348" stroke-width="1.3"/>
        <polygon points="100,158 110,168 100,178 90,168" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.3"/>
      </g>`;
  } else {
    body = `
      ${SHARDS(id)}
      <polygon points="56,36 144,36 132,102 100,126 68,102" fill="url(#gA${id})" stroke="#ffd48a" stroke-width="1.8"/>
      <polygon points="56,36 100,36 100,126 68,102" fill="#ffe6a8" opacity=".24"/>
      <polygon points="90,124 110,124 116,154 84,154" fill="url(#gD${id})" stroke="#ffbe6b" stroke-width="1.4"/>
      <polygon points="66,154 134,154 142,168 58,168" fill="url(#gC${id})" stroke="#ffe5a8" stroke-width="1.5"/>`;
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${CR_BASE(id)}${body}</svg>`;
}

const ARROW_SVG = (dir) => {
  const id = ++svgUid;
  const pts = dir < 0 ? '26,4 8,16 26,28 20,16' : '6,4 24,16 6,28 12,16';
  const hi  = dir < 0 ? '26,4 8,16 20,16' : '6,4 24,16 12,16';
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="ar${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffb85c"/><stop offset="50%" stop-color="#e3300c"/><stop offset="100%" stop-color="#5c0604"/></linearGradient></defs><polygon points="${pts}" fill="url(#ar${id})" stroke="#ffd691" stroke-width="1.4"/><polygon points="${hi}" fill="#ffe9b8" opacity=".38"/></svg>`;
};
const STAR_SVG = () => {
  const id = ++svgUid;
  return `<svg class="slay-faq-star" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="st${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffc066"/><stop offset="50%" stop-color="#e8320e"/><stop offset="100%" stop-color="#6b0806"/></linearGradient></defs><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="url(#st${id})" stroke="#ffd691" stroke-width="1.2"/></svg>`;
};

const FAQ = [
  ['Через какой сервис проходит авторизация?', 'Авторизация проходит через ваш Twitch-аккаунт на основном сайте renah0cki.xyz. Отдельная регистрация не нужна.'],
  ['Сколько раз можно проголосовать в одной номинации?', 'В каждой номинации можно отдать один голос. Если вы передумали, просто нажмите на другого номинанта — голос перенесётся.'],
  ['Когда будут подведены итоги премии?', 'Итоги OvosheAwards 2026 будут объявлены в прямом эфире на новогоднем стриме.'],
  ['Как формируется список номинантов?', 'Номинации и список номинантов формируются стримером и модераторами сообщества по ярким моментам года.'],
];

async function loadAll() {
  const [noms, nees, votes, res] = await Promise.all([
    api('aw_nominations?select=*&order=position.asc,created_at.asc'),
    api('aw_nominees?select=*&order=position.asc,created_at.asc'),
    S.uid ? api(`aw_votes?user_id=eq.${S.uid}&select=nomination_id,nominee_id`).catch(() => []) : [],
    S.admin ? rpc('aw_results').catch(() => null) : null,
  ]);
  S.noms = noms; S.nees = nees;
  S.votes = new Map(votes.map(v => [v.nomination_id, v.nominee_id]));
  S.results = res ? new Map(res.map(r => [r.nominee_id, +r.votes])) : null;
}
async function loadMe() {
  if (!S.uid) { location.replace('/'); return false; }
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,role,extra_roles`);
    S.me = me;
    S.admin = S.uid === OWNER || (!!me && [me.role, ...(me.extra_roles || [])].some(r => STAFF_ROLES.includes(r)));
    if (!S.admin) { location.replace('/'); return false; }
    $('#awMe').innerHTML = me ? `<img src="${esc(me.avatar_url || '/icon-32.png')}" alt=""><span>${esc(me.display_name || me.username)}</span>` : '';
    return true;
  } catch { location.replace('/'); return false; }
}

/* ── карточка номинации в стиле SLAY ── */
function slayCardHtml(n, idx) {
  const list = neesOf(n.id), mine = S.votes.get(n.id), pick = list.find(x => x.id === mine);
  const sub = pick ? `✓ Ваш голос: ${pick.title}` : (!n.is_open ? 'Голосование закрыто' : 'Сделай выбор');
  return `<article class="slay-card" style="--i:${idx}">
    <a class="slay-emblem" href="#/n/${n.id}" aria-label="${esc(n.title)}">${crystalSvg(n, idx)}</a>
    <h3 class="slay-card-t"><a href="#/n/${n.id}">${esc(n.title)}</a></h3>
    <div class="slay-card-sub${pick ? ' picked' : ''}">${esc(sub)}</div>
    <a class="slay-btn${pick ? ' voted' : ''}" href="#/n/${n.id}">${pick ? 'ИЗМЕНИТЬ ВЫБОР' : 'ПРОГОЛОСОВАТЬ'}</a>
  </article>`;
}

function carOffset(i, cur, len, dir = 1) {
  let d = i - cur;
  if (len > 2) {
    if (d > len / 2) d -= len;
    if (d < -len / 2) d += len;
    if (Math.abs(d) === len / 2) d = dir >= 0 ? -2 : 2;
  } else if (len === 2 && d !== 0) {
    d = dir >= 0 ? -1 : 1;
  }
  return Math.max(-2, Math.min(2, d));
}
function mountCarousel(more) {
  const box = $('#slayCarBox'); if (!box || !more.length) return;
  const len = more.length;
  S.carIdx = ((S.carIdx % len) + len) % len;
  box.innerHTML = `<div class="slay-car-stage">${more.map((n, i) => {
    const absIdx = S.noms.indexOf(n);
    const list = neesOf(n.id), mine = S.votes.get(n.id), pick = list.find(x => x.id === mine);
    const sub = pick ? `✓ Ваш голос: ${pick.title}` : (!n.is_open ? 'Голосование закрыто' : 'Сделай выбор');
    return `<article class="slay-car-item" data-cidx="${i}" data-pos="${carOffset(i, S.carIdx, len, 1)}">
      <a class="slay-emblem" href="#/n/${n.id}" aria-label="${esc(n.title)}">${crystalSvg(n, absIdx)}</a>
      <h3 class="slay-card-t"><a href="#/n/${n.id}">${esc(n.title)}</a></h3>
      <div class="slay-card-sub${pick ? ' picked' : ''}">${esc(sub)}</div>
      <a class="slay-btn${pick ? ' voted' : ''}" href="#/n/${n.id}">${pick ? 'ИЗМЕНИТЬ ВЫБОР' : 'ПРОГОЛОСОВАТЬ'}</a>
    </article>`;
  }).join('')}</div>
  ${len > 1 ? `<div class="slay-car-nav">
    <button type="button" class="slay-car-arr" data-car="-1" aria-label="Назад">${ARROW_SVG(-1)}</button>
    <span class="slay-car-cnt"><b id="slayCarCur">${String(S.carIdx + 1).padStart(2, '0')}</b> / ${String(len).padStart(2, '0')}</span>
    <button type="button" class="slay-car-arr" data-car="1" aria-label="Вперёд">${ARROW_SVG(1)}</button>
  </div>` : ''}`;
}
function renderCarousel(more, dir = 1) {
  const box = $('#slayCarBox'); if (!box || !more.length) return;
  const items = [...box.querySelectorAll('.slay-car-item')];
  if (items.length !== more.length) return mountCarousel(more);
  const len = more.length;
  S.carIdx = ((S.carIdx % len) + len) % len;
  // если невидимая карточка (-2 или 2) должна въехать с противоположного края, переносим её без анимации до старта перехода
  const pre = [];
  items.forEach((el, i) => {
    const oldP = Number(el.dataset.pos), newP = carOffset(i, S.carIdx, len, dir);
    if ((oldP === -2 && newP === 1) || (oldP === 2 && newP === -1)) {
      el.style.transition = 'none';
      el.dataset.pos = String(newP > 0 ? 2 : -2);
      pre.push([el, newP]);
    }
  });
  if (pre.length) {
    void box.offsetWidth;
    pre.forEach(([el]) => { el.style.transition = ''; });
  }
  items.forEach((el, i) => { el.dataset.pos = String(carOffset(i, S.carIdx, len, dir)); });
  const curEl = $('#slayCarCur'); if (curEl) curEl.textContent = String(S.carIdx + 1).padStart(2, '0');
}

/* ── обратный отсчёт ── */
let cdT = null;
function tickCountdown() {
  const dEl = $('#cdD'), hEl = $('#cdH'), mEl = $('#cdM');
  if (!dEl || !hEl || !mEl) return;
  const diff = Math.max(0, EVENT_AT - Date.now());
  const d = Math.floor(diff / 86400e3);
  const h = Math.floor((diff % 86400e3) / 3600e3);
  const m = Math.floor((diff % 3600e3) / 60e3);
  dEl.textContent = String(d).padStart(2, '0');
  hEl.textContent = String(h).padStart(2, '0');
  mEl.textContent = String(m).padStart(2, '0');
  const dl = $('#cdDL'), hl = $('#cdHL'), ml = $('#cdML');
  if (dl) dl.textContent = plural(d, 'день', 'дня', 'дней');
  if (hl) hl.textContent = plural(h, 'час', 'часа', 'часов');
  if (ml) ml.textContent = plural(m, 'минута', 'минуты', 'минут');
}

/* ── главная: все секции SLAY ── */
function viewHome() {
  const total = S.noms.length, voted = S.noms.filter(n => S.votes.has(n.id)).length;
  const top2 = S.noms.slice(0, 2);
  const top3 = S.noms.slice(2, 5);
  const more = S.noms.slice(5);
  page.innerHTML = `
    <section class="slay-hero" id="sec-hero">
      <div class="slay-hero-bg" aria-hidden="true"></div>
      <div class="slay-hero-in">
        <div class="slay-hero-pill"><b>OvosheAwards 2026</b><i></i></div>
        <h1>OVOSHE<br>AWARDS</h1>
        <p class="slay-hero-sub">Главная премия<br>сообщества</p>
        <div class="slay-hero-date">31.12.26</div>
        ${S.uid ? `<div class="slay-hero-prog"><div class="aw-prog-bar"><i style="width:${total ? voted / total * 100 : 0}%"></i></div><span>Голосов: <b>${voted}</b> из ${total}</span></div>` : ''}
      </div>
    </section>

    ${S.admin ? `<div class="aw-admin-wrap"><div class="aw-admin-bar"><span>Модерация</span>
      <button class="aw-btn gold" data-add-nom>＋ Номинация</button>
      <label class="aw-sw"><input type="checkbox" data-show-res${S.showRes ? ' checked' : ''}><i></i>Показывать голоса</label>
      <label class="aw-sw"><input type="checkbox" data-flat-grid${S.flatGrid ? ' checked' : ''}><i></i>Все номинации сеткой</label>
    </div></div>` : ''}

    <section class="slay-sec" id="sec-noms">
      <h2 class="slay-h2">Номинации 2026</h2>
      <p class="slay-sub">Поддержи любимых участников и моменты года. Голосуй за лучших в каждой номинации</p>
      ${!S.noms.length ? '<div class="aw-empty">Номинаций пока нет.</div>' : S.flatGrid
        ? `<div class="slay-all-grid">${S.noms.map((n, i) => slayCardHtml(n, i)).join('')}</div>`
        : `${top2.length ? `<div class="slay-top2">${top2.map((n, i) => slayCardHtml(n, i)).join('')}</div>` : ''}
           ${top3.length ? `<div class="slay-top3">${top3.map((n, i) => slayCardHtml(n, i + 2)).join('')}</div>` : ''}`}
    </section>

    ${!S.flatGrid && more.length ? `<section class="slay-sec slay-more" id="sec-more">
      <h2 class="slay-h2">Больше номинаций</h2>
      <div id="slayCarBox"></div>
    </section>` : ''}

    <section class="slay-sec slay-cd" id="sec-cd">
      <div class="slay-cd-k">До итогов</div>
      <div class="slay-cd-h">Премии</div>
      <div class="slay-cd-grid">
        <div class="slay-cd-u"><b id="cdD">00</b><span id="cdDL">дней</span></div>
        <div class="slay-cd-sep" aria-hidden="true"><i></i><i></i></div>
        <div class="slay-cd-u"><b id="cdH">00</b><span id="cdHL">часов</span></div>
        <div class="slay-cd-sep" aria-hidden="true"><i></i><i></i></div>
        <div class="slay-cd-u"><b id="cdM">00</b><span id="cdML">минут</span></div>
      </div>
      <a class="slay-btn" href="#/" data-jump="noms">К НОМИНАЦИЯМ</a>
    </section>

    <section class="slay-faq" id="sec-faq">
      <h2 class="slay-h2 white">Вопрос-ответ</h2>
      <div class="slay-faq-list">${FAQ.map(([q, a]) => `<div class="slay-faq-item">
        <button type="button" class="slay-faq-q" data-faq><span>${esc(q)}</span>${STAR_SVG()}</button>
        <div class="slay-faq-a">${esc(a)}</div>
      </div>`).join('')}</div>
    </section>`;

  if (!S.flatGrid && more.length) renderCarousel(more);
  tickCountdown();
  clearInterval(cdT);
  cdT = setInterval(tickCountdown, 15000);
}

/* ── номинация (#/n/<id>) ── */
function mediaHtml(x, big) {
  const u = x.media_url || '';
  if (x.media_type === 'image') return `<button class="aw-media" data-zoom="${esc(u)}"><img src="${esc(big ? u : thumb(u, 720))}" alt="" loading="lazy"></button>`;
  if (x.media_type === 'video') return `<div class="aw-media"><video src="${esc(u)}" controls playsinline preload="metadata"></video></div>`;
  if (x.media_type === 'youtube' && ytId(u)) return `<div class="aw-media yt"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(u)}" allowfullscreen loading="lazy"></iframe></div>`;
  if (x.media_type === 'link') return `<a class="aw-media aw-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span>🔗</span>${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`;
  return `<div class="aw-media aw-nomedia">${esc((x.title || '?').slice(0, 1).toUpperCase())}</div>`;
}
function viewNom(id) {
  clearInterval(cdT);
  const n = S.noms.find(x => x.id === id);
  if (!n) { page.innerHTML = '<div class="aw-empty">Номинация не найдена. <a href="#/">Ко всем номинациям</a></div>'; return; }
  const list = neesOf(id), mine = S.votes.get(id), idx = S.noms.indexOf(n);
  const prev = S.noms[idx - 1], next = S.noms[idx + 1];
  const max = S.results ? Math.max(1, ...list.map(x => S.results.get(x.id) || 0)) : 1;
  page.innerHTML = `<div class="aw-nom-wrap">
    <a class="aw-crumb" href="#/">← Все номинации</a>
    <section class="aw-nom-head">
      <div class="slay-emblem">${crystalSvg(n, idx)}</div>
      <div class="aw-kicker">Номинация ${String(idx + 1).padStart(2, '0')} из ${String(S.noms.length).padStart(2, '0')}${n.is_open ? '' : ' · голосование закрыто'}</div>
      <h1>${esc(n.title)}</h1>
      ${n.description ? `<p>${esc(n.description)}</p>` : ''}
      ${S.admin ? `<div class="aw-head-acts">
        <button class="aw-btn" data-edit-nom="${n.id}">Изменить</button>
        <button class="aw-btn" data-toggle-nom="${n.id}">${n.is_open ? 'Закрыть голосование' : 'Открыть голосование'}</button>
        <label class="aw-sw" style="margin:0 6px"><input type="checkbox" data-show-res${S.showRes ? ' checked' : ''}><i></i>Голоса</label>
        <button class="aw-btn danger" data-del-nom="${n.id}">Удалить</button>
      </div>` : ''}
    </section>
    <div class="aw-nees">${list.map((x, i) => {
      const on = mine === x.id, v = S.results?.get(x.id) || 0;
      return `<article class="aw-nee${on ? ' on' : ''}" style="--i:${i}">
        ${mediaHtml(x)}
        <div class="aw-nee-body"><h3>${esc(x.title)}</h3>${x.description ? `<p>${esc(x.description)}</p>` : ''}
          ${S.results && S.showRes ? `<div class="aw-res"><div class="aw-res-bar"><i style="width:${v / max * 100}%"></i></div><span>${v} ${plural(v, 'голос', 'голоса', 'голосов')}</span></div>` : ''}
          <div class="aw-nee-acts">${n.is_open ? `<button class="slay-btn sm${on ? ' voted' : ''}" data-vote="${x.id}">${on ? '✓ ВАШ ГОЛОС' : 'ПРОГОЛОСОВАТЬ'}</button>` : on ? '<span class="slay-btn sm voted static">✓ ВАШ ГОЛОС</span>' : ''}
            ${S.admin ? `<button class="aw-btn icon" data-edit-nee="${x.id}" title="Изменить">✎</button><button class="aw-btn icon danger" data-del-nee="${x.id}" title="Удалить">✕</button>` : ''}</div></div>
      </article>`;
    }).join('')}
    ${S.admin ? `<button class="aw-nee aw-add" data-add-nee="${id}"><span>＋</span>Добавить номинанта<small>фото, гиф, видео или ссылка</small></button>` : ''}</div>
    ${!list.length && !S.admin ? '<div class="aw-empty">Номинанты скоро появятся.</div>' : ''}
    <nav class="aw-pager">${prev ? `<a href="#/n/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/n/${next.id}">${esc(next.title)} →</a>` : ''}</nav>
  </div>`;
}

/* ── голос ── */
async function vote(id) {
  if (!S.uid) return toast('Войдите на renah0cki, чтобы голосовать', true);
  const x = S.nees.find(y => y.id === id); if (!x) return;
  try {
    const r = await rpc('aw_vote', { p_nominee: id });
    if (r) { S.votes.set(x.nomination_id, r); toast('Голос учтён'); } else { S.votes.delete(x.nomination_id); toast('Голос снят'); }
    if (S.admin) { const res = await rpc('aw_results').catch(() => null); S.results = res ? new Map(res.map(z => [z.nominee_id, +z.votes])) : null; }
    route();
  } catch (e) { toast(e.message, true); }
}

/* ── админка ── */
function modal(html, onSubmit) {
  const ov = document.createElement('div'); ov.className = 'aw-ov';
  ov.innerHTML = `<form class="aw-modal">${html}<p class="aw-hint"></p><div class="aw-modal-acts"><button type="button" class="aw-btn" data-x>Отмена</button><button class="aw-btn gold" type="submit">Сохранить</button></div></form>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); });
  const f = $('form', ov);
  f.onsubmit = async e => { e.preventDefault(); const b = $('button[type=submit]', f); b.disabled = true; try { await onSubmit(f, t => { $('.aw-hint', f).textContent = t; }); ov.remove(); } catch (er) { $('.aw-hint', f).textContent = 'Ошибка: ' + er.message; b.disabled = false; } };
  document.body.append(ov); setTimeout(() => $('input', f)?.focus(), 30);
  return f;
}
function nomDialog(n) {
  modal(`<h2>${n ? 'Изменить номинацию' : 'Новая номинация'}</h2>
    <div class="aw-row"><label style="flex:0 0 80px">Эмодзи<input name="e" maxlength="8" value="${esc(n?.emoji || '🏅')}"></label><label>Название<input name="t" maxlength="120" required value="${esc(n?.title || '')}" placeholder="Мем года"></label></div>
    <label>Описание (необязательно)<textarea name="d" rows="2" maxlength="600">${esc(n?.description || '')}</textarea></label>`, async f => {
    const body = { title: f.t.value.trim(), emoji: f.e.value.trim() || null, description: f.d.value.trim() || null };
    if (n) await api(`aw_nominations?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body });
    else await api('aw_nominations', { method: 'POST', prefer: 'return=minimal', body: { ...body, position: (Math.max(0, ...S.noms.map(x => x.position)) + 1) } });
    toast('Сохранено'); await loadAll(); route();
  });
}
function neeDialog(nomId, x) {
  let file = null;
  const f = modal(`<h2>${x ? 'Изменить номинанта' : 'Новый номинант'}</h2>
    <label>Название / ник<input name="t" maxlength="120" required value="${esc(x?.title || '')}"></label>
    <label>Описание (необязательно)<textarea name="d" rows="2" maxlength="600">${esc(x?.description || '')}</textarea></label>
    <div class="aw-media-pick"><span>Медиа</span>
      <label class="aw-drop"><input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden><b>Загрузить фото, гиф или видео</b><small>до 30 МБ</small></label>
      <div class="aw-or">или ссылка</div>
      <input name="u" placeholder="YouTube, ссылка на картинку (7TV и т.п.) или любая ссылка" value="${esc(x?.media_url || '')}">
      <div class="aw-prev"></div></div>`, async (f, say) => {
    let url = f.u.value.trim(), type = 'none';
    if (file) { url = await upload(file, p => say(`Загрузка: ${p}%`)); type = /^video\//.test(file.type) ? 'video' : 'image'; }
    else if (url) {
      if (!/^https:\/\//.test(url)) throw new Error('Ссылка должна начинаться с https://');
      type = ytId(url) ? 'youtube' : /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url) || /cdn\.7tv\.app\/emote\//.test(url) ? 'image' : /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'link';
    }
    const body = { title: f.t.value.trim(), description: f.d.value.trim() || null, media_url: url || null, media_type: url ? type : 'none' };
    if (x) await api(`aw_nominees?id=eq.${x.id}`, { method: 'PATCH', prefer: 'return=minimal', body });
    else await api('aw_nominees', { method: 'POST', prefer: 'return=minimal', body: { ...body, nomination_id: nomId, position: neesOf(nomId).length + 1 } });
    toast('Сохранено'); await loadAll(); route();
  });
  const fi = $('input[type=file]', f), pv = $('.aw-prev', f);
  fi.onchange = () => {
    file = fi.files[0] || null; if (!file) return;
    if (file.size > 30 * 1048576) { file = null; return toast('Файл больше 30 МБ', true); }
    const u = URL.createObjectURL(file); f.u.value = '';
    pv.innerHTML = /^video/.test(file.type) ? `<video src="${u}" muted controls></video>` : `<img src="${u}" alt="">`;
    $('.aw-drop b', f).textContent = file.name;
  };
}

function jumpTo(id) {
  const go = () => { const el = $(`#sec-${id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  if (location.hash && location.hash !== '#/' && location.hash !== '#') { location.hash = '#/'; setTimeout(go, 60); }
  else go();
}
document.addEventListener('click', e => {
  const j = e.target.closest('[data-jump]');
  if (j) { e.preventDefault(); jumpTo(j.dataset.jump); }
});
page.addEventListener('click', async e => {
  const t = e.target;
  const car = t.closest('[data-car]');
  if (car) { const d = Number(car.dataset.car) || 1; S.carIdx += d; return renderCarousel(S.noms.slice(5), d); }
  const citem = t.closest('.slay-car-item');
  if (citem && citem.dataset.pos !== '0') {
    e.preventDefault();
    const d = Number(citem.dataset.pos) > 0 ? 1 : -1;
    S.carIdx = Number(citem.dataset.cidx) || 0;
    return renderCarousel(S.noms.slice(5), d);
  }
  const fq = t.closest('[data-faq]');
  if (fq) { fq.closest('.slay-faq-item')?.classList.toggle('open'); return; }
  const v = t.closest('[data-vote]'); if (v) return vote(v.dataset.vote);
  const z = t.closest('[data-zoom]'); if (z) { const ov = document.createElement('div'); ov.className = 'aw-ov aw-zoom'; ov.innerHTML = `<img src="${esc(z.dataset.zoom)}" alt="">`; ov.onclick = () => ov.remove(); document.body.append(ov); return; }
  if (!S.admin) return;
  if (t.closest('[data-add-nom]')) return nomDialog(null);
  const en = t.closest('[data-edit-nom]'); if (en) return nomDialog(S.noms.find(x => x.id === en.dataset.editNom));
  const tn = t.closest('[data-toggle-nom]');
  if (tn) { const n = S.noms.find(x => x.id === tn.dataset.toggleNom); await api(`aw_nominations?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { is_open: !n.is_open } }).catch(er => toast(er.message, true)); await loadAll(); return route(); }
  const dn = t.closest('[data-del-nom]');
  if (dn) { if (!confirm('Удалить номинацию вместе с номинантами и голосами?')) return; await api(`aw_nominations?id=eq.${dn.dataset.delNom}`, { method: 'DELETE' }).catch(er => toast(er.message, true)); await loadAll(); location.hash = '#/'; return; }
  const an = t.closest('[data-add-nee]'); if (an) return neeDialog(an.dataset.addNee, null);
  const ee = t.closest('[data-edit-nee]'); if (ee) { const x = S.nees.find(y => y.id === ee.dataset.editNee); return neeDialog(x.nomination_id, x); }
  const de = t.closest('[data-del-nee]');
  if (de) { if (!confirm('Удалить номинанта?')) return; await api(`aw_nominees?id=eq.${de.dataset.delNee}`, { method: 'DELETE' }).catch(er => toast(er.message, true)); await loadAll(); return route(); }
});
page.addEventListener('change', e => {
  if (e.target.matches('[data-show-res]')) { S.showRes = e.target.checked; route(); }
  if (e.target.matches('[data-flat-grid]')) { S.flatGrid = e.target.checked; route(); }
});

/* ── свайп карусели на телефоне + огненное свечение курсора на десктопе ── */
let touchX = null, touchY = null;
page.addEventListener('touchstart', e => {
  if (!e.target.closest('#slayCarBox') || e.touches.length !== 1) return;
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
}, { passive: true });
page.addEventListener('touchend', e => {
  if (touchX == null || !e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = touchY = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    const more = S.noms.slice(5);
    if (more.length > 1) { const d = dx < 0 ? 1 : -1; S.carIdx += d; renderCarousel(more, d); }
  }
}, { passive: true });

if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const glow = document.createElement('div'); glow.className = 'aw-cur-glow'; document.body.append(glow);
  let tx = -100, ty = -100, cx = -100, cy = -100, raf = 0;
  const loop = () => {
    cx += (tx - cx) * 0.24; cy += (ty - cy) * 0.24;
    glow.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) raf = requestAnimationFrame(loop); else raf = 0;
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!glow.classList.contains('on')) { cx = tx; cy = ty; glow.classList.add('on'); }
    glow.classList.toggle('hot', !!e.target?.closest?.('a,button,label,[role=button],.slay-emblem,.slay-btn,.aw-media'));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('on'));
}

/* ── роутер ── */
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'n' && p[1]) viewNom(p[1]); else viewHome();
}
addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
page.innerHTML = `<div class="aw-load"><div class="aw-load-cr">${crystalSvg({ title: 'king' }, 0)}</div></div>`;
loadMe().then(ok => { if (!ok) return; return loadAll().then(route); }).catch(e => { page.innerHTML = `<div class="aw-empty">Не удалось загрузить: ${esc(e.message)}</div>`; });
})();
