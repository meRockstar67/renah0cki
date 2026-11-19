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
      <div class="card-author" data-user="${esc(a?.username || it.submitted_by)}"><img class="av" src="${esc(avatarUrl(a))}" alt="" loading="lazy"><span>${esc(pname(a))}</span></div>
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
    <div class="grid${FEED.type === 'art' ? ' grid-art' : ''}" id="grid">${'<div class="skel"></div>'.repeat(8)}</div><div class="more" id="more"></div>`;
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
    <div class="post-head"><img class="av" src="${esc(avatarUrl(a))}" alt="" data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer"><div><b data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer">${esc(pname(a))}</b><div class="sub">${when(it.published_at || it.created_at)} · ${fmt(it.views)} просмотров</div></div>
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
  page.innerHTML = `<div class="page-head"><h1>Новости</h1>${isMod() ? '<a class="btn" href="/?v2=news">Написать</a>' : ''}</div><div class="grid" id="newsGrid">${'<div class="skel"></div>'.repeat(6)}</div>`;
  let rows = [];
  try { rows = await api('news?select=*,author:profiles!news_author_id_fkey(username,display_name,avatar_url)&order=pinned.desc,created_at.desc&limit=60'); }
  catch (e) { $('#newsGrid').outerHTML = `<div class="empty">Не удалось загрузить: ${esc(e.message)}</div>`; return; }
  rows.forEach(n => NEWS.cache.set(n.id, n));
  await Promise.all([newsLoadChans(rows), newsLoadLiked(rows.map(r => r.id))]);
  const g = $('#newsGrid'); if (!g) return;
  g.outerHTML = rows.length ? `<div class="grid" id="newsGrid">${rows.map(newsCardHtml).join('')}</div>` : '<div class="empty">Пока новостей нет.</div>';
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
  let rows = [];
  try { rows = await api('suggestions?select=*&order=approved_at.desc.nullsfirst,created_at.desc&limit=100'); }
  catch (e) { $('#sgGrid').outerHTML = `<div class="empty">Не удалось загрузить: ${esc(e.message)}</div>`; return; }
  const yt = {};
  try {
    const ids = [...new Set(rows.map(r => r.video_id))].slice(0, 50).join(',');
    if (ids) (await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${YT_KEY}`)).json()).items?.forEach(it => { yt[it.id] = it; });
  } catch {}
  const g = $('#sgGrid'); if (!g) return;
  const mod = isMod();
  g.outerHTML = rows.length ? `<div class="grid sg-grid" id="sgGrid">${rows.map(r => {
    const id = encodeURIComponent(r.video_id), y = yt[r.video_id], dur = ytDuration(y?.contentDetails?.duration);
    const pending = r.status !== 'approved', canDel = S.uid && (S.uid === r.user_id || mod);
    return `<article class="card sg-card">
      <a class="card-media" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer"><img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy">
        ${pending ? '<span class="badge pin warn">На проверке</span>' : ''}${dur ? `<span class="badge type">${dur}</span>` : ''}</a>
      <div class="card-body">
        ${r.author_name ? `<div class="card-author"><span>${esc(r.author_name)}</span></div>` : ''}
        <h3 class="card-title"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">${esc(r.title || 'Видео')}</a></h3>
        <div class="card-stats">${y?.statistics?.viewCount != null ? `<span title="Просмотры на YouTube">${I.views}${fmt(y.statistics.viewCount)}</span>` : ''}<time>${when(r.approved_at || r.created_at)}</time></div>
        ${(pending && mod) || canDel ? `<div class="sg-acts">${pending && mod ? `<button class="btn accent" data-sg-ok="${r.id}">Одобрить</button>` : ''}${canDel ? `<button class="btn" data-sg-del="${r.id}">Удалить</button>` : ''}</div>` : ''}
      </div></article>`;
  }).join('')}</div>` : '<div class="empty">Пока пусто — предложи первое видео.</div>';
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
      close(); toast(mod ? 'Видео добавлено' : 'Отправлено на проверку модераторам'); viewSuggest();
    } catch (er) { hint.textContent = 'Ошибка: ' + er.message; }
  };
  document.body.append(ov); setTimeout(() => $('input', ov).focus(), 30);
}
page.addEventListener('click', async e => {
  if (e.target.closest('[data-sg-add]')) return sgAddDialog();
  const ok = e.target.closest('[data-sg-ok]');
  if (ok) { ok.disabled = true; try { await api(`suggestions?id=eq.${ok.dataset.sgOk}`, { method: 'PATCH', body: { status: 'approved', approved_at: new Date().toISOString() } }); viewSuggest(); } catch (er) { toast(er.message, true); ok.disabled = false; } return; }
  const del = e.target.closest('[data-sg-del]');
  if (del) { if (!confirm('Удалить видео из предложки?')) return; try { await api(`suggestions?id=eq.${del.dataset.sgDel}`, { method: 'DELETE' }); viewSuggest(); } catch (er) { toast(er.message, true); } }
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
    api(`content?submitted_by=eq.${p.id}&status=eq.published&order=published_at.desc.nullslast,created_at.desc&select=id,short_code,title,description,source_url,cover_image_url,media_items,content_type,submitted_by,views,likes,comments_count,is_blurred,published_at,created_at`).catch(() => []),
    (async () => { const t = await getToken(); const r = await fetch(`${SB_URL}/rest/v1/subscriptions?following_id=eq.${p.id}&select=id`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), Prefer: 'count=exact', Range: '0-0' } }); return parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10) || 0; })().catch(() => 0),
    S.uid && !own ? api(`subscriptions?follower_id=eq.${S.uid}&following_id=eq.${p.id}&select=id`).catch(() => []) : Promise.resolve([]),
  ]);
  await loadMyLikes(works.map(w => w.id));
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
        ${own ? `<a class="btn" href="/@${encodeURIComponent(p.username || '')}">Редактировать</a>`
          : S.uid ? `<button class="btn${subscribed ? '' : ' accent'}" id="subBtn">${subscribed ? '✓ Вы подписаны' : 'Подписаться'}</button>` : ''}
        <button class="btn icon-only" id="profCopy" title="Скопировать ссылку">${I.link}</button>
      </div>
    </section>
    <div class="tabs prof-tabs"><button class="tab on">Работы</button></div>
    ${works.length ? `<div class="grid">${works.map(cardHtml).join('')}</div>` : `<div class="empty">${own ? 'У вас пока нет опубликованных работ.' : 'Пока нет опубликованных работ.'}</div>`}
  </div>`;
  $('#profCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/@${encodeURIComponent(p.username || p.id)}`); toast('Ссылка скопирована'); } catch { toast('Не удалось скопировать', true); } };
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

/* ── меню, профиль, монеты ── */
function setNav(k) { $$('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === k)); document.querySelector('.app').classList.remove('menu-open'); }
$('#menuBtn').onclick = () => document.querySelector('.app').classList.toggle('menu-open');
$('#collapseBtn').onclick = () => { const a = document.querySelector('.app'); a.classList.toggle('collapsed'); try { localStorage.setItem('v2_side', a.classList.contains('collapsed') ? '1' : '0'); } catch {} };
try { if (localStorage.getItem('v2_side') === '1') document.querySelector('.app').classList.add('collapsed'); } catch {}
$('#meBtn').onclick = e => { e.stopPropagation(); $('#meMenu').hidden = !$('#meMenu').hidden; };
async function loadMe() {
  if (!S.uid) return;
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,short_code,role,extra_roles`);
    S.me = me; if (me) S.profiles.set(me.id, me);
    $('#meAva').src = avatarUrl(me);
    $('#meProfile').href = userPath(me);
    setTimeout(() => { if (!NOTIF.loaded) loadNotifs(); }, 1200); // счётчик на колокольчике
  } catch {}
  try { const v = await rpc('coin_balance'); $('#coinVal').textContent = fmt(v || 0); } catch { $('#coinVal').textContent = '0'; }
}

/* ── роутер ── */
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  scrollTo(0, 0);
  if (parts[0] === 'p' && parts[1]) return viewPost(parts[1]);
  if (['art', 'video', 'fanfic'].includes(parts[0])) return viewFeed(parts[0]);
  if (parts[0] === 'news') return parts[1] ? viewNewsArticle(parts[1]) : viewNews();
  if (parts[0] === 'suggest') return viewSuggest();
  if (parts[0] === 'u' && parts[1]) return viewProfile(parts[1]);
  if (parts[0] === 'notifications') return viewNotifs();
  return viewFeed('all');
}
addEventListener('hashchange', route);
loadMe().then(() => { if (/^#\/(suggest|news|u\/)/.test(location.hash)) route(); }); // роли нужны для кнопок модератора
route();
})();
