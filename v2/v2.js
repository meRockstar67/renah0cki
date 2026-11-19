/* renah0cki v2 — новый дизайн. Vanilla JS, данные — та же база Supabase, что у основного сайта. */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LS_SESSION = 'fh_session';
const PAGE = 24;
const COIN = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace('.0', '') + 'm';   // 1.9m
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.0', '') + 'k';   // 19.5k, 125k
  return n.toLocaleString('ru-RU');
};
const page = $('#page');
let toastT;
function toast(msg, err = false) { const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }

const I = {
  eye: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.5.8-1.6 2.2-3.2 3.5M6.5 7.6C4.6 8.9 3.2 10.7 2.5 12c1 1.5 4.5 6 9.5 6 1.4 0 2.7-.3 3.8-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  views: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9-9.3C2 7.3 4.3 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3 0 5.3 2.8 4.3 6.2-1.5 4.7-9 9.3-9 9.3z"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M4.5 11.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7-3.4 7-7.5 7c-1 0-2-.2-2.9-.5L5 19.5l1-3.4a6.6 6.6 0 0 1-1.5-4.6z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M6 5h12M12 5v14"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};

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
      const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refreshToken }) });
      if (!r.ok) { const f = readSession(); return f?.token && jwtExp(f.token) - Date.now() > 60e3 ? f.token : null; }
      const d = await r.json();
      localStorage.setItem(LS_SESSION, JSON.stringify({ ...(readSession() || s), token: d.access_token, refreshToken: d.refresh_token }));
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
  const txt = await r.text(); let d = null;
  try { d = txt ? JSON.parse(txt) : null; } catch { d = txt; }
  if (!r.ok) throw new Error(d?.message || ('HTTP ' + r.status));
  return d;
}
const rpc = (fn, args = {}) => api('rpc/' + fn, { method: 'POST', body: args });

/* ── кэш: сначала показываем сохранённое, потом тихо обновляем ── */
const CDN_URL = 'https://cdn.renah0cki.xyz';
const MEM = new Map();
const LSC = 'v2c:';
function cacheGet(k) {
  if (MEM.has(k)) return MEM.get(k);
  try { const v = JSON.parse(localStorage.getItem(LSC + k) || 'null'); if (v) MEM.set(k, v); return v; } catch { return null; }
}
function cacheSet(k, v, persist = true) {
  MEM.set(k, v);
  if (!persist) return;
  try { localStorage.setItem(LSC + k, JSON.stringify(v)); }
  catch { try { Object.keys(localStorage).filter(x => x.startsWith(LSC)).forEach(x => localStorage.removeItem(x)); } catch {} }
}
// fetcher → данные; onData(данные, изКэша). Повторный показ только если данные изменились.
async function swr(key, fetcher, onData, { persist = true } = {}) {
  const hit = cacheGet(key);
  if (hit) onData(hit, true);
  let fresh;
  try { fresh = await fetcher(); } catch (e) { if (!hit) throw e; return hit; }
  const changed = !hit || JSON.stringify(hit) !== JSON.stringify(fresh);
  cacheSet(key, fresh, persist);
  if (changed) onData(fresh, false);
  return fresh;
}
// превью картинок с нашего cdn (сервер делает лёгкий webp); для чужих ссылок — оригинал
function thumbUrl(u, w) {
  const m = String(u || '').match(/^https:\/\/cdn\.renah0cki\.xyz\/file\/(.+)$/);
  return m && /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(m[1]) ? `${CDN_URL}/thumb/${w}/${m[1]}` : u;
}
const imgTag = (u, w, extra = '') => {
  const t = thumbUrl(u, w);
  return `<img class="fade" onload="this.classList.add('ld')" src="${esc(t)}"${t !== u ? ` data-full="${esc(u)}" onerror="this.onerror=null;this.src=this.dataset.full"` : ''} alt="" loading="lazy" decoding="async"${extra}>`;
};

/* ── состояние ── */
const S = {
  uid: readSession()?.user?.id || null,
  me: null,
  profiles: new Map(),           // кэш профилей авторов
  liked: new Set(),               // мои лайки (content)
  feed: { key: '', items: [], done: false, loading: false },
  items: new Map(),               // посты, уже показанные в лентах (для мгновенного открытия)
};
// автор приходит вместе с постом (один запрос вместо двух)
const AUTHOR = 'author:profiles!content_submitted_by_fkey(id,username,display_name,avatar_url)';
const CARD_SEL = `id,short_code,title,description,source_url,cover_image_url,media_items,content_type,submitted_by,views,likes,comments_count,is_blurred,published_at,created_at,${AUTHOR}`;
function absorb(rows) {
  rows.forEach(r => {
    if (r.author) { S.profiles.set(r.author.id, { ...(S.profiles.get(r.author.id) || {}), ...r.author }); }
    S.items.set(r.id, r); if (r.short_code) S.items.set(r.short_code, r);
  });
  return rows;
}
// мои лайки — один раз на старте, дальше без запросов на каждую страницу
let likesReady = null;
function loadAllMyLikes() {
  if (!S.uid) return Promise.resolve();
  return likesReady ||= api(`content_likes?user_id=eq.${S.uid}&select=content_id&order=created_at.desc&limit=5000`).then(r => r.forEach(x => S.liked.add(x.content_id))).catch(() => {});
}
async function loadProfiles(ids) {
  const need = [...new Set(ids.filter(id => id && !S.profiles.has(id)))];
  for (let i = 0; i < need.length; i += 80) {
    const rows = await api(`profiles?id=in.(${need.slice(i, i + 80).join(',')})&select=id,username,display_name,avatar_url,name_color,short_code`).catch(() => []);
    rows.forEach(p => S.profiles.set(p.id, p));
  }
}
async function loadMyLikes(ids) {
  if (!S.uid || !ids.length) return;
  const rows = await api(`content_likes?user_id=eq.${S.uid}&content_id=in.(${ids.join(',')})&select=content_id`).catch(() => []);
  rows.forEach(r => S.liked.add(r.content_id));
}
const pname = p => p?.display_name || p?.username || 'без имени';
const avatarUrl = p => p?.avatar_url || COIN;

/* ── время ── */
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function when(ts) {
  const d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
  const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dd = (day(now) - day(d)) / 864e5;
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
  if (dd === 0) return 'сегодня в ' + t;
  if (dd === 1) return 'вчера в ' + t;
  if (dd < 7) return Math.round(dd) + ' дн назад';
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

/* ── медиа ── */
const ytId = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([A-Za-z0-9_-]{11})/) || [])[1] || null;
const isOwnFile = u => /^https:\/\/(cdn\.renah0cki\.xyz|[^/]*backblazeb2\.com)\//.test(u || '');
const isVideoFile = u => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u || '');
function thumbHtml(it) {
  const src = it.source_url || '', cover = it.cover_image_url || '';
  const W = FEED.type === 'art' ? 720 : 480;
  if (it.content_type === 'fanfic') return `<div class="card-fanfic">${cover ? imgTag(cover, 480, ' style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35"') : ''}<p style="position:relative">${esc((it.description || '').slice(0, 220))}</p></div>`;
  if (it.content_type === 'video') {
    if (cover) return imgTag(cover, 480);
    const y = ytId(src); if (y) return `<img src="https://img.youtube.com/vi/${y}/mqdefault.jpg" alt="" loading="lazy" decoding="async">`;
    if (isOwnFile(src)) return `<video data-lazy="${esc(src)}#t=0.5" preload="none" muted playsinline tabindex="-1"></video>`;
    return '';
  }
  const first = src || (Array.isArray(it.media_items) && it.media_items[0]?.url) || cover;
  return first ? imgTag(first, W) : '';
}
const TYPE_BADGE = { video: [I.play, 'Видео'], fanfic: [I.text, 'Фанфик'], art: null };
function cardHtml(it) {
  const a = S.profiles.get(it.submitted_by) || it.author;
  const b = TYPE_BADGE[it.content_type];
  const liked = S.liked.has(it.id);
  return `<article class="card" data-open="${esc(it.short_code || it.id)}">
    <div class="card-media${it.is_blurred ? ' blur' : ''}">${thumbHtml(it)}
      ${it.is_blurred ? `<div class="eye">${I.eye}</div>` : ''}
      ${it.pinned ? `<span class="badge pin">${I.pin} Закреплено</span>` : ''}
      ${b ? `<span class="badge type">${b[0]} ${b[1]}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-author" data-user="${esc(a?.username || it.submitted_by)}"><img class="av" src="${esc(avatarUrl(a))}" alt="" loading="lazy"><span>${esc(pname(a))}</span></div>
      <h3 class="card-title">${esc(it.title || 'Без названия')}</h3>
      ${it.description && it.content_type !== 'fanfic' ? `<p class="card-desc">${esc(it.description)}</p>` : ''}
      <div class="card-stats">
        ${it.content_type === 'fanfic' ? '' : `<span title="Просмотры">${I.views}${fmt(it.views)}</span>`}
        <span class="${liked ? 'liked' : ''}" title="Лайки">${I.heart}${fmt(it.likes)}</span>
        ${it.content_type === 'fanfic' ? '' : `<span title="Комментарии">${I.comment}${fmt(it.comments_count)}</span>`}
        <time>${when(it.published_at || it.created_at)}</time>
      </div>
    </div>
  </article>`;
}

/* ── лента ── */
const FEED = { tab: 'all', type: 'all', sort: 'new', q: '' };
const TYPE_NAMES = { all: 'Все', art: 'Арты', video: 'Видео', fanfic: 'Фанфики' };
let subsIds = null;
async function feedQuery(offset) {
  let q = `content?status=eq.published&select=${CARD_SEL}`;
  if (FEED.type !== 'all') q += `&content_type=eq.${FEED.type}`;
  if (FEED.q) q += `&title=ilike.${encodeURIComponent('*' + FEED.q.replace(/[*,()]/g, ' ') + '*')}`;
  if (FEED.tab === 'subs') {
    if (!subsIds) subsIds = (await api(`subscriptions?follower_id=eq.${S.uid}&select=following_id`).catch(() => [])).map(r => r.following_id);
    if (!subsIds.length) return [];
    q += `&submitted_by=in.(${subsIds.join(',')})`;
  }
  q += FEED.sort === 'top' ? '&order=likes.desc,published_at.desc.nullslast' : '&order=published_at.desc.nullslast,created_at.desc';
  q += `&limit=${PAGE}&offset=${offset}`;
  return api(q);
}
function viewFeed(type) {
  FEED.type = type || 'all';
  setNav(type && type !== 'all' ? type : 'feed');
  page.innerHTML = `<div class="feed-bar">
      <div class="tabs" role="tablist"><button class="tab${FEED.tab === 'all' ? ' on' : ''}" data-tab="all">Все</button><button class="tab${FEED.tab === 'subs' ? ' on' : ''}" data-tab="subs">Подписки</button></div>
      <div class="filter-wrap"><button class="filter-btn" data-filter-toggle>${I.filter} Фильтрация</button>
        <div class="filter-pop" hidden>
          <h4>Тип</h4><div class="chips">${Object.entries(TYPE_NAMES).map(([k, v]) => `<button class="chip${FEED.type === k ? ' on' : ''}" data-ftype="${k}">${v}</button>`).join('')}</div>
          <h4>Сортировка</h4><div class="chips"><button class="chip${FEED.sort === 'new' ? ' on' : ''}" data-fsort="new">Новые</button><button class="chip${FEED.sort === 'top' ? ' on' : ''}" data-fsort="top">Популярные</button></div>
        </div></div>
    </div>
    <div class="grid${FEED.type === 'art' ? ' grid-art' : FEED.type === 'video' || FEED.type === 'fanfic' ? ' grid-big' : ''}" id="grid">${'<div class="skel"></div>'.repeat(8)}</div><div class="more" id="more"></div>`;
  S.feed = { key: JSON.stringify(FEED), items: [], done: false, loading: false };
  loadFirst();
}
function animateCards(root, from = 0) {
  if (!root) return;
  $$('.card', root).slice(from).forEach((c, i) => {
    c.style.setProperty('--i', Math.min(i, 14));
    c.classList.add('enter');
    c.addEventListener('animationend', () => c.classList.remove('enter'), { once: true });
  });
}
const feedEmpty = () => `<div class="empty" id="grid">${FEED.tab === 'subs' ? 'Тут появятся посты тех, на кого вы подписаны.' : FEED.q ? 'Ничего не найдено.' : 'Пока пусто.'}</div>`;
function renderGrid(rows) {
  const grid = $('#grid'); if (!grid) return;
  if (!rows.length) { grid.outerHTML = feedEmpty(); return; }
  if (grid.tagName !== 'DIV' || !grid.classList.contains('grid')) return;
  const first = !grid.querySelector('.card');
  grid.innerHTML = rows.map(cardHtml).join('');
  if (first) animateCards(grid);
  wireLazy(grid);
}
// первая страница: мгновенно из кэша, затем свежая (поиск не кэшируем)
async function loadFirst() {
  const f = S.feed, key = f.key;
  f.loading = true;
  const ck = 'feed:' + key;
  try {
    await swr(ck, async () => { await loadAllMyLikes(); return absorb(await feedQuery(0)); }, (rows, cached) => {
      if (key !== S.feed.key) return;
      absorb(rows); f.items = rows.slice(); f.done = rows.length < PAGE;
      renderGrid(rows);
    }, { persist: !FEED.q && FEED.tab === 'all' });
  } catch (e) { const g = $('#grid'); if (g) g.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; }
  finally { if (key === S.feed.key) f.loading = false; }
  if (key === S.feed.key && !FEED.q) idlePrefetch();
}
async function loadMore() {
  const f = S.feed; if (f.loading || f.done || !f.items.length) return;
  f.loading = true; const key = f.key;
  try {
    const rows = absorb(await feedQuery(f.items.length));
    if (key !== S.feed.key) return;
    f.items.push(...rows); f.done = rows.length < PAGE;
    const grid = $('#grid'); if (!grid) return;
    const tmp = document.createElement('div'); tmp.innerHTML = rows.map(cardHtml).join('');
    wireLazy(tmp); const n0 = grid.children.length; grid.append(...tmp.children); animateCards(grid, n0);
  } catch {}
  finally { if (key === S.feed.key) f.loading = false; }
}
// видео без обложки начинают грузиться только когда карточка рядом с экраном
const lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const v = e.target; lazyIO.unobserve(v); v.preload = 'metadata'; v.src = v.dataset.lazy;
}), { rootMargin: '300px' }) : null;
function wireLazy(root) { $$('video[data-lazy]', root).forEach(v => { if (lazyIO) lazyIO.observe(v); else { v.preload = 'metadata'; v.src = v.dataset.lazy; } }); }
// предзагрузка соседних разделов, пока пользователь смотрит текущий
let prefetched = false;
function idlePrefetch() {
  if (prefetched) return; prefetched = true;
  const idle = cb => setTimeout(cb, 600); // requestIdleCallback может не сработать в фоновой вкладке
  idle(async () => {
    for (const t of ['art', 'video', 'fanfic', 'all']) {
      const k = 'feed:' + JSON.stringify({ tab: 'all', type: t, sort: 'new', q: '' });
      if (MEM.has(k) && t !== 'all') continue;
      try {
        let q = `content?status=eq.published&select=${CARD_SEL}`;
        if (t !== 'all') q += `&content_type=eq.${t}`;
        q += `&order=published_at.desc.nullslast,created_at.desc&limit=${PAGE}&offset=0`;
        if (!MEM.has(k)) cacheSet(k, absorb(await api(q)));
      } catch {}
    }
    prefetchNewsSuggest();
  });
}
addEventListener('scroll', () => {
  if (!$('#grid')) return;
  if (innerHeight + scrollY > document.body.scrollHeight - 1400) loadMore();
}, { passive: true });

page.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { FEED.tab = tab.dataset.tab; subsIds = null; return viewFeed(FEED.type); }
  if (e.target.closest('[data-filter-toggle]')) { const p = $('.filter-pop', page); p.hidden = !p.hidden; $('[data-filter-toggle]', page).classList.toggle('on', !p.hidden); return; }
  const ft = e.target.closest('[data-ftype]');
  if (ft) { const t = ft.dataset.ftype; location.hash = t === 'all' ? '#/' : '#/' + t; return; }
  const fs = e.target.closest('[data-fsort]');
  if (fs) { FEED.sort = fs.dataset.fsort; return viewFeed(FEED.type); }
  const card = e.target.closest('[data-open]');
  if (card) { openLightbox(card.dataset.open); }
});
document.addEventListener('click', e => {
  if (!e.target.closest('.filter-wrap')) $$('.filter-pop').forEach(p => { p.hidden = true; });
  if (!e.target.closest('.me-wrap')) $('#meMenu').hidden = true;
});
let searchT;
$('#searchInput').addEventListener('input', e => {
  clearTimeout(searchT);
  searchT = setTimeout(() => { FEED.q = e.target.value.trim(); if (!location.hash.match(/^#\/(art|video|fanfic)?$/) && location.hash !== '') location.hash = '#/'; else viewFeed(FEED.type); }, 350);
});

/* ── страница поста ── */
async function viewPost(key, root = page) {
  const inLb = root !== page;
  if (!inLb) setNav('');
  let it = S.items.get(key);
  if (!it) {
    root.innerHTML = `<div class="post"><div class="skel" style="aspect-ratio:16/9"></div></div>`;
    try {
      const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `short_code=eq.${encodeURIComponent(key)}`;
      [it] = absorb(await api(`content?${f}&select=*,${AUTHOR}`));
    } catch (e) { root.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; return; }
    if (!it) { root.innerHTML = '<div class="empty">Пост не найден</div>'; return; }
    if (inLb && LB.key !== key) return;
    await loadAllMyLikes();
  } else {
    // теги и прочие поля догружаем в фоне, показ — сразу
    api(`content?id=eq.${it.id}&select=tags`).then(([r]) => { if (r?.tags?.length && !$('.post .tags') && $('.post h1')) { it.tags = r.tags; $('.post h1').insertAdjacentHTML('afterend', `<div class="tags">${r.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`); } }).catch(() => {});
  }
  const a = S.profiles.get(it.submitted_by) || it.author;
  const src = it.source_url || '';
  let media = '';
  if (it.content_type === 'video') {
    const y = ytId(src);
    media = y ? `<iframe src="https://www.youtube.com/embed/${y}" allowfullscreen loading="lazy"></iframe>` : isOwnFile(src) || isVideoFile(src) ? `<video src="${esc(src)}" controls playsinline preload="metadata"></video>` : `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener">Открыть видео</a>`;
  } else if (it.content_type === 'art') {
    const imgs = Array.isArray(it.media_items) && it.media_items.length ? it.media_items.map(m => m.url).filter(Boolean) : [src];
    media = imgs.map((u, i) => `<a class="pm-item" href="${esc(u)}" data-zoom="${i}" title="Открыть на весь экран"><span class="pm-bg" style="background-image:url('${esc(thumbUrl(u, 360))}')"></span>${imgTag(u, 1080).replace(' loading="lazy"', '')}</a>`).join('');
  }
  const liked = S.liked.has(it.id);
  if (inLb && LB.key !== key) return;
  root.innerHTML = `<div class="post">
    ${inLb ? '' : `<button class="back" data-back>${I.back} Назад</button>`}
    ${media ? `<div class="post-media${it.is_blurred ? ' blur' : ''}" id="postMedia">${media}</div>` : ''}
    <div class="post-head"><img class="av" src="${esc(avatarUrl(a))}" alt="" data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer"><div><b data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer">${esc(pname(a))}</b><div class="sub">${when(it.published_at || it.created_at)}${it.content_type === 'fanfic' ? '' : ` · ${fmt(it.views)} просмотров`}</div></div>
      <div class="post-actions"><div class="react-wrap" id="reactWrap"></div><button class="btn like-btn${liked ? ' liked' : ''}" id="likeBtn">${I.heart}<span>${fmt(it.likes)}</span></button><button class="btn" id="copyBtn" title="Скопировать ссылку">${I.link}</button></div></div>
    <h1>${esc(it.title || 'Без названия')}</h1>
    ${it.description && it.content_type !== 'fanfic' ? `<p class="post-desc">${esc(it.description)}</p>` : ''}
    ${it.content_type === 'fanfic' ? `<div class="post-text">${esc(it.description || '')}</div>` : ''}
    ${Array.isArray(it.tags) && it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    ${it.content_type === 'fanfic' ? (it.source_url ? `<a class="btn accent fic-read" href="${esc(it.source_url)}" target="_blank" rel="noopener noreferrer">Читать фанфик</a>` : '') : `<section class="comments" id="comments"><h3>Комментарии</h3><div class="empty" style="padding:20px">Загрузка…</div></section>`}
  </div>`;
  const pmEl = root.querySelector('#postMedia');
  if (pmEl) pmEl.addEventListener('click', ev => {
    const z = ev.target.closest('[data-zoom]'); if (!z) return;
    ev.preventDefault();
    if (pmEl.classList.contains('blur')) { pmEl.classList.remove('blur'); return; }  // спойлер: первый клик — открыть
    openViewer($$('[data-zoom]', pmEl).map(a => a.getAttribute('href')), +z.dataset.zoom);
  });
  $('#likeBtn').onclick = async ev => {
    const b = ev.currentTarget; b.disabled = true;
    try {
      const on = await rpc('toggle_content_like', { p_content_id: it.id });
      it.likes = Math.max(0, (it.likes || 0) + (on ? 1 : -1));
      if (on) S.liked.add(it.id); else S.liked.delete(it.id);
      b.classList.toggle('liked', !!on); $('span', b).textContent = fmt(it.likes);
      if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    } catch (er) { toast(er.message, true); }
    b.disabled = false;
  };
  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${it.short_code || '?post=' + it.id}`); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать', true); } };
  if (it.content_type !== 'fanfic') { rpc('increment_content_views', { content_id: it.id }).catch(() => {}); loadComments(it.id); }
  renderReact(it);
}

/* ── платная реакция: монета renah0cki (как звёзды в Telegram), монеты уходят автору ── */
const REACT_AMOUNTS = [1, 5, 10, 25, 50, 100];
async function renderReact(it) {
  const box = $('#reactWrap'); if (!box) return;
  let rows = [];
  try { rows = await api(`coin_reactions?target_kind=eq.content&target_id=eq.${it.id}&select=from_user,amount`); } catch {}
  if (!$('#reactWrap') || $('#reactWrap') !== box) return;
  let total = 0, mine = 0; const by = {};
  rows.forEach(x => { const a = +x.amount || 0; total += a; by[x.from_user] = (by[x.from_user] || 0) + a; if (x.from_user === S.uid) mine += a; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
  await loadProfiles(top.map(t => t[0]));
  const own = S.uid && S.uid === it.submitted_by;
  box.innerHTML = `<button class="btn react-btn${mine ? ' mine' : ''}" data-react-toggle title="${own ? 'Монеты, подаренные этой работе' : 'Подарить автору renah0cki coin'}"><img src="${COIN}" alt=""><span>${total ? fmt(total) : (own ? '0' : 'Подарить')}</span></button>
    <div class="react-pop" hidden>
      <div class="react-title">${own ? 'Вашей работе подарили' : 'Подарить автору'} <img src="${COIN}" alt=""> <b>${fmt(total)}</b></div>
      ${top.length ? `<div class="react-top">${top.map(([uid, a], i) => `<span>${['🥇', '🥈', '🥉'][i]} ${esc(pname(S.profiles.get(uid)))} — <b>${fmt(a)}</b></span>`).join('')}</div>` : ''}
      ${own || !S.uid ? '' : `<div class="react-amts">${REACT_AMOUNTS.map((a, i) => `<button class="chip${i === 1 ? ' on' : ''}" data-ramt="${a}">${a}</button>`).join('')}<input type="number" min="1" max="100000" step="1" class="react-custom" placeholder="своя"></div>
      <button class="btn accent react-send" data-react-send>Подарить <img src="${COIN}" alt=""> <span>5</span></button>
      <div class="react-hint">Монеты сразу получит автор.${mine ? ` Вы уже подарили ${fmt(mine)}.` : ''}</div>`}
      <div class="react-status"></div>
    </div>`;
  const pop = $('.react-pop', box), amt = () => { const c = parseInt($('.react-custom', box)?.value, 10); return c > 0 ? c : +($('[data-ramt].on', box)?.dataset.ramt || 5); };
  const sync = () => { const sp = $('[data-react-send] span', box); if (sp) sp.textContent = fmt(amt()); };
  box.onclick = async e => {
    e.stopPropagation();
    if (e.target.closest('[data-react-toggle]')) { pop.hidden = !pop.hidden; return; }
    const ch = e.target.closest('[data-ramt]');
    if (ch) { $$('[data-ramt]', box).forEach(x => x.classList.toggle('on', x === ch)); $('.react-custom', box).value = ''; sync(); return; }
    const send = e.target.closest('[data-react-send]');
    if (send) {
      const st = $('.react-status', box), a = amt();
      if (!(a >= 1)) { st.textContent = 'Укажи сумму'; return; }
      send.disabled = true; st.textContent = '…';
      try {
        const bal = await rpc('coin_react', { p_kind: 'content', p_id: it.id, p_emoji: 'coin', p_amount: a });
        $('#coinVal').textContent = fmt(bal);
        toast(`Подарено ${fmt(a)} coin автору`);
        await renderReact(it);
        $('.react-btn', $('#reactWrap'))?.classList.add('pop');
      } catch (er) { st.textContent = 'Ошибка: ' + er.message; send.disabled = false; }
    }
  };
  box.oninput = e => { if (e.target.closest('.react-custom')) { if (e.target.value) $$('[data-ramt]', box).forEach(x => x.classList.remove('on')); sync(); } };
}
document.addEventListener('click', e => { if (!e.target.closest('.react-wrap')) $$('.react-pop').forEach(p => { p.hidden = true; }); });
/* ── просмотр фото на весь экран: колесо/щипок — зум, перетаскивание, двойной клик ── */
const VW = { el: null, list: [], i: 0, z: 1, x: 0, y: 0 };
function openViewer(list, i = 0) {
  if (!VW.el) {
    const el = document.createElement('div');
    el.className = 'vw';
    el.innerHTML = `<div class="vw-stage"><img class="vw-img" alt="" draggable="false"></div>
      <div class="vw-top"><span class="vw-count"></span><div class="vw-tools">
        <button data-vw="out" aria-label="Уменьшить"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6"/></svg></button>
        <button data-vw="reset" aria-label="Сбросить" class="vw-pct">100%</button>
        <button data-vw="in" aria-label="Увеличить"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6M11 8v6"/></svg></button>
        <button data-vw="close" aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <button class="vw-nav vw-prev" data-vw="prev" aria-label="Назад"><svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg></button>
      <button class="vw-nav vw-next" data-vw="next" aria-label="Вперёд"><svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg></button>`;
    document.body.append(el);
    VW.el = el;
    const img = $('.vw-img', el), stage = $('.vw-stage', el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-vw]');
      if (b) {
        const a = b.dataset.vw;
        if (a === 'close') return closeViewer();
        if (a === 'in') return vwZoom(VW.z * 1.5);
        if (a === 'out') return vwZoom(VW.z / 1.5);
        if (a === 'reset') return vwZoom(1);
        if (a === 'prev') return vwGo(VW.i - 1);
        if (a === 'next') return vwGo(VW.i + 1);
        return;
      }
      if (e.target === stage && VW.z === 1) closeViewer();
    });
    img.addEventListener('dblclick', e => {
      if (VW.z > 1) return vwZoom(1);
      const r = img.getBoundingClientRect();
      vwZoom(2.5, e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    stage.addEventListener('wheel', e => { e.preventDefault(); vwZoom(VW.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
    // перетаскивание и щипок
    const pts = new Map(); let start = null;
    stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); start = { x: VW.x, y: VW.y, z: VW.z, px: e.clientX, py: e.clientY, d: pts.size === 2 ? vwDist(pts) : 0 }; });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !start) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { if (!start.d) start.d = vwDist(pts); vwZoom(start.z * vwDist(pts) / start.d, null, null, false); return; }
      if (VW.z > 1) { VW.x = start.x + (e.clientX - start.px); VW.y = start.y + (e.clientY - start.py); vwApply(false); }
    });
    const up = e => { pts.delete(e.pointerId); start = pts.size ? { x: VW.x, y: VW.y, z: VW.z, px: [...pts.values()][0].x, py: [...pts.values()][0].y, d: 0 } : null; if (VW.z <= 1.02) vwZoom(1); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  }
  VW.list = list; document.documentElement.classList.add('vw-lock');
  VW.el.classList.add('show');
  vwGo(i);
}
const vwDist = pts => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
function vwGo(i) {
  if (i < 0 || i >= VW.list.length) return;
  VW.i = i; VW.z = 1; VW.x = 0; VW.y = 0;
  const u = VW.list[i], img = $('.vw-img', VW.el);
  img.classList.remove('ld'); vwApply(false);
  const t = thumbUrl(u, 1080);
  img.src = t; img.onload = () => { img.classList.add('ld'); if (t !== u) { const full = new Image(); full.onload = () => { if (VW.list[VW.i] === u) img.src = u; }; full.src = u; } };
  img.onerror = () => { img.onerror = null; img.src = u; };
  $('.vw-count', VW.el).textContent = VW.list.length > 1 ? `${i + 1} / ${VW.list.length}` : '';
  $('.vw-prev', VW.el).hidden = i <= 0; $('.vw-next', VW.el).hidden = i >= VW.list.length - 1;
}
function vwZoom(z, cx = null, cy = null, anim = true) {
  const nz = Math.min(8, Math.max(1, z));
  if (cx != null) { VW.x = -cx * (nz - 1); VW.y = -cy * (nz - 1); }
  if (nz === 1) { VW.x = 0; VW.y = 0; }
  VW.z = nz; vwApply(anim);
}
function vwApply(anim = true) {
  const img = $('.vw-img', VW.el);
  img.style.transition = anim ? 'transform .25s cubic-bezier(.2,.8,.2,1)' : 'none';
  img.style.transform = `translate(${VW.x}px, ${VW.y}px) scale(${VW.z})`;
  VW.el.classList.toggle('zoomed', VW.z > 1);
  $('.vw-pct', VW.el).textContent = Math.round(VW.z * 100) + '%';
}
function closeViewer() { if (!VW.el) return; VW.el.classList.remove('show'); document.documentElement.classList.remove('vw-lock'); }
addEventListener('keydown', e => {
  if (!VW.el?.classList.contains('show')) return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape') closeViewer();
  else if (e.key === 'ArrowLeft') vwGo(VW.i - 1);
  else if (e.key === 'ArrowRight') vwGo(VW.i + 1);
  else if (e.key === '+' || e.key === '=') vwZoom(VW.z * 1.5);
  else if (e.key === '-') vwZoom(VW.z / 1.5);
}, true);

/* ── лайтбокс: пост поверх ленты ── */
let lbBaseHash = location.hash;
function closeLightboxUi() {
  if (!LB.el) return;
  $$('video, iframe', LB.el).forEach(m => { if (m.tagName === 'VIDEO') m.pause(); else m.src = 'about:blank'; });
  LB.el.classList.remove('show'); LB.key = null;
  document.documentElement.classList.remove('lb-lock');
}
const LB = { el: null, key: null, open: false, skip: false };
function lbKeys() { return $$('[data-open]', page).map(c => c.dataset.open); }
function lbEnsure() {
  if (LB.el) return LB.el;
  const el = document.createElement('div');
  el.className = 'lb';
  el.innerHTML = `<div class="lb-backdrop" data-lb-close></div>
    <button class="lb-nav lb-prev" data-lb-step="-1" aria-label="Предыдущая работа"><svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg></button>
    <div class="lb-box" role="dialog" aria-modal="true"><button class="lb-close" data-lb-close aria-label="Закрыть"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="lb-body" id="lbBody"></div></div>
    <button class="lb-nav lb-next" data-lb-step="1" aria-label="Следующая работа"><svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg></button>`;
  el.addEventListener('click', e => {
    if (e.target.closest('[data-lb-close]')) return closeLightbox();
    const st = e.target.closest('[data-lb-step]'); if (st) return lbStep(+st.dataset.lbStep);
    const u = e.target.closest('[data-user]');
    if (u) { closeLightbox(true); location.hash = '#/u/' + encodeURIComponent(u.dataset.user); }
  });
  document.body.append(el);
  LB.el = el;
  return el;
}
function lbRender(key) {
  LB.key = key;
  const el = lbEnsure(), keys = lbKeys(), i = keys.indexOf(key);
  $('.lb-prev', el).hidden = i <= 0;
  $('.lb-next', el).hidden = i < 0 || i >= keys.length - 1;
  const body = $('#lbBody', el);
  body.scrollTop = 0;
  body.classList.remove('lb-in'); void body.offsetWidth; body.classList.add('lb-in');
  viewPost(key, body);
  lbPrefetch(keys, i);
}
const preloaded = new Set();
function lbPrefetch(keys, i) {
  [i + 1, i - 1, i + 2].forEach(j => {
    const k = keys[j]; if (!k) return;
    const it = S.items.get(k); if (!it || preloaded.has(it.id)) return;
    preloaded.add(it.id);
    if (it.content_type === 'art') {
      const imgs = Array.isArray(it.media_items) && it.media_items.length ? it.media_items.map(m => m.url).filter(Boolean) : [it.source_url];
      imgs.slice(0, 3).forEach(u => { if (!u) return; const im = new Image(); im.decoding = 'async'; im.src = thumbUrl(u, 1080); const bg = new Image(); bg.src = thumbUrl(u, 360); });
    } else if (it.content_type === 'video' && it.cover_image_url) { const im = new Image(); im.src = thumbUrl(it.cover_image_url, 480); }
    if (!CMT.has(it.id)) fetchComments(it.id).catch(() => {});
  });
}
function openLightbox(key) {
  const el = lbEnsure();
  if (!LB.open) { LB.open = true; history.pushState({ lb: 1 }, '', '#/p/' + key); }
  else history.replaceState({ lb: 1 }, '', '#/p/' + key);
  document.documentElement.classList.add('lb-lock');
  el.classList.add('show');
  lbRender(key);
}
function lbStep(d) {
  const keys = lbKeys(), i = keys.indexOf(LB.key);
  const k = keys[i + d]; if (!k) return;
  history.replaceState({ lb: 1 }, '', '#/p/' + k);
  lbRender(k);
  $(`[data-open="${CSS.escape(k)}"]`, page)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
// keepHash: переход по ссылке из лайтбокса (например в профиль) — не откатываем историю
function closeLightbox(keepHash = false) {
  if (!LB.open) return;
  LB.open = false;
  closeLightboxUi();
  if (!keepHash && /^#\/p\//.test(location.hash)) { LB.skip = true; history.back(); }
}
addEventListener('keydown', e => {
  if (!LB.open) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) lbStep(-1);
  else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) lbStep(1);
});

const CMT = new Map();
async function fetchComments(id) {
  let rows;
  try { rows = await api(`comments?content_id=eq.${id}&is_deleted=eq.false&select=id,body,author_id,created_at,parent_id&order=created_at.asc&limit=500`); }
  catch { rows = await api(`comments?content_id=eq.${id}&is_deleted=eq.false&select=id,body,author_id,created_at&order=created_at.asc&limit=500`).catch(() => []); }
  await loadProfiles(rows.map(r => r.author_id));
  CMT.set(id, rows);
  return rows;
}
async function loadComments(id) {
  const box = $('#comments'); if (!box) return;
  const draw = rows => { if ($('#comments') === box) drawComments(box, rows, id); };
  if (CMT.has(id)) draw(CMT.get(id));
  draw(await fetchComments(id));
}
function drawComments(box, rows, cid) {
  if (cid) box.dataset.cid = cid;
  // ответы — сразу под своим комментарием
  const top = rows.filter(c => !c.parent_id || !rows.some(x => x.id === c.parent_id));
  const kids = id => rows.filter(c => c.parent_id === id);
  const ordered = []; const walk = (c, d) => { ordered.push([c, d]); kids(c.id).forEach(k => walk(k, Math.min(d + 1, 1))); };
  top.forEach(c => walk(c, 0));
  const mod = isMod();
  const draft = $('.cmt-form textarea', box)?.value || '';
  box.innerHTML = `<h3>Комментарии · ${rows.length}</h3>` + (rows.length ? ordered.map(([c, d]) => {
    const p = S.profiles.get(c.author_id), mine = S.uid && c.author_id === S.uid;
    return `<div class="cmt${d ? ' reply' : ''}" data-cmt="${c.id}"><img class="av" src="${esc(avatarUrl(p))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${COIN}'"><div class="cmt-main"><div class="cmt-head"><b data-user="${esc(p?.username || c.author_id)}">${esc(pname(p))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body || '')}</div>
      ${S.uid ? `<div class="cmt-acts"><button type="button" data-creply="${c.id}" data-cname="${esc(pname(p))}">Ответить</button>${mine || mod ? `<button type="button" data-cdel="${c.id}">Удалить</button>` : ''}${!mine ? `<button type="button" data-crep="${c.id}">Пожаловаться</button>` : ''}</div>` : ''}</div></div>`;
  }).join('') : '<div class="empty" style="padding:20px">Комментариев пока нет</div>')
    + (S.uid ? `<form class="cmt-form" data-cform><div class="cmt-to" hidden></div><div class="cmt-row"><textarea rows="2" maxlength="2000" placeholder="Написать комментарий…" required></textarea><button class="btn accent" type="submit">Отправить</button></div></form>`
      : `<div class="cmt-login"><button type="button" class="btn accent" data-login>Войти</button><span>чтобы оставить комментарий</span></div>`);
  const ta = $('.cmt-form textarea', box); if (ta && draft) ta.value = draft;
}
page.addEventListener('click', e => { const b = e.target.closest('[data-login]'); if (b) login(); });
// действия с комментариями работают и в лайтбоксе, и на странице поста
document.addEventListener('click', async e => {
  const box = e.target.closest('#comments'); if (!box) return;
  const cid = box.dataset.cid;
  const rp = e.target.closest('[data-creply]');
  if (rp) {
    const f = $('[data-cform]', box), to = $('.cmt-to', f);
    f.dataset.parent = rp.dataset.creply; to.hidden = false;
    to.innerHTML = `Ответ для <b>${esc(rp.dataset.cname)}</b> <button type="button" data-cnoreply aria-label="Отменить ответ">✕</button>`;
    $('textarea', f).focus(); return;
  }
  if (e.target.closest('[data-cnoreply]')) { const f = $('[data-cform]', box); delete f.dataset.parent; $('.cmt-to', f).hidden = true; return; }
  const del = e.target.closest('[data-cdel]');
  if (del) {
    if (!confirm('Удалить комментарий?')) return;
    try { await api(`comments?id=eq.${del.dataset.cdel}`, { method: 'DELETE' }); bumpComments(cid, -1); drawComments(box, await fetchComments(cid)); toast('Комментарий удалён'); }
    catch (er) { toast(er.message, true); }
    return;
  }
  const rep = e.target.closest('[data-crep]');
  if (rep) reportDialog(rep.dataset.crep);
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-cform]'); if (!f) return;
  e.preventDefault();
  const box = f.closest('#comments'), cid = box?.dataset.cid, ta = $('textarea', f), body = ta.value.trim();
  if (!body || !cid) return;
  const btn = $('button[type=submit]', f); btn.disabled = true;
  try {
    await api('comments', { method: 'POST', prefer: 'return=minimal', body: { content_id: cid, author_id: S.uid, body, parent_id: f.dataset.parent || null } });
    ta.value = ''; bumpComments(cid, 1);
    drawComments(box, await fetchComments(cid));
    box.lastElementChild.previousElementSibling?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  } catch (er) { toast(er.message, true); btn.disabled = false; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.closest?.('[data-cform] textarea')) { e.preventDefault(); e.target.closest('form').requestSubmit(); }
});
function bumpComments(cid, d) {
  const it = S.items.get(cid); if (it) it.comments_count = Math.max(0, (it.comments_count || 0) + d);
}
const REPORT_REASONS = [['spam', 'Спам / реклама'], ['insult', 'Оскорбления / угрозы'], ['illegal', 'Запрещённый контент'], ['other', 'Другое']];
function reportDialog(commentId) {
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal"><h2>Пожаловаться на комментарий</h2>
    <div class="radios">${REPORT_REASONS.map(([v, t], i) => `<label class="radio"><input type="radio" name="r" value="${v}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label>Подробности (необязательно)<textarea name="d" rows="2" maxlength="500"></textarea></label>
    <p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>Отмена</button><button class="btn accent" type="submit">Отправить</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, hint = $('.hint', ov);
    try {
      await api('comment_reports', { method: 'POST', prefer: 'return=minimal', body: { comment_id: commentId, reporter_id: S.uid, reason: f.r.value, details: f.d.value.trim() || null } });
      close(); toast('Жалоба отправлена модераторам');
    } catch (er) { hint.textContent = /duplicate|unique|409/i.test(er.message) ? 'Вы уже жаловались на этот комментарий.' : 'Ошибка: ' + er.message; }
  };
  document.body.append(ov);
}
page.addEventListener('click', e => { if (e.target.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = '#/'); } });

/* ── роли (модераторы видят «Одобрить» в предложке) ── */
const MOD_ROLES = ['moderator', 'gl_moder', 'admin'];
const isMod = () => !!S.me && [S.me.role, ...(S.me.extra_roles || [])].some(r => MOD_ROLES.includes(r));

/* ── новости ── */
const NEWS = { cache: new Map(), liked: new Set(), chans: new Map() };
function newsFmt(s) {
  return s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler" data-spoiler>$1</span>');
}
function newsInline(raw) {
  const links = [];
  const s = newsFmt(esc(raw).replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => { links.push([t, u]); return `\u0000${links.length - 1}\u0000`; }));
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<a href="${links[i][1]}" target="_blank" rel="noopener noreferrer">${newsFmt(links[i][0])}</a>`);
}
function newsBody(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = []; let para = [], list = null, quote = [];
  const fP = () => { if (para.length) { out.push('<p>' + para.map(newsInline).join('<br>') + '</p>'); para = []; } };
  const fL = () => { if (list) { out.push(`<${list.t}>` + list.items.map(i => '<li>' + newsInline(i) + '</li>').join('') + `</${list.t}>`); list = null; } };
  const fQ = () => { if (quote.length) { out.push('<blockquote>' + quote.map(newsInline).join('<br>') + '</blockquote>'); quote = []; } };
  const fA = () => { fP(); fL(); fQ(); };
  for (const line of lines) {
    const t = line.trim(); let m;
    if (!t) { fA(); continue; }
    if ((m = t.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/))) { fA(); out.push(`<figure><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">${m[1] ? `<figcaption>${newsInline(m[1])}</figcaption>` : ''}</figure>`); continue; }
    if ((m = t.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?(?:\S*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})\S*$/))) { fA(); out.push(`<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" allowfullscreen loading="lazy"></iframe></div>`); continue; }
    if (/^-{3,}$/.test(t)) { fA(); out.push('<hr>'); continue; }
    if ((m = t.match(/^(#{1,3})\s+(.+)$/))) { fA(); out.push(m[1].length === 3 ? `<h4>${newsInline(m[2])}</h4>` : `<h3>${newsInline(m[2])}</h3>`); continue; }
    if ((m = t.match(/^>\s?(.*)$/))) { fP(); fL(); quote.push(m[1]); continue; }
    if ((m = t.match(/^[-*•]\s+(.+)$/))) { fP(); fQ(); if (list && list.t !== 'ul') fL(); (list ||= { t: 'ul', items: [] }).items.push(m[1]); continue; }
    if ((m = t.match(/^\d+[.)]\s+(.+)$/))) { fP(); fQ(); if (list && list.t !== 'ol') fL(); (list ||= { t: 'ol', items: [] }).items.push(m[1]); continue; }
    fL(); fQ(); para.push(t);
  }
  fA();
  return out.join('');
}
const newsPlain = md => String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ').replace(/[*_~`|#>]/g, '').replace(/\s+/g, ' ').trim();
const newsCover = n => n.cover_url || (String(n.body || '').match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/) || [])[1] || '';
function newsBy(n) {
  if (n.channel_name) {
    const c = n.channel_id && NEWS.chans.get(n.channel_id);
    return { name: n.channel_name, ava: c?.avatar_url || '' };
  }
  return { name: pname(n.author) || 'Редакция', ava: n.author?.avatar_url || '' };
}
async function newsLoadChans(items) {
  const ids = [...new Set(items.map(x => x.channel_id).filter(i => i && !NEWS.chans.has(i)))];
  if (!ids.length) return;
  (await api(`news_channels?id=in.(${ids.join(',')})&select=id,name,avatar_url`).catch(() => [])).forEach(c => NEWS.chans.set(c.id, c));
}
async function newsLoadLiked(ids) {
  if (!S.uid || !ids.length) return;
  (await api(`news_likes?user_id=eq.${S.uid}&news_id=in.(${ids.join(',')})&select=news_id`).catch(() => [])).forEach(x => NEWS.liked.add(x.news_id));
}
const avaHtml = (url, name, cls = 'av') => url ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy">` : `<span class="${cls} av-ph">${esc((Array.from(name || '?')[0] || '?').toUpperCase())}</span>`;
function newsCardHtml(n) {
  const cover = newsCover(n), by = newsBy(n), liked = NEWS.liked.has(n.id);
  return `<article class="card" data-news="${esc(n.id)}">
    <div class="card-media">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : '<div class="news-ph">📰</div>'}
      ${n.pinned ? `<span class="badge pin">${I.pin} Закреплено</span>` : ''}<span class="badge type">Новость</span></div>
    <div class="card-body">
      <div class="card-author">${avaHtml(by.ava, by.name)}<span>${esc(by.name)}</span></div>
      <h3 class="card-title">${esc(n.title)}</h3>
      <p class="card-desc">${esc(newsPlain(n.body).slice(0, 160))}</p>
      <div class="card-stats">
        <span title="Просмотры">${I.views}${fmt(n.views)}</span>
        <span class="${liked ? 'liked' : ''}" title="Лайки">${I.heart}${fmt(n.likes_count)}</span>
        <span title="Комментарии">${I.comment}${fmt(n.comments_count)}</span>
        <time>${when(n.created_at)}</time>
      </div>
    </div>
  </article>`;
}
async function viewNews() {
  setNav('news');
  page.innerHTML = `<div class="page-head"><h1>Новости</h1>${isMod() ? '<a class="btn" href="/?v2=news">Написать</a>' : ''}</div><div class="grid grid-big" id="newsGrid">${'<div class="skel"></div>'.repeat(6)}</div>`;
  try {
    await swr('news', fetchNews, data => {
      applyNews(data);
      const g = $('#newsGrid'); if (!g) return;
      const firstN = !g.querySelector('.card');
      g.outerHTML = data.rows.length ? `<div class="grid grid-big" id="newsGrid">${data.rows.map(newsCardHtml).join('')}</div>` : '<div class="empty" id="newsGrid">Пока новостей нет.</div>';
      if (firstN) animateCards($('#newsGrid'));
    });
  } catch (e) { const g = $('#newsGrid'); if (g) g.outerHTML = `<div class="empty">Не удалось загрузить: ${esc(e.message)}</div>`; }
}
async function fetchNews() {
  const rows = await api('news?select=*,author:profiles!news_author_id_fkey(username,display_name,avatar_url)&order=pinned.desc,created_at.desc&limit=60');
  const chIds = [...new Set(rows.map(x => x.channel_id).filter(Boolean))];
  const [chans, liked] = await Promise.all([
    chIds.length ? api(`news_channels?id=in.(${chIds.join(',')})&select=id,name,avatar_url`).catch(() => []) : [],
    S.uid && rows.length ? api(`news_likes?user_id=eq.${S.uid}&news_id=in.(${rows.map(r => r.id).join(',')})&select=news_id`).catch(() => []) : [],
  ]);
  return { rows, chans, liked: liked.map(x => x.news_id) };
}
function applyNews(d) {
  d.rows.forEach(n => NEWS.cache.set(n.id, n));
  d.chans.forEach(c => NEWS.chans.set(c.id, c));
  d.liked.forEach(id => NEWS.liked.add(id));
}
async function viewNewsArticle(key) {
  setNav('news');
  page.innerHTML = `<div class="post"><div class="skel" style="aspect-ratio:16/7"></div></div>`;
  let n = NEWS.cache.get(key);
  if (!n) {
    const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `short_code=eq.${encodeURIComponent(key)}`;
    try { [n] = await api(`news?${f}&select=*,author:profiles!news_author_id_fkey(username,display_name,avatar_url)`); } catch {}
    if (n) NEWS.cache.set(n.id, n);
  }
  if (!n) { page.innerHTML = '<div class="empty">Новость не найдена</div>'; return; }
  await Promise.all([newsLoadChans([n]), newsLoadLiked([n.id])]);
  try { if (!sessionStorage.getItem('nv_' + n.id)) { sessionStorage.setItem('nv_' + n.id, '1'); n.views = (n.views || 0) + 1; rpc('news_view', { p_id: n.id }).catch(() => {}); } } catch {}
  const by = newsBy(n), cover = n.cover_url || '', liked = NEWS.liked.has(n.id);
  page.innerHTML = `<article class="post news-article">
    <button class="back" data-back>${I.back} Назад</button>
    ${cover ? `<div class="post-media"><img src="${esc(cover)}" alt=""></div>` : ''}
    <h1>${esc(n.title)}</h1>
    <div class="post-head">${avaHtml(by.ava, by.name)}<div><b>${esc(by.name)}</b><div class="sub">${when(n.created_at)} · ${fmt(n.views)} просмотров</div></div>
      <div class="post-actions"><button class="btn like-btn${liked ? ' liked' : ''}" id="newsLike">${I.heart}<span>${fmt(n.likes_count)}</span></button><button class="btn" id="newsCopy" title="Скопировать ссылку">${I.link}</button></div></div>
    <div class="news-body">${newsBody(n.body)}</div>
    <section class="comments" id="newsComments"><h3>Комментарии</h3><div class="empty" style="padding:20px">Загрузка…</div></section>
  </article>`;
  $('#newsLike').onclick = async ev => {
    if (!S.uid) return toast('Нужно войти', true);
    const b = ev.currentTarget, was = NEWS.liked.has(n.id); b.disabled = true;
    try {
      if (was) await api(`news_likes?news_id=eq.${n.id}&user_id=eq.${S.uid}`, { method: 'DELETE' });
      else await api('news_likes', { method: 'POST', body: { news_id: n.id, user_id: S.uid }, prefer: 'return=minimal' });
      was ? NEWS.liked.delete(n.id) : NEWS.liked.add(n.id);
      n.likes_count = Math.max(0, (n.likes_count || 0) + (was ? -1 : 1));
      b.classList.toggle('liked', !was); $('span', b).textContent = fmt(n.likes_count);
    } catch (er) { toast(er.message, true); }
    b.disabled = false;
  };
  $('#newsCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${n.short_code ? 'n/' + n.short_code : '?news=' + n.id}`); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать', true); } };
  newsLoadComments(n);
}
async function newsLoadComments(n) {
  const box = $('#newsComments'); if (!box) return;
  const rows = await api(`news_comments?news_id=eq.${n.id}&select=id,user_id,body,created_at,profiles(username,display_name,avatar_url)&order=created_at.asc&limit=300`).catch(() => []);
  if (!$('#newsComments')) return;
  box.innerHTML = `<h3>Комментарии · ${rows.length}</h3>`
    + (rows.length ? rows.map(c => `<div class="cmt">${avaHtml(c.profiles?.avatar_url, pname(c.profiles))}<div class="cmt-main"><div class="cmt-head"><b>${esc(pname(c.profiles))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body)}</div></div></div>`).join('') : '<div class="empty" style="padding:16px">Комментариев пока нет</div>')
    + (S.uid ? `<form class="cmt-form" id="newsCmtForm"><textarea rows="2" maxlength="1000" placeholder="Написать комментарий…" required></textarea><button class="btn accent" type="submit">Отправить</button></form>` : '');
  const f = $('#newsCmtForm');
  if (f) f.onsubmit = async ev => {
    ev.preventDefault();
    const ta = $('textarea', f), body = ta.value.trim(); if (!body) return;
    const btn = $('button', f); btn.disabled = true;
    try {
      await api('news_comments', { method: 'POST', body: { news_id: n.id, user_id: S.uid, body }, prefer: 'return=minimal' });
      n.comments_count = (n.comments_count || 0) + 1;
      newsLoadComments(n);
    } catch (er) { toast(er.message, true); btn.disabled = false; }
  };
}
page.addEventListener('click', e => {
  const nc = e.target.closest('[data-news]'); if (nc) { location.hash = '#/news/' + nc.dataset.news; return; }
  const sp = e.target.closest('[data-spoiler]'); if (sp) sp.classList.toggle('open');
});

/* ── предложка (видео с YouTube) ── */
const YT_KEY = 'AIzaSyDc4J-Y8jO5FrvKZD8QuLd0x33LIKtvV_E';
function ytDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); if (!m) return '';
  const sec = (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); if (!sec) return 'LIVE';
  const h = Math.floor(sec / 3600), mi = Math.floor(sec % 3600 / 60), se = sec % 60, p = x => String(x).padStart(2, '0');
  return h ? `${h}:${p(mi)}:${p(se)}` : `${mi}:${p(se)}`;
}
async function viewSuggest() {
  setNav('suggest');
  page.innerHTML = `<div class="page-head"><h1>Предложка</h1>${S.uid ? `<button class="btn accent" data-sg-add><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Предложить видео</button>` : ''}</div>
    <div class="grid sg-grid" id="sgGrid">${'<div class="skel"></div>'.repeat(8)}</div>`;
  try { await swr('suggest', fetchSuggest, renderSuggest); }
  catch (e) { const g = $('#sgGrid'); if (g) g.outerHTML = `<div class="empty">Не удалось загрузить: ${esc(e.message)}</div>`; }
}
async function fetchSuggest() {
  const rows = await api('suggestions?select=*&order=approved_at.desc.nullsfirst,created_at.desc&limit=100');
  const yt = {};
  try {
    const ids = [...new Set(rows.map(r => r.video_id))].slice(0, 50).join(',');
    if (ids) (await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${YT_KEY}`)).json()).items?.forEach(it => { yt[it.id] = { v: it.statistics?.viewCount, d: it.contentDetails?.duration }; });
  } catch {}
  return { rows, yt };
}
function renderSuggest({ rows, yt }) {
  const g = $('#sgGrid'); if (!g) return;
  const firstS = !g.querySelector('.card');
  queueMicrotask(() => { if (firstS) animateCards($('#sgGrid')); });
  const mod = isMod();
  g.outerHTML = rows.length ? `<div class="grid sg-grid" id="sgGrid">${rows.map(r => {
    const id = encodeURIComponent(r.video_id), y = yt[r.video_id], dur = ytDuration(y?.d);
    const pending = r.status !== 'approved', canDel = S.uid && (S.uid === r.user_id || mod);
    return `<article class="card sg-card">
      <a class="card-media" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer"><img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy">
        ${pending ? '<span class="badge pin warn">На проверке</span>' : ''}${dur ? `<span class="badge type">${dur}</span>` : ''}</a>
      <div class="card-body">
        ${r.author_name ? `<div class="card-author"><span>${esc(r.author_name)}</span></div>` : ''}
        <h3 class="card-title"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">${esc(r.title || 'Видео')}</a></h3>
        <div class="card-stats">${y?.v != null ? `<span title="Просмотры на YouTube">${I.views}${fmt(y.v)}</span>` : ''}<time>${when(r.approved_at || r.created_at)}</time></div>
        ${(pending && mod) || canDel ? `<div class="sg-acts">${pending && mod ? `<button class="btn accent" data-sg-ok="${r.id}">Одобрить</button>` : ''}${canDel ? `<button class="btn" data-sg-del="${r.id}">Удалить</button>` : ''}</div>` : ''}
      </div></article>`;
  }).join('')}</div>` : '<div class="empty" id="sgGrid">Пока пусто — предложи первое видео.</div>';
}
// фоновая подготовка новостей и предложки (вызывается после ленты)
async function prefetchNewsSuggest() {
  try { if (!MEM.has('news')) cacheSet('news', await fetchNews()); } catch {}
  try { if (!MEM.has('suggest')) cacheSet('suggest', await fetchSuggest()); } catch {}
}
async function sgTitle(id) {
  try { const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`); if (r.ok) return (await r.json()).title; } catch {}
  try { const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${YT_KEY}`); if (r.ok) return (await r.json()).items?.[0]?.snippet?.title; } catch {}
  return null;
}
function sgAddDialog() {
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal"><h2>Предложить видео</h2><label>Ссылка на видео с YouTube<input type="url" placeholder="https://www.youtube.com/watch?v=..." required></label><p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>Отмена</button><button class="btn accent" type="submit">Отправить</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const hint = $('.hint', ov), id = ytId($('input', ov).value.trim());
    if (!id) { hint.textContent = 'Нужна ссылка на видео с YouTube'; return; }
    hint.textContent = 'Добавляю…';
    const mod = isMod();
    try {
      await api('suggestions', { method: 'POST', prefer: 'return=minimal', body: { user_id: S.uid, video_id: id, title: (await sgTitle(id)) || 'Видео', author_name: S.me?.display_name || S.me?.username || '', status: mod ? 'approved' : 'pending', approved_at: mod ? new Date().toISOString() : null } });
      close(); toast(mod ? 'Видео добавлено' : 'Отправлено на проверку модераторам'); MEM.delete('suggest'); viewSuggest();
    } catch (er) { hint.textContent = 'Ошибка: ' + er.message; }
  };
  document.body.append(ov); setTimeout(() => $('input', ov).focus(), 30);
}
page.addEventListener('click', async e => {
  if (e.target.closest('[data-sg-add]')) return sgAddDialog();
  const ok = e.target.closest('[data-sg-ok]');
  if (ok) { ok.disabled = true; try { await api(`suggestions?id=eq.${ok.dataset.sgOk}`, { method: 'PATCH', body: { status: 'approved', approved_at: new Date().toISOString() } }); MEM.delete('suggest'); viewSuggest(); } catch (er) { toast(er.message, true); ok.disabled = false; } return; }
  const del = e.target.closest('[data-sg-del]');
  if (del) { if (!confirm('Удалить видео из предложки?')) return; try { await api(`suggestions?id=eq.${del.dataset.sgDel}`, { method: 'DELETE' }); MEM.delete('suggest'); viewSuggest(); } catch (er) { toast(er.message, true); } }
});

/* ── профиль ── */
const ROLE_LABEL = { moderator: 'Модератор', gl_moder: 'Главный модератор', admin: 'Админ', sponsor: 'Спонсор', respect_plus: 'Respect+', streamer: 'Стример' };
const userPath = p => '#/u/' + encodeURIComponent(p?.username || p?.id || '');
async function viewProfile(key) {
  setNav(S.me && (key === S.me.username || key === S.me.id) ? 'me' : '');
  page.innerHTML = `<div class="prof"><div class="skel" style="aspect-ratio:auto;height:180px"></div></div>`;
  let p;
  try {
    const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `username=eq.${encodeURIComponent(key)}`;
    [p] = await api(`profiles?${f}&select=id,username,display_name,avatar_url,role,extra_roles,bio,stream_twitch_url,stream_social_url,short_code`);
  } catch {}
  if (!p) { page.innerHTML = '<div class="empty">Пользователь не найден</div>'; return; }
  S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p });
  const own = S.uid === p.id;
  const [works, subCount, followRows] = await Promise.all([
    api(`content?submitted_by=eq.${p.id}&status=eq.published&order=published_at.desc.nullslast,created_at.desc&select=${CARD_SEL}`).then(absorb).catch(() => []),
    (async () => { const t = await getToken(); const r = await fetch(`${SB_URL}/rest/v1/subscriptions?following_id=eq.${p.id}&select=id`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), Prefer: 'count=exact', Range: '0-0' } }); return parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10) || 0; })().catch(() => 0),
    S.uid && !own ? api(`subscriptions?follower_id=eq.${S.uid}&following_id=eq.${p.id}&select=id`).catch(() => []) : Promise.resolve([]),
  ]);
  await loadAllMyLikes();
  let subscribed = !!followRows[0], subs = subCount;
  const roles = [p.role, ...(p.extra_roles || [])].filter((r, i, a) => r && ROLE_LABEL[r] && a.indexOf(r) === i);
  const links = [p.stream_twitch_url && ['Twitch', p.stream_twitch_url], p.stream_social_url && ['Telegram', p.stream_social_url]].filter(Boolean);
  page.innerHTML = `<div class="prof">
    <section class="prof-card">
      ${avaHtml(p.avatar_url, pname(p), 'prof-ava')}
      <div class="prof-main">
        ${roles.length ? `<div class="prof-roles">${roles.map(r => `<span class="role role-${r}">${ROLE_LABEL[r]}</span>`).join('')}</div>` : ''}
        <h1>${esc(pname(p))}</h1>
        ${p.username && p.display_name ? `<div class="prof-handle">@${esc(p.username)}</div>` : ''}
        ${p.bio ? `<p class="prof-bio">${esc(p.bio)}</p>` : ''}
        <div class="prof-stats"><span><b>${fmt(works.length)}</b> публикаций</span><span><b id="subsN">${fmt(subs)}</b> подписчиков</span></div>
        ${links.length ? `<div class="prof-links">${links.map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n}</a>`).join('')}</div>` : ''}
      </div>
      <div class="prof-acts">
        ${own ? `<button class="btn" type="button" id="profEdit">Редактировать</button>`
          : S.uid ? `<button class="btn${subscribed ? '' : ' accent'}" id="subBtn">${subscribed ? '✓ Вы подписаны' : 'Подписаться'}</button>` : ''}
        <button class="btn icon-only" id="profCopy" title="Скопировать ссылку">${I.link}</button>
      </div>
    </section>
    <div class="tabs prof-tabs"><button class="tab on">Работы</button></div>
    ${works.length ? `<div class="grid">${works.map(cardHtml).join('')}</div>` : `<div class="empty">${own ? 'У вас пока нет опубликованных работ.' : 'Пока нет опубликованных работ.'}</div>`}
  </div>`;
  wireLazy(page); animateCards(page);
  $('#profCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/@${encodeURIComponent(p.username || p.id)}`); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать', true); } };
  const pe = $('#profEdit'); if (pe) pe.onclick = () => { if (!S.me) S.me = p; editProfile(); };
  const sb = $('#subBtn');
  if (sb) sb.onclick = async () => {
    sb.disabled = true;
    try {
      const on = await rpc('toggle_subscription', { p_following_id: p.id });
      subscribed = !!on; subs = Math.max(0, subs + (subscribed ? 1 : -1)); subsIds = null;
      sb.textContent = subscribed ? '✓ Вы подписаны' : 'Подписаться'; sb.classList.toggle('accent', !subscribed);
      $('#subsN').textContent = fmt(subs);
    } catch (er) { toast(er.message, true); }
    sb.disabled = false;
  };
}
page.addEventListener('click', e => {
  const au = e.target.closest('[data-user]');
  if (au) { e.stopPropagation(); location.hash = '#/u/' + encodeURIComponent(au.dataset.user); }
});

/* ── уведомления ── */
const NOTIF = { list: [], loaded: false };
const seenKey = () => S.uid ? `fh_notif_seen_${S.uid}` : null; // общий со старым сайтом
const getSeen = () => { try { return parseInt(localStorage.getItem(seenKey()) || '0', 10) || 0; } catch { return 0; } };
const setSeen = ts => { try { localStorage.setItem(seenKey(), String(ts)); } catch {} };
async function loadNotifs() {
  if (!S.uid) return [];
  const prof = 'profiles(id,username,display_name,avatar_url)';
  const [mine, colls] = await Promise.all([
    api(`content?submitted_by=eq.${S.uid}&select=id,title,short_code`).catch(() => []),
    api(`collections?submitted_by=eq.${S.uid}&select=id,title,short_code`).catch(() => []),
  ]);
  const t = {}; mine.forEach(c => { t[c.id] = c; }); const tc = {}; colls.forEach(c => { tc[c.id] = c; });
  const cIds = mine.map(c => c.id), kIds = colls.map(c => c.id);
  const jobs = [];
  if (cIds.length) {
    jobs.push(api(`content_likes?content_id=in.(${cIds.join(',')})&user_id=neq.${S.uid}&select=content_id,user_id,created_at,${prof}&order=created_at.desc&limit=30`).then(r => r.map(x => ({ type: 'like', target: t[x.content_id], actor: x.profiles, at: x.created_at }))).catch(() => []));
    jobs.push(api(`comments?content_id=in.(${cIds.join(',')})&is_deleted=eq.false&author_id=neq.${S.uid}&select=content_id,author_id,body,created_at,${prof}&order=created_at.desc&limit=30`).then(r => r.map(x => ({ type: 'comment', target: t[x.content_id], body: x.body, actor: x.profiles, at: x.created_at }))).catch(() => []));
  }
  if (kIds.length) {
    jobs.push(api(`collection_likes?collection_id=in.(${kIds.join(',')})&user_id=neq.${S.uid}&select=collection_id,user_id,created_at,${prof}&order=created_at.desc&limit=30`).then(r => r.map(x => ({ type: 'like', target: tc[x.collection_id], coll: true, actor: x.profiles, at: x.created_at }))).catch(() => []));
    jobs.push(api(`comments?collection_id=in.(${kIds.join(',')})&is_deleted=eq.false&author_id=neq.${S.uid}&select=collection_id,author_id,body,created_at,${prof}&order=created_at.desc&limit=30`).then(r => r.map(x => ({ type: 'comment', target: tc[x.collection_id], coll: true, body: x.body, actor: x.profiles, at: x.created_at }))).catch(() => []));
  }
  jobs.push(api(`subscriptions?following_id=eq.${S.uid}&select=follower_id,created_at&order=created_at.desc&limit=30`).then(async r => {
    await loadProfiles(r.map(x => x.follower_id));
    return r.map(x => ({ type: 'follow', actor: S.profiles.get(x.follower_id), at: x.created_at }));
  }).catch(() => []));
  if (cIds.length || kIds.length) {
    const or = [cIds.length && `content_id.in.(${cIds.join(',')})`, kIds.length && `collection_id.in.(${kIds.join(',')})`].filter(Boolean).join(',');
    jobs.push(api(`moderation_log?action=eq.rejected&or=(${or})&select=content_id,collection_id,comment,created_at,moderator:profiles(id,username,display_name,avatar_url)&order=created_at.desc&limit=20`).then(r => r.map(x => ({ type: 'reject', target: x.content_id ? t[x.content_id] : tc[x.collection_id], body: x.comment, actor: x.moderator, at: x.created_at }))).catch(() => []));
  }
  NOTIF.list = (await Promise.all(jobs)).flat().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 60);
  NOTIF.loaded = true;
  updateBell();
  return NOTIF.list;
}
function updateBell() {
  const seen = getSeen(), n = NOTIF.list.filter(x => new Date(x.at).getTime() > seen).length;
  const b = $('#bellBadge'); if (!b) return;
  b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n;
}
const NOTIF_TEXT = { like: 'лайкнул(а) вашу работу', comment: 'прокомментировал(а)', follow: 'подписался(ась) на вас', reject: 'отклонил(а) вашу работу' };
const NOTIF_ICON = { like: I.heart, comment: I.comment, follow: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6"/></svg>', reject: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/></svg>' };
async function viewNotifs() {
  setNav('notifs');
  page.innerHTML = `<div class="notifs"><div class="page-head"><h1>Уведомления</h1></div><div id="notifList">${'<div class="skel" style="aspect-ratio:auto;height:64px;margin-bottom:8px"></div>'.repeat(5)}</div></div>`;
  if (!S.uid) { $('#notifList').innerHTML = '<div class="empty">Войдите, чтобы видеть уведомления.</div>'; return; }
  const seen = getSeen();
  const list = await loadNotifs();
  const box = $('#notifList'); if (!box) return;
  box.innerHTML = list.length ? list.map(n => {
    const unread = new Date(n.at).getTime() > seen;
    const href = n.type === 'follow' ? userPath(n.actor) : n.target ? (n.coll ? `/?collection=${n.target.id}` : `#/p/${n.target.short_code || n.target.id}`) : '#/';
    return `<a class="notif${unread ? ' unread' : ''} n-${n.type}" href="${esc(href)}">
      <span class="notif-ic">${NOTIF_ICON[n.type]}</span>
      ${avaHtml(n.actor?.avatar_url, pname(n.actor))}
      <div class="notif-main"><div><b>${esc(pname(n.actor))}</b> ${NOTIF_TEXT[n.type]}${n.target ? ` <span class="notif-target">«${esc(n.target.title || 'без названия')}»</span>` : ''}</div>
        ${n.body ? `<div class="notif-body">${esc(n.body)}</div>` : ''}<time>${when(n.at)}</time></div></a>`;
  }).join('') : '<div class="empty">Пока уведомлений нет.</div>';
  setSeen(Date.now()); updateBell();
}

/* ── новая работа: арт / видео / фанфик → на проверку модераторам ── */
const PRESET_TAGS = ['meowh0cki', 'renamid', 'gl1n', 'EgorTsai', 'MagicKat1', 'BaNaNcHiK1', 'Olezha27', 'gei_angel', 'meRockstar', 'unfeell'];
const UP = { type: 'art', file: null, cover: null, tags: new Set() };
async function uploadFile(file, onPct) {
  const token = await getToken();
  if (!token) throw new Error('Нужно войти');
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open('POST', CDN_URL + '/upload');
    x.timeout = 180000;
    x.setRequestHeader('Content-Type', file.type);
    x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    x.setRequestHeader('X-User-Id', S.uid);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.upload.onprogress = e => { if (e.lengthComputable) onPct(Math.round(e.loaded / e.total * 100)); };
    x.onload = () => { try { const j = JSON.parse(x.responseText); x.status < 300 && j.url ? ok(j.url) : bad(new Error(j.error || 'Ошибка загрузки')); } catch { bad(new Error('Ошибка загрузки')); } };
    x.onerror = () => bad(new Error('Нет соединения'));
    x.ontimeout = () => bad(new Error('Слишком долго, попробуйте ещё раз'));
    x.send(file);
  });
}
function viewNew(type) {
  setNav('');
  if (!S.uid) { page.innerHTML = '<div class="empty">Войдите, чтобы добавлять работы.</div>'; return; }
  UP.type = ['art', 'video', 'fanfic'].includes(type) ? type : 'art';
  UP.file = null; UP.cover = null; UP.tags = new Set();
  const T = UP.type;
  const drop = (id, accept, text, sub) => `<label class="drop" id="${id}"><input type="file" accept="${accept}" hidden>
      <div class="drop-empty"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg><b>${text}</b><span>${sub}</span></div>
      <div class="drop-preview" hidden></div></label>`;
  page.innerHTML = `<div class="up">
    <div class="page-head"><h1>Новая работа</h1></div>
    <div class="up-tabs">${[['art', 'Арт'], ['video', 'Видео'], ['fanfic', 'Фанфик']].map(([k, v]) => `<a class="up-tab${T === k ? ' on' : ''}" href="#/new/${k}">${v}</a>`).join('')}</div>
    <form class="up-form" id="upForm" novalidate>
      <label class="fld"><span>Название</span><input name="title" maxlength="120" placeholder="${T === 'fanfic' ? 'Название произведения' : T === 'video' ? 'Название видео' : 'Название арта'}" required></label>
      ${T === 'art' ? drop('upDrop', 'image/png,image/jpeg,image/webp,image/gif', 'Перетащите картинку сюда', 'или нажмите, чтобы выбрать · PNG, JPG, WEBP, GIF') : ''}
      ${T === 'video' ? `${drop('upDrop', 'video/mp4,video/webm,video/quicktime', 'Перетащите видео сюда', 'MP4, WEBM, MOV до 30 МБ')}<div class="or"><span>или ссылка</span></div><label class="fld"><input name="url" placeholder="https://youtube.com/... или https://bilibili.com/..."></label>` : ''}
      ${T === 'fanfic' ? `<label class="fld"><span>Ссылка на оригинал</span><input name="url" placeholder="https://ficbook.net/... или https://archiveofourown.org/..."></label>
        <div class="fld-row"><label class="fld"><span>Фэндом</span><input name="fandom" maxlength="80" placeholder="например, Гарри Поттер"></label><label class="fld"><span>Пейринг</span><input name="pairing" maxlength="80" placeholder="например, Гарри/Драко"></label></div>
        <label class="fld"><span>Краткое описание</span><textarea name="desc" rows="3" maxlength="600" placeholder="1–2 предложения о том, что внутри"></textarea></label>
        <label class="fld"><span>Обложка (необязательно)</span></label>${drop('upCover', 'image/png,image/jpeg,image/webp,image/gif', 'Обложка', 'необязательно')}` : ''}
      <div class="fld"><span>Теги</span><div class="chips up-tags">${PRESET_TAGS.map(t => `<button type="button" class="chip" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
        <input class="tag-add" placeholder="${T === 'fanfic' ? 'Свои теги через запятую: ангст, AU, романтика' : 'Свой тег и Enter'}"></div>
      ${T === 'art' ? `<label class="sw"><input type="checkbox" name="blur"><i></i><div><b>Спойлер / пазл</b><span>Картинка в ленте будет размытой</span></div></label>
        <label class="fld puzzle" hidden><span>Сложность пазла</span><select name="puzzle"><option value="easy">Лёгкий</option><option value="x2">Сложный (×2)</option><option value="x3">Сложный (×3)</option><option value="x4">Очень сложный (×4)</option><option value="choice">На выбор зрителя</option></select></label>` : ''}
      ${T === 'fanfic' ? `<label class="sw"><input type="checkbox" name="r18"><i></i><div><b>18+</b><span>Иначе рейтинг PG-13</span></div></label>` : ''}
      <div class="up-foot"><div class="up-status" id="upStatus"></div><div class="up-bar" hidden><i id="upBar"></i></div><button class="btn accent up-send" type="submit">Отправить на проверку</button></div>
    </form></div>`;
  const form = $('#upForm');
  const wireDrop = (id, key, kind) => {
    const z = $('#' + id); if (!z) return;
    const inp = $('input', z), prev = $('.drop-preview', z), empty = $('.drop-empty', z);
    const take = f => {
      if (!f) return;
      if (kind === 'video' && f.size > 30 * 1024 * 1024) return toast('Видео больше 30 МБ', true);
      if (kind === 'image' && !/^image\//.test(f.type)) return toast('Нужна картинка', true);
      if (kind === 'video' && !/^video\//.test(f.type)) return toast('Нужно видео', true);
      UP[key] = f;
      const u = URL.createObjectURL(f);
      prev.innerHTML = (kind === 'video' ? `<video src="${u}" muted playsinline controls></video>` : `<img src="${u}" alt="">`) + `<div class="drop-name">${esc(f.name)} · ${(f.size / 1048576).toFixed(1)} МБ<button type="button" class="drop-x" aria-label="Убрать">✕</button></div>`;
      prev.hidden = false; empty.hidden = true; z.classList.add('has');
      if (kind === 'video') { const ui = form.url; if (ui) ui.value = ''; }
    };
    inp.onchange = () => take(inp.files[0]);
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); take(e.dataTransfer.files[0]); });
    z.addEventListener('click', e => { if (e.target.closest('.drop-x')) { e.preventDefault(); UP[key] = null; inp.value = ''; prev.hidden = true; prev.innerHTML = ''; empty.hidden = false; z.classList.remove('has'); } });
  };
  wireDrop('upDrop', 'file', T === 'video' ? 'video' : 'image');
  wireDrop('upCover', 'cover', 'image');
  const tagsBox = $('.up-tags', form), tagAdd = $('.tag-add', form);
  tagsBox.onclick = e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; UP.tags.has(t) ? UP.tags.delete(t) : UP.tags.add(t); b.classList.toggle('on', UP.tags.has(t)); };
  tagAdd.onkeydown = e => {
    if (e.key !== 'Enter' || T === 'fanfic') return;
    e.preventDefault();
    const t = tagAdd.value.trim().replace(/^#/, '').slice(0, 40); if (!t) return;
    if (!UP.tags.has(t)) { UP.tags.add(t); tagsBox.insertAdjacentHTML('beforeend', `<button type="button" class="chip on" data-tag="${esc(t)}">#${esc(t)}</button>`); }
    tagAdd.value = '';
  };
  if (form.blur) form.blur.onchange = () => { $('.puzzle', form).hidden = !form.blur.checked; };
  form.onsubmit = async e => {
    e.preventDefault();
    const st = $('#upStatus'), bar = $('.up-bar', form), btn = $('.up-send', form);
    const say = (t, err) => { st.textContent = t; st.classList.toggle('err', !!err); };
    const title = form.title.value.trim();
    if (!title) return say('Добавьте название', true);
    const url = form.url?.value.trim() || '';
    if (T === 'art' && !UP.file) return say('Выберите картинку', true);
    if (T === 'video' && !UP.file && !url) return say('Загрузите видео или вставьте ссылку', true);
    if (T === 'fanfic' && !/^https?:\/\//.test(url)) return say('Нужна ссылка на оригинал (https://…)', true);
    btn.disabled = true; say('');
    try {
      let source_url = url, cover_image_url = null;
      const prog = pct => { bar.hidden = false; $('#upBar').style.width = pct + '%'; say(`Загрузка файла: ${pct}%`); };
      if (UP.file) source_url = await uploadFile(UP.file, prog);
      if (UP.cover) cover_image_url = await uploadFile(UP.cover, prog);
      say('Сохраняем…');
      let tags = [...UP.tags];
      if (T === 'fanfic') tags = [...tags, ...tagAdd.value.split(',').map(t => t.trim()).filter(Boolean)];
      const body = { title, source_url, content_type: T, status: 'draft', submitted_by: S.uid, tags };
      if (T === 'art') { body.is_blurred = !!form.blur.checked; body.puzzle_difficulty = body.is_blurred ? form.puzzle.value : 'easy'; }
      if (T === 'fanfic') Object.assign(body, { fandom: form.fandom.value.trim() || null, pairing: form.pairing.value.trim() || null, description: form.desc.value.trim() || null, age_rating: form.r18.checked ? '18+' : 'pg13', cover_image_url });
      await api('content', { method: 'POST', body, prefer: 'return=minimal' });
      fetch(CDN_URL + '/notify-moderators', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ kind: T, title }) }).catch(() => {});
      page.innerHTML = `<div class="up-done"><div class="up-done-ic"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>Отправлено на проверку!</h1><p>Модераторы посмотрят работу и опубликуют её. Если что-то будет не так — придёт уведомление с причиной.</p><div class="up-done-acts"><a class="btn accent" href="#/new/${T}">Добавить ещё</a><a class="btn" href="#/">В ленту</a></div></div>`;
    } catch (er) { say('Ошибка: ' + er.message, true); btn.disabled = false; }
  };
}

/* ── поддержка: чат с модераторами (те же таблицы, что у основного сайта) ── */
const SUP = { thread: null, timer: null, owner: null };
async function viewSupport(threadArg) {
  setNav('support');
  clearInterval(SUP.timer);
  if (!S.uid) { page.innerHTML = '<div class="empty">Войдите, чтобы написать в поддержку.</div>'; return; }
  if (!S.me) await loadMe();
  const mod = isMod();
  page.innerHTML = `<div class="sup${mod ? ' sup-mod' : ''}">
    ${mod ? `<aside class="sup-list" id="supList"><div class="sup-list-head">Обращения</div><div id="supThreads">${'<div class="skel" style="aspect-ratio:auto;height:58px;margin:8px"></div>'.repeat(5)}</div></aside>` : ''}
    <section class="sup-chat" id="supChat">
      <header class="sup-head"><div class="sup-ava"><img src="${COIN}" alt=""></div><div><b>Поддержка renah0cki</b><span>Модераторы ответят здесь. Обычно в течение дня.</span></div></header>
      <div class="sup-msgs" id="supMsgs"><div class="empty">Загрузка…</div></div>
      <div class="sup-attach" id="supAttach" hidden></div>
      <form class="sup-form" id="supForm"><label class="btn sup-clip" title="Прикрепить фото" aria-label="Прикрепить фото"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><svg viewBox="0 0 24 24"><path d="M20 11.5 12.6 19a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/></svg></label><textarea rows="1" maxlength="2000" placeholder="Сообщение…" aria-label="Сообщение"></textarea><button class="btn accent" type="submit" aria-label="Отправить"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></form>
    </section></div>`;
  const form = $('#supForm'), ta = $('textarea', form), fileIn = $('.sup-clip input', form), att = $('#supAttach');
  SUP.file = null;
  const setFile = f => {
    if (f && !/^image\//.test(f.type)) return toast('Можно прикрепить только картинку', true);
    if (f && f.size > 15 * 1048576) return toast('Картинка больше 15 МБ', true);
    SUP.file = f || null; fileIn.value = '';
    if (!f) { att.hidden = true; att.innerHTML = ''; return; }
    att.innerHTML = `<img src="${URL.createObjectURL(f)}" alt=""><span>${esc(f.name)}</span><button type="button" class="drop-x" aria-label="Убрать фото">✕</button>`;
    att.hidden = false;
  };
  fileIn.onchange = () => setFile(fileIn.files[0]);
  att.onclick = e => { if (e.target.closest('.drop-x')) setFile(null); };
  ta.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); setFile(f); } });
  const chat = $('#supChat');
  chat.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); chat.classList.add('over'); } });
  chat.addEventListener('dragleave', e => { if (!chat.contains(e.relatedTarget)) chat.classList.remove('over'); });
  chat.addEventListener('drop', e => { e.preventDefault(); chat.classList.remove('over'); setFile(e.dataTransfer.files[0]); });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); form.requestSubmit(); } });
  form.onsubmit = async e => {
    e.preventDefault();
    const text = ta.value.trim(); if ((!text && !SUP.file) || !SUP.thread) return;
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      const msg = { thread_id: SUP.thread, sender_id: S.uid, body: text || '📷 Фото' };
      if (SUP.file) { att.classList.add('busy'); msg.image_url = await uploadFile(SUP.file, pct => { att.style.setProperty('--p', pct + '%'); }); }
      await api('support_messages', { method: 'POST', prefer: 'return=minimal', body: msg });
      ta.value = ''; ta.style.height = ''; att.classList.remove('busy'); setFile(null);
      await supLoad(true);
    } catch (er) { att.classList.remove('busy'); toast(er.message, true); }
    btn.disabled = false; ta.focus();
  };
  if (mod) { await supThreads(); if (threadArg) supOpen(threadArg); else $('#supMsgs').innerHTML = '<div class="empty">Выберите обращение слева.</div>'; }
  else { try { SUP.thread = await rpc('support_get_or_create_thread'); SUP.owner = S.uid; await supLoad(true); } catch (er) { $('#supMsgs').innerHTML = `<div class="empty">Ошибка: ${esc(er.message)}</div>`; } }
  SUP.timer = setInterval(() => { if (!$('#supChat')) return clearInterval(SUP.timer); if (SUP.thread) supLoad(false); if (mod) supThreads(); }, 8000);
}
async function supThreads() {
  const rows = await api('support_threads?select=*&order=last_message_at.desc.nullslast&limit=100').catch(() => []);
  await loadProfiles(rows.map(r => r.user_id));
  const box = $('#supThreads'); if (!box) return;
  box.innerHTML = rows.length ? rows.map(t => {
    const p = S.profiles.get(t.user_id);
    return `<button class="sup-thread${t.id === SUP.thread ? ' on' : ''}${t.status === 'in_progress' ? ' new' : ''}" data-sup="${t.id}">${avaHtml(p?.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b><span>${t.last_message_at ? when(t.last_message_at) : ''}${t.support_banned ? ' · 🚫' : ''}</span></div></button>`;
  }).join('') : '<div class="empty">Обращений нет.</div>';
}
function supOpen(id) { SUP.thread = id; $$('.sup-thread').forEach(b => b.classList.toggle('on', b.dataset.sup === id)); $('#supMsgs').innerHTML = '<div class="empty">Загрузка…</div>'; supLoad(true); }
async function supLoad(jump) {
  const id = SUP.thread; if (!id) return;
  const q = `support_messages?thread_id=eq.${id}&order=created_at.asc&select=id,sender_id,body,created_at`;
  const rows = await api(q + ',image_url').catch(() => api(q)).catch(() => null);
  const box = $('#supMsgs'); if (!box || rows == null || SUP.thread !== id) return;
  await loadProfiles(rows.map(r => r.sender_id));
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const html = rows.length ? rows.map((m, i) => {
    const mine = m.sender_id === S.uid, prev = rows[i - 1], p = S.profiles.get(m.sender_id);
    const head = !prev || prev.sender_id !== m.sender_id || new Date(m.created_at) - new Date(prev.created_at) > 36e5;
    return `${head ? `<div class="sup-meta${mine ? ' me' : ''}">${mine ? 'Вы' : esc(pname(p))} · ${when(m.created_at)}</div>` : ''}<div class="sup-bub${mine ? ' me' : ''}${m.image_url ? ' has-img' : ''}">${m.image_url && isOwnFile(m.image_url) ? `<a class="sup-img" href="${esc(m.image_url)}" data-supimg>${imgTag(m.image_url, 480)}</a>` : ''}${m.image_url && m.body === '📷 Фото' ? '' : `<span>${esc(m.body)}</span>`}</div>`;
  }).join('') : '<div class="empty sup-empty">Опишите проблему или вопрос — модераторы ответят здесь.</div>';
  if (box.dataset.h === html) return;
  box.dataset.h = html; box.innerHTML = html;
  if (jump || near) box.scrollTop = box.scrollHeight;
}
page.addEventListener('click', e => {
  const t = e.target.closest('[data-sup]'); if (t) supOpen(t.dataset.sup);
  const im = e.target.closest('[data-supimg]'); if (im) { e.preventDefault(); openViewer([im.getAttribute('href')], 0); }
});

/* ── меню, профиль, монеты ── */
function setNav(k) { $$('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === k)); document.querySelector('.app').classList.remove('menu-open'); }
$('#menuBtn').onclick = () => document.querySelector('.app').classList.toggle('menu-open');
// спонсоры в левом меню: список (видно 5), листается, порядок случайный
function loadSponsors() {
  swr('sponsors', () => api(`profiles?or=(role.eq.sponsor,extra_roles.cs.{sponsor})&select=id,username,display_name,avatar_url`), rows => {
    const box = $('#sponsList'); if (!box || !rows?.length) return;
    const ids = rows.map(r => r.id).sort().join();
    if (box.dataset.ids === ids) return;
    box.dataset.ids = ids;
    const list = [...rows].sort(() => Math.random() - .5);
    box.innerHTML = list.map(p => `<a class="spons-item" href="${userPath(p)}" title="${esc(pname(p))}">${imgTag(avatarUrl(p), 360, ' width="28" height="28"')}<span>${esc(pname(p))}</span></a>`).join('');
    $('#spons').hidden = false;
  }).catch(() => {});
}
loadSponsors();
// затухание снизу у списка спонсоров — пока есть что листать
$('#sponsList').addEventListener('scroll', e => { const l = e.currentTarget; l.classList.toggle('end', l.scrollTop + l.clientHeight >= l.scrollHeight - 2); }, { passive: true });
// топ 3 по балансу renah0cki coin (главный админ не учитывается — это на стороне базы)
function loadTopDonors() {
  swr('topdon', async () => {
    const rows = await rpc('coin_top', { p_limit: 3 });
    await loadProfiles(rows.map(r => r.user_id));
    return rows.map(r => ({ ...r, p: S.profiles.get(r.user_id) || null }));
  }, rows => {
    const box = $('#topDonList'); if (!box) return;
    if (!rows?.length) { $('#topDon').hidden = true; return; }
    box.innerHTML = rows.map((r, i) => `<a class="spons-item" href="${userPath(r.p || { id: r.user_id })}" title="${esc(pname(r.p))}"><span class="medal">${['🥇', '🥈', '🥉'][i] || ''}</span>${imgTag(avatarUrl(r.p), 360, ' width="28" height="28"')}<span>${esc(pname(r.p))}</span><span class="don-sum"><img src="${COIN}" alt="">${fmt(r.balance)}</span></a>`).join('');
    $('#topDon').hidden = false;
  }).catch(() => {});
}
loadTopDonors();
$('#meBtn').onclick = e => { e.stopPropagation(); $('#meMenu').hidden = !$('#meMenu').hidden; };
async function loadMe() {
  if (!S.uid) return;
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,short_code,role,extra_roles`);
    S.me = me; if (me) S.profiles.set(me.id, me);
    $('#meAva').src = avatarUrl(me);
    $('#meProfile').href = userPath(me);
    $('#meMod').hidden = !isMod();
    $('#navMod').hidden = !isMod();
    if (isMod()) modCount();
    setTimeout(() => { if (!NOTIF.loaded) loadNotifs(); }, 1200); // счётчик на колокольчике
  } catch {}
  try { const v = await rpc('coin_balance'); $('#coinVal').textContent = fmt(v || 0); } catch { $('#coinVal').textContent = '0'; }
}

/* ── вход / выход (Twitch, как на основном сайте) ── */
// Вход завершает основной сайт (он принимает ответ Twitch и создаёт профиль), потом возвращает сюда.
function login() {
  try { localStorage.setItem('fh_after_login', location.pathname + location.hash); } catch {}
  location.href = `${SB_URL}/auth/v1/authorize?provider=twitch&redirect_to=${encodeURIComponent(location.origin + '/')}`;
}
async function logout() {
  if (!confirm('Выйти из аккаунта?')) return;
  const s = readSession();
  try { if (s?.token) await fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.token } }); } catch {}
  try { localStorage.removeItem(LS_SESSION); } catch {}
  location.href = '/v2/';
}
$('#loginBtn').onclick = login;
$('#meLogout').onclick = logout;
$('#meEdit').onclick = () => { $('#meMenu').hidden = true; editProfile(); };
if (!S.uid) { document.querySelector('.app').classList.add('guest'); $('#loginBtn').hidden = false; }

/* ── редактирование своего профиля ── */
function editProfile() {
  const me = S.me; if (!me) return;
  let ava = me.avatar_url || '', file = null;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal pe"><h2>Редактировать профиль</h2>
    <div class="pe-ava"><img src="${esc(avatarUrl(me))}" alt=""><label class="btn">Загрузить фото<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label></div>
    <label>Никнейм<input name="n" maxlength="40" value="${esc(me.display_name || me.username || '')}" placeholder="Как тебя называть"></label>
    <label>Описание профиля<textarea name="b" rows="3" maxlength="100" placeholder="Расскажи немного о себе (до 100 символов)">${esc(me.bio || '')}</textarea></label>
    <p class="hint">Логин Twitch (@${esc(me.username || '')}) не меняется.</p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>Отмена</button><button class="btn accent" type="submit">Сохранить</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  const fi = $('input[type=file]', ov);
  fi.onchange = () => {
    const f = fi.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) return toast('Нужна картинка', true);
    if (f.size > 10 * 1048576) return toast('Картинка больше 10 МБ', true);
    file = f; $('.pe-ava img', ov).src = URL.createObjectURL(f);
  };
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, hint = $('.hint', ov), btn = $('button[type=submit]', f);
    const name = f.n.value.trim();
    if (!name) { hint.textContent = 'Никнейм не может быть пустым'; return; }
    btn.disabled = true;
    try {
      if (file) { hint.textContent = 'Загрузка фото…'; ava = await uploadFile(file, p => { hint.textContent = `Загрузка фото: ${p}%`; }); }
      const patch = { display_name: name, bio: f.b.value.trim() || null, avatar_url: ava || null };
      await api(`profiles?id=eq.${S.uid}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
      Object.assign(me, patch); S.profiles.set(me.id, { ...(S.profiles.get(me.id) || {}), ...patch });
      // старый сайт держит профиль в сессии — обновим и там
      try { const s = readSession(); if (s?.user) { Object.assign(s.user, patch); localStorage.setItem(LS_SESSION, JSON.stringify(s)); } } catch {}
      $('#meAva').src = avatarUrl(me);
      close(); toast('Профиль сохранён');
      if (/^#\/u\//.test(location.hash)) route();
    } catch (er) { hint.textContent = 'Ошибка: ' + er.message; btn.disabled = false; }
  };
  document.body.append(ov);
}

/* ── модерация: работы на проверке и жалобы на комментарии ── */
const MOD = { tab: 'queue' };
async function modCount() {
  const cnt = async q => { const t = await getToken(); const r = await fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), Prefer: 'count=exact', Range: '0-0' } }); return parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10) || 0; };
  try {
    const [a, b] = await Promise.all([cnt('content?select=id&status=eq.draft'), cnt('comment_reports?select=id&status=eq.pending')]);
    MOD.n = { queue: a, reports: b };
    const n = a + b, el = $('#modBadge');
    if (el) { el.textContent = n > 99 ? '99+' : String(n); el.hidden = !n; }
    $$('[data-modtab]').forEach(t => { const k = t.dataset.modtab, v = MOD.n[k]; const s = $('i', t); if (s) s.textContent = v ? v : ''; });
  } catch {}
}
function viewMod(tab) {
  setNav('mod');
  if (!S.me) { page.innerHTML = '<div class="empty">Загрузка…</div>'; return; }
  if (!isMod()) { page.innerHTML = '<div class="empty">Раздел только для модераторов.</div>'; return; }
  MOD.tab = tab === 'reports' ? 'reports' : 'queue';
  page.innerHTML = `<div class="mod"><div class="page-head"><h1>Модерация</h1></div>
    <div class="tabs mod-tabs"><a class="tab${MOD.tab === 'queue' ? ' on' : ''}" data-modtab="queue" href="#/mod">На проверке <i></i></a><a class="tab${MOD.tab === 'reports' ? ' on' : ''}" data-modtab="reports" href="#/mod/reports">Жалобы <i></i></a></div>
    <div id="modList">${'<div class="skel" style="aspect-ratio:auto;height:140px;margin-bottom:12px"></div>'.repeat(3)}</div></div>`;
  modCount();
  MOD.tab === 'queue' ? modQueue() : modReports();
}
function modMedia(it) {
  const src = it.source_url || '';
  if (it.content_type === 'art') {
    const imgs = Array.isArray(it.media_items) && it.media_items.length ? it.media_items.map(m => m.url).filter(Boolean) : [src];
    return `<div class="mod-imgs">${imgs.map((u, i) => `<a href="${esc(u)}" data-mzoom="${i}">${imgTag(u, 480)}</a>`).join('')}</div>`;
  }
  if (it.content_type === 'video') {
    const y = ytId(src);
    if (y) return `<div class="mod-video"><iframe src="https://www.youtube.com/embed/${y}" allowfullscreen loading="lazy"></iframe></div>`;
    if (isOwnFile(src) || isVideoFile(src)) return `<div class="mod-video"><video src="${esc(src)}" controls playsinline preload="metadata"></video></div>`;
    return src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">Открыть видео</a>` : '';
  }
  return `${it.cover_image_url ? `<div class="mod-imgs">${imgTag(it.cover_image_url, 360)}</div>` : ''}${src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">Открыть фанфик</a>` : ''}`;
}
async function modQueue() {
  let rows;
  try { rows = absorb(await api(`content?status=eq.draft&select=*,${AUTHOR}&order=created_at.asc&limit=50`)); }
  catch (e) { const b = $('#modList'); if (b) b.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; return; }
  const box = $('#modList'); if (!box || MOD.tab !== 'queue') return;
  const TN = { art: 'Арт', video: 'Видео', fanfic: 'Фанфик' };
  box.innerHTML = rows.length ? rows.map(it => {
    const a = it.author;
    const meta = [it.fandom && `Фэндом: ${esc(it.fandom)}`, it.pairing && `Пейринг: ${esc(it.pairing)}`, it.age_rating === '18+' && '18+', it.is_blurred && 'Спойлер / пазл'].filter(Boolean);
    return `<article class="mod-card" data-mid="${it.id}">
      <div class="mod-top">${avaHtml(a?.avatar_url, pname(a))}<div><b data-user="${esc(a?.username || it.submitted_by)}">${esc(pname(a))}</b><span>${TN[it.content_type] || it.content_type} · ${when(it.created_at)}</span></div></div>
      <h3>${esc(it.title || 'Без названия')}</h3>
      ${it.description ? `<p class="mod-desc">${esc(it.description)}</p>` : ''}
      ${meta.length ? `<div class="mod-meta">${meta.join(' · ')}</div>` : ''}
      ${Array.isArray(it.tags) && it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
      ${modMedia(it)}
      <div class="mod-acts"><button class="btn accent" data-mok="${it.id}">Одобрить</button><button class="btn" data-mno="${it.id}">Отклонить</button></div>
    </article>`;
  }).join('') : '<div class="empty">Очередь пуста — всё проверено.</div>';
}
async function modReports() {
  let rows;
  try { rows = await api('comment_reports?status=eq.pending&order=created_at.desc&select=id,reason,details,created_at,comment_id,reporter_id,comment:comments(id,body,author_id,content_id,created_at)'); }
  catch (e) { const b = $('#modList'); if (b) b.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; return; }
  await loadProfiles(rows.flatMap(r => [r.reporter_id, r.comment?.author_id]));
  const ids = [...new Set(rows.map(r => r.comment?.content_id).filter(Boolean))];
  const posts = ids.length ? await api(`content?id=in.(${ids.join(',')})&select=id,title,short_code`).catch(() => []) : [];
  const pm = new Map(posts.map(p => [p.id, p]));
  const box = $('#modList'); if (!box || MOD.tab !== 'reports') return;
  const RN = Object.fromEntries(REPORT_REASONS);
  box.innerHTML = rows.length ? rows.map(r => {
    const c = r.comment, au = S.profiles.get(c?.author_id), rep = S.profiles.get(r.reporter_id), post = pm.get(c?.content_id);
    return `<article class="mod-card" data-rid="${r.id}">
      <div class="mod-top"><span class="role role-moderator">${esc(RN[r.reason] || r.reason)}</span><span>от <b data-user="${esc(rep?.username || r.reporter_id)}">${esc(pname(rep))}</b> · ${when(r.created_at)}</span></div>
      ${r.details ? `<p class="mod-desc">«${esc(r.details)}»</p>` : ''}
      ${c ? `<div class="cmt">${avaHtml(au?.avatar_url, pname(au))}<div class="cmt-main"><div class="cmt-head"><b data-user="${esc(au?.username || c.author_id)}">${esc(pname(au))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body || '')}</div></div></div>
        ${post ? `<a class="mod-post" href="#/p/${esc(post.short_code || post.id)}">к посту «${esc(post.title || 'без названия')}»</a>` : ''}` : '<div class="mod-desc">Комментарий уже удалён.</div>'}
      <div class="mod-acts">${c ? `<button class="btn accent" data-rdel="${r.id}" data-cid="${c.id}">Удалить комментарий</button>` : ''}<button class="btn" data-rno="${r.id}">${c ? 'Оставить' : 'Закрыть жалобу'}</button></div>
    </article>`;
  }).join('') : '<div class="empty">Жалоб нет.</div>';
}
function modDone(card) { card.classList.add('gone'); setTimeout(() => { card.remove(); if (!$('.mod-card')) (MOD.tab === 'queue' ? modQueue : modReports)(); }, 250); modCount(); }
function rejectDialog() {
  return new Promise(res => {
    const ov = document.createElement('div');
    ov.className = 'v2-overlay';
    ov.innerHTML = `<form class="v2-modal"><h2>Отклонить работу</h2><label>Причина (автор её увидит)<textarea name="r" rows="3" maxlength="500" placeholder="Например: нарушает правила, плохое качество, не по теме"></textarea></label><div class="v2-modal-acts"><button type="button" class="btn" data-x>Отмена</button><button class="btn accent" type="submit">Отклонить</button></div></form>`;
    const close = v => { ov.remove(); res(v); };
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(undefined); });
    $('form', ov).onsubmit = e => { e.preventDefault(); close(e.target.r.value.trim() || null); };
    document.body.append(ov); setTimeout(() => $('textarea', ov).focus(), 30);
  });
}
page.addEventListener('click', async e => {
  const z = e.target.closest('[data-mzoom]');
  if (z) { e.preventDefault(); openViewer($$('[data-mzoom]', z.closest('.mod-imgs')).map(a => a.getAttribute('href')), +z.dataset.mzoom); return; }
  const ok = e.target.closest('[data-mok]'), no = e.target.closest('[data-mno]');
  if (ok || no) {
    const id = (ok || no).dataset[ok ? 'mok' : 'mno'], card = (ok || no).closest('.mod-card');
    let reason = null;
    if (no) { reason = await rejectDialog(); if (reason === undefined) return; }
    $$('button', card).forEach(b => { b.disabled = true; });
    try {
      const upd = await api(`content?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: ok ? { status: 'published', published_at: new Date().toISOString() } : { status: 'rejected', rejection_reason: reason } });
      if (!upd?.length) throw new Error('Не удалось изменить работу (нет прав?)');
      await api('moderation_log', { method: 'POST', prefer: 'return=minimal', body: { content_id: id, moderator_id: S.uid, action: ok ? 'approved' : 'rejected', ...(no ? { comment: reason } : {}) } }).catch(() => {});
      if (no) fetch(CDN_URL + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ contentId: id }) }).catch(() => {});
      if (ok) Object.keys(localStorage).filter(k => k.startsWith(LSC + 'feed:')).forEach(k => { MEM.delete(k.slice(LSC.length)); });
      toast(ok ? 'Опубликовано' : 'Отклонено');
      modDone(card);
    } catch (er) { toast(er.message, true); $$('button', card).forEach(b => { b.disabled = false; }); }
    return;
  }
  const rd = e.target.closest('[data-rdel]'), rn = e.target.closest('[data-rno]');
  if (rd || rn) {
    const card = (rd || rn).closest('.mod-card'), rid = (rd || rn).dataset[rd ? 'rdel' : 'rno'];
    if (rd && !confirm('Удалить комментарий?')) return;
    $$('button', card).forEach(b => { b.disabled = true; });
    try {
      if (rd) await api(`comments?id=eq.${rd.dataset.cid}`, { method: 'DELETE' });
      await api(`comment_reports?id=eq.${rid}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: rd ? 'resolved' : 'dismissed' } }).catch(er => { if (!rd) throw er; });
      toast(rd ? 'Комментарий удалён' : 'Жалоба закрыта');
      modDone(card);
    } catch (er) { toast(er.message, true); $$('button', card).forEach(b => { b.disabled = false; }); }
  }
});

/* ── правила ── */
function viewRules() {
  setNav('rules');
  page.innerHTML = `<article class="rules">
    <div class="page-head"><h1>Правила</h1></div>
    <section class="rules-card"><h2>Правила сайта</h2><ul>
      <li>Запрещается любой контент, нарушающий правила Twitch: запрещённые слова (банворды), NSFW-контент и т.д.</li>
      <li>Незнание правил не освобождает от ответственности.</li>
      <li>Нарушение правил на платформе может повлечь за собой блокировку в чате.</li></ul></section>
    <section class="rules-card"><h2>renah0cki coin</h2>
      <p>renah0cki coin — внутренняя игровая валюта сайта. Это не деньги, не электронные деньги и не криптовалюта: монеты нельзя вывести, обменять обратно на деньги или продать вне сайта.</p>
      <h3>Как получить</h3><ul>
        <li><b>Добровольный донат</b> через DonationAlerts: 1 ₽ = 1 coin (другие валюты — по курсу). Чтобы монеты пришли, впиши свой код <b>RN-…</b> в сообщение к донату. Донат без кода — просто поддержка проекта.</li>
        <li>Переводы и подарки от других пользователей, награды от администрации.</li></ul>
      <h3>Донат — это поддержка, а не покупка</h3><p>Донат делается добровольно, чтобы поддержать сайт; монеты — благодарность за поддержку. Донаты не возвращаются. Если ошибся в коде или монеты не пришли в течение часа — напиши в поддержку.</p>
      <h3>На что тратить</h3><ul><li>Подписки ГОЙ и VIP в Y (переписки).</li><li>Подарки авторам — монета под постом, её сразу получает автор.</li><li>Переводы другим пользователям.</li></ul>
      <p>Потраченные, подаренные и переведённые монеты не возвращаются.</p>
      <h3>Ограничения</h3><ul><li>Запрещено пользоваться ошибками сайта, накручивать монеты, продавать или покупать их за деньги вне сайта, выманивать монеты обманом.</li><li>За нарушения администрация может списать монеты, обнулить баланс или заблокировать аккаунт. Монеты, начисленные по ошибке, могут быть списаны.</li><li>При удалении аккаунта монеты сгорают.</li></ul>
      <h3>Изменения</h3><p>Цены, курс и то, на что тратятся монеты, могут меняться. Система монет может быть изменена или закрыта; деньги за монеты при этом не возвращаются.</p></section>
    <p class="rules-foot">Вопросы — в <a href="#/support">поддержку</a>.</p>
  </article>`;
}

/* ── роутер ── */
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (LB.skip) { LB.skip = false; return; }       // закрыли лайтбокс сами — лента остаётся как была
  if (LB.open) {
    if (parts[0] === 'p' && parts[1]) { if (parts[1] !== LB.key) lbRender(parts[1]); return; }
    LB.open = false; closeLightboxUi();
    if (lbBaseHash === location.hash) return;   // вернулись туда, откуда открыли — ленту не перерисовываем
  }
  if (!(parts[0] === 'p')) lbBaseHash = location.hash;
  scrollTo(0, 0);
  page.classList.remove('pg-in'); void page.offsetWidth; page.classList.add('pg-in');
  if (parts[0] === 'p' && parts[1]) return viewPost(parts[1]);
  if (['art', 'video', 'fanfic'].includes(parts[0])) return viewFeed(parts[0]);
  if (parts[0] === 'news') return parts[1] ? viewNewsArticle(parts[1]) : viewNews();
  if (parts[0] === 'suggest') return viewSuggest();
  if (parts[0] === 'u' && parts[1]) return viewProfile(parts[1]);
  if (parts[0] === 'notifications') return viewNotifs();
  if (parts[0] === 'support') return viewSupport(parts[1]);
  if (parts[0] === 'new') return viewNew(parts[1]);
  if (parts[0] === 'mod') return viewMod(parts[1]);
  if (parts[0] === 'rules') return viewRules();
  return viewFeed('all');
}
addEventListener('hashchange', route);
loadAllMyLikes();
loadMe().then(() => { if (/^#\/(suggest|news|u\/|mod)/.test(location.hash)) route(); }); // роли нужны для кнопок модератора
route();
})();
