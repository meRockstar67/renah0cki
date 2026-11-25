(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const LS_SESSION = 'fh_session';
const PAGE = 24;
const COIN = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const tl = (s, v) => (window.I18N ? window.I18N.t(s, v) : s);
const coinW = n => (window.I18N?.coin ? window.I18N.coin(n) : 'пузокоинов');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace('.0', '') + 'm';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.0', '') + 'k';
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
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};

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

const BASE = location.pathname.startsWith('/v2/') ? '/v2/' : '/';
const SPA_TOP = new Set(['art', 'video', 'fanfic', 'news', 'suggest', 'u', 'p', 'c', 'notifications', 'support', 'new', 'collections', 'mod', 'rules', 'privacy', 'wallet', 'shop', 'settings', 'streak']);
function curRoute() {
  if (location.hash.startsWith('#/')) return location.hash.slice(2).replace(/^\/+|\/+$/g, '');
  const p = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\/+/, '');
  return p.replace(/^\/+|\/+$/g, '');
}
function routeUrl(to) {
  const clean = String(to || '').replace(/^#?\/+/, '').replace(/\/+$/, '');
  return clean ? BASE + clean : BASE;
}
function go(to, { replace = false } = {}) {
  const mm = $('#meMenu'), np = $('#notifPop');
  if (mm) mm.hidden = true;
  if (np) np.hidden = true;
  const url = routeUrl(to);
  if (url === location.pathname && !location.search && !location.hash) return route();
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  route();
}

async function finishOAuth() {
  const hp = new URLSearchParams(location.hash.slice(1));
  const back = (() => { try { const b = localStorage.getItem('fh_after_login'); localStorage.removeItem('fh_after_login'); return b && /^\/(?!\/)/.test(b) ? b : BASE; } catch { return BASE; } })();
  const show = t => { document.body.innerHTML = `<div style="min-height:100dvh;display:grid;place-items:center;font:600 16px system-ui;color:#8ea3c2;background:#0b1220">${t}</div>`; };
  history.replaceState(null, '', location.pathname + location.search);
  if (hp.get('error')) { show(tl('Вход не удался: ') + esc(hp.get('error_description') || hp.get('error'))); setTimeout(() => location.replace(back), 2500); return; }
  const token = hp.get('access_token'), refresh = hp.get('refresh_token');
  show(tl('Входим…'));
  try {
    const h = { apikey: SB_KEY, Authorization: 'Bearer ' + token };
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: h }).then(r => { if (!r.ok) throw new Error(tl('токен не принят')); return r.json(); });
    const meta = u.user_metadata || {};
    const tName = meta.nickname || meta.preferred_username || meta.full_name || meta.name || null;
    const tAva = meta.avatar_url || meta.picture || null;
    const [ex] = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${u.id}&select=username,avatar_url`, { headers: h }).then(r => r.json()).catch(() => []);
    const patch = {};
    if (!ex || !ex.username) { patch.username = tName || 'twitch_user'; patch.avatar_url = tAva; }
    else { if (tName) patch.username = tName; if (tAva) patch.avatar_url = tAva; }
    if (Object.keys(patch).length) await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${u.id}`, { method: 'PATCH', headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(patch) }).catch(() => {});
    const [p] = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${u.id}&select=username,display_name,avatar_url,role,extra_roles,is_banned,name_color,bio`, { headers: h }).then(r => r.json()).catch(() => []);
    localStorage.setItem(LS_SESSION, JSON.stringify({ user: { ...u, ...(p || {}), extra_roles: p?.extra_roles || [] }, token, refreshToken: refresh }));
    const tg = (() => { try { return localStorage.getItem('fh_tglink'); } catch { return null; } })();
    if (tg) {
      try { localStorage.removeItem('fh_tglink'); } catch {}
      await fetch(`${SB_URL}/rest/v1/rpc/claim_tg_link`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: tg }) }).catch(() => {});
    }
    location.replace(back);
  } catch (e) { show(tl('Вход не удался: ') + esc(e.message) + tl('. Попробуйте ещё раз.')); setTimeout(() => location.replace(back), 3000); }
}
if (/[#&]access_token=|[#&]error=/.test(location.hash)) { finishOAuth(); return; }

async function resolveLegacy() {
  let path = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '') : '';
  const qs = new URLSearchParams(location.search);
  const hadRedir = qs.has('redirect');
  if (!path && qs.get('redirect')) path = qs.get('redirect').replace(/^\/+|\/+$/g, '');
  let target = null;
  const firstSeg = path.split('/')[0];
  const ym = path.match(/^y\/(.+)$/);
  if (ym) { location.replace('/rp/#/' + (ym[1].includes('/') ? ym[1] : 'p/' + ym[1])); return false; }
  if (path && SPA_TOP.has(firstSeg)) target = path;
  else if (path.startsWith('@')) target = 'u/' + encodeURIComponent(decodeURIComponent(path.slice(1)));
  else if (/^n\/[A-Za-z0-9]{4,12}$/.test(path)) target = 'news/' + path.slice(2);
  else if (/^[A-Za-z0-9]{4,12}$/.test(path) && path !== 'old') {
    const sel = t => api(`${t}?short_code=eq.${path}&select=id,short_code`).catch(() => []);
    const [[c], [k], [n]] = await Promise.all([sel('content'), sel('collections'), sel('news')]);
    target = c ? 'p/' + path : k ? 'c/' + path : n ? 'news/' + n.id : '';
  }
  else if (qs.get('post')) target = 'p/' + qs.get('post');
  else if (qs.get('collection')) target = 'c/' + qs.get('collection');
  else if (qs.get('news')) target = 'news/' + qs.get('news');
  else if (qs.get('user')) target = 'u/' + qs.get('user');
  else if (qs.get('rules')) target = 'rules';
  else if (qs.get('streak')) target = 'streak';
  else if (qs.get('openModeration')) target = 'mod';
  else if (location.hash.startsWith('#/')) target = location.hash.slice(2).replace(/^\/+|\/+$/g, '');

  const hasLegacyQ = hadRedir || ['post', 'collection', 'news', 'user', 'rules', 'streak', 'openModeration'].some(k => qs.has(k));
  if (target == null && !hasLegacyQ && !location.hash.startsWith('#/')) return true;
  const keep = new URLSearchParams(); if (qs.get('tglink')) keep.set('tglink', qs.get('tglink'));
  const cleanUrl = routeUrl(target || '') + (keep.toString() ? '?' + keep : '');
  history.replaceState(null, '', cleanUrl);
  return true;
}

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
function thumbUrl(u, w) {
  const m = String(u || '').match(/^https:\/\/cdn\.renah0cki\.xyz\/file\/(.+)$/);
  return m && /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(m[1]) ? `${CDN_URL}/thumb/${w}/${m[1]}` : u;
}
const imgTag = (u, w, extra = '') => {
  const t = thumbUrl(u, w);
  return `<img class="fade" onload="this.classList.add('ld')" src="${esc(t)}"${t !== u ? ` data-full="${esc(u)}" onerror="this.onerror=null;this.src=this.dataset.full"` : ''} alt="" loading="lazy" decoding="async"${extra}>`;
};

const S = {
  uid: readSession()?.user?.id || null,
  me: null,
  profiles: new Map(),
  liked: new Set(),
  feed: { key: '', items: [], done: false, loading: false },
  items: new Map(),
};
const AUTHOR = 'author:profiles!content_submitted_by_fkey(id,username,display_name,avatar_url,name_color,role,extra_roles)';
const CARD_SEL = `id,short_code,title,description,source_url,cover_image_url,media_items,content_type,submitted_by,views,likes,comments_count,is_blurred,puzzle_difficulty,published_at,created_at,${AUTHOR}`;
function absorb(rows) {
  rows.forEach(r => {
    if (r.author) { S.profiles.set(r.author.id, { ...(S.profiles.get(r.author.id) || {}), ...r.author }); }
    S.items.set(r.id, r); if (r.short_code) S.items.set(r.short_code, r);
  });
  return rows;
}
let likesReady = null;
function loadAllMyLikes() {
  if (!S.uid) return Promise.resolve();
  return likesReady ||= api(`content_likes?user_id=eq.${S.uid}&select=content_id&order=created_at.desc&limit=5000`).then(r => r.forEach(x => S.liked.add(x.content_id))).catch(() => {});
}
async function loadProfiles(ids, forceRoles = false) {
  const need = [...new Set(ids.filter(id => id && (!S.profiles.has(id) || (forceRoles && S.profiles.get(id)?.role === undefined))))];
  for (let i = 0; i < need.length; i += 80) {
    const rows = await api(`profiles?id=in.(${need.slice(i, i + 80).join(',')})&select=id,username,display_name,avatar_url,name_color,short_code,role,extra_roles`).catch(() => []);
    rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
  }
}
async function loadMyLikes(ids) {
  if (!S.uid || !ids.length) return;
  const rows = await api(`content_likes?user_id=eq.${S.uid}&content_id=in.(${ids.join(',')})&select=content_id`).catch(() => []);
  rows.forEach(r => S.liked.add(r.content_id));
}
const pname = p => p?.display_name || p?.username || tl('без имени');
const GUEST_AVA = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Cdefs%3E%3ClinearGradient id=%22b%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%2322365c%22/%3E%3Cstop offset=%221%22 stop-color=%22%2314213a%22/%3E%3C/linearGradient%3E%3ClinearGradient id=%22f%22 x1=%220%22 y1=%220%22 x2=%220%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%23cfe9ff%22/%3E%3Cstop offset=%221%22 stop-color=%22%236cc4ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22100%22 height=%22100%22 fill=%22url(%23b)%22/%3E%3Ccircle cx=%2250%22 cy=%2240%22 r=%2217%22 fill=%22url(%23f)%22 opacity=%22.9%22/%3E%3Cpath d=%22M18,100 C18,76 32,64 50,64 C68,64 82,76 82,100 Z%22 fill=%22url(%23f)%22 opacity=%22.9%22/%3E%3C/svg%3E";
const avatarUrl = p => p?.avatar_url || COIN;

const EQ = new Map();
const SHOP_BADGES = {
  badge_snow: [tl('Снежинка'), '<svg viewBox="0 0 24 24"><path fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8"/><path fill="none" stroke="#e0f2fe" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m9.5 4.8 2.5 2.4 2.5-2.4M9.5 19.2 12 16.8l2.5 2.4M4.8 10.6l3.2-.8-.8-3.2M19.2 10.6 16 9.8l.8-3.2M4.8 13.4l3.2.8-.8 3.2M19.2 13.4l-3.2.8.8 3.2"/><polygon points="12,9.2 14.8,12 12,14.8 9.2,12" fill="#fff"/></svg>'],
  badge_paw: [tl('Лапка'), '<svg viewBox="0 0 24 24"><ellipse cx="6.2" cy="9.6" rx="2.3" ry="3" transform="rotate(-18 6.2 9.6)" fill="#f472b6"/><ellipse cx="10.2" cy="6.4" rx="2.2" ry="3" transform="rotate(-6 10.2 6.4)" fill="#f9a8d4"/><ellipse cx="14.6" cy="6.6" rx="2.2" ry="3" transform="rotate(8 14.6 6.6)" fill="#f9a8d4"/><ellipse cx="18.2" cy="10.1" rx="2.3" ry="3" transform="rotate(20 18.2 10.1)" fill="#f472b6"/><path fill="#ec4899" d="M12 11.2c-3.4 0-6 2.8-6 5.6 0 2 1.5 3.4 3.4 3.4 1.1 0 1.8-.4 2.6-.4s1.5.4 2.6.4c1.9 0 3.4-1.4 3.4-3.4 0-2.8-2.6-5.6-6-5.6z"/><path fill="#fbcfe8" opacity=".6" d="M12 12.6c-1.8 0-3.2 1.2-3.4 2.6 1.2-.6 2.3-.9 3.4-.9s2.2.3 3.4.9c-.2-1.4-1.6-2.6-3.4-2.6z"/></svg>'],
  badge_star: [tl('Звезда'), '<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M11 2.2 13.4 8.6 19.8 11 13.4 13.4 11 19.8 8.6 13.4 2.2 11 8.6 8.6z"/><path fill="#fde047" d="M11 4.4 12.7 9.3 17.6 11 12.7 12.7 11 17.6 9.3 12.7 4.4 11 9.3 9.3z"/><circle cx="11" cy="11" r="2" fill="#fffbeb"/><path fill="#fef08a" d="M19 3.5 19.9 5.6 22 6.5 19.9 7.4 19 9.5 18.1 7.4 16 6.5 18.1 5.6z"/><path fill="#fde047" d="M18.2 16 18.8 17.4 20.2 18 18.8 18.6 18.2 20 17.6 18.6 16.2 18 17.6 17.4z"/></svg>'],
  badge_bunny: [tl('Зайчик'), '<svg viewBox="0 0 24 24"><ellipse cx="8.6" cy="7.2" rx="2.3" ry="5.4" transform="rotate(-10 8.6 7.2)" fill="#e2f1ff"/><ellipse cx="15.4" cy="7.2" rx="2.3" ry="5.4" transform="rotate(10 15.4 7.2)" fill="#e2f1ff"/><ellipse cx="8.7" cy="7.4" rx="1.1" ry="3.4" transform="rotate(-10 8.7 7.4)" fill="#6cc4ff"/><ellipse cx="15.3" cy="7.4" rx="1.1" ry="3.4" transform="rotate(10 15.3 7.4)" fill="#6cc4ff"/><ellipse cx="12" cy="15.4" rx="6.6" ry="5.6" fill="#f0f7ff"/><circle cx="9.6" cy="15" r="1.15" fill="#0b1220"/><circle cx="14.4" cy="15" r="1.15" fill="#0b1220"/><circle cx="9.9" cy="14.6" r=".38" fill="#fff"/><circle cx="14.7" cy="14.6" r=".38" fill="#fff"/><ellipse cx="12" cy="17.1" rx="1.1" ry=".75" fill="#ff8ec7"/></svg>'],
  badge_sakura: [tl('Сакура'), '<svg viewBox="0 0 24 24"><g fill="#ff85b3"><path d="M12 12C9.3 8.8 9.2 4.4 11.4 3.1c.4.8.6 1.3.6 1.3s.2-.5.6-1.3c2.2 1.3 2.1 5.7-.6 8.9z"/><path d="M12 12C9.3 8.8 9.2 4.4 11.4 3.1c.4.8.6 1.3.6 1.3s.2-.5.6-1.3c2.2 1.3 2.1 5.7-.6 8.9z" transform="rotate(72 12 12)"/><path d="M12 12C9.3 8.8 9.2 4.4 11.4 3.1c.4.8.6 1.3.6 1.3s.2-.5.6-1.3c2.2 1.3 2.1 5.7-.6 8.9z" transform="rotate(144 12 12)"/><path d="M12 12C9.3 8.8 9.2 4.4 11.4 3.1c.4.8.6 1.3.6 1.3s.2-.5.6-1.3c2.2 1.3 2.1 5.7-.6 8.9z" transform="rotate(216 12 12)"/><path d="M12 12C9.3 8.8 9.2 4.4 11.4 3.1c.4.8.6 1.3.6 1.3s.2-.5.6-1.3c2.2 1.3 2.1 5.7-.6 8.9z" transform="rotate(288 12 12)"/></g><circle cx="12" cy="12" r="2.7" fill="#ffd6e7"/><circle cx="12" cy="12" r="1.4" fill="#fde047"/></svg>'],
  badge_bolt: [tl('Молния'), '<svg viewBox="0 0 24 24"><polygon points="14,2 5.2,13.2 11.4,13.2 9.8,22 18.8,10.4 12.6,10.4" fill="#38bdf8"/><polygon points="13.4,4.4 7.4,12.2 12.4,12.2 11.2,19.4 16.8,11.4 11.8,11.4" fill="#fde047"/><polygon points="13,6.6 9.5,11.5 12.4,11.5" fill="#fff"/></svg>'],
  badge_fire: [tl('Огонёк'), '<svg viewBox="0 0 24 24"><path fill="#ff4d2e" d="M12.6 2.2c.6 3.2-1.8 5.2-1.2 7.2 1.2-1.1 2-2.6 2.2-4.2 3.1 2.2 5.2 5.6 5.2 9.2 0 4.1-3.1 7.4-6.8 7.4S5.2 18.5 5.2 14.4c0-3.5 2-6.6 4.4-8.8 1.2-1.1 2.4-2.1 3-3.4z"/><path fill="#ff9e1b" d="M12.1 8.4c2.4 1.8 4 4.1 4 6.7 0 2.9-1.9 5.3-4.2 5.3s-4.2-2.4-4.2-5.3c0-2.1 1-4.1 2.5-5.6.2 1 .8 1.7 1.6 2 .1-1 .2-2.1.3-3.1z"/><path fill="#fff3b0" d="M12 13.4c1.2 1.1 2 2.4 2 3.8 0 1.4-.9 2.4-2 2.4s-2-1-2-2.4c0-1.4.8-2.7 2-3.8z"/></svg>'],
  badge_cyber: [tl('Кибер'), '<svg viewBox="0 0 24 24"><polygon points="12,2.2 21,8.5 18.2,19.8 5.8,19.8 3,8.5" fill="#7c3aed"/><polygon points="12,4.4 18.8,9.2 16.7,18 7.3,18 5.2,9.2" fill="#1e1b4b"/><polygon points="6.6,10.6 17.4,10.6 16.4,14.4 12,13.2 7.6,14.4" fill="#22d3ee"/><polygon points="7.8,11.2 13.5,11.2 12.2,12.5 7.4,12.5" fill="#e0f2fe" opacity=".85"/><circle cx="12" cy="7.2" r="1.2" fill="#f472b6"/></svg>'],
  badge_gem: [tl('Алмаз'), '<svg viewBox="0 0 24 24"><polygon points="6.5,4 17.5,4 22,9.8 12,21 2,9.8" fill="#0284c7"/><polygon points="6.5,4 17.5,4 15.2,9.8 8.8,9.8" fill="#bae6fd"/><polygon points="6.5,4 8.8,9.8 2,9.8" fill="#7dd3fc"/><polygon points="17.5,4 22,9.8 15.2,9.8" fill="#38bdf8"/><polygon points="8.8,9.8 15.2,9.8 12,21" fill="#38bdf8"/><polygon points="2,9.8 8.8,9.8 12,21" fill="#0ea5e9"/><polygon points="8.8,9.8 12,5.6 15.2,9.8" fill="#fff" opacity=".65"/></svg>'],
  badge_crown: [tl('Корона'), '<svg viewBox="0 0 24 24"><path fill="#d97706" d="M3 8.2 7.8 12 12 5l4.2 7L21 8.2 19.2 18.5H4.8z"/><path fill="#fde047" d="M4.6 9.8 8.2 13 12 6.8 15.8 13 19.4 9.8 18.1 17H5.9z"/><rect x="4.8" y="17" width="14.4" height="2.4" rx="1.2" fill="#f59e0b"/><circle cx="12" cy="4.4" r="1.5" fill="#fffbeb"/><circle cx="3.2" cy="7.6" r="1.3" fill="#fde047"/><circle cx="20.8" cy="7.6" r="1.3" fill="#fde047"/><circle cx="12" cy="13.8" r="1.4" fill="#ef4444"/><circle cx="8.2" cy="14.6" r="1" fill="#38bdf8"/><circle cx="15.8" cy="14.6" r="1" fill="#38bdf8"/></svg>'],
  badge_leaf: [tl('Кленовый лист'), '<svg viewBox="0 0 24 24"><path fill="#ea580c" d="M12 2 9.8 7.5 6.8 6l1 4.2L3 9.4l3.2 4-1.8 2.2 5.4.6L11.2 22h1.6l1.4-5.8 5.4-.6-1.8-2.2 3.2-4-4.8.8 1-4.2-3 1.5z"/><path fill="#fb923c" d="M12 4.6 10.4 9l-2.4-1 .8 3.1-3.2-.4 2.3 2.7-1 1.1 5.1.4 5.1-.4-1-1.1 2.3-2.7-3.2.4.8-3.1-2.4 1z"/><path fill="none" stroke="#fde68a" stroke-width="1.2" stroke-linecap="round" d="M12 7v11M12 13l-3.2-2.2M12 13l3.2-2.2"/></svg>'],
  badge_heart: [tl('Сердце'), '<svg viewBox="0 0 24 24"><path fill="#e11d48" d="M12 20.6S3.2 15.2 3.2 9.1c0-3 2.3-5.3 5.1-5.3 1.7 0 3.1.9 3.7 2.2.6-1.3 2-2.2 3.7-2.2 2.8 0 5.1 2.3 5.1 5.3 0 6.1-8.8 11.5-8.8 11.5z"/><path fill="#fb7185" d="M12 18.6S5 14 5 9.2c0-2 1.5-3.6 3.4-3.6 1.4 0 2.6.8 3.6 2.1 1-1.3 2.2-2.1 3.6-2.1 1.9 0 3.4 1.6 3.4 3.6 0 4.8-7 9.4-7 9.4z"/><ellipse cx="8.2" cy="8.4" rx="1.6" ry="1" transform="rotate(-28 8.2 8.4)" fill="#ffe4e6" opacity=".85"/></svg>'],
  badge_moon: [tl('Полумесяц'), '<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M15.4 3.2a8.8 8.8 0 1 0 5.4 15.6 7.2 7.2 0 0 1-9.6-9.6 8.8 8.8 0 0 1 4.2-6z"/><path fill="#fde047" d="M14.2 4.6a7.6 7.6 0 1 0 5 13.4 6.7 6.7 0 0 1-8.8-8.8 7.6 7.6 0 0 1 3.8-4.6z"/><path fill="#fffbeb" d="M18.2 5 19 7.2 21.2 8 19 8.8 18.2 11 17.4 8.8 15.2 8 17.4 7.2z"/></svg>'],
  badge_ghost: [tl('Призрак'), '<svg viewBox="0 0 24 24"><path fill="#cffafe" d="M12 2.8c-4.5 0-8 3.5-8 8v8.8c0 .9 1 1.4 1.7.9l2-1.5 2.1 1.6c.5.4 1.1.4 1.6 0l.6-.5.6.5c.5.4 1.1.4 1.6 0l2.1-1.6 2 1.5c.7.5 1.7 0 1.7-.9v-8.8c0-4.5-3.5-8-8-8z"/><path fill="#ffffff" d="M12 4.2c-3.6 0-6.4 2.8-6.4 6.5v6.5l2-1.4 2.2 1.5 2.2-1.6 2.2 1.6 2.2-1.5 2 1.4v-6.5c0-3.7-2.8-6.5-6.4-6.5z"/><circle cx="9.4" cy="10.6" r="1.4" fill="#0f172a"/><circle cx="14.6" cy="10.6" r="1.4" fill="#0f172a"/><circle cx="9.8" cy="10.1" r=".45" fill="#38bdf8"/><circle cx="15" cy="10.1" r=".45" fill="#38bdf8"/><ellipse cx="12" cy="13.2" rx="1.2" ry=".8" fill="#f472b6" opacity=".7"/></svg>'],
  badge_gamepad: [tl('Геймпад'), '<svg viewBox="0 0 24 24"><path fill="#7c3aed" d="M6.8 6.8h10.4c2.4 0 4.3 2.2 4.6 5.2l.4 4.1c.2 1.7-1.1 3.1-2.7 3.1-1 0-1.9-.5-2.5-1.3l-1.4-2h-7.2l-1.4 2c-.6.8-1.5 1.3-2.5 1.3-1.6 0-2.9-1.4-2.7-3.1l.4-4.1c.3-3 2.2-5.2 4.6-5.2z"/><path fill="#a855f7" d="M7.2 8.2h9.6c1.8 0 3.2 1.6 3.4 3.8l.3 3.4c.1.9-.6 1.7-1.4 1.7-.5 0-1-.3-1.3-.7l-1.6-2.2H7.8l-1.6 2.2c-.3.4-.8.7-1.3.7-.8 0-1.5-.8-1.4-1.7l.3-3.4c.2-2.2 1.6-3.8 3.4-3.8z"/><path fill="#e0f2fe" d="M7.4 10.1h1.5v1.4h1.4V13H8.9v1.4H7.4V13H6v-1.5h1.4z"/><circle cx="15.8" cy="10.8" r="1.05" fill="#38bdf8"/><circle cx="17.8" cy="12.4" r="1.05" fill="#f472b6"/><circle cx="14.2" cy="12.6" r="1.05" fill="#4ade80"/><circle cx="16.2" cy="14.1" r="1.05" fill="#fde047"/></svg>'],
  badge_cat: [tl('Котик'), '<svg viewBox="0 0 24 24"><path fill="#fb923c" d="M4.2 4.2 9.4 7.6c1.6-.4 3.6-.4 5.2 0l5.2-3.4-.8 7.1c.5 1 .8 2.1.8 3.3 0 3.9-3.5 6.8-7.8 6.8S4.2 18.5 4.2 14.6c0-1.2.3-2.3.8-3.3z"/><polygon points="5.7,6.2 8.5,8.2 6.2,10.2" fill="#fda4af"/><polygon points="18.3,6.2 15.5,8.2 17.8,10.2" fill="#fda4af"/><ellipse cx="12" cy="15.4" rx="5.8" ry="4.4" fill="#fed7aa"/><circle cx="9.4" cy="13.8" r="1.25" fill="#1c1917"/><circle cx="14.6" cy="13.8" r="1.25" fill="#1c1917"/><circle cx="9.8" cy="13.4" r=".42" fill="#fff"/><circle cx="15" cy="13.4" r=".42" fill="#fff"/><polygon points="12,16.4 10.9,15.3 13.1,15.3" fill="#f43f5e"/><path fill="none" stroke="#9a3412" stroke-width="1.1" stroke-linecap="round" d="M12 16.4c-.6.8-1.5.9-2 .4M12 16.4c.6.8 1.5.9 2 .4"/></svg>'],
  badge_skull: [tl('Череп'), '<svg viewBox="0 0 24 24"><path fill="#e9d5ff" d="M12 2.6c-4.8 0-8.4 3.4-8.4 7.8 0 2.7 1.3 5 3.4 6.3v2.5c0 1 .8 1.8 1.8 1.8h6.4c1 0 1.8-.8 1.8-1.8v-2.5c2.1-1.3 3.4-3.6 3.4-6.3 0-4.4-3.6-7.8-8.4-7.8z"/><path fill="#1e1b4b" d="M8.6 10.6a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2zm6.8 0a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2z"/><circle cx="8.6" cy="12.7" r=".95" fill="#a855f7"/><circle cx="15.4" cy="12.7" r=".95" fill="#a855f7"/><polygon points="12,14.3 10.9,16.4 13.1,16.4" fill="#3b0764"/><path fill="none" stroke="#7e22ce" stroke-width="1.3" stroke-linecap="round" d="M9.6 18.2v2.4M12 18.2v2.4M14.4 18.2v2.4"/></svg>'],
  badge_wings: [tl('Крылья'), '<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M11.4 12.6C9.5 8.4 5.8 5.2 2 4.8c.5 2.5 2 4.6 4 5.9-1.4-.1-2.5-.4-3.4-.9.7 2.2 2.2 3.8 4.4 4.5-1 .1-2 0-2.8-.3.9 1.9 2.7 3 5.1 3.1.9 0 1.7-.3 2.1-1zM12.6 12.6c1.9-4.2 5.6-7.4 9.4-7.8-.5 2.5-2 4.6-4 5.9 1.4-.1 2.5-.4 3.4-.9-.7 2.2-2.2 3.8-4.4 4.5 1 .1 2 0 2.8-.3-.9 1.9-2.7 3-5.1 3.1-.9 0-1.7-.3-2.1-1z"/><path fill="#fde047" d="M11 13.4c-1.5-3.2-4.3-5.8-7.4-6.4.6 1.8 1.9 3.3 3.7 4.2-1 .1-1.9 0-2.6-.3.7 1.4 2 2.5 3.7 2.8-.6.2-1.3.2-1.9.1.8 1.1 2.1 1.7 3.7 1.6.5 0 .8-.5.8-2zM13 13.4c1.5-3.2 4.3-5.8 7.4-6.4-.6 1.8-1.9 3.3-3.7 4.2 1 .1 1.9 0 2.6-.3-.7 1.4-2 2.5-3.7 2.8.6.2 1.3.2 1.9.1-.8 1.1-2.1 1.7-3.7 1.6-.5 0-.8-.5-.8-2z"/><circle cx="12" cy="14" r="1.9" fill="#fffbeb"/></svg>'],
};
const SHOP_ROLES = {
  role_custom:      { title: tl('Кастомный статус'), color: '#ff9e2c', custom: true },
  role_puzomafia:   { title: '𝐩𝐮𝐳𝐨𝐦𝐚𝐟𝐢𝐚', color: '#e11d48', keepCase: true, customColor: true },
  role_divan:       { title: tl('Завозер'), color: '#fb923c' },
  role_goy:         { title: tl('Омежка'), color: '#a78bfa' },
  role_skuf:        { title: tl('Анимешник'), color: '#f472b6' },
  role_ovosh:       { title: tl('Альфа'), color: '#f43f5e' },
  role_bezson:      { title: tl('Мажор'), color: '#fde047' },
  role_oligarh:     { title: 'renah0cki', color: '#6cc4ff', keepCase: true, customColor: true },
  role_syroh0cki:   { title: tl('сырохоки'), color: '#c4844e', keepCase: true, customColor: true },
  role_hoglin:      { title: tl('хоглины'), color: '#4cc46a', keepCase: true, customColor: true },
  gift_role_custom: { title: tl('Кастомная роль в подарок'), color: '#f43f5e', custom: true, giftOnly: true, tempDays: 14 },
  role_nyashka:     { title: tl('Няшка'), color: '#ff85b3', tempDays: 14 },
  role_dyrka:       { title: tl('дырка'), color: '#a855f7', keepCase: true, tempDays: 14 },
  role_pyaterka:    { title: tl('Пятёрка. Слей. Победа.'), color: '#ff8c24', tempDays: 14 },
};
const STATUS_COLORS = ['#ff9e2c', '#c4844e', '#f43f5e', '#f472b6', '#c084fc', '#9146ff', '#60a5fa', '#38bdf8', '#22d3ee', '#34d399', '#4ade80', '#a3e635', '#fde047', '#fb923c', '#e2e8f0'];
const SHOP_ITEMS = new Map();
function absorbEq(rows) { EQ.clear(); (rows || []).forEach(r => EQ.set(r.user_id, r)); }
function postBorderCls(uidOrProf) {
  const eq = eqOf(uidOrProf);
  const owned = eq?.owned_roles || [], hid = eq?.hidden_roles || [];
  let best = '', at = -1;
  for (const [rid, cls] of [['role_oligarh', 'card-gold'], ['role_syroh0cki', 'card-brown'], ['role_hoglin', 'card-green']]) {
    const i = owned.indexOf(rid);
    if (i > at && !hid.includes(rid)) { at = i; best = cls; }
  }
  return best;
}
function applyGoldCards() {
  $$('.card[data-auid]').forEach(el => {
    const cls = postBorderCls(el.dataset.auid);
    el.classList.toggle('card-gold', cls === 'card-gold');
    el.classList.toggle('card-brown', cls === 'card-brown');
    el.classList.toggle('card-green', cls === 'card-green');
  });
}
function inlineRolesHtml(p, uidFallback = '') {
  const uid = p?.id || uidFallback || '';
  const prof = S.profiles.get(uid) || p || { id: uid };
  const eq = eqOf(uid || prof);
  const roles = visibleUserRoles(prof, eq);
  return `<span class="post-roles" data-roles-uid="${esc(uid)}">${roles.map(r => roleChipHtml(r, eq)).join('')}</span>`;
}
function refreshInlineRoles() {
  $$('[data-roles-uid]').forEach(el => {
    const uid = el.dataset.rolesUid; if (!uid) return;
    const prof = S.profiles.get(uid) || { id: uid };
    const eq = eqOf(uid);
    el.innerHTML = visibleUserRoles(prof, eq).map(r => roleChipHtml(r, eq)).join('');
  });
}
function saveEqRow(row) {
  if (!row?.user_id) return;
  EQ.set(row.user_id, { ...(EQ.get(row.user_id) || {}), ...row });
  cacheSet('eq_all', [...EQ.values()]);
  applyMeFrame(); drawSponsors(); drawTopDonors(); applyGoldCards(); refreshInlineRoles();
}
(() => { const h = cacheGet('eq_all'); if (h) absorbEq(h); })();
let eqReady = api('user_equipped?select=user_id,frame,nick_fx,badge,banner,custom_status_text,custom_status_color,brand_role_color,syro_role_color,puzo_role_color,hogl_role_color,owned_roles,hidden_roles,temp_roles&limit=1000')
  .then(rows => { absorbEq(rows); cacheSet('eq_all', rows); applyMeFrame(); drawSponsors(); drawTopDonors(); applyGoldCards(); refreshInlineRoles(); window.drawRoleCounts?.(); })
  .catch(() => {});
const eqOf = p => (p && typeof p === 'object' ? EQ.get(p.id || p.user_id) : EQ.get(p)) || null;
const badgeHtml = id => {
  if (!id || !/^badge_[a-z0-9_]+$/i.test(id)) return '';
  const b = SHOP_BADGES[id], it = SHOP_ITEMS.get(id);
  const title = it?.title || b?.[0] || '';
  if (b) return `<span class="cb-ico cb-${esc(id)}" title="${esc(title)}">${b[1]}</span>`;
  if (it?.meta?.icon) return `<span class="cb-ico" title="${esc(title)}">${esc(it.meta.icon)}</span>`;
  return '';
};
function applyMeFrame() {
  const b = $('#meBtn'); if (!b) return;
  const fr = S.uid && EQ.get(S.uid)?.frame;
  b.className = 'me-btn' + (fr && /^frame_[a-z0-9_]+$/i.test(fr) ? ' cf-btn cf-' + fr : '');
}
function cosAva(p, cls = 'av', extra = '', overrideFrame) {
  const fr = overrideFrame !== undefined ? overrideFrame : eqOf(p)?.frame;
  const url = p?.avatar_url;
  const inner = url
    ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${COIN}'"${fr ? '' : extra}>`
    : `<span class="${cls} av-ph"${fr ? '' : extra}>${esc((pname(p)[0] || '?').toUpperCase())}</span>`;
  if (!fr || !/^frame_[a-z0-9_]+$/i.test(fr)) return inner;
  const sz = cls === 'prof-ava' ? 'cf-lg' : 'cf-sm';
  return `<span class="cf-wrap ${sz} cf-${esc(fr)}"${extra}>${inner}</span>`;
}
function cosName(p, overrideFx, overrideBadge) {
  const eq = eqOf(p);
  const fx = overrideFx !== undefined ? overrideFx : eq?.nick_fx;
  const bg = overrideBadge !== undefined ? overrideBadge : eq?.badge;
  return `<span${nameAttr(p?.name_color, fx)}>${esc(pname(p))}</span>${badgeHtml(bg)}`;
}

const MON = [tl('янв'), tl('фев'), tl('мар'), tl('апр'), tl('мая'), tl('июн'), tl('июл'), tl('авг'), tl('сен'), tl('окт'), tl('ноя'), tl('дек')];
function when(ts) {
  const d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
  const t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dd = (day(now) - day(d)) / 864e5;
  if (diff < 60) return tl('только что');
  if (diff < 3600) return Math.floor(diff / 60) + tl(' мин назад');
  if (dd === 0) return tl('сегодня в ') + t;
  if (dd === 1) return tl('вчера в ') + t;
  if (dd < 7) return Math.round(dd) + tl(' дн назад');
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

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
const TYPE_BADGE = { video: [I.play, tl('Видео')], fanfic: [I.text, tl('Фанфик')], art: null };
function cardHtml(it) {
  const a = S.profiles.get(it.submitted_by) || it.author;
  const b = TYPE_BADGE[it.content_type];
  const liked = S.liked.has(it.id);
  const bCls = postBorderCls(it.submitted_by || a);
  return `<article class="card${bCls ? ' ' + bCls : ''}" data-open="${esc(it.short_code || it.id)}" data-auid="${esc(it.submitted_by || a?.id || '')}">
    <div class="card-media${it.is_blurred ? ' blur' : ''}">${thumbHtml(it)}
      ${it.is_blurred ? `<div class="eye">${I.eye}</div>` : ''}
      ${it.pinned ? `<span class="badge pin">${I.pin} ${tl('Закреплено')}</span>` : ''}
      ${b ? `<span class="badge type">${b[0]} ${b[1]}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-author" data-user="${esc(a?.username || it.submitted_by)}">${cosAva(a)}${cosName(a)}</div>
      <h3 class="card-title">${esc(it.title || tl('Без названия'))}</h3>
      ${it.description && it.content_type !== 'fanfic' ? `<p class="card-desc">${esc(it.description)}</p>` : ''}
      <div class="card-stats">
        ${it.content_type === 'fanfic' ? '' : `<span title="${tl('Просмотры')}">${I.views}${fmt(it.views)}</span>`}
        <span class="${liked ? 'liked' : ''}" title="${tl('Лайки')}">${I.heart}${fmt(it.likes)}</span>
        ${it.content_type === 'fanfic' ? '' : `<span title="${tl('Комментарии')}">${I.comment}${fmt(it.comments_count)}</span>`}
        <time>${when(it.published_at || it.created_at)}</time>
      </div>
    </div>
  </article>`;
}

const FEED = { tab: 'all', type: 'all', sort: 'new', q: '', tags: [] };
const TYPE_NAMES = { all: tl('Все'), art: tl('Арты'), video: tl('Видео'), fanfic: tl('Фанфики') };
let subsIds = null;
async function feedQuery(offset) {
  let q = `content?status=eq.published&select=${CARD_SEL}`;
  if (FEED.type !== 'all') q += `&content_type=eq.${FEED.type}`;
  if (FEED.tags.length) q += `&tags=ov.${encodeURIComponent('{' + FEED.tags.map(t => '"' + t.replace(/"/g, '') + '"').join(',') + '}')}`;
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
      <div class="tabs" role="tablist"><button class="tab${FEED.tab === 'all' ? ' on' : ''}" data-tab="all">${tl('Все')}</button><button class="tab${FEED.tab === 'reviews' ? ' on' : ''}" data-tab="reviews">${tl('Отзывы')}</button><button class="tab${FEED.tab === 'subs' ? ' on' : ''}" data-tab="subs">${tl('Подписки')}</button></div>
      <div class="filter-wrap"><button class="filter-btn" data-filter-toggle>${I.filter} ${tl('Фильтрация')}${FEED.tags.length ? ` <i class="ftag-n">${FEED.tags.length}</i>` : ''}</button>
        <div class="filter-pop" hidden>
          <h4>${tl('Теги')}${FEED.tags.length ? ` <button class="ftag-clear" data-ftagclear>${tl('сбросить')}</button>` : ''}</h4><div class="chips">${ALL_TAGS.map(t => `<button class="chip${FEED.tags.includes(t) ? ' on' : ''}" data-ftag="${esc(t)}">#${esc(tagName(t))}</button>`).join('')}</div>
          <h4>${tl('Тип')}</h4><div class="chips">${Object.entries(TYPE_NAMES).map(([k, v]) => `<button class="chip${FEED.type === k ? ' on' : ''}" data-ftype="${k}">${v}</button>`).join('')}</div>
          <h4>${tl('Ещё')}</h4><div class="chips"><a class="chip" href="${routeUrl('collections')}">${tl('🗂️ Сборники')}</a></div>
          <h4>${tl('Сортировка')}</h4><div class="chips"><button class="chip${FEED.sort === 'new' ? ' on' : ''}" data-fsort="new">${tl('Новые')}</button><button class="chip${FEED.sort === 'top' ? ' on' : ''}" data-fsort="top">${tl('Популярные')}</button></div>
        </div></div>
    </div>
    <div class="grid${FEED.type === 'art' ? ' grid-art' : FEED.type === 'video' || FEED.type === 'fanfic' ? ' grid-big' : ''}" id="grid">${'<div class="skel"></div>'.repeat(8)}</div><div class="more" id="more"></div>`;
  S.feed = { key: JSON.stringify(FEED), items: [], done: false, loading: false };
  if (FEED.tab === 'reviews') { $('.filter-wrap', page).hidden = true; S.feed.done = true; return drawReviews(); }
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
const feedEmpty = () => `<div class="empty" id="grid">${FEED.tab === 'subs' ? tl('Тут появятся посты тех, на кого вы подписаны.') : FEED.q ? tl('Ничего не найдено.') : tl('Пока пусто.')}</div>`;
function renderGrid(rows) {
  const grid = $('#grid'); if (!grid) return;
  if (!rows.length) { grid.outerHTML = feedEmpty(); return; }
  if (grid.tagName !== 'DIV' || !grid.classList.contains('grid')) return;
  const first = !grid.querySelector('.card');
  grid.innerHTML = rows.map(cardHtml).join('');
  if (first) animateCards(grid);
  wireLazy(grid);
}
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
  } catch (e) { const g = $('#grid'); if (g) g.innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; }
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
const lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const v = e.target; lazyIO.unobserve(v); v.preload = 'metadata'; v.src = v.dataset.lazy;
}), { rootMargin: '300px' }) : null;
function wireLazy(root) { $$('video[data-lazy]', root).forEach(v => { if (lazyIO) lazyIO.observe(v); else { v.preload = 'metadata'; v.src = v.dataset.lazy; } }); }
let prefetched = false;
function idlePrefetch() {
  if (prefetched) return; prefetched = true;
  const idle = cb => setTimeout(cb, 600);
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
  if (ft) { const t = ft.dataset.ftype; go(t === 'all' ? '' : t); return; }
  const ftg = e.target.closest('[data-ftag]');
  if (ftg) { const t = ftg.dataset.ftag; FEED.tags = FEED.tags.includes(t) ? FEED.tags.filter(x => x !== t) : [...FEED.tags, t]; viewFeed(FEED.type); $('.filter-pop', page).hidden = false; $('[data-filter-toggle]', page)?.classList.add('on'); return; }
  if (e.target.closest('[data-ftagclear]')) { FEED.tags = []; viewFeed(FEED.type); $('.filter-pop', page).hidden = false; return; }
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
  searchT = setTimeout(() => { FEED.q = e.target.value.trim(); if (!/^(art|video|fanfic)?$/.test(curRoute())) go(''); else viewFeed(FEED.type); }, 350);
});

async function viewPost(key, root = page) {
  const inLb = root !== page;
  if (!inLb) setNav('');
  let it = S.items.get(key);
  if (!it) {
    root.innerHTML = `<div class="post"><div class="skel" style="aspect-ratio:16/9"></div></div>`;
    try {
      const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `short_code=eq.${encodeURIComponent(key)}`;
      [it] = absorb(await api(`content?${f}&select=*,${AUTHOR}`));
    } catch (e) { root.innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; return; }
    if (!it) { root.innerHTML = `<div class="empty">${tl('Пост не найден')}</div>`; return; }
    if (inLb && LB.key !== key) return;
    await loadAllMyLikes();
  } else {
    api(`content?id=eq.${it.id}&select=tags`).then(([r]) => { if (r?.tags?.length && !$('.post .tags') && $('.post h1')) { it.tags = r.tags; $('.post h1').insertAdjacentHTML('afterend', `<div class="tags">${r.tags.map(t => `<span class="tag">#${esc(tagName(t))}</span>`).join('')}</div>`); } }).catch(() => {});
  }
  const a = S.profiles.get(it.submitted_by) || it.author;
  const src = it.source_url || '';
  let media = '';
  if (it.content_type === 'video') {
    const y = ytId(src);
    media = y ? `<iframe src="https://www.youtube.com/embed/${y}" allowfullscreen loading="lazy"></iframe>` : isOwnFile(src) || isVideoFile(src) ? `<video src="${esc(src)}" controls playsinline preload="metadata"></video>` : `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener">${tl('Открыть видео')}</a>`;
  } else if (it.content_type === 'art') {
    const imgs = Array.isArray(it.media_items) && it.media_items.length ? it.media_items.map(m => m.url).filter(Boolean) : [src];
    media = imgs.map((u, i) => `<a class="pm-item" href="${esc(u)}" data-zoom="${i}" title="${tl('Открыть на весь экран')}"><span class="pm-bg" style="background-image:url('${esc(thumbUrl(u, 360))}')"></span>${imgTag(u, 1080).replace(' loading="lazy"', '')}</a>`).join('');
  }
  const liked = S.liked.has(it.id);
  if (inLb && LB.key !== key) return;
  root.innerHTML = `<div class="post">
    ${inLb ? '' : `<button class="back" data-back>${I.back} ${tl('Назад')}</button>`}
    ${media ? `<div class="post-media${it.is_blurred ? ' blur' : ''}" id="postMedia">${media}</div>` : ''}
    <div class="post-head">${cosAva(a, 'av', ` data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer"`)}<div><div class="post-author-row"><b data-user="${esc(a?.username || it.submitted_by)}" style="cursor:pointer">${cosName(a)}</b>${inlineRolesHtml(a, it.submitted_by)}</div><div class="sub">${when(it.published_at || it.created_at)}${it.content_type === 'fanfic' ? '' : tl(' · {0} просмотров', {0: fmt(it.views)})}</div></div>
      <div class="post-actions"><div class="react-wrap" id="reactWrap"></div><button class="btn like-btn${liked ? ' liked' : ''}" id="likeBtn">${I.heart}<span>${fmt(it.likes)}</span></button><button class="btn" id="copyBtn" title="${tl('Скопировать ссылку')}">${I.link}</button>${S.uid !== it.submitted_by ? `<button class="btn" data-report="content" data-rid="${esc(it.id)}" title="${tl('Пожаловаться')}" aria-label="${tl('Пожаловаться')}"><svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></button>` : ''}${postMenuHtml(it)}</div></div>
    <h1>${esc(it.title || tl('Без названия'))}</h1>
    ${it.description && it.content_type !== 'fanfic' ? `<p class="post-desc">${esc(it.description)}</p>` : ''}
    ${it.content_type === 'fanfic' ? `<div class="post-text">${esc(it.description || '')}</div>` : ''}
    ${Array.isArray(it.tags) && it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">#${esc(tagName(t))}</span>`).join('')}</div>` : ''}
    ${it.content_type === 'fanfic' ? (it.source_url ? `<a class="btn accent fic-read" href="${esc(it.source_url)}" target="_blank" rel="noopener noreferrer">${tl('Читать фанфик')}</a>` : '') : `<section class="comments" id="comments"><h3>${tl('Комментарии')}</h3><div class="empty" style="padding:20px">${tl('Загрузка…')}</div></section>`}
  </div>`;
  if (it.submitted_by && S.profiles.get(it.submitted_by)?.role === undefined) {
    loadProfiles([it.submitted_by], true).then(refreshInlineRoles);
  }
  const pmEl = root.querySelector('#postMedia');
  if (pmEl) pmEl.addEventListener('click', ev => {
    const z = ev.target.closest('[data-zoom]'); if (!z) return;
    ev.preventDefault();
    if (pmEl.classList.contains('blur')) {
      if ($('.pz-over', pmEl)) return;
      if (puzzleOn() && it.puzzle_difficulty !== 'none') startPuzzle(pmEl, z, it.puzzle_difficulty || 'easy'); else pmEl.classList.remove('blur');
      return;
    }
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
  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${it.short_code || '?post=' + it.id}`); toast(tl('Ссылка скопирована')); } catch { toast(tl('Не удалось скопировать'), true); } };
  S.curPost = { it, root };
  wirePostMenu(root, it);
  if (it.content_type !== 'fanfic') {
    try { if (!sessionStorage.getItem('pv_' + it.id)) { sessionStorage.setItem('pv_' + it.id, '1'); rpc('increment_content_views', { content_id: it.id }).catch(() => {}); } }
    catch { rpc('increment_content_views', { content_id: it.id }).catch(() => {}); }
    loadComments(it.id);
  }
  renderReact(it);
}

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
  box.innerHTML = `<button class="btn react-btn${mine ? ' mine' : ''}" data-react-toggle title="${own ? tl('Пузокоины, подаренные этой работе') : tl('Подарить автору пузокоины')}"><img src="${COIN}" alt=""><span>${total ? fmt(total) : (own ? '0' : tl('Подарить'))}</span></button>
    <div class="react-pop" hidden>
      <div class="react-title">${own ? tl('Вашей работе подарили') : tl('Подарить автору')} <img src="${COIN}" alt=""> <b>${fmt(total)}</b></div>
      ${top.length ? `<div class="react-top">${top.map(([uid, a], i) => `<span>${['🥇', '🥈', '🥉'][i]} ${esc(pname(S.profiles.get(uid)))} — <b>${fmt(a)}</b></span>`).join('')}</div>` : ''}
      ${own || !S.uid ? '' : `<div class="react-amts">${REACT_AMOUNTS.map((a, i) => `<button class="chip${i === 1 ? ' on' : ''}" data-ramt="${a}">${a}</button>`).join('')}<input type="number" min="1" max="100000" step="1" class="react-custom" placeholder="${tl('своя')}"></div>
      <button class="btn accent react-send" data-react-send>${tl('Подарить')} <img src="${COIN}" alt=""> <span>5</span></button>
      <div class="react-hint">${tl('Пузокоины сразу получит автор.')}${mine ? tl(' Вы уже подарили {0}.', {0: fmt(mine)}) : ''}</div>`}
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
      if (!(a >= 1)) { st.textContent = tl('Укажи сумму'); return; }
      send.disabled = true; st.textContent = '…';
      try {
        const bal = await rpc('coin_react', { p_kind: 'content', p_id: it.id, p_emoji: 'coin', p_amount: a });
        $('#coinVal').textContent = fmt(bal);
        toast(tl('Подарено {0} {c} автору', {c: coinW(a), 0: fmt(a)}));
        await renderReact(it);
        $('.react-btn', $('#reactWrap'))?.classList.add('pop');
      } catch (er) { st.textContent = tl('Ошибка: ') + er.message; send.disabled = false; }
    }
  };
  box.oninput = e => { if (e.target.closest('.react-custom')) { if (e.target.value) $$('[data-ramt]', box).forEach(x => x.classList.remove('on')); sync(); } };
}
document.addEventListener('click', e => { if (!e.target.closest('.react-wrap')) $$('.react-pop').forEach(p => { p.hidden = true; }); });
const VW = { el: null, list: [], i: 0, z: 1, x: 0, y: 0 };
function openViewer(list, i = 0) {
  if (!VW.el) {
    const el = document.createElement('div');
    el.className = 'vw';
    el.innerHTML = `<div class="vw-stage"><img class="vw-img" alt="" draggable="false"></div>
      <div class="vw-top"><span class="vw-count"></span><div class="vw-tools">
        <button data-vw="out" aria-label="${tl('Уменьшить')}"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6"/></svg></button>
        <button data-vw="reset" aria-label="${tl('Сбросить')}" class="vw-pct">100%</button>
        <button data-vw="in" aria-label="${tl('Увеличить')}"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8 11h6M11 8v6"/></svg></button>
        <button data-vw="close" aria-label="${tl('Закрыть')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <button class="vw-nav vw-prev" data-vw="prev" aria-label="${tl('Назад')}"><svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg></button>
      <button class="vw-nav vw-next" data-vw="next" aria-label="${tl('Вперёд')}"><svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg></button>`;
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

let lbBaseRoute = curRoute();
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
    <button class="lb-nav lb-prev" data-lb-step="-1" aria-label="${tl('Предыдущая работа')}"><svg viewBox="0 0 24 24"><path d="m14.5 6-6 6 6 6"/></svg></button>
    <div class="lb-box" role="dialog" aria-modal="true"><button class="lb-close" data-lb-close aria-label="${tl('Закрыть')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><div class="lb-body" id="lbBody"></div></div>
    <button class="lb-nav lb-next" data-lb-step="1" aria-label="${tl('Следующая работа')}"><svg viewBox="0 0 24 24"><path d="m9.5 6 6 6-6 6"/></svg></button>`;
  el.addEventListener('click', e => {
    if (e.target.closest('[data-lb-close]')) return closeLightbox();
    const st = e.target.closest('[data-lb-step]'); if (st) return lbStep(+st.dataset.lbStep);
    const u = e.target.closest('[data-user]');
    if (u) { closeLightbox(true); go('u/' + encodeURIComponent(u.dataset.user)); }
  });
  let sx = 0, sy = 0, st = 0;
  el.addEventListener('touchstart', e => { if (e.touches.length !== 1) { st = 0; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
  el.addEventListener('touchend', e => {
    if (!st || Date.now() - st > 600 || e.target.closest('input, textarea, .react-pop, .pz-over, .coll-items, .vrec')) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) lbStep(dx < 0 ? 1 : -1);
  }, { passive: true });
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
  if (!LB.open) { LB.open = true; history.pushState({ lb: 1 }, '', routeUrl('p/' + key)); }
  else history.replaceState({ lb: 1 }, '', routeUrl('p/' + key));
  document.documentElement.classList.add('lb-lock');
  el.classList.add('show');
  lbRender(key);
}
function lbStep(d) {
  const keys = lbKeys(), i = keys.indexOf(LB.key);
  const k = keys[i + d]; if (!k) return;
  history.replaceState({ lb: 1 }, '', routeUrl('p/' + k));
  lbRender(k);
  $(`[data-open="${CSS.escape(k)}"]`, page)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function closeLightbox(keepHash = false) {
  if (!LB.open) return;
  LB.open = false;
  closeLightboxUi();
  if (!keepHash && curRoute().startsWith('p/')) { LB.skip = true; history.back(); }
}
addEventListener('keydown', e => {
  if (!LB.open) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) lbStep(-1);
  else if (e.key === 'ArrowRight' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) lbStep(1);
});

const CMT = new Map();
async function fetchComments(id, kind = 'content') {
  let rows;
  try { rows = await api(`comments?${kind}_id=eq.${id}&is_deleted=eq.false&select=id,body,voice_url,author_id,created_at,parent_id&order=created_at.asc&limit=500`); }
  catch { rows = await api(`comments?${kind}_id=eq.${id}&is_deleted=eq.false&select=id,body,author_id,created_at&order=created_at.asc&limit=500`).catch(() => []); }
  await loadProfiles(rows.map(r => r.author_id));
  CMT.set(id, rows);
  return rows;
}
async function loadComments(id, kind = 'content') {
  const box = $('#comments'); if (!box) return;
  box.dataset.kind = kind;
  const draw = rows => { if ($('#comments') === box) drawComments(box, rows, id); };
  if (CMT.has(id)) draw(CMT.get(id));
  draw(await fetchComments(id, kind));
}
function drawComments(box, rows, cid) {
  if (cid) box.dataset.cid = cid;
  const top = rows.filter(c => !c.parent_id || !rows.some(x => x.id === c.parent_id));
  const kids = id => rows.filter(c => c.parent_id === id);
  const ordered = []; const walk = (c, d) => { ordered.push([c, d]); kids(c.id).forEach(k => walk(k, Math.min(d + 1, 1))); };
  top.forEach(c => walk(c, 0));
  const mod = isMod();
  const draft = $('.cmt-form textarea', box)?.value || '';
  box.innerHTML = `<h3>${tl('Комментарии ·')} ${rows.length}</h3>` + (rows.length ? ordered.map(([c, d]) => {
    const p = S.profiles.get(c.author_id), mine = S.uid && c.author_id === S.uid;
    return `<div class="cmt${d ? ' reply' : ''}" data-cmt="${c.id}" data-auid="${esc(c.author_id || '')}">${cosAva(p)}<div class="cmt-main"><div class="cmt-head"><b data-user="${esc(p?.username || c.author_id)}">${cosName(p)}</b><span>${when(c.created_at)}</span></div>${c.voice_url && isOwnFile(c.voice_url) ? `<audio class="cmt-voice" src="${esc(c.voice_url)}" controls preload="none"></audio>` : `<div class="cmt-body">${esc(c.body || '')}</div>`}
      ${S.uid ? `<div class="cmt-acts"><button type="button" data-creply="${c.id}" data-cname="${esc(pname(p))}">${tl('Ответить')}</button>${mine || mod ? `<button type="button" data-cdel="${c.id}">${tl('Удалить')}</button>` : ''}${!mine ? `<button type="button" data-crep="${c.id}">${tl('Пожаловаться')}</button>` : ''}</div>` : ''}</div></div>`;
  }).join('') : `<div class="empty" style="padding:20px">${tl('Комментариев пока нет')}</div>`)
    + (S.uid ? `<form class="cmt-form" data-cform><div class="cmt-to" hidden></div><div class="cmt-row"><textarea rows="2" maxlength="2000" placeholder="${tl('Написать комментарий…')}" required></textarea>${canVoice() ? `<button class="btn icon-only" type="button" data-voice title="${tl('Голосовое сообщение')}" aria-label="${tl('Записать голосовое')}">${I.mic}</button>` : ''}<button class="btn accent" type="submit">${tl('Отправить')}</button></div></form>`
      : `<div class="cmt-login"><button type="button" class="btn accent" data-login>${tl('Войти')}</button><span>${tl('чтобы оставить комментарий')}</span></div>`);
  const ta = $('.cmt-form textarea', box); if (ta && draft) ta.value = draft;
}
page.addEventListener('click', e => { const b = e.target.closest('[data-login]'); if (b) login(); });
document.addEventListener('click', async e => {
  const box = e.target.closest('#comments'); if (!box) return;
  const cid = box.dataset.cid;
  const rp = e.target.closest('[data-creply]');
  if (rp) {
    const f = $('[data-cform]', box), to = $('.cmt-to', f);
    f.dataset.parent = rp.dataset.creply; to.hidden = false;
    to.innerHTML = `${tl('Ответ для')} <b>${esc(rp.dataset.cname)}</b> <button type="button" data-cnoreply aria-label="${tl('Отменить ответ')}">✕</button>`;
    $('textarea', f).focus(); return;
  }
  if (e.target.closest('[data-cnoreply]')) { const f = $('[data-cform]', box); delete f.dataset.parent; $('.cmt-to', f).hidden = true; return; }
  const del = e.target.closest('[data-cdel]');
  if (del) {
    if (!confirm(tl('Удалить комментарий?'))) return;
    try { await api(`comments?id=eq.${del.dataset.cdel}`, { method: 'DELETE' }); bumpComments(cid, -1); drawComments(box, await fetchComments(cid, box.dataset.kind)); toast(tl('Комментарий удалён')); }
    catch (er) { toast(er.message, true); }
    return;
  }
  const rep = e.target.closest('[data-crep]');
  if (rep) reportDialog(rep.dataset.crep);
  const vb = e.target.closest('[data-voice]');
  if (vb) {
    const f = vb.closest('form');
    recordVoice(f, async url => {
      await api('comments', { method: 'POST', prefer: 'return=minimal', body: { [`${box.dataset.kind || 'content'}_id`]: cid, author_id: S.uid, body: '🎤 Голосовое сообщение', voice_url: url, parent_id: f.dataset.parent || null } });
      bumpComments(cid, 1); drawComments(box, await fetchComments(cid, box.dataset.kind));
    });
  }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-cform]'); if (!f) return;
  e.preventDefault();
  const box = f.closest('#comments'), cid = box?.dataset.cid, ta = $('textarea', f), body = ta.value.trim();
  if (!body || !cid) return;
  const btn = $('button[type=submit]', f); btn.disabled = true;
  try {
    await api('comments', { method: 'POST', prefer: 'return=minimal', body: { [`${box.dataset.kind || 'content'}_id`]: cid, author_id: S.uid, body, parent_id: f.dataset.parent || null } });
    ta.value = ''; bumpComments(cid, 1);
    drawComments(box, await fetchComments(cid, box.dataset.kind));
    box.lastElementChild.previousElementSibling?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  } catch (er) { toast(er.message, true); btn.disabled = false; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.closest?.('[data-cform] textarea')) { e.preventDefault(); e.target.closest('form').requestSubmit(); }
});
function bumpComments(cid, d) {
  const it = S.items.get(cid); if (it) it.comments_count = Math.max(0, (it.comments_count || 0) + d);
}
const REPORT_REASONS = [['spam', tl('Спам / реклама')], ['insult', tl('Оскорбления / угрозы')], ['illegal', tl('Запрещённый контент / политика')], ['other', tl('Другое')]];
function reportDialog(commentId) {
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal"><h2>${tl('Пожаловаться на комментарий')}</h2>
    <div class="radios">${REPORT_REASONS.map(([v, t], i) => `<label class="radio"><input type="radio" name="r" value="${v}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label>${tl('Подробности (необязательно)')}<textarea name="d" rows="2" maxlength="500"></textarea></label>
    <p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Отправить')}</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, hint = $('.hint', ov);
    try {
      await api('comment_reports', { method: 'POST', prefer: 'return=minimal', body: { comment_id: commentId, reporter_id: S.uid, reason: f.r.value, details: f.d.value.trim() || null } });
      close(); toast(tl('Жалоба отправлена модераторам'));
    } catch (er) { hint.textContent = /duplicate|unique|409/i.test(er.message) ? tl('Вы уже жаловались на этот комментарий.') : tl('Ошибка: ') + er.message; }
  };
  document.body.append(ov);
}
page.addEventListener('click', e => { if (e.target.closest('[data-back]')) { history.length > 1 ? history.back() : go(''); } });

const MOD_ROLES = ['moderator', 'gl_moder', 'admin'];
const isMod = () => !!S.me && [S.me.role, ...(S.me.extra_roles || [])].some(r => MOD_ROLES.includes(r));

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
  return { name: pname(n.author) || tl('Редакция'), ava: n.author?.avatar_url || '' };
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
      ${n.pinned ? `<span class="badge pin">${I.pin} ${tl('Закреплено')}</span>` : ''}<span class="badge type">${tl('Новость')}</span></div>
    <div class="card-body">
      <div class="card-author">${avaHtml(by.ava, by.name)}<span>${esc(by.name)}</span></div>
      <h3 class="card-title">${esc(n.title)}</h3>
      <p class="card-desc">${esc(newsPlain(n.body).slice(0, 160))}</p>
      <div class="card-stats">
        <span title="${tl('Просмотры')}">${I.views}${fmt(n.views)}</span>
        <span class="${liked ? 'liked' : ''}" title="${tl('Лайки')}">${I.heart}${fmt(n.likes_count)}</span>
        <span title="${tl('Комментарии')}">${I.comment}${fmt(n.comments_count)}</span>
        <time>${when(n.created_at)}</time>
      </div>
    </div>
  </article>`;
}
async function viewNews() {
  setNav('news');
  page.innerHTML = `<div class="page-head"><h1>${tl('Новости')}</h1>${isMod() ? `<a class="btn accent" href="${routeUrl('news/new')}">${tl('Написать')}</a>` : ''}</div><div class="grid grid-big" id="newsGrid">${'<div class="skel"></div>'.repeat(6)}</div>`;
  try {
    await swr('news', fetchNews, data => {
      applyNews(data);
      const g = $('#newsGrid'); if (!g) return;
      const firstN = !g.querySelector('.card');
      g.outerHTML = data.rows.length ? `<div class="grid grid-big" id="newsGrid">${data.rows.map(newsCardHtml).join('')}</div>` : `<div class="empty" id="newsGrid">${tl('Пока новостей нет.')}</div>`;
      if (firstN) animateCards($('#newsGrid'));
    });
  } catch (e) { const g = $('#newsGrid'); if (g) g.outerHTML = `<div class="empty">${tl('Не удалось загрузить:')} ${esc(e.message)}</div>`; }
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
  if (!n) { page.innerHTML = `<div class="empty">${tl('Новость не найдена')}</div>`; return; }
  await Promise.all([newsLoadChans([n]), newsLoadLiked([n.id])]);
  try { if (!sessionStorage.getItem('nv_' + n.id)) { sessionStorage.setItem('nv_' + n.id, '1'); n.views = (n.views || 0) + 1; rpc('news_view', { p_id: n.id }).catch(() => {}); } } catch {}
  const by = newsBy(n), cover = n.cover_url || '', liked = NEWS.liked.has(n.id);
  page.innerHTML = `<article class="post news-article">
    <button class="back" data-back>${I.back} ${tl('Назад')}</button>
    ${cover ? `<div class="post-media"><img src="${esc(cover)}" alt=""></div>` : ''}
    <h1>${esc(n.title)}</h1>
    <div class="post-head">${avaHtml(by.ava, by.name)}<div><b>${esc(by.name)}</b><div class="sub">${when(n.created_at)} · ${fmt(n.views)} ${tl('просмотров')}</div></div>
      <div class="post-actions"><button class="btn like-btn${liked ? ' liked' : ''}" id="newsLike">${I.heart}<span>${fmt(n.likes_count)}</span></button><button class="btn" id="newsCopy" title="${tl('Скопировать ссылку')}">${I.link}</button>${isMod() ? `<a class="btn" href="${routeUrl('news/edit/' + n.id)}">${tl('Изменить')}</a><button class="btn" id="newsPin">${n.pinned ? tl('Открепить') : tl('Закрепить')}</button>` : ''}</div></div>
    <div class="news-body">${newsBody(n.body)}</div>
    <section class="comments" id="newsComments"><h3>${tl('Комментарии')}</h3><div class="empty" style="padding:20px">${tl('Загрузка…')}</div></section>
  </article>`;
  $('#newsLike').onclick = async ev => {
    if (!S.uid) return toast(tl('Нужно войти'), true);
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
  $('#newsCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/${n.short_code ? n.short_code : '?news=' + n.id}`); toast(tl('Ссылка скопирована')); } catch { toast(tl('Не удалось скопировать'), true); } };
  const np = $('#newsPin');
  if (np) np.onclick = async () => { try { await api(`news?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { pinned: !n.pinned } }); n.pinned = !n.pinned; np.textContent = n.pinned ? tl('Открепить') : tl('Закрепить'); MEM.delete('news'); toast(n.pinned ? tl('Закреплено') : tl('Откреплено')); } catch (er) { toast(er.message, true); } };
  newsLoadComments(n);
}
async function newsLoadComments(n) {
  const box = $('#newsComments'); if (!box) return;
  const rows = await api(`news_comments?news_id=eq.${n.id}&select=id,user_id,body,created_at,profiles(username,display_name,avatar_url)&order=created_at.asc&limit=300`).catch(() => []);
  if (!$('#newsComments')) return;
  box.innerHTML = `<h3>${tl('Комментарии ·')} ${rows.length}</h3>`
    + (rows.length ? rows.map(c => `<div class="cmt">${avaHtml(c.profiles?.avatar_url, pname(c.profiles))}<div class="cmt-main"><div class="cmt-head"><b>${esc(pname(c.profiles))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body)}</div></div></div>`).join('') : `<div class="empty" style="padding:16px">${tl('Комментариев пока нет')}</div>`)
    + (S.uid ? `<form class="cmt-form" id="newsCmtForm"><textarea rows="2" maxlength="1000" placeholder="${tl('Написать комментарий…')}" required></textarea><button class="btn accent" type="submit">${tl('Отправить')}</button></form>` : '');
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
  const nc = e.target.closest('[data-news]'); if (nc) { go('news/' + nc.dataset.news); return; }
  const sp = e.target.closest('[data-spoiler]'); if (sp) sp.classList.toggle('open');
});

const YT_KEY = 'AIzaSyDc4J-Y8jO5FrvKZD8QuLd0x33LIKtvV_E';
function ytDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); if (!m) return '';
  const sec = (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); if (!sec) return 'LIVE';
  const h = Math.floor(sec / 3600), mi = Math.floor(sec % 3600 / 60), se = sec % 60, p = x => String(x).padStart(2, '0');
  return h ? `${h}:${p(mi)}:${p(se)}` : `${mi}:${p(se)}`;
}
async function viewSuggest() {
  setNav('suggest');
  page.innerHTML = `<div class="page-head"><h1>${tl('Предложка')}</h1>${S.uid ? `<button class="btn accent" data-sg-add><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>${tl('Предложить видео')}</button>` : ''}</div>
    <div class="grid sg-grid" id="sgGrid">${'<div class="skel"></div>'.repeat(8)}</div>`;
  try { await swr('suggest', fetchSuggest, renderSuggest); }
  catch (e) { const g = $('#sgGrid'); if (g) g.outerHTML = `<div class="empty">${tl('Не удалось загрузить:')} ${esc(e.message)}</div>`; }
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
        ${pending ? `<span class="badge pin warn">${tl('На проверке')}</span>` : ''}${dur ? `<span class="badge type">${dur}</span>` : ''}</a>
      <div class="card-body">
        ${r.author_name ? `<div class="card-author"><span>${esc(r.author_name)}</span></div>` : ''}
        <h3 class="card-title"><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">${esc(r.title || tl('Видео'))}</a></h3>
        <div class="card-stats">${y?.v != null ? `<span title="${tl('Просмотры на YouTube')}">${I.views}${fmt(y.v)}</span>` : ''}<time>${when(r.approved_at || r.created_at)}</time></div>
        ${(pending && mod) || canDel ? `<div class="sg-acts">${pending && mod ? `<button class="btn accent" data-sg-ok="${r.id}">${tl('Одобрить')}</button>` : ''}${canDel ? `<button class="btn" data-sg-del="${r.id}">${tl('Удалить')}</button>` : ''}</div>` : ''}
      </div></article>`;
  }).join('')}</div>` : `<div class="empty" id="sgGrid">${tl('Пока пусто — предложи первое видео.')}</div>`;
}
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
  ov.innerHTML = `<form class="v2-modal"><h2>${tl('Предложить видео')}</h2><label>${tl('Ссылка на видео с YouTube')}<input type="url" placeholder="https://www.youtube.com/watch?v=..." required></label><p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Отправить')}</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const hint = $('.hint', ov), id = ytId($('input', ov).value.trim());
    if (!id) { hint.textContent = tl('Нужна ссылка на видео с YouTube'); return; }
    hint.textContent = tl('Добавляю…');
    const mod = isMod();
    try {
      await api('suggestions', { method: 'POST', prefer: 'return=minimal', body: { user_id: S.uid, video_id: id, title: (await sgTitle(id)) || 'Видео', author_name: S.me?.display_name || S.me?.username || '', status: mod ? 'approved' : 'pending', approved_at: mod ? new Date().toISOString() : null } });
      close(); toast(mod ? tl('Видео добавлено') : tl('Отправлено на проверку модераторам')); MEM.delete('suggest'); viewSuggest();
    } catch (er) { hint.textContent = tl('Ошибка: ') + er.message; }
  };
  document.body.append(ov); setTimeout(() => $('input', ov).focus(), 30);
}
page.addEventListener('click', async e => {
  if (e.target.closest('[data-sg-add]')) return sgAddDialog();
  const ok = e.target.closest('[data-sg-ok]');
  if (ok) { ok.disabled = true; try { await api(`suggestions?id=eq.${ok.dataset.sgOk}`, { method: 'PATCH', body: { status: 'approved', approved_at: new Date().toISOString() } }); MEM.delete('suggest'); viewSuggest(); } catch (er) { toast(er.message, true); ok.disabled = false; } return; }
  const del = e.target.closest('[data-sg-del]');
  if (del) { if (!confirm(tl('Удалить видео из предложки?'))) return; try { await api(`suggestions?id=eq.${del.dataset.sgDel}`, { method: 'DELETE' }); MEM.delete('suggest'); viewSuggest(); } catch (er) { toast(er.message, true); } }
});

const ROLE_LABEL = { user: tl('Нормис'), moderator: tl('Модератор'), gl_moder: tl('Админ'), admin: tl('Админ'), sponsor: tl('Спонсор'), respect_plus: 'Respect+', streamer: tl('Стример') };
function activeTempRoles(eq) {
  const list = Array.isArray(eq?.temp_roles) ? eq.temp_roles : [];
  const now = Date.now();
  return list.filter(t => t && t.gid && (!t.expires_at || new Date(t.expires_at).getTime() > now));
}
function isTempRoleLocked(tr) {
  return !!(tr?.locked_until && new Date(tr.locked_until).getTime() > Date.now());
}
function leftDaysText(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return '';
  const d = Math.ceil(ms / 864e5);
  return d > 1 ? tl('{0} дн.', {0: d}) : tl('{0} ч.', {0: Math.max(1, Math.ceil(ms / 36e5))});
}
function allUserRoles(p, eq = eqOf(p)) {
  const sys = [p?.role, ...(p?.extra_roles || [])].filter((r, i, a) => r && r !== 'user' && ROLE_LABEL[r] && a.indexOf(r) === i);
  const bought = (eq?.owned_roles || []).filter((r, i, a) => r && (SHOP_ROLES[r] || ['role', 'gift_role'].includes(SHOP_ITEMS.get(r)?.category)) && a.indexOf(r) === i);
  const temp = activeTempRoles(eq).map(t => t.gid);
  if (sys.length || bought.length || temp.length) return [...sys, ...bought, ...temp];
  return ['user'];
}
function visibleUserRoles(p, eq = eqOf(p), tryRole = null) {
  let all = allUserRoles(p, eq);
  if (tryRole) {
    all = all.filter(r => r !== 'user');
    if (!all.includes(tryRole)) all.push(tryRole);
  }
  const hid = new Set(eq?.hidden_roles || []);
  const locked = new Set(activeTempRoles(eq).filter(isTempRoleLocked).map(t => t.gid));
  const vis = all.filter(r => !hid.has(r) || locked.has(r) || r === tryRole);
  return vis.length ? vis : all.slice(0, 1);
}
function roleChipHtml(r, eq = null) {
  if (r && r.startsWith('gr_')) {
    const tr = activeTempRoles(eq).find(x => x.gid === r) || (Array.isArray(eq?.temp_roles) && eq.temp_roles.find(x => x.gid === r));
    if (!tr) return '';
    const clr = /^#[0-9a-f]{6}$/i.test(tr.color || '') ? tr.color : '#f43f5e';
    return `<span class="role role-custom${tr.keep_case ? ' role-brand' : ''}" style="--rc:${clr}">${esc(tr.title || tl('Статус'))}</span>`;
  }
  if (r === 'role_custom') {
    const txt = eq?.custom_status_text || tl('Кастомный статус');
    const clr = /^#[0-9a-f]{6}$/i.test(eq?.custom_status_color || '') ? eq.custom_status_color : '#ff9e2c';
    return `<span class="role role-custom" style="--rc:${clr}">${esc(txt)}</span>`;
  }
  if (r === 'gift_role_custom') {
    return `<span class="role role-custom" style="--rc:#f43f5e">${tl('Твой статус 🎁')}</span>`;
  }
  const sr = SHOP_ROLES[r], it = SHOP_ITEMS.get(r);
  if (sr || ['role', 'gift_role'].includes(it?.category)) {
    const txt = it?.title || sr?.title || r;
    const savedClr = r === 'role_oligarh' ? eq?.brand_role_color
      : r === 'role_syroh0cki' ? eq?.syro_role_color
      : r === 'role_hoglin' ? eq?.hogl_role_color
      : r === 'role_puzomafia' ? eq?.puzo_role_color : null;
    const clr = /^#[0-9a-f]{6}$/i.test(savedClr || '')
      ? savedClr
      : (it?.meta?.color || sr?.color || '#6cc4ff');
    const kc = sr?.keepCase || it?.meta?.keep_case;
    return `<span class="role role-custom${kc ? ' role-brand' : ''}" style="--rc:${clr}">${esc(txt)}</span>`;
  }
  return `<span class="role role-${esc(r)}">${esc(ROLE_LABEL[r] || r)}</span>`;
}
function brandColorDialog(roleId = 'role_oligarh', onSaved) {
  if (typeof roleId === 'function') { onSaved = roleId; roleId = 'role_oligarh'; }
  if (!S.uid) return;
  const sr = SHOP_ROLES[roleId] || SHOP_ROLES.role_oligarh;
  const lbl = sr.title;
  const eq = EQ.get(S.uid) || {};
  const savedClr = roleId === 'role_syroh0cki' ? eq.syro_role_color : roleId === 'role_hoglin' ? eq.hogl_role_color : roleId === 'role_puzomafia' ? eq.puzo_role_color : eq.brand_role_color;
  let clr = /^#[0-9a-f]{6}$/i.test(savedClr || '') ? savedClr : (sr.color || '#6cc4ff');
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal cs-mod"><h2>${tl('Цвет статуса')} ${esc(lbl)}</h2>
    <div class="cs-prev"><span class="role role-custom role-brand" id="csPrev" style="--rc:${clr}">${esc(lbl)}</span></div>
    <div class="pe-color"><span>${tl('Выбери цвет')}</span>
      <div class="sw-row">${STATUS_COLORS.map(c => `<button type="button" class="nc-sw${clr.toLowerCase() === c ? ' on' : ''}" data-sc="${c}" style="background:${c}"></button>`).join('')}
        <label class="cs-pick" title="${tl('Свой цвет')}"><input type="color" name="c" value="${clr}">🎨</label>
      </div>
    </div>
    <p class="hint"></p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div></form>`;
  const close = () => ov.remove();
  const prev = $('#csPrev', ov), cp = $('[name=c]', ov);
  const sync = () => {
    prev.style.setProperty('--rc', clr);
    cp.value = clr;
    $$('[data-sc]', ov).forEach(b => b.classList.toggle('on', b.dataset.sc.toLowerCase() === clr.toLowerCase()));
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return close();
    const sw = e.target.closest('[data-sc]');
    if (sw) { clr = sw.dataset.sc; sync(); }
  });
  cp.oninput = () => { clr = cp.value; sync(); };
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const hint = $('.hint', ov), btn = $('button[type=submit]', ov);
    btn.disabled = true;
    try {
      const row = await rpc('shop_set_brand_color', { p_color: clr, p_role_id: roleId });
      saveEqRow(row);
      toast(tl('Цвет сохранён'));
      close();
      onSaved?.(row);
    } catch (er) { hint.textContent = er.message; btn.disabled = false; }
  };
  document.body.append(ov);
}
function customStatusDialog(onSaved) {
  if (!S.uid) return;
  const eq = EQ.get(S.uid) || {};
  let clr = /^#[0-9a-f]{6}$/i.test(eq.custom_status_color || '') ? eq.custom_status_color : '#ff9e2c';
  const curText = eq.custom_status_text || '';
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal cs-mod"><h2>${tl('Кастомный статус')}</h2>
    <div class="cs-prev"><span class="role role-custom" id="csPrev" style="--rc:${clr}">${esc(curText || tl('Мой статус'))}</span></div>
    <label>${tl('Название статуса (до 17 символов)')}<input name="t" maxlength="17" required value="${esc(curText)}" placeholder="${tl('Например: Король чата')}"></label>
    <div class="pe-color"><span>${tl('Цвет статуса')}</span>
      <div class="sw-row">${STATUS_COLORS.map(c => `<button type="button" class="nc-sw${clr.toLowerCase() === c ? ' on' : ''}" data-sc="${c}" style="background:${c}"></button>`).join('')}
        <label class="cs-pick" title="${tl('Свой цвет')}"><input type="color" name="c" value="${clr}">🎨</label>
      </div>
    </div>
    <p class="hint"></p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div></form>`;
  const close = () => ov.remove();
  const prev = $('#csPrev', ov), inp = $('[name=t]', ov), cp = $('[name=c]', ov);
  const sync = () => {
    prev.textContent = inp.value.trim() || tl('Мой статус');
    prev.style.setProperty('--rc', clr);
    cp.value = clr;
    $$('[data-sc]', ov).forEach(b => b.classList.toggle('on', b.dataset.sc.toLowerCase() === clr.toLowerCase()));
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return close();
    const sw = e.target.closest('[data-sc]');
    if (sw) { clr = sw.dataset.sc; sync(); }
  });
  inp.oninput = sync;
  cp.oninput = () => { clr = cp.value; sync(); };
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const txt = inp.value.trim(), hint = $('.hint', ov), btn = $('button[type=submit]', ov);
    if (!txt) { hint.textContent = tl('Введите название статуса'); return; }
    btn.disabled = true;
    try {
      const row = await rpc('shop_set_custom_status', { p_text: txt, p_color: clr });
      saveEqRow(row);
      toast(tl('Статус сохранён'));
      close();
      onSaved?.(row);
    } catch (er) { hint.textContent = er.message; btn.disabled = false; }
  };
  document.body.append(ov);
  setTimeout(() => inp.focus(), 30);
}
const userPath = p => routeUrl('u/' + encodeURIComponent(p?.username || p?.id || ''));
async function viewProfile(key) {
  setNav(S.me && (key === S.me.username || key === S.me.id) ? 'me' : '');
  page.innerHTML = `<div class="prof"><div class="skel" style="aspect-ratio:auto;height:180px"></div></div>`;
  let p;
  try {
    const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `username=eq.${encodeURIComponent(key)}`;
    [p] = await api(`profiles?${f}&select=id,username,display_name,avatar_url,role,extra_roles,bio,name_color,stream_twitch_url,stream_social_url,stream_donate_url,short_code`);
  } catch {}
  if (!p) { page.innerHTML = `<div class="empty">${tl('Пользователь не найден')}</div>`; return; }
  S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p });
  drawSponsors(); drawTopDonors();
  if (hasRole(p, 'sponsor') && !SPONS_ROWS.some(x => x.id === p.id)) loadSponsors();
  const own = S.uid === p.id;
  const isOwner = S.uid === OWNER_ID;
  const [works, subCount, followRows, adminBal, coinTarget] = await Promise.all([
    api(`content?submitted_by=eq.${p.id}&status=eq.published&order=published_at.desc.nullslast,created_at.desc&select=${CARD_SEL}`).then(absorb).catch(() => []),
    (async () => { const t = await getToken(); const r = await fetch(`${SB_URL}/rest/v1/subscriptions?following_id=eq.${p.id}&select=id`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), Prefer: 'count=exact', Range: '0-0' } }); return parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10) || 0; })().catch(() => 0),
    S.uid && !own ? api(`subscriptions?follower_id=eq.${S.uid}&following_id=eq.${p.id}&select=id`).catch(() => []) : Promise.resolve([]),
    isOwner && !own ? rpc('coin_admin_balance', { p_user: p.id }).catch(() => null) : Promise.resolve(null),
    p.username ? rpc('coin_donate_target', { p_username: p.username }).catch(() => null) : Promise.resolve(null),
    eqReady,
  ]);
  await loadAllMyLikes();
  let subscribed = !!followRows[0], subs = subCount;
  const eq = eqOf(p), bgCls = eq?.banner && /^bg_[a-z0-9_]+$/i.test(eq.banner) ? ` cbg cbg-${esc(eq.banner)}` : '';
  const roles = visibleUserRoles(p, eq);
  const socialLabel = u => { try { return /^(?:.+\.)?(?:t\.me|telegram\.(?:me|dog|org))$/i.test(new URL(u).hostname) ? tl('Телеграм') : tl('Соцсеть'); } catch { return tl('Соцсеть'); } };
  const coinDonateLink = p.username && coinTarget?.coin_donate_enabled === true ? `${location.origin}/donate/${encodeURIComponent(p.username)}` : null;
  const links = [p.stream_twitch_url && ['Twitch', p.stream_twitch_url], p.stream_social_url && [socialLabel(p.stream_social_url), p.stream_social_url], p.stream_donate_url && [tl('Донат'), p.stream_donate_url], coinDonateLink && [tl('Донат пузокоинами'), coinDonateLink]].filter(x => x && /^https?:\/\//.test(x[1]));
  page.innerHTML = `<div class="prof">
    <section class="prof-card${bgCls}">
      <div class="prof-left">${cosAva(p, 'prof-ava')}
        ${links.length ? `<div class="prof-links">${links.map(([n, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n}</a>`).join('')}</div>` : ''}</div>
      <div class="prof-main">
        ${roles.length ? `<div class="prof-roles">${roles.map(r => roleChipHtml(r, eq)).join('')}</div>` : ''}
        <h1>${cosName(p)}</h1>
        ${p.username && p.display_name ? `<div class="prof-handle">@${esc(p.username)}</div>` : ''}
        ${p.bio ? `<p class="prof-bio">${esc(p.bio)}</p>` : ''}
        <div class="prof-stats"><span><b>${fmt(works.length)}</b> ${tl('публикаций')}</span><span><b id="subsN">${fmt(subs)}</b> ${tl('подписчиков')}</span>${adminBal != null ? `<span class="prof-coin" title="${tl('Баланс пользователя (видно только вам)')}"><img src="${COIN}" alt=""><b id="profCoinVal" data-uid="${esc(p.id)}">${fmt(adminBal)}</b> ${coinW(adminBal)}</span>` : ''}</div>
      </div>
      <div class="prof-acts">
        ${own ? `<button class="btn" type="button" id="profEdit">${tl('Редактировать')}</button>`
          : S.uid ? `<button class="btn${subscribed ? '' : ' accent'}" id="subBtn">${subscribed ? tl('✓ Вы подписаны') : tl('Подписаться')}</button><button class="btn icon-only" id="profSend" title="${tl('Перевести пузокоины')}"><img src="${COIN}" alt="" style="width:20px;height:20px"></button><button class="btn icon-only" data-report="user" data-rid="${esc(p.id)}" title="${tl('Пожаловаться на пользователя')}" aria-label="${tl('Пожаловаться')}"><svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></button>${canRoles() ? `<button class="btn" type="button" data-uroles="${esc(p.id)}" title="${tl('Выдать или снять роли')}">${tl('Роли')}</button>` : ''}<button class="btn${S.blocked.has(p.id) ? ' accent' : ''}" id="profBlock" title="${S.blocked.has(p.id) ? tl('Разблокировать') : tl('Заблокировать для себя')}">${S.blocked.has(p.id) ? tl('Разблокировать') : tl('Заблокировать')}</button>` : ''}
        <button class="btn icon-only" id="profCopy" title="${tl('Скопировать ссылку')}">${I.link}</button>
      </div>
    </section>
    <div class="tabs prof-tabs"><button class="tab on">${tl('Работы')}</button></div>
    ${works.length ? `<div class="grid">${works.map(cardHtml).join('')}</div>` : `<div class="empty">${own ? tl('У вас пока нет опубликованных работ.') : tl('Пока нет опубликованных работ.')}</div>`}
  </div>`;
  wireLazy(page); animateCards(page);
  $('#profCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${location.origin}/@${encodeURIComponent(p.username || p.id)}`); toast(tl('Ссылка скопирована')); } catch { toast(tl('Не удалось скопировать'), true); } };
  if (p.id && !S.profiles.has(p.id)) S.profiles.set(p.id, p);
  const pe = $('#profEdit'); if (pe) pe.onclick = () => { if (!S.me) S.me = p; editProfile(); };
  const ps = $('#profSend'); if (ps) ps.onclick = () => coinSendDialog(p);
  const pbl = $('#profBlock'); if (pbl) pbl.onclick = () => toggleBlock(p);
  const sb = $('#subBtn');
  if (sb) sb.onclick = async () => {
    sb.disabled = true;
    try {
      const on = await rpc('toggle_subscription', { p_following_id: p.id });
      subscribed = !!on; subs = Math.max(0, subs + (subscribed ? 1 : -1)); subsIds = null;
      sb.textContent = subscribed ? tl('✓ Вы подписаны') : tl('Подписаться'); sb.classList.toggle('accent', !subscribed);
      $('#subsN').textContent = fmt(subs);
    } catch (er) { toast(er.message, true); }
    sb.disabled = false;
  };
}
page.addEventListener('click', e => {
  const au = e.target.closest('[data-user]');
  if (au) { e.stopPropagation(); go('u/' + encodeURIComponent(au.dataset.user)); }
});

const NOTIF = { list: [], loaded: false };
const seenKey = () => S.uid ? `fh_notif_seen_${S.uid}` : null;
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
  jobs.push(api(`user_notifications?user_id=eq.${S.uid}&select=kind,actor_id,amount,title,days,note,created_at&order=created_at.desc&limit=30`).then(async r => {
    await loadProfiles(r.map(x => x.actor_id).filter(Boolean));
    return r.map(x => ({ type: { coin_transfer: 'coin', coin_grant: 'grant', role_gift: 'gift' }[x.kind] || 'coin', actor: x.actor_id ? S.profiles.get(x.actor_id) : null, amount: x.amount, title: x.title, days: x.days, body: x.note, at: x.created_at }));
  }).catch(() => []));
  const off = { like: S.me?.notify_likes === false, comment: S.me?.notify_comments === false, follow: S.me?.notify_new_followers === false };
  NOTIF.list = (await Promise.all(jobs)).flat().filter(n => !off[n.type]).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 60);
  NOTIF.loaded = true;
  updateBell();
  return NOTIF.list;
}
function updateBell() {
  const seen = getSeen(), n = NOTIF.list.filter(x => new Date(x.at).getTime() > seen).length;
  const b = $('#bellBadge'); if (!b) return;
  b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n;
}
const NOTIF_TEXT = { like: tl('лайкнул(а) вашу работу'), comment: tl('прокомментировал(а)'), follow: tl('подписался(ась) на вас'), reject: tl('отклонил(а) вашу работу'),
  coin: n => `${tl('перевёл(а) вам')} <b>${fmtNum(n.amount)}</b> ${coinW(n.amount)}`,
  grant: n => `${tl('начислил(а) вам')} <b>${fmtNum(n.amount)}</b> ${coinW(n.amount)}`,
  gift: n => `${tl('подарил(а) вам роль')} <span class="notif-target">«${esc(n.title || tl('роль'))}»</span>${n.days ? tl(' на {0} дн.', {0: n.days}) : ''}` };
const fmtNum = n => Number(n || 0).toLocaleString('ru-RU');
const COIN_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 9.5h3.8a1.7 1.7 0 010 3.4h-2.6a1.7 1.7 0 000 3.4H14.5"/></svg>';
const NOTIF_ICON = { like: I.heart, comment: I.comment, follow: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6"/></svg>', reject: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/></svg>', coin: COIN_SVG, grant: COIN_SVG, gift: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></svg>' };
function notifHtml(n, seen) {
  const unread = new Date(n.at).getTime() > seen;
  const href = n.type === 'coin' || n.type === 'grant' ? routeUrl('wallet') : n.type === 'gift' ? routeUrl('settings') : n.type === 'follow' ? userPath(n.actor) : n.target ? routeUrl(n.coll ? `c/${n.target.short_code || n.target.id}` : `p/${n.target.short_code || n.target.id}`) : routeUrl('');
  return `<a class="notif${unread ? ' unread' : ''} n-${n.type}" href="${esc(href)}">
    <span class="notif-ic">${NOTIF_ICON[n.type]}</span>
    ${avaHtml(n.actor?.avatar_url, pname(n.actor))}
    <div class="notif-main"><div><b>${esc(n.actor ? pname(n.actor) : n.type === 'grant' ? 'renah0cki' : tl('Кто-то'))}</b> ${typeof NOTIF_TEXT[n.type] === 'function' ? NOTIF_TEXT[n.type](n) : NOTIF_TEXT[n.type]}${n.target ? ` <span class="notif-target">«${esc(n.target.title || tl('без названия'))}»</span>` : ''}</div>
      ${n.body ? `<div class="notif-body">${esc(n.body)}</div>` : ''}<time>${when(n.at)}</time></div></a>`;
}
async function openNotifPop() {
  const pop = $('#notifPop'), list = $('#npList');
  if (!pop.hidden) { pop.hidden = true; return; }
  pop.hidden = false; $('#bellBtn').classList.add('on');
  const seen = getSeen();
  const draw = () => { list.innerHTML = NOTIF.list.length ? NOTIF.list.slice(0, 15).map(n => notifHtml(n, seen)).join('') : `<div class="empty" style="padding:30px 10px">${tl('Пока уведомлений нет.')}</div>`; };
  if (NOTIF.loaded) draw(); else list.innerHTML = `<div class="empty" style="padding:30px 10px">${tl('Загрузка…')}</div>`;
  await loadNotifs().catch(() => {});
  if (!pop.hidden) { draw(); setSeen(Date.now()); updateBell(); }
}
$('#bellBtn').onclick = e => { e.stopPropagation(); if (!S.uid) return login(); openNotifPop(); };
document.addEventListener('click', e => {
  const pop = $('#notifPop'); if (!pop || pop.hidden) return;
  if (!e.target.closest('.bell-wrap') || e.target.closest('.notif, .np-all')) { pop.hidden = true; $('#bellBtn').classList.remove('on'); }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#notifPop').hidden) { $('#notifPop').hidden = true; $('#bellBtn').classList.remove('on'); } });
async function viewNotifs() {
  setNav('notifs');
  page.innerHTML = `<div class="notifs"><div class="page-head"><h1>${tl('Уведомления')}</h1></div><div id="notifList">${'<div class="skel" style="aspect-ratio:auto;height:64px;margin-bottom:8px"></div>'.repeat(5)}</div></div>`;
  if (!S.uid) { $('#notifList').innerHTML = `<div class="empty">${tl('Войдите, чтобы видеть уведомления.')}</div>`; return; }
  const seen = getSeen();
  const list = await loadNotifs();
  const box = $('#notifList'); if (!box) return;
  box.innerHTML = list.length ? list.map(n => notifHtml(n, seen)).join('') : `<div class="empty">${tl('Пока уведомлений нет.')}</div>`;
  setSeen(Date.now()); updateBell();
}

const PRESET_TAGS = ['meowh0cki', 'renamid', 'gl1n', 'EgorTsai', 'MagicKat1', 'BaNaNcHiK1', 'Olezha27', 'gei_angel', 'meRockstar', 'unfeell'];
const OTHER_TAG = 'Другое';
const tagName = t => (t === OTHER_TAG ? tl(t) : t);
const ALL_TAGS = [...PRESET_TAGS, OTHER_TAG];
const UP = { type: 'art', file: null, cover: null, tags: new Set() };
async function uploadFile(file, onPct) {
  const token = await getToken();
  if (!token) throw new Error(tl('Нужно войти'));
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open('POST', CDN_URL + '/upload');
    x.timeout = 180000;
    x.setRequestHeader('Content-Type', file.type);
    x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    x.setRequestHeader('X-User-Id', S.uid);
    x.setRequestHeader('Authorization', 'Bearer ' + token);
    x.upload.onprogress = e => { if (e.lengthComputable) onPct(Math.round(e.loaded / e.total * 100)); };
    x.onload = () => { try { const j = JSON.parse(x.responseText); x.status < 300 && j.url ? ok(j.url) : bad(new Error(j.error || tl('Ошибка загрузки'))); } catch { bad(new Error(tl('Ошибка загрузки'))); } };
    x.onerror = () => bad(new Error(tl('Нет соединения')));
    x.ontimeout = () => bad(new Error(tl('Слишком долго, попробуйте ещё раз')));
    x.send(file);
  });
}
function viewNew(type) {
  setNav('');
  if (!S.uid) { page.innerHTML = `<div class="empty">${tl('Войдите, чтобы добавлять работы.')}</div>`; return; }
  UP.type = ['art', 'video', 'fanfic'].includes(type) ? type : 'art';
  UP.file = null; UP.cover = null; UP.tags = new Set();
  const T = UP.type;
  const drop = (id, accept, text, sub) => `<label class="drop" id="${id}"><input type="file" accept="${accept}" hidden>
      <div class="drop-empty"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg><b>${text}</b><span>${sub}</span></div>
      <div class="drop-preview" hidden></div></label>`;
  page.innerHTML = `<div class="up">
    <div class="page-head"><h1>${tl('Новая работа')}</h1></div>
    <div class="up-tabs">${[['art', tl('Арт')], ['video', tl('Видео')], ['fanfic', tl('Фанфик')], ...(isMod() ? [['collection', tl('Сборник')]] : [])].map(([k, v]) => `<a class="up-tab${T === k ? ' on' : ''}" href="${routeUrl('new/' + k)}">${v}</a>`).join('')}</div>
    <form class="up-form" id="upForm" novalidate>
      <label class="fld"><span>${tl('Название')}</span><input name="title" maxlength="120" placeholder="${T === 'fanfic' ? tl('Название произведения') : T === 'video' ? tl('Название видео') : tl('Название арта')}" required></label>
      ${T === 'art' ? drop('upDrop', 'image/png,image/jpeg,image/webp,image/gif,image/avif,.avif', tl('Перетащите картинку сюда'), tl('или нажмите, чтобы выбрать · PNG, JPG, WEBP, GIF')) : ''}
      ${T === 'video' ? `${drop('upDrop', 'video/mp4,video/webm,video/quicktime', tl('Перетащите видео сюда'), tl('MP4, WEBM, MOV до 30 МБ'))}<div class="or"><span>${tl('или ссылка')}</span></div><label class="fld"><input name="url" placeholder="${tl('https://youtube.com/... или https://bilibili.com/...')}"></label>` : ''}
      ${T === 'fanfic' ? `<label class="fld"><span>${tl('Ссылка на оригинал')}</span><input name="url" placeholder="${tl('https://ficbook.net/... или https://archiveofourown.org/...')}"></label>
        <div class="fld-row"><label class="fld"><span>${tl('Фэндом')}</span><input name="fandom" maxlength="80" placeholder="${tl('например, Гарри Поттер')}"></label><label class="fld"><span>${tl('Пейринг')}</span><input name="pairing" maxlength="80" placeholder="${tl('например, Гарри/Драко')}"></label></div>
        <label class="fld"><span>${tl('Краткое описание')}</span><textarea name="desc" rows="3" maxlength="600" placeholder="${tl('1–2 предложения о том, что внутри')}"></textarea></label>
        <label class="fld"><span>${tl('Обложка (необязательно)')}</span></label>${drop('upCover', 'image/png,image/jpeg,image/webp,image/gif,image/avif,.avif', tl('Обложка'), tl('необязательно'))}` : ''}
      <div class="fld"><span>${tl('Теги')}</span><div class="chips up-tags">${ALL_TAGS.map(t => `<button type="button" class="chip" data-tag="${esc(t)}">#${esc(tagName(t))}</button>`).join('')}</div></div>
      ${T === 'art' ? `<label class="sw"><input type="checkbox" name="blur"><i></i><div><b>${tl('Спойлер / пазл')}</b><span>${tl('Картинка в ленте будет размытой')}</span></div></label>
        <label class="fld puzzle" hidden><span>${tl('Сложность пазла')}</span><select name="puzzle"><option value="none" selected>${tl('Без пазла — просто размытие')}</option><option value="easy">${tl('Лёгкий')}</option><option value="x2">${tl('Сложный (×2)')}</option><option value="x3">${tl('Сложный (×3)')}</option><option value="x4">${tl('Очень сложный (×4)')}</option><option value="choice">${tl('На выбор зрителя')}</option></select></label>` : ''}
      ${T === 'fanfic' ? `<label class="sw"><input type="checkbox" name="r18"><i></i><div><b>18+</b><span>${tl('Иначе рейтинг PG-13')}</span></div></label>` : ''}
      <div class="up-foot"><div class="up-status" id="upStatus"></div><div class="up-bar" hidden><i id="upBar"></i></div><button class="btn accent up-send" type="submit">${tl('Отправить на проверку')}</button></div>
    </form></div>`;
  const form = $('#upForm');
  const wireDrop = (id, key, kind) => {
    const z = $('#' + id); if (!z) return;
    const inp = $('input', z), prev = $('.drop-preview', z), empty = $('.drop-empty', z);
    const take = f => {
      if (!f) return;
      if (kind === 'video' && f.size > 30 * 1024 * 1024) return toast(tl('Видео больше 30 МБ'), true);
      if (kind === 'image' && !/^image\//.test(f.type)) return toast(tl('Нужна картинка'), true);
      if (kind === 'video' && !/^video\//.test(f.type)) return toast(tl('Нужно видео'), true);
      UP[key] = f;
      const u = URL.createObjectURL(f);
      prev.innerHTML = (kind === 'video' ? `<video src="${u}" muted playsinline controls></video>` : `<img src="${u}" alt="">`) + `<div class="drop-name">${esc(f.name)} · ${(f.size / 1048576).toFixed(1)} ${tl('МБ')}<button type="button" class="drop-x" aria-label="${tl('Убрать')}">✕</button></div>`;
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
  const tagsBox = $('.up-tags', form);
  tagsBox.onclick = e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; UP.tags.has(t) ? UP.tags.delete(t) : UP.tags.add(t); b.classList.toggle('on', UP.tags.has(t)); };
  if (form.blur) form.blur.onchange = () => { $('.puzzle', form).hidden = !form.blur.checked; };
  form.onsubmit = async e => {
    e.preventDefault();
    const st = $('#upStatus'), bar = $('.up-bar', form), btn = $('.up-send', form);
    const say = (t, err) => { st.textContent = t; st.classList.toggle('err', !!err); };
    const title = form.title.value.trim();
    if (!title) return say(tl('Добавьте название'), true);
    const url = form.url?.value.trim() || '';
    if (T === 'art' && !UP.file) return say(tl('Выберите картинку'), true);
    if (T === 'video' && !UP.file && !url) return say(tl('Загрузите видео или вставьте ссылку'), true);
    if (T === 'fanfic' && !/^https?:\/\//.test(url)) return say(tl('Нужна ссылка на оригинал (https://…)'), true);
    btn.disabled = true; say('');
    try {
      let source_url = url, cover_image_url = null;
      const prog = pct => { bar.hidden = false; $('#upBar').style.width = pct + '%'; say(tl('Загрузка файла: {0}%', {0: pct})); };
      if (UP.file) source_url = await uploadFile(UP.file, prog);
      if (UP.cover) cover_image_url = await uploadFile(UP.cover, prog);
      say(tl('Сохраняем…'));
      let tags = [...UP.tags];
      const body = { title, source_url, content_type: T, status: 'draft', submitted_by: S.uid, tags };
      if (T === 'art') { body.is_blurred = !!form.blur.checked; body.puzzle_difficulty = body.is_blurred ? form.puzzle.value : 'easy'; }
      if (T === 'fanfic') Object.assign(body, { fandom: form.fandom.value.trim() || null, pairing: form.pairing.value.trim() || null, description: form.desc.value.trim() || null, age_rating: form.r18.checked ? '18+' : 'pg13', cover_image_url });
      await api('content', { method: 'POST', body, prefer: 'return=minimal' });
      fetch(CDN_URL + '/notify-moderators', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ kind: T, title }) }).catch(() => {});
      page.innerHTML = `<div class="up-done"><div class="up-done-ic"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>${tl('Отправлено на проверку!')}</h1><p>${tl('Модераторы посмотрят работу и опубликуют её. Если что-то будет не так — придёт уведомление с причиной.')}</p><div class="up-done-acts"><a class="btn accent" href="${routeUrl('new/' + T)}">${tl('Добавить ещё')}</a><a class="btn" href="${routeUrl('')}">${tl('В ленту')}</a></div></div>`;
    } catch (er) { say(tl('Ошибка: ') + er.message, true); btn.disabled = false; }
  };
}

const SUP = { thread: null, timer: null, owner: null };
async function viewSupport(threadArg) {
  setNav('support');
  clearInterval(SUP.timer);
  if (!S.uid) { page.innerHTML = `<div class="empty">${tl('Войдите, чтобы написать в поддержку.')}</div>`; return; }
  if (!S.me) await loadMe();
  const mod = isMod();
  page.innerHTML = `<div class="sup${mod ? ' sup-mod' : ''}">
    ${mod ? `<aside class="sup-list" id="supList"><div class="sup-list-head">${tl('Обращения')}</div><div id="supThreads">${'<div class="skel" style="aspect-ratio:auto;height:58px;margin:8px"></div>'.repeat(5)}</div></aside>` : ''}
    <section class="sup-chat" id="supChat">
      <header class="sup-head"><div class="sup-ava"><img src="${COIN}" alt=""></div><div><b>${tl('Поддержка renah0cki')}</b><span>${tl('Модераторы ответят здесь. Обычно в течение дня.')}</span></div></header>
      <div class="sup-msgs" id="supMsgs"><div class="empty">${tl('Загрузка…')}</div></div>
      <div class="sup-attach" id="supAttach" hidden></div>
      <form class="sup-form" id="supForm"><label class="btn sup-clip" title="${tl('Прикрепить фото')}" aria-label="${tl('Прикрепить фото')}"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.avif" hidden><svg viewBox="0 0 24 24"><path d="M20 11.5 12.6 19a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/></svg></label><textarea rows="1" maxlength="2000" placeholder="${tl('Сообщение…')}" aria-label="${tl('Сообщение')}"></textarea><button class="btn accent" type="submit" aria-label="${tl('Отправить')}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></form>
    </section></div>`;
  const form = $('#supForm'), ta = $('textarea', form), fileIn = $('.sup-clip input', form), att = $('#supAttach');
  SUP.file = null;
  const setFile = f => {
    if (f && !/^image\//.test(f.type)) return toast(tl('Можно прикрепить только картинку'), true);
    if (f && f.size > 15 * 1048576) return toast(tl('Картинка больше 15 МБ'), true);
    SUP.file = f || null; fileIn.value = '';
    if (!f) { att.hidden = true; att.innerHTML = ''; return; }
    att.innerHTML = `<img src="${URL.createObjectURL(f)}" alt=""><span>${esc(f.name)}</span><button type="button" class="drop-x" aria-label="${tl('Убрать фото')}">✕</button>`;
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
    const text = ta.value.trim(); if (!text && !SUP.file) return;
    if (!SUP.thread) return toast(mod ? tl('Сначала выберите обращение в списке') : tl('Чат ещё загружается, попробуйте через секунду'), true);
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
  if (mod) { await supThreads(); if (threadArg) supOpen(threadArg); else $('#supMsgs').innerHTML = `<div class="empty">${tl('Выберите обращение слева.')}</div>`; }
  else { try { SUP.thread = await rpc('support_get_or_create_thread'); SUP.owner = S.uid; await supLoad(true); } catch (er) { $('#supMsgs').innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(er.message)}</div>`; } }
  SUP.timer = setInterval(() => { if (!$('#supChat')) return clearInterval(SUP.timer); if (SUP.thread) supLoad(false); if (mod) supThreads(); }, 8000);
}
async function supThreads() {
  const rows = await api('support_threads?select=*&order=last_message_at.desc.nullslast&limit=100').catch(() => []);
  await loadProfiles(rows.map(r => r.user_id));
  const box = $('#supThreads'); if (!box) return;
  box.innerHTML = rows.length ? rows.map(t => {
    const p = S.profiles.get(t.user_id);
    return `<button class="sup-thread${t.id === SUP.thread ? ' on' : ''}${t.status === 'in_progress' ? ' new' : ''}" data-sup="${t.id}">${avaHtml(p?.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b><span>${t.last_message_at ? when(t.last_message_at) : ''}${t.support_banned ? ' · 🚫' : ''}</span></div></button>`;
  }).join('') : `<div class="empty">${tl('Обращений нет.')}</div>`;
}
function supOpen(id) { SUP.thread = id; $$('.sup-thread').forEach(b => b.classList.toggle('on', b.dataset.sup === id)); $('#supMsgs').innerHTML = `<div class="empty">${tl('Загрузка…')}</div>`; supLoad(true); }
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
    return `${head ? `<div class="sup-meta${mine ? ' me' : ''}">${mine ? tl('Вы') : esc(pname(p))} · ${when(m.created_at)}</div>` : ''}<div class="sup-bub${mine ? ' me' : ''}${m.image_url ? ' has-img' : ''}">${m.image_url && isOwnFile(m.image_url) ? `<a class="sup-img" href="${esc(m.image_url)}" data-supimg>${imgTag(m.image_url, 480)}</a>` : ''}${m.image_url && m.body === '📷 Фото' ? '' : `<span>${esc(m.body)}</span>`}</div>`;
  }).join('') : `<div class="empty sup-empty">${tl('Опишите проблему или вопрос — модераторы ответят здесь.')}</div>`;
  if (box.dataset.h === html) return;
  box.dataset.h = html; box.innerHTML = html;
  if (jump || near) box.scrollTop = box.scrollHeight;
}
page.addEventListener('click', e => {
  const t = e.target.closest('[data-sup]'); if (t) supOpen(t.dataset.sup);
  const im = e.target.closest('[data-supimg]'); if (im) { e.preventDefault(); openViewer([im.getAttribute('href')], 0); }
});

function setNav(k) { $$('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === k)); document.querySelector('.app').classList.remove('menu-open'); }
$('#menuBtn').onclick = () => document.querySelector('.app').classList.toggle('menu-open');
const shade = document.createElement('div'); shade.className = 'side-shade';
shade.addEventListener('click', () => document.querySelector('.app').classList.remove('menu-open'));
document.querySelector('.app').append(shade);
addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelector('.app').classList.remove('menu-open'); });
(() => {
  const side = $('#side'), app = document.querySelector('.app');
  let x0 = null, y0 = 0, dx = 0, drag = false;
  side.addEventListener('touchstart', e => { if (!app.classList.contains('menu-open') || e.touches.length !== 1) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; drag = false; }, { passive: true });
  side.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!drag) { if (Math.abs(mx) < 8) return; if (Math.abs(my) > Math.abs(mx) || mx > 0) { x0 = null; return; } drag = true; side.classList.add('dragging'); }
    dx = Math.min(0, mx); side.style.transform = `translateX(${dx}px)`;
    shade.style.opacity = String(Math.max(0, 1 + dx / side.offsetWidth));
  }, { passive: true });
  side.addEventListener('touchend', () => {
    if (x0 == null) return; x0 = null;
    side.classList.remove('dragging'); side.style.transform = ''; shade.style.opacity = '';
    if (drag && dx < -60) app.classList.remove('menu-open');
  }, { passive: true });
})();
$('#collapseBtn').onclick = () => { const a = document.querySelector('.app'); a.classList.toggle('collapsed'); const c = a.classList.contains('collapsed'); $('#collapseBtn').title = c ? tl('Развернуть меню') : tl('Свернуть меню'); try { localStorage.setItem('v2_side', c ? '1' : '0'); } catch {} };
try { if (localStorage.getItem('v2_side') === '1') { document.querySelector('.app').classList.add('collapsed'); $('#collapseBtn').title = tl('Развернуть меню'); } } catch {}
let SPONS_ROWS = [], TOPDON_ROWS = [];
function sponsAvaHtml(p) {
  const fr = eqOf(p)?.frame;
  const img = imgTag(avatarUrl(p), 360, ' width="28" height="28"');
  if (!fr || !/^frame_[a-z0-9_]+$/i.test(fr)) return img;
  return `<span class="cf-wrap cf-sm cf-${esc(fr)}">${img}</span>`;
}
function drawSponsors() {
  const box = $('#sponsList'); if (!box || !SPONS_ROWS.length) return;
  box.innerHTML = SPONS_ROWS.map(r => {
    const p = { ...r, ...(S.profiles.get(r.id) || {}) };
    return `<a class="spons-item" href="${userPath(p)}" title="${esc(pname(p))}">${sponsAvaHtml(p)}<span class="spons-nm">${cosName(p)}</span></a>`;
  }).join('');
  $('#spons').hidden = false;
}
function loadSponsors() {
  swr('sponsors', () => api(`profiles?or=(role.eq.sponsor,extra_roles.cs.{sponsor})&select=id,username,display_name,avatar_url,name_color`), (rows, cached) => {
    const box = $('#sponsList'); if (!box || !rows?.length) return;
    if (!cached) rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
    const ids = rows.map(r => r.id).sort().join();
    if (box.dataset.ids === ids && SPONS_ROWS.length) {
      const byId = new Map(rows.map(r => [r.id, r]));
      SPONS_ROWS = SPONS_ROWS.map(p => byId.get(p.id) || p);
      return drawSponsors();
    }
    box.dataset.ids = ids;
    SPONS_ROWS = [...rows].sort(() => Math.random() - .5);
    drawSponsors();
  }).catch(() => {});
}
loadSponsors();
$('#sponsList').addEventListener('scroll', e => { const l = e.currentTarget; l.classList.toggle('end', l.scrollTop + l.clientHeight >= l.scrollHeight - 2); }, { passive: true });
function drawTopDonors() {
  const box = $('#topDonList'); if (!box) return;
  if (!TOPDON_ROWS.length) { $('#topDon').hidden = true; return; }
  box.innerHTML = TOPDON_ROWS.map((r, i) => {
    const p = S.profiles.get(r.user_id) || r.p || { id: r.user_id };
    return `<a class="spons-item" href="${userPath(p)}" title="${esc(pname(p))}"><span class="medal">${['🥇', '🥈', '🥉'][i] || ''}</span>${sponsAvaHtml(p)}<span class="spons-nm">${cosName(p)}</span></a>`;
  }).join('');
  $('#topDon').hidden = false;
}
async function loadTopDonors() {
  try { localStorage.removeItem(LSC + 'topdon'); localStorage.removeItem(LSC + 'topdon2'); } catch {}
  try {
    const rows = await rpc('coin_top_donors', { p_limit: 3 });
    if (!Array.isArray(rows)) return;
    await loadProfiles(rows.map(r => r.user_id));
    TOPDON_ROWS = rows.map(r => ({ ...r, p: S.profiles.get(r.user_id) || null }));
    drawTopDonors();
  } catch (e) { console.warn('loadTopDonors:', e); }
}
loadTopDonors();
setInterval(() => { if (!document.hidden) { loadTopDonors(); loadSponsors(); } }, 60e3);
$('#meBtn').onclick = e => { e.stopPropagation(); $('#meMenu').hidden = !$('#meMenu').hidden; };
const TERMS_KEY = 'rn_terms_v2';
const TERMS_REV = '2026-11-25T14:30:00Z';
const termsOutdated = t => !t || Date.parse(t) < Date.parse(TERMS_REV);
const termsLocal = () => { try { return !!localStorage.getItem(TERMS_KEY); } catch { return false; } };
let termsPending = false;
const onLegalPage = () => /^(rules|privacy)(\/|$)/.test(curRoute());
function termsGate() {
  if ($('#termsGate')) return;
  if (onLegalPage()) { termsPending = true; return; }
  termsPending = false;
  const ov = document.createElement('div');
  ov.id = 'termsGate'; ov.className = 'terms-ov';
  ov.innerHTML = `<form class="terms-box" role="dialog" aria-modal="true" aria-label="${tl('Правила сайта')}">
    <h2>${tl('Добро пожаловать на renah0cki')}</h2>
    <p>${tl('Прежде чем пользоваться сайтом, ознакомьтесь с')} <a href="/rules" target="_blank" rel="noopener">${tl('Пользовательским соглашением')}</a> ${tl('и')} <a href="/privacy" target="_blank" rel="noopener">${tl('Политикой конфиденциальности')}</a>${tl('. Коротко:')}</p>
    <ul>
      <li>${tl('Запрещены 18+, политика, травля, угрозы, чужие личные данные и всё незаконное — за это удаляют контент и блокируют.')}</li>
      <li>${tl('Работы проверяют модераторы, на всё остальное можно пожаловаться. Любого пользователя можно заблокировать для себя.')}</li>
      <li>${tl('Донаты добровольные, пузокоины — подарок за поддержку; их нельзя вывести или обменять на деньги.')}</li>
      <li>${tl('Сайт работает «как есть». За свои публикации отвечаете вы.')}</li>
    </ul>
    <label class="terms-check"><input type="checkbox" name="ok"> <span>${tl('Я принимаю Пользовательское соглашение (оферту) и Политику конфиденциальности и даю')} <a href="/privacy#consent" target="_blank" rel="noopener">${tl('согласие на обработку персональных данных')}</a></span></label>
    <p class="terms-err" role="alert"></p>
    <button class="btn accent" type="submit">${tl('Продолжить')}</button>
  </form>`;
  const f = $('form', ov);
  f.onsubmit = async e => {
    e.preventDefault();
    if (!f.ok.checked) { $('.terms-err', ov).textContent = tl('Поставьте галочку, чтобы продолжить'); return; }
    try { localStorage.setItem(TERMS_KEY, new Date().toISOString()); } catch {}
    if (S.uid) { try { const t = await rpc('accept_terms'); if (S.me) S.me.terms_accepted_at = t; } catch {} }
    ov.remove(); document.documentElement.classList.remove('terms-lock');
  };
  document.body.append(ov); document.documentElement.classList.add('terms-lock');
}
if (!S.uid && !termsLocal()) setTimeout(termsGate, 400);

S.blocked = new Set();
async function loadBlocks() {
  if (!S.uid) return;
  try { S.blocked = new Set((await api('user_blocks?select=blocked')).map(r => r.blocked)); } catch {}
  applyBlockCss();
}
function applyBlockCss() {
  let st = $('#blkCss'); if (!st) { st = document.createElement('style'); st.id = 'blkCss'; document.head.append(st); }
  st.textContent = [...S.blocked].map(id => `[data-auid="${CSS.escape(id)}"]`).join(',') + (S.blocked.size ? '{display:none!important}' : '');
}
async function toggleBlock(p) {
  if (!S.uid) return login();
  const on = S.blocked.has(p.id);
  if (!on && !confirm(tl('Заблокировать {0}? Вы перестанете видеть его работы, комментарии и отзывы, он не сможет писать вам в ЛС и звонить в Y.', {0: pname(p)}))) return;
  try {
    if (on) await api(`user_blocks?blocked=eq.${p.id}`, { method: 'DELETE' });
    else await api('user_blocks', { method: 'POST', prefer: 'return=minimal', body: { blocked: p.id } });
    on ? S.blocked.delete(p.id) : S.blocked.add(p.id);
    applyBlockCss(); toast(on ? tl('Пользователь разблокирован') : tl('Пользователь заблокирован'));
    route();
  } catch (er) { toast(er.message, true); }
}

const TARGET_LBL = { content: tl('работу'), review: tl('отзыв'), user: tl('пользователя'), collection: tl('сборник'), news: tl('новость'), suggestion: tl('видео в предложке') };
function reportTarget(type, id) {
  if (!S.uid) return login();
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal"><h2>${tl('Пожаловаться на')} ${TARGET_LBL[type] || tl('контент')}</h2>
    <div class="radios">${REPORT_REASONS.map(([v, t], i) => `<label class="radio"><input type="radio" name="r" value="${v}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</div>
    <label>${tl('Подробности (необязательно)')}<textarea name="d" rows="2" maxlength="500"></textarea></label>
    <p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Отправить')}</button></div></form>`;
  const close = () => ov.remove();
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(); });
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, hint = $('.hint', ov);
    try {
      await api('content_reports', { method: 'POST', prefer: 'return=minimal', body: { target_type: type, target_id: String(id), reason: f.r.value, details: f.d.value.trim() || null } });
      close(); toast(tl('Жалоба отправлена модераторам'));
    } catch (er) { hint.textContent = /duplicate|unique|409/i.test(er.message) ? tl('Вы уже жаловались на это.') : tl('Ошибка: ') + er.message; }
  };
  document.body.append(ov);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-report]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  reportTarget(b.dataset.report, b.dataset.rid);
});

async function loadMe() {
  if (!S.uid) return;
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,short_code,role,extra_roles,name_color,bio,stream_twitch_url,stream_social_url,stream_donate_url,notify_likes,notify_comments,notify_new_followers,notify_new_submission,terms_accepted_at`);
    S.me = me; if (me) S.profiles.set(me.id, me);
    loadBlocks();
    if (me && 'terms_accepted_at' in me && termsOutdated(me.terms_accepted_at)) {
      if (termsLocal()) rpc('accept_terms').then(t => { me.terms_accepted_at = t; }).catch(() => {});
      else termsGate();
    }
    $('#meAva').src = avatarUrl(me);
    $('#meProfile').href = userPath(me);
    $('#meMod').hidden = !isMod();
    $('#navAwards').hidden = !isMod();
    $('#meOld').hidden = !(hasRole(me, 'admin') || hasRole(me, 'gl_moder') || me?.id === OWNER_ID);
    applyMeFrame();
    $('#navMod').hidden = !isMod();
    if (isMod()) modCount();
    postMenuLate();
    updateStreak();
    setTimeout(() => { if (!NOTIF.loaded) loadNotifs(); }, 1200);
  } catch {}
  try { const v = await rpc('coin_balance'); $('#coinVal').textContent = fmt(v || 0); } catch { $('#coinVal').textContent = '0'; }
}

function login() {
  try { localStorage.setItem('fh_after_login', location.pathname + location.search); } catch {}
  location.href = `${SB_URL}/auth/v1/authorize?provider=twitch&redirect_to=${encodeURIComponent(location.origin + '/')}`;
}
async function logout() {
  if (!confirm(tl('Выйти из аккаунта?'))) return;
  const s = readSession();
  try { if (s?.token) await fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.token } }); } catch {}
  try { localStorage.removeItem(LS_SESSION); } catch {}
  location.href = BASE;
}
$('#loginBtn').onclick = login;
$('#meLogout').onclick = logout;
$('#meEdit').onclick = () => { $('#meMenu').hidden = true; editProfile(); };
if (!S.uid) { document.querySelector('.app').classList.add('guest'); $('#loginBtn').hidden = false; }

function editProfile() {
  const me = S.me; if (!me) return;
  let ava = me.avatar_url || '', file = null;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal pe"><h2>${tl('Редактировать профиль')}</h2>
    <div class="pe-ava"><img src="${esc(avatarUrl(me))}" alt=""><label class="btn">${tl('Загрузить фото')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.avif" hidden></label></div>
    <label>${tl('Никнейм')}<input name="n" maxlength="40" value="${esc(me.display_name || me.username || '')}" placeholder="${tl('Как тебя называть')}"></label>
    <label>${tl('Описание профиля')}<textarea name="b" rows="3" maxlength="100" placeholder="${tl('Расскажи немного о себе (до 100 символов)')}">${esc(me.bio || '')}</textarea></label>
    ${canColor(me) ? `<div class="pe-color"><span>${tl('Цвет ника')}</span><div class="sw-row" data-colors><button type="button" class="nc-sw none${!me.name_color ? ' on' : ''}" data-nc="" title="${tl('Без цвета')}">✕</button>${NAME_COLORS.map(c => `<button type="button" class="nc-sw${me.name_color === c ? ' on' : ''}" data-nc="${c}" style="background:${c}"></button>`).join('')}</div>
      <span>${tl('Краски (7TV)')}</span><div class="sw-row">${NAME_PAINTS.map(p => `<button type="button" class="nc-sw${me.name_color === p.css ? ' on' : ''}" data-nc="${esc(p.css)}" title="${esc(p.label)}" style="background:${p.css}"></button>`).join('')}</div>
      <div class="pe-prev">${tl('Предпросмотр:')} <b id="ncPrev"${nameAttr(me.name_color)}>${esc(pname(me))}</b></div></div>` : ''}
    ${hasRole(me, 'streamer') ? `<label>${tl('Ссылка на Twitch')}<input name="tw" value="${esc(me.stream_twitch_url || '')}" placeholder="https://twitch.tv/..."></label><label>${tl('Соцсеть (Telegram, VK…)')}<input name="so" value="${esc(me.stream_social_url || '')}" placeholder="https://t.me/..."></label><label>${tl('Ссылка на донат')}<input name="dn" value="${esc(me.stream_donate_url || '')}" placeholder="https://..."></label>` : ''}
    ${me.username ? `<div class="pe-color" style="gap:8px"><span>${tl('Личная ссылка для доната пузокоинами')}</span>
      <div style="display:flex;gap:6px;align-items:center"><input type="text" readonly value="${esc(location.origin + '/donate/' + encodeURIComponent(me.username))}" style="flex:1;min-width:0;opacity:.85"><button type="button" class="btn" id="peCopyDn" style="flex:none">${tl('Копировать')}</button></div>
      <label style="flex-direction:row;align-items:center;gap:8px;cursor:pointer;font-weight:500"><input type="checkbox" name="cdon" style="width:16px;height:16px;flex:none"><span>${tl('Принимать донаты пузокоинами и показывать кнопку в профиле')}</span></label></div>` : ''}
    <p class="hint">${tl('Логин Twitch (@')}${esc(me.username || '')}${tl(') не меняется.')}</p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div></form>`;
  const close = () => ov.remove();
  let color = me.name_color || '';
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return close();
    const sw = e.target.closest('[data-nc]'); if (!sw) return;
    color = sw.dataset.nc; $$('[data-nc]', ov).forEach(b => b.classList.toggle('on', b === sw));
    const pv = $('#ncPrev', ov); pv.removeAttribute('style'); pv.className = '';
    const m = nameAttr(color), st = (m.match(/style="([^"]*)"/) || [])[1], cl = (m.match(/class="([^"]*)"/) || [])[1];
    if (st) pv.setAttribute('style', st); if (cl) pv.className = cl;
  });
  $('[name=n]', ov).addEventListener('input', e => { const pv = $('#ncPrev', ov); if (pv) pv.textContent = e.target.value || pname(me); });
  const fi = $('input[type=file]', ov);
  fi.onchange = () => {
    const f = fi.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) return toast(tl('Нужна картинка'), true);
    if (f.size > 10 * 1048576) return toast(tl('Картинка больше 10 МБ'), true);
    file = f; $('.pe-ava img', ov).src = URL.createObjectURL(f);
  };
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const f = e.target, hint = $('.hint', ov), btn = $('button[type=submit]', f);
    const name = f.n.value.trim();
    if (!name) { hint.textContent = tl('Никнейм не может быть пустым'); return; }
    btn.disabled = true;
    try {
      if (file) { hint.textContent = tl('Загрузка фото…'); ava = await uploadFile(file, p => { hint.textContent = tl('Загрузка фото: {0}%', {0: p}); }); }
      const patch = { display_name: name, bio: f.b.value.trim() || null, avatar_url: ava || null };
      if (canColor(me)) patch.name_color = okColor(color) ? color : null;
      if (f.tw) {
        const u = x => { const v = x.value.trim(); if (v && !/^https?:\/\//.test(v)) throw new Error(tl('Ссылки должны начинаться с https://')); return v || null; };
        Object.assign(patch, { stream_twitch_url: u(f.tw), stream_social_url: u(f.so), stream_donate_url: u(f.dn) });
      }
      await api(`profiles?id=eq.${S.uid}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
      if (f.cdon) await rpc('coin_donate_toggle', { p_enabled: !!f.cdon.checked }).catch(() => {});
      Object.assign(me, patch); S.profiles.set(me.id, { ...(S.profiles.get(me.id) || {}), ...patch });
      drawSponsors(); drawTopDonors(); loadSponsors();
      try { const s = readSession(); if (s?.user) { Object.assign(s.user, patch); localStorage.setItem(LS_SESSION, JSON.stringify(s)); } } catch {}
      $('#meAva').src = avatarUrl(me);
      close(); toast(tl('Профиль сохранён'));
      if (curRoute().startsWith('u/')) route();
    } catch (er) { hint.textContent = tl('Ошибка: ') + er.message; btn.disabled = false; }
  };
  document.body.append(ov);
  if (me.username) {
    const cp = $('#peCopyDn', ov);
    if (cp) cp.onclick = () => navigator.clipboard.writeText(`${location.origin}/donate/${encodeURIComponent(me.username)}`).then(() => toast(tl('Ссылка скопирована')), () => {});
    rpc('coin_donate_target', { p_username: me.username }).then(t => { if (t && $('[name=cdon]', ov)) $('[name=cdon]', ov).checked = t.coin_donate_enabled === true; }).catch(() => {});
  }
}

const MOD = { tab: 'queue' };
async function modCount() {
  const cnt = async q => { const t = await getToken(); const r = await fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), Prefer: 'count=exact', Range: '0-0' } }); return parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10) || 0; };
  try {
    const [a, b0, c, b2] = await Promise.all([cnt('content?select=id&status=eq.draft'), cnt('comment_reports?select=id&status=eq.pending'), cnt('reviews?select=id&status=eq.draft'), cnt('content_reports?select=id&status=eq.pending').catch(() => 0)]);
    const b = b0 + (b2 || 0);
    MOD.n = { queue: a + c, reports: b };
    const n = a + b + c, el = $('#modBadge');
    if (el) { el.textContent = n > 99 ? '99+' : String(n); el.hidden = !n; }
    $$('[data-modtab]').forEach(t => { const k = t.dataset.modtab, v = MOD.n[k]; const s = $('i', t); if (s) s.textContent = v ? v : ''; });
  } catch {}
}
function viewMod(tab) {
  setNav('mod');
  if (!S.me) { page.innerHTML = `<div class="empty">${tl('Загрузка…')}</div>`; return; }
  if (!isMod()) { page.innerHTML = `<div class="empty">${tl('Раздел только для модераторов.')}</div>`; return; }
  MOD.tab = ['reports', 'users', 'bans'].includes(tab) ? tab : 'queue';
  const tb = (k, t, h) => `<a class="tab${MOD.tab === k ? ' on' : ''}" data-modtab="${k}" href="${routeUrl('mod' + h)}">${t} <i></i></a>`;
  page.innerHTML = `<div class="mod"><div class="page-head"><h1>${tl('Модерация')}</h1></div>
    <div class="tabs mod-tabs">${tb('queue', tl('На проверке'), '')}${tb('reports', tl('Жалобы'), '/reports')}${tb('users', tl('Пользователи'), '/users')}${tb('bans', tl('Баны'), '/bans')}</div>
    <div id="modList">${'<div class="skel" style="aspect-ratio:auto;height:140px;margin-bottom:12px"></div>'.repeat(3)}</div></div>`;
  modCount();
  ({ queue: modQueue, reports: modReports, users: modUsers, bans: modBans })[MOD.tab]();
}
const ROLE_LIST = ['respect_plus', 'sponsor', 'streamer', 'moderator', 'admin'];
const roleListFor = () => S.uid === OWNER_ID ? ROLE_LIST : ROLE_LIST.filter(r => r !== 'admin');
const canRoles = () => hasRole(S.me, 'gl_moder') || hasRole(S.me, 'admin');
const rolesOf = p => [p.role, ...(p.extra_roles || [])].filter((r, i, a) => r && r !== 'user' && a.indexOf(r) === i);
function userRow(p) {
  const roles = rolesOf(p), staff = MOD_ROLES.some(r => roles.includes(r));
  return `<article class="mod-user${p.is_banned ? ' banned' : ''}" data-uid="${p.id}">
    ${avaHtml(p.avatar_url, pname(p))}
    <div class="mu-main"><b data-user="${esc(p.username || p.id)}"><span${nameAttr(p.name_color)}>${esc(pname(p))}</span></b>${p.username ? `<span>@${esc(p.username)}</span>` : ''}
      <div class="mu-roles">${roles.map(r => `<span class="role role-${r}">${ROLE_LABEL[r] || r}</span>`).join('')}${p.is_banned ? `<span class="role role-ban">${tl('Заблокирован')}</span>` : ''}</div></div>
    <div class="mu-acts">${canRoles() && p.id !== S.uid ? `<button class="btn" data-uroles="${p.id}">${tl('Роли')}</button>` : ''}${p.id === S.uid || (staff && !canRoles()) ? '' : p.is_banned ? `<button class="btn" data-uunban="${p.id}">${tl('Разбанить')}</button>` : `<button class="btn danger" data-uban="${p.id}">${tl('Забанить')}</button>`}</div>
  </article>`;
}
const U_SEL = 'id,username,display_name,avatar_url,role,extra_roles,is_banned,name_color';
async function modUsers() {
  const box = $('#modList'); if (!box) return;
  box.innerHTML = `<label class="search wal-find"><input id="muFind" type="search" placeholder="${tl('Поиск по нику')}" autocomplete="off"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></label>
    <div class="mu-filter chips"><button class="chip on" data-muf="">${tl('Все')}</button><button class="chip" data-muf="staff">${tl('Модераторы')}</button>${ROLE_LIST.filter(r => !MOD_ROLES.includes(r)).map(r => `<button class="chip" data-muf="${r}">${ROLE_LABEL[r]}</button>`).join('')}</div>
    <div id="muList"></div>`;
  let t, f = '';
  const load = async () => {
    const q = $('#muFind').value.trim().replace(/[*,()%]/g, '');
    let url = `profiles?select=${U_SEL}&order=username.asc&limit=60`;
    const conds = [];
    if (q) conds.push(`or(username.ilike.*${encodeURIComponent(q)}*,display_name.ilike.*${encodeURIComponent(q)}*)`);
    if (f === 'staff') conds.push('or(role.in.(moderator,gl_moder,admin),extra_roles.ov.{moderator,gl_moder,admin})');
    else if (f) conds.push(`or(role.eq.${f},extra_roles.cs.{${f}})`);
    if (conds.length) url += `&and=(${conds.join(',')})`;
    const rows = await api(url).catch(e => { toast(e.message, true); return []; });
    rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
    const l = $('#muList'); if (l) l.innerHTML = rows.length ? rows.map(userRow).join('') : `<div class="empty">${tl('Никого не нашли.')}</div>`;
  };
  $('#muFind').oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
  box.querySelector('.mu-filter').onclick = e => { const c = e.target.closest('[data-muf]'); if (!c) return; f = c.dataset.muf; $$('[data-muf]', box).forEach(x => x.classList.toggle('on', x === c)); load(); };
  load();
}
async function modBans() {
  const box = $('#modList'); if (!box) return;
  const rows = await api(`profiles?is_banned=eq.true&select=${U_SEL}&order=username.asc&limit=200`).catch(e => { toast(e.message, true); return []; });
  rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
  box.innerHTML = rows.length ? `<div id="muList">${rows.map(userRow).join('')}</div>` : `<div class="empty">${tl('Заблокированных нет.')}</div>`;
}
async function banUser(id, on) {
  const p = S.profiles.get(id);
  if (!confirm(on ? tl('Заблокировать {0}? Все его работы на проверке будут удалены.', {0: pname(p)}) : tl('Разблокировать {0}?', {0: pname(p)}))) return;
  try {
    const r = await api(`profiles?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: { is_banned: on } });
    if (!r?.length) throw new Error(tl('Нет прав'));
    if (on) {
      const drafts = await api(`content?submitted_by=eq.${id}&status=eq.draft&select=id`).catch(() => []);
      const tok = await getToken();
      for (const d of drafts) {
        await fetch(CDN_URL + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ contentId: d.id }) }).catch(() => {});
        await api(`content?id=eq.${d.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    Object.assign(p, { is_banned: on });
    $$(`.mod-user[data-uid="${id}"]`).forEach(el => { el.outerHTML = userRow(p); });
    if (MOD.tab === 'bans' && !on) modBans();
    toast(on ? tl('Пользователь заблокирован') : tl('Пользователь разблокирован'));
    modCount();
  } catch (er) { toast(er.message, true); }
}
function rolesDialog(id) {
  const p = S.profiles.get(id); if (!p) return;
  let roles = rolesOf(p);
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  const draw = () => `<h2>${tl('Роли:')} ${esc(pname(p))}</h2><p class="muted" style="margin:0;font-size:13px">${tl('Первая роль — основная (её значок виден у ника).')}</p>
    <div class="roles-pick">${roleListFor().map(r => `<label class="sw"><input type="checkbox" data-r="${r}"${roles.includes(r) ? ' checked' : ''}><i></i><div><b>${ROLE_LABEL[r]}</b>${roles[0] === r ? `<span>${tl('основная')}</span>` : roles.includes(r) ? `<span><a href="#" data-main="${r}">${tl('сделать основной')}</a></span>` : ''}</div></label>`).join('')}</div>
    <p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div>`;
  ov.innerHTML = `<form class="v2-modal">${draw()}</form>`;
  const f = $('form', ov);
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return ov.remove();
    const m = e.target.closest('[data-main]'); if (m) { e.preventDefault(); roles = [m.dataset.main, ...roles.filter(x => x !== m.dataset.main)]; f.innerHTML = draw(); }
  });
  f.addEventListener('change', e => { const r = e.target.dataset.r; if (!r) return; roles = e.target.checked ? [...roles, r] : roles.filter(x => x !== r); f.innerHTML = draw(); });
  f.onsubmit = async e => {
    e.preventDefault();
    const body = { role: roles[0] || null, extra_roles: roles.slice(1) };
    try {
      const r = await api(`profiles?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body });
      if (!r?.length) throw new Error(tl('Нет прав на смену ролей'));
      Object.assign(p, body); S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }); loadSponsors(); ov.remove(); toast(tl('Роли сохранены'));
      $$(`.mod-user[data-uid="${id}"]`).forEach(el => { el.outerHTML = userRow(p); });
    } catch (er) { $('.hint', f).textContent = tl('Ошибка: ') + er.message; }
  };
  document.body.append(ov);
}
page.addEventListener('click', e => {
  const b = e.target.closest('[data-uban]'), u = e.target.closest('[data-uunban]'), r = e.target.closest('[data-uroles]');
  if (b) banUser(b.dataset.uban, true);
  if (u) banUser(u.dataset.uunban, false);
  if (r) rolesDialog(r.dataset.uroles);
});
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
    return src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">${tl('Открыть видео')}</a>` : '';
  }
  return `${it.cover_image_url ? `<div class="mod-imgs">${imgTag(it.cover_image_url, 360)}</div>` : ''}${src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">${tl('Открыть фанфик')}</a>` : ''}`;
}
async function modQueue() {
  let rows;
  try { rows = absorb(await api(`content?status=eq.draft&select=*,${AUTHOR}&order=created_at.asc&limit=50`)); }
  catch (e) { const b = $('#modList'); if (b) b.innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; return; }
  const revs = await api('reviews?status=eq.draft&order=created_at.asc&select=*').catch(() => []);
  await loadProfiles(revs.map(r => r.user_id));
  const box = $('#modList'); if (!box || MOD.tab !== 'queue') return;
  const TN = { art: tl('Арт'), video: tl('Видео'), fanfic: tl('Фанфик') };
  const revHtml = revs.map(r => { const p = S.profiles.get(r.user_id); return `<article class="mod-card" data-revid="${r.id}"><div class="mod-top">${avaHtml(p?.avatar_url || r.avatar_url, pname(p))}<div><b data-user="${esc(p?.username || r.user_id)}">${esc(p ? pname(p) : r.username)}</b><span>${tl('Отзыв о сайте ·')} ${when(r.created_at)}</span></div></div><p class="mod-desc">${esc(r.text)}</p><div class="mod-acts"><button class="btn accent" data-revok="${r.id}">${tl('Опубликовать')}</button><button class="btn" data-revno="${r.id}">${tl('Отклонить')}</button></div></article>`; }).join('');
  box.innerHTML = rows.length ? rows.map(it => {
    const a = it.author;
    const meta = [it.fandom && tl('Фэндом: {0}', {0: esc(it.fandom)}), it.pairing && tl('Пейринг: {0}', {0: esc(it.pairing)}), it.age_rating === '18+' && '18+', it.is_blurred && tl('Спойлер / пазл')].filter(Boolean);
    return `<article class="mod-card" data-mid="${it.id}">
      <div class="mod-top">${avaHtml(a?.avatar_url, pname(a))}<div><b data-user="${esc(a?.username || it.submitted_by)}">${esc(pname(a))}</b><span>${TN[it.content_type] || it.content_type} · ${when(it.created_at)}</span></div></div>
      <h3>${esc(it.title || tl('Без названия'))}</h3>
      ${it.description ? `<p class="mod-desc">${esc(it.description)}</p>` : ''}
      ${meta.length ? `<div class="mod-meta">${meta.join(' · ')}</div>` : ''}
      ${Array.isArray(it.tags) && it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">#${esc(tagName(t))}</span>`).join('')}</div>` : ''}
      ${modMedia(it)}
      <div class="mod-acts"><button class="btn accent" data-mok="${it.id}">${tl('Одобрить')}</button><button class="btn" data-mno="${it.id}">${tl('Отклонить')}</button></div>
    </article>`;
  }).join('') + revHtml : revHtml || `<div class="empty">${tl('Очередь пуста — всё проверено.')}</div>`;
}
async function modReports2() {
  let rows = [];
  try { rows = await api('content_reports?status=eq.pending&order=created_at.asc&select=*'); } catch { return ''; }
  if (!rows.length) return '';
  const ids = t => [...new Set(rows.filter(r => r.target_type === t).map(r => r.target_id))];
  const [works, revs] = await Promise.all([
    ids('content').length ? api(`content?id=in.(${ids('content').join(',')})&select=id,title,short_code,status,submitted_by`).catch(() => []) : [],
    ids('review').length ? api(`reviews?id=in.(${ids('review').join(',')})&select=id,text,status,user_id`).catch(() => []) : [],
  ]);
  const wm = new Map(works.map(x => [String(x.id), x])), rm = new Map(revs.map(x => [String(x.id), x]));
  await loadProfiles([...rows.map(r => r.reporter_id), ...ids('user'), ...works.map(w => w.submitted_by), ...revs.map(v => v.user_id)]);
  const RN = Object.fromEntries(REPORT_REASONS);
  return rows.map(r => {
    const rep = S.profiles.get(r.reporter_id);
    let what = '', act = '';
    if (r.target_type === 'content') {
      const w = wm.get(r.target_id);
      what = w ? `${tl('Работа')} <a class="mod-post" href="${routeUrl('p/' + (w.short_code || w.id))}">«${esc(w.title || tl('без названия'))}»</a> ${tl('от')} <b>${esc(pname(S.profiles.get(w.submitted_by)))}</b>${w.status !== 'published' ? ` · ${esc(w.status)}` : ''}` : tl('Работа уже удалена');
      if (w && w.status === 'published') act = `<button class="btn accent" data-r2hide="${r.id}" data-t="content" data-tid="${esc(w.id)}">${tl('Скрыть работу')}</button>`;
    } else if (r.target_type === 'review') {
      const v = rm.get(r.target_id);
      what = v ? `${tl('Отзыв от')} <b>${esc(pname(S.profiles.get(v.user_id)))}</b>: «${esc((v.text || '').slice(0, 200))}»` : tl('Отзыв уже удалён');
      if (v && v.status === 'published') act = `<button class="btn accent" data-r2hide="${r.id}" data-t="review" data-tid="${esc(v.id)}">${tl('Скрыть отзыв')}</button>`;
    } else if (r.target_type === 'user') {
      const u = S.profiles.get(r.target_id);
      what = `${tl('Пользователь')} <a class="mod-post" href="${userPath(u || { id: r.target_id })}">${esc(pname(u))}</a>`;
    } else what = `${esc(TARGET_LBL[r.target_type] || r.target_type)} #${esc(r.target_id)}`;
    return `<article class="mod-card" data-r2="${r.id}">
      <div class="mod-top"><span class="role role-moderator">${esc(RN[r.reason] || r.reason)}</span><span>${tl('от')} <b>${esc(pname(rep))}</b> · ${when(r.created_at)}</span></div>
      <div class="mod-desc">${what}</div>
      ${r.details ? `<p class="mod-desc">«${esc(r.details)}»</p>` : ''}
      <div class="mod-acts">${act}<button class="btn" data-r2no="${r.id}">${act ? tl('Оставить') : tl('Закрыть жалобу')}</button></div>
    </article>`;
  }).join('');
}
page.addEventListener('click', async e => {
  const h = e.target.closest('[data-r2hide]'), n = e.target.closest('[data-r2no]');
  if (!h && !n) return;
  const card = (h || n).closest('.mod-card'), rid = (h || n).dataset[h ? 'r2hide' : 'r2no'];
  if (h && !confirm(tl('Скрыть с сайта?'))) return;
  $$('button', card).forEach(b => { b.disabled = true; });
  try {
    if (h) {
      const tbl = h.dataset.t === 'review' ? 'reviews' : 'content';
      const upd = await api(`${tbl}?id=eq.${h.dataset.tid}`, { method: 'PATCH', prefer: 'return=representation', body: { status: 'rejected', rejection_reason: 'Удалено модератором по жалобе' } });
      if (!upd?.length) throw new Error(tl('Не удалось скрыть (нет прав?)'));
      if (tbl === 'content') { await api('moderation_log', { method: 'POST', prefer: 'return=minimal', body: { content_id: h.dataset.tid, moderator_id: S.uid, action: 'rejected', comment: 'по жалобе' } }).catch(() => {}); dropFeedCache(); }
      await api(`content_reports?target_type=eq.${h.dataset.t}&target_id=eq.${h.dataset.tid}&status=eq.pending`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'resolved' } });
    } else await api(`content_reports?id=eq.${rid}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'dismissed' } });
    toast(h ? tl('Скрыто') : tl('Жалоба закрыта')); modDone(card);
  } catch (er) { toast(er.message, true); $$('button', card).forEach(b => { b.disabled = false; }); }
});
async function modReports() {
  const more = await modReports2();
  let rows;
  try { rows = await api('comment_reports?status=eq.pending&order=created_at.desc&select=id,reason,details,created_at,comment_id,reporter_id,comment:comments(id,body,author_id,content_id,created_at)'); }
  catch (e) { const b = $('#modList'); if (b) b.innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; return; }
  await loadProfiles(rows.flatMap(r => [r.reporter_id, r.comment?.author_id]));
  const ids = [...new Set(rows.map(r => r.comment?.content_id).filter(Boolean))];
  const posts = ids.length ? await api(`content?id=in.(${ids.join(',')})&select=id,title,short_code`).catch(() => []) : [];
  const pm = new Map(posts.map(p => [p.id, p]));
  const box = $('#modList'); if (!box || MOD.tab !== 'reports') return;
  const RN = Object.fromEntries(REPORT_REASONS);
  box.innerHTML = rows.length ? rows.map(r => {
    const c = r.comment, au = S.profiles.get(c?.author_id), rep = S.profiles.get(r.reporter_id), post = pm.get(c?.content_id);
    return `<article class="mod-card" data-rid="${r.id}">
      <div class="mod-top"><span class="role role-moderator">${esc(RN[r.reason] || r.reason)}</span><span>${tl('от')} <b data-user="${esc(rep?.username || r.reporter_id)}">${esc(pname(rep))}</b> · ${when(r.created_at)}</span></div>
      ${r.details ? `<p class="mod-desc">«${esc(r.details)}»</p>` : ''}
      ${c ? `<div class="cmt">${avaHtml(au?.avatar_url, pname(au))}<div class="cmt-main"><div class="cmt-head"><b data-user="${esc(au?.username || c.author_id)}">${esc(pname(au))}</b><span>${when(c.created_at)}</span></div><div class="cmt-body">${esc(c.body || '')}</div></div></div>
        ${post ? `<a class="mod-post" href="${routeUrl('p/' + (post.short_code || post.id))}">${tl('к посту «')}${esc(post.title || tl('без названия'))}»</a>` : ''}` : `<div class="mod-desc">${tl('Комментарий уже удалён.')}</div>`}
      <div class="mod-acts">${c ? `<button class="btn accent" data-rdel="${r.id}" data-cid="${c.id}">${tl('Удалить комментарий')}</button>` : ''}<button class="btn" data-rno="${r.id}">${c ? tl('Оставить') : tl('Закрыть жалобу')}</button></div>
    </article>`;
  }).join('') + more : more || `<div class="empty">${tl('Жалоб нет.')}</div>`;
}
function modDone(card) { card.classList.add('gone'); setTimeout(() => { card.remove(); if (!$('.mod-card')) (MOD.tab === 'queue' ? modQueue : modReports)(); }, 250); modCount(); }
function rejectDialog() {
  return new Promise(res => {
    const ov = document.createElement('div');
    ov.className = 'v2-overlay';
    ov.innerHTML = `<form class="v2-modal"><h2>${tl('Отклонить работу')}</h2><label>${tl('Причина (автор её увидит)')}<textarea name="r" rows="3" maxlength="500" placeholder="${tl('Например: нарушает правила, плохое качество, не по теме')}"></textarea></label><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Отклонить')}</button></div></form>`;
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
      if (!upd?.length) throw new Error(tl('Не удалось изменить работу (нет прав?)'));
      await api('moderation_log', { method: 'POST', prefer: 'return=minimal', body: { content_id: id, moderator_id: S.uid, action: ok ? 'approved' : 'rejected', ...(no ? { comment: reason } : {}) } }).catch(() => {});
      if (no) fetch(CDN_URL + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ contentId: id }) }).catch(() => {});
      if (ok) Object.keys(localStorage).filter(k => k.startsWith(LSC + 'feed:')).forEach(k => { MEM.delete(k.slice(LSC.length)); });
      toast(ok ? tl('Опубликовано') : tl('Отклонено'));
      modDone(card);
    } catch (er) { toast(er.message, true); $$('button', card).forEach(b => { b.disabled = false; }); }
    return;
  }
  const rvo = e.target.closest('[data-revok]'), rvn = e.target.closest('[data-revno]');
  if (rvo || rvn) {
    const id = (rvo || rvn).dataset[rvo ? 'revok' : 'revno'], card = (rvo || rvn).closest('.mod-card');
    let reason = null; if (rvn) { reason = await rejectDialog(); if (reason === undefined) return; }
    try {
      const r = await api(`reviews?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: rvo ? { status: 'published', published_at: new Date().toISOString() } : { status: 'rejected', rejection_reason: reason } });
      if (!r?.length) throw new Error(tl('Нет прав'));
      toast(rvo ? tl('Отзыв опубликован') : tl('Отзыв отклонён')); modDone(card);
    } catch (er) { toast(er.message, true); }
    return;
  }
  const rd = e.target.closest('[data-rdel]'), rn = e.target.closest('[data-rno]');
  if (rd || rn) {
    const card = (rd || rn).closest('.mod-card'), rid = (rd || rn).dataset[rd ? 'rdel' : 'rno'];
    if (rd && !confirm(tl('Удалить комментарий?'))) return;
    $$('button', card).forEach(b => { b.disabled = true; });
    try {
      if (rd) await api(`comments?id=eq.${rd.dataset.cid}`, { method: 'DELETE' });
      await api(`comment_reports?id=eq.${rid}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: rd ? 'resolved' : 'dismissed' } }).catch(er => { if (!rd) throw er; });
      toast(rd ? tl('Комментарий удалён') : tl('Жалоба закрыта'));
      modDone(card);
    } catch (er) { toast(er.message, true); $$('button', card).forEach(b => { b.disabled = false; }); }
  }
});

const VOICE_ROLES = ['gl_moder', 'admin', 'moderator', 'streamer', 'sponsor'];
const canVoice = () => !!S.me && VOICE_ROLES.some(r => hasRole(S.me, r)) && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
const VOICE_MAX = 120;
async function recordVoice(form, onSend) {
  if ($('.vrec', form)) return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast(tl('Нет доступа к микрофону'), true); }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported?.(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [];
  const bar = document.createElement('div');
  bar.className = 'vrec';
  bar.innerHTML = `<span class="vrec-dot"></span><b class="vrec-t">0:00</b><span class="vrec-lbl">${tl('Идёт запись…')}</span><button type="button" class="btn" data-vx>${tl('Отмена')}</button><button type="button" class="btn accent" data-vok>${tl('Отправить')}</button>`;
  form.append(bar);
  const t0 = Date.now();
  let send = false;
  const stop = ok => { send = ok; clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(x => x.stop()); };
  const tick = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); $('.vrec-t', bar).textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; if (sec >= VOICE_MAX) stop(true); }, 250);
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = async () => {
    if (!send || Date.now() - t0 < 400) { bar.remove(); return; }
    $('.vrec-lbl', bar).textContent = tl('Отправляем…'); $$('button', bar).forEach(b => { b.disabled = true; });
    try {
      const type = (rec.mimeType || 'audio/webm').split(';')[0];
      const file = new File(chunks, `voice.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type });
      const url = await uploadFile(file, p => { $('.vrec-lbl', bar).textContent = tl('Отправляем… {0}%', {0: p}); });
      await onSend(url);
      bar.remove();
    } catch (er) { toast(er.message, true); bar.remove(); }
  };
  bar.addEventListener('click', e => { if (e.target.closest('[data-vx]')) stop(false); if (e.target.closest('[data-vok]')) stop(true); });
  rec.start();
}

const NAME_COLORS = ['#ff4444', '#ff7043', '#ff9800', '#ffca28', '#66bb6a', '#26c6da', '#42a5f5', '#5c6bc0', '#ab47bc', '#ec407a', '#ff80ab', '#80deea', '#a5d6a7', '#fff176', '#ef9a9a', '#b0bec5', '#ffffff'];
const NAME_PAINTS = [
  ['#ff9966', '#ff66a3', 'Pastelween'], ['#9b30ff', '#ff1d6b', 'Impish Blush'], ['#ff7b29', '#ff2d2d', 'Hellfire'], ['#ffffff', '#16d2ff', 'Cyber Optics'],
  ['#3ef2a8', '#7dff5e', 'Elder Dragon'], ['#2ee6b8', '#4a6dff', 'Divided'], ['#ff8fe0', '#fff48f', 'Kawaii'], ['#3ef2a8', '#ffb3c6', 'Mint Cookie'],
  ['#d9d9d9', '#ff7a59', 'V-Tech'], ['#ffd9a0', '#ff5fcf', 'Shortcake'], ['#ff7b3d', '#ff2d00', 'NNYS 2025'], ['#ffb3b0', '#ff4d4d', 'Little Elf'],
  ['#d9d9d9', '#ffd700', 'Silver and Gold'], ['#cfe3ff', '#2e4cff', 'Black Ice'], ['#ffffff', '#ffc2c2', 'Health Pack'], ['#6ef2d9', '#a635ff', 'Opal Twilight'],
  ['#ffd23f', '#ff2d8a', 'Candy Hearts'], ['#ffc2d1', '#ff3d6e', "Valentine's Gifting 2026"], ['#ffffff', '#fff200', 'Electric'], ['#ffffff', '#c084fc', 'Moonberry'],
  ['#ffffff', '#ffd23f', 'Pixel Confetti'], ['#ff9eea', '#ffe28a', 'Pastellic'], ['#ffffff', '#5b9dff', 'Nano'], ['#5ec8ff', '#4ade80', 'Singularity'], ['#ffc2ec', '#c9a6ff', 'Easter Gifting 2026'],
].map(([a, b, l]) => ({ css: `linear-gradient(90deg,${a},${b},${a})`, label: l }))
  .concat([{ css: 'linear-gradient(90deg,#0057b7 50%,#ffd700 50%)', label: tl('Флаг Украины') }, { css: 'linear-gradient(180deg,#003c8a 18%,#0074c2 44%,#24ffff 57%,#f4fe6c 66%,#ffff00 100%)', label: 'Invisible' }]);
const hasRole = (p, r) => !!p && (p.role === r || (p.extra_roles || []).includes(r));
const canColor = p => !!p && (MOD_ROLES.some(r => hasRole(p, r)) || hasRole(p, 'streamer') || hasRole(p, 'sponsor'));
const okColor = c => /^#[0-9a-f]{3,8}$/i.test(c || '') || /^linear-gradient\([#0-9a-zA-Z,.%\s()-]{1,240}\)$/.test(c || '');
function nameAttr(c, fx) {
  if (fx && /^fx_[a-z0-9_]+$/i.test(fx)) return ` class="cfx cfx-${esc(fx)}"`;
  if (!okColor(c)) return '';
  if (c[0] === '#') return ` style="color:${c}"`;
  const anim = /^linear-gradient\(90deg,(#\w+),#\w+,\1\)$/.test(c);
  return ` class="nm-paint${anim ? ' anim' : ''}" style="background-image:${c}"`;
}

const PZ_GRID = { easy: 4, x2: 6, x3: 7, x4: 8 };
const PZ_NAMES = { easy: tl('Лёгкий'), x2: '×2', x3: '×3', x4: '×4' };
const puzzleOn = () => { try { return localStorage.getItem('v2_puzzle') !== '0'; } catch { return true; } };
function startPuzzle(pmEl, item, setting) {
  const img = $('img', item); if (!img) { pmEl.classList.remove('blur'); return; }
  const url = img.currentSrc || img.src;
  let level = setting === 'choice' ? 'easy' : (PZ_GRID[setting] ? setting : 'easy');
  const over = document.createElement('div');
  over.className = 'pz-over';
  item.append(over);
  const place = () => {
    const r = img.getBoundingClientRect(), p = item.getBoundingClientRect();
    Object.assign(over.style, { left: r.left - p.left + 'px', top: r.top - p.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  let perm = [], sel = -1, moves = 0;
  const build = () => {
    const n = PZ_GRID[level], N = n * n;
    do { perm = [...Array(N).keys()].sort(() => Math.random() - .5); } while (perm.every((v, i) => v === i));
    sel = -1; moves = 0; draw();
  };
  const draw = () => {
    const n = PZ_GRID[level];
    over.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    over.innerHTML = perm.map((v, i) => `<button type="button" class="pz-tile${i === sel ? ' sel' : ''}${v === i ? ' ok' : ''}" data-pz="${i}" style="background-image:url('${esc(url)}');background-size:${n * 100}% ${n * 100}%;background-position:${(v % n) / (n - 1) * 100}% ${Math.floor(v / n) / (n - 1) * 100}%"></button>`).join('')
      + `<div class="pz-bar">${setting === 'choice' ? Object.keys(PZ_GRID).map(k => `<button type="button" class="chip${k === level ? ' on' : ''}" data-pzl="${k}">${PZ_NAMES[k]}</button>`).join('') : ''}<span>${tl('Ходов:')} ${moves}</span><button type="button" class="chip" data-pzskip>${tl('Показать сразу')}</button></div>`;
  };
  const done = () => { over.classList.add('solved'); setTimeout(() => { over.remove(); pmEl.classList.remove('blur'); }, 450); };
  over.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (e.target.closest('[data-pzskip]')) return done();
    const lv = e.target.closest('[data-pzl]'); if (lv) { level = lv.dataset.pzl; return build(); }
    const t = e.target.closest('[data-pz]'); if (!t) return;
    const i = +t.dataset.pz;
    if (sel < 0) { sel = i; return draw(); }
    if (sel !== i) { [perm[sel], perm[i]] = [perm[i], perm[sel]]; moves++; }
    sel = -1; draw();
    if (perm.every((v, k) => v === k)) { toast(tl('Пазл собран за {0} ход(ов)!', {0: moves})); done(); }
  });
  place(); build();
  addEventListener('resize', place);
  if (!img.complete) img.addEventListener('load', place, { once: true });
}

function postMenuHtml(it) {
  return S.uid && (S.uid === it.submitted_by || isMod()) ? `<div class="pmenu-wrap"><button class="btn" id="postMenuBtn" title="${tl('Управление')}" aria-label="${tl('Управление постом')}"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button><div class="pmenu" hidden><button type="button" data-pedit>${tl('Редактировать')}</button><button type="button" data-pdel class="danger">${tl('Удалить')}</button></div></div>` : '';
}
function wirePostMenu(root, it) {
  const pmb = root.querySelector('#postMenuBtn'); if (!pmb) return;
  const menu = pmb.nextElementSibling;
  pmb.onclick = ev => { ev.stopPropagation(); menu.hidden = !menu.hidden; };
  menu.onclick = ev => {
    ev.stopPropagation(); menu.hidden = true;
    if (ev.target.closest('[data-pedit]')) editPost(it);
    if (ev.target.closest('[data-pdel]')) deletePost(it);
  };
}
function postMenuLate() {
  const c = S.curPost; if (!c || !c.root.isConnected || c.root.querySelector('#postMenuBtn')) return;
  const acts = c.root.querySelector('.post-actions'); if (!acts) return;
  acts.insertAdjacentHTML('beforeend', postMenuHtml(c.it)); wirePostMenu(c.root, c.it);
}
document.addEventListener('click', e => { if (!e.target.closest('.pmenu-wrap')) $$('.pmenu').forEach(m => { m.hidden = true; }); });
function dropFeedCache() { [...MEM.keys()].filter(k => k.startsWith('feed:')).forEach(k => MEM.delete(k)); try { Object.keys(localStorage).filter(k => k.startsWith(LSC + 'feed:')).forEach(k => localStorage.removeItem(k)); } catch {} }
async function editPost(it) {
  try { const [full] = await api(`content?id=eq.${it.id}&select=*`); if (full) Object.assign(it, full); } catch (er) { return toast(er.message, true); }
  const T = it.content_type;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal pedit"><h2>${tl('Редактировать работу')}</h2>
    <label>${tl('Название')}<input name="t" maxlength="120" value="${esc(it.title || '')}" required></label>
    ${T !== 'art' ? `<label>${T === 'fanfic' ? tl('Краткое описание') : tl('Описание')}<textarea name="d" rows="3" maxlength="600">${esc(it.description || '')}</textarea></label>` : ''}
    ${T === 'fanfic' ? `<label>${tl('Фэндом')}<input name="fa" maxlength="80" value="${esc(it.fandom || '')}"></label><label>${tl('Пейринг')}<input name="pa" maxlength="80" value="${esc(it.pairing || '')}"></label>` : ''}
    <div class="pe-color"><span>${tl('Теги')}</span><div class="chips" data-etags>${[...new Set([...ALL_TAGS, ...(it.tags || [])])].map(t => `<button type="button" class="chip${(it.tags || []).includes(t) ? ' on' : ''}" data-etag="${esc(t)}">#${esc(tagName(t))}</button>`).join('')}</div></div>
    ${T === 'art' ? `<label class="sw"><input type="checkbox" name="bl"${it.is_blurred ? ' checked' : ''}><i></i><div><b>${tl('Спойлер / пазл')}</b><span>${tl('Картинка в ленте будет размытой')}</span></div></label>
      <label class="pz"${it.is_blurred ? '' : ' hidden'}>${tl('Сложность пазла')}<select name="pz">${[['none', tl('Без пазла — просто размытие')], ['easy', tl('Лёгкий')], ['x2', tl('Сложный (×2)')], ['x3', tl('Сложный (×3)')], ['x4', tl('Очень сложный (×4)')], ['choice', tl('На выбор зрителя')]].map(([v, n]) => `<option value="${v}"${(it.puzzle_difficulty || 'easy') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
    ${T === 'fanfic' ? `<label class="sw"><input type="checkbox" name="r18"${it.age_rating === '18+' ? ' checked' : ''}><i></i><div><b>18+</b><span>${tl('Иначе рейтинг PG-13')}</span></div></label>` : ''}
    <p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div></form>`;
  const f = $('form', ov);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); });
  if (f.bl) f.bl.onchange = () => { $('.pz', f).hidden = !f.bl.checked; };
  $('[data-etags]', f).onclick = e => { const b = e.target.closest('[data-etag]'); if (b) b.classList.toggle('on'); };
  f.onsubmit = async e => {
    e.preventDefault();
    const hint = $('.hint', f), btn = $('button[type=submit]', f);
    const patch = { title: f.t.value.trim(), tags: $$('[data-etag].on', f).map(b => b.dataset.etag) };
    if (!patch.title) { hint.textContent = tl('Добавьте название'); return; }
    if (f.d) patch.description = f.d.value.trim() || null;
    if (f.fa) { patch.fandom = f.fa.value.trim() || null; patch.pairing = f.pa.value.trim() || null; patch.age_rating = f.r18.checked ? '18+' : 'pg13'; }
    if (f.bl) { patch.is_blurred = f.bl.checked; patch.puzzle_difficulty = f.bl.checked ? f.pz.value : 'easy'; }
    btn.disabled = true;
    try {
      const r = await api(`content?id=eq.${it.id}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
      if (!r?.length) throw new Error(tl('Нет прав на изменение'));
      Object.assign(it, patch); dropFeedCache();
      ov.remove(); toast(tl('Сохранено'));
      LB.open ? lbRender(LB.key) : viewPost(it.short_code || it.id);
    } catch (er) { hint.textContent = tl('Ошибка: ') + er.message; btn.disabled = false; }
  };
  document.body.append(ov);
}
async function deletePost(it) {
  const own = it.submitted_by === S.uid;
  if (!confirm(own ? tl('Удалить вашу работу? Это нельзя отменить.') : `${tl('Удалить работу «')}${it.title || tl('без названия')}${tl('» как модератор? Это нельзя отменить.')}`)) return;
  try {
    await fetch(CDN_URL + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ contentId: it.id }) }).catch(() => {});
    await api(`content?id=eq.${it.id}`, { method: 'DELETE' });
    S.items.delete(it.id); if (it.short_code) S.items.delete(it.short_code);
    dropFeedCache(); toast(tl('Работа удалена'));
    if (LB.open) closeLightbox();
    $$(`[data-open="${CSS.escape(it.short_code || it.id)}"]`).forEach(c => c.remove());
    if (!LB.open && curRoute().startsWith('p/')) go('');
  } catch (er) { toast(er.message, true); }
}

const NOTIF_OPTS = [['notify_likes', tl('Лайки на моих работах')], ['notify_comments', tl('Комментарии к моим работам')], ['notify_new_followers', tl('Новые подписчики')]];
const langCard = () => window.I18N ? `<section class="rules-card sets-card" id="setLang"><h2>${tl('Язык сайта')}</h2>
      <div class="chips">${Object.entries(I18N.short).map(([k, n]) => `<button type="button" class="chip${I18N.lang() === k ? ' on' : ''}" data-setlang="${k}" title="${esc(I18N.langs[k])}">${esc(n)}</button>`).join('')}</div></section>` : '';
function viewSettings() {
  setNav('settings');
  if (!S.uid) { page.innerHTML = `<div class="sets"><div class="page-head"><h1>${tl('Настройки')}</h1></div>${langCard()}${window.PWA ? PWA.card(tl, 'renah0cki') : ''}<div class="empty">${tl('Войдите, чтобы открыть остальные настройки.')}<br><br><button class="btn accent" data-login>${tl('Войти')}</button></div></div>`; if (window.PWA) PWA.bind(page, tl, 'renah0cki'); return; }
  if (!S.me) { page.innerHTML = `<div class="empty">${tl('Загрузка…')}</div>`; loadMe().then(() => { if (curRoute().startsWith('settings')) viewSettings(); }); return; }
  const me = S.me, sw = (name, title, sub, on) => `<label class="sw"><input type="checkbox" name="${name}"${on ? ' checked' : ''}><i></i><div><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div></label>`;
  const opts = [...NOTIF_OPTS, ...(isMod() ? [['notify_new_submission', tl('Новые работы на проверку (модераторам)')]] : [])];
  page.innerHTML = `<div class="sets">
    <div class="page-head"><h1>${tl('Настройки')}</h1></div>
    ${langCard()}
    ${window.PWA ? PWA.card(tl, 'renah0cki') : ''}
    <section class="rules-card sets-card"><h2>${tl('Просмотр')}</h2>
      ${sw('puzzle', tl('Пазлы на спойлерах'), tl('Размытый арт собирается из кусочков. Выключено — открывается сразу по клику.'), puzzleOn())}</section>
    ${me.username ? `<section class="rules-card sets-card" id="setDonate"><h2>${tl('Донаты пузокоинами')}</h2>
      ${sw('coin_donate', tl('Кнопка «Донат пузокоинами» в профиле'), tl('Показывать кнопку доната в профиле и принимать переводы по личной ссылке.'), false)}
      <div class="wal-code" id="setDnRow" hidden style="margin-top:10px"><span>${esc(location.origin + '/donate/' + encodeURIComponent(me.username))}</span><button class="btn" type="button" id="setDnCopy">${tl('Скопировать')}</button></div></section>` : ''}
    <section class="rules-card sets-card" id="setRoles"><h2>${tl('Отображение ролей')}</h2>
      <p class="muted">${tl('Выбери, какие роли показывать в профиле. Должна быть включена минимум 1 роль.')}</p>
      <div id="setRolesList" class="sets-roles"></div></section>
    <section class="rules-card sets-card" id="setNotif"><h2>${tl('Уведомления')}</h2>
      <p class="muted">${tl('Сами события происходят, просто не будут показываться в колокольчике.')}</p>
      ${opts.map(([k, t]) => sw(k, t, '', me[k] !== false)).join('')}</section>
    <section class="rules-card sets-card"><h2>Telegram</h2>
      <p>${tl('Бот')} <a href="https://t.me/renah0ckibot" target="_blank" rel="noopener">@renah0ckibot</a> ${tl('присылает уведомления модераторам и открывает Y прямо в Telegram.')}</p>
      <ol class="sets-steps"><li>${tl('Откройте бота и нажмите')} <b>/start</b>.</li><li>${tl('Бот пришлёт ссылку — откройте её в этом браузере, где вы вошли на сайт.')}</li><li>${tl('Готово: бот сам подтвердит привязку.')}</li></ol>
      <a class="btn accent" href="https://t.me/renah0ckibot" target="_blank" rel="noopener">${tl('Открыть бота')}</a></section>
    <section class="rules-card sets-card"><h2>${tl('Аккаунт')}</h2><div class="sets-acts"><button class="btn" type="button" data-editprof>${tl('Редактировать профиль')}</button><a class="btn" href="${routeUrl('rules')}">${tl('Правила')}</a><a class="btn" href="${routeUrl('privacy')}">${tl('Конфиденциальность')}</a><button class="btn danger" type="button" data-logout>${tl('Выйти')}</button></div></section>
    ${S.uid !== OWNER_ID ? `<section class="rules-card sets-card sets-danger"><h2>${tl('Удаление аккаунта')}</h2>
      <p class="muted">${tl('Аккаунт и все ваши данные будут удалены навсегда: работы, сборники, комментарии, отзывы, персонажи и посты в Y, пузокоины и покупки. Отменить это нельзя.')}</p>
      <button class="btn danger" type="button" data-accdel>${tl('Удалить аккаунт')}</button></section>` : ''}
  </div>`;
  page.querySelector('[name=puzzle]').onchange = e => { try { localStorage.setItem('v2_puzzle', e.target.checked ? '1' : '0'); } catch {} toast(e.target.checked ? tl('Пазлы включены') : tl('Пазлы выключены')); };
  if (me.username) {
    const dnIn = page.querySelector('[name=coin_donate]'), dnRow = $('#setDnRow'), dnCopy = $('#setDnCopy');
    rpc('coin_donate_target', { p_username: me.username }).then(t => {
      const on = t?.coin_donate_enabled === true;
      if (dnIn) dnIn.checked = on;
      if (dnRow) dnRow.hidden = !on;
    }).catch(() => {});
    if (dnIn) dnIn.onchange = async e => {
      const v = e.target.checked; e.target.disabled = true;
      try {
        await rpc('coin_donate_toggle', { p_enabled: v });
        if (dnRow) dnRow.hidden = !v;
        toast(v ? tl('Кнопка доната включена в профиле') : tl('Кнопка доната скрыта'));
      } catch (er) { e.target.checked = !v; toast(er.message, true); }
      e.target.disabled = false;
    };
    if (dnCopy) dnCopy.onclick = () => navigator.clipboard.writeText(`${location.origin}/donate/${encodeURIComponent(me.username)}`).then(() => toast(tl('Ссылка скопирована')), () => {});
  }
  const drawRolesSet = () => {
    const box = $('#setRolesList'); if (!box) return;
    const eq = eqOf(me) || {};
    const all = allUserRoles(me, eq);
    const hid = new Set(eq.hidden_roles || []);
    const tempById = new Map(activeTempRoles(eq).map(t => [t.gid, t]));
    const visCnt = all.filter(r => !hid.has(r) || isTempRoleLocked(tempById.get(r))).length;
    box.innerHTML = all.map(r => {
      const tr = tempById.get(r);
      const locked = isTempRoleLocked(tr);
      const on = locked || !hid.has(r) || (visCnt === 0 && r === all[0]);
      const meta = tr
        ? `<span class="set-role-meta">${locked ? tl('🔒 Подарок (нельзя убрать ещё {0}) · ', {0: esc(leftDaysText(tr.locked_until))}) : '⏳ '}${tl('осталось')} ${esc(leftDaysText(tr.expires_at))}</span>`
        : '';
      return `<div class="set-role-row">
        <label class="sw"><input type="checkbox" data-roletog="${esc(r)}"${on ? ' checked' : ''}><i></i><div>${roleChipHtml(r, eq)}${meta}</div></label>
        ${r === 'role_custom' ? `<button type="button" class="btn" data-editcs style="height:30px;padding:0 10px;font-size:12.5px">${tl('Настроить')}</button>` : SHOP_ROLES[r]?.customColor ? `<button type="button" class="btn" data-editbrand="${esc(r)}" style="height:30px;padding:0 10px;font-size:12.5px">${tl('Цвет')}</button>` : ''}
      </div>`;
    }).join('');
    box.onchange = async e => {
      const inp = e.target.closest('[data-roletog]'); if (!inp) return;
      const r = inp.dataset.roletog;
      const curEq = eqOf(me) || {};
      const tr = activeTempRoles(curEq).find(x => x.gid === r);
      if (isTempRoleLocked(tr)) {
        inp.checked = true;
        return toast(tl('Подаренную роль нельзя убрать в первую неделю (ещё {0})', {0: leftDaysText(tr.locked_until)}), true);
      }
      const nextHid = new Set(curEq.hidden_roles || []);
      if (inp.checked) nextHid.delete(r); else nextHid.add(r);
      const left = all.filter(x => !nextHid.has(x) || isTempRoleLocked(activeTempRoles(curEq).find(t => t.gid === x))).length;
      if (left < 1) {
        inp.checked = true;
        return toast(tl('Нужна минимум 1 отображаемая роль'), true);
      }
      inp.disabled = true;
      try {
        const row = await rpc('shop_set_hidden_roles', { p_hidden: [...nextHid] });
        saveEqRow(row);
        toast(tl('Сохранено'));
      } catch (er) { inp.checked = !inp.checked; toast(er.message, true); }
      inp.disabled = false;
    };
    box.onclick = e => {
      if (e.target.closest('[data-editcs]')) customStatusDialog(() => drawRolesSet());
      else {
        const eb = e.target.closest('[data-editbrand]');
        if (eb) brandColorDialog(eb.dataset.editbrand, () => drawRolesSet());
      }
    };
  };
  eqReady.then(drawRolesSet);
  drawRolesSet();
  $('#setNotif').onchange = async e => {
    const k = e.target.name; if (!k) return;
    const v = e.target.checked; e.target.disabled = true;
    try { await api(`profiles?id=eq.${S.uid}`, { method: 'PATCH', prefer: 'return=minimal', body: { [k]: v } }); me[k] = v; NOTIF.loaded = false; loadNotifs().catch(() => {}); toast(tl('Сохранено')); }
    catch (er) { e.target.checked = !v; toast(er.message, true); }
    e.target.disabled = false;
  };
  page.querySelector('[data-editprof]').onclick = editProfile;
  page.querySelector('[data-logout]').onclick = logout;
  const ad = page.querySelector('[data-accdel]'); if (ad) ad.onclick = accountDeleteDialog;
  if (window.PWA) PWA.bind(page, tl, 'renah0cki');
}
function accountDeleteDialog() {
  const nick = S.me?.username || '';
  if (!nick) return toast(tl('Сначала задайте ник в профиле'), true);
  const WAIT = 10;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal accdel-mod"><h2>${tl('Удалить аккаунт навсегда?')}</h2>
    <p>${tl('Будут удалены без возможности восстановления:')}</p>
    <ul class="accdel-list"><li>${tl('профиль, аватарка и роли')}</li><li>${tl('ваши работы, сборники, комментарии и отзывы')}</li><li>${tl('персонажи, посты и сообщения в Y')}</li><li>${tl('пузокоины на балансе и все покупки в магазине')}</li></ul>
    <label>${tl('Чтобы подтвердить, введите свой ник:')} <b>@${esc(nick)}</b><input name="n" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(nick)}"></label>
    <label class="accdel-chk"><input type="checkbox" name="ok"><span>${tl('Я понимаю, что аккаунт нельзя будет вернуть')}</span></label>
    <p class="hint accdel-err" hidden></p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn danger" type="submit" disabled data-go>${tl('Удалить аккаунт')}</button></div></form>`;
  document.body.append(ov);
  const f = $('form', ov), go = $('[data-go]', ov), inp = $('[name=n]', ov), chk = $('[name=ok]', ov), err = $('.accdel-err', ov);
  let left = WAIT, timer = null, busy = false;
  const ready = () => inp.value.trim().replace(/^@/, '').toLowerCase() === nick.toLowerCase() && chk.checked;
  const draw = () => {
    const r = ready();
    if (r && !timer && left > 0) timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); timer = null; } draw(); }, 1000);
    if (!r) { clearInterval(timer); timer = null; left = WAIT; }
    go.disabled = busy || !r || left > 0;
    go.textContent = busy ? tl('Удаляю…') : r && left > 0 ? tl('Удалить аккаунт ({0})', { 0: left }) : tl('Удалить аккаунт');
  };
  const close = () => { clearInterval(timer); ov.remove(); };
  inp.addEventListener('input', draw); chk.addEventListener('change', draw);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) { if (!busy) close(); } });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!ready() || left > 0 || busy) return;
    busy = true; err.hidden = true; draw();
    try {
      const r = await fetch(CDN_URL + '/account-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ nick: inp.value.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      try { localStorage.removeItem(LS_SESSION); } catch {}
      ov.querySelector('form').innerHTML = `<h2>${tl('Аккаунт удалён')}</h2><p>${tl('Все ваши данные удалены. Спасибо, что были с нами.')}</p>`;
      setTimeout(() => { location.href = BASE; }, 2500);
    } catch (er) { busy = false; err.textContent = er.message; err.hidden = false; draw(); }
  });
  inp.focus();
}
(async () => {
  const t = new URLSearchParams(location.search).get('tglink');
  if (!t || !/^[0-9a-f]{32}$/.test(t)) return;
  history.replaceState(null, '', location.pathname);
  if (!S.uid) { try { localStorage.setItem('fh_tglink', t); } catch {} toast(tl('Войдите, чтобы привязать Telegram')); return; }
  try { const ok = await rpc('claim_tg_link', { p_token: t }); toast(ok ? tl('Готово! Вернитесь в Telegram-бота — он подключит вас за пару секунд.') : tl('Ссылка из бота устарела. Нажмите /start в боте ещё раз.'), !ok); }
  catch (er) { toast(er.message, true); }
})();

const COLL_SEL = `id,title,description,short_code,cover_url,cover_type,item_count,views,likes,comments_count,published_at,created_at,submitted_by,author:profiles!collections_submitted_by_fkey(id,username,display_name,avatar_url,name_color,role,extra_roles)`;
const COLL = new Map();
function collCard(c) {
  const a = c.author || S.profiles.get(c.submitted_by);
  const cover = c.cover_url ? (c.cover_type === 'video' ? `<video data-lazy="${esc(c.cover_url)}#t=0.5" preload="none" muted playsinline tabindex="-1"></video>` : imgTag(c.cover_url, 480)) : '<div class="news-ph">🗂️</div>';
  return `<article class="card" data-coll="${esc(c.short_code || c.id)}">
    <div class="card-media">${cover}<span class="badge type">🗂️ ${fmt(c.item_count || 0)}</span></div>
    <div class="card-body">
      <div class="card-author" data-user="${esc(a?.username || c.submitted_by)}">${cosAva(a)}${cosName(a)}</div>
      <h3 class="card-title">${esc(c.title || tl('Сборник'))}</h3>
      ${c.description ? `<p class="card-desc">${esc(c.description)}</p>` : ''}
      <div class="card-stats"><span>${I.views}${fmt(c.views)}</span><span>${I.heart}${fmt(c.likes)}</span><span>${I.comment}${fmt(c.comments_count)}</span><time>${when(c.published_at || c.created_at)}</time></div>
    </div></article>`;
}
async function viewCollections() {
  setNav('collections');
  page.innerHTML = `<div class="page-head"><h1>${tl('Сборники')}</h1>${isMod() ? `<a class="btn accent" href="${routeUrl('new/collection')}">${tl('Новый сборник')}</a>` : ''}</div><div class="grid grid-big" id="collGrid">${'<div class="skel"></div>'.repeat(6)}</div>`;
  try {
    await swr('colls', () => api(`collections?status=eq.published&select=${COLL_SEL}&order=published_at.desc.nullslast,created_at.desc&limit=60`), rows => {
      rows.forEach(c => { COLL.set(c.id, c); if (c.short_code) COLL.set(c.short_code, c); });
      const g = $('#collGrid'); if (!g) return;
      g.outerHTML = rows.length ? `<div class="grid grid-big" id="collGrid">${rows.map(collCard).join('')}</div>` : `<div class="empty" id="collGrid">${tl('Сборников пока нет.')}</div>`;
      const ng = $('#collGrid'); if (ng?.classList.contains('grid')) { wireLazy(ng); animateCards(ng); }
    });
  } catch (e) { const g = $('#collGrid'); if (g) g.outerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; }
}
async function viewCollection(key) {
  setNav('collections');
  page.innerHTML = `<div class="post"><div class="skel" style="aspect-ratio:16/7"></div></div>`;
  let c = COLL.get(key);
  if (!c) {
    const f = /^[0-9a-f-]{36}$/i.test(key) ? `id=eq.${key}` : `short_code=eq.${encodeURIComponent(key)}`;
    try { [c] = await api(`collections?${f}&select=${COLL_SEL}`); } catch {}
  }
  if (!c) { page.innerHTML = `<div class="empty">${tl('Сборник не найден')}</div>`; return; }
  const [items, liked] = await Promise.all([
    api(`collection_items?collection_id=eq.${c.id}&order=position.asc&select=media_type,media_url`).catch(() => []),
    S.uid ? api(`collection_likes?collection_id=eq.${c.id}&user_id=eq.${S.uid}&select=collection_id`).then(r => !!r.length).catch(() => false) : false,
  ]);
  try { if (!sessionStorage.getItem('cv_' + c.id)) { sessionStorage.setItem('cv_' + c.id, '1'); rpc('increment_collection_views', { collection_id: c.id }).catch(() => {}); } } catch {}
  const a = c.author || S.profiles.get(c.submitted_by), own = S.uid === c.submitted_by;
  const imgs = items.filter(x => x.media_type !== 'video' && isOwnFile(x.media_url)).map(x => x.media_url);
  page.innerHTML = `<div class="post coll-page">
    <button class="back" data-back>${I.back} ${tl('Назад')}</button>
    <h1>${esc(c.title || tl('Сборник'))}</h1>
    <div class="post-head">${cosAva(a)}<div><div class="post-author-row"><b data-user="${esc(a?.username || c.submitted_by)}" style="cursor:pointer">${cosName(a)}</b>${inlineRolesHtml(a, c.submitted_by)}</div><div class="sub">${when(c.published_at || c.created_at)} · ${fmt(items.length)} ${tl('файлов ·')} ${fmt(c.views)} ${tl('просмотров')}</div></div>
      <div class="post-actions"><button class="btn like-btn${liked ? ' liked' : ''}" id="collLike">${I.heart}<span>${fmt(c.likes)}</span></button>
      ${S.uid && (own || isMod()) ? `<button class="btn" id="collEdit">${tl('Изменить')}</button><button class="btn danger" id="collDel">${tl('Удалить')}</button>` : ''}</div></div>
    ${c.description ? `<p class="post-desc">${esc(c.description)}</p>` : ''}
    <div class="coll-items">${items.map(x => x.media_type === 'video'
      ? `<div class="coll-item"><video src="${esc(x.media_url)}" controls playsinline preload="metadata"></video></div>`
      : `<a class="coll-item" href="${esc(x.media_url)}" data-czoom="${imgs.indexOf(x.media_url)}">${imgTag(x.media_url, 720)}</a>`).join('')}</div>
    <section class="comments" id="comments"><h3>${tl('Комментарии')}</h3><div class="empty" style="padding:20px">${tl('Загрузка…')}</div></section>
  </div>`;
  $('.coll-items').onclick = e => { const z = e.target.closest('[data-czoom]'); if (z) { e.preventDefault(); openViewer(imgs, +z.dataset.czoom); } };
  $('#collLike').onclick = async ev => {
    if (!S.uid) return login();
    const b = ev.currentTarget; b.disabled = true;
    try { const on = await rpc('toggle_collection_like', { p_collection_id: c.id }); c.likes = Math.max(0, (c.likes || 0) + (on ? 1 : -1)); b.classList.toggle('liked', !!on); $('span', b).textContent = fmt(c.likes); }
    catch (er) { toast(er.message, true); }
    b.disabled = false;
  };
  const ed = $('#collEdit');
  if (ed) ed.onclick = () => {
    const ov = document.createElement('div'); ov.className = 'v2-overlay';
    ov.innerHTML = `<form class="v2-modal"><h2>${tl('Изменить сборник')}</h2><label>${tl('Название')}<input name="t" maxlength="120" value="${esc(c.title || '')}" required></label><label>${tl('Описание')}<textarea name="d" rows="3" maxlength="600">${esc(c.description || '')}</textarea></label><p class="hint"></p><div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Сохранить')}</button></div></form>`;
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); });
    $('form', ov).onsubmit = async e => {
      e.preventDefault(); const f = e.target, patch = { title: f.t.value.trim(), description: f.d.value.trim() || null };
      try { const r = await api(`collections?id=eq.${c.id}`, { method: 'PATCH', prefer: 'return=representation', body: patch }); if (!r?.length) throw new Error(tl('Нет прав')); Object.assign(c, patch); MEM.delete('colls'); ov.remove(); toast(tl('Сохранено')); viewCollection(key); }
      catch (er) { $('.hint', f).textContent = tl('Ошибка: ') + er.message; }
    };
    document.body.append(ov);
  };
  const dl = $('#collDel');
  if (dl) dl.onclick = async () => {
    if (!confirm(tl('Удалить сборник? Это нельзя отменить.'))) return;
    try {
      await fetch(CDN_URL + '/user-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ collectionId: c.id }) }).catch(() => {});
      await api(`collections?id=eq.${c.id}`, { method: 'DELETE' });
      COLL.delete(c.id); COLL.delete(c.short_code); MEM.delete('colls'); try { localStorage.removeItem(LSC + 'colls'); } catch {}
      toast(tl('Сборник удалён')); go('collections');
    } catch (er) { toast(er.message, true); }
  };
  loadComments(c.id, 'collection');
}
page.addEventListener('click', e => { const c = e.target.closest('[data-coll]'); if (c && !e.target.closest('[data-user]')) go('c/' + c.dataset.coll); });
function viewNewCollection() {
  setNav('');
  if (!isMod()) { page.innerHTML = `<div class="empty">${tl('Сборники создают модераторы.')}</div>`; return; }
  const files = [];
  page.innerHTML = `<div class="up"><div class="page-head"><h1>${tl('Новый сборник')}</h1></div>
    <div class="up-tabs"><a class="up-tab" href="${routeUrl('new/art')}">${tl('Арт')}</a><a class="up-tab" href="${routeUrl('new/video')}">${tl('Видео')}</a><a class="up-tab" href="${routeUrl('new/fanfic')}">${tl('Фанфик')}</a><a class="up-tab on" href="${routeUrl('new/collection')}">${tl('Сборник')}</a></div>
    <form class="up-form" id="cForm" novalidate>
      <label class="fld"><span>${tl('Название')}</span><input name="title" maxlength="120" placeholder="${tl('Название сборника')}" required></label>
      <label class="fld"><span>${tl('Описание (необязательно)')}</span><textarea name="desc" rows="2" maxlength="600"></textarea></label>
      <label class="drop" id="cDrop"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.avif,video/mp4,video/webm,video/quicktime" multiple hidden>
        <div class="drop-empty"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg><b>${tl('Перетащите файлы сюда')}</b><span>${tl('картинки и видео (до 30 МБ), сразу несколько')}</span></div></label>
      <div class="c-files" id="cFiles"></div>
      <p class="muted" style="margin:0;font-size:13px">${tl('Сборник модератора публикуется сразу, без проверки.')}</p>
      <div class="up-foot"><div class="up-status" id="cStatus"></div><div class="up-bar" hidden><i id="cBar"></i></div><button class="btn accent up-send" type="submit">${tl('Опубликовать')}</button></div>
    </form></div>`;
  const z = $('#cDrop'), inp = $('input', z), list = $('#cFiles');
  const draw = () => { list.innerHTML = files.map((f, i) => `<div class="c-file">${/^video/.test(f.type) ? `<video src="${f._u}" muted></video>` : `<img src="${f._u}" alt="">`}<button type="button" class="drop-x" data-crm="${i}" aria-label="${tl('Убрать')}">✕</button></div>`).join(''); };
  const add = fl => { [...fl].forEach(f => { if (!/^(image|video)\//.test(f.type)) return; if (/^video/.test(f.type) && f.size > 30 * 1048576) return toast(tl('{0}: больше 30 МБ', {0: f.name}), true); f._u = URL.createObjectURL(f); files.push(f); }); draw(); };
  inp.onchange = () => { add(inp.files); inp.value = ''; };
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); add(e.dataTransfer.files); });
  list.onclick = e => { const x = e.target.closest('[data-crm]'); if (x) { files.splice(+x.dataset.crm, 1); draw(); } };
  $('#cForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, st = $('#cStatus'), bar = $('.up-bar', f), btn = $('.up-send', f);
    const say = (t, err) => { st.textContent = t; st.classList.toggle('err', !!err); };
    const title = f.title.value.trim();
    if (!title) return say(tl('Добавьте название'), true);
    if (!files.length) return say(tl('Добавьте хотя бы один файл'), true);
    btn.disabled = true;
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        urls.push(await uploadFile(files[i], p => { bar.hidden = false; $('#cBar').style.width = Math.round((i + p / 100) / files.length * 100) + '%'; say(tl('Файл {0} из {1}: {2}%', {0: i + 1, 1: files.length, 2: p})); }));
      }
      say(tl('Сохраняем…'));
      const [c] = await api('collections', { method: 'POST', prefer: 'return=representation', body: { title, description: f.desc.value.trim() || null, status: 'published', published_at: new Date().toISOString(), submitted_by: S.uid } });
      const items = urls.map((u, i) => ({ collection_id: c.id, position: i, media_type: /^video/.test(files[i].type) ? 'video' : 'image', media_url: u }));
      await api('collection_items', { method: 'POST', prefer: 'return=minimal', body: items });
      await api(`collections?id=eq.${c.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { cover_url: items[0].media_url, cover_type: items[0].media_type, item_count: items.length } });
      MEM.delete('colls'); toast(tl('Сборник опубликован'));
      go('c/' + (c.short_code || c.id));
    } catch (er) { say(tl('Ошибка: ') + er.message, true); btn.disabled = false; }
  };
}

const NE_TOOLS = [
  ['b', tl('Жирный'), '**', '**'], ['i', tl('Курсив'), '*', '*'], ['u', tl('Подчёркнутый'), '__', '__'], ['s', tl('Зачёркнутый'), '~~', '~~'],
  ['sp', tl('Спойлер'), '||', '||'], ['h', tl('Заголовок'), '## ', ''], ['q', tl('Цитата'), '> ', ''], ['li', tl('Список'), '- ', ''], ['ln', tl('Ссылка'), '[', '](https://)'], ['hr', tl('Линия'), '\n---\n', ''],
];
const NE_ICON = { b: '<b>B</b>', i: '<i>I</i>', u: '<u>U</u>', s: '<s>S</s>', sp: '▒', h: 'H', q: '❝', li: '•', ln: '🔗', hr: '—' };
async function viewNewsEditor(id) {
  setNav('news');
  if (!S.me) { page.innerHTML = `<div class="empty">${tl('Загрузка…')}</div>`; await loadMe(); }
  if (!isMod()) { page.innerHTML = `<div class="empty">${tl('Новости пишут модераторы.')}</div>`; return; }
  let n = null;
  if (id) { n = NEWS.cache.get(id) || (await api(`news?id=eq.${id}&select=*`).catch(() => []))[0]; if (!n) { page.innerHTML = `<div class="empty">${tl('Новость не найдена')}</div>`; return; } }
  let cover = n?.cover_url || '';
  page.innerHTML = `<div class="up ne">
    <div class="page-head"><h1>${n ? tl('Редактировать новость') : tl('Новая новость')}</h1></div>
    <form class="up-form" id="neForm" novalidate>
      <label class="fld"><span>${tl('Заголовок')}</span><input name="title" maxlength="160" value="${esc(n?.title || '')}" required></label>
      <div class="fld"><span>${tl('Обложка (необязательно)')}</span><div class="ne-cover" id="neCover"></div></div>
      <div class="fld"><span>${tl('Текст')}</span>
        <div class="ne-tools">${NE_TOOLS.map(([k, t]) => `<button type="button" class="ne-tool" data-ne="${k}" title="${t}">${NE_ICON[k]}</button>`).join('')}<label class="ne-tool" title="${tl('Картинка в текст')}">🖼️<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.avif" hidden data-neimg></label><span class="ne-sp"></span><button type="button" class="chip" data-neprev>${tl('Предпросмотр')}</button></div>
        <textarea name="body" rows="14" maxlength="20000" placeholder="${tl('Текст новости. Ссылку на YouTube на отдельной строке — вставится плеер.')}">${esc(n?.body || '')}</textarea>
        <div class="news-body ne-prev" hidden></div></div>
      <div class="fld-row"><label class="fld"><span>${tl('Публиковать от имени')}</span><select name="chan"><option value="">${tl('Моё имя')}</option></select></label>
        <label class="sw" style="align-self:end"><input type="checkbox" name="pin"${n?.pinned ? ' checked' : ''}><i></i><div><b>${tl('Закрепить')}</b><span>${tl('Будет первой в списке')}</span></div></label></div>
      <div class="up-foot"><div class="up-status" id="neStatus"></div>${n ? `<button class="btn danger" type="button" data-nedel>${tl('Удалить')}</button>` : ''}<button class="btn accent up-send" type="submit">${n ? tl('Сохранить') : tl('Опубликовать')}</button></div>
    </form></div>`;
  const f = $('#neForm'), ta = f.body, st = $('#neStatus');
  const say = (t, err) => { st.textContent = t; st.classList.toggle('err', !!err); };
  const drawCover = () => { $('#neCover').innerHTML = cover ? `<div class="ne-cover-img"><img src="${esc(cover)}" alt=""><button type="button" class="drop-x" data-necx aria-label="${tl('Убрать')}">✕</button></div>` : `<label class="btn">${tl('Загрузить обложку')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,.avif" hidden data-necov></label>`; };
  drawCover();
  const wrap = (a, b) => { const s0 = ta.selectionStart, s1 = ta.selectionEnd, sel = ta.value.slice(s0, s1); ta.setRangeText(a + sel + b, s0, s1, 'end'); if (!sel) ta.selectionStart = ta.selectionEnd = s0 + a.length; ta.focus(); };
  f.addEventListener('click', e => {
    const t = e.target.closest('[data-ne]'); if (t) { const x = NE_TOOLS.find(y => y[0] === t.dataset.ne); wrap(x[2], x[3]); return; }
    if (e.target.closest('[data-necx]')) { cover = ''; drawCover(); return; }
    if (e.target.closest('[data-neprev]')) { const pv = $('.ne-prev', f), on = pv.hidden; pv.hidden = !on; ta.hidden = on; if (on) pv.innerHTML = newsBody(ta.value) || `<p class="muted">${tl('Пусто')}</p>`; e.target.textContent = on ? tl('Редактировать') : tl('Предпросмотр'); }
  });
  f.addEventListener('change', async e => {
    const inp = e.target.closest('[data-necov],[data-neimg]'); if (!inp || !inp.files[0]) return;
    try {
      const url = await uploadFile(inp.files[0], p => say(tl('Загрузка: {0}%', {0: p}))); say('');
      if (inp.matches('[data-necov]')) { cover = url; drawCover(); } else wrap(`\n![](${url})\n`, '');
    } catch (er) { say(tl('Ошибка: ') + er.message, true); }
  });
  api(`news_channels?owner_id=eq.${S.uid}&select=id,name&order=created_at.asc`).then(ch => {
    ch.forEach(c => f.chan.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.name)}</option>`));
    if (n?.channel_name) { if (n.channel_id && ch.some(c => c.id === n.channel_id)) f.chan.value = n.channel_id; else { f.chan.insertAdjacentHTML('beforeend', `<option value="__keep__">${esc(n.channel_name)} ${tl('(как было)')}</option>`); f.chan.value = '__keep__'; } }
  }).catch(() => {});
  const del = $('[data-nedel]', f);
  if (del) del.onclick = async () => { if (!confirm(tl('Удалить новость?'))) return; try { await api(`news?id=eq.${n.id}`, { method: 'DELETE' }); NEWS.cache.delete(n.id); MEM.delete('news'); try { localStorage.removeItem(LSC + 'news'); } catch {} toast(tl('Новость удалена')); go('news'); } catch (er) { say(er.message, true); } };
  f.onsubmit = async e => {
    e.preventDefault();
    const title = f.title.value.trim(), body = ta.value.trim();
    if (!title) return say(tl('Нужен заголовок'), true);
    if (!body && !cover) return say(tl('Напишите текст или добавьте картинку'), true);
    const btn = $('.up-send', f); btn.disabled = true; say(tl('Сохраняю…'));
    const payload = { title, body, cover_url: cover || null, pinned: f.pin.checked };
    if (f.chan.value === '__keep__') {} else if (f.chan.value) { payload.channel_id = f.chan.value; payload.channel_name = f.chan.options[f.chan.selectedIndex].textContent; } else { payload.channel_id = null; payload.channel_name = null; }
    try {
      if (n) await api(`news?id=eq.${n.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { ...payload, updated_at: new Date().toISOString() } });
      else await api('news', { method: 'POST', prefer: 'return=minimal', body: { ...payload, author_id: S.uid } });
      MEM.delete('news'); try { localStorage.removeItem(LSC + 'news'); } catch {} if (n) NEWS.cache.delete(n.id);
      toast(n ? tl('Новость сохранена') : tl('Новость опубликована'));
      go(n ? 'news/' + n.id : 'news');
    } catch (er) { say(tl('Ошибка: ') + er.message, true); btn.disabled = false; }
  };
}

const GG = { pool: null, authors: [], queue: [], i: 0, cur: null, answered: false, score: 0, streak: 0, best: 0, played: 0, guessed: {}, reported: 0, el: null };
const ggShuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function ggQueue(arts) {
  const rest = ggShuffle(arts), cnt = {}; rest.forEach(a => { cnt[a.aid] = (cnt[a.aid] || 0) + 1; });
  const out = []; let last = null;
  while (rest.length) {
    let max = null; Object.keys(cnt).forEach(id => { if (max === null || cnt[id] > cnt[max]) max = id; });
    let k = max !== last && cnt[max] * 2 > rest.length ? rest.findIndex(a => a.aid === max) : rest.findIndex(a => a.aid !== last);
    if (k < 0) k = 0;
    const a = rest.splice(k, 1)[0]; if (!--cnt[a.aid]) delete cnt[a.aid]; last = a.aid; out.push(a);
  }
  return out;
}
async function ggPool() {
  if (GG.pool) return;
  const rows = (await api('content?status=eq.published&content_type=eq.art&select=id,cover_image_url,source_url,submitted_by,is_blurred')).filter(r => !r.is_blurred && r.submitted_by && (r.cover_image_url || r.source_url));
  await loadProfiles(rows.map(r => r.submitted_by));
  const by = {}; GG.pool = [];
  rows.forEach(r => { const p = S.profiles.get(r.submitted_by), name = p && (p.display_name || p.username); if (!name) return; GG.pool.push({ url: r.cover_image_url || r.source_url, aid: r.submitted_by, name }); by[name] = { name }; });
  GG.authors = Object.values(by);
}
const ggBestGet = () => { try { return +localStorage.getItem('gg_best_score') || 0; } catch { return 0; } };
async function ggReport() {
  if (!S.uid || (!Object.keys(GG.guessed).length && GG.score <= GG.reported)) return;
  const body = { p_score: GG.score, p_guessed: GG.guessed }; GG.guessed = {}; GG.reported = Math.max(GG.reported, GG.score);
  await rpc('gg_report', body).catch(() => {});
}
async function ggRating() {
  try {
    const [top, au] = await Promise.all([
      api('guess_game_scores?select=user_id,best_score&best_score=gt.0&order=best_score.desc,updated_at.asc&limit=3'),
      api('guess_game_author_stats?select=author_id,guessed&guessed=gt.0&order=guessed.desc&limit=1'),
    ]);
    await loadProfiles([...top.map(t => t.user_id), ...au.map(a => a.author_id)]);
    return `<div class="gg-rate"><div class="gg-rate-t">${tl('Топ игроков')} <span>${tl('угадано за игру')}</span></div>${top.length ? top.map((t, i) => `<div class="gg-rate-row${t.user_id === S.uid ? ' me' : ''}"><i>${['🥇', '🥈', '🥉'][i]}</i><span>${esc(pname(S.profiles.get(t.user_id)))}</span><b>${t.best_score}</b></div>`).join('') : `<p class="muted">${tl('Пока никто не играл — будь первым.')}</p>`}
      ${au[0] ? `<div class="gg-rate-t">${tl('Самый узнаваемый художник')}</div><div class="gg-rate-row"><i>★</i><span>${esc(pname(S.profiles.get(au[0].author_id)))}</span><b>${au[0].guessed}</b></div>` : ''}</div>`;
  } catch { return ''; }
}
function ggOpen() {
  if (!GG.el) {
    const el = document.createElement('div'); el.className = 'v2-overlay gg';
    el.innerHTML = `<div class="gg-box" role="dialog" aria-modal="true"><div class="gg-head"><div><h2>${tl('Угадай художника')}</h2><div class="gg-stats" id="ggStats"></div></div><button class="lb-close" data-ggx aria-label="${tl('Закрыть')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="gg-prog"><i id="ggBar"></i></div><div class="gg-body" id="ggBody"></div></div>`;
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-ggx]')) return ggClose();
      const o = e.target.closest('[data-ggo]'); if (o) return ggAnswer(o);
      const a = e.target.closest('[data-gga]'); if (!a) return;
      if (a.dataset.gga === 'next') { GG.i++; ggRound(); } else if (a.dataset.gga === 'start') ggStart(); else ggClose(true);
    });
    document.body.append(el); GG.el = el;
  }
  GG.el.hidden = false; document.documentElement.classList.add('lb-lock');
  $('#ggStats').textContent = ''; $('#ggBar').style.width = '0';
  $('#ggBody').innerHTML = `<div class="gg-msg"><div class="gg-big">🎨</div><p>${tl('Мы показываем арт с сайта — угадай, кто его нарисовал. Три варианта, арты не повторяются.')}</p><p class="muted">${tl('Рекорд:')} ${ggBestGet()}${S.uid ? '' : tl(' · войдите, чтобы попасть в рейтинг')}</p><div id="ggRate"></div><button class="btn accent" data-gga="start">${tl('Играть')}</button></div>`;
  ggRating().then(h => { const r = $('#ggRate'); if (r) r.innerHTML = h; });
}
async function ggStart() {
  Object.assign(GG, { i: 0, score: 0, streak: 0, best: 0, played: 0, guessed: {}, reported: 0, done: false });
  $('#ggBody').innerHTML = `<div class="gg-msg"><p>${tl('Загрузка артов…')}</p></div>`;
  try { await ggPool(); } catch (er) { $('#ggBody').innerHTML = `<div class="gg-msg"><p>${tl('Не удалось загрузить:')} ${esc(er.message)}</p></div>`; return; }
  if (GG.pool.length < 3 || GG.authors.length < 3) { $('#ggBody').innerHTML = `<div class="gg-msg"><p>${tl('Пока мало артов для игры.')}</p></div>`; return; }
  GG.queue = ggQueue(GG.pool); ggRound();
}
function ggStatus() {
  $('#ggStats').innerHTML = `${tl('Раунд')} ${Math.min(GG.i + 1, GG.queue.length)} ${tl('из')} ${GG.queue.length} ${tl('· Верно:')} <b>${GG.score}</b>${GG.streak > 1 ? ` ${tl('· Серия:')} <b>${GG.streak}</b>` : ''}`;
  $('#ggBar').style.width = (GG.i / GG.queue.length * 100) + '%';
}
function ggRound() {
  if (GG.i >= GG.queue.length) return ggFinal();
  const c = GG.cur = GG.queue[GG.i]; GG.answered = false;
  const opts = ggShuffle([{ name: c.name }, ...ggShuffle(GG.authors.filter(a => a.name !== c.name)).slice(0, 2)]);
  $('#ggBody').innerHTML = `<div class="gg-stage"><img id="ggImg" alt="" draggable="false"></div>
    <p class="gg-q" id="ggQ">${tl('Кто это нарисовал?')}</p>
    <div class="gg-opts">${opts.map((o, i) => `<button class="gg-opt" data-ggo="${esc(o.name)}"><i>${i + 1}</i>${esc(o.name)}</button>`).join('')}</div>
    <button class="btn accent gg-next" data-gga="next" hidden>${tl('Дальше')}</button>`;
  const img = $('#ggImg');
  img.onload = () => img.classList.add('ld');
  img.onerror = () => { if (GG.cur !== c || GG.answered) return; GG.queue.splice(GG.i, 1); ggRound(); };
  img.src = thumbUrl(c.url, 1080);
  const nx = GG.queue[GG.i + 1]; if (nx) { const p = new Image(); p.src = thumbUrl(nx.url, 1080); }
  ggStatus();
}
function ggAnswer(btn) {
  if (GG.answered || !GG.cur) return;
  GG.answered = true; GG.played++;
  const ok = btn.dataset.ggo === GG.cur.name;
  if (ok) { GG.score++; GG.streak++; GG.best = Math.max(GG.best, GG.streak); GG.guessed[GG.cur.aid] = (GG.guessed[GG.cur.aid] || 0) + 1; } else GG.streak = 0;
  if (GG.played % 5 === 0) ggReport();
  $$('.gg-opt').forEach(b => { b.disabled = true; if (b.dataset.ggo === GG.cur.name) b.classList.add('ok'); else if (b === btn) b.classList.add('bad'); });
  const q = $('#ggQ'); q.textContent = ok ? tl('Верно!') : tl('Мимо — это {0}', {0: GG.cur.name}); q.classList.add(ok ? 'ok' : 'bad');
  const n = $('.gg-next'); n.textContent = GG.i + 1 >= GG.queue.length ? tl('Результат') : tl('Дальше'); n.hidden = false; n.focus({ preventScroll: true });
  ggStatus();
}
async function ggFinal() {
  GG.done = true; GG.cur = null;
  const pct = GG.played ? Math.round(GG.score / GG.played * 100) : 0, prev = ggBestGet(), rec = GG.score > prev;
  if (rec) try { localStorage.setItem('gg_best_score', String(GG.score)); } catch {}
  const title = pct >= 90 ? tl('Знаешь всех в лицо') : pct >= 60 ? tl('Хороший глаз') : pct >= 30 ? tl('Неплохо') : tl('Есть куда расти');
  $('#ggStats').textContent = GG.i >= GG.queue.length ? tl('Арты закончились') : tl('Игра окончена');
  $('#ggBody').innerHTML = `<div class="gg-msg"><div class="gg-big">${GG.score}/${GG.played}</div><h3>${title}</h3><p>${tl('Угадано')} ${pct}${tl('% · лучшая серия:')} ${GG.best}</p><p>${rec ? tl('Новый личный рекорд!') : tl('Твой рекорд: {0}', {0: prev})}</p><div id="ggRate"></div><div class="gg-acts"><button class="btn accent" data-gga="start">${tl('Сыграть ещё')}</button><button class="btn" data-gga="close">${tl('Закрыть')}</button></div></div>`;
  await ggReport(); const h = await ggRating(); const r = $('#ggRate'); if (r) r.innerHTML = h;
}
function ggClose(force) {
  if (!force && GG.queue.length && GG.played && !GG.done) return ggFinal();
  ggReport(); GG.queue = []; GG.cur = null;
  if (GG.el) GG.el.hidden = true; document.documentElement.classList.remove('lb-lock');
}
addEventListener('keydown', e => {
  if (!GG.el || GG.el.hidden) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); ggClose(); return; }
  if (!GG.answered && GG.cur && /^[1-3]$/.test(e.key)) { const b = $$('.gg-opt')[+e.key - 1]; if (b) ggAnswer(b); }
  else if (GG.answered && e.key === 'Enter') $('.gg-next')?.click();
}, true);
$('#ggBtn').onclick = ggOpen;

const REV = { liked: new Set() };
async function drawReviews() {
  const g = $('#grid'); if (!g) return;
  g.outerHTML = `<div class="revs" id="grid">
    ${S.uid ? `<form class="rev-form" id="revForm"><img class="av" src="${esc(avatarUrl(S.me))}" alt=""><textarea maxlength="500" rows="2" placeholder="${tl('Что вы думаете о сайте? Отзыв появится после проверки модератором.')}" required></textarea><button class="btn accent" type="submit">${tl('Отправить')}</button></form>`
      : `<div class="cmt-login"><button type="button" class="btn accent" data-login>${tl('Войти')}</button><span>${tl('чтобы оставить отзыв')}</span></div>`}
    <div id="revList">${'<div class="skel" style="aspect-ratio:auto;height:90px;margin-bottom:10px"></div>'.repeat(4)}</div></div>`;
  const f = $('#revForm');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    const ta = $('textarea', f), text = ta.value.trim(); if (!text) return;
    const btn = $('button', f); btn.disabled = true;
    try {
      await api('reviews', { method: 'POST', prefer: 'return=minimal', body: { user_id: S.uid, username: pname(S.me), avatar_url: S.me?.avatar_url || null, text } });
      ta.value = ''; toast(tl('Спасибо! Отзыв появится после проверки.')); loadReviews();
      fetch(CDN_URL + '/notify-moderators', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await getToken()) }, body: JSON.stringify({ kind: 'review', title: text.slice(0, 60) }) }).catch(() => {});
    } catch (er) { toast(er.message, true); }
    btn.disabled = false;
  };
  loadReviews();
}
async function loadReviews() {
  const or = ['status.eq.published', ...(S.uid ? [`user_id.eq.${S.uid}`] : [])];
  let rows = [];
  try {
    rows = await api(`reviews?select=*&or=(${or.join(',')})&order=published_at.desc.nullslast,created_at.desc&limit=60`);
    if (S.uid && rows.length) (await api(`review_likes?review_id=in.(${rows.map(r => r.id).join(',')})&user_id=eq.${S.uid}&select=review_id`).catch(() => [])).forEach(x => REV.liked.add(x.review_id));
  } catch (e) { const l = $('#revList'); if (l) l.innerHTML = `<div class="empty">${tl('Ошибка:')} ${esc(e.message)}</div>`; return; }
  await loadProfiles(rows.map(r => r.user_id));
  const l = $('#revList'); if (!l) return;
  const mod = isMod();
  l.innerHTML = rows.length ? rows.map(r => {
    const p = S.profiles.get(r.user_id), mine = r.user_id === S.uid, liked = REV.liked.has(r.id);
    const uObj = p || { id: r.user_id, avatar_url: r.avatar_url, username: r.username };
    return `<article class="rev" data-rev="${r.id}" data-auid="${esc(r.user_id || '')}">
      ${cosAva(uObj)}
      <div class="rev-main"><div class="cmt-head"><b data-user="${esc(p?.username || r.user_id)}">${cosName(uObj)}</b><span>${when(r.published_at || r.created_at)}</span>${r.status !== 'published' ? `<span class="rev-st">${r.status === 'rejected' ? tl('отклонён') : tl('на проверке')}</span>` : ''}</div>
        <div class="rev-text">${esc(r.text)}</div>
        <div class="rev-acts">${S.uid && !mine && r.status === 'published' ? `<button type="button" class="rev-rep" data-report="review" data-rid="${r.id}">${tl('Пожаловаться')}</button>` : ''}${r.status === 'published' ? `<button type="button" class="rev-like${liked ? ' liked' : ''}" data-rlike="${r.id}">${I.heart}<span>${fmt(r.likes)}</span></button>` : ''}${mine || mod ? `<button type="button" class="rev-del" data-rdel2="${r.id}">${tl('Удалить')}</button>` : ''}</div></div>
    </article>`;
  }).join('') : `<div class="empty">${tl('Отзывов пока нет — оставьте первый!')}</div>`;
  animateCards(l);
}
page.addEventListener('click', async e => {
  const lk = e.target.closest('[data-rlike]');
  if (lk) {
    if (!S.uid) return login();
    const id = +lk.dataset.rlike, was = REV.liked.has(id), sp = $('span', lk); lk.disabled = true;
    try {
      if (was) { await api(`review_likes?review_id=eq.${id}&user_id=eq.${S.uid}`, { method: 'DELETE' }); await rpc('decrement_review_likes', { rid: id }).catch(() => {}); REV.liked.delete(id); }
      else { await api('review_likes', { method: 'POST', prefer: 'return=minimal', body: { review_id: id, user_id: S.uid } }); await rpc('increment_review_likes', { rid: id }).catch(() => {}); REV.liked.add(id); }
      lk.classList.toggle('liked', !was); sp.textContent = fmt(Math.max(0, (parseInt(sp.textContent.replace(/\D/g, ''), 10) || 0) + (was ? -1 : 1)));
    } catch (er) { toast(er.message, true); }
    lk.disabled = false; return;
  }
  const dl = e.target.closest('[data-rdel2]');
  if (dl) { if (!confirm(tl('Удалить отзыв?'))) return; try { await api(`reviews?id=eq.${dl.dataset.rdel2}`, { method: 'DELETE' }); dl.closest('.rev').remove(); toast(tl('Отзыв удалён')); } catch (er) { toast(er.message, true); } }
});

async function updateStreak() {
  if (!S.uid) return;
  try {
    const [p] = await api(`profiles?id=eq.${S.uid}&select=streak_count,last_visit_date`); if (!p) return;
    const today = new Date().toISOString().slice(0, 10), yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    let n = p.streak_count || 0;
    if (p.last_visit_date !== today) {
      n = p.last_visit_date === yest ? n + 1 : (n || 1);
      await api(`profiles?id=eq.${S.uid}`, { method: 'PATCH', prefer: 'return=minimal', body: { streak_count: n, last_visit_date: today } });
    }
    const c = $('#streakChip'); $('#streakVal').textContent = fmt(n); c.hidden = false;
  } catch {}
}
$('#streakChip').onclick = () => { go('streak'); };
async function viewStreak() {
  setNav('');
  page.innerHTML = `<div class="sets"><div class="page-head"><h1>${tl('🔥 Топ 10 по посещаемости')}</h1></div><section class="rules-card" id="stList">${'<div class="skel" style="aspect-ratio:auto;height:48px;margin-bottom:8px"></div>'.repeat(5)}</section>
    <p class="rules-foot">${tl('Стрик — сколько дней подряд вы заходите на сайт. Пропуск не сбрасывает его, а замораживает.')}</p></div>`;
  const rows = await api('profiles?select=id,username,display_name,avatar_url,name_color,streak_count&streak_count=gt.0&order=streak_count.desc.nullslast&limit=10').catch(() => []);
  const box = $('#stList'); if (!box) return;
  box.innerHTML = rows.length ? rows.map((p, i) => `<a class="st-row${p.id === S.uid ? ' me' : ''}" href="${userPath(p)}"><i>${['🥇', '🥈', '🥉'][i] || i + 1}</i>${cosAva(p)}<span>${cosName(p)}</span><b>🔥 ${fmt(p.streak_count)}</b></a>`).join('') : `<div class="empty">${tl('Пока пусто.')}</div>`;
}

const OWNER_ID = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
const TX = {
  purchase: [tl('Пополнение'), 'plus'], reward: [tl('Награда'), 'gift'], spend: [tl('Покупка'), 'bag'], admin: [tl('От администрации'), 'gift'],
  refund: [tl('Возврат'), 'plus'], transfer: [tl('Перевод'), 'swap'], reaction: [tl('Подарок за пост'), 'heart'],
};
const TXI = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M5 9h13l-3-3M19 15H6l3 3"/></svg>',
  heart: I.heart,
};
const DA_RATES_TXT = '1 ₽ → 1 ' + coinW(1) + ' · 1 ₴ = 2 · 1 $ = 80 · 1 € = 90 · 1 ₸ = 0,16 · 1 Br = 25';
function setBalance(v) { $('#coinVal').textContent = fmt(v); $$('[data-coin-w]').forEach(el => { el.textContent = coinW(v); }); const b = $('#walBal'); if (b) b.textContent = fmt(v); const sb = $('#shopBal'); if (sb) sb.textContent = fmt(v); }
async function viewWallet(tab) {
  setNav('');
  if (!S.uid) { page.innerHTML = `<div class="empty">${tl('Войдите, чтобы открыть кошелёк.')}<br><br><button class="btn accent" data-login>${tl('Войти')}</button></div>`; return; }
  const T = ['topup', 'history', 'send'].includes(tab) ? tab : 'topup';
  page.innerHTML = `<div class="wal">
    <section class="wal-hero">
      <div class="wal-coin"><img src="${COIN}" alt=""></div>
      <div class="wal-sum"><span>${tl('Ваш баланс')}</span><b><i id="walBal">${esc($('#coinVal').textContent)}</i> <span data-coin-w>${coinW($('#coinVal').textContent)}</span></b></div>
      <div class="wal-acts">
        <a class="btn accent" href="${routeUrl('wallet/topup')}">${TXI.plus}${tl('Пополнить')}</a>
        <a class="btn" href="${routeUrl('wallet/send')}">${TXI.swap}${tl('Перевести')}</a>
      </div>
      <p class="wal-what">${tl('Пузокоины — бонусная валюта сайта. Ими можно оплатить подписку в Y, подарить автору пузокоины за работу или перевести другу.')} <a href="${routeUrl('rules')}">${tl('Правила пузокоинов')}</a></p>
    </section>
    <div class="tabs wal-tabs"><a class="tab${T === 'topup' ? ' on' : ''}" href="${routeUrl('wallet/topup')}">${tl('Пополнить')}</a><a class="tab${T === 'history' ? ' on' : ''}" href="${routeUrl('wallet/history')}">${tl('История')}</a><a class="tab${T === 'send' ? ' on' : ''}" href="${routeUrl('wallet/send')}">${tl('Перевести')}</a></div>
    <div id="walBody"></div>
  </div>`;
  rpc('coin_balance').then(v => setBalance(v || 0)).catch(() => {});
  const body = $('#walBody');
  if (T === 'topup') {
    body.innerHTML = `<section class="wal-card">
      <h2>${tl('Поддержать сайт донатом')}</h2>
      <p class="muted">${tl('Донат — это добровольная поддержка проекта. В благодарность за него вы получаете')} <b>${tl('пузокоины в подарок')}</b> ${tl('— автоматически, обычно за минуту.')}</p>
      <ol class="wal-steps">
        <li><b>${tl('Скопируйте свой ник')}</b><div class="wal-code"><span id="walCode">${esc(S.me?.username || '…')}</span><button class="btn" type="button" id="walCopy">${tl('Скопировать')}</button></div></li>
        <li><div><b>${tl('Откройте страницу доната')}</b> ${tl('и укажите сумму.')}</div><div class="wal-go"><a class="btn accent" id="walGo" href="#" target="_blank" rel="noopener">${tl('Открыть страницу доната')}</a><a class="btn accent" id="walDn" href="#" target="_blank" rel="noopener" hidden>${tl('Укр карта')}</a></div></li>
        <li><div><b>${tl('Вставьте ник в поле «Имя»')}</b> ${tl('(на Donatello — «Ім\'я») — по нему мы поймём, кому отправить подарок. Сообщение пишите любое, хоть смешное, или оставьте пустым.')}</div></li>
      </ol>
      <div class="wal-rate"><img src="${COIN}" alt=""><span>${tl('Подарок:')} ${DA_RATES_TXT}</span></div>
      <p class="wal-warn">${tl('Если в поле «Имя» не ваш ник — подарок не придёт (или придёт тому, чей ник указан). Донат добровольный и не возвращается. Что-то пошло не так — напишите в')} <a href="${routeUrl('support')}">${tl('поддержку')}</a>.</p>
      <div class="wal-admin" id="walAdmin" hidden></div>
    </section>`;
    $('#walCopy').onclick = async () => { const c = $('#walCode').textContent.trim(); if (!c || c === '…' || c === '—') return; try { await navigator.clipboard.writeText(c); toast(tl('Ник скопирован — вставьте его в поле «Имя» на странице доната')); } catch { prompt(tl('Ваш ник'), c); } };
    try {
      const [info, prof] = await Promise.all([fetch(CDN_URL + '/da/info').then(r => r.json()).catch(() => ({})),
        S.me?.username ? Promise.resolve(S.me) : api(`profiles?id=eq.${S.uid}&select=username`).then(r => r?.[0]).catch(() => null)]);
      if (!$('#walCode')) return;
      $('#walCode').textContent = prof?.username || '—';
      if (info.url) $('#walGo').href = info.url.replace(/^https:\/\/www\.donationalerts\.com\/r\//, 'https://dalink.to/');
      else { $('#walGo').classList.add('disabled'); $('#walGo').textContent = tl('Пополнение временно недоступно'); }
      if (info.dn_url) {
        const dn = $('#walDn'); dn.href = info.dn_url; dn.hidden = false;
        if (info.url) $('#walGo').textContent = tl('Ру карта');
      }
      if (S.uid === OWNER_ID) {
        const a = $('#walAdmin'); a.hidden = false;
        a.innerHTML = `<span>${tl('Админ: DonationAlerts')} ${info.connected ? `<b class="ok">${tl('подключён')}</b>` : `<b class="bad">${tl('не подключён')}</b>`}${tl('. Переподключать, только если донаты перестали начисляться.')}</span><button class="btn" type="button" id="walDa">${info.connected ? tl('Переподключить') : tl('Подключить')}</button>`;
        const yr = new Date().getFullYear();
        rpc('donation_income', { p_year: yr }).then(rows => {
          if (!Array.isArray(rows) || !$('#walAdmin')) return;
          const el = document.createElement('div'); el.className = 'wal-income';
          el.innerHTML = `<b>${tl('Донаты за')} ${yr}:</b> ` + (rows.length ? rows.map(r => tl('{0} — {1} {2} ({3} шт.)', {0: esc(r.service), 1: Number(r.total).toLocaleString('ru-RU', { maximumFractionDigits: 2 }), 2: esc(r.currency), 3: Number(r.donations)})).join(' · ') : tl('пока нет'));
          $('#walAdmin').append(el);
        }).catch(() => {});
        $('#walDa').onclick = async () => {
          try { const r = await fetch(CDN_URL + '/da/login-url', { method: 'POST', headers: { Authorization: 'Bearer ' + (await getToken()) } }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || tl('ошибка')); location.href = j.url; }
          catch (er) { toast(er.message, true); }
        };
      }
    } catch (er) { const c = $('#walCode'); if (c) c.textContent = '—'; toast(er.message, true); }
  } else if (T === 'history') {
    body.innerHTML = `<section class="wal-card"><div id="walTx">${'<div class="skel" style="aspect-ratio:auto;height:56px;margin-bottom:8px"></div>'.repeat(5)}</div></section>`;
    let rows = [];
    try { rows = await api(`coin_tx?user_id=eq.${S.uid}&select=amount,kind,note,created_at&order=created_at.desc&limit=100`); } catch {}
    const box = $('#walTx'); if (!box) return;
    box.innerHTML = rows.length ? rows.map(t => { const k = TX[t.kind] || [t.kind, 'swap']; return `<div class="tx"><span class="tx-ic ${t.amount > 0 ? 'in' : 'out'}">${TXI[k[1]]}</span><div class="tx-main"><b>${esc(k[0])}</b>${t.note ? `<span>${esc(t.note)}</span>` : ''}<time>${when(t.created_at)}</time></div><div class="tx-amt ${t.amount > 0 ? 'in' : 'out'}">${t.amount > 0 ? '+' : '−'}${fmt(Math.abs(t.amount))}</div></div>`; }).join('') : `<div class="empty" style="padding:30px">${tl('Операций пока нет.')}</div>`;
  } else {
    body.innerHTML = `<section class="wal-card"><h2>${tl('Перевести пузокоины')}</h2><p class="muted">${tl('Найдите человека по нику. Перевод сразу и без комиссии, отменить его нельзя.')}</p>
      <label class="search wal-find"><input id="walFind" type="search" placeholder="${tl('Ник пользователя')}" autocomplete="off"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></label>
      <div id="walFound" class="wal-found"></div></section>`;
    let t;
    $('#walFind').oninput = e => {
      clearTimeout(t); const q = e.target.value.trim().replace(/[*,()%]/g, '');
      t = setTimeout(async () => {
        const box = $('#walFound'); if (!box) return;
        if (q.length < 2) { box.innerHTML = ''; return; }
        const rows = await api(`profiles?or=(username.ilike.*${encodeURIComponent(q)}*,display_name.ilike.*${encodeURIComponent(q)}*)&id=neq.${S.uid}&select=id,username,display_name,avatar_url&limit=8`).catch(() => []);
        rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
        box.innerHTML = rows.length ? rows.map(p => `<button type="button" class="wal-user" data-sendto="${p.id}">${avaHtml(p.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b>${p.username ? `<span>@${esc(p.username)}</span>` : ''}</div><i>${tl('Перевести →')}</i></button>`).join('') : `<div class="muted" style="padding:10px">${tl('Никого не нашли.')}</div>`;
      }, 300);
    };
    $('#walFind').focus();
  }
}
page.addEventListener('click', e => { const b = e.target.closest('[data-sendto]'); if (b) coinSendDialog(S.profiles.get(b.dataset.sendto)); });
$('#coinChip').onclick = () => { go('wallet'); };
const SEND_AMTS = [10, 50, 100, 500];
function coinSendDialog(p) {
  if (!S.uid || !p) return;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal send">
    <h2>${tl('Перевести пузокоины')}</h2>
    <div class="send-to">${avaHtml(p.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b><span>${tl('Ваш баланс:')} ${esc($('#coinVal').textContent)} ${coinW($('#coinVal').textContent)}</span></div></div>
    <div class="send-amts">${SEND_AMTS.map((a, i) => `<button type="button" class="chip${i === 1 ? ' on' : ''}" data-samt="${a}">${a}</button>`).join('')}<input type="number" name="c" min="1" max="100000" step="1" placeholder="${tl('своя')}"></div>
    <label>${tl('Сообщение (необязательно)')}<textarea name="n" rows="2" maxlength="200"></textarea></label>
    <p class="hint">${tl('Перевод нельзя отменить.')}</p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Перевести')} <img src="${COIN}" alt="" style="width:16px;height:16px"> <span>50</span></button></div></form>`;
  const f = $('form', ov), amt = () => { const c = parseInt(f.c.value, 10); return c > 0 ? c : +($('[data-samt].on', f)?.dataset.samt || 0); };
  const sync = () => { $('button[type=submit] span', f).textContent = fmt(amt()); };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return ov.remove();
    const ch = e.target.closest('[data-samt]'); if (ch) { $$('[data-samt]', f).forEach(x => x.classList.toggle('on', x === ch)); f.c.value = ''; sync(); }
  });
  f.c.oninput = () => { if (f.c.value) $$('[data-samt]', f).forEach(x => x.classList.remove('on')); sync(); };
  f.onsubmit = async e => {
    e.preventDefault();
    const a = amt(), hint = $('.hint', ov), btn = $('button[type=submit]', f);
    if (!(a >= 1)) { hint.textContent = tl('Укажите сумму'); return; }
    btn.disabled = true; hint.textContent = '…';
    try {
      const bal = await rpc('coin_transfer', { p_to: p.id, p_amount: a, p_note: f.n.value.trim() || null });
      setBalance(bal); ov.remove(); toast(tl('Переведено {0} {c} → {1}', {c: coinW(a), 0: fmt(a), 1: pname(p)}));
      const pc = $('#profCoinVal'); if (pc && pc.dataset.uid === p.id) rpc('coin_admin_balance', { p_user: p.id }).then(v => { if (v != null) pc.textContent = fmt(v); }).catch(() => {});
    } catch (er) { hint.textContent = tl('Ошибка: ') + er.message; btn.disabled = false; }
  };
  document.body.append(ov);
}

const SHOP_CATS = [
  ['all', tl('Все')],
  ['bundle', tl('Наборы')],
  ['role', tl('Роли')],
  ['gift_role', tl('Роли в подарок')],
  ['frame', tl('Рамки')],
  ['nick_fx', tl('Эффекты ника')],
  ['badge', tl('Значки')],
  ['banner', tl('Фоны профиля')],
  ['mine', tl('Мои')],
];
const shopPackItems = it => (Array.isArray(it?.meta?.items) ? it.meta.items : []).map(id => SHOP_ITEMS.get(id)).filter(Boolean);
const SHOP_SLOT_LBL = { role: tl('Роль'), gift_role: tl('Роль'), frame: tl('Рамка'), nick_fx: tl('Ник'), badge: tl('Значок'), banner: tl('Фон') };
const SHOP_RAR_LBL = { common: tl('Обычный'), rare: tl('Редкий'), epic: tl('Эпический'), legendary: tl('Легендарный') };
function giftRoleDialog(it, defaultDays = 14, onSaved) {
  if (!S.uid) return login();
  if (!it) return;
  const isCustom = it.id === 'gift_role_custom';
  const isTemp = it.category === 'gift_role';
  let days = defaultDays === 30 ? 30 : 14;
  let clr = it.meta?.color || '#f43f5e';
  let targetUser = null;
  const getPrice = () => isCustom ? (days === 30 ? 700 : 500) : it.price;
  const ov = document.createElement('div');
  ov.className = 'v2-overlay';
  ov.innerHTML = `<form class="v2-modal cs-mod">
    <h2>${isCustom ? tl('🎁 Подарить кастомную роль') : tl('🎁 Подарить роль «{0}»', {0: esc(it.title)})}</h2>
    <div class="cs-prev">${isCustom ? `<span class="role role-custom" id="csPrev" style="--rc:${clr}">${tl('Роль в подарок')}</span>` : roleChipHtml(it.id, EQ.get(S.uid))}</div>
    ${isCustom ? `<div class="pe-color"><span>${tl('Срок действия')}</span>
      <div class="chips" data-grdur>
        <button type="button" class="chip${days === 14 ? ' on' : ''}" data-grdays="14">${tl('2 недели — 500 пузокоинов')}</button>
        <button type="button" class="chip${days === 30 ? ' on' : ''}" data-grdays="30">${tl('1 месяц — 700 пузокоинов')}</button>
      </div>
    </div>
    <label>${tl('Название роли (до 18 символов)')}<input name="t" maxlength="18" required placeholder="${tl('Например: Любимчик чата')}"></label>
    <div class="pe-color"><span>${tl('Цвет роли')}</span>
      <div class="sw-row">${STATUS_COLORS.map(c => `<button type="button" class="nc-sw${clr.toLowerCase() === c ? ' on' : ''}" data-sc="${c}" style="background:${c}"></button>`).join('')}
        <label class="cs-pick" title="${tl('Свой цвет')}"><input type="color" name="c" value="${clr}">🎨</label>
      </div>
    </div>` : ''}
    <div class="pe-color"><span>${tl('Кому подарить')}</span>
      <div id="grTarget" hidden></div>
      <div id="grSearchWrap">
        <label class="search wal-find"><input id="grFind" type="search" placeholder="${tl('Найдите получателя по нику')}" autocomplete="off"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></label>
        <div id="grFound" class="wal-found"></div>
      </div>
    </div>
    <p class="muted" style="margin:0;font-size:12.5px;line-height:1.4">${isTemp ? tl('Первую неделю (7 дней) получатель не сможет убрать эту роль из профиля. Посты получателя не удаляются через 7 дней.') : tl('Роль останется у получателя навсегда и защитит его посты от удаления через 7 дней.')}</p>
    <p class="hint"></p>
    <div class="v2-modal-acts"><button type="button" class="btn" data-x>${tl('Отмена')}</button><button class="btn accent" type="submit">${tl('Подарить за')} <img src="${COIN}" alt="" style="width:16px;height:16px"> <span id="grPrice">${fmt(getPrice())}</span></button></div>
  </form>`;
  const close = () => ov.remove();
  const prev = $('#csPrev', ov), inp = $('[name=t]', ov), cp = $('[name=c]', ov), prEl = $('#grPrice', ov);
  const tBox = $('#grTarget', ov), sWrap = $('#grSearchWrap', ov), fIn = $('#grFind', ov), fOut = $('#grFound', ov);
  const sync = () => {
    if (prev && inp) {
      prev.textContent = inp.value.trim() || tl('Роль в подарок');
      prev.style.setProperty('--rc', clr);
    }
    if (cp) cp.value = clr;
    $$('[data-sc]', ov).forEach(b => b.classList.toggle('on', b.dataset.sc.toLowerCase() === clr.toLowerCase()));
    $$('[data-grdays]', ov).forEach(b => b.classList.toggle('on', +b.dataset.grdays === days));
    if (prEl) prEl.textContent = fmt(getPrice());
  };
  const setTarget = p => {
    targetUser = p;
    if (p) {
      tBox.hidden = false; sWrap.hidden = true;
      tBox.innerHTML = `<div class="gr-target">${avaHtml(p.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b>${p.username ? `<span>@${esc(p.username)}</span>` : ''}</div><button type="button" class="btn" data-grclear style="height:30px;padding:0 10px;font-size:12.5px">${tl('Сменить')}</button></div>`;
    } else {
      tBox.hidden = true; sWrap.hidden = false; fIn.focus();
    }
  };
  let st;
  fIn.oninput = e => {
    clearTimeout(st);
    const q = e.target.value.trim().replace(/[*,()%]/g, '');
    st = setTimeout(async () => {
      if (q.length < 2) { fOut.innerHTML = ''; return; }
      const rows = await api(`profiles?or=(username.ilike.*${encodeURIComponent(q)}*,display_name.ilike.*${encodeURIComponent(q)}*)&id=neq.${S.uid}&select=id,username,display_name,avatar_url&limit=6`).catch(() => []);
      rows.forEach(p => S.profiles.set(p.id, { ...(S.profiles.get(p.id) || {}), ...p }));
      fOut.innerHTML = rows.length
        ? rows.map(p => `<button type="button" class="wal-user" data-grpick="${p.id}">${avaHtml(p.avatar_url, pname(p))}<div><b>${esc(pname(p))}</b>${p.username ? `<span>@${esc(p.username)}</span>` : ''}</div><i>${tl('Выбрать →')}</i></button>`).join('')
        : `<div class="muted" style="padding:8px">${tl('Никого не нашли.')}</div>`;
    }, 250);
  };
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-x]')) return close();
    const sw = e.target.closest('[data-sc]');
    if (sw) { clr = sw.dataset.sc; sync(); return; }
    const db = e.target.closest('[data-grdays]');
    if (db) { days = +db.dataset.grdays; sync(); return; }
    const pk = e.target.closest('[data-grpick]');
    if (pk) { setTarget(S.profiles.get(pk.dataset.grpick)); return; }
    if (e.target.closest('[data-grclear]')) { setTarget(null); return; }
  });
  if (inp) inp.oninput = sync;
  if (cp) cp.oninput = () => { clr = cp.value; sync(); };
  $('form', ov).onsubmit = async e => {
    e.preventDefault();
    const hint = $('.hint', ov), btn = $('button[type=submit]', ov);
    const txt = inp ? inp.value.trim() : it.title;
    if (isCustom && (!txt || txt.length > 18)) { hint.textContent = tl('Введите название роли (до 18 символов)'); return; }
    if (!targetUser) { hint.textContent = tl('Выберите пользователя, которому хотите подарить роль'); fIn.focus(); return; }
    btn.disabled = true; hint.textContent = '';
    try {
      const res = await rpc('shop_gift_role', {
        p_item_id: it.id,
        p_target_user: targetUser.id,
        p_days: days,
        p_custom_text: isCustom ? txt : null,
        p_custom_color: isCustom ? clr : null,
      });
      if (res?.balance != null) setBalance(res.balance);
      if (res?.equipped) saveEqRow(res.equipped);
      toast(tl('Роль «{0}» подарена пользователю {1}!', {0: txt, 1: pname(targetUser)}));
      close();
      onSaved?.(res);
    } catch (er) { hint.textContent = er.message; btn.disabled = false; }
  };
  document.body.append(ov);
  setTimeout(() => (inp || fIn).focus(), 30);
}
async function viewShop(tab) {
  setNav('shop');
  const T = SHOP_CATS.some(c => c[0] === tab) ? tab : 'all';
  page.innerHTML = `<div class="shop"><div class="shop-head"><h1>${tl('Магазин косметики')}</h1></div><div class="skel" style="aspect-ratio:auto;height:150px;margin-bottom:16px"></div><div class="shop-grid">${'<div class="skel" style="aspect-ratio:auto;height:220px"></div>'.repeat(8)}</div></div>`;
  let items = [], owned = new Set();
  try {
    const [rows, ownRows, bal] = await Promise.all([
      api('shop_items?select=*&order=sort_order.asc,price.asc'),
      S.uid ? api(`user_cosmetics?user_id=eq.${S.uid}&select=item_id`).catch(() => []) : Promise.resolve([]),
      S.uid ? rpc('coin_balance').catch(() => null) : Promise.resolve(null),
      eqReady,
    ]);
    items = rows || [];
    items.forEach(it => SHOP_ITEMS.set(it.id, it));
    (ownRows || []).forEach(r => owned.add(r.item_id));
    if (bal != null) setBalance(bal);
  } catch (e) {
    page.innerHTML = `<div class="empty">${tl('Не удалось загрузить магазин (')}${esc(e.message)}).</div>`;
    return;
  }
  const me = S.me || readSession()?.user || { id: S.uid || '', username: tl('Гость'), display_name: tl('Гость'), avatar_url: GUEST_AVA };
  const tryOn = {};
  const myEq = () => (S.uid && EQ.get(S.uid)) || { user_id: S.uid || '', frame: null, nick_fx: null, badge: null, banner: null, owned_roles: [], hidden_roles: [] };
  const activeVal = cat => (cat in tryOn ? tryOn[cat] : myEq()[cat] || null);
  const saveEqLocal = row => saveEqRow({ ...myEq(), ...row, user_id: S.uid });
  const renderPreview = () => {
    const eq = myEq();
    const f = activeVal('frame'), fx = activeVal('nick_fx'), bg = activeVal('badge'), bn = activeVal('banner');
    const tryRole = tryOn.role || null;
    const prevRoles = visibleUserRoles(me, eq, tryRole);
    const bgCls = bn && /^bg_[a-z0-9_]+$/i.test(bn) ? ` cbg cbg-${esc(bn)}` : '';
    const hasTry = Object.keys(tryOn).length > 0;
    const slotsHtml = ['frame', 'nick_fx', 'badge', 'banner', 'role'].map(cat => {
      const id = cat === 'role' ? tryRole : activeVal(cat);
      if (!id) return '';
      const it = SHOP_ITEMS.get(id), isTry = cat in tryOn;
      return `<span class="shop-slot${isTry ? ' try' : ''}">${SHOP_SLOT_LBL[cat]}: <b>${esc(it?.title || id)}</b>${isTry ? tl(' (примерка)') : ''}<button type="button" data-unslot="${cat}" data-istry="${isTry ? '1' : ''}" title="${isTry ? tl('Убрать из примерки') : tl('Снять')}">✕</button></span>`;
    }).filter(Boolean).join('');
    return `<div class="shop-preview-wrap">
      <section class="prof-card${bgCls}">
        <div class="prof-left">${cosAva(me, 'prof-ava', '', f)}</div>
        <div class="prof-main">
          <div class="prof-roles">${prevRoles.map(r => roleChipHtml(r, eq)).join('')}</div>
          <h1>${cosName(me, fx, bg)}</h1>
          ${me.bio ? `<p class="prof-bio">${esc(me.bio)}</p>` : `<p class="prof-bio">${tl('Так ваш профиль, роли, аватарка и ник будут выглядеть на сайте.')}</p>`}
        </div>
      </section>
      <div class="shop-preview-bar">
        <div class="shop-slots">${slotsHtml || `<span>${tl('Нажмите «Примерить» на любом предмете, чтобы посмотреть его на себе')}</span>`}</div>
        ${hasTry ? `<button type="button" class="btn" id="shopResetTry" style="height:30px;padding:0 10px;font-size:12.5px">${tl('Сбросить примерку')}</button>` : ''}
      </div>
    </div>`;
  };
  const cardPreview = it => {
    if (it.category === 'role' || it.category === 'gift_role') {
      const perk = it.id === 'role_oligarh'
        ? `<span class="shop-perk">${tl('✨ Золотая обводка постов · 🛡️ Не удаляются')}</span>`
        : it.id === 'role_syroh0cki'
          ? `<span class="shop-perk">${tl('🟤 Коричневая обводка постов · 🛡️ Не удаляются')}</span>`
          : it.id === 'role_hoglin'
          ? `<span class="shop-perk">${tl('🟢 Зелёная обводка постов · 🛡️ Не удаляются')}</span>`
          : it.id === 'role_puzomafia'
            ? `<span class="shop-perk">${tl('🎨 Свой цвет · 🛡️ Посты не удаляются')}</span>`
            : it.id === 'gift_role_custom'
              ? `<span class="shop-perk">${tl('🎁 Только в подарок · 🔒 1 нед. не снять')}</span>`
              : it.category === 'gift_role'
                ? `<span class="shop-perk">${tl('⏳ На 2 недели · 🛡️ Посты не удаляются')}</span>`
                : it.meta?.keep_posts ? `<span class="shop-perk">${tl('🛡️ Посты не удаляются через 7 дн.')}</span>` : '';
      return `<div class="shop-prev-role">${roleChipHtml(it.id, myEq())}${perk}</div>`;
    }
    if (it.category === 'bundle') {
      const parts = shopPackItems(it), pick = c => parts.find(x => x.category === c)?.id || null;
      const bn = pick('banner');
      return `<div class="shop-prev-pack${bn ? ` cbg cbg-${esc(bn)}` : ''}">${cosAva(me, 'prof-ava', '', pick('frame'))}<div><b>${cosName(me, pick('nick_fx'), null)}</b><small>${tl('Набор ·')} ${parts.length} ${tl('предмета')}</small></div></div>`;
    }
    if (it.category === 'frame') return cosAva(me, 'prof-ava', '', it.id);
    if (it.category === 'nick_fx') return `<div class="shop-prev-nick"><span${nameAttr(null, it.id)}>${esc(pname(me))}</span></div>`;
    if (it.category === 'badge') return `<div class="shop-prev-badge"><span>${esc(pname(me))}</span>${badgeHtml(it.id)}</div>`;
    if (it.category === 'banner') return `<div class="shop-prev-bg cbg cbg-${esc(it.id)}"><img src="${esc(avatarUrl(me))}" alt=""><div><b>${esc(pname(me))}</b><span>${tl('Фон профиля')}</span></div></div>`;
    return '';
  };
  const draw = () => {
    const eq = myEq();
    const hidRoles = new Set(eq.hidden_roles || []);
    const activeTemp = activeTempRoles(eq);
    const activeTempItemIds = new Set(activeTemp.map(t => t.item_id));
    const shown = items.filter(it => !it.meta?.bundle_only || owned.has(it.id));
    const list = T === 'all' ? shown : T === 'mine' ? items.filter(it => owned.has(it.id) || activeTempItemIds.has(it.id)) : shown.filter(it => it.category === T);
    page.innerHTML = `<div class="shop">
      <div class="shop-head">
        <h1>${tl('Магазин косметики')}</h1>
        ${S.uid ? `<div class="shop-bal"><img src="${COIN}" alt=""><b id="shopBal">${esc($('#coinVal').textContent)}</b> <span data-coin-w>${coinW($('#coinVal').textContent)}</span><a href="${routeUrl('wallet/topup')}">${tl('Пополнить')}</a></div>` : `<button type="button" class="btn accent" data-login>${tl('Войти, чтобы покупать')}</button>`}
      </div>
      ${renderPreview()}
      <div class="tabs shop-tabs">${SHOP_CATS.map(([k, l]) => `<a class="tab${T === k ? ' on' : ''}" href="${routeUrl(k === 'all' ? 'shop' : 'shop/' + k)}">${l}${k === 'mine' ? ` (${owned.size + activeTemp.length})` : ''}</a>`).join('')}</div>
      ${list.length ? `<div class="shop-grid">${list.map(it => {
        const isGiftCat = it.category === 'gift_role';
        const isRole = it.category === 'role';
        const isOwn = isGiftCat ? activeTempItemIds.has(it.id) : owned.has(it.id);
        const isRoleVis = isRole && isOwn && !hidRoles.has(it.id);
        const isEq = isGiftCat ? isOwn : isRole ? isRoleVis : eq[it.category] === it.id;
        const isTry = (isRole || isGiftCat) ? tryOn.role === it.id : tryOn[it.category] === it.id;
        const oldP = Number(it.meta?.old_price || 0);
        const salePct = oldP > it.price ? Math.round((1 - it.price / oldP) * 100) : 0;
        let acts = '', packInfo = '';
        const isPack = it.category === 'bundle';
        if (isPack) {
          const parts = shopPackItems(it);
          const ownedSum = parts.filter(x => owned.has(x.id) && !x.meta?.bundle_only).reduce((a, x) => a + Number(x.price || 0), 0);
          const pay = Math.max(0, it.price - ownedSum);
          const allTry = parts.length && parts.every(x => tryOn[x.category] === x.id);
          packInfo = `<div class="shop-pack-list">${parts.map(x => `<span class="${owned.has(x.id) && !isOwn ? 'own' : ''}">${SHOP_SLOT_LBL[x.category] || ''}: ${esc(x.title)}</span>`).join('')}</div>`;
          const allEq = parts.length && parts.every(x => eq[x.category] === x.id);
          acts = isOwn
            ? (allEq ? `<button type="button" class="btn eq-on" disabled>${tl('Надето ✓')}</button>` : `<button type="button" class="btn accent" style="flex:1" data-shpackeq="${esc(it.id)}">${tl('Надеть набор')}</button>`)
            : `<button type="button" class="btn" data-shpacktry="${esc(it.id)}">${allTry ? tl('Убрать') : tl('Примерить')}</button><button type="button" class="btn accent shop-buy" data-shbuy="${esc(it.id)}" data-shpay="${pay}"><img src="${COIN}" alt="">${pay < Math.max(it.price, oldP) ? `<s class="shop-old-p">${fmt(Math.max(it.price, oldP))}</s>` : ''}${fmt(pay)}</button>`;
        } else if (it.id === 'gift_role_custom') {
          acts = `<button type="button" class="btn accent shop-buy" data-shgift="${esc(it.id)}" data-shdays="14">${tl('2 нед ·')} <img src="${COIN}" alt="">500</button><button type="button" class="btn accent shop-buy" data-shgift="${esc(it.id)}" data-shdays="30">${tl('1 мес ·')} <img src="${COIN}" alt="">700</button>`;
        } else if (isGiftCat) {
          acts = `<button type="button" class="btn" data-shtry="${esc(it.id)}">${isTry ? tl('Убрать') : tl('Примерить')}</button><button type="button" class="btn accent shop-buy" data-shbuyself="${esc(it.id)}" title="${tl('Купить себе на 2 недели')}"><img src="${COIN}" alt="">${fmt(it.price)}</button><button type="button" class="btn gift-btn" data-shgift="${esc(it.id)}" title="${tl('Подарить другому пользователю')}">🎁</button>`;
        } else if (isOwn && isRole) {
          const giftBtn = it.id !== 'role_custom' ? `<button type="button" class="btn gift-btn" data-shgift="${esc(it.id)}" title="${tl('Подарить другому пользователю')}">🎁</button>` : '';
          acts = it.id === 'role_custom'
            ? `<button type="button" class="btn accent" style="flex:1" data-shcustom>${tl('Настроить')}</button><button type="button" class="btn ${isRoleVis ? 'eq-on' : ''}" style="flex:none" data-shroletog="${esc(it.id)}">${isRoleVis ? tl('Видно ✓') : tl('Скрыто')}</button>`
            : SHOP_ROLES[it.id]?.customColor
              ? `<button type="button" class="btn accent" style="flex:1" data-shbrand="${esc(it.id)}">${tl('Цвет')}</button><button type="button" class="btn ${isRoleVis ? 'eq-on' : ''}" style="flex:none" data-shroletog="${esc(it.id)}">${isRoleVis ? tl('Видно ✓') : tl('Скрыто')}</button>${giftBtn}`
              : `<button type="button" class="btn ${isRoleVis ? 'eq-on' : 'accent'}" style="flex:1" data-shroletog="${esc(it.id)}">${isRoleVis ? tl('В профиле ✓') : tl('Показать в профиле')}</button>${giftBtn}`;
        } else if (isOwn) {
          acts = isEq
            ? `<button type="button" class="btn eq-on" data-sheq="${esc(it.category)}" data-shid="">${tl('Надето ✓')}</button>`
            : `<button type="button" class="btn" data-shtry="${esc(it.id)}">${isTry ? tl('Убрать') : tl('Примерить')}</button><button type="button" class="btn accent" style="flex:1" data-sheq="${esc(it.category)}" data-shid="${esc(it.id)}">${tl('Надеть')}</button>`;
        } else {
          const giftBtn = isRole && it.id !== 'role_custom' ? `<button type="button" class="btn gift-btn" data-shgift="${esc(it.id)}" title="${tl('Подарить другому пользователю')}">🎁</button>` : '';
          acts = `<button type="button" class="btn" data-shtry="${esc(it.id)}">${isTry ? tl('Убрать') : tl('Примерить')}</button><button type="button" class="btn accent shop-buy" data-shbuy="${esc(it.id)}"><img src="${COIN}" alt="">${oldP > it.price ? `<s class="shop-old-p">${fmt(oldP)}</s>` : ''}${fmt(it.price)}</button>${giftBtn}`;
        }
        return `<article class="shop-card${isPack ? ' is-pack' : ''}${isEq ? ' is-eq' : ''}${isTry ? ' is-try' : ''}">
          <div class="shop-prev">
            <span class="shop-rar ${esc(it.rarity)}">${SHOP_RAR_LBL[it.rarity] || it.rarity}</span>
            ${isOwn ? `<span class="shop-own-tag">${isGiftCat ? tl('Активно') : tl('Куплено')}</span>` : salePct ? `<span class="shop-sale">-${salePct}%</span>` : ''}
            ${cardPreview(it)}
          </div>
          <div class="shop-info">
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.description)}</p>${packInfo}
            <div class="shop-acts">${acts}</div>
          </div>
        </article>`;
      }).join('')}</div>` : `<div class="empty">${T === 'mine' ? tl('У вас пока нет купленных предметов.') : tl('В этой категории пока пусто.')}</div>`}
    </div>`;
    const rst = $('#shopResetTry');
    if (rst) rst.onclick = () => { Object.keys(tryOn).forEach(k => delete tryOn[k]); draw(); };
    const sh = $('.shop', page);
    if (sh) sh.onclick = async e => {
      const gf = e.target.closest('[data-shgift]');
      if (gf) {
        const it = SHOP_ITEMS.get(gf.dataset.shgift);
        if (it) giftRoleDialog(it, +(gf.dataset.shdays || 14), () => draw());
        return;
      }
      const bs = e.target.closest('[data-shbuyself]');
      if (bs) {
        if (!S.uid) return login();
        const it = SHOP_ITEMS.get(bs.dataset.shbuyself); if (!it) return;
        if (!confirm(tl('Купить роль «{0}» себе на 2 недели за {1} {c}?', {c: coinW(it.price), 0: it.title, 1: fmt(it.price)}))) return;
        bs.disabled = true;
        try {
          const res = await rpc('shop_gift_role', { p_item_id: it.id, p_target_user: S.uid, p_days: 14 });
          if (res?.balance != null) setBalance(res.balance);
          if (res?.equipped) saveEqLocal(res.equipped);
          delete tryOn.role;
          toast(tl('Куплено на 2 недели: {0}', {0: it.title}));
          draw();
        } catch (er) { toast(er.message, true); bs.disabled = false; }
        return;
      }
      const cs = e.target.closest('[data-shcustom]');
      if (cs) { customStatusDialog(() => draw()); return; }
      const br = e.target.closest('[data-shbrand]');
      if (br) { brandColorDialog(br.dataset.shbrand, () => draw()); return; }
      const rt = e.target.closest('[data-shroletog]');
      if (rt) {
        const rid = rt.dataset.shroletog;
        const curEq = myEq(), all = allUserRoles(me, curEq);
        const nextHid = new Set(curEq.hidden_roles || []);
        if (nextHid.has(rid)) nextHid.delete(rid); else nextHid.add(rid);
        if (all.filter(x => !nextHid.has(x) || isTempRoleLocked(activeTempRoles(curEq).find(t => t.gid === x))).length < 1) return toast(tl('Нужна минимум 1 отображаемая роль'), true);
        rt.disabled = true;
        try {
          const row = await rpc('shop_set_hidden_roles', { p_hidden: [...nextHid] });
          saveEqLocal(row);
          toast(nextHid.has(rid) ? tl('Роль скрыта в профиле') : tl('Роль показана в профиле'));
          draw();
        } catch (er) { toast(er.message, true); rt.disabled = false; }
        return;
      }
      const pt = e.target.closest('[data-shpacktry]');
      if (pt) {
        const parts = shopPackItems(SHOP_ITEMS.get(pt.dataset.shpacktry));
        const allTry = parts.length && parts.every(x => tryOn[x.category] === x.id);
        parts.forEach(x => { if (allTry) delete tryOn[x.category]; else tryOn[x.category] = x.id; });
        draw();
        return;
      }
      const pe = e.target.closest('[data-shpackeq]');
      if (pe) {
        const parts = shopPackItems(SHOP_ITEMS.get(pe.dataset.shpackeq)).filter(x => owned.has(x.id));
        pe.disabled = true;
        try {
          let row = null;
          for (const x of parts) { row = await rpc('shop_equip', { p_category: x.category, p_item_id: x.id }); delete tryOn[x.category]; }
          if (row) saveEqLocal(row);
          toast(tl('Набор надет'));
          draw();
        } catch (er) { toast(er.message, true); pe.disabled = false; }
        return;
      }
      const tr = e.target.closest('[data-shtry]');
      if (tr) {
        const it = SHOP_ITEMS.get(tr.dataset.shtry); if (!it) return;
        const slot = (it.category === 'role' || it.category === 'gift_role') ? 'role' : it.category;
        if (tryOn[slot] === it.id) delete tryOn[slot]; else tryOn[slot] = it.id;
        draw();
        return;
      }
      const us = e.target.closest('[data-unslot]');
      if (us) {
        const cat = us.dataset.unslot;
        if (us.dataset.istry === '1') { delete tryOn[cat]; draw(); return; }
        us.disabled = true;
        try {
          const row = await rpc('shop_equip', { p_category: cat, p_item_id: null });
          saveEqLocal(row); toast(tl('Снято')); draw();
        } catch (er) { toast(er.message, true); us.disabled = false; }
        return;
      }
      const eqBtn = e.target.closest('[data-sheq]');
      if (eqBtn) {
        const cat = eqBtn.dataset.sheq, id = eqBtn.dataset.shid || null;
        eqBtn.disabled = true;
        try {
          const row = await rpc('shop_equip', { p_category: cat, p_item_id: id });
          delete tryOn[cat]; saveEqLocal(row);
          toast(id ? tl('Надето: {0}', {0: SHOP_ITEMS.get(id)?.title || ''}) : tl('Снято'));
          draw();
        } catch (er) { toast(er.message, true); eqBtn.disabled = false; }
        return;
      }
      const buyBtn = e.target.closest('[data-shbuy]');
      if (buyBtn) {
        if (!S.uid) return login();
        const it = SHOP_ITEMS.get(buyBtn.dataset.shbuy); if (!it) return;
        const isPackBuy = it.category === 'bundle';
        const payNow = isPackBuy ? Number(buyBtn.dataset.shpay ?? it.price) : it.price;
        if (!confirm(isPackBuy ? tl('Купить набор «{0}» за {1} {c}? Всё из набора останется у вас навсегда и сразу наденется.', {0: it.title, 1: fmt(payNow), c: coinW(payNow)}) : tl('Купить «{0}» за {1} {c}? Предмет останется у вас навсегда.', {0: it.title, 1: fmt(it.price)}))) return;
        buyBtn.disabled = true;
        try {
          const bal = await rpc('shop_buy', { p_item_id: it.id });
          setBalance(bal); owned.add(it.id); delete tryOn[it.category];
          const cur = myEq();
          if (isPackBuy) {
            const parts = shopPackItems(it), next = { ...cur };
            parts.forEach(x => { owned.add(x.id); delete tryOn[x.category]; if (['frame', 'nick_fx', 'badge', 'banner'].includes(x.category)) next[x.category] = x.id; });
            saveEqLocal(next);
            toast(tl('Куплен набор «{0}» — всё уже надето!', {0: it.title}));
            draw();
          } else if (it.category === 'role') {
            const nextRoles = [...new Set([...(cur.owned_roles || []), it.id])];
            const nextHid = (cur.hidden_roles || []).filter(x => x !== it.id);
            saveEqLocal({
              ...cur,
              owned_roles: nextRoles,
              hidden_roles: nextHid,
              ...(it.id === 'role_custom' && !cur.custom_status_text ? { custom_status_text: 'Мой статус', custom_status_color: '#ff9e2c' } : {}),
            });
            toast(tl('Куплено: {0}', {0: it.title}));
            draw();
            if (it.id === 'role_custom') customStatusDialog(() => draw());
            else if (SHOP_ROLES[it.id]?.customColor) brandColorDialog(it.id, () => draw());
          } else {
            saveEqLocal({ ...cur, [it.category]: it.id });
            toast(tl('Куплено и надето: {0}', {0: it.title}));
            draw();
          }
        } catch (er) { toast(er.message, true); buyBtn.disabled = false; }
      }
    };
  };
  draw();
}

let legalP = null;
const loadLegal = () => legalP || (legalP = new Promise((ok, bad) => {
  const sc = document.createElement("script");
  sc.src = "/v2/legal.js?v=20261125lg"; sc.onload = ok; sc.onerror = () => { legalP = null; bad(new Error("legal")); };
  document.head.append(sc);
}));
async function viewLegal(which) {
  setNav(which);
  page.innerHTML = `<div class="skel" style="max-width:760px;margin:0 auto;aspect-ratio:auto;height:240px"></div>`;
  try { await loadLegal(); } catch { page.innerHTML = `<p class="rules-foot">${tl("Не удалось загрузить. Обновите страницу.")}</p>`; return; }
  const L = window.I18N ? I18N.lang() : "ru";
  page.innerHTML = `<article class="rules">${LEGAL.render(which, L, { sup: routeUrl("support"), rules: routeUrl("rules"), privacy: routeUrl("privacy") })}</article>`;
  if (location.hash === "#consent") $("#consent")?.scrollIntoView();
}
const viewRules = () => viewLegal("rules");

(() => {
  if (!('ontouchstart' in window)) return;
  const ind = document.createElement('div');
  ind.className = 'ptr'; ind.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>';
  document.body.append(ind);
  let y0 = null, d = 0;
  const blocked = () => document.documentElement.classList.contains('lb-lock') || document.documentElement.classList.contains('vw-lock') || document.querySelector('.v2-overlay:not([hidden])') || document.querySelector('.app.menu-open');
  addEventListener('touchstart', e => { y0 = scrollY <= 0 && e.touches.length === 1 && !blocked() ? e.touches[0].clientY : null; d = 0; }, { passive: true });
  addEventListener('touchmove', e => {
    if (y0 == null) return;
    d = Math.max(0, e.touches[0].clientY - y0);
    if (scrollY > 0) { y0 = null; d = 0; }
    const k = Math.min(d / 90, 1);
    ind.style.opacity = d > 10 ? String(k) : '0';
    ind.style.transform = `translate(-50%, ${Math.min(d * .6, 70)}px) rotate(${d * 3}deg)`;
    ind.classList.toggle('ready', d > 90);
  }, { passive: true });
  addEventListener('touchend', () => {
    if (y0 != null && d > 90) { ind.classList.add('spin'); setTimeout(() => location.reload(), 150); return; }
    y0 = null; ind.style.opacity = '0'; ind.style.transform = 'translate(-50%, 0)'; ind.classList.remove('ready');
  }, { passive: true });
})();

document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const raw = a.getAttribute('href') || '';
  if (raw.startsWith('#/')) { e.preventDefault(); go(raw.slice(2)); return; }
  let u; try { u = new URL(a.href); } catch { return; }
  if (u.origin !== location.origin || u.search) return;
  if (!u.pathname.startsWith(BASE)) return;
  const rel = u.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '');
  const first = rel.split('/')[0];
  if (rel === '' || SPA_TOP.has(first)) { e.preventDefault(); go(rel); }
});

function route() {
  const cur = curRoute();
  if (termsPending && !onLegalPage()) setTimeout(termsGate, 0);
  const parts = cur.split('/').filter(Boolean).map(decodeURIComponent);
  if (LB.skip) { LB.skip = false; return; }
  if (LB.open) {
    if (parts[0] === 'p' && parts[1]) { if (parts[1] !== LB.key) lbRender(parts[1]); return; }
    LB.open = false; closeLightboxUi();
    if (lbBaseRoute === cur) return;
  }
  if (parts[0] !== 'p') lbBaseRoute = cur;
  scrollTo(0, 0);
  page.classList.remove('pg-in'); void page.offsetWidth; page.classList.add('pg-in');
  if (parts[0] === 'p' && parts[1]) return viewPost(parts[1]);
  if (['art', 'video', 'fanfic'].includes(parts[0])) return viewFeed(parts[0]);
  if (parts[0] === 'news' && parts[1] === 'new') return viewNewsEditor(null);
  if (parts[0] === 'news' && parts[1] === 'edit' && parts[2]) return viewNewsEditor(parts[2]);
  if (parts[0] === 'news') return parts[1] ? viewNewsArticle(parts[1]) : viewNews();
  if (parts[0] === 'suggest') return viewSuggest();
  if (parts[0] === 'u' && parts[1]) return viewProfile(parts[1]);
  if (parts[0] === 'notifications') return viewNotifs();
  if (parts[0] === 'support') return viewSupport(parts[1]);
  if (parts[0] === 'new' && parts[1] === 'collection') return viewNewCollection();
  if (parts[0] === 'new') return viewNew(parts[1]);
  if (parts[0] === 'collections') return viewCollections();
  if (parts[0] === 'c' && parts[1]) return viewCollection(parts[1]);
  if (parts[0] === 'mod') return viewMod(parts[1]);
  if (parts[0] === 'rules') return viewRules();
  if (parts[0] === 'privacy') return viewLegal('privacy');
  if (parts[0] === 'wallet') return viewWallet(parts[1]);
  if (parts[0] === 'shop') return viewShop(parts[1]);
  if (parts[0] === 'settings') return viewSettings();
  if (parts[0] === 'streak') return viewStreak();
  return viewFeed('all');
}
const TOP_ROLES = ['role_oligarh', 'role_syroh0cki', 'role_hoglin'];
const topExtraOn = () => true;
function roleHolders(rid) {
  return [...EQ.values()].filter(e => (e.owned_roles || []).includes(rid) && !(e.hidden_roles || []).includes(rid)).map(e => e.user_id);
}
function drawRoleCounts() {
  const box = $('#roleCounts'); if (!box || !topExtraOn()) return;
  box.innerHTML = TOP_ROLES.map(rid => {
    const r = SHOP_ROLES[rid];
    return `<button type="button" class="rc-chip" data-rc="${rid}" aria-expanded="false" style="--rc:${r.color}" title="${esc(tl('Люди с ролью'))} ${esc(r.title)}"><i></i><span>${esc(r.title)}</span><b>${roleHolders(rid).length}</b></button>`;
  }).join('') + onlineChipHtml();
  $('#topExtra').hidden = false;
  document.querySelector('.top')?.classList.add('has-extra');
}
window.drawRoleCounts = drawRoleCounts;
let ONLINE = null;
function onlineChipHtml() {
  if (!ONLINE) return '';
  const tip = `${tl('Онлайн')}: ${ONLINE.total} · ${tl('с аккаунтом')}: ${ONLINE.users} · ${tl('гости')}: ${ONLINE.guests}`;
  return `<span class="rc-chip rc-online" title="${esc(tip)}"><i></i><b>${ONLINE.total}</b><span>${tl('онлайн')}</span></span>`;
}
(() => {
  let sid = '';
  try { sid = localStorage.getItem('rn_online_sid') || ''; } catch {}
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(sid)) {
    sid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
    try { localStorage.setItem('rn_online_sid', sid); } catch {}
  }
  const ping = () => fetch(CDN_URL + '/online/ping', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ sid, u: S.uid ? 1 : 0 }), keepalive: true }).catch(() => {});
  ping();
  setInterval(ping, 45e3);
  addEventListener('pageshow', e => { if (e.persisted) ping(); });
  addEventListener('pagehide', () => { try { navigator.sendBeacon(CDN_URL + '/online/bye', JSON.stringify({ sid })); } catch {} });
})();
async function loadOnline() {
  if (!isMod() || document.hidden) return;
  try {
    const t = await getToken(); if (!t) return;
    const r = await fetch(CDN_URL + '/online/count', { method: 'POST', headers: { Authorization: 'Bearer ' + t } });
    if (!r.ok) return;
    ONLINE = await r.json();
    drawRoleCounts();
  } catch {}
}
function startOnline() {
  if (!isMod()) return;
  loadOnline();
  setInterval(loadOnline, 30e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadOnline(); });
}
let rcPop = null;
function closeRolePop() {
  if (!rcPop) return;
  const { el, btn } = rcPop; rcPop = null;
  btn.classList.remove('on'); btn.setAttribute('aria-expanded', 'false');
  el.classList.remove('open');
  setTimeout(() => el.remove(), 200);
}
function placeRolePop() {
  if (!rcPop) return;
  const { el, btn } = rcPop, b = btn.getBoundingClientRect();
  const w = Math.min(280, innerWidth - 16);
  el.style.width = w + 'px';
  el.style.top = (b.bottom + 6) + 'px';
  el.style.left = Math.max(8, Math.min(b.left, innerWidth - w - 8)) + 'px';
}
async function toggleRolePop(btn) {
  const rid = btn.dataset.rc, same = rcPop?.btn === btn;
  closeRolePop();
  if (same) return;
  const r = SHOP_ROLES[rid]; if (!r) return;
  const ids = roleHolders(rid);
  const el = document.createElement('div');
  el.className = 'rc-pop';
  el.style.setProperty('--rc', r.color);
  el.innerHTML = ids.length ? `<p class="hint">${tl('Загрузка…')}</p>` : `<p class="hint">${tl('Пока никого нет')}</p>`;
  document.body.append(el);
  rcPop = { el, btn };
  btn.classList.add('on'); btn.setAttribute('aria-expanded', 'true');
  placeRolePop();
  requestAnimationFrame(() => el.classList.add('open'));
  if (!ids.length) return;
  await loadProfiles(ids);
  if (rcPop?.el !== el) return;
  const list = ids.map(id => S.profiles.get(id) || { id })
    .sort((a, b) => pname(a).localeCompare(pname(b), 'ru', { sensitivity: 'base' }));
  el.innerHTML = list.map(p => `<a class="spons-item" href="${userPath(p)}">${sponsAvaHtml(p)}<span class="spons-nm">${cosName(p)}</span></a>`).join('');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rc]');
  if (b) return toggleRolePop(b);
  if (!rcPop) return;
  if (e.target.closest('.rc-pop a') || !e.target.closest('.rc-pop')) closeRolePop();
});
addEventListener('keydown', e => { if (e.key === 'Escape') closeRolePop(); });
addEventListener('resize', placeRolePop);
$('#roleCounts')?.addEventListener('scroll', placeRolePop, { passive: true });
(() => {
  const END = Date.parse('2026-12-01T00:00:00+02:00');
  const el = $('#topTimer'), val = $('#topTimerVal');
  if (!el || !topExtraOn() || Date.now() >= END) return;
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const ms = END - Date.now();
    if (ms <= 0) { el.hidden = true; clearInterval(t); return; }
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    val.textContent = `${d ? d + tl('д') + ' ' : ''}${Math.floor(s / 3600) % 24}${tl('ч')} ${pad(Math.floor(s / 60) % 60)}${tl('м')} ${pad(s % 60)}${tl('с')}`;
  };
  const t = setInterval(tick, 1000);
  tick();
  el.hidden = false;
})();
drawRoleCounts();
addEventListener('popstate', route);
addEventListener('hashchange', () => {
  if (location.hash.startsWith('#/')) go(location.hash.slice(2), { replace: true });
});
loadAllMyLikes();
loadMe().then(() => { if (/^(suggest|news|u\/|mod|collections|new\/collection|shop)/.test(curRoute())) route(); startOnline(); });
resolveLegacy().then(ok => { if (ok) route(); });
})();
