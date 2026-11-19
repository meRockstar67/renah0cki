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
const fmt = n => { n = Number(n) || 0; return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.0', '') + 'k' : n.toLocaleString('ru-RU'); };
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

/* ── состояние ── */
const S = {
  uid: readSession()?.user?.id || null,
  me: null,
  profiles: new Map(),           // кэш профилей авторов
  liked: new Set(),               // мои лайки (content)
  feed: { key: '', items: [], done: false, loading: false },
};
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
  if (it.content_type === 'fanfic') return `<div class="card-fanfic">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35">` : ''}<p style="position:relative">${esc((it.description || '').slice(0, 220))}</p></div>`;
  if (it.content_type === 'video') {
    if (cover) return `<img src="${esc(cover)}" alt="" loading="lazy">`;
    const y = ytId(src); if (y) return `<img src="https://img.youtube.com/vi/${y}/hqdefault.jpg" alt="" loading="lazy">`;
    if (isOwnFile(src)) return `<video src="${esc(src)}#t=0.5" preload="metadata" muted playsinline tabindex="-1"></video>`;
    return '';
  }
  const first = src || (Array.isArray(it.media_items) && it.media_items[0]?.url) || cover;
  return first ? `<img src="${esc(first)}" alt="" loading="lazy">` : '';
}
const TYPE_BADGE = { video: [I.play, 'Видео'], fanfic: [I.text, 'Фанфик'], art: null };
function cardHtml(it) {
  const a = S.profiles.get(it.submitted_by);
  const b = TYPE_BADGE[it.content_type];
  const liked = S.liked.has(it.id);
  return `<article class="card" data-open="${esc(it.short_code || it.id)}">
    <div class="card-media${it.is_blurred ? ' blur' : ''}">${thumbHtml(it)}
      ${it.is_blurred ? `<div class="eye">${I.eye}</div>` : ''}
      ${it.pinned ? `<span class="badge pin">${I.pin} Закреплено</span>` : ''}
      ${b ? `<span class="badge type">${b[0]} ${b[1]}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-author"><img class="av" src="${esc(avatarUrl(a))}" alt="" loading="lazy"><span>${esc(pname(a))}</span></div>
      <h3 class="card-title">${esc(it.title || 'Без названия')}</h3>
      ${it.description && it.content_type !== 'fanfic' ? `<p class="card-desc">${esc(it.description)}</p>` : ''}
      <div class="card-stats">
        <span title="Просмотры">${I.views}${fmt(it.views)}</span>
        <span class="${liked ? 'liked' : ''}" title="Лайки">${I.heart}${fmt(it.likes)}</span>
        <span title="Комментарии">${I.comment}${fmt(it.comments_count)}</span>
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
  let q = `content?status=eq.published&select=id,short_code,title,description,source_url,cover_image_url,media_items,content_type,submitted_by,views,likes,comments_count,is_blurred,published_at,created_at`;
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
    <div class="grid" id="grid">${'<div class="skel"></div>'.repeat(8)}</div><div class="more" id="more"></div>`;
  S.feed = { key: JSON.stringify(FEED), items: [], done: false, loading: false };
  loadMore(true);
}
async function loadMore(first) {
  const f = S.feed; if (f.loading || f.done) return;
  f.loading = true; const key = f.key;
  try {
    const rows = await feedQuery(f.items.length);
    if (key !== S.feed.key) return;
    await Promise.all([loadProfiles(rows.map(r => r.submitted_by)), loadMyLikes(rows.map(r => r.id))]);
    if (key !== S.feed.key) return;
    f.items.push(...rows); f.done = rows.length < PAGE;
    const grid = $('#grid'); if (!grid) return;
    if (first) grid.innerHTML = '';
    grid.insertAdjacentHTML('beforeend', rows.map(cardHtml).join(''));
    if (!f.items.length) grid.outerHTML = `<div class="empty">${FEED.tab === 'subs' ? 'Тут появятся посты тех, на кого вы подписаны.' : FEED.q ? 'Ничего не найдено.' : 'Пока пусто.'}</div>`;
  } catch (e) { const g = $('#grid'); if (g && first) g.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; }
  finally { if (key === S.feed.key) f.loading = false; }
}
addEventListener('scroll', () => {
  if (!$('#grid')) return;
  if (innerHeight + scrollY > document.body.scrollHeight - 900) loadMore(false);
}, { passive: true });

page.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { FEED.tab = tab.dataset.tab; subsIds = null; return viewFeed(FEED.type); }
  if (e.target.closest('[data-filter-toggle]')) { const p = $('.filter-pop', page); p.hidden = !p.hidden; return; }
  const ft = e.target.closest('[data-ftype]');
  if (ft) { const t = ft.dataset.ftype; location.hash = t === 'all' ? '#/' : '#/' + t; return; }
  const fs = e.target.closest('[data-fsort]');
  if (fs) { FEED.sort = fs.dataset.fsort; return viewFeed(FEED.type); }
  const card = e.target.closest('[data-open]');
  if (card) { location.hash = '#/p/' + card.dataset.open; }
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
async function viewPost(key) {
  setNav('');
  page.innerHTML = `<div class="post"><div class="skel" style="aspect-ratio:16/9"></div></div>`;
  let it;
  try {
    const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `short_code=eq.${encodeURIComponent(key)}`;
    [it] = await api(`content?${f}&select=*`);
  } catch (e) { page.innerHTML = `<div class="empty">Ошибка: ${esc(e.message)}</div>`; return; }
  if (!it) { page.innerHTML = '<div class="empty">Пост не найден</div>'; return; }
  await Promise.all([loadProfiles([it.submitted_by]), loadMyLikes([it.id])]);
  const a = S.profiles.get(it.submitted_by);
  const src = it.source_url || '';
  let media = '';
  if (it.content_type === 'video') {
    const y = ytId(src);
    media = y ? `<iframe src="https://www.youtube.com/embed/${y}" allowfullscreen loading="lazy"></iframe>` : isOwnFile(src) || isVideoFile(src) ? `<video src="${esc(src)}" controls playsinline preload="metadata"></video>` : `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener">Открыть видео</a>`;
  } else if (it.content_type === 'art') {
    const imgs = Array.isArray(it.media_items) && it.media_items.length ? it.media_items.map(m => m.url).filter(Boolean) : [src];
    media = imgs.map(u => `<img src="${esc(u)}" alt="">`).join('');
  }
  const liked = S.liked.has(it.id);
  page.innerHTML = `<div class="post">
    <button class="back" data-back>${I.back} Назад</button>
    ${media ? `<div class="post-media${it.is_blurred ? ' blur' : ''}" id="postMedia">${media}</div>` : ''}
    <div class="post-head"><img class="av" src="${esc(avatarUrl(a))}" alt=""><div><b>${esc(pname(a))}</b><div class="sub">${when(it.published_at || it.created_at)} · ${fmt(it.views)} просмотров</div></div>
      <div class="post-actions"><button class="btn like-btn${liked ? ' liked' : ''}" id="likeBtn">${I.heart}<span>${fmt(it.likes)}</span></button><button class="btn" id="copyBtn" title="Скопировать ссылку">${I.link}</button></div></div>
    <h1>${esc(it.title || 'Без названия')}</h1>
    ${it.description && it.content_type !== 'fanfic' ? `<p class="post-desc">${esc(it.description)}</p>` : ''}
    ${it.content_type === 'fanfic' ? `<div class="post-text">${esc(it.description || '')}</div>` : ''}
    ${Array.isArray(it.tags) && it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    <section class="comments" id="comments"><h3>Комментарии</h3><div class="empty" style="padding:20px">Загрузка…</div></section>
  </div>`;
  if (it.is_blurred) $('#postMedia')?.addEventListener('click', ev => ev.currentTarget.classList.remove('blur'), { once: true });
  $('#likeBtn').onclick = async ev => {
    const b = ev.currentTarget; b.disabled = true;
    try {
      const on = await rpc('toggle_content_like', { p_content_id: it.id });
      it.likes = Math.max(0, (it.likes || 0) + (on ? 1 : -1));
      if (on) S.liked.add(it.id); else S.liked.delete(it.id);
      b.classList.toggle('liked', !!on); $('span', b).textContent = fmt(it.likes);
    } catch (er) { toast(er.message, true); }
    b.disabled = false;
  };
  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${it.short_code || '?post=' + it.id}`); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать', true); } };
  rpc('increment_content_views', { content_id: it.id }).catch(() => {});
  loadComments(it.id);
}
async function loadComments(id) {
  const box = $('#comments'); if (!box) return;
  let rows = [];
  try { rows = await api(`comments?content_id=eq.${id}&is_deleted=eq.false&select=id,body,author_id,created_at,parent_id&order=created_at.asc&limit=500`); }
  catch { rows = await api(`comments?content_id=eq.${id}&is_deleted=eq.false&select=id,body,author_id,created_at&order=created_at.asc&limit=500`).catch(() => []); }
  await loadProfiles(rows.map(r => r.author_id));
  if (!$('#comments')) return;
  box.innerHTML = `<h3>Комментарии · ${rows.length}</h3>` + (rows.length ? rows.map(c => {
    const p = S.profiles.get(c.author_id);
    return `<div class="cmt"${c.parent_id ? ' style="margin-left:42px"' : ''}><img class="av" src="${esc(avatarUrl(p))}" alt="" loading="lazy"><div class="cmt-main"><div class="cmt-head"><b>${esc(pname(p))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body || '')}</div></div></div>`;
  }).join('') : '<div class="empty" style="padding:20px">Комментариев пока нет</div>');
}
page.addEventListener('click', e => { if (e.target.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = '#/'); } });

/* ── меню, профиль, монеты ── */
function setNav(k) { $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.nav === k)); document.querySelector('.app').classList.remove('menu-open'); }
$('#menuBtn').onclick = () => document.querySelector('.app').classList.toggle('menu-open');
$('#collapseBtn').onclick = () => { const a = document.querySelector('.app'); a.classList.toggle('collapsed'); try { localStorage.setItem('v2_side', a.classList.contains('collapsed') ? '1' : '0'); } catch {} };
try { if (localStorage.getItem('v2_side') === '1') document.querySelector('.app').classList.add('collapsed'); } catch {}
$('#meBtn').onclick = e => { e.stopPropagation(); $('#meMenu').hidden = !$('#meMenu').hidden; };
async function loadMe() {
  if (!S.uid) return;
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,short_code`);
    S.me = me; if (me) S.profiles.set(me.id, me);
    $('#meAva').src = avatarUrl(me);
    $('#meProfile').href = me?.username ? `/@${encodeURIComponent(me.username)}` : '/';
  } catch {}
  try { const v = await rpc('coin_balance'); $('#coinVal').textContent = fmt(v || 0); } catch { $('#coinVal').textContent = '0'; }
}

/* ── роутер ── */
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  scrollTo(0, 0);
  if (parts[0] === 'p' && parts[1]) return viewPost(parts[1]);
  if (['art', 'video', 'fanfic'].includes(parts[0])) return viewFeed(parts[0]);
  return viewFeed('all');
}
addEventListener('hashchange', route);
loadMe();
route();
})();
