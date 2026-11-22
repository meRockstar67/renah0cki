/* OvosheAwards 2026 — голосование зрителей в стиле SLAY Award. Та же база и тот же вход, что у renah0cki. */
(() => {
'use strict';
const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const CDN = 'https://cdn.renah0cki.xyz';
const OWNER = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
const STAFF_ROLES = ['moderator', 'gl_moder', 'admin'];
const JURY_ROLES = ['streamer', 'moderator', 'gl_moder', 'admin'];
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

async function delServerMedia(payload) {
  const token = await getToken(); if (!token) return;
  await fetch(CDN + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload) }).catch(() => {});
}
/* ── состояние ── */
const S = { uid: readSession()?.user?.id || null, me: null, admin: false, jury: false, noms: [], nees: [], votes: new Map(), results: null, showRes: false, flatGrid: false, carIdx: 0, homeScroll: 0, view: '', lastVoted: null, justDragged: false };
const ytId = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/) || [])[1] || null;
const thumb = (u, w = 720) => { const m = String(u || '').match(/^https:\/\/cdn\.renah0cki\.xyz\/file\/(.+\.(?:jpe?g|png|webp))$/i); return m ? `${CDN}/thumb/${w}/${m[1]}` : u; };
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
const neesOf = id => S.nees.filter(x => x.nomination_id === id).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
const partsOf = x => Array.isArray(x?.participants) ? x.participants : [];

/* ── официальные 3D-иконки номинаций SLAY 2026 ── */
let svgUid = 0;
const SLAY_ICONS = [
  ['i:king',  'king.png',    'Король'],
  ['i:queen', 'queen.png',   'Королева'],
  ['i:irl',   'irl.png',     'IRL'],
  ['i:pair',  'pair.png',    'Пара / Шип'],
  ['i:clown', 'clown.png',   'Мем'],
  ['i:cosp',  'cosplay.png', 'Косплей'],
  ['i:game',  'game.png',    'Игры / Кооп'],
  ['i:cup',   'cup.png',     'Шоу / Проект'],
  ['i:yt',    'youtube.png', 'Клип / Ютуб'],
  ['i:next',  'next.png',    'Next Gen / ТикТок'],
  ['i:bot',   'bot.png',     'Аудитория / 7TV'],
  ['i:w',     'w.png',       'Завоз'],
  ['i:song',  'song.png',    'Трек'],
  ['i:cs',    'cs.png',      'CS'],
  ['i:dota',  'dota.png',    'Dota'],
  ['i:mc',    'mc.png',      'Minecraft'],
];
const SLAY_ICON_MAP = Object.fromEntries(SLAY_ICONS.map(([k, f]) => [k, f]));

function resolveSlayIcon(nom, idx = 0) {
  if (nom?.emoji && SLAY_ICON_MAP[nom.emoji]) return nom.emoji;
  const s = `${nom?.title || ''} ${nom?.emoji || ''}`.toLowerCase();
  if (/king|корол/.test(s)) return 'i:king';
  if (/queen|королев/.test(s)) return 'i:queen';
  if (/\bcs\b|кс|шутер|counter/.test(s)) return 'i:cs';
  if (/dota|дота|меч/.test(s)) return 'i:dota';
  if (/minecraft|майнкрафт|кирк/.test(s)) return 'i:mc';
  if (/ирл|irl|телеф|📹|📱/.test(s)) return 'i:irl';
  if (/шип|любов|пара|💞|❤/.test(s)) return 'i:pair';
  if (/мем|клоун|🤡/.test(s)) return 'i:clown';
  if (/7tv|эмоут|аудитор|чат|бот|😺/.test(s)) return 'i:bot';
  if (/косплей|маск|🎭/.test(s)) return 'i:cosp';
  if (/игр|кооп|гейм|мульти|🎮/.test(s)) return 'i:game';
  if (/шоу|проект|кубок|преми|🎬|🏆/.test(s)) return 'i:cup';
  if (/клип|ютуб|youtube|видео|момент|🎞/.test(s)) return 'i:yt';
  if (/тикток|tiktok|next|прорыв|открыт|нович/.test(s)) return 'i:next';
  if (/трек|песн|музык|альбом|🎵|🎤/.test(s)) return 'i:song';
  if (/завоз|вин|побед|хайлайт|\bw\b/.test(s)) return 'i:w';
  return SLAY_ICONS[Math.abs(idx) % SLAY_ICONS.length][0];
}

function nomIconHtml(nom, idx = 0) {
  const file = SLAY_ICON_MAP[resolveSlayIcon(nom, idx)] || 'king.png';
  return `<img class="slay-ico" src="/awards/icons/${file}?v=1" alt="" loading="lazy" decoding="async" draggable="false">`;
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
    const roles = me ? [me.role, ...(me.extra_roles || [])] : [];
    S.admin = S.uid === OWNER || roles.some(r => STAFF_ROLES.includes(r));
    S.jury = S.uid === OWNER || roles.some(r => JURY_ROLES.includes(r));
    if (!S.jury) { location.replace('/'); return false; }
    const jb = $('#awJury');
    if (jb) { jb.hidden = !S.jury; document.body.classList.toggle('has-jury', S.jury); }
    $('#awMe').innerHTML = me ? `<img src="${esc(me.avatar_url || '/icon-32.png')}" alt=""><span>${esc(me.display_name || me.username)}</span>` : '';
    return true;
  } catch { location.replace('/'); return false; }
}

/* ── карточка номинации в стиле SLAY ── */
function slayCardHtml(n, idx) {
  const list = neesOf(n.id), mine = S.votes.get(n.id), pick = list.find(x => x.id === mine);
  const sub = pick ? `✓ Ваш голос: ${pick.title}` : (!n.is_open ? 'Голосование закрыто' : 'Сделай выбор');
  return `<article class="slay-card sr" style="--i:${idx};--sd:${(idx % 3) * 85}ms">
    <a class="slay-emblem" href="#/n/${n.id}" aria-label="${esc(n.title)}">${nomIconHtml(n, idx)}</a>
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
      <a class="slay-emblem" href="#/n/${n.id}" aria-label="${esc(n.title)}">${nomIconHtml(n, absIdx)}</a>
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

const EMBERS_HTML = Array.from({ length: 24 }, (_, i) => {
  const left = ((i * 37 + 11) % 94) + 3;
  const sz = 2.5 + (i % 4) * 1.2;
  const d = (5.5 + (i % 5) * 1.35).toFixed(2);
  const dl = (-((i * 1.17) % 7)).toFixed(2);
  const dx = ((i % 2 ? 1 : -1) * (18 + (i % 4) * 16));
  return `<span class="slay-ember" style="left:${left}%;width:${sz}px;height:${sz}px;--d:${d}s;--dl:${dl}s;--dx:${dx}px"></span>`;
}).join('');

let revealObs = null;
function initReveal(instantAbove = false) {
  revealObs?.disconnect();
  const els = [...page.querySelectorAll('.sr')];
  if (!els.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  if (instantAbove) {
    const vh = innerHeight;
    els.forEach(el => { if (el.getBoundingClientRect().top < vh * 1.05) el.classList.add('in'); });
  }
  revealObs = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  els.forEach(el => { if (!el.classList.contains('in')) revealObs.observe(el); });
}

/* ── главная: все секции SLAY ── */
function viewHome(restoreScroll = false) {
  S.view = 'home';
  const total = S.noms.length, voted = S.noms.filter(n => S.votes.has(n.id)).length;
  const top2 = S.noms.slice(0, 2);
  const top3 = S.noms.slice(2, 5);
  const more = S.noms.slice(5);
  page.innerHTML = `
    <section class="slay-hero" id="sec-hero">
      <div class="slay-hero-bg" aria-hidden="true"></div>
      <div class="slay-embers" aria-hidden="true">${EMBERS_HTML}</div>
      <div class="slay-hero-in">
        <div class="slay-hero-pill"><b>OvosheAwards 2026</b><i></i></div>
        <h1>OVOSHE<br>AWARDS</h1>
        <p class="slay-hero-sub">Главная премия<br>сообщества</p>
        <div class="slay-hero-date">31.12.26</div>
        ${S.uid ? `<div class="slay-hero-prog"><div class="aw-prog-bar"><i style="width:${total ? voted / total * 100 : 0}%"></i></div><span>Голосов: <b>${voted}</b> из ${total}</span></div>` : ''}
      </div>
    </section>

    ${S.admin ? `<div class="aw-admin-wrap sr"><div class="aw-admin-bar"><span>Модерация</span>
      <button class="aw-btn gold" data-add-nom>＋ Номинация</button>
      <label class="aw-sw"><input type="checkbox" data-show-res${S.showRes ? ' checked' : ''}><i></i>Показывать голоса</label>
      <label class="aw-sw"><input type="checkbox" data-flat-grid${S.flatGrid ? ' checked' : ''}><i></i>Все номинации сеткой</label>
    </div></div>` : ''}

    <section class="slay-sec" id="sec-noms">
      <h2 class="slay-h2 sr">Номинации 2026</h2>
      <p class="slay-sub sr" style="--sd:80ms">Поддержи любимых участников и моменты года. Голосуй за лучших в каждой номинации</p>
      ${!S.noms.length ? '<div class="aw-empty">Номинаций пока нет.</div>' : S.flatGrid
        ? `<div class="slay-all-grid">${S.noms.map((n, i) => slayCardHtml(n, i)).join('')}</div>`
        : `${top2.length ? `<div class="slay-top2">${top2.map((n, i) => slayCardHtml(n, i)).join('')}</div>` : ''}
           ${top3.length ? `<div class="slay-top3">${top3.map((n, i) => slayCardHtml(n, i + 2)).join('')}</div>` : ''}`}
    </section>

    ${!S.flatGrid && more.length ? `<section class="slay-sec slay-more" id="sec-more">
      <h2 class="slay-h2 sr">Больше номинаций</h2>
      <div id="slayCarBox" class="sr" style="--sd:90ms"></div>
    </section>` : ''}

    <section class="slay-sec slay-cd sr" id="sec-cd">
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

    <section class="slay-faq sr" id="sec-faq">
      <h2 class="slay-h2 white">Вопрос-ответ</h2>
      <div class="slay-faq-list">${FAQ.map(([q, a]) => `<div class="slay-faq-item">
        <button type="button" class="slay-faq-q" data-faq><span>${esc(q)}</span>${STAR_SVG()}</button>
        <div class="slay-faq-a"><div>${esc(a)}</div></div>
      </div>`).join('')}</div>
    </section>`;

  if (!S.flatGrid && more.length) renderCarousel(more);
  tickCountdown();
  clearInterval(cdT);
  cdT = setInterval(tickCountdown, 15000);
  if (restoreScroll && S.homeScroll > 0) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: S.homeScroll, behavior: 'instant' });
      initReveal(true);
    });
  } else {
    initReveal(window.scrollY > 10);
  }
}

/* ── номинация (#/n/<id>) ── */
function mediaHtml(x, canOpenParts = false) {
  const u = x.media_url || '';
  const openAttr = canOpenParts
    ? ` role="button" tabindex="0" data-open-parts="${x.id}" title="${partsOf(x).length ? `Участники (${partsOf(x).length})` : 'Добавить участников'}"`
    : '';
  const clickCls = canOpenParts ? ' is-clickable' : '';
  if (x.media_type === 'image') return `<div class="aw-media is-img${clickCls}"${openAttr}><img src="${esc(thumb(u, 720))}" alt="" loading="lazy" draggable="false"></div>`;
  if (x.media_type === 'video') return `<div class="aw-media is-vid"><video src="${esc(u)}" controls playsinline preload="metadata"></video></div>`;
  if (x.media_type === 'youtube' && ytId(u)) return `<div class="aw-media yt"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(u)}" allowfullscreen loading="lazy"></iframe></div>`;
  if (x.media_type === 'link') return `<a class="aw-media aw-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span>🔗</span>${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`;
  return `<div class="aw-media aw-nomedia${clickCls}"${openAttr}>${esc((x.title || '?').slice(0, 1).toUpperCase())}</div>`;
}
function autoLinkLabel(url) {
  if (/twitchtracker\.com/i.test(url)) return 'TwitchTracker';
  if (/clips\.twitch\.tv|twitch\.tv\/[^/]+\/clip\//i.test(url)) return 'Клип на Twitch';
  if (/twitch\.tv/i.test(url)) return 'Twitch-канал';
  if (/youtu\.?be/i.test(url)) return 'YouTube';
  if (/t\.me/i.test(url)) return 'Telegram';
  if (/tiktok\.com/i.test(url)) return 'TikTok';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '').slice(0, 34);
}
function neeSubHtml(desc) {
  const d = String(desc || '').trim();
  if (!d) return '';
  const mdOnly = d.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
  if (mdOnly) {
    return `<a class="aw-nee-sub" href="${esc(mdOnly[2])}" target="_blank" rel="noopener noreferrer">${esc(mdOnly[1].trim())}</a>`;
  }
  if (/^https?:\/\/\S+$/i.test(d)) {
    return `<a class="aw-nee-sub" href="${esc(d)}" target="_blank" rel="noopener noreferrer">${esc(autoLinkLabel(d))}</a>`;
  }
  const tokRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/gi;
  let out = '', last = 0, m;
  while ((m = tokRe.exec(d))) {
    out += esc(d.slice(last, m.index));
    if (m[1] && m[2]) {
      out += `<a class="aw-nee-sub-a" href="${esc(m[2])}" target="_blank" rel="noopener noreferrer">${esc(m[1].trim())}</a>`;
    } else if (m[3]) {
      out += `<a class="aw-nee-sub-a" href="${esc(m[3])}" target="_blank" rel="noopener noreferrer">${esc(autoLinkLabel(m[3]))}</a>`;
    }
    last = tokRe.lastIndex;
  }
  out += esc(d.slice(last));
  return `<p class="aw-nee-sub">${out}</p>`;
}
function splitDescLink(desc) {
  const lines = String(desc || '').trim().split('\n');
  const last = (lines[lines.length - 1] || '').trim();
  const md = last.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
  if (md) return { text: lines.slice(0, -1).join('\n').trim(), label: md[1].trim(), url: md[2].trim() };
  if (/^https?:\/\/\S+$/i.test(last)) return { text: lines.slice(0, -1).join('\n').trim(), label: '', url: last };
  return { text: String(desc || '').trim(), label: '', url: '' };
}
function viewNom(id) {
  S.view = 'nom';
  clearInterval(cdT);
  revealObs?.disconnect();
  const n = S.noms.find(x => x.id === id);
  if (!n) { page.innerHTML = '<div class="aw-empty">Номинация не найдена. <a href="#/">Ко всем номинациям</a></div>'; return; }
  const list = neesOf(id), mine = S.votes.get(id), idx = S.noms.indexOf(n);
  const prev = S.noms[idx - 1], next = S.noms[idx + 1];
  const max = S.results ? Math.max(1, ...list.map(x => S.results.get(x.id) || 0)) : 1;
  const just = S.lastVoted; S.lastVoted = null;
  page.innerHTML = `<div class="aw-nom-wrap">
    <a class="aw-crumb" href="#/">← Все номинации</a>
    <section class="aw-nom-head">
      <div class="slay-emblem">${nomIconHtml(n, idx)}</div>
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
    <div class="aw-nees" data-nom-grid="${id}">${list.map((x, i) => {
      const on = mine === x.id, v = S.results?.get(x.id) || 0;
      const parts = partsOf(x), canOpenParts = parts.length > 0 || S.admin;
      return `<article class="aw-nee${on ? ' on' : ''}${just === x.id ? ' just-voted' : ''}${S.admin ? ' can-drag' : ''}" data-nee-id="${x.id}"${S.admin ? ' draggable="true"' : ''} style="--i:${i}">
        ${S.admin ? `<div class="aw-nee-adm"><span class="aw-btn icon aw-drag-grip" title="Перетащить номинанта">⠿</span><button type="button" class="aw-btn icon" data-open-parts="${x.id}" title="Участники">👥</button><button type="button" class="aw-btn icon" data-edit-nee="${x.id}" title="Изменить">✎</button><button type="button" class="aw-btn icon danger" data-del-nee="${x.id}" title="Удалить">✕</button></div>` : ''}
        ${mediaHtml(x, canOpenParts)}
        <div class="aw-nee-body">
          <h3>${esc(x.title)}</h3>
          ${neeSubHtml(x.description)}
          ${parts.length ? `<button type="button" class="aw-parts-btn" data-open-parts="${x.id}">Участники <span>${parts.length}</span></button>` : S.admin ? `<button type="button" class="aw-parts-btn is-empty" data-open-parts="${x.id}">＋ Участники</button>` : ''}
          ${S.results && S.showRes ? `<div class="aw-res"><div class="aw-res-bar"><i style="width:${v / max * 100}%"></i></div><span>${v} ${plural(v, 'голос', 'голоса', 'голосов')}</span></div>` : ''}
          <div class="aw-nee-line" aria-hidden="true"></div>
          <div class="aw-nee-acts">${n.is_open ? `<button class="slay-btn sm${on ? ' cancel' : mine ? ' dim' : ''}" data-vote="${x.id}">${on ? 'ОТМЕНИТЬ ВЫБОР' : 'ВЫБРАТЬ'}</button>` : on ? '<span class="slay-btn sm cancel static">✓ ВЫБРАНО</span>' : ''}</div>
        </div>
      </article>`;
    }).join('')}
    ${S.admin ? `<button class="aw-nee aw-add" data-add-nee="${id}"><span>＋</span>Добавить номинанта<small>фото, гиф, видео или ссылка</small></button>` : ''}</div>
    ${!list.length && !S.admin ? '<div class="aw-empty">Номинанты скоро появятся.</div>' : ''}
    <nav class="aw-pager">${prev ? `<a href="#/n/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/n/${next.id}">${esc(next.title)} →</a>` : ''}</nav>
  </div>`;
  page.querySelectorAll('.aw-media.is-img img').forEach(img => {
    const check = () => {
      if (img.naturalWidth && img.naturalHeight && img.naturalWidth / img.naturalHeight >= 1.32) {
        img.closest('.aw-media')?.classList.add('is-wide');
      }
    };
    if (img.complete) check();
    else img.addEventListener('load', check, { once: true });
  });
  if (S.admin) initNeeDrag(id);
}

/* ── перетаскивание номинантов для смены порядка (модераторы) ── */
function initNeeDrag(nomId) {
  const grid = page.querySelector(`.aw-nees[data-nom-grid="${nomId}"]`);
  if (!grid) return;
  let dragEl = null, startOrder = '';
  const idsNow = () => [...grid.querySelectorAll('.aw-nee[data-nee-id]')].map(el => el.dataset.neeId);

  grid.addEventListener('dragstart', e => {
    if (e.target.closest('button, a, input, textarea, video, iframe')) { e.preventDefault(); return; }
    const card = e.target.closest('.aw-nee[data-nee-id]');
    if (!card) return;
    dragEl = card;
    startOrder = idsNow().join(',');
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', card.dataset.neeId); } catch {}
  });
  grid.addEventListener('dragover', e => {
    if (!dragEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.aw-nee[data-nee-id]');
    if (!target || target === dragEl) return;
    const cards = [...grid.querySelectorAll('.aw-nee[data-nee-id]')];
    const from = cards.indexOf(dragEl), to = cards.indexOf(target);
    if (from < 0 || to < 0) return;
    if (from < to) grid.insertBefore(dragEl, target.nextSibling);
    else grid.insertBefore(dragEl, target);
  });
  grid.addEventListener('drop', e => { if (dragEl) e.preventDefault(); });
  grid.addEventListener('dragend', async () => {
    if (!dragEl) return;
    dragEl.classList.remove('is-dragging');
    dragEl = null;
    S.justDragged = true;
    setTimeout(() => { S.justDragged = false; }, 120);
    const orderedIds = idsNow();
    if (orderedIds.join(',') === startOrder) return;
    const changed = [];
    orderedIds.forEach((neeId, i) => {
      const item = S.nees.find(y => y.id === neeId);
      const pos = i + 1;
      if (item && item.position !== pos) {
        item.position = pos;
        changed.push({ id: neeId, position: pos });
      }
    });
    if (!changed.length) return;
    try {
      await Promise.all(changed.map(c => api(`aw_nominees?id=eq.${c.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { position: c.position } })));
      toast('Порядок сохранён');
    } catch (er) {
      toast('Не удалось сохранить порядок: ' + er.message, true);
      await loadAll(); route();
    }
  });
}

/* ── модалка участников внутри номинанта (без голосования за них) ── */
async function saveNomineeParts(nomineeId, nextParts) {
  await api(`aw_nominees?id=eq.${nomineeId}`, { method: 'PATCH', prefer: 'return=minimal', body: { participants: nextParts } });
  const x = S.nees.find(y => y.id === nomineeId);
  if (x) x.participants = nextParts;
}

function partEditDialog(nomineeId, existingPart, onDone) {
  let file = null;
  const oldPhoto = existingPart?.photo || '';
  const f = modal(`<h2>${existingPart ? 'Изменить участника' : 'Новый участник'}</h2>
    <label>Имя / ник<input name="n" maxlength="80" required value="${esc(existingPart?.name || '')}" placeholder="Например: Renamid"></label>
    <div class="aw-row">
      <label style="flex:0 0 40%">Подпись ссылки<input name="lt" maxlength="50" value="${esc(existingPart?.label || '')}" placeholder="Twitch / Канал"></label>
      <label>Ссылка на канал<input name="lu" maxlength="400" value="${esc(existingPart?.url || '')}" placeholder="https://twitch.tv/..."></label>
    </div>
    <div class="aw-media-pick"><span>Фото участника</span>
      <label class="aw-drop"><input type="file" accept="image/*" hidden><b>${oldPhoto ? 'Заменить фото' : 'Загрузить фото'}</b><small>до 15 МБ · Ctrl+V из буфера или перетащи сюда</small></label>
      <div class="aw-or">или ссылка на картинку</div>
      <div class="aw-row"><input name="u" placeholder="https://..." value="${esc(oldPhoto)}"><button type="button" class="aw-btn danger" data-clear-media${oldPhoto ? '' : ' hidden'}>Удалить фото</button></div>
      <div class="aw-prev"></div></div>`, async (f, say) => {
    const name = f.n.value.trim();
    if (!name) throw new Error('Укажи имя или ник');
    const url = f.lu.value.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) throw new Error('Ссылка на канал должна начинаться с https://');
    const label = f.lt.value.trim().slice(0, 50);
    let photo = f.u.value.trim();
    if (file) {
      photo = await upload(file, p => say(`Загрузка: ${p}%`));
    } else if (photo && !/^https:\/\//i.test(photo)) {
      throw new Error('Ссылка на фото должна начинаться с https://');
    }
    const x = S.nees.find(y => y.id === nomineeId);
    if (!x) throw new Error('Номинант не найден');
    const cur = partsOf(x).slice();
    const entry = {
      id: existingPart?.id || ('p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)),
      name,
      photo: photo || '',
      url: url || '',
      label: label || '',
    };
    if (existingPart) {
      const idx = cur.findIndex(p => p.id === existingPart.id);
      if (idx >= 0) cur[idx] = entry; else cur.push(entry);
    } else {
      cur.push(entry);
    }
    await saveNomineeParts(nomineeId, cur);
    if (oldPhoto && oldPhoto !== photo) await delServerMedia({ awardUrl: oldPhoto });
    toast(existingPart ? 'Участник обновлён' : 'Участник добавлен');
    onDone?.();
  });
  f.closest('.aw-ov')?.classList.add('aw-ov-top');
  const fi = $('input[type=file]', f), pv = $('.aw-prev', f), clr = $('[data-clear-media]', f), drop = $('.aw-drop', f);
  if (oldPhoto) pv.innerHTML = `<img src="${esc(thumb(oldPhoto, 560))}" alt="">`;
  function pickFile(raw, fromPaste = false) {
    if (!raw) return;
    if (!/^image\//.test(raw.type || '')) return toast('Поддерживаются только изображения (PNG, JPG, WebP, GIF)', true);
    if (raw.size > 15 * 1048576) return toast('Файл больше 15 МБ', true);
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[raw.type] || 'png';
    const fname = !raw.name || /^image\.\w+$/i.test(raw.name) ? `part_${Date.now()}.${ext}` : raw.name;
    file = fname === raw.name ? raw : new File([raw], fname, { type: raw.type });
    const u = URL.createObjectURL(file); f.u.value = ''; clr.hidden = false;
    pv.innerHTML = `<img src="${u}" alt="">`;
    $('b', drop).textContent = fromPaste ? `Из буфера (${fname})` : fname;
    if (fromPaste) toast('Фото вставлено из буфера обмена');
  }
  clr.onclick = () => { file = null; fi.value = ''; f.u.value = ''; pv.innerHTML = ''; clr.hidden = true; $('b', drop).textContent = 'Загрузить фото'; };
  f.u.oninput = () => { clr.hidden = !f.u.value.trim() && !file; };
  fi.onchange = () => pickFile(fi.files[0]);
  const onPaste = ev => {
    if (!f.isConnected) { document.removeEventListener('paste', onPaste); return; }
    const items = [...(ev.clipboardData?.items || [])];
    const mediaItem = items.find(it => it.kind === 'file' && /^image\//.test(it.type));
    const pasted = mediaItem?.getAsFile() || [...(ev.clipboardData?.files || [])].find(fl => /^image\//.test(fl.type));
    if (!pasted) return;
    ev.preventDefault();
    pickFile(pasted, true);
  };
  document.addEventListener('paste', onPaste);
  drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', ev => {
    ev.preventDefault(); drop.classList.remove('drag');
    const dropped = ev.dataTransfer?.files?.[0];
    if (dropped) pickFile(dropped);
  });
}

function openPartsModal(nomineeId) {
  const x0 = S.nees.find(y => y.id === nomineeId);
  if (!x0) return;
  if (!S.admin && !partsOf(x0).length) return;
  const ov = document.createElement('div');
  ov.className = 'aw-ov';
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.aw-ov-top')) close(); };
  document.addEventListener('keydown', onKey);

  function render() {
    const x = S.nees.find(y => y.id === nomineeId);
    if (!x) return close();
    const parts = partsOf(x);
    ov.innerHTML = `<div class="aw-modal aw-parts-modal" role="dialog" aria-modal="true">
      <div class="aw-parts-head">
        <div>
          <div class="aw-kicker">Участники${parts.length ? ` · ${parts.length}` : ''}</div>
          <h2>${esc(x.title)}</h2>
        </div>
        <button type="button" class="aw-btn icon" data-close-parts title="Закрыть">✕</button>
      </div>
      ${!parts.length && !S.admin ? '<p class="aw-parts-empty">Участники пока не добавлены.</p>' : ''}
      <div class="aw-parts-grid">${parts.map(p => `<article class="aw-part-card${S.admin ? ' can-drag' : ''}" data-part-id="${esc(p.id)}"${S.admin ? ' draggable="true"' : ''}>
        ${S.admin ? `<div class="aw-part-adm"><span class="aw-btn icon aw-drag-grip" title="Перетащить">⠿</span><button type="button" class="aw-btn icon" data-edit-part="${esc(p.id)}" title="Изменить">✎</button><button type="button" class="aw-btn icon danger" data-del-part="${esc(p.id)}" title="Удалить">✕</button></div>` : ''}
        <div class="aw-part-media">${p.photo ? `<img src="${esc(thumb(p.photo, 560))}" alt="${esc(p.name)}" loading="lazy" draggable="false">` : `<div class="aw-part-ph">${esc((p.name || '?').slice(0, 1).toUpperCase())}</div>`}</div>
        <div class="aw-part-info">
          <h4>${esc(p.name)}</h4>
          ${p.url ? `<a class="aw-part-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.label || autoLinkLabel(p.url))} ↗</a>` : ''}
        </div>
      </article>`).join('')}
      ${S.admin ? `<button type="button" class="aw-part-card aw-part-add" data-add-part><span>＋</span><b>Добавить участника</b><small>фото и ссылка на канал</small></button>` : ''}
      </div>
    </div>`;

    if (S.admin) {
      const grid = $('.aw-parts-grid', ov);
      let dragEl = null, startOrder = '';
      const idsNow = () => [...grid.querySelectorAll('.aw-part-card[data-part-id]')].map(el => el.dataset.partId);
      grid.addEventListener('dragstart', e => {
        if (e.target.closest('button, a, input')) { e.preventDefault(); return; }
        const card = e.target.closest('.aw-part-card[data-part-id]');
        if (!card) return;
        dragEl = card; startOrder = idsNow().join(',');
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.partId); } catch {}
      });
      grid.addEventListener('dragover', e => {
        if (!dragEl) return;
        e.preventDefault();
        const target = e.target.closest('.aw-part-card[data-part-id]');
        if (!target || target === dragEl) return;
        const cards = [...grid.querySelectorAll('.aw-part-card[data-part-id]')];
        const from = cards.indexOf(dragEl), to = cards.indexOf(target);
        if (from < 0 || to < 0) return;
        if (from < to) grid.insertBefore(dragEl, target.nextSibling);
        else grid.insertBefore(dragEl, target);
      });
      grid.addEventListener('drop', e => { if (dragEl) e.preventDefault(); });
      grid.addEventListener('dragend', async () => {
        if (!dragEl) return;
        dragEl.classList.remove('is-dragging');
        dragEl = null;
        const ids = idsNow();
        if (ids.join(',') === startOrder) return;
        const cur = partsOf(S.nees.find(y => y.id === nomineeId));
        const byId = new Map(cur.map(p => [p.id, p]));
        const nextParts = ids.map(id => byId.get(id)).filter(Boolean);
        try {
          await saveNomineeParts(nomineeId, nextParts);
          toast('Порядок участников сохранён');
        } catch (er) {
          toast('Ошибка: ' + er.message, true);
          render();
        }
      });
    }
  }

  ov.addEventListener('click', async e => {
    if (e.target === ov || e.target.closest('[data-close-parts]')) return close();
    if (!S.admin) return;
    if (e.target.closest('[data-add-part]')) {
      return partEditDialog(nomineeId, null, () => { render(); route(); });
    }
    const ep = e.target.closest('[data-edit-part]');
    if (ep) {
      const x = S.nees.find(y => y.id === nomineeId);
      const p = partsOf(x).find(i => i.id === ep.dataset.editPart);
      if (p) partEditDialog(nomineeId, p, () => { render(); route(); });
      return;
    }
    const dp = e.target.closest('[data-del-part]');
    if (dp) {
      if (!confirm('Удалить участника?')) return;
      const x = S.nees.find(y => y.id === nomineeId);
      const cur = partsOf(x);
      const target = cur.find(i => i.id === dp.dataset.delPart);
      const nextParts = cur.filter(i => i.id !== dp.dataset.delPart);
      try {
        await saveNomineeParts(nomineeId, nextParts);
        if (target?.photo) await delServerMedia({ awardUrl: target.photo });
        toast('Участник удалён');
        render(); route();
      } catch (er) { toast(er.message, true); }
    }
  });

  render();
  document.body.append(ov);
}

/* ── голос ── */
async function vote(id) {
  if (!S.uid) return toast('Войдите на renah0cki, чтобы голосовать', true);
  const x = S.nees.find(y => y.id === id); if (!x) return;
  try {
    const r = await rpc('aw_vote', { p_nominee: id });
    if (r) { S.votes.set(x.nomination_id, r); S.lastVoted = r; toast('Голос учтён'); } else { S.votes.delete(x.nomination_id); toast('Голос снят'); }
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
  const curIdx = n ? Math.max(0, S.noms.indexOf(n)) : S.noms.length;
  let picked = resolveSlayIcon(n || {}, curIdx);
  const f = modal(`<h2>${n ? 'Изменить номинацию' : 'Новая номинация'}</h2>
    <label>Название<input name="t" maxlength="120" required value="${esc(n?.title || '')}" placeholder="Мем года"></label>
    <div class="aw-ico-field"><span>Иконка номинации</span>
      <input type="hidden" name="e" value="${esc(picked)}">
      <div class="aw-ico-pick">${SLAY_ICONS.map(([k, file, label]) => `<button type="button" class="aw-ico-opt${k === picked ? ' on' : ''}" data-ico="${k}" title="${esc(label)}"><img src="/awards/icons/${file}?v=1" alt="${esc(label)}" draggable="false"></button>`).join('')}</div>
    </div>
    <label>Описание (необязательно)<textarea name="d" rows="2" maxlength="600">${esc(n?.description || '')}</textarea></label>`, async f => {
    const body = { title: f.t.value.trim(), emoji: f.e.value.trim() || null, description: f.d.value.trim() || null };
    if (n) await api(`aw_nominations?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body });
    else await api('aw_nominations', { method: 'POST', prefer: 'return=minimal', body: { ...body, position: (Math.max(0, ...S.noms.map(x => x.position)) + 1) } });
    toast('Сохранено'); await loadAll(); route();
  });
  $('.aw-ico-pick', f).addEventListener('click', ev => {
    const btn = ev.target.closest('[data-ico]'); if (!btn) return;
    picked = btn.dataset.ico;
    f.e.value = picked;
    f.querySelectorAll('.aw-ico-opt').forEach(b => b.classList.toggle('on', b === btn));
  });
}
function neeDialog(nomId, x) {
  let file = null;
  const oldUrl = x?.media_url || '';
  const parsed = splitDescLink(x?.description);
  const f = modal(`<h2>${x ? 'Изменить номинанта' : 'Новый номинант'}</h2>
    <label>Название / ник<input name="t" maxlength="120" required value="${esc(x?.title || '')}"></label>
    <div class="aw-row">
      <label style="flex:0 0 42%">Подпись ссылки<input name="lt" maxlength="60" value="${esc(parsed.label)}" placeholder="TwitchTracker / Канал"></label>
      <label>Гиперссылка (необязательно)<input name="lu" maxlength="400" value="${esc(parsed.url)}" placeholder="https://twitchtracker.com/..."></label>
    </div>
    <label>Описание (необязательно, можно [текст](https://...))<textarea name="d" rows="2" maxlength="550" placeholder="Дополнительный текст">${esc(parsed.text)}</textarea></label>
    <div class="aw-media-pick"><span>Медиа</span>
      <label class="aw-drop"><input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden><b>${oldUrl ? 'Заменить фото, гиф или видео' : 'Загрузить фото, гиф или видео'}</b><small>до 30 МБ · Ctrl+V из буфера или перетащи сюда</small></label>
      <div class="aw-or">или ссылка</div>
      <div class="aw-row"><input name="u" placeholder="YouTube, ссылка на картинку (7TV и т.п.) или любая ссылка" value="${esc(oldUrl)}"><button type="button" class="aw-btn danger" data-clear-media${oldUrl ? '' : ' hidden'}>Удалить фото</button></div>
      <div class="aw-prev"></div></div>`, async (f, say) => {
    let url = f.u.value.trim(), type = 'none';
    if (file) { url = await upload(file, p => say(`Загрузка: ${p}%`)); type = /^video\//.test(file.type) ? 'video' : 'image'; }
    else if (url) {
      if (!/^https:\/\//.test(url)) throw new Error('Ссылка должна начинаться с https://');
      type = ytId(url) ? 'youtube' : /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url) || /cdn\.7tv\.app\/emote\//.test(url) ? 'image' : /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'link';
    }
    const lu = f.lu.value.trim(), lt = f.lt.value.trim().replace(/[\[\]()]/g, '');
    if (lu && !/^https?:\/\/\S+$/i.test(lu)) throw new Error('Гиперссылка должна начинаться с https://');
    const linkPart = lu ? (lt ? `[${lt}](${lu})` : lu) : '';
    const descFull = [f.d.value.trim(), linkPart].filter(Boolean).join('\n').slice(0, 600) || null;
    const body = { title: f.t.value.trim(), description: descFull, media_url: url || null, media_type: url ? type : 'none' };
    if (x) {
      await api(`aw_nominees?id=eq.${x.id}`, { method: 'PATCH', prefer: 'return=minimal', body });
      if (oldUrl && oldUrl !== url) await delServerMedia({ awardUrl: oldUrl });
    } else {
      await api('aw_nominees', { method: 'POST', prefer: 'return=minimal', body: { ...body, nomination_id: nomId, position: neesOf(nomId).length + 1 } });
    }
    toast('Сохранено'); await loadAll(); route();
  });
  const fi = $('input[type=file]', f), pv = $('.aw-prev', f), clr = $('[data-clear-media]', f), drop = $('.aw-drop', f);
  const showCur = () => {
    if (oldUrl && x?.media_type === 'image') pv.innerHTML = `<img src="${esc(thumb(oldUrl, 720))}" alt="">`;
    else if (oldUrl && x?.media_type === 'video') pv.innerHTML = `<video src="${esc(oldUrl)}" muted controls></video>`;
  };
  showCur();
  function pickFile(raw, fromPaste = false) {
    if (!raw) return;
    if (!/^(image\/|video\/(mp4|webm|quicktime))/.test(raw.type || '')) return toast('Поддерживаются фото, GIF и видео (MP4/WebM/MOV)', true);
    if (raw.size > 30 * 1048576) return toast('Файл больше 30 МБ', true);
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' })[raw.type] || 'png';
    const name = !raw.name || /^image\.\w+$/i.test(raw.name) ? `paste_${Date.now()}.${ext}` : raw.name;
    file = name === raw.name ? raw : new File([raw], name, { type: raw.type });
    const u = URL.createObjectURL(file); f.u.value = ''; clr.hidden = false;
    pv.innerHTML = /^video/.test(file.type) ? `<video src="${u}" muted controls></video>` : `<img src="${u}" alt="">`;
    $('b', drop).textContent = fromPaste ? `Из буфера (${name})` : name;
    if (fromPaste) toast('Фото вставлено из буфера обмена');
  }
  clr.onclick = () => { file = null; fi.value = ''; f.u.value = ''; pv.innerHTML = ''; clr.hidden = true; $('b', drop).textContent = 'Загрузить фото, гиф или видео'; };
  f.u.oninput = () => { clr.hidden = !f.u.value.trim() && !file; };
  fi.onchange = () => pickFile(fi.files[0]);
  const onPaste = ev => {
    if (!f.isConnected) { document.removeEventListener('paste', onPaste); return; }
    const items = [...(ev.clipboardData?.items || [])];
    const mediaItem = items.find(it => it.kind === 'file' && /^(image\/|video\/)/.test(it.type));
    const pasted = mediaItem?.getAsFile() || [...(ev.clipboardData?.files || [])].find(fl => /^(image\/|video\/)/.test(fl.type));
    if (!pasted) return;
    ev.preventDefault();
    pickFile(pasted, true);
  };
  document.addEventListener('paste', onPaste);
  drop.addEventListener('dragover', ev => { ev.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', ev => {
    ev.preventDefault(); drop.classList.remove('drag');
    const dropped = ev.dataTransfer?.files?.[0];
    if (dropped) pickFile(dropped);
  });
}

function jumpTo(id) {
  const go = () => { const el = $(`#sec-${id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  if (location.hash && location.hash !== '#/' && location.hash !== '#') {
    S.homeScroll = 0;
    location.hash = '#/';
    setTimeout(go, 70);
  } else go();
}
document.addEventListener('click', e => {
  const j = e.target.closest('[data-jump]');
  if (j) { e.preventDefault(); jumpTo(j.dataset.jump); return; }
  // запоминаем позицию скролла на главной перед переходом в номинацию
  const nomLink = e.target.closest('a[href^="#/n/"]');
  if (nomLink && S.view === 'home') S.homeScroll = window.scrollY;
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
  const op = t.closest('[data-open-parts]');
  if (op) {
    if (S.justDragged) return;
    return openPartsModal(op.dataset.openParts);
  }
  const z = t.closest('[data-zoom]'); if (z) { const ov = document.createElement('div'); ov.className = 'aw-ov aw-zoom'; ov.innerHTML = `<img src="${esc(z.dataset.zoom)}" alt="">`; ov.onclick = () => ov.remove(); document.body.append(ov); return; }
  if (!S.admin) return;
  if (t.closest('[data-add-nom]')) return nomDialog(null);
  const en = t.closest('[data-edit-nom]'); if (en) return nomDialog(S.noms.find(x => x.id === en.dataset.editNom));
  const tn = t.closest('[data-toggle-nom]');
  if (tn) { const n = S.noms.find(x => x.id === tn.dataset.toggleNom); await api(`aw_nominations?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { is_open: !n.is_open } }).catch(er => toast(er.message, true)); await loadAll(); return route(); }
  const dn = t.closest('[data-del-nom]');
  if (dn) {
    if (!confirm('Удалить номинацию вместе с номинантами, фото и голосами?')) return;
    for (const nee of neesOf(dn.dataset.delNom)) {
      for (const p of partsOf(nee)) if (p.photo) await delServerMedia({ awardUrl: p.photo });
    }
    await delServerMedia({ awardNominationId: dn.dataset.delNom });
    await api(`aw_nominations?id=eq.${dn.dataset.delNom}`, { method: 'DELETE' }).catch(er => toast(er.message, true));
    await loadAll(); location.hash = '#/'; return;
  }
  const an = t.closest('[data-add-nee]'); if (an) return neeDialog(an.dataset.addNee, null);
  const ee = t.closest('[data-edit-nee]'); if (ee) { const x = S.nees.find(y => y.id === ee.dataset.editNee); return neeDialog(x.nomination_id, x); }
  const de = t.closest('[data-del-nee]');
  if (de) {
    if (!confirm('Удалить номинанта и его фото?')) return;
    const x = S.nees.find(y => y.id === de.dataset.delNee);
    for (const p of partsOf(x)) if (p.photo) await delServerMedia({ awardUrl: p.photo });
    await delServerMedia({ awardNomineeId: de.dataset.delNee });
    await api(`aw_nominees?id=eq.${de.dataset.delNee}`, { method: 'DELETE' }).catch(er => toast(er.message, true));
    await loadAll(); return route();
  }
});
page.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const op = e.target.closest('[role="button"][data-open-parts]');
  if (op) { e.preventDefault(); openPartsModal(op.dataset.openParts); }
});
page.addEventListener('change', e => {
  if (e.target.matches('[data-show-res]')) { S.showRes = e.target.checked; route(); }
  if (e.target.matches('[data-flat-grid]')) { S.flatGrid = e.target.checked; route(); }
});

/* ── свайп карусели на телефоне ── */
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

/* ── лёгкий параллакс фонового кристалла на скролле ── */
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let praf = 0;
  addEventListener('scroll', () => {
    if (praf || S.view !== 'home') return;
    praf = requestAnimationFrame(() => {
      praf = 0;
      const bg = $('.slay-hero-bg');
      if (bg && scrollY < innerHeight * 1.2) bg.style.transform = `translate3d(0,${(scrollY * 0.16).toFixed(1)}px,0)`;
    });
  }, { passive: true });
}

/* ── роутер ── */
function route(fromNav = false) {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'n' && p[1]) {
    viewNom(p[1]);
    if (fromNav) window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    viewHome(fromNav);
  }
}
addEventListener('hashchange', () => route(true));
page.innerHTML = `<div class="aw-load"><div class="aw-load-cr">${nomIconHtml({ emoji: 'i:king' }, 0)}</div></div>`;
loadMe().then(ok => { if (!ok) return; return loadAll().then(route); }).catch(e => { page.innerHTML = `<div class="aw-empty">Не удалось загрузить: ${esc(e.message)}</div>`; });
})();
