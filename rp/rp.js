/* RP-подсайт renah0cki.xyz/rp/ — vanilla JS, данные в схеме rp (self-hosted Supabase). */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const CDN = 'https://cdn.renah0cki.xyz';
const LS_SESSION = 'fh_session';            // сессия основного сайта
const LS_ROOM = 'rp_last_room';
const MAX_LEN = 1000, MAX_IMG = 4, MAX_BYTES = 5 * 1024 * 1024;
const ROLE_RANK = { user: 0, goy: 1, vip: 2, mod: 3, admin: 4 };
const ROLE_NAME = { user: 'Игрок', goy: 'ГОЙ', vip: 'VIP', mod: 'Модератор', admin: 'Админ' };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const main = $('#main'), right = $('#right');

/* ── иконки ─────────────────────────────────────────────── */
const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  reply: '<svg viewBox="0 0 24 24"><path d="M4.5 11.5c0-4 3.4-7 7.5-7h.5c4.1 0 7.5 3.1 7.5 7s-3.4 7-7.5 7H11l-5 3.5V17a6.8 6.8 0 0 1-1.5-5.5z"/></svg>',
  rt: '<svg viewBox="0 0 24 24"><path d="M4 9l3-3 3 3M7 6v9a3 3 0 0 0 3 3h5M20 15l-3 3-3-3M17 18V9a3 3 0 0 0-3-3H9"/></svg>',
  like: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9-9.3C2 7.3 4.3 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3 0 5.3 2.8 4.3 6.2-1.5 4.7-9 9.3-9 9.3z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5"/></svg>',
  lock: '<svg class="lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.9-.3 5 1.4 5.5 4.4"/></svg>',
};

/* ── утилиты ────────────────────────────────────────────── */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' млн' : n >= 1e4 ? Math.floor(n / 1e3) + ' тыс.' : n > 0 ? String(n) : '';
const MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
function ago(ts) {
  const d = new Date(ts), s = (Date.now() - d) / 1000;
  if (s < 60) return Math.max(1, Math.floor(s)) + ' с';
  if (s < 3600) return Math.floor(s / 60) + ' мин';
  if (s < 86400) return Math.floor(s / 3600) + ' ч';
  const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() + ' г.' : '';
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + y;
}
const fullDate = ts => { const d = new Date(ts); return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ' г.'; };
function richText(s) {
  return esc(s)
    .replace(/https?:\/\/[^\s<]+[^\s<.,:;!?)"'»]/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u.length > 40 ? u.slice(0, 38) + '…' : u}</a>`)
    .replace(/(^|[^\w/@])@([A-Za-z0-9_]{1,30})/g, '$1<span class="mention">@$2</span>');
}
function hue(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(slot, cls = '') {
  const name = slot?.char_name || '?';
  if (slot?.avatar_url) return `<img class="av ${cls}" src="${esc(slot.avatar_url)}" alt="" loading="lazy">`;
  return `<span class="av ${cls}" style="background:hsl(${hue(slot?.handle || name)} 45% 32%)" aria-hidden="true">${esc(name.trim()[0] || '?').toUpperCase()}</span>`;
}
let toastT;
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000);
}
const ERR = {
  'slot taken': 'Этот персонаж уже занят', 'slot limit reached': 'Достигнут лимит слотов', 'room archived': 'Комната в архиве',
  'no access': 'Нет доступа', 'not authenticated': 'Нужно войти', 'forbidden': 'Нет прав', 'bad image url': 'Неверная картинка',
  'row-level security': 'Нет прав на это действие', 'duplicate key': 'Уже существует', 'slots_room_id_handle_key': 'Такой @ник уже есть в комнате',
  'posts_one_repost': 'Уже есть репост', 'characters_handle_uq': 'Такой @ник уже занят другим персонажем', 'character not found': 'Персонаж не найден', 'JWT expired': 'Сессия истекла, обновите страницу',
};
function errText(e) {
  const m = String(e?.message || e);
  for (const k in ERR) if (m.includes(k)) return ERR[k];
  return m.length > 140 ? 'Ошибка' : m;
}

/* ── сессия основного сайта ─────────────────────────────── */
function readSession() { try { return JSON.parse(localStorage.getItem(LS_SESSION)); } catch { return null; } }
function jwtExp(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; } }
let refreshing = null;
async function getToken() {
  const s = readSession();
  if (!s?.token) return null;
  if (jwtExp(s.token) - Date.now() > 60e3) return s.token;
  if (!s.refreshToken) return null;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refreshToken }),
        });
        if (!r.ok) {
          const f = readSession(); // могла обновить другая вкладка
          return f?.token && jwtExp(f.token) - Date.now() > 60e3 ? f.token : null;
        }
        const d = await r.json();
        const cur = readSession() || s;
        localStorage.setItem(LS_SESSION, JSON.stringify({ ...cur, token: d.access_token, refreshToken: d.refresh_token }));
        return d.access_token;
      } catch { return null; } finally { setTimeout(() => { refreshing = null; }, 0); }
    })();
  }
  return refreshing;
}

/* ── REST ───────────────────────────────────────────────── */
async function api(path, { method = 'GET', body, prefer } = {}) {
  const t = await getToken();
  const h = { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), 'Accept-Profile': 'rp' };
  if (method !== 'GET') { h['Content-Profile'] = 'rp'; h['Content-Type'] = 'application/json'; }
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let d = null;
  try { d = txt ? JSON.parse(txt) : null; } catch { d = txt; }
  if (!r.ok) throw new Error(d?.message || d?.hint || ('HTTP ' + r.status));
  return d;
}
const rpc = (fn, args = {}) => api('rpc/' + fn, { method: 'POST', body: args });

/* ── состояние ──────────────────────────────────────────── */
const S = {
  uid: null, me: null,            // rp.profiles
  room: null, slots: [], slotMap: new Map(),
  actSlot: null,                  // от чьего имени пишем
  liked: new Set(), reposted: new Map(), // post_id → id репоста
  posts: new Map(),               // кэш постов по id
  view: null, viewArg: null,
};
const rank = () => ROLE_RANK[S.me?.rp_role] ?? 0;
const isStaff = () => rank() >= 3;
const isOwner = () => !!S.room && !!S.uid && (S.room.owner_id === S.uid || isStaff());
const mySlot = () => S.slots.find(s => s.player_id && s.player_id === S.uid) || null;
const canWrite = () => !!S.uid && !!S.room && S.room.status === 'active' && (isOwner() || (!!mySlot() && !S.room.read_only));
function actingSlot() {
  if (!S.room) return null;
  if (S.actSlot && S.slotMap.has(S.actSlot) && (isOwner() || S.actSlot === mySlot()?.id)) return S.slotMap.get(S.actSlot);
  return mySlot() || (isOwner() ? S.slots[0] || null : null);
}

const SLOT_SEL = 'id,char_name,handle,avatar_url,character_id';
const P_FIELDS = 'id,room_id,slot_id,body,images,reply_to,quote_of,repost_of,like_count,reply_count,repost_count,is_deleted,created_at';
const P_SEL = `${P_FIELDS},slot:slots!slot_id(${SLOT_SEL}),parent:reply_to(id,slot:slots!slot_id(handle)),`
  + `quoted:quote_of(id,body,images,is_deleted,created_at,slot:slots!slot_id(${SLOT_SEL})),`
  + `orig:repost_of(${P_FIELDS},slot:slots!slot_id(${SLOT_SEL}),parent:reply_to(id,slot:slots!slot_id(handle)),quoted:quote_of(id,body,images,is_deleted,created_at,slot:slots!slot_id(${SLOT_SEL})))`;
function cache(p) {
  if (!p) return p;
  S.posts.set(p.id, p);
  if (p.orig) S.posts.set(p.orig.id, p.orig);
  return p;
}

/* ── загрузка комнаты ───────────────────────────────────── */
async function loadRoom(id) {
  if (S.room?.id === id) return S.room;
  const rows = await api(`rooms?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows?.length) throw new Error('Комната не найдена или нет доступа');
  S.room = rows[0]; S.actSlot = null; S.posts.clear();
  try { localStorage.setItem(LS_ROOM, id); } catch {}
  await loadSlots();
  await loadMine();
  subscribeRoom(id);
  return S.room;
}
async function loadSlots() {
  if (!S.room) return;
  S.slots = await api(`slots?room_id=eq.${S.room.id}&select=*,player:profiles!player_id(nick)&order=created_at.asc`) || [];
  S.slotMap = new Map(S.slots.map(s => [s.id, s]));
  updateNav();
}
async function loadMine() {
  S.liked = new Set(); S.reposted = new Map();
  const a = actingSlot();
  if (!a || !S.uid) return;
  const [likes, rts] = await Promise.all([
    api(`likes?slot_id=eq.${a.id}&select=post_id&limit=5000`),
    api(`posts?slot_id=eq.${a.id}&repost_of=not.is.null&select=id,repost_of&limit=5000`),
  ]);
  likes.forEach(l => S.liked.add(l.post_id));
  rts.forEach(r => S.reposted.set(r.repost_of, r.id));
}

/* ── realtime ───────────────────────────────────────────── */
let rt = null, chan = null, chanRoom = null;
function rtClient() {
  if (!rt && window.supabase?.createClient) {
    rt = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  return rt;
}
async function subscribeRoom(id) {
  if (chanRoom === id) return;
  const c = rtClient(); if (!c) return;
  if (chan) { c.removeChannel(chan); chan = null; }
  chanRoom = id;
  c.realtime.setAuth((await getToken()) || SB_KEY);
  chan = c.channel('rp-room-' + id)
    .on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'posts', filter: 'room_id=eq.' + id }, p => onPostInsert(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'posts', filter: 'room_id=eq.' + id }, p => onPostUpdate(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'rp', table: 'posts' }, p => onPostDelete(p.old))
    .on('postgres_changes', { event: '*', schema: 'rp', table: 'slots', filter: 'room_id=eq.' + id }, () => onSlotsChange())
    .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'rooms', filter: 'id=eq.' + id }, p => { S.room = { ...S.room, ...p.new }; renderRight(); })
    .subscribe();
}
setInterval(async () => { if (rt) rt.realtime.setAuth((await getToken()) || SB_KEY); }, 4 * 60e3);

async function onPostInsert(row) {
  if (!S.room || row.room_id !== S.room.id || S.posts.has(row.id)) return;
  let p;
  try { p = cache((await api(`posts?id=eq.${row.id}&select=${P_SEL}`))[0]); } catch { return; }
  if (!p) return;
  if (p.repost_of && p.slot_id === actingSlot()?.id) S.reposted.set(p.repost_of, p.id);
  if (S.view === 'feed' && !p.reply_to) {
    const list = $('#feedList'); if (!list) return;
    $('.empty', list)?.remove();
    const el = renderPost(p);
    if (window.scrollY < 200) { list.prepend(el); }
    else { list.prepend(el); showNewPill(); }
  } else if (S.view === 'thread' && p.reply_to && document.querySelector(`[data-replies="${p.reply_to}"]`)) {
    const box = document.querySelector(`[data-replies="${p.reply_to}"]`);
    box.append(renderReplyNode(p, []));
  }
}
function onPostUpdate(row) {
  const old = S.posts.get(row.id);
  const p = old ? Object.assign(old, row) : row;
  $$(`[data-cnt="${row.id}"]`).forEach(box => {
    for (const k of ['reply', 'rt', 'like']) {
      const n = $(`.act.${k} .n`, box); if (!n) continue;
      n.textContent = fmtN(k === 'reply' ? p.reply_count : k === 'rt' ? p.repost_count : p.like_count);
    }
  });
  $$(`[data-big-stats="${row.id}"]`).forEach(el => { el.innerHTML = bigStats(p); el.classList.toggle('hidden', !el.innerHTML); });
  if (row.is_deleted) $$(`[data-body="${row.id}"]`).forEach(el => { el.innerHTML = '<div class="deleted">Этот пост удалён.</div>'; });
}
function onPostDelete(old) {
  if (!old?.id) return;
  const p = S.posts.get(old.id);
  if (p?.repost_of && S.reposted.get(p.repost_of) === old.id) S.reposted.delete(p.repost_of);
  S.posts.delete(old.id);
  $$(`[data-post="${old.id}"]`).forEach(el => el.remove());
}
let slotsT;
function onSlotsChange() {
  clearTimeout(slotsT);
  slotsT = setTimeout(async () => {
    const before = actingSlot()?.id;
    await loadSlots();
    if (actingSlot()?.id !== before) await loadMine();
    renderRight();
    if (S.view === 'chars') renderChars();
    if (S.view === 'feed') refreshComposer();
  }, 250);
}
function showNewPill() {
  const pill = $('#newPill'); if (!pill) return;
  pill.classList.remove('hidden');
}

/* ── пост: разметка ─────────────────────────────────────── */
function mediaHtml(imgs) {
  if (!imgs?.length) return '';
  return `<div class="media n${imgs.length}">${imgs.map(u => `<img src="${esc(u)}" alt="" loading="lazy" data-zoom>`).join('')}</div>`;
}
function quoteHtml(q) {
  if (!q) return '';
  const body = q.is_deleted ? '<div class="deleted">Этот пост удалён.</div>'
    : `<div class="text">${richText(q.body)}</div>${mediaHtml(q.images)}`;
  return `<div class="quote-card" data-open="${q.id}">
    <div class="post-top">${avatar(q.slot, 'xs')}<span class="name">${esc(q.slot?.char_name)}</span><span class="handle">@${esc(q.slot?.handle)}</span><span class="dot">·</span><time>${ago(q.created_at)}</time></div>
    ${body}</div>`;
}
function actionsHtml(p, big = false) {
  const liked = S.liked.has(p.id), rted = S.reposted.has(p.id);
  const n = v => big ? '' : `<span class="n">${fmtN(v)}</span>`;
  return `<div class="actions" data-cnt="${p.id}">
    <button class="act reply" data-act="reply" aria-label="Ответить"><span class="ic">${I.reply}</span>${n(p.reply_count)}</button>
    <button class="act rt${rted ? ' on' : ''}" data-act="rt" aria-label="Репост"><span class="ic">${I.rt}</span>${n(p.repost_count)}</button>
    <button class="act like${liked ? ' on' : ''}" data-act="like" aria-label="Нравится"><span class="ic">${I.like}</span>${n(p.like_count)}</button>
    <button class="act share" data-act="share" aria-label="Скопировать ссылку"><span class="ic">${I.share}</span></button>
  </div>`;
}
function bodyHtml(p) {
  if (p.is_deleted) return '<div class="deleted">Этот пост удалён.</div>';
  return `${p.body ? `<div class="text">${richText(p.body)}</div>` : ''}${mediaHtml(p.images)}${quoteHtml(p.quoted)}`;
}
function canManage(p) {
  return !!S.uid && (isOwner() || (mySlot() && mySlot().id === p.slot_id));
}
function renderPost(p, { line = false } = {}) {
  const wrap = document.createElement('div');
  if (p.repost_of && p.orig) {
    const o = p.orig;
    wrap.className = 'post-wrap';
    wrap.dataset.post = p.id;
    wrap.innerHTML = `<div class="post-ctx">${I.rt}<span>${esc(p.slot?.char_name)} сделал(а) репост</span></div>`;
    wrap.append(renderPost(o));
    return wrap;
  }
  const el = document.createElement('article');
  el.className = 'post' + (line ? ' has-line' : '');
  el.dataset.post = p.id; el.dataset.open = p.id;
  el.innerHTML = `${line ? '<div class="thread-line"></div>' : ''}
    <a href="${p.slot?.character_id ? `#/c/${p.slot.character_id}` : `#/r/${p.room_id}/chars`}" class="av-link" aria-label="${esc(p.slot?.char_name)}">${avatar(p.slot)}</a>
    <div class="post-main">
      <div class="post-top"><span class="name">${esc(p.slot?.char_name)}</span><span class="handle">@${esc(p.slot?.handle)}</span><span class="dot">·</span><time datetime="${p.created_at}" title="${esc(fullDate(p.created_at))}">${ago(p.created_at)}</time>
        ${!p.is_deleted && canManage(p) ? `<button class="more" data-act="more" aria-label="Ещё">${I.more}</button>` : ''}</div>
      ${p.reply_to && p.parent?.slot ? `<div class="reply-to">В ответ <b>@${esc(p.parent.slot.handle)}</b></div>` : ''}
      <div data-body="${p.id}">${bodyHtml(p)}</div>
      ${actionsHtml(p)}
    </div>`;
  return el;
}
function bigStats(p) {
  const parts = [];
  if (p.repost_count) parts.push(`<span><b>${p.repost_count}</b> репост.</span>`);
  if (p.like_count) parts.push(`<span><b>${p.like_count}</b> отметок «Нравится»</span>`);
  if (p.reply_count) parts.push(`<span><b>${p.reply_count}</b> ответ.</span>`);
  return parts.join('');
}
function renderBigPost(p) {
  const el = document.createElement('article');
  el.className = 'post-big'; el.dataset.post = p.id;
  el.innerHTML = `<div class="post-top who" style="gap:12px">${avatar(p.slot)}<div style="min-width:0"><span class="name">${esc(p.slot?.char_name)}</span><span class="handle">@${esc(p.slot?.handle)}</span></div>
      ${!p.is_deleted && canManage(p) ? `<button class="more" data-act="more" aria-label="Ещё">${I.more}</button>` : ''}</div>
    ${p.reply_to && p.parent?.slot ? `<div class="reply-to" style="margin-top:8px">В ответ <b>@${esc(p.parent.slot.handle)}</b></div>` : ''}
    <div data-body="${p.id}">${bodyHtml(p)}</div>
    <div class="meta">${fullDate(p.created_at)}</div>
    <div class="stats" data-big-stats="${p.id}">${bigStats(p)}</div>
    ${actionsHtml(p, true)}`;
  if (!bigStats(p)) $('.stats', el).classList.add('hidden');
  return el;
}

/* ── клики по постам ────────────────────────────────────── */
main.addEventListener('click', async e => {
  const zoom = e.target.closest('[data-zoom]');
  if (zoom) { e.stopPropagation(); return lightbox(zoom.src); }
  const actBtn = e.target.closest('[data-act]');
  const postEl = e.target.closest('[data-post]');
  if (actBtn && postEl) {
    e.preventDefault(); e.stopPropagation();
    const holder = actBtn.closest('[data-cnt]') || actBtn.closest('[data-post]');
    const id = holder.dataset.cnt || postEl.dataset.post;
    const p = S.posts.get(id);
    if (!p) return;
    return postAction(actBtn.dataset.act, p, actBtn);
  }
  if (e.target.closest('a, button, input, textarea, select, label')) return;
  const open = e.target.closest('[data-open]');
  if (open && S.room && !window.getSelection()?.toString()) location.hash = `#/r/${S.room.id}/p/${open.dataset.open}`;
});

function needLogin() {
  if (S.uid) return false;
  toast('Войдите на основном сайте, чтобы играть', true); return true;
}
function needSlot() {
  if (canWrite() && actingSlot()) return false;
  if (needLogin()) return true;
  if (S.room?.status !== 'active') { toast('Комната в архиве', true); return true; }
  toast('Сначала выберите персонажа', true);
  location.hash = `#/r/${S.room.id}/chars`;
  return true;
}

async function postAction(act, p, btn) {
  if (act === 'share') {
    const url = `${location.origin}/rp/#/r/${p.room_id}/p/${p.id}`;
    try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована'); } catch { prompt('Ссылка на пост', url); }
    return;
  }
  if (act === 'more') return postMenu(p, btn);
  if (needSlot()) return;
  const a = actingSlot();
  if (act === 'reply') return openComposer({ replyTo: p });
  if (act === 'like') {
    const on = S.liked.has(p.id);
    const box = btn.closest('.actions');
    $$(`[data-cnt="${p.id}"] .act.like`).forEach(b => b.classList.toggle('on', !on));
    btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 300);
    on ? S.liked.delete(p.id) : S.liked.add(p.id);
    try {
      if (on) await api(`likes?post_id=eq.${p.id}&slot_id=eq.${a.id}`, { method: 'DELETE' });
      else await api('likes', { method: 'POST', body: { post_id: p.id, slot_id: a.id }, prefer: 'return=minimal' });
    } catch (err) {
      on ? S.liked.add(p.id) : S.liked.delete(p.id);
      $$(`[data-cnt="${p.id}"] .act.like`).forEach(b => b.classList.toggle('on', on));
      toast(errText(err), true);
    }
    void box; return;
  }
  if (act === 'rt') return repostMenu(p, btn);
}

function menu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  items.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = it.danger ? 'danger' : ''; b.innerHTML = `${it.icon || ''}<span>${esc(it.label)}</span>`;
    b.onclick = ev => { ev.stopPropagation(); closeMenu(); it.run(); };
    m.append(b);
  });
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  m.style.top = Math.min(window.scrollY + r.bottom + 4, window.scrollY + innerHeight - m.offsetHeight - 8) + 'px';
  m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px';
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
}
function closeMenu() { $$('.menu').forEach(m => m.remove()); }

function repostMenu(p, btn) {
  const mine = S.reposted.get(p.id);
  menu(btn, [
    mine
      ? { icon: I.rt, label: 'Отменить репост', run: async () => {
          try { await rpc('delete_post', { p_post: mine }); S.reposted.delete(p.id); onPostDelete({ id: mine }); $$(`[data-cnt="${p.id}"] .act.rt`).forEach(b => b.classList.remove('on')); }
          catch (e) { toast(errText(e), true); }
        } }
      : { icon: I.rt, label: 'Сделать репост', run: async () => {
          try {
            const [r] = await api('posts', { method: 'POST', body: { room_id: p.room_id, slot_id: actingSlot().id, repost_of: p.id }, prefer: 'return=representation' });
            S.reposted.set(p.id, r.id);
            $$(`[data-cnt="${p.id}"] .act.rt`).forEach(b => b.classList.add('on'));
            toast('Репост сделан');
          } catch (e) { toast(errText(e), true); }
        } },
    { icon: I.quote, label: 'Цитировать', run: () => openComposer({ quoteOf: p }) },
  ]);
}
function postMenu(p, btn) {
  menu(btn, [
    { icon: I.trash, label: 'Удалить', danger: true, run: async () => {
        if (!confirm('Удалить пост? Отменить нельзя.')) return;
        try { await rpc('delete_post', { p_post: p.id }); p.is_deleted = true; onPostUpdate({ ...p, is_deleted: true }); toast('Пост удалён'); }
        catch (e) { toast(errText(e), true); }
      } },
  ]);
}

function lightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<button class="icon-btn" aria-label="Закрыть">${I.close}</button><img src="${esc(src)}" alt="">`;
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  lb.onclick = close; document.addEventListener('keydown', onKey);
  document.body.append(lb);
}

/* ── загрузка картинок ──────────────────────────────────── */
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  for (const q of [0.88, 0.75, 0.6]) {
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
    if (b && b.size <= MAX_BYTES) return b;
  }
  throw new Error('Картинка слишком большая');
}
async function uploadImage(file) {
  let blob = file;
  if (!OK_TYPES.includes(file.type) || (file.size > MAX_BYTES && file.type !== 'image/gif')) {
    try { blob = await shrink(file); } catch { throw new Error('Не удалось обработать картинку'); }
  }
  if (blob.size > MAX_BYTES) throw new Error('Картинка больше 5 МБ');
  const t = await getToken(); if (!t) throw new Error('Нужно войти');
  const r = await fetch(`${CDN}/rp-upload`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': blob.type }, body: blob });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Ошибка загрузки');
  return d.url;
}

/* ── композер ───────────────────────────────────────────── */
function composerEl({ replyTo = null, quoteOf = null, autofocus = false, onDone } = {}) {
  const box = document.createElement('div');
  box.className = 'composer';
  const imgs = []; // {url|null, preview, loading}
  const slotSel = isOwner() && S.slots.length > 1
    ? `<select class="as-select" aria-label="От имени">${S.slots.map(s => `<option value="${s.id}"${s.id === actingSlot()?.id ? ' selected' : ''}>${esc(s.char_name)} @${esc(s.handle)}${s.player_id && s.player_id !== S.uid ? ' (игрок)' : ''}</option>`).join('')}</select>`
    : '';
  const a = actingSlot();
  box.innerHTML = `<div class="c-av">${avatar(a)}</div>
    <div class="composer-body">
      ${slotSel}
      ${replyTo ? `<div class="reply-to" style="margin-top:4px">В ответ <b>@${esc(replyTo.slot?.handle)}</b></div>` : ''}
      <textarea rows="1" maxlength="${MAX_LEN + 200}" placeholder="${replyTo ? 'Опубликуйте свой ответ' : quoteOf ? 'Добавьте комментарий' : 'Что происходит?!'}" aria-label="Текст поста"></textarea>
      <div class="thumbs hidden"></div>
      ${quoteOf ? quoteHtml(quoteOf) : ''}
      <div class="composer-tools">
        <label class="tool" title="Картинки" aria-label="Добавить картинки">${I.image}<input type="file" accept="image/*" multiple hidden></label>
        <span class="count"></span>
        <button class="btn blue small send" type="button" disabled>${replyTo ? 'Ответить' : 'Опубликовать'}</button>
      </div>
    </div>`;
  const ta = $('textarea', box), send = $('.send', box), cnt = $('.count', box), thumbs = $('.thumbs', box), file = $('input[type=file]', box);
  const sel = $('select', box);
  if (sel) sel.onchange = async () => { S.actSlot = sel.value; $('.c-av', box).innerHTML = avatar(actingSlot()); await loadMine(); };
  const update = () => {
    const len = ta.value.length;
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    cnt.textContent = len > MAX_LEN - 100 ? String(MAX_LEN - len) : '';
    cnt.className = 'count' + (len > MAX_LEN ? ' over' : len > MAX_LEN - 100 ? ' warn' : '');
    const busy = imgs.some(i => i.loading);
    send.disabled = busy || len > MAX_LEN || (!ta.value.trim() && !imgs.some(i => i.url));
  };
  const drawThumbs = () => {
    thumbs.classList.toggle('hidden', !imgs.length);
    thumbs.innerHTML = imgs.map((im, i) => `<div class="thumb${im.loading ? ' loading' : ''}"><img src="${esc(im.preview)}" alt=""><button type="button" data-rm="${i}" aria-label="Убрать">${I.close}</button></div>`).join('');
    update();
  };
  thumbs.onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; const [im] = imgs.splice(+b.dataset.rm, 1); URL.revokeObjectURL(im.preview); drawThumbs(); };
  file.onchange = async () => {
    const files = [...file.files].slice(0, MAX_IMG - imgs.length); file.value = '';
    if (!files.length) return toast(`Не больше ${MAX_IMG} картинок`, true);
    const added = files.map(f => ({ url: null, preview: URL.createObjectURL(f), loading: true, f }));
    imgs.push(...added); drawThumbs();
    await Promise.all(added.map(async im => {
      try { im.url = await uploadImage(im.f); } catch (e) { toast(errText(e), true); imgs.splice(imgs.indexOf(im), 1); }
      im.loading = false; drawThumbs();
    }));
  };
  ta.oninput = update;
  ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !send.disabled) send.click(); };
  send.onclick = async () => {
    const slot = actingSlot(); if (!slot) return needSlot();
    send.disabled = true;
    try {
      const body = { room_id: S.room.id, slot_id: slot.id, body: ta.value.trim(), images: imgs.filter(i => i.url).map(i => i.url) };
      if (replyTo) body.reply_to = replyTo.id;
      if (quoteOf) body.quote_of = quoteOf.id;
      const [row] = await api('posts', { method: 'POST', body, prefer: 'return=representation' });
      ta.value = ''; imgs.length = 0; drawThumbs();
      await onPostInsert(row);
      toast(replyTo ? 'Ответ отправлен' : 'Пост опубликован');
      onDone?.(row);
    } catch (e) { toast(errText(e), true); update(); }
  };
  if (autofocus) setTimeout(() => ta.focus(), 50);
  update();
  return box;
}
function refreshComposer() {
  const slot = $('#composerSlot'); if (!slot) return;
  slot.replaceChildren(canWrite() && actingSlot() ? composerEl() : composerHint());
}
function composerHint() {
  const d = document.createElement('div');
  d.className = 'composer-hint';
  if (!S.uid) d.innerHTML = `<span>Вы смотрите как гость.</span><a class="btn small blue" href="/">Войти</a>`;
  else if (S.room?.status !== 'active') d.innerHTML = '<span>Комната в архиве — только чтение.</span>';
  else if (S.room?.read_only && !isOwner()) d.innerHTML = '<span>Комната в режиме «только чтение».</span>';
  else d.innerHTML = `<span>Выберите персонажа, чтобы писать.</span><a class="btn small blue" href="#/r/${S.room.id}/chars">Персонажи</a>`;
  return d;
}
function openComposer(opts = {}) {
  if (!S.room) { toast('Сначала зайдите в комнату', true); location.hash = '#/rooms'; return; }
  if (needSlot()) return;
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Новый пост"><div class="head"><div class="head-row"><button class="icon-btn" data-close aria-label="Закрыть">${I.close}</button></div></div></div>`;
  const modal = $('.modal', ov);
  if (opts.replyTo) {
    const ctx = renderPost(opts.replyTo, { line: true });
    $('.actions', ctx)?.remove(); $('.more', ctx)?.remove();
    ctx.style.cursor = 'default';
    modal.append(ctx);
  }
  const close = () => { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  modal.append(composerEl({ ...opts, autofocus: true, onDone: close }));
  $('.composer', modal).style.borderBottom = '0';
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(ov); document.body.style.overflow = 'hidden';
}
$('#sidePost').onclick = () => openComposer();
$('#fab').onclick = () => openComposer();

/* ── виды ───────────────────────────────────────────────── */
function head(title, { back = false, sub = '', extra = '' } = {}) {
  return `<div class="head"><div class="head-row">
    ${back ? `<button class="icon-btn" data-back aria-label="Назад">${I.back}</button>` : ''}
    <div class="head-title"><h1>${esc(title)}</h1>${sub ? `<div class="head-sub">${sub}</div>` : ''}</div>${extra}
  </div></div>`;
}
main.addEventListener('click', e => { if (e.target.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = S.room ? `#/r/${S.room.id}` : '#/'); } });
const loader = () => '<div class="loading-row"><div class="spinner" role="status" aria-label="Загрузка"></div></div>';
function errorView(msg) {
  main.innerHTML = head('RP', { back: true }) + `<div class="empty"><h2>Не получилось</h2><p>${esc(msg)}</p><a class="btn blue" href="#/rooms">К комнатам</a></div>`;
}
function updateNav() {
  const r = S.room ? `#/r/${S.room.id}/chars` : '#/rooms';
  void r; $('#navChars').href = '#/chars'; $('#bottomChars').href = '#/chars';
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey()));
  $('#fab').classList.toggle('hidden', S.view !== 'feed' && S.view !== 'thread');
  $('#navNew').classList.toggle('hidden', !(S.uid && rank() >= 1));
  renderMe();
}
function navKey() { return S.view === 'create' ? 'new' : S.view === 'rooms' ? 'rooms' : S.view === 'lib' || S.view === 'char' ? 'chars' : 'home'; }
function renderMe() {
  const box = $('#meCard');
  if (!S.uid) { box.innerHTML = '<a class="btn blue small" href="/">Войти</a>'; return; }
  const a = S.room ? (mySlot() || null) : null;
  box.innerHTML = a
    ? `${avatar(a)}<div class="me-text"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.char_name)}</div><div style="color:var(--muted);font-size:14px">@${esc(a.handle)}</div></div>`
    : `${avatar({ char_name: S.me?.nick || '?', handle: S.me?.nick, avatar_url: S.me?.avatar_url })}<div class="me-text"><div style="font-weight:700">${esc(S.me?.nick || '')}</div><div style="color:var(--muted);font-size:14px">${ROLE_NAME[S.me?.rp_role] || ''}</div></div>`;
}

/* главная: лента комнаты */
async function viewFeed(roomId) {
  S.view = 'feed'; main.innerHTML = head('Главная') + loader(); updateNav();
  try { await loadRoom(roomId); } catch (e) { return errorView(errText(e)); }
  updateNav();
  const r = S.room;
  main.innerHTML = head(r.title, { sub: r.status === 'archived' ? 'Архив · только чтение' : `${S.slots.filter(s => s.player_id).length}/${S.slots.length} персонажей в игре`,
    extra: `<a class="icon-btn" href="#/r/${r.id}/chars" aria-label="Персонажи">${I.users}</a>${isOwner() ? `<button class="icon-btn" data-room-settings aria-label="Настройки комнаты" style="margin:0">${I.gear}</button>` : ''}` })
    + `<div id="composerSlot"></div><div class="new-pill"><span id="newPill" class="hidden"><button type="button">Новые посты</button></span></div><div id="feedList">${loader()}</div><div id="feedMore"></div>`;
  $('#newPill button').onclick = () => { scrollTo({ top: 0, behavior: 'smooth' }); $('#newPill').classList.add('hidden'); };
  if (matchMedia('(min-width: 640px)').matches) refreshComposer();
  else if (!canWrite() || !actingSlot()) refreshComposer();
  renderRight();
  await loadFeedPage();
}
async function loadFeedPage(before) {
  const list = $('#feedList'); if (!list) return;
  const roomId = S.room.id;
  let rows;
  try {
    rows = await api(`posts?room_id=eq.${roomId}&reply_to=is.null&select=${P_SEL}&order=created_at.desc&limit=30${before ? `&created_at=lt.${encodeURIComponent(before)}` : ''}`);
  } catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (S.room?.id !== roomId || S.view !== 'feed') return;
  if (!before) list.innerHTML = '';
  rows.forEach(p => { cache(p); list.append(renderPost(p)); });
  if (!before && !rows.length) list.innerHTML = `<div class="empty"><h2>Пока тихо</h2><p>Напишите первый пост в этой комнате.</p></div>`;
  const more = $('#feedMore');
  more.innerHTML = rows.length === 30 ? '<div class="loading-row"><button class="btn ghost" type="button">Показать ещё</button></div>' : '';
  const btn = $('button', more);
  if (btn) btn.onclick = () => { btn.disabled = true; loadFeedPage(rows[rows.length - 1].created_at); };
}

/* тред */
async function viewThread(roomId, postId) {
  S.view = 'thread'; main.innerHTML = head('Пост', { back: true }) + loader(); updateNav();
  try { await loadRoom(roomId); } catch (e) { return errorView(errText(e)); }
  renderRight();
  let p;
  try { p = cache((await api(`posts?id=eq.${encodeURIComponent(postId)}&room_id=eq.${roomId}&select=${P_SEL}`))[0]); } catch (e) { return errorView(errText(e)); }
  if (!p) return errorView('Пост не найден');
  if (p.repost_of && p.orig) { location.replace(`#/r/${roomId}/p/${p.orig.id}`); return; }
  // предки
  const chain = []; let cur = p;
  for (let i = 0; i < 12 && cur.reply_to; i++) {
    const par = S.posts.get(cur.reply_to)?.slot ? S.posts.get(cur.reply_to) : cache((await api(`posts?id=eq.${cur.reply_to}&select=${P_SEL}`))[0]);
    if (!par) break; chain.unshift(par); cur = par;
  }
  // ответы деревом (до 8 уровней)
  const children = new Map(); let level = [p.id];
  for (let d = 0; d < 8 && level.length; d++) {
    const rows = await api(`posts?reply_to=in.(${level.join(',')})&select=${P_SEL}&order=created_at.asc&limit=500`);
    rows.forEach(r => { cache(r); if (!children.has(r.reply_to)) children.set(r.reply_to, []); children.get(r.reply_to).push(r); });
    level = rows.map(r => r.id);
  }
  if (S.view !== 'thread') return;
  main.innerHTML = head('Пост', { back: true });
  chain.forEach(c => main.append(renderPost(c, { line: true })));
  main.append(renderBigPost(p));
  const cs = document.createElement('div'); cs.id = 'composerSlot'; main.append(cs);
  if (canWrite() && actingSlot()) cs.append(composerEl({ replyTo: p })); else cs.append(composerHint());
  const box = document.createElement('div'); box.dataset.replies = p.id;
  (children.get(p.id) || []).forEach(r => box.append(renderReplyNode(r, children)));
  main.append(box);
  scrollTo({ top: chain.length ? $('.post-big', main).offsetTop - 60 : 0 });
}
function renderReplyNode(p, children) {
  const node = document.createElement('div');
  node.dataset.post = p.id;
  const el = renderPost(p); el.removeAttribute('data-post');
  node.append(el);
  const kids = children instanceof Map ? children.get(p.id) || [] : [];
  const sub = document.createElement('div'); sub.className = 'replies'; sub.dataset.replies = p.id;
  kids.forEach(k => sub.append(renderReplyNode(k, children)));
  node.append(sub);
  return node;
}

/* ── обрезка картинок (аватар 1:1, шапка 3:1) ───────────── */
function cropImage(file, { aspect = 1, outW = 400, round = true, title = 'аватар' } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть картинку')); };
    img.onload = () => {
      const ov = document.createElement('div');
      ov.className = 'overlay crop-ov';
      ov.innerHTML = `<div class="modal crop-modal" role="dialog" aria-modal="true" aria-label="Обрезать ${esc(title)}">
        <div class="head"><div class="head-row"><button type="button" class="icon-btn" data-x aria-label="Отмена">${I.back}</button>
          <div class="head-title"><h1>${esc(title[0].toUpperCase() + title.slice(1))}</h1></div><button type="button" class="btn small" data-ok>Применить</button></div></div>
        <div class="crop-stage"><div class="crop-frame${round ? ' round' : ''}"><img alt="" draggable="false"></div></div>
        <div class="crop-zoom"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5M8 11h6"/></svg>
          <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Масштаб">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5M8 11h6M11 8v6"/></svg></div>
        <div class="crop-tip">Двигайте картинку пальцем или мышью, масштаб — ползунком или колёсиком.</div>
      </div>`;
      document.body.append(ov); document.body.style.overflow = 'hidden';
      const stage = $('.crop-stage', ov), frame = $('.crop-frame', ov), im = $('img', frame), range = $('input', ov);
      im.src = url;
      const W = img.naturalWidth, H = img.naturalHeight;
      let fw = 0, fh = 0, base = 1, z = 1, x = 0, y = 0;
      const sc = () => base * z;
      const layout = () => {
        fw = Math.min(stage.clientWidth - 32, 520); fh = fw / aspect;
        frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
        base = Math.max(fw / W, fh / H);
      };
      const draw = () => {
        x = Math.min(0, Math.max(fw - W * sc(), x)); y = Math.min(0, Math.max(fh - H * sc(), y));
        im.style.width = W * sc() + 'px'; im.style.height = H * sc() + 'px'; im.style.transform = `translate(${x}px, ${y}px)`;
      };
      layout(); x = (fw - W * sc()) / 2; y = (fh - H * sc()) / 2; draw();
      const zoomTo = (nz, cx = fw / 2, cy = fh / 2) => {
        nz = Math.min(4, Math.max(1, nz)); const k = nz / z;
        x = cx - (cx - x) * k; y = cy - (cy - y) * k; z = nz; range.value = z; draw();
      };
      range.oninput = () => zoomTo(+range.value);
      frame.addEventListener('wheel', e => { e.preventDefault(); const r = frame.getBoundingClientRect(); zoomTo(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      const pts = new Map(); let pinch = null;
      frame.onpointerdown = e => { frame.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); };
      frame.onpointermove = e => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1) { x += e.clientX - prev.x; y += e.clientY - prev.y; draw(); }
        else if (pts.size === 2) {
          const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = frame.getBoundingClientRect();
          if (pinch) zoomTo(z * d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
          pinch = d;
        }
      };
      frame.onpointerup = frame.onpointercancel = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
      const onRs = () => { const cx = (fw / 2 - x) / sc(), cy = (fh / 2 - y) / sc(); layout(); x = fw / 2 - cx * sc(); y = fh / 2 - cy * sc(); draw(); };
      addEventListener('resize', onRs);
      const done = v => {
        ov.remove(); URL.revokeObjectURL(url); removeEventListener('resize', onRs);
        if (!$('.overlay')) document.body.style.overflow = '';
        resolve(v);
      };
      $('[data-x]', ov).onclick = () => done(null);
      $('[data-ok]', ov).onclick = async () => {
        const outH = Math.round(outW / aspect);
        const c = document.createElement('canvas'); c.width = outW; c.height = outH;
        const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, -x / sc(), -y / sc(), fw / sc(), fh / sc(), 0, 0, outW, outH);
        let b = await new Promise(r => c.toBlob(r, 'image/webp', 0.9));
        if (!b || b.type !== 'image/webp') b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
        done(b);
      };
    };
    img.src = url;
  });
}

/* ── @ник из имени ──────────────────────────────────────── */
const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
function toHandle(name) {
  return [...name.toLowerCase()].map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
}
function autoHandle(nameInp, handleInp) {
  handleInp.dataset.auto = handleInp.value ? '' : '1';
  nameInp.addEventListener('input', () => { if (handleInp.dataset.auto) handleInp.value = toHandle(nameInp.value); });
  handleInp.addEventListener('input', () => { handleInp.dataset.auto = handleInp.value ? '' : '1'; });
}

/* ── модалка-форма ──────────────────────────────────────── */
function modal(title, html, { onSubmit, submitLabel = 'Сохранить' } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" novalidate>
    <div class="head"><div class="head-row"><button type="button" class="icon-btn" data-close aria-label="Закрыть">${I.close}</button><div class="head-title"><h1>${esc(title)}</h1></div><button class="btn small" type="submit">${esc(submitLabel)}</button></div></div>
    <div class="form">${html}<div class="form-err" role="alert"></div></div></form>`;
  const form = $('form', ov);
  const close = () => { ov.remove(); if (!$('.overlay')) document.body.style.overflow = ''; };
  form.close = close;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', form); btn.disabled = true; $('.form-err', form).textContent = '';
    try { await onSubmit(form); close(); } catch (err) { $('.form-err', form).textContent = errText(err); btn.disabled = false; }
  };
  document.body.append(ov); document.body.style.overflow = 'hidden';
  return form;
}

/* ── редактор персонажа (библиотека) ────────────────────── */
const canEditChar = c => !!S.uid && (c.owner_id === S.uid || isStaff());
function characterEditor(c, onSaved) {
  const form = modal(c ? 'Изменить персонажа' : 'Новый персонаж', `
    <div class="ce-head">
      <label class="ce-banner"${c?.banner_url ? ` style="background-image:url('${esc(c.banner_url)}')"` : ''} title="Шапка">
        <span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="banner" aria-label="Загрузить шапку"></label>
      <label class="ce-av" title="Аватар">${c?.avatar_url ? `<img class="av ce-av-img" src="${esc(c.avatar_url)}" alt="">` : '<span class="av ce-av-img" style="background:#333639"></span>'}
        <span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="avatar" aria-label="Загрузить аватар"></label>
    </div>
    <div class="ce-note">Нажмите на шапку или аватар, чтобы загрузить и обрезать картинку.</div>
    <input type="hidden" name="avatar_url" value="${esc(c?.avatar_url || '')}">
    <input type="hidden" name="banner_url" value="${esc(c?.banner_url || '')}">
    <div class="field"><label for="f-name">Имя персонажа</label><input id="f-name" name="char_name" required maxlength="50" value="${esc(c?.char_name || '')}" autocomplete="off"></div>
    <div class="field"><label for="f-handle">@ник (подставится из имени, можно поменять)</label><input id="f-handle" name="handle" required maxlength="30" value="${esc(c?.handle || '')}" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label for="f-bio">Био</label><textarea id="f-bio" name="bio" rows="3" maxlength="300">${esc(c?.bio || '')}</textarea></div>
    ${c ? '<button type="button" class="btn danger" data-del-char>Удалить персонажа</button>' : ''}`, {
    submitLabel: c ? 'Сохранить' : 'Создать',
    onSubmit: async f => {
      if (+f.dataset.busy) throw new Error('Дождитесь загрузки картинки');
      const body = { char_name: f.char_name.value.trim(), handle: f.handle.value.trim().replace(/^@/, ''), bio: f.bio.value.trim(), avatar_url: f.avatar_url.value || null, banner_url: f.banner_url.value || null };
      if (!body.char_name) throw new Error('Укажите имя');
      if (!/^[A-Za-z0-9_]{1,30}$/.test(body.handle)) throw new Error('@ник: только латиница, цифры и _');
      const [row] = c
        ? await api(`characters?id=eq.${c.id}`, { method: 'PATCH', body, prefer: 'return=representation' })
        : await api('characters', { method: 'POST', body, prefer: 'return=representation' });
      toast(c ? 'Сохранено' : 'Персонаж создан');
      onSaved?.(row);
    },
  });
  form.dataset.busy = '0';
  autoHandle(form.char_name, form.handle);
  $$('input[type=file]', form).forEach(inp => inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    const isAv = inp.dataset.kind === 'avatar';
    let blob;
    try { blob = await cropImage(f, isAv ? { aspect: 1, outW: 400, round: true, title: 'аватар' } : { aspect: 3, outW: 1500, round: false, title: 'шапка' }); }
    catch (e) { return toast(errText(e), true); }
    if (!blob) return;
    const box = inp.closest('label'); box.classList.add('loading'); form.dataset.busy = +form.dataset.busy + 1;
    try {
      const url = await uploadImage(blob);
      if (isAv) { form.avatar_url.value = url; $('.ce-av-img', box).outerHTML = `<img class="av ce-av-img" src="${esc(url)}" alt="">`; }
      else { form.banner_url.value = url; box.style.backgroundImage = `url("${url}")`; }
    } catch (e) { toast(errText(e), true); }
    box.classList.remove('loading'); form.dataset.busy = +form.dataset.busy - 1;
  });
  const del = $('[data-del-char]', form);
  if (del) del.onclick = async () => {
    if (!confirm('Удалить персонажа из библиотеки? В комнатах он останется, но перестанет обновляться.')) return;
    try { await api(`characters?id=eq.${c.id}`, { method: 'DELETE' }); form.close(); toast('Персонаж удалён'); location.hash = '#/chars'; }
    catch (e) { toast(errText(e), true); }
  };
}

/* ── вкладка «Персонажи»: библиотека ───────────────────── */
let libQ = '';
function charRow(c, extra = '') {
  const n = c.slots ? new Set(c.slots.map(s => s.room_id)).size : null;
  return `<a class="char lib-item" href="#/c/${c.id}">${avatar(c)}<div class="char-main"><div class="name">${esc(c.char_name)}</div><div class="handle">@${esc(c.handle)}</div>
    ${c.bio ? `<div class="bio clamp2">${esc(c.bio)}</div>` : ''}${n !== null ? `<div class="st">${n ? `В ${n} ${plural(n, 'комнате', 'комнатах', 'комнатах')}` : 'Пока ни в одной комнате'}</div>` : ''}</div>${extra}</a>`;
}
function plural(n, one, few, many) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
const likeQ = q => encodeURIComponent(q.replace(/[*,()]/g, ' '));
async function viewLibrary() {
  S.view = 'lib'; updateNav(); renderRight();
  const canCreate = S.uid && rank() >= 1;
  main.innerHTML = head('Персонажи', { extra: canCreate ? `<button class="btn small blue" data-new-char>${I.plus} Создать</button>` : '' })
    + `<div class="search">${I.search}<input type="search" placeholder="Поиск персонажей" aria-label="Поиск персонажей" value="${esc(libQ)}" enterkeyhint="search"></div>
    <div id="libList">${loader()}</div>`;
  const inp = $('.search input', main); let t;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { libQ = inp.value.trim(); loadLibrary(); }, 300); };
  loadLibrary();
}
async function loadLibrary() {
  const list = $('#libList'); if (!list) return;
  const q = libQ ? `&or=(char_name.ilike.*${likeQ(libQ)}*,handle.ilike.*${likeQ(libQ)}*)` : '';
  let rows;
  try { rows = await api(`characters?select=id,char_name,handle,avatar_url,bio,owner_id,slots(room_id)&order=created_at.desc&limit=500${q}`); }
  catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (S.view !== 'lib') return;
  list.innerHTML = rows.length ? rows.map(c => charRow(c)).join('')
    : `<div class="empty"><h2>${libQ ? 'Ничего не найдено' : 'Персонажей пока нет'}</h2><p>${libQ ? 'Попробуйте другой запрос.' : 'Создайте первого — потом его можно добавить в комнаты.'}</p>${!libQ && S.uid && rank() >= 1 ? `<button class="btn blue" data-new-char style="margin-top:16px">${I.plus} Создать персонажа</button>` : ''}</div>`;
}

/* ── страница персонажа ─────────────────────────────────── */
async function viewCharacter(id) {
  S.view = 'char'; updateNav(); renderRight();
  main.innerHTML = head('Персонаж', { back: true }) + loader();
  let c, rooms;
  try {
    [[c], rooms] = await Promise.all([
      api(`characters?id=eq.${id}&select=*`),
      api(`rooms?select=id,title,description,is_private,status,image_url,slots!inner(id,character_id,player_id)&slots.character_id=eq.${id}&order=status.asc,created_at.desc`),
    ]);
  } catch (e) { return errorView(errText(e)); }
  if (!c) return errorView('Персонаж не найден');
  if (S.view !== 'char') return;
  main.innerHTML = head(c.char_name, { back: true, sub: `${rooms.length} ${plural(rooms.length, 'комната', 'комнаты', 'комнат')}` })
    + `<div class="cp-banner"${c.banner_url ? ` style="background-image:url('${esc(c.banner_url)}')"` : ''}></div>
    <div class="cp-top">${avatar(c, 'xl')}${canEditChar(c) ? '<button class="btn ghost" data-edit-char>Изменить</button>' : ''}</div>
    <div class="cp-info"><div class="cp-name">${esc(c.char_name)}</div><div class="cp-handle">@${esc(c.handle)}</div>${c.bio ? `<div class="cp-bio">${richText(c.bio)}</div>` : ''}</div>
    <div class="tabs" style="border-bottom:1px solid var(--border)"><span class="active" style="flex:1;text-align:center;padding:16px 8px;font-weight:700;position:relative">Комнаты</span></div>
    ${rooms.length ? rooms.map(r => {
      const free = r.slots.some(s => !s.player_id);
      return `<a class="room-item" href="#/r/${r.id}/chars">${roomIcon(r)}
        <div style="min-width:0;flex:1"><div class="t">${esc(r.title)} ${r.is_private ? I.lock : ''} ${r.status === 'archived' ? '<span class="badge">Архив</span>' : ''}</div>
        ${r.description ? `<div class="d">${esc(r.description)}</div>` : ''}
        <div class="m">${r.status !== 'active' ? 'Только чтение' : free ? '<span class="free">Свободен — можно играть</span>' : 'Занят игроком'}</div></div></a>`;
    }).join('') : '<div class="empty"><h2>Пока ни в одной комнате</h2><p>Владелец комнаты может добавить этого персонажа в разделе «Персонажи комнаты».</p></div>'}`;
  const ed = $('[data-edit-char]', main);
  if (ed) ed.onclick = () => characterEditor(c, () => viewCharacter(id));
}

/* ── выбор персонажей из библиотеки ─────────────────────── */
function charPicker({ exclude = [] } = {}) {
  const box = document.createElement('div');
  box.className = 'picker';
  const sel = new Map(); let all = [];
  box.innerHTML = `<div class="search" style="margin:0 0 8px">${I.search}<input type="search" placeholder="Найти персонажа" aria-label="Найти персонажа" enterkeyhint="search"></div>
    <div class="pick-list">${loader()}</div>
    ${S.uid && rank() >= 1 ? `<button type="button" class="btn ghost small" data-pick-new style="margin-top:8px">${I.plus} Новый персонаж</button>` : ''}`;
  const list = $('.pick-list', box), inp = $('input', box);
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    const rows = all.filter(c => !exclude.includes(c.id) && (!q || c.char_name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)));
    list.innerHTML = rows.length ? rows.map(c => `<label class="pick-item${sel.has(c.id) ? ' on' : ''}"><input type="checkbox" value="${c.id}"${sel.has(c.id) ? ' checked' : ''}>${avatar(c, 'sm')}
      <span class="pick-text"><b>${esc(c.char_name)}</b><span>@${esc(c.handle)}</span></span><span class="pick-check" aria-hidden="true"></span></label>`).join('')
      : `<div class="pick-empty">${all.length ? 'Никого не найдено' : 'В библиотеке пока нет персонажей — создайте нового.'}</div>`;
    box.dispatchEvent(new Event('change'));
  };
  list.onchange = e => {
    const cb = e.target.closest('input[type=checkbox]'); if (!cb) return;
    const c = all.find(x => x.id === cb.value);
    cb.checked ? sel.set(c.id, c) : sel.delete(c.id);
    cb.closest('.pick-item').classList.toggle('on', cb.checked);
    box.dispatchEvent(new Event('change'));
  };
  inp.oninput = draw;
  inp.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); };
  const nb = $('[data-pick-new]', box);
  if (nb) nb.onclick = () => characterEditor(null, row => { all.unshift(row); sel.set(row.id, row); draw(); });
  api('characters?select=id,char_name,handle,avatar_url,owner_id&order=char_name.asc&limit=1000')
    .then(rows => { all = rows; draw(); })
    .catch(e => { list.innerHTML = `<div class="pick-empty">${esc(errText(e))}</div>`; });
  box.getSelected = () => [...sel.values()];
  return box;
}

/* ── персонажи комнаты (слоты) ──────────────────────────── */
async function viewChars(roomId) {
  S.view = 'chars'; main.innerHTML = head('Персонажи комнаты', { back: true }) + loader(); updateNav();
  try { await loadRoom(roomId); await loadSlots(); } catch (e) { return errorView(errText(e)); }
  renderRight(); renderChars();
}
function renderChars() {
  const r = S.room, own = isOwner(), mine = mySlot();
  const taken = S.slots.filter(s => s.player_id).length;
  main.innerHTML = head('Персонажи комнаты', { back: true, sub: `${esc(r.title)} · ${taken}/${S.slots.length} заняты`,
    extra: own ? `<button class="btn small blue" data-add>${I.plus} Добавить</button><button class="icon-btn" data-room-settings aria-label="Настройки комнаты" style="margin:0">${I.gear}</button>` : '' });
  if (!S.uid) main.insertAdjacentHTML('beforeend', `<div class="composer-hint"><span>Войдите, чтобы выбрать персонажа.</span><a class="btn small blue" href="/">Войти</a></div>`);
  else if (r.status === 'active') main.insertAdjacentHTML('beforeend', `<div class="composer-hint"><span>Выберите, за кого играть.</span>${mine ? '<button class="btn small ghost" data-leave>Покинуть слот</button>' : ''}</div>`);
  S.slots.forEach(s => {
    const isMine = mine?.id === s.id;
    const st = isMine ? '<div class="st mine">Вы играете за этого персонажа</div>'
      : s.player_id ? `<div class="st">Играет ${esc(s.player?.nick || 'игрок')}</div>` : '<div class="st free">Свободен</div>';
    const acts = [];
    if (S.uid && r.status === 'active' && !s.player_id) acts.push(`<button class="btn small blue" data-take="${s.id}">Играть</button>`);
    if (own) {
      if (s.player_id && !isMine) acts.push(`<button class="btn small ghost" data-kick="${s.id}">Освободить</button>`);
      acts.push(`<button class="btn small ghost" data-rm-slot="${s.id}" aria-label="Убрать из комнаты">Убрать</button>`);
    }
    const link = s.character_id ? ` data-href="#/c/${s.character_id}"` : '';
    main.insertAdjacentHTML('beforeend', `<div class="char${s.character_id ? ' editable' : ''}"${link}>${avatar(s)}<div class="char-main"><div class="name">${esc(s.char_name)}</div><div class="handle">@${esc(s.handle)}</div>${s.bio ? `<div class="bio">${richText(s.bio)}</div>` : ''}${st}</div><div class="char-acts">${acts.join('')}</div></div>`);
  });
  if (!S.slots.length) main.insertAdjacentHTML('beforeend', `<div class="empty"><h2>Нет персонажей</h2><p>${own ? 'Нажмите «Добавить» и выберите персонажей из библиотеки.' : 'Владелец комнаты ещё не добавил персонажей.'}</p></div>`);
}
function addToRoom() {
  const picker = charPicker({ exclude: S.slots.map(s => s.character_id).filter(Boolean) });
  const form = modal('Добавить в комнату', `<div class="form-note">Выберите персонажей из библиотеки или создайте нового.</div><div data-picker></div>`, {
    submitLabel: 'Добавить',
    onSubmit: async () => {
      const chosen = picker.getSelected();
      if (!chosen.length) throw new Error('Выберите хотя бы одного персонажа');
      await api('slots', { method: 'POST', body: chosen.map(c => ({ room_id: S.room.id, character_id: c.id, char_name: c.char_name, handle: c.handle })), prefer: 'return=minimal' });
      await loadSlots(); renderChars(); renderRight(); toast('Добавлено');
    },
  });
  $('[data-picker]', form).replaceWith(picker);
}
main.addEventListener('click', async e => {
  if (S.view !== 'chars') return;
  const t = e.target.closest('[data-take],[data-kick],[data-rm-slot],[data-add],[data-leave],[data-room-settings]');
  if (!t) {
    const card = e.target.closest('[data-href]');
    if (card && !e.target.closest('a,button')) location.hash = card.dataset.href;
    return;
  }
  try {
    if (t.dataset.take) {
      t.disabled = true;
      await rpc('take_slot', { p_slot: t.dataset.take });
      S.actSlot = null; await loadSlots(); await loadMine();
      toast('Вы в игре!'); location.hash = `#/r/${S.room.id}`;
    } else if (t.hasAttribute('data-leave')) {
      await rpc('leave_slot', { p_room: S.room.id }); await loadSlots(); await loadMine(); renderChars(); renderRight(); toast('Слот освобождён');
    } else if (t.dataset.kick) {
      if (!confirm('Освободить слот? Игрок потеряет персонажа.')) return;
      await api(`slots?id=eq.${t.dataset.kick}`, { method: 'PATCH', body: { player_id: null }, prefer: 'return=minimal' });
      await loadSlots(); renderChars(); renderRight();
    } else if (t.dataset.rmSlot) {
      if (!confirm('Убрать персонажа из комнаты? Его посты в этой комнате тоже удалятся. Отменить нельзя.')) return;
      await api(`slots?id=eq.${t.dataset.rmSlot}`, { method: 'DELETE' });
      await loadSlots(); renderChars(); renderRight();
    } else if (t.hasAttribute('data-add')) addToRoom();
    else if (t.hasAttribute('data-room-settings')) roomSettings();
  } catch (err) { toast(errText(err), true); t.disabled = false; }
});
main.addEventListener('click', e => {
  if (S.view === 'feed' && e.target.closest('[data-room-settings]')) roomSettings();
  if (S.view !== 'lib') return;
  if (e.target.closest('[data-new-char]')) characterEditor(null, row => { location.hash = `#/c/${row.id}`; });
});

function roomIcon(r, cls = '') {
  return r.image_url
    ? `<img class="room-ic ${cls}" src="${esc(r.image_url)}" alt="" loading="lazy">`
    : `<div class="room-ic ${cls}" style="background:hsl(${hue(r.id || r.title)} 40% 22%)">${esc(((r.title || '').trim()[0] || '?').toUpperCase())}</div>`;
}
function wireRoomImage(form) {
  const inp = $('.room-img-pick input', form), box = $('.room-img-pick', form);
  form.dataset.busy = '0';
  inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    let blob;
    try { blob = await cropImage(f, { aspect: 1, outW: 400, round: false, title: 'картинка' }); } catch (e) { return toast(errText(e), true); }
    if (!blob) return;
    box.classList.add('loading'); form.dataset.busy = '1';
    try { const url = await uploadImage(blob); form.image_url.value = url; box.innerHTML = `<img src="${esc(url)}" alt="">`; box.append(inp); }
    catch (e) { toast(errText(e), true); }
    box.classList.remove('loading'); form.dataset.busy = '0';
  };
  const rm = $('[data-rm-img]', form);
  if (rm) rm.onclick = () => { form.image_url.value = ''; box.innerHTML = `<span>${I.image}</span>`; box.append(inp); rm.remove(); };
}
function leaveRoomState() {
  if (chan && rt) rt.removeChannel(chan);
  chan = null; chanRoom = null;
  S.room = null; S.slots = []; S.slotMap = new Map(); S.actSlot = null; S.posts.clear();
  try { localStorage.removeItem(LS_ROOM); } catch {}
}
function roleOptions(sel) {
  return Object.keys(ROLE_RANK).filter(r => r !== 'user').map(r => `<option value="${r}"${r === sel ? ' selected' : ''}>${ROLE_NAME[r]} и выше</option>`).join('');
}
function roomFields(r = {}) {
  return `<div class="room-img-edit"><label class="room-img-pick" title="Картинка комнаты">${r.image_url ? `<img src="${esc(r.image_url)}" alt="">` : `<span>${I.image}</span>`}<input type="file" accept="image/*" hidden aria-label="Картинка комнаты"></label>
      <div><div style="font-weight:700">Картинка комнаты</div><div class="form-note">Нажмите на квадрат, чтобы загрузить и обрезать.</div>${r.image_url ? '<button type="button" class="btn ghost small" data-rm-img style="margin-top:8px">Убрать картинку</button>' : ''}</div></div>
    <input type="hidden" name="image_url" value="${esc(r.image_url || '')}">
    <div class="field"><label for="r-title">Название</label><input id="r-title" name="title" required maxlength="80" value="${esc(r.title || '')}" autocomplete="off"></div>
    <div class="field"><label for="r-desc">Описание</label><textarea id="r-desc" name="description" rows="3" maxlength="1000">${esc(r.description || '')}</textarea></div>
    <label class="check"><input type="checkbox" name="is_private"${r.is_private ? ' checked' : ''}> Приватная комната</label>
    <div class="field" data-minrole${r.is_private ? '' : ' hidden'}><label for="r-role">Кто видит приватную комнату</label><select id="r-role" name="min_view_role">${roleOptions(r.min_view_role || 'goy')}</select></div>`;
}
function wirePrivate(form) {
  const cb = form.is_private, mr = $('[data-minrole]', form);
  cb.onchange = () => { mr.hidden = !cb.checked; };
}
function roomBody(f) {
  if (f.dataset.busy === '1') throw new Error('Дождитесь загрузки картинки');
  const title = f.title.value.trim(); if (!title) throw new Error('Укажите название');
  return { title, description: f.description.value.trim(), image_url: f.image_url.value || null,
    is_private: f.is_private.checked, min_view_role: f.is_private.checked ? f.min_view_role.value : 'user' };
}
function rerenderRoom() { if (S.view === 'chars') { renderChars(); renderRight(); } else route(); }
function roomSettings() {
  const r = S.room;
  const form = modal('Настройки комнаты', roomFields(r) + `
    <button type="button" class="btn ghost" data-archive>${r.status === 'active' ? 'Отправить в архив' : 'Вернуть из архива'}</button>
    <button type="button" class="btn danger" data-del-room>Удалить комнату</button>`, {
    onSubmit: async f => {
      const body = roomBody(f);
      await api(`rooms?id=eq.${r.id}`, { method: 'PATCH', body, prefer: 'return=minimal' });
      Object.assign(S.room, body); rerenderRoom();
    },
  });
  wirePrivate(form); wireRoomImage(form);
  $('[data-del-room]', form).onclick = async () => {
    if (!confirm(`Удалить комнату «${r.title}» со всеми персонажами-слотами и постами? Отменить нельзя.`)) return;
    try {
      const del = await api(`rooms?id=eq.${r.id}`, { method: 'DELETE', prefer: 'return=representation' });
      if (!del?.length) throw new Error('Нет прав на удаление');
      form.close(); leaveRoomState(); toast('Комната удалена'); location.hash = '#/rooms';
    } catch (e) { toast(errText(e), true); }
  };
  $('[data-archive]', form).onclick = async () => {
    const status = r.status === 'active' ? 'archived' : 'active';
    if (status === 'archived' && !confirm('Архив: комната станет только для чтения. Продолжить?')) return;
    try { await api(`rooms?id=eq.${r.id}`, { method: 'PATCH', body: { status }, prefer: 'return=minimal' }); S.room.status = status; form.close(); rerenderRoom(); }
    catch (e) { toast(errText(e), true); }
  };
}

/* каталог комнат */
let roomsQ = '';
async function viewRooms() {
  S.view = 'rooms'; updateNav();
  const canCreate = S.uid && rank() >= 1;
  main.innerHTML = head('Комнаты', { extra: canCreate ? `<a class="btn small blue" href="#/new">${I.plus} Создать комнату</a>` : '' })
    + `<div class="search">${I.search}<input type="search" placeholder="Поиск комнат" aria-label="Поиск комнат" value="${esc(roomsQ)}" enterkeyhint="search"></div>
    ${S.uid && !canCreate ? '<div class="composer-hint" style="font-size:14px">Создавать комнаты могут ГОЙ и выше.</div>' : ''}
    <div id="roomList">${loader()}</div>`;
  renderRight();
  const inp = $('.search input', main); let t;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { roomsQ = inp.value.trim(); loadRooms(); }, 300); };
  loadRooms();
}
async function loadRooms() {
  const list = $('#roomList'); if (!list) return;
  const q = roomsQ ? `&or=(title.ilike.*${likeQ(roomsQ)}*,description.ilike.*${likeQ(roomsQ)}*)` : '';
  let rows;
  try { rows = await api(`rooms?select=id,title,description,is_private,status,image_url,max_slots,owner_id,created_at,slots(player_id)&order=status.asc,created_at.desc&limit=100${q}`); }
  catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (!rows.length) { list.innerHTML = `<div class="empty"><h2>${roomsQ ? 'Ничего не найдено' : 'Комнат пока нет'}</h2><p>${roomsQ ? 'Попробуйте другой запрос.' : 'Создайте первую комнату.'}</p>${!roomsQ && S.uid && rank() >= 1 ? `<a class="btn blue" href="#/new" style="margin-top:16px">${I.plus} Создать комнату</a>` : ''}</div>`; return; }
  list.innerHTML = rows.map(r => {
    const taken = r.slots.filter(s => s.player_id).length;
    return `<a class="room-item" href="#/r/${r.id}">${roomIcon(r)}
      <div style="min-width:0;flex:1"><div class="t">${esc(r.title)} ${r.is_private ? I.lock : ''} ${r.status === 'archived' ? '<span class="badge">Архив</span>' : ''} ${r.owner_id === S.uid ? '<span class="badge blue">Ваша</span>' : ''}</div>
      ${r.description ? `<div class="d">${esc(r.description)}</div>` : ''}
      <div class="m">${taken}/${r.slots.length} в игре</div></div></a>`;
  }).join('');
}

/* создание комнаты */
function viewCreate() {
  S.view = 'create'; updateNav();
  if (!S.uid || rank() < 1) { main.innerHTML = head('Новая комната', { back: true }) + '<div class="empty"><h2>Нет доступа</h2><p>Создавать комнаты могут ГОЙ и выше.</p></div>'; return; }
  main.innerHTML = head('Новая комната', { back: true }) + `<form class="form" novalidate>${roomFields()}
    <div><div style="font-weight:700;margin-bottom:4px">Персонажи <span class="form-note" data-count></span></div>
      <div class="form-note" style="margin-bottom:8px">Отметьте, кто будет в комнате. Новых можно создать прямо здесь или во вкладке «Персонажи».</div>
      <div data-picker></div></div>
    <div class="form-err" role="alert"></div>
    <button class="btn blue" type="submit">Создать комнату</button></form>`;
  const form = $('form', main);
  wirePrivate(form); wireRoomImage(form);
  const picker = charPicker();
  $('[data-picker]', form).replaceWith(picker);
  const cnt = $('[data-count]', form);
  picker.addEventListener('change', () => {
    const n = picker.getSelected().length; cnt.textContent = n ? `· выбрано ${n}` : '';
  });
  form.onsubmit = async e => {
    e.preventDefault();
    const err = $('.form-err', form), btn = $('button[type=submit]', form);
    err.textContent = '';
    try {
      const body = roomBody(form);
      const chars = picker.getSelected();
      const hs = chars.map(c => c.handle.toLowerCase());
      if (new Set(hs).size !== hs.length) throw new Error('У выбранных персонажей совпадают @ники');
      btn.disabled = true;
      const [room] = await api('rooms', { method: 'POST', body: { ...body, owner_id: S.uid }, prefer: 'return=representation' });
      if (chars.length) {
        try { await api('slots', { method: 'POST', body: chars.map(c => ({ room_id: room.id, character_id: c.id, char_name: c.char_name, handle: c.handle })), prefer: 'return=minimal' }); }
        catch (e2) { toast('Комната создана, но персонажи не добавились: ' + errText(e2), true); location.hash = `#/r/${room.id}/chars`; return; }
      }
      toast('Комната создана');
      location.hash = `#/r/${room.id}/chars`;
    } catch (e2) { err.textContent = errText(e2); btn.disabled = false; }
  };
}

/* правая колонка */
function renderRight() {
  if (!matchMedia('(min-width: 1024px)').matches) { right.innerHTML = ''; return; }
  if (!S.room || ['rooms', 'create', 'lib', 'char'].includes(S.view)) {
    right.innerHTML = `<div class="panel"><h2>RP</h2><p>Заходите в комнату, занимайте персонажа и отыгрывайте его: посты, ответы, лайки. Все в комнате видят ленту.</p></div>`;
    return;
  }
  const r = S.room;
  right.innerHTML = `<div class="panel"><div class="panel-room">${roomIcon(r, 'big')}<h2>${esc(r.title)} ${r.is_private ? I.lock : ''}</h2></div>${r.description ? `<p>${esc(r.description)}</p>` : ''}
    ${r.status === 'archived' ? '<p><span class="badge">Архив · только чтение</span></p>' : ''}</div>
    <div class="panel"><h2>Персонажи</h2>
      ${S.slots.slice(0, 8).map(s => `<a class="row" href="#/r/${r.id}/chars">${avatar(s, 'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(s.char_name)}</div><div class="h">@${esc(s.handle)}</div></div>${s.player_id ? '' : '<span class="free">свободен</span>'}</a>`).join('')}
      <a class="link" href="#/r/${r.id}/chars">Все персонажи</a></div>
    <div class="panel"><a class="link" href="#/rooms">Другие комнаты</a></div>`;
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderRight, 200); });

/* ── роутер ─────────────────────────────────────────────── */
function route() {
  closeMenu();
  $$('.overlay, .lightbox').forEach(o => o.remove()); document.body.style.overflow = '';
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  const guard = id => /^[0-9a-f-]{36}$/i.test(id || '');
  if (parts[0] === 'r' && guard(parts[1])) {
    if (parts[2] === 'p' && guard(parts[3])) return viewThread(parts[1], parts[3]);
    if (parts[2] === 'chars') return viewChars(parts[1]);
    return viewFeed(parts[1]);
  }
  if (parts[0] === 'new') return viewCreate();
  if (parts[0] === 'chars') return viewLibrary();
  if (parts[0] === 'c' && guard(parts[1])) return viewCharacter(parts[1]);
  if (parts[0] === 'rooms') return viewRooms();
  // главная: последняя комната или каталог
  let last = null; try { last = localStorage.getItem(LS_ROOM); } catch {}
  if (guard(last)) return viewFeed(last).then(() => { if (!S.room) { try { localStorage.removeItem(LS_ROOM); } catch {} location.replace('#/rooms'); } });
  location.replace('#/rooms');
}

/* ── старт ──────────────────────────────────────────────── */
const DEV_UIDS = ['23c6cb47-27b0-45ac-8fd9-c43b84d57aba']; // на время разработки RP виден только этим аккаунтам
async function init() {
  const sess = readSession();
  const token = await getToken();
  if (!token || !DEV_UIDS.includes(sess?.user?.id)) {
    document.title = 'renah0cki';
    document.body.innerHTML = '';
    location.replace('/');
    return;
  }
  if (token && sess?.user?.id) {
    S.uid = sess.user.id;
    try { S.me = await rpc('ensure_profile'); } catch (e) { console.warn('rp profile', e); }
  } else {
    document.body.classList.add('guest');
    document.body.insertAdjacentHTML('beforeend', '<div class="guest-bar"><span>Смотрите как гость. Войдите, чтобы играть.</span><a class="btn small" href="/">Войти</a></div>');
  }
  renderMe();
  addEventListener('hashchange', route);
  route();
}
addEventListener('storage', e => { if (e.key === LS_SESSION && !e.newValue) location.reload(); });
init();
})();
