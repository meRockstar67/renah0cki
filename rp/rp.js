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
  leave: '<svg viewBox="0 0 24 24"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/></svg>',
  reply: '<svg viewBox="0 0 24 24"><path d="M4.5 11.5c0-4 3.4-7 7.5-7h.5c4.1 0 7.5 3.1 7.5 7s-3.4 7-7.5 7H11l-5 3.5V17a6.8 6.8 0 0 1-1.5-5.5z"/></svg>',
  rt: '<svg viewBox="0 0 24 24"><path d="M4 9l3-3 3 3M7 6v9a3 3 0 0 0 3 3h5M20 15l-3 3-3-3M17 18V9a3 3 0 0 0-3-3H9"/></svg>',
  like: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9-9.3C2 7.3 4.3 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3 0 5.3 2.8 4.3 6.2-1.5 4.7-9 9.3-9 9.3z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>',
  check1: '<svg viewBox="0 0 18 12"><path d="M2 6.5 5.5 10 12.5 2"/></svg>',
  check2: '<svg viewBox="0 0 18 12"><path d="M1 6.5 4.5 10 11.5 2M7.5 9 8.5 10 15.5 2"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5"/></svg>',
  lock: '<svg class="lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.7-6 7.5-6s6.7 2 7.5 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  cake: '<svg viewBox="0 0 24 24"><path d="M4 20.5h16M5 20.5v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 15.5c1.4 1 2.6 1 4 0s2.6-1 4 0 2.6 1 4 0 1.7-.6 2 0M12 11.5v-3M12 5.5c.9-.8 1-1.8 0-3-1 1.2-.9 2.2 0 3z"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.9-.3 5 1.4 5.5 4.4"/></svg>',
  verify: '<svg class="vip-check" viewBox="0 0 22 22" aria-label="VIP статус"><path fill="#1d9bf0" stroke="none" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"/><path fill="#fff" stroke="none" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>',
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
  'posts_one_repost': 'Уже есть репост', 'characters_handle_uq': 'Такой @ник уже занят другим персонажем', 'character not found': 'Персонаж не найден', 'avatar needs goy': 'Свою аватарку могут ставить ГОЙ и выше', 'banner needs vip': 'Шапку профиля могут ставить VIP и выше', 'bad word in handle': 'В @нике запрещённое слово', 'website_check': 'Неверная ссылка на сайт', 'JWT expired': 'Сессия истекла, обновите страницу',
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
async function api(path, { method = 'GET', body, prefer, schema = 'rp' } = {}) {
  const t = await getToken();
  const h = { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), 'Accept-Profile': schema };
  if (method !== 'GET') { h['Content-Profile'] = schema; h['Content-Type'] = 'application/json'; }
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let d = null;
  try { d = txt ? JSON.parse(txt) : null; } catch { d = txt; }
  if (!r.ok) throw new Error(d?.message || d?.hint || ('HTTP ' + r.status));
  return d;
}
const rpc = (fn, args = {}) => api('rpc/' + fn, { method: 'POST', body: args });

/* ── renah0cki coin: баланс в своём профиле — для всех вошедших ── */
const OWNER_ID = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
const COIN_LOGO = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';
const coinsVisible = () => !!S.uid;
const coinIco = () => `<img class="coin-ico" src="${COIN_LOGO}" alt="coin">`;
async function fillCoinBalance(root) {
  if (!coinsVisible()) return;
  try {
    const v = await api('rpc/coin_balance', { method: 'POST', body: {}, schema: 'public' });
    $$('[data-coin-bal]', root).forEach(el => { el.textContent = Number(v || 0).toLocaleString('ru-RU'); });
  } catch {}
}
async function fillUserCoinBalance(root, userId) {
  if (S.uid !== OWNER_ID || !userId) return;
  try {
    const v = await api('rpc/coin_admin_balance', { method: 'POST', body: { p_user: userId }, schema: 'public' });
    if (v == null) { $$('[data-admin-coin-wrap]', root).forEach(el => el.remove()); return; }
    $$('[data-admin-coin-bal]', root).forEach(el => { el.textContent = Number(v || 0).toLocaleString('ru-RU'); });
  } catch { $$('[data-admin-coin-wrap]', root).forEach(el => el.remove()); }
}

/* ── короткие ссылки ────────────────────────────────────── */
const isUuid = x => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x || '');
const keyFilter = k => isUuid(k) ? `id=eq.${k}` : `short_code=eq.${encodeURIComponent(k)}`;
const roomPath = (rm, sub = '') => `#/r/${rm.short_code || rm.id}${sub}`;
const postPath = pp => `#/p/${pp.short_code || pp.id}`;
const charPath = c => `#/c/${c.short_code || c.id}`;
const userPath = u => `#/u/${encodeURIComponent(u.username || u.user_id)}`;
async function copyLink(hash, msg = 'Ссылка скопирована') {
  // короткая ссылка: #/p/КОД → /y/КОД, #/r/КОД → /y/r/КОД и т.д.
  const h = hash.replace(/^#\//, '');
  const url = `${location.origin}/y/${h.startsWith('p/') ? h.slice(2) : h}`;
  try { await navigator.clipboard.writeText(url); toast(msg); } catch { prompt('Ссылка', url); }
}

/* ── состояние ──────────────────────────────────────────── */
const S = {
  uid: null, me: null,            // rp.profiles
  room: null, slots: [], slotMap: new Map(),
  actSlot: null,                  // от чьего имени пишем
  liked: new Set(), reposted: new Map(), // post_id → id репоста
  posts: new Map(),               // кэш постов по id
  view: null, viewArg: null,
  mySlots: [], userReposted: new Set(), userLiked: new Set(), dmAs: null, mineScope: '',
};
// действующая роль: старшая из выданной (rp_role) и купленной (paid_role, пока не истекла)
const paidActive = p => !!(p?.paid_role && p.paid_until && new Date(p.paid_until).getTime() > Date.now());
const effRole = p => (paidActive(p) && (ROLE_RANK[p.paid_role] ?? 0) > (ROLE_RANK[p?.rp_role] ?? 0)) ? p.paid_role : (p?.rp_role || 'user');
const rank = () => ROLE_RANK[effRole(S.me)] ?? 0;
const isVip = p => (ROLE_RANK[effRole(p)] ?? 0) >= 2;
const slotVip = s => isVip(s?.player || s?.user);
const vipBadge = () => `<span class="vip-badge" data-vip-info title="Статус VIP в Y (купленная подписка, не официальный аккаунт)">${I.verify}</span>`;
function vipInfoDialog() {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal vip-info-modal" role="dialog" aria-modal="true" aria-label="Статус VIP">
    <div class="vip-info-body">
      <div class="vip-info-ic">${I.verify}</div>
      <h2>Статус VIP в Y</h2>
      <p>Эта синяя галочка показывает, что игрок приобрёл статус <b>VIP</b> в Y за renah0cki coin.</p>
      <p class="vip-info-sub">Галочка <b>не означает</b> официальный аккаунт и не подтверждает, что за профилем или персонажем стоит реальный человек.</p>
      <div class="vip-info-acts">
        <button type="button" class="btn blue" data-close>Понятно</button>
        ${rank() < 2 ? '<a class="btn ghost" href="#/settings" data-close>Оформить VIP</a>' : ''}
      </div>
    </div>
  </div>`;
  const close = () => { ov.remove(); if (!$('.overlay')) document.body.style.overflow = ''; };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
  document.body.append(ov); document.body.style.overflow = 'hidden';
}
document.addEventListener('click', e => {
  const vb = e.target.closest('[data-vip-info]');
  if (!vb) return;
  e.preventDefault(); e.stopPropagation();
  vipInfoDialog();
});
const isStaff = () => rank() >= 3;
const isOwner = () => !!S.room && !!S.uid && (S.room.owner_id === S.uid || isStaff());
const mySlot = () => S.slots.find(s => s.player_id && s.player_id === S.uid) || null;
const canWrite = () => !!S.uid && !!S.room && S.room.status === 'active' && !S.room.read_only && !!mySlot();
function actingSlot() {
  return S.room ? mySlot() : null;
}

const SLOT_SEL = 'id,char_name,handle,avatar_url,character_id,player:profiles!player_id(rp_role,paid_role,paid_until)';
const P_FIELDS = 'id,short_code,room_id,slot_id,body,images,voice_url,reply_to,quote_of,repost_of,like_count,reply_count,repost_count,is_deleted,created_at';
const AU_SEL = 'author:author_user(user_id,nick,y_name,avatar_url,y_avatar_url,username,rp_role,paid_role,paid_until)';
const P_SEL = `${P_FIELDS},slot:slots!slot_id(${SLOT_SEL}),${AU_SEL},parent:reply_to(id,slot:slots!slot_id(handle),author:author_user(username)),`
  + `quoted:quote_of(id,short_code,body,images,is_deleted,created_at,slot:slots!slot_id(${SLOT_SEL}),${AU_SEL}),`
  + `orig:repost_of(${P_FIELDS},slot:slots!slot_id(${SLOT_SEL}),${AU_SEL},parent:reply_to(id,slot:slots!slot_id(handle),author:author_user(username)),quoted:quote_of(id,short_code,body,images,is_deleted,created_at,slot:slots!slot_id(${SLOT_SEL}),${AU_SEL}))`;
const P_SEL_ROOM = `${P_SEL},room:room_id(id,title,short_code,image_url)`;
// ответ «от себя» (без персонажа): подставляем имя/аватар пользователя как «слот»
function normAuthor(x) {
  if (!x) return;
  if (!x.slot && x.author) x.slot = { char_name: yName(x.author) || x.author.username || 'Пользователь', handle: x.author.username || '', avatar_url: yAvatar(x.author), user: x.author };
  if (x.parent && !x.parent.slot && x.parent.author) x.parent.slot = { handle: x.parent.author.username || '' };
  if (x.quoted) normAuthor(x.quoted);
  if (x.orig) normAuthor(x.orig);
}
function cache(p) {
  if (!p) return p;
  normAuthor(p);
  S.posts.set(p.id, p);
  if (p.orig) S.posts.set(p.orig.id, p.orig);
  return p;
}

/* ── загрузка комнаты ───────────────────────────────────── */
async function loadRoom(key) {
  if (S.room && (S.room.id === key || S.room.short_code === key)) return S.room;
  const rows = await api(`rooms?${keyFilter(key)}&select=*`);
  if (!rows?.length) throw new Error('Комната не найдена или нет доступа');
  S.room = rows[0]; S.actSlot = null; S.dmAs = null; S.posts.clear();
  await loadSlots();
  await loadMine();
  subscribeRoom(S.room.id);
  return S.room;
}
async function ensureRoomMine() { if (S.room && S.mineScope !== 'room:' + S.room.id) await loadMine(); }
async function loadSlots() {
  if (!S.room) return;
  S.slots = await api(`slots?room_id=eq.${S.room.id}&select=*,player:profiles!player_id(nick,rp_role,paid_role,paid_until)&order=created_at.asc`) || [];
  S.slotMap = new Map(S.slots.map(s => [s.id, s]));
  updateNav();
}
async function loadMine() {
  S.liked = new Set(); S.reposted = new Map(); S.mineScope = S.room ? 'room:' + S.room.id : '';
  const a = actingSlot();
  if (!a || !S.uid) return;
  const [likes, rts] = await Promise.all([
    api(`likes?slot_id=eq.${a.id}&select=post_id&limit=5000`),
    api(`posts?slot_id=eq.${a.id}&repost_of=not.is.null&select=id,repost_of&limit=5000`),
  ]);
  likes.forEach(l => S.liked.add(l.post_id));
  rts.forEach(r => S.reposted.set(r.repost_of, r.id));
}
// все мои персонажи во всех комнатах (для главной и профиля)
async function loadMySlots() {
  if (!S.uid) return;
  S.mySlots = await api(`slots?player_id=eq.${S.uid}&select=id,room_id,char_name,handle,avatar_url,character_id,room:room_id(id,title,short_code,image_url,status)`) || [];
}
async function loadUserLikes() {
  if (!S.uid) return;
  const rows = await api(`user_likes?user_id=eq.${S.uid}&select=post_id&limit=5000`);
  S.userLiked = new Set(rows.map(x => x.post_id));
}
async function loadUserReposts() {
  if (!S.uid) return;
  const rows = await api(`user_reposts?user_id=eq.${S.uid}&select=post_id&limit=5000`);
  S.userReposted = new Set(rows.map(x => x.post_id));
}
async function loadMineAll() {
  S.liked = new Set(); S.reposted = new Map(); S.mineScope = 'all';
  if (!S.uid) return;
  await loadMySlots();
  const ids = S.mySlots.map(x => x.id);
  if (!ids.length) return;
  const [likes, rts] = await Promise.all([
    api(`likes?slot_id=in.(${ids.join(',')})&select=post_id&limit=5000`),
    api(`posts?slot_id=in.(${ids.join(',')})&repost_of=not.is.null&select=id,repost_of&limit=5000`),
  ]);
  likes.forEach(l => S.liked.add(l.post_id));
  rts.forEach(x => S.reposted.set(x.repost_of, x.id));
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
    .on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'dms', filter: 'room_id=eq.' + id }, p => onDmInsert(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'dms', filter: 'room_id=eq.' + id }, p => onDmUpdate(p.new))
    .on('postgres_changes', { event: '*', schema: 'rp', table: 'slots', filter: 'room_id=eq.' + id }, () => onSlotsChange())
    .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'rooms', filter: 'id=eq.' + id }, p => { S.room = { ...S.room, ...p.new }; renderRight(); })
    .subscribe();
}
let gchan = null;
async function subscribeGlobal() {
  const c = rtClient(); if (!c || gchan) return;
  c.realtime.setAuth((await getToken()) || SB_KEY);
  gchan = c.channel('rp-global')
    .on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'posts' }, p => onPostInsert(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'posts' }, p => onPostUpdate(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'rp', table: 'posts' }, p => onPostDelete(p.old));
  if (S.uid) gchan.on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'notifications', filter: 'user_id=eq.' + S.uid }, p => onNotifInsert(p.new));
  if (S.uid && callsOk()) gchan.on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'calls', filter: 'kind=eq.dm' }, p => onCallInsert(p.new));
  gchan.subscribe();
}
setInterval(async () => { if (rt) rt.realtime.setAuth((await getToken()) || SB_KEY); }, 4 * 60e3);

async function onPostInsert(row) {
  if (S.posts.has(row.id)) return;
  const box = row.reply_to ? document.querySelector(`[data-replies="${row.reply_to}"]`) : null;
  const inFeed = S.room && row.room_id === S.room.id && S.view === 'feed' && !row.reply_to && !row.repost_of;
  const onHome = S.view === 'home' && !row.reply_to && !row.repost_of && (homeTab === 'all' || (homeRooms || []).includes(row.room_id));
  if (!box && !inFeed && !onHome) return;
  let p;
  try { p = cache((await api(`posts?id=eq.${row.id}&select=${P_SEL_ROOM}`))[0]); } catch { return; }
  if (!p) return;
  if (p.repost_of && (p.slot_id === actingSlot()?.id || S.mySlots.some(x => x.id === p.slot_id))) { S.reposted.set(p.repost_of, p.id); refreshRtState(p.repost_of); }
  if (box) {
    if (box.classList.contains('inline-thread') && !box.dataset.loaded) return; // ветка ещё грузится
    box.append(renderReplyNode(p, []));
    const tw = box.closest('.thread-wrap'); if (tw) tw.hidden = false;
  } else if (onHome) {
    const list = $('#homeList'); if (!list) return;
    $('.empty', list)?.remove();
    list.prepend(renderPost(p, { showRoom: true, threads: true }));
    if (window.scrollY > 200) showNewPill();
  } else if (S.view === 'feed' && !p.reply_to) {
    const list = $('#feedList'); if (!list) return;
    $('.empty', list)?.remove();
    const el = renderPost(p, { threads: true });
    if (window.scrollY < 200) { list.prepend(el); }
    else { list.prepend(el); showNewPill(); }
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
const voiceHtml = u => u && /^https:\/\/cdn\.renah0cki\.xyz\/file\//.test(u) ? `<audio class="voice" src="${esc(u)}" controls preload="none" onclick="event.stopPropagation()"></audio>` : '';
function mediaHtml(imgs) {
  if (!imgs?.length) return '';
  return `<div class="media n${imgs.length}">${imgs.map(u => `<img src="${esc(u)}" alt="" loading="lazy" data-zoom>`).join('')}</div>`;
}
function quoteHtml(q) {
  if (!q) return '';
  const body = q.is_deleted ? '<div class="deleted">Этот пост удалён.</div>'
    : `<div class="text">${richText(q.body)}</div>${mediaHtml(q.images)}`;
  return `<div class="quote-card" data-open="${q.id}">
    <div class="post-top">${avatar(q.slot, 'xs')}<span class="name">${esc(q.slot?.char_name)}</span>${slotVip(q.slot) ? vipBadge() : ''}<span class="handle">@${esc(q.slot?.handle)}</span><span class="dot">·</span><time>${ago(q.created_at)}</time></div>
    ${body}</div>`;
}
function roomLine(rm) {
  return rm ? `<a class="post-room" href="${roomPath(rm)}">${roomIcon(rm, 'mini')}<span>${esc(rm.title)}</span></a>` : '';
}
function refreshRtState(id) {
  $$(`[data-cnt="${id}"] .act.rt`).forEach(b => b.classList.toggle('on', S.reposted.has(id) || S.userReposted.has(id)));
}
function actionsHtml(p, big = false) {
  const liked = S.liked.has(p.id) || S.userLiked.has(p.id), rted = S.reposted.has(p.id) || S.userReposted.has(p.id);
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
  return `${p.body ? `<div class="text">${richText(p.body)}</div>` : ''}${voiceHtml(p.voice_url)}${mediaHtml(p.images)}${quoteHtml(p.quoted)}`;
}
function canManage(p) {
  if (!S.uid) return false;
  if (isStaff() || S.mySlots.some(x => x.id === p.slot_id)) return true;
  if (!p.slot_id && p.slot?.user?.user_id === S.uid) return true;
  return !!S.room && S.room.id === p.room_id && (isOwner() || mySlot()?.id === p.slot_id);
}
function renderPost(p, { line = false, showRoom = false, threads = false } = {}) {
  const wrap = document.createElement('div');
  if (p.repost_of && p.orig) {
    const o = p.orig;
    wrap.className = 'post-wrap';
    wrap.dataset.post = p.id;
    wrap.innerHTML = `<div class="post-ctx">${I.rt}<span>${esc(p.slot?.char_name)} сделал(а) репост</span>${showRoom && p.room ? `<span class="dot">·</span>${roomLine(p.room)}` : ''}</div>`;
    wrap.append(renderPost(o, { threads }));
    return wrap;
  }
  if (showRoom && p.room) {
    wrap.className = 'post-wrap';
    wrap.dataset.post = p.id;
    wrap.innerHTML = `<div class="post-ctx room-ctx">${roomLine(p.room)}</div>`;
    const inner = renderPost(p, { threads }); inner.removeAttribute('data-post');
    wrap.append(inner);
    return wrap;
  }
  const el = document.createElement('article');
  el.className = 'post' + (line ? ' has-line' : '');
  el.dataset.post = p.id; el.dataset.open = p.id;
  el.innerHTML = `${line ? '<div class="thread-line"></div>' : ''}
    <a href="${p.slot?.user ? userPath(p.slot.user) : p.slot?.character_id ? `#/c/${p.slot.character_id}` : `#/r/${p.room_id}/chars`}" class="av-link" aria-label="${esc(p.slot?.char_name)}">${avatar(p.slot)}</a>
    <div class="post-main">
      <div class="post-top"><span class="name">${esc(p.slot?.char_name)}</span>${slotVip(p.slot) ? vipBadge() : ''}${p.slot?.user ? '<span class="viewer-tag">зритель</span>' : ''}<span class="handle">@${esc(p.slot?.handle)}</span><span class="dot">·</span><time datetime="${p.created_at}" title="${esc(fullDate(p.created_at))}">${ago(p.created_at)}</time>
        ${!p.is_deleted && S.uid ? `<button class="more" data-act="more" aria-label="Ещё">${I.more}</button>` : ''}</div>
      ${p.reply_to && p.parent?.slot ? `<div class="reply-to">В ответ <b>@${esc(p.parent.slot.handle)}</b></div>` : ''}
      <div data-body="${p.id}">${bodyHtml(p)}</div>
      ${actionsHtml(p)}
      ${threads && !p.is_deleted ? `<div class="thread-wrap" data-tw="${p.id}" hidden>
        <div class="inline-thread replies" data-inline="${p.id}" data-replies="${p.id}"${p.reply_count ? '' : ' data-loaded="1"'}></div>
        <button type="button" class="thread-reply" data-act="compose">${I.reply}<span>Ответить</span></button></div>` : ''}
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
  el.innerHTML = `<div class="post-top who" style="gap:12px">${avatar(p.slot)}<div style="min-width:0"><span class="name">${esc(p.slot?.char_name)}${slotVip(p.slot) ? vipBadge() : ''}</span><span class="handle">@${esc(p.slot?.handle)}</span></div>
      ${!p.is_deleted && S.uid ? `<button class="more" data-act="more" aria-label="Ещё">${I.more}</button>` : ''}</div>
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
  if (open && !window.getSelection()?.toString()) { const pp = S.posts.get(open.dataset.open); location.hash = pp ? postPath(pp) : `#/p/${open.dataset.open}`; }
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
  location.hash = roomPath(S.room, '/chars');
  return true;
}

const inRoomCtx = p => !!S.room && S.room.id === p.room_id && (S.view === 'feed' || S.view === 'thread');
// от какого персонажа действовать с этим постом: в комнате — текущий, вне её — мой персонаж в той комнате
function slotFor(p) {
  if (inRoomCtx(p)) return canWrite() ? actingSlot() : null;
  return S.mySlots.find(x => x.room_id === p.room_id && x.room?.status !== 'archived') || null;
}
async function postAction(act, p, btn) {
  if (act === 'share') return copyLink(postPath(p), 'Ссылка на пост скопирована');
  if (act === 'more') return postMenu(p, btn);
  if (act === 'rt') return repostMenu(p, btn);
  // в ленте кнопка комментария сворачивает/разворачивает ветку (если ответы есть)
  const tw = btn.closest('.post-main')?.querySelector(`:scope > .thread-wrap[data-tw="${p.id}"]`);
  if (act === 'reply' && tw && p.reply_count) {
    if (!tw.hidden) { tw.hidden = true; return; }
    tw.hidden = false;
    const box = $('.inline-thread', tw);
    if (!box.dataset.loaded) {
      box.innerHTML = '<div class="thread-loading">Загрузка ответов…</div>';
      try { const ch = await loadReplyTree(p.id); box.replaceChildren(...(ch.get(p.id) || []).map(x => renderReplyNode(x, ch))); box.dataset.loaded = '1'; }
      catch (e) { box.innerHTML = ''; tw.hidden = true; toast(errText(e), true); }
    }
    return;
  }
  if (needLogin()) return;
  if (act === 'compose') act = 'reply';
  const a = slotFor(p);
  if (act === 'reply') {
    if (!a) return inRoomCtx(p) ? needSlot() : toast('Отвечать могут только участники комнаты — займите персонажа', true);
    return openComposer({ replyTo: p, slot: a });
  }
  if (act === 'like' && !a) return toggleUserLike(p, btn);
  if (!a) return;
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

async function toggleUserLike(p, btn) {
  const on = S.userLiked.has(p.id);
  $$(`[data-cnt="${p.id}"] .act.like`).forEach(b => b.classList.toggle('on', !on));
  btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 300);
  on ? S.userLiked.delete(p.id) : S.userLiked.add(p.id);
  try {
    if (on) await api(`user_likes?post_id=eq.${p.id}&user_id=eq.${S.uid}`, { method: 'DELETE' });
    else await api('user_likes', { method: 'POST', body: { post_id: p.id, user_id: S.uid }, prefer: 'return=minimal' });
  } catch (err) {
    on ? S.userLiked.add(p.id) : S.userLiked.delete(p.id);
    $$(`[data-cnt="${p.id}"] .act.like`).forEach(b => b.classList.toggle('on', on));
    toast(errText(err), true);
  }
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
  if (needLogin()) return;
  const items = [];
  const a = slotFor(p), mine = S.reposted.get(p.id);
  if (mine) items.push({ icon: I.rt, label: 'Отменить репост персонажа', run: async () => {
    try { await rpc('delete_post', { p_post: mine }); S.reposted.delete(p.id); onPostDelete({ id: mine }); refreshRtState(p.id); }
    catch (e) { toast(errText(e), true); }
  } });
  else if (a) items.push({ icon: I.rt, label: `Репост от ${a.char_name}`, run: async () => {
    try {
      const [x] = await api('posts', { method: 'POST', body: { room_id: p.room_id, slot_id: a.id, repost_of: p.id }, prefer: 'return=representation' });
      S.reposted.set(p.id, x.id); refreshRtState(p.id); toast('Репост сделан');
    } catch (e) { toast(errText(e), true); }
  } });
  const onPage = S.userReposted.has(p.id);
  items.push({ icon: I.user, label: onPage ? 'Убрать со своей страницы' : 'Репост к себе на страницу', run: () => toggleUserRepost(p) });
  if (a && inRoomCtx(p)) items.push({ icon: I.quote, label: 'Цитировать', run: () => openComposer({ quoteOf: p }) });
  menu(btn, items);
}
async function toggleUserRepost(p) {
  const on = S.userReposted.has(p.id);
  try {
    if (on) await api(`user_reposts?user_id=eq.${S.uid}&post_id=eq.${p.id}`, { method: 'DELETE' });
    else await api('user_reposts', { method: 'POST', body: { user_id: S.uid, post_id: p.id }, prefer: 'return=minimal' });
    on ? S.userReposted.delete(p.id) : S.userReposted.add(p.id);
    refreshRtState(p.id);
    if (on) $$(`[data-post="ur-${p.id}"]`).forEach(el => el.remove());
    toast(on ? 'Убрано с вашей страницы' : 'Репост на вашу страницу');
  } catch (e) { toast(errText(e), true); }
}
const isMine = p => !!S.uid && (S.mySlots.some(x => x.id === p.slot_id) || (!p.slot_id && p.slot?.user?.user_id === S.uid));
function postMenu(p, btn) {
  const items = [];
  if (!isMine(p)) items.push({ icon: I.flag, label: 'Пожаловаться', run: () => reportDialog(p) });
  if (canManage(p)) items.push({ icon: I.trash, label: 'Удалить', danger: true, run: async () => {
    if (!confirm('Удалить пост? Отменить нельзя.')) return;
    try { await rpc('delete_post', { p_post: p.id }); p.is_deleted = true; onPostUpdate({ ...p, is_deleted: true }); toast('Пост удалён'); }
    catch (e) { toast(errText(e), true); }
  } });
  if (items.length) menu(btn, items);
}
const REPORT_REASONS = ['Оскорбления', 'Травля', 'Спам', '18+ / NSFW', 'Запрещённые слова', 'Другое'];
function reportDialog(p) {
  const form = modal('Пожаловаться', `
    <div class="form-note">Жалобу увидят модераторы. Выберите причину:</div>
    <div class="rep-reasons" role="radiogroup">${REPORT_REASONS.map((r, i) => `<label class="rep-opt"><input type="radio" name="reason" value="${esc(r)}"${i ? '' : ' checked'}><span>${esc(r)}</span></label>`).join('')}</div>
    <div class="field"><label for="rep-d">Подробнее (необязательно)</label><textarea id="rep-d" name="details" rows="3" maxlength="500"></textarea></div>`, {
    submitLabel: 'Отправить',
    onSubmit: async f => {
      const reason = (f.querySelector('input[name="reason"]:checked') || {}).value || 'Другое';
      try { await api('reports', { method: 'POST', body: { post_id: p.id, reason, details: f.details.value.trim() }, prefer: 'return=minimal' }); }
      catch (e) { if (String(e.message).includes('duplicate')) throw new Error('Вы уже жаловались на этот пост'); throw e; }
      toast('Жалоба отправлена модераторам');
    },
  });
}

function lightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<button class="icon-btn" aria-label="Закрыть">${I.close}</button><img src="${esc(src)}" alt="">`
    + (gifOk() && isGifUrl(src) ? `<button type="button" class="btn small lb-save" data-save-gif>Сохранить в мои GIF</button>` : '');
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  lb.onclick = e => { if (e.target.closest('[data-save-gif]')) { e.stopPropagation(); saveGif(src, e.target.closest('[data-save-gif]')); return; } close(); };
  document.addEventListener('keydown', onKey);
  document.body.append(lb);
}

/* ── GIF (ГОЙ и выше; пока только meRockstar) ──────────────── */
const featDev = () => !!S.uid; // GIF и чтение чужих ЛС открыты всем (по роли)
const gifOk = () => featDev() && rank() >= 1;
// голосовые — ГОЙ и выше (проверка и в базе)
const voiceOk = () => rank() >= 1 && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
async function recordVoice(host, onSend) {
  if ($('.vrec', host)) return;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast('Нет доступа к микрофону', true); }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported?.(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [];
  const bar = document.createElement('div');
  bar.className = 'vrec';
  bar.innerHTML = `<span class="vrec-dot"></span><b class="vrec-t">0:00</b><span class="vrec-lbl">Идёт запись…</span><button type="button" class="btn ghost small" data-vx>Отмена</button><button type="button" class="btn blue small" data-vok>Отправить</button>`;
  host.append(bar);
  const t0 = Date.now(); let ok = false;
  const stop = v => { ok = v; clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(x => x.stop()); };
  const tick = setInterval(() => { const sec = Math.floor((Date.now() - t0) / 1000); $('.vrec-t', bar).textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; if (sec >= 120) stop(true); }, 250);
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = async () => {
    if (!ok || Date.now() - t0 < 400) { bar.remove(); return; }
    $('.vrec-lbl', bar).textContent = 'Отправляем…'; $$('button', bar).forEach(b => { b.disabled = true; });
    try {
      const type = (rec.mimeType || 'audio/webm').split(';')[0], t = await getToken();
      if (!t) throw new Error('Нужно войти');
      const r = await fetch(`${CDN}/upload`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': type, 'X-File-Name': 'voice', 'X-User-Id': S.uid }, body: new Blob(chunks, { type }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || 'Ошибка загрузки');
      await onSend(d.url);
    } catch (e) { toast(errText(e), true); }
    bar.remove();
  };
  bar.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('[data-vx]')) stop(false); if (e.target.closest('[data-vok]')) stop(true); });
  rec.start();
}
const peekOk = () => featDev() && rank() >= 1;
const isGiphy = u => /^https:\/\/media\.giphy\.com\/media\/[A-Za-z0-9]{4,40}\/giphy\.gif$/.test(u || '');
const isGifUrl = u => isGiphy(u) || /^https:\/\/cdn\.renah0cki\.xyz\/file\/rp\/[0-9a-f-]{36}\/[A-Za-z0-9_.-]+\.gif$/i.test(u || '');
async function saveGif(url, btn) {
  try {
    await api('saved_gifs', { method: 'POST', body: { url }, prefer: 'return=minimal' });
    toast('Сохранено в «Мои GIF»');
  } catch (e) {
    if (String(e.message).includes('duplicate')) toast('Уже в «Мои GIF»'); else toast(errText(e), true);
  }
  if (btn) { btn.disabled = true; btn.textContent = 'В «Мои GIF»'; }
}
// окно выбора GIF: поиск GIPHY, «Мои», загрузка своего .gif. onPick(url)
function gifPicker(onPick) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal gif-modal" role="dialog" aria-modal="true" aria-label="GIF"><div class="head"><div class="head-row"><button type="button" class="icon-btn" data-close aria-label="Закрыть">${I.close}</button><div class="head-title"><h1>GIF</h1></div></div>
      <div class="tabs" role="tablist"><button type="button" data-gtab="mine">Мои</button><button type="button" data-gtab="search">Поиск</button></div></div>
    <div class="gif-top"><input type="search" class="gif-q" placeholder="Поиск GIPHY" aria-label="Поиск GIF" maxlength="50">
      <label class="btn ghost small gif-up">Свой .gif<input type="file" accept="image/gif" hidden></label></div>
    <div class="gif-grid"></div><div class="gif-more"></div>
    <div class="gif-attr">Powered by GIPHY</div></div>`;
  const grid = $('.gif-grid', ov), more = $('.gif-more', ov), q = $('.gif-q', ov), file = $('input[type=file]', ov), top = $('.gif-top', ov), attr = $('.gif-attr', ov);
  let tab = 'mine', next = 0, seq = 0, timer = null, opening = true;
  const close = () => { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const pick = url => { close(); onPick(url); };
  const cell = (url, preview, mine) => `<button type="button" class="gif-cell" data-gif="${esc(url)}"><img src="${esc(preview)}" alt="" loading="lazy">${mine ? `<span class="gif-del" data-gif-del="${esc(url)}" title="Убрать из «Мои»">${I.close}</span>` : ''}</button>`;
  async function search(append) {
    const my = ++seq;
    if (!append) { next = 0; grid.innerHTML = loader(); }
    more.innerHTML = '';
    try {
      const t = await getToken();
      const r = await fetch(`${CDN}/gif-search`, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q.value, offset: next }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Ошибка поиска');
      if (my !== seq || tab !== 'search') return;
      const html = d.items.map(g => cell(g.url, g.preview, false)).join('');
      grid.innerHTML = (append ? grid.innerHTML : '') + html;
      if (!grid.innerHTML) grid.innerHTML = '<div class="empty">Ничего не найдено</div>';
      next = d.next;
      if (d.items.length && next < d.total) more.innerHTML = '<button type="button" class="btn ghost small" data-gif-more>Ещё</button>';
    } catch (e) { if (my === seq) grid.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }
  }
  async function mine() {
    const my = ++seq; grid.innerHTML = loader(); more.innerHTML = '';
    try {
      const rows = await api(`saved_gifs?select=url&order=created_at.desc&limit=300`);
      if (my !== seq) return;
      if (!rows.length && opening) { opening = false; return setTab('search'); } // «Мои» пусто — сразу поиск
      opening = false;
      grid.innerHTML = rows.length ? rows.map(x => cell(x.url, x.url, true)).join('')
        : '<div class="empty">Пока пусто. Откройте GIF в посте или сообщении и нажмите «Сохранить в мои GIF».</div>';
    } catch (e) { grid.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; }
  }
  ov.addEventListener('click', async e => {
    if (e.target === ov || e.target.closest('[data-close]')) return close();
    const del = e.target.closest('[data-gif-del]');
    if (del) { e.stopPropagation(); try { await api(`saved_gifs?url=eq.${encodeURIComponent(del.dataset.gifDel)}`, { method: 'DELETE' }); del.closest('.gif-cell').remove(); } catch (er) { toast(errText(er), true); } return; }
    const g = e.target.closest('[data-gif]'); if (g) return pick(g.dataset.gif);
    if (e.target.closest('[data-gif-more]')) return search(true);
    const tb = e.target.closest('[data-gtab]');
    if (tb) return setTab(tb.dataset.gtab);
  });
  function setTab(t) {
    tab = t;
    $$('[data-gtab]', ov).forEach(x => x.classList.toggle('active', x.dataset.gtab === t));
    q.classList.toggle('hidden', t !== 'search'); attr.classList.toggle('hidden', t !== 'search');
    if (t === 'search') { setTimeout(() => q.focus(), 50); return search(false); }
    return mine();
  }
  q.oninput = () => { clearTimeout(timer); timer = setTimeout(() => search(false), 350); };
  file.onchange = async () => {
    const f = file.files[0]; file.value = '';
    if (!f) return;
    if (f.type !== 'image/gif') return toast('Нужен файл .gif', true);
    if (f.size > MAX_BYTES) return toast('GIF больше 5 МБ', true);
    top.classList.add('busy');
    try { const url = await uploadImage(f); saveGif(url); pick(url); }
    catch (e) { toast(errText(e), true); top.classList.remove('busy'); }
  };
  document.addEventListener('keydown', onKey);
  document.body.append(ov); document.body.style.overflow = 'hidden';
  setTab('mine');
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
function composerEl({ replyTo = null, quoteOf = null, autofocus = false, onDone, slot: fixedSlot = null, asUser = false } = {}) {
  const box = document.createElement('div');
  box.className = 'composer';
  const imgs = []; // {url|null, preview, loading}
  const slotSel = false
    ? `<select class="as-select" aria-label="От имени">${S.slots.map(s => `<option value="${s.id}"${s.id === actingSlot()?.id ? ' selected' : ''}>${esc(s.char_name)} @${esc(s.handle)}${s.player_id && s.player_id !== S.uid ? ' (игрок)' : ''}</option>`).join('')}</select>`
    : '';
  const a = asUser ? userAv(S.me) : (fixedSlot || actingSlot());
  box.innerHTML = `<div class="c-av">${avatar(a)}</div>
    <div class="composer-body">
      ${slotSel}
      ${asUser ? '<div class="as-user">Вы отвечаете от себя — вы не играете в этой комнате</div>' : fixedSlot ? `<div class="as-user">Ответ от персонажа ${esc(fixedSlot.char_name)}</div>` : ''}
      ${replyTo ? `<div class="reply-to" style="margin-top:4px">В ответ <b>@${esc(replyTo.slot?.handle)}</b></div>` : ''}
      <textarea rows="1" maxlength="${MAX_LEN + 200}" placeholder="${replyTo ? 'Опубликуйте свой ответ' : quoteOf ? 'Добавьте комментарий' : 'Что происходит?!'}" aria-label="Текст поста"></textarea>
      <div class="thumbs hidden"></div>
      ${quoteOf ? quoteHtml(quoteOf) : ''}
      <div class="composer-tools">
        <label class="tool" title="Картинки" aria-label="Добавить картинки">${I.image}<input type="file" accept="image/*" multiple hidden></label>
        ${gifOk() ? '<button type="button" class="tool gif-tool" data-gif-open title="GIF" aria-label="Добавить GIF">GIF</button>' : ''}
        ${voiceOk() ? `<button type="button" class="tool" data-voice title="Голосовое" aria-label="Записать голосовое">${I.mic}</button>` : ''}
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
  const gifBtn = $('[data-gif-open]', box);
  if (gifBtn) gifBtn.onclick = () => {
    if (imgs.length >= MAX_IMG) return toast(`Не больше ${MAX_IMG} картинок`, true);
    gifPicker(url => { imgs.push({ url, preview: url, loading: false }); drawThumbs(); });
  };
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
  const vBtn = $('[data-voice]', box);
  if (vBtn) vBtn.onclick = () => {
    const slot = asUser ? null : (fixedSlot || actingSlot());
    if (!asUser && !slot) return needSlot();
    recordVoice($('.composer-body', box), async url => {
      const body = { room_id: (replyTo || quoteOf)?.room_id || S.room.id, body: ta.value.trim(), images: imgs.filter(i => i.url).map(i => i.url), voice_url: url };
      if (slot) body.slot_id = slot.id;
      if (replyTo) body.reply_to = replyTo.id;
      if (quoteOf) body.quote_of = quoteOf.id;
      const [row] = await api('posts', { method: 'POST', body, prefer: 'return=representation' });
      ta.value = ''; imgs.length = 0; drawThumbs();
      await onPostInsert(row);
      toast(replyTo ? 'Ответ отправлен' : 'Пост опубликован');
      onDone?.(row);
    });
  };
  send.onclick = async () => {
    const slot = asUser ? null : (fixedSlot || actingSlot());
    if (!asUser && !slot) return needSlot();
    send.disabled = true;
    try {
      const body = { room_id: (replyTo || quoteOf)?.room_id || S.room.id, body: ta.value.trim(), images: imgs.filter(i => i.url).map(i => i.url) };
      if (slot) body.slot_id = slot.id;
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
  else d.innerHTML = `<span>Выберите персонажа, чтобы писать.</span><a class="btn small blue" href="${roomPath(S.room, '/chars')}">Персонажи</a>`;
  return d;
}
function openComposer(opts = {}) {
  if (!(opts.replyTo && opts.slot)) {
    if (!S.room) { toast('Сначала зайдите в комнату', true); location.hash = '#/rooms'; return; }
    if (needSlot()) return;
  } else if (needLogin()) return;
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
main.addEventListener('click', e => { if (e.target.closest('[data-back]')) { history.length > 1 ? history.back() : (location.hash = S.room ? roomPath(S.room) : '#/'); } });
const loader = () => '<div class="loading-row"><div class="spinner" role="status" aria-label="Загрузка"></div></div>';
function errorView(msg) {
  main.innerHTML = head('Y (переписки)', { back: true }) + `<div class="empty"><h2>Не получилось</h2><p>${esc(msg)}</p><a class="btn blue" href="#/rooms">К комнатам</a></div>`;
}
function updateNav() {
  $('#navChars').href = '#/chars'; $('#bottomChars').href = '#/chars';
  // кто может читать чужие ЛС — всегда в общий список «Сообщения» (ЛС комнаты — через иконку в шапке комнаты)
  const dmHref = S.room && !peekOk() ? roomPath(S.room, '/dm') : '#/dm';
  $('#navDm').href = dmHref; $('#bottomDm').href = dmHref;
  const meHref = S.me ? userPath(S.me) : '/';
  $('#navMe').href = meHref; $('#bottomMe').href = meHref;
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey()));
  $('#fab').classList.toggle('hidden', S.view !== 'feed' && S.view !== 'thread');
  $('#sidePost').classList.toggle('hidden', S.view !== 'feed' && S.view !== 'thread');
  $('#navNew').classList.toggle('hidden', !S.uid);
  $('#navVoice')?.classList.toggle('hidden', !callsOk());
  renderMe();
}
function navKey() {
  const v = S.view;
  if (v === 'create') return 'new';
  if (v === 'rooms' || v === 'feed' || v === 'thread' || v === 'chars') return 'rooms';
  if (v === 'lib' || v === 'char') return 'chars';
  if (v === 'dms' || v === 'dm' || v === 'dmhub' || v === 'dmpeek') return 'dm';
  if (v === 'user') return S.viewArg === S.uid ? 'me' : '';
  if (v === 'settings') return 'settings';
  if (v === 'voice') return 'voice';
  if (v === 'notifs') return 'notifs';
  return 'home';
}
function renderMe() {
  const box = $('#meCard');
  if (!S.uid) { box.innerHTML = '<a class="btn blue small" href="/">Войти</a>'; return; }
  const a = S.room ? (mySlot() || null) : null;
  box.href = S.me ? userPath(S.me) : '/';
  box.innerHTML = a
    ? `${avatar(a)}<div class="me-text"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.char_name)}${isVip(S.me) ? vipBadge() : ''}</div><div style="color:var(--muted);font-size:14px">@${esc(a.handle)}</div></div>`
    : `${avatar(userAv(S.me))}<div class="me-text"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(yName(S.me))}${isVip(S.me) ? vipBadge() : ''}</div><div style="color:var(--muted);font-size:14px">${S.me?.username ? '@' + esc(S.me.username) : ''}</div></div>`;
}

/* главная: лента комнаты */
async function viewFeed(roomKey) {
  S.view = 'feed'; main.innerHTML = head('Комната') + loader(); updateNav();
  try { await loadRoom(roomKey); await ensureRoomMine(); } catch (e) { return errorView(errText(e)); }
  updateNav();
  const r = S.room;
  main.innerHTML = head(r.title, { sub: r.status === 'archived' ? 'Архив · только чтение' : `${S.slots.filter(s => s.player_id).length}/${S.slots.length} персонажей в игре`,
    back: true, extra: `<a class="icon-btn" href="${roomPath(r, '/dm')}" aria-label="Сообщения" style="margin:0">${I.mail}</a><a class="icon-btn" href="${roomPath(r, '/chars')}" aria-label="Персонажи" style="margin:0">${I.users}</a><button class="icon-btn" data-copy="${roomPath(r)}" aria-label="Скопировать ссылку на комнату" style="margin:0">${I.link}</button>${isOwner() ? `<button class="icon-btn" data-room-settings aria-label="Настройки комнаты" style="margin:0">${I.gear}</button>` : ''}${mySlot() ? `<button class="icon-btn" data-leave-room title="Выйти из роли" aria-label="Выйти из роли" style="margin:0">${I.leave}</button>` : ''}` })
    + `<div id="callPill"></div><div id="composerSlot"></div><div class="new-pill"><span id="newPill" class="hidden"><button type="button">Новые посты</button></span></div><div id="feedList">${loader()}</div><div id="feedMore"></div>`;
  $('#newPill button').onclick = () => { scrollTo({ top: 0, behavior: 'smooth' }); $('#newPill').classList.add('hidden'); };
  if (matchMedia('(min-width: 640px)').matches) refreshComposer();
  else if (!canWrite() || !actingSlot()) refreshComposer();
  renderRight();
  callRoomPill();
  await loadFeedPage();
}
async function loadFeedPage(before) {
  const list = $('#feedList'); if (!list) return;
  const roomId = S.room.id;
  let rows;
  try {
    rows = await api(`posts?room_id=eq.${roomId}&reply_to=is.null&repost_of=is.null&select=${P_SEL}&order=created_at.desc&limit=30${before ? `&created_at=lt.${encodeURIComponent(before)}` : ''}`);
  } catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (S.room?.id !== roomId || S.view !== 'feed') return;
  if (!before) list.innerHTML = '';
  rows.forEach(p => { cache(p); list.append(renderPost(p, { threads: true })); });
  prefetchThreads(rows);
  if (!before && !rows.length) list.innerHTML = `<div class="empty"><h2>Пока тихо</h2><p>Напишите первый пост в этой комнате.</p></div>`;
  const more = $('#feedMore');
  more.innerHTML = rows.length === 30 ? '<div class="loading-row"><button class="btn ghost" type="button">Показать ещё</button></div>' : '';
  const btn = $('button', more);
  if (btn) btn.onclick = () => { btn.disabled = true; loadFeedPage(rows[rows.length - 1].created_at); };
}

/* тред */
async function viewThread(postKey) {
  S.view = 'thread'; main.innerHTML = head('Пост', { back: true }) + loader(); updateNav();
  let p;
  try { p = (await api(`posts?${keyFilter(postKey)}&select=${P_SEL}`))[0]; } catch (e) { return errorView(errText(e)); }
  if (!p) return errorView('Пост не найден или нет доступа');
  if (p.repost_of && p.orig) { location.replace(postPath(p.orig)); return; }
  try { await loadRoom(p.room_id); await ensureRoomMine(); } catch (e) { return errorView(errText(e)); }
  cache(p); updateNav(); renderRight();
  // предки
  const chain = []; let cur = p;
  for (let i = 0; i < 12 && cur.reply_to; i++) {
    const par = S.posts.get(cur.reply_to)?.slot ? S.posts.get(cur.reply_to) : cache((await api(`posts?id=eq.${cur.reply_to}&select=${P_SEL}`))[0]);
    if (!par) break; chain.unshift(par); cur = par;
  }
  const children = await loadReplyTree(p.id);
  if (S.view !== 'thread') return;
  main.innerHTML = head('Пост', { back: true, sub: `в комнате <a href="${roomPath(S.room)}" class="sub-link">${esc(S.room.title)}</a>` });
  chain.forEach(c => main.append(renderPost(c, { line: true })));
  main.append(renderBigPost(p));
  const cs = document.createElement('div'); cs.id = 'composerSlot'; main.append(cs);
  if (canWrite() && actingSlot()) cs.append(composerEl({ replyTo: p }));
  else cs.append(composerHint());
  const box = document.createElement('div'); box.dataset.replies = p.id;
  (children.get(p.id) || []).forEach(r => box.append(renderReplyNode(r, children)));
  main.append(box);
  scrollTo({ top: chain.length ? $('.post-big', main).offsetTop - 60 : 0 });
}
// ответы деревом (до 8 уровней)
// вся ветка любой глубины для нескольких постов — одним запросом
async function loadReplyTrees(ids) {
  const children = new Map();
  if (!ids.length) return children;
  const rows = await api(`rpc/reply_tree?select=${P_SEL}`, { method: 'POST', body: { roots: ids } });
  rows.forEach(r => { cache(r); if (!children.has(r.reply_to)) children.set(r.reply_to, []); children.get(r.reply_to).push(r); });
  return children;
}
const loadReplyTree = rootId => loadReplyTrees([rootId]);
// заранее (в фоне) подгружаем ветки всех постов ленты — по нажатию они открываются сразу
async function prefetchThreads(rows) {
  const ids = rows.filter(x => x.reply_count > 0 && !x.is_deleted).map(x => x.id)
    .filter(id => $$(`.inline-thread[data-inline="${id}"]`).some(b => !b.dataset.loaded));
  if (!ids.length) return;
  let ch; try { ch = await loadReplyTrees(ids); } catch { return; }
  ids.forEach(id => $$(`.inline-thread[data-inline="${id}"]`).forEach(box => {
    if (box.dataset.loaded) return;
    box.replaceChildren(...(ch.get(id) || []).map(x => renderReplyNode(x, ch)));
    box.dataset.loaded = '1';
  }));
}
// ветки ответов сразу для всех постов страницы (несколько запросов на всю ленту)
async function fillThreads(rows) {
  const ids = rows.map(x => x.orig || x).filter(x => x.reply_count > 0 && !x.is_deleted).map(x => x.id);
  if (!ids.length) return;
  let children;
  try {
    children = new Map(); let level = ids;
    for (let d = 0; d < 8 && level.length; d++) {
      const part = await api(`posts?reply_to=in.(${level.join(',')})&select=${P_SEL}&order=created_at.asc&limit=1000`);
      part.forEach(x => { cache(x); if (!children.has(x.reply_to)) children.set(x.reply_to, []); children.get(x.reply_to).push(x); });
      level = part.map(x => x.id);
    }
  } catch { children = new Map(); }
  ids.forEach(id => $$(`.inline-thread[data-inline="${id}"]`).forEach(box => {
    if (box.dataset.loaded) return;
    box.replaceChildren(...(children.get(id) || []).map(x => renderReplyNode(x, children)));
    box.dataset.loaded = '1';
  }));
}
// раскрыть/скрыть ветку ответов прямо в ленте
async function toggleThread(p, btn) {
  const box = btn.closest('.post-main')?.querySelector(`.inline-thread[data-inline="${p.id}"]`); if (!box) return;
  if (box.dataset.loaded && !box.hidden) { box.hidden = true; btn.dataset.open = ''; btn.innerHTML = threadLabel(p); return; }
  if (!box.dataset.loaded) {
    btn.disabled = true; btn.textContent = 'Загрузка…';
    try {
      const children = await loadReplyTree(p.id);
      box.replaceChildren(...(children.get(p.id) || []).map(r => renderReplyNode(r, children)));
      box.dataset.loaded = '1';
    } catch (e) { toast(errText(e), true); btn.disabled = false; btn.innerHTML = threadLabel(p); return; }
    btn.disabled = false;
  }
  box.hidden = false; btn.dataset.open = '1'; btn.innerHTML = `${I.reply}<span>Скрыть ответы</span>`;
}
const threadLabel = p => `${I.reply}<span>${p.reply_count ? `Показать ответы (${p.reply_count})` : 'Ответов нет'}</span>`;
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
  const canBanner = rank() >= 2;
  const form = modal(c ? 'Изменить персонажа' : 'Новый персонаж', `
    <div class="ce-head">
      <label class="ce-banner" style="${bannerStyle(c || {})}" title="${canBanner ? 'Шапка персонажа' : 'Шапку персонажа могут ставить VIP и выше'}">
        ${canBanner ? `<span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="banner" aria-label="Загрузить шапку">` : `<span class="ce-banner-lock">${I.lock}<span>Шапка — с роли VIP</span></span>`}
      </label>
      <label class="ce-av" title="Аватар">${c?.avatar_url ? `<img class="av ce-av-img" src="${esc(c.avatar_url)}" alt="">` : '<span class="av ce-av-img" style="background:var(--placeholder)"></span>'}
        <span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="avatar" aria-label="Загрузить аватар"></label>
    </div>
    <div class="ce-note">Нажмите на аватар${canBanner ? ' или шапку' : ' (шапка доступна с роли VIP)'}, чтобы загрузить и обрезать картинку.</div>
    <input type="hidden" name="avatar_url" value="${esc(c?.avatar_url || '')}">
    <input type="hidden" name="banner_url" value="${esc(c?.banner_url || '')}">
    <div class="ce-rm-row">${c?.banner_url && canBanner ? '<button type="button" class="btn ghost small" data-rm="banner">Убрать шапку</button>' : ''}</div>
    <div class="field"><label for="f-name">Имя персонажа</label><input id="f-name" name="char_name" required maxlength="50" value="${esc(c?.char_name || '')}" autocomplete="off"></div>
    <div class="field"><label for="f-handle">@ник (подставится из имени, можно поменять)</label><input id="f-handle" name="handle" required maxlength="30" value="${esc(c?.handle || '')}" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label for="f-bio">Био</label><textarea id="f-bio" name="bio" rows="3" maxlength="300">${esc(c?.bio || '')}</textarea></div>
    ${c ? '<button type="button" class="btn danger" data-del-char>Удалить персонажа</button>' : ''}`, {
    submitLabel: c ? 'Сохранить' : 'Создать',
    onSubmit: async f => {
      if (+f.dataset.busy) throw new Error('Дождитесь загрузки картинки');
      const body = { char_name: f.char_name.value.trim(), handle: f.handle.value.trim().replace(/^@/, ''), bio: f.bio.value.trim(), avatar_url: f.avatar_url.value || null };
      if (canBanner) body.banner_url = f.banner_url.value || null;
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
      else { form.banner_url.value = url; box.style.background = ''; box.style.backgroundImage = `url("${url}")`; }
    } catch (e) { toast(errText(e), true); }
    box.classList.remove('loading'); form.dataset.busy = +form.dataset.busy - 1;
  });
  $$('[data-rm]', form).forEach(b => b.onclick = () => {
    if (b.dataset.rm === 'banner') { form.banner_url.value = ''; $('.ce-banner', form).setAttribute('style', bannerStyle({})); }
    b.remove();
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
  return `<a class="char lib-item" href="${charPath(c)}">${avatar(c)}<div class="char-main"><div class="name">${esc(c.char_name)}</div><div class="handle">@${esc(c.handle)}</div>
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
  try { rows = await api(`characters?select=id,short_code,char_name,handle,avatar_url,bio,owner_id,slots(room_id)&order=created_at.desc&limit=500${q}`); }
  catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (S.view !== 'lib') return;
  list.innerHTML = rows.length ? rows.map(c => charRow(c)).join('')
    : `<div class="empty"><h2>${libQ ? 'Ничего не найдено' : 'Персонажей пока нет'}</h2><p>${libQ ? 'Попробуйте другой запрос.' : 'Создайте первого — потом его можно добавить в комнаты.'}</p>${!libQ && S.uid && rank() >= 1 ? `<button class="btn blue" data-new-char style="margin-top:16px">${I.plus} Создать персонажа</button>` : ''}</div>`;
}

/* ── страница персонажа ─────────────────────────────────── */
async function viewCharacter(key) {
  S.view = 'char'; updateNav(); renderRight();
  main.innerHTML = head('Персонаж', { back: true }) + loader();
  let c, rooms, id;
  try {
    [c] = await api(`characters?${keyFilter(key)}&select=*,owner:profiles!owner_id(rp_role,paid_role,paid_until)`);
    if (!c) return errorView('Персонаж не найден');
    id = c.id;
    [rooms] = await Promise.all([
      api(`rooms?select=id,title,short_code,description,is_private,status,image_url,slots!inner(id,character_id,player_id)&slots.character_id=eq.${id}&order=status.asc,created_at.desc`),
    ]);
  } catch (e) { return errorView(errText(e)); }
  if (!c) return errorView('Персонаж не найден');
  if (S.view !== 'char') return;
  const hasCharBanner = !!(c.banner_url && isVip(c.owner));
  main.innerHTML = head(c.char_name, { back: true, sub: `${rooms.length} ${plural(rooms.length, 'комната', 'комнаты', 'комнат')}` })
    + (hasCharBanner ? `<div class="cp-banner" style="${bannerStyle(c)}"></div>` : '')
    + `<div class="cp-top${hasCharBanner ? '' : ' no-banner'}">${avatar(c, 'xl')}<div class="cp-acts"><button class="icon-btn bordered" data-copy="${charPath(c)}" aria-label="Скопировать ссылку">${I.link}</button>${canEditChar(c) ? '<button class="btn ghost" data-edit-char>Изменить</button>' : ''}</div></div>
    <div class="cp-info"><div class="cp-name"><span>${esc(c.char_name)}</span>${isVip(c.owner) ? vipBadge() : ''}</div><div class="cp-handle">@${esc(c.handle)}</div>${c.bio ? `<div class="cp-bio">${richText(c.bio)}</div>` : ''}</div>
    <div class="tabs" style="border-bottom:1px solid var(--border)"><span class="active" style="flex:1;text-align:center;padding:16px 8px;font-weight:700;position:relative">Комнаты</span></div>
    ${rooms.length ? rooms.map(r => {
      const free = r.slots.some(s => !s.player_id);
      return `<a class="room-item" href="${roomPath(r, '/chars')}">${roomIcon(r)}
        <div style="min-width:0;flex:1"><div class="t">${esc(r.title)} ${r.is_private ? I.lock : ''} ${r.status === 'archived' ? '<span class="badge">Архив</span>' : ''}</div>
        ${r.description ? `<div class="d">${esc(r.description)}</div>` : ''}
        <div class="m">${r.status !== 'active' ? 'Только чтение' : free ? '<span class="free">Свободен — можно играть</span>' : 'Занят игроком'}</div></div></a>`;
    }).join('') : '<div class="empty"><h2>Пока ни в одной комнате</h2><p>Владелец комнаты может добавить этого персонажа в разделе «Персонажи комнаты».</p></div>'}`;
  const ed = $('[data-edit-char]', main);
  if (ed) ed.onclick = () => characterEditor(c, () => viewCharacter(key));
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
  else if (r.status === 'active') main.insertAdjacentHTML('beforeend', `<div class="composer-hint"><span>${mine ? `Вы играете за ${esc(mine.char_name)}.` : 'Выберите, за кого играть.'}</span></div>`);
  S.slots.forEach(s => {
    const isMine = mine?.id === s.id;
    const st = isMine ? '<div class="st mine">Вы играете за этого персонажа</div>'
      : s.player_id ? `<div class="st">Играет ${esc(s.player?.nick || 'игрок')}</div>` : '<div class="st free">Свободен</div>';
    const acts = [];
    if (S.uid && r.status === 'active' && !s.player_id) acts.push(`<button class="btn small blue" data-take="${s.id}">Играть</button>`);
    if (isMine) acts.push('<button class="btn small ghost" data-leave>Выйти из роли</button>');
    if (own) {
      if (s.player_id && !isMine) acts.push(`<button class="btn small ghost" data-kick="${s.id}">Освободить</button>`);
      acts.push(`<button class="btn small ghost" data-rm-slot="${s.id}" aria-label="Убрать из комнаты">Убрать</button>`);
    }
    const link = s.character_id ? ` data-href="#/c/${s.character_id}"` : '';
    main.insertAdjacentHTML('beforeend', `<div class="char${s.character_id ? ' editable' : ''}"${link}>${avatar(s)}<div class="char-main"><div class="name">${esc(s.char_name)}${slotVip(s) ? vipBadge() : ''}</div><div class="handle">@${esc(s.handle)}</div>${s.bio ? `<div class="bio">${richText(s.bio)}</div>` : ''}${st}</div><div class="char-acts">${acts.join('')}</div></div>`);
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
// выход из роли из шапки ленты комнаты
main.addEventListener('click', async e => {
  const b = e.target.closest('[data-leave-room]'); if (!b || !S.room) return;
  const s = mySlot(); if (!s) return;
  if (!confirm(`Выйти из роли ${s.char_name}? Персонаж станет свободным, ваши посты останутся.`)) return;
  b.disabled = true;
  try {
    await rpc('leave_slot', { p_room: S.room.id });
    S.actSlot = null; await loadSlots(); await loadMine(); loadMySlots();
    toast('Вы вышли из роли'); route();
  } catch (er) { toast(errText(er), true); b.disabled = false; }
});
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
      S.actSlot = null; await loadSlots(); await loadMine(); loadMySlots();
      toast('Вы в игре!'); location.hash = roomPath(S.room);
    } else if (t.hasAttribute('data-leave')) {
      if (!confirm(`Выйти из роли ${mySlot()?.char_name || ''}? Персонаж станет свободным, ваши посты останутся.`)) return;
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
  const canCreate = !!S.uid;
  main.innerHTML = head('Комнаты', { extra: canCreate ? `<a class="btn small blue" href="#/new">${I.plus} Создать комнату</a>` : '' })
    + `<div class="search">${I.search}<input type="search" placeholder="Поиск комнат" aria-label="Поиск комнат" value="${esc(roomsQ)}" enterkeyhint="search"></div>
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
  try { rows = await api(`rooms?select=id,title,short_code,description,is_private,status,image_url,max_slots,owner_id,created_at,slots(player_id)&order=status.asc,created_at.desc&limit=100${q}`); }
  catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (!rows.length) { list.innerHTML = `<div class="empty"><h2>${roomsQ ? 'Ничего не найдено' : 'Комнат пока нет'}</h2><p>${roomsQ ? 'Попробуйте другой запрос.' : 'Создайте первую комнату.'}</p>${!roomsQ && S.uid ? `<a class="btn blue" href="#/new" style="margin-top:16px">${I.plus} Создать комнату</a>` : ''}</div>`; return; }
  list.innerHTML = rows.map(r => {
    const taken = r.slots.filter(s => s.player_id).length;
    return `<a class="room-item" href="${roomPath(r)}">${roomIcon(r)}
      <div style="min-width:0;flex:1"><div class="t">${esc(r.title)} ${r.is_private ? I.lock : ''} ${r.status === 'archived' ? '<span class="badge">Архив</span>' : ''} ${r.owner_id === S.uid ? '<span class="badge blue">Ваша</span>' : ''}</div>
      ${r.description ? `<div class="d">${esc(r.description)}</div>` : ''}
      <div class="m">${taken}/${r.slots.length} в игре</div></div></a>`;
  }).join('');
}

/* создание комнаты */
function viewCreate() {
  S.view = 'create'; updateNav();
  if (!S.uid) { main.innerHTML = head('Новая комната', { back: true }) + '<div class="empty"><h2>Нужно войти</h2><p>Войдите на renah0cki, чтобы создать комнату.</p><a class="btn blue" href="/" style="margin-top:16px">Войти</a></div>'; return; }
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
        catch (e2) { toast('Комната создана, но персонажи не добавились: ' + errText(e2), true); location.hash = roomPath(room, '/chars'); return; }
      }
      toast('Комната создана');
      location.hash = roomPath(room, '/chars');
    } catch (e2) { err.textContent = errText(e2); btn.disabled = false; }
  };
}

/* ── главная: последние посты из всех комнат ────────────── */
let homeTab = 'all', homeRooms = null;
try { if (localStorage.getItem('rp_home_tab') === 'mine') homeTab = 'mine'; } catch {}
async function viewHome() {
  S.view = 'home'; updateNav(); renderRight();
  const meAv = S.me ? avatar(userAv(S.me), 'sm') : '';
  main.innerHTML = `<div class="head home-head">
      <div class="m-top only-m"><a class="m-av" href="${S.me ? userPath(S.me) : '/'}" aria-label="Профиль">${meAv}</a><a class="m-logo" href="#/" aria-label="Y (переписки)"><svg class="ylogo" viewBox="0 125 454 570" aria-hidden="true"><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M0 130H107L232 375L355 130H454L270 470V690H180V465Z M40 152H95L218 400L193 437Z"/></svg></a><span class="m-sp"></span></div>
      <div class="head-row only-d"><div class="head-title"><h1>Главная</h1></div></div>
      <div class="tabs" role="tablist"><button type="button" data-htab="all"${homeTab === 'all' ? ' class="active"' : ''}>Для вас</button><button type="button" data-htab="mine"${homeTab === 'mine' ? ' class="active"' : ''}>Мои комнаты</button></div>
    </div>`
    + `<div class="new-pill"><span id="newPill" class="hidden"><button type="button">Новые посты</button></span></div><div id="homeList">${loader()}</div><div id="homeMore"></div>`;
  $('#newPill button').onclick = () => { scrollTo({ top: 0, behavior: 'smooth' }); $('#newPill').classList.add('hidden'); };
  $$('[data-htab]', main).forEach(b => b.onclick = () => {
    homeTab = b.dataset.htab; try { localStorage.setItem('rp_home_tab', homeTab); } catch {}
    $$('[data-htab]', main).forEach(x => x.classList.toggle('active', x === b));
    $('#homeList').innerHTML = loader(); $('#homeMore').innerHTML = '';
    loadHomePage();
  });
  // сразу показываем прошлую ленту из кэша, свежую подгружаем параллельно с лайками
  const cached = readHomeCache();
  if (cached) { const list = $('#homeList'); list.innerHTML = ''; cached.forEach(p => { cache(p); list.append(renderPost(p, { showRoom: true, threads: true })); }); }
  await Promise.all([loadMineAll().catch(() => {}), loadHomePage()]);
  if (S.view !== 'home') return;
  renderRight();
  refreshActionStates();
}
const HOME_CACHE = () => `rp_home_cache_${homeTab}`;
function readHomeCache() { try { const c = (JSON.parse(localStorage.getItem(HOME_CACHE()) || 'null') || []).filter(x => !x.repost_of && !x.reply_to); return c.length ? c : null; } catch { return null; } }
function writeHomeCache(rows) { try { localStorage.setItem(HOME_CACHE(), JSON.stringify(rows.slice(0, 30))); } catch {} }
// после подгрузки лайков/репостов — обновить подсветку кнопок на уже нарисованных постах
function refreshActionStates() {
  $$('[data-cnt]').forEach(box => {
    const id = box.dataset.cnt;
    $('.act.like', box)?.classList.toggle('on', S.liked.has(id) || S.userLiked.has(id));
    $('.act.rt', box)?.classList.toggle('on', S.reposted.has(id) || S.userReposted.has(id));
  });
}
// комнаты, где я играю или которые мои
async function myRoomIds() {
  if (!S.uid) return [];
  const own = await api(`rooms?owner_id=eq.${S.uid}&select=id`).catch(() => []);
  return [...new Set([...S.mySlots.map(x => x.room_id), ...own.map(x => x.id)])];
}
async function loadHomePage(before) {
  const list = $('#homeList'); if (!list) return;
  let rows;
  const tab = homeTab;
  let filter = '';
  if (tab === 'mine') {
    if (!before) homeRooms = await myRoomIds();
    if (!homeRooms.length) { list.innerHTML = '<div class="empty"><h2>Пока пусто</h2><p>Займите персонажа в комнате или создайте свою — посты оттуда будут здесь.</p><a class="btn blue" href="#/rooms" style="margin-top:16px">К комнатам</a></div>'; return; }
    filter = `&room_id=in.(${homeRooms.join(',')})`;
  }
  try { rows = await api(`posts?reply_to=is.null&repost_of=is.null&select=${P_SEL_ROOM}${filter}&order=created_at.desc&limit=30${before ? `&created_at=lt.${encodeURIComponent(before)}` : ''}`); }
  catch (e) { list.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
  if (S.view !== 'home' || tab !== homeTab) return;
  if (!before) { list.innerHTML = ''; writeHomeCache(rows); }
  rows.forEach(p => { cache(p); list.append(renderPost(p, { showRoom: true, threads: true })); });
  prefetchThreads(rows);
  if (!before && !rows.length) list.innerHTML = `<div class="empty"><h2>Пока тихо</h2><p>Постов ещё нет. Зайдите в комнату и напишите первый.</p><a class="btn blue" href="#/rooms" style="margin-top:16px">К комнатам</a></div>`;
  const more = $('#homeMore');
  more.innerHTML = rows.length === 30 ? '<div class="loading-row"><button class="btn ghost" type="button">Показать ещё</button></div>' : '';
  const btn = $('button', more);
  if (btn) btn.onclick = () => { btn.disabled = true; loadHomePage(rows[rows.length - 1].created_at); };
}

/* ── страница пользователя (профиль Y, отдельный от renah0cki) ── */
const MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '';
const safeGrad = c => /^linear-gradient\([#0-9a-zA-Z,.%\s()-]{1,200}\)$/.test(c || '') ? c : '';
// имя/аватар в Y: свои, если заданы, иначе с renah0cki
const yName = u => u?.y_name || u?.nick || '';
const yAvatar = u => u?.y_avatar_url || u?.avatar_url || null;
const userAv = u => ({ char_name: yName(u), handle: u?.username || yName(u), avatar_url: yAvatar(u) });
function nameStyle(c) {
  if (safeColor(c)) return ` style="color:${c}"`;
  if (safeGrad(c)) return ` style="background:${c};-webkit-background-clip:text;background-clip:text;color:transparent"`;
  return '';
}
function bannerStyle(u) {
  if (u.banner_url) return `background-image:url('${esc(u.banner_url)}')`;
  if (safeGrad(u.name_color)) return `background:${u.name_color}`;
  if (safeColor(u.name_color)) return `background:linear-gradient(135deg, ${u.name_color}, var(--placeholder))`;
  return 'background:var(--placeholder)';
}
const siteHost = url => { try { const x = new URL(url); return (x.host + x.pathname).replace(/\/$/, ''); } catch { return url; } };
const U_SEL = 'user_id,nick,avatar_url,username,bio,about,banner_url,name_color,rp_role,paid_role,paid_until,created_at,y_name,y_avatar_url,location,website,birthday';

async function viewUser(key) {
  S.view = 'user'; updateNav(); renderRight();
  main.innerHTML = head('Профиль', { back: true }) + loader();
  let u, reposts, roles, followers, following;
  try {
    // свой профиль — всегда по id (не зависит от ника)
    if (!isUuid(key) && S.uid && S.me?.username && S.me.username.toLowerCase() === String(key).toLowerCase()) key = S.uid;
    [u] = await api(`profiles?${isUuid(key) ? `user_id=eq.${key}` : `username=ilike.${encodeURIComponent(key.replace(/[%*]/g, '').replace(/[\\_]/g, '\\$&'))}`}&select=${U_SEL}`);
    if (!u && !isUuid(key)) [u] = await api(`profiles?username=eq.${encodeURIComponent(key)}&select=${U_SEL}`);
    if (!u) return errorView('Профиль не найден');
    S.viewArg = u.user_id; updateNav();
    [reposts, roles, followers, following] = await Promise.all([
      api(`user_reposts?user_id=eq.${u.user_id}&select=created_at,post:post_id(${P_SEL_ROOM})&order=created_at.desc&limit=60`),
      api(`slots?player_id=eq.${u.user_id}&select=id,char_name,handle,avatar_url,character_id,room:room_id(id,title,short_code,image_url)`),
      api(`follows?followee=eq.${u.user_id}&select=follower&limit=10000`),
      api(`follows?follower=eq.${u.user_id}&select=followee&limit=10000`),
    ]);
  } catch (e) { return errorView(errText(e)); }
  if (S.view !== 'user') return;
  const isMe = u.user_id === S.uid;
  let iFollow = !!S.uid && followers.some(f => f.follower === S.uid);
  if (isMe) { Object.assign(S.me, u); renderMe(); try { await loadMineAll(); } catch {} }
  const d = new Date(u.created_at), name = yName(u);
  reposts = reposts.filter(x => x.post);
  const meta = [];
  if (u.location) meta.push(`<span class="cp-meta">${I.pin}<span>${esc(u.location)}</span></span>`);
  if (u.website) meta.push(`<a class="cp-meta cp-site" href="${esc(u.website)}" target="_blank" rel="noopener noreferrer nofollow">${I.link}<span>${esc(siteHost(u.website))}</span></a>`);
  if (u.birthday) { const b = new Date(u.birthday + 'T00:00:00'); meta.push(`<span class="cp-meta">${I.cake}<span>Дата рождения: ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}</span></span>`); }
  const hasBanner = !!(u.banner_url && isVip(u));
  main.innerHTML = head(name, { back: true, sub: `${reposts.length} ${plural(reposts.length, 'репост', 'репоста', 'репостов')}`, extra: isMe ? `<a class="icon-btn" href="#/settings" aria-label="Настройки" style="margin:0">${I.gear}</a>` : '' })
    + (hasBanner ? `<div class="cp-banner" style="${bannerStyle(u)}"></div>` : '')
    + `<div class="cp-top${hasBanner ? '' : ' no-banner'}">${avatar(userAv(u), 'xl')}${isMe ? '<button class="btn ghost small cp-edit-top only-d" data-edit-profile>Изменить</button>'
      : S.uid ? `<button class="btn small cp-follow${iFollow ? ' ghost' : ''}" data-follow>${iFollow ? 'Вы подписаны' : 'Подписаться'}</button>` : ''}</div>
    <div class="cp-info"><div class="cp-name"><span>${esc(name)}</span>${isVip(u) ? vipBadge() : ''}</div>
      ${u.username ? `<button type="button" class="cp-handle cp-copy" data-copy="${userPath(u)}" title="Скопировать ссылку на профиль">@${esc(u.username)}</button>` : ''}
      ${(u.about || u.bio) ? `<div class="cp-bio">${richText(u.about || u.bio)}</div>` : ''}
      <div class="cp-meta-row">${meta.join('')}</div>
      <div class="cp-stats"><span><b data-fcount>${followers.length}</b> <span data-fword>${plural(followers.length, 'подписчик', 'подписчика', 'подписчиков')}</span></span><span><b>${following.length}</b> ${plural(following.length, 'подписка', 'подписки', 'подписок')}</span></div>
      <div class="cp-stats"><span><b>${roles.length}</b> ${plural(roles.length, 'роль', 'роли', 'ролей')}</span><span><b>${reposts.length}</b> ${plural(reposts.length, 'репост', 'репоста', 'репостов')}</span>${isMe && coinsVisible() ? `<span class="cp-coin">${coinIco()} <b data-coin-bal>…</b> coin</span>` : (!isMe && S.uid === OWNER_ID ? `<span class="cp-coin" data-admin-coin-wrap title="Баланс пользователя (видно только вам)">${coinIco()} <b data-admin-coin-bal>…</b> coin</span>` : '')}</div>
      ${isMe ? '<button class="btn ghost cp-edit only-m" data-edit-profile>Редактировать профиль</button>' : ''}</div>
    <div class="tabs" role="tablist" style="border-bottom:1px solid var(--border)"><button type="button" class="active" data-utab="rt">Репосты</button><button type="button" data-utab="roles">Роли</button></div>
    <div id="uList"></div>`;
  scrollTo(0, 0);
  const list = $('#uList');
  const drawRt = () => {
    list.innerHTML = '';
    if (!reposts.length) { list.innerHTML = `<div class="empty"><h2>Пока нет репостов</h2><p>${isMe ? 'Нажмите ↻ под любым постом → «Репост к себе на страницу».' : 'Здесь появятся посты, которые человек сохранил к себе.'}</p></div>`; return; }
    reposts.forEach(x => {
      const pp = cache(x.post);
      const w = document.createElement('div');
      w.className = 'post-wrap'; w.dataset.post = 'ur-' + pp.id;
      w.innerHTML = `<div class="post-ctx">${I.rt}<span>${esc(name)} сделал(а) репост</span>${pp.room ? `<span class="dot">·</span>${roomLine(pp.room)}` : ''}</div>`;
      const inner = renderPost(pp.repost_of && pp.orig ? pp.orig : pp); inner.removeAttribute('data-post');
      w.append(inner); list.append(w);
    });
  };
  const drawRoles = () => {
    list.innerHTML = roles.length ? roles.map(x => `<a class="char lib-item" href="${x.room ? roomPath(x.room) : '#/rooms'}">${avatar(x)}<div class="char-main"><div class="name">${esc(x.char_name)}</div><div class="handle">@${esc(x.handle)}</div><div class="st">в комнате ${x.room ? esc(x.room.title) : '—'}</div></div></a>`).join('')
      : '<div class="empty"><h2>Сейчас без ролей</h2><p>Занятые персонажи появятся здесь.</p></div>';
  };
  $$('[data-edit-profile]', main).forEach(b => { b.onclick = () => profileEditor(u, () => viewUser(key)); });
  if (isMe) fillCoinBalance(main);
  else if (S.uid === OWNER_ID) fillUserCoinBalance(main, u.user_id);
  const fb = $('[data-follow]', main);
  if (fb) fb.onclick = async () => {
    fb.disabled = true;
    try {
      if (iFollow) await api(`follows?follower=eq.${S.uid}&followee=eq.${u.user_id}`, { method: 'DELETE' });
      else await api('follows', { method: 'POST', body: { follower: S.uid, followee: u.user_id }, prefer: 'return=minimal' });
      iFollow = !iFollow;
      const n = followers.length + (iFollow ? 1 : 0) - (followers.some(f => f.follower === S.uid) ? 1 : 0);
      $('[data-fcount]', main).textContent = n; $('[data-fword]', main).textContent = plural(n, 'подписчик', 'подписчика', 'подписчиков');
      fb.textContent = iFollow ? 'Вы подписаны' : 'Подписаться'; fb.classList.toggle('ghost', iFollow);
    } catch (e) { toast(errText(e), true); }
    fb.disabled = false;
  };
  $$('[data-utab]', main).forEach(b => b.onclick = () => {
    $$('[data-utab]', main).forEach(x => x.classList.toggle('active', x === b));
    b.dataset.utab === 'rt' ? drawRt() : drawRoles();
  });
  drawRt();
}

/* ── редактирование профиля Y (как в X; на renah0cki не влияет) ── */
function profileEditor(u, onSaved) {
  const canAvatar = rank() >= 1, canBanner = rank() >= 2;
  const form = modal('Изменить профиль', `
    <div class="ce-head">
      <label class="ce-banner" style="${bannerStyle(u)}" title="${canBanner ? 'Шапка профиля' : 'Шапку профиля могут ставить VIP и выше'}">
        ${canBanner ? `<span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="banner" aria-label="Загрузить шапку">` : `<span class="ce-banner-lock">${I.lock}<span>Шапка — с роли VIP</span></span>`}
      </label>
      <label class="ce-av${canAvatar ? '' : ' ce-av-static'}" title="${canAvatar ? 'Аватар' : 'Менять аватарку могут ГОЙ и выше'}">${avatar(userAv(u), 'ce-av-img')}
        ${canAvatar ? `<span class="ce-btn" aria-hidden="true">${I.image}</span><input type="file" accept="image/*" hidden data-kind="avatar" aria-label="Загрузить аватар">` : ''}</label>
    </div>
    <div class="ce-note">${canAvatar ? `Нажмите на аватар${canBanner ? ' или шапку' : ' (шапка доступна с роли VIP)'}, чтобы загрузить и обрезать картинку.` : 'Свою аватарку в Y могут ставить ГОЙ и выше, а шапку — VIP и выше.'} Изменения действуют только в Y — на renah0cki ничего не меняется.</div>
    <input type="hidden" name="y_avatar_url" value="${esc(u.y_avatar_url || '')}">
    <input type="hidden" name="banner_url" value="${esc(u.banner_url || '')}">
    <div class="ce-rm-row">${u.banner_url && canBanner ? '<button type="button" class="btn ghost small" data-rm="banner">Убрать шапку</button>' : ''}${u.y_avatar_url && canAvatar ? '<button type="button" class="btn ghost small" data-rm="avatar">Вернуть аватарку с renah0cki</button>' : ''}</div>
    <div class="field"><label for="p-name">Имя</label><input id="p-name" name="y_name" maxlength="50" value="${esc(u.y_name || '')}" placeholder="${esc(u.nick || '')}" autocomplete="off"></div>
    <div class="field"><label for="p-about">О себе</label><textarea id="p-about" name="about" rows="3" maxlength="300" placeholder="${esc(u.bio || '')}">${esc(u.about || '')}</textarea></div>
    <div class="field"><label for="p-loc">Местоположение</label><input id="p-loc" name="location" maxlength="30" value="${esc(u.location || '')}" autocomplete="off"></div>
    <div class="field"><label for="p-web">Сайт</label><input id="p-web" name="website" type="url" inputmode="url" maxlength="200" value="${esc(u.website || '')}" placeholder="https://" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label for="p-bd">Дата рождения</label><input id="p-bd" name="birthday" type="date" min="1900-01-01" max="2099-12-31" value="${esc(u.birthday || '')}"></div>`, {
    onSubmit: async f => {
      if (+f.dataset.busy) throw new Error('Дождитесь загрузки картинки');
      let web = f.website.value.trim();
      if (web && !/^https?:\/\//i.test(web)) web = 'https://' + web;
      if (web && !/^https?:\/\/\S{1,200}$/.test(web)) throw new Error('Неверная ссылка на сайт');
      const body = { about: f.about.value.trim(), y_name: f.y_name.value.trim() || null,
        location: f.location.value.trim(), website: web, birthday: f.birthday.value || null };
      if (canAvatar) body.y_avatar_url = f.y_avatar_url.value || null;
      if (canBanner) body.banner_url = f.banner_url.value || null;
      await api(`profiles?user_id=eq.${S.uid}`, { method: 'PATCH', body, prefer: 'return=minimal' });
      Object.assign(S.me, body); renderMe(); toast('Профиль сохранён'); onSaved?.();
    },
  });
  form.dataset.busy = '0';
  $$('input[type=file]', form).forEach(inp => inp.onchange = async () => {
    const file = inp.files[0]; inp.value = ''; if (!file) return;
    const isAv = inp.dataset.kind === 'avatar';
    let blob;
    try { blob = await cropImage(file, isAv ? { aspect: 1, outW: 400, round: true, title: 'аватар' } : { aspect: 3, outW: 1500, round: false, title: 'шапка' }); }
    catch (e) { return toast(errText(e), true); }
    if (!blob) return;
    const box = inp.closest('label'); box.classList.add('loading'); form.dataset.busy = +form.dataset.busy + 1;
    try {
      const url = await uploadImage(blob);
      if (isAv) { form.y_avatar_url.value = url; $('.ce-av-img', box).outerHTML = `<img class="av ce-av-img" src="${esc(url)}" alt="">`; }
      else { form.banner_url.value = url; box.style.background = ''; box.style.backgroundImage = `url("${url}")`; }
    } catch (e) { toast(errText(e), true); }
    box.classList.remove('loading'); form.dataset.busy = +form.dataset.busy - 1;
  });
  $$('[data-rm]', form).forEach(b => b.onclick = () => {
    if (b.dataset.rm === 'banner') { form.banner_url.value = ''; $('.ce-banner', form).setAttribute('style', bannerStyle({ ...u, banner_url: null })); }
    else { form.y_avatar_url.value = ''; $('.ce-av .ce-av-img', form).outerHTML = avatar({ ...userAv(u), avatar_url: u.avatar_url }, 'ce-av-img'); }
    b.remove();
  });
}

/* ── уведомления ────────────────────────────────────────── */
let unread = 0;
function setBadge(n) {
  unread = Math.max(0, n);
  $$('[data-notif-badge]').forEach(b => { b.textContent = unread > 99 ? '99+' : String(unread); b.classList.toggle('hidden', !unread); });
  document.title = (unread ? `(${unread > 99 ? '99+' : unread}) ` : '') + 'Y (переписки) · renah0cki';
}
async function loadUnread() {
  if (!S.uid) return;
  try { const r = await api(`notifications?user_id=eq.${S.uid}&read_at=is.null&select=id&limit=100`); setBadge(r.length); } catch {}
}
const NOTIF = {
  like: { ic: I.like, cls: 'n-like', t: 'оценил(а) ваш пост' },
  repost: { ic: I.rt, cls: 'n-rt', t: 'сделал(а) репост вашего поста' },
  page_repost: { ic: I.rt, cls: 'n-rt', t: 'сохранил(а) ваш пост к себе на страницу' },
  reply: { ic: I.reply, cls: 'n-blue', t: 'ответил(а) вам' },
  quote: { ic: I.quote, cls: 'n-blue', t: 'процитировал(а) ваш пост' },
  dm: { ic: I.mail, cls: 'n-blue', t: 'написал(а) вам в ЛС' },
  follow: { ic: I.user, cls: 'n-blue', t: 'подписался(-ась) на вас' },
};
const N_SEL = 'id,kind,snippet,created_at,read_at,post:post_id(id,short_code,room_id),aslot:actor_slot(id,char_name,handle,avatar_url),actor:actor_user(user_id,nick,y_name,avatar_url,y_avatar_url,username),room:room_id(id,short_code,title)';
function notifHref(n) {
  if (n.kind === 'follow') return n.actor ? userPath(n.actor) : '#/';
  if (n.kind === 'dm') return n.room && n.aslot ? roomPath(n.room, '/dm/' + n.aslot.id) : '#/dm';
  return n.post ? postPath(n.post) : '#/notifications';
}
function notifRow(n) {
  const k = NOTIF[n.kind] || NOTIF.reply;
  const who = n.aslot ? n.aslot : n.actor ? userAv(n.actor) : { char_name: '?' };
  const name = n.aslot?.char_name || (n.actor ? yName(n.actor) : 'Кто-то');
  const snip = n.snippet ? `<div class="n-snip">${esc(n.snippet)}</div>` : '';
  return `<a class="notif${n.read_at ? '' : ' unread'}" href="${notifHref(n)}">
    <span class="n-ic ${k.cls}">${k.ic}</span>
    <div class="n-main"><div class="n-av">${avatar(who, 'sm')}</div>
      <div class="n-text"><b>${esc(name)}</b> ${k.t}${n.room && n.kind !== 'follow' ? ` <span class="n-room">· ${esc(n.room.title)}</span>` : ''} <span class="n-time">· ${ago(n.created_at)}</span></div>
      ${snip}</div></a>`;
}
async function viewNotifs() {
  S.view = 'notifs'; updateNav(); renderRight();
  main.innerHTML = head('Уведомления') + loader();
  if (!S.uid) { main.innerHTML = head('Уведомления') + '<div class="empty"><h2>Нужно войти</h2><p>Войдите на renah0cki, чтобы получать уведомления.</p><a class="btn blue" href="/" style="margin-top:16px">Войти</a></div>'; return; }
  let rows;
  try { rows = await api(`notifications?user_id=eq.${S.uid}&select=${N_SEL}&order=created_at.desc&limit=100`); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'notifs') return;
  main.innerHTML = head('Уведомления') + (rows.length ? rows.map(notifRow).join('')
    : '<div class="empty"><h2>Пока пусто</h2><p>Здесь появятся лайки, репосты, ответы, сообщения и новые подписчики.</p></div>');
  if (rows.some(n => !n.read_at)) {
    try { await api(`notifications?user_id=eq.${S.uid}&read_at=is.null`, { method: 'PATCH', body: { read_at: new Date().toISOString() }, prefer: 'return=minimal' }); } catch {}
  }
  setBadge(0);
}
let notifT;
function onNotifInsert() {
  if (S.view === 'notifs') { clearTimeout(notifT); notifT = setTimeout(viewNotifs, 300); return; }
  setBadge(unread + 1);
}

/* ── настройки ──────────────────────────────────────────── */
/* ── связь с модераторами (техподдержка renah0cki) ───────── */
const sup = { thread: null, msgs: [], timer: null };
async function viewSupport() {
  S.view = 'support'; updateNav(); renderRight();
  clearInterval(sup.timer);
  if (!S.uid) { main.innerHTML = head('Связь с модераторами', { back: true }) + '<div class="empty"><h2>Нужно войти</h2><p>Войдите, чтобы написать модераторам.</p></div>'; return; }
  document.body.classList.add('chat-mode');
  main.innerHTML = head('Связь с модераторами', { back: true, sub: 'Техподдержка renah0cki' }) + `<div class="chat" id="supChat">${loader()}</div>
    <form class="chat-bar" id="supBar" autocomplete="off">
      <div class="chat-input"><textarea rows="1" maxlength="2000" placeholder="Опишите проблему или вопрос" aria-label="Сообщение модераторам"></textarea></div>
      <button class="chat-send" type="submit" disabled aria-label="Отправить">${I.send}</button></form>`;
  try { sup.thread = await api('rpc/support_get_or_create_thread', { method: 'POST', body: {}, schema: 'public' }); }
  catch (e) { return errorView(errText(e)); }
  await loadSupport(true);
  const bar = $('#supBar'), ta = $('textarea', bar), send = $('.chat-send', bar);
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; send.disabled = !ta.value.trim(); };
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); if (!send.disabled) bar.requestSubmit(); } };
  bar.onsubmit = async e => {
    e.preventDefault(); if (send.disabled) return; send.disabled = true;
    try {
      await api('support_messages', { method: 'POST', body: { thread_id: sup.thread, sender_id: S.uid, body: ta.value.trim() }, prefer: 'return=minimal', schema: 'public' });
      ta.value = ''; ta.oninput(); await loadSupport();
    } catch (err) { toast(errText(err), true); send.disabled = false; }
  };
  sup.timer = setInterval(() => { if (S.view === 'support') loadSupport(); else clearInterval(sup.timer); }, 8000);
}
async function loadSupport(jump = false) {
  let rows;
  try { rows = await api(`support_messages?thread_id=eq.${sup.thread}&order=created_at.asc&select=id,sender_id,body,created_at`, { schema: 'public' }); } catch { return; }
  if (S.view !== 'support') return;
  const box = $('#supChat'); if (!box) return;
  if (!jump && rows.length === sup.msgs.length) return;
  sup.msgs = rows;
  const nearBottom = innerHeight + scrollY >= document.body.scrollHeight - 160;
  if (!rows.length) { box.innerHTML = '<div class="chat-empty"><b>Напишите модераторам</b><span>Сообщение увидят модераторы renah0cki — на сайте и в Telegram. Ответ придёт сюда и в чат поддержки на сайте.</span></div>'; return; }
  let html = '', prev = null;
  rows.forEach((m, i) => {
    const next = rows[i + 1], t = new Date(m.created_at), mine = m.sender_id === S.uid;
    if (!prev || t - new Date(prev.created_at) > 3600e3) html += `<div class="chat-time">${chatTime(m.created_at)}</div>`;
    const tail = !next || next.sender_id !== m.sender_id;
    const first = !prev || prev.sender_id !== m.sender_id;
    html += `<div class="bub-row ${mine ? 'me' : 'them'}${first ? ' first' : ''}">${!mine && first ? '<div class="sup-who">Модератор</div>' : ''}<div class="bub${tail ? ' tail' : ''}"><div class="bub-text">${richText(m.body)}</div></div></div>`;
    prev = m;
  });
  box.innerHTML = html;
  if (jump || nearBottom) setTimeout(() => scrollTo({ top: document.body.scrollHeight }), 0);
}

/* ── правила и пользовательское соглашение ───────────────── */
function viewRules() {
  S.view = 'rules'; updateNav(); renderRight();
  main.innerHTML = head('Правила и соглашение', { back: true }) + `<article class="rules">
    <p class="rules-lead">Y (переписки) — ролевая игра на renah0cki: пользователи пишут посты, ответы и сообщения от лица персонажей. Пользуясь Y, вы соглашаетесь с этими правилами.</p>

    <h2>1. Персонажи вымышлены</h2>
    <p>Все персонажи в Y — вымышленные образы, созданные пользователями для ролевой игры, и <b>не связаны с реальными людьми</b>. Даже если имя, ник, внешность или характер персонажа напоминают реального человека (стримера, блогера, знакомого), это <b>не этот человек и не его аккаунт</b>.</p>
    <p>Любые совпадения случайны или носят дружеский, шуточный характер и <b>не несут негативного, оскорбительного или злого умысла</b> по отношению к кому-либо.</p>
    <p>Реальные люди, на которых могут быть похожи персонажи, <b>не имеют отношения к Y, не участвуют в игре, не пишут от имени персонажей и не несут ответственности</b> за посты, ответы и сообщения, опубликованные от лица этих персонажей. Их мнение и слова этим не выражаются.</p>
    <p>Всё, что пишется от лица персонажа, — художественный отыгрыш конкретного пользователя.</p>

    <h2>2. Кто отвечает за написанное</h2>
    <p>За каждый пост, ответ, сообщение и картинку отвечает пользователь, который их опубликовал, независимо от того, от какого персонажа он писал. Модераторы видят, кто на самом деле автор.</p>

    <h2>3. Что запрещено</h2>
    <ul>
      <li>выдавать себя за реального человека, чтобы обмануть других (будто это правда пишет он);</li>
      <li>травля, угрозы и оскорбления реальных людей, в том числе через персонажей;</li>
      <li>публикация чужих личных данных: адресов, телефонов, переписок, фото без согласия;</li>
      <li>18+ контент, жестокость, призывы к насилию и всё, что запрещено законом;</li>
      <li>спам, реклама, накрутки, обход блокировок и фильтра запрещённых слов.</li>
    </ul>

    <h2>4. Личные сообщения не полностью приватные</h2>
    <p>Личные сообщения между персонажами могут читать игроки, чья роль <b>выше роли обоих участников</b> переписки: переписки обычных игроков видят ГОИ и выше, переписки ГОЕВ — VIP и выше, переписки VIP — модераторы и админы. Читать можно только в комнатах, которые этот игрок и так видит, и только просмотр — писать от вашего имени никто не может.</p>
    <p>Не пишите в ЛС ничего личного и настоящего: это часть ролевой игры.</p>

    <h2>5. Подписки, синяя галочка и монеты</h2>
    <p>Роли ГОЙ и VIP покупаются за renah0cki coin на 30 дней и сами не продлеваются. Монеты — внутренняя валюта сайта, их нельзя вывести или обменять на деньги. Пополнение — добровольная поддержка renah0cki и не возвращается. При бане за нарушение правил оплаченный срок не компенсируется.</p>
    <p><b>Синяя галочка (✓)</b> возле имени профиля или персонажа в Y показывает исключительно то, что пользователь приобрёл статус <b>VIP</b>. Она <b>не означает</b> официальный аккаунт и не подтверждает, что за профилем или персонажем стоит реальный человек.</p>

    <h2>6. Модерация</h2>
    <p>Любой пост можно отправить модераторам через «⋯ → Пожаловаться». Модераторы могут удалять посты и ответы, освобождать персонажей, закрывать комнаты и блокировать аккаунт. Запрещённые слова автоматически скрываются звёздочками.</p>

    <h2>7. Если вас или ваш образ используют</h2>
    <p>Если вы реальный человек и не хотите, чтобы в Y был персонаж, похожий на вас, — <a href="#/support">напишите модераторам</a> или пожалуйтесь на посты. Такого персонажа уберут.</p>

    ${callsOk() ? `<h2>8. Голосовые звонки</h2>${callRulesHtml()}` : ''}

    <h2>Связь с модераторами</h2>
    <p>Вопросы, жалобы, просьбы — <a href="#/support">в техподдержку</a>. Сообщение увидят модераторы renah0cki.</p>

    <h2>6. Прочее</h2>
    <p>Y работает «как есть»: возможны ошибки и перерывы. Правила могут обновляться — актуальная версия всегда на этой странице.</p>
  </article>`;
}

function viewSettings() {
  S.view = 'settings'; updateNav(); renderRight();
  const t = curTheme();
  main.innerHTML = head('Настройки', { back: true })
    + `<div class="set-sec"><h2>Оформление</h2><p>Тема применяется только в Y и запоминается на этом устройстве.</p>
      <div class="theme-pick" role="radiogroup" aria-label="Тема">
        <label class="theme-opt dark${t === 'dark' ? ' on' : ''}"><input type="radio" name="theme" value="dark"${t === 'dark' ? ' checked' : ''}><span class="theme-prev"><i></i><i></i><i></i></span><span class="theme-name">Тёмная</span></label>
        <label class="theme-opt light${t === 'light' ? ' on' : ''}"><input type="radio" name="theme" value="light"${t === 'light' ? ' checked' : ''}><span class="theme-prev"><i></i><i></i><i></i></span><span class="theme-name">Светлая</span></label>
      </div></div>
    ${chatLookHtml()}
    ${callsOk() ? `<div class="set-sec"><h2>Звонки</h2><label class="set-toggle"><span><b>Изменять мой голос в звонках</b><small>Голос слегка выше или ниже — случайно при каждом звонке. Выключите, чтобы вас слышали обычным голосом.</small></span><input type="checkbox" data-voice-fx${voiceFxOn() ? ' checked' : ''}></label></div>` : ''}
    <div class="set-sec"><h2>Аккаунт</h2>
      ${S.me ? `<a class="set-row" href="${userPath(S.me)}">${I.user}<span>Мой профиль в Y</span></a>` : ''}
      <a class="set-row" href="#/support">${I.mail}<span>Связаться с модераторами</span></a>
      <a class="set-row" href="#/rules">${I.flag}<span>Правила и соглашение</span></a>
      ${callsOk() ? `<a class="set-row" href="#/voice">${I.phone}<span>Голосовые каналы (войсы)</span></a>` : ''}
      ${callsOk() && (mainAdmin() || glMod()) ? `<a class="set-row" href="#/calls">${I.shield}<span>Все идущие звонки (модерация)</span></a>` : ''}
      <a class="set-row site-only" href="/">${I.back}<span>Вернуться на renah0cki</span></a></div>`
    + (shopVisible() ? shopHtml() : '');
  fillCoinBalance(main);
  bindShop(main);
  bindChatLook(main);
  const vfx = $('[data-voice-fx]', main);
  if (vfx) vfx.onchange = () => { try { localStorage.setItem('rp_voice_fx', vfx.checked ? '1' : '0'); } catch {} toast(vfx.checked ? 'Голос в звонках будет изменяться' : 'В звонках вас будет слышно обычным голосом' + (CALL.id ? ' — со следующего звонка' : '')); };
  $$('input[name="theme"]', main).forEach(inp => inp.onchange = () => {
    setTheme(inp.value);
    $$('.theme-opt', main).forEach(l => l.classList.toggle('on', $('input', l).checked));
  });
}

/* ── вид переписок: как в X или как в Telegram; фон чата — с роли ГОЙ ── */
// узорные фоны: тёмная основа + рисунок из символов, окрашенный градиентом (как в Telegram)
const DOODLES = {
  space: ['★', '✦', '☾', '✧', '✶', '☄', '⊙', '✷', '✺'],
  math: ['π', '∑', '√', '∞', '∫', 'x²', '≠', '÷', 'Δ', 'θ', '%', '∂', 'λ'],
  love: ['♥', '♡', '✿', '❀', '✧', '❥', '☁', '✦'],
  games: ['✕', '○', '△', '□', '♠', '♣', '♦', '★', '⚑', '✚'],
  music: ['♪', '♫', '♬', '♩', '✦', '☆', '♯', '♭'],
  snow: ['❄', '❅', '❆', '✦', '·', '✧', '❉'],
};
function doodleSvg(kind) {
  const g = DOODLES[kind] || DOODLES.space, N = 90, W = 340;
  let seed = [...kind].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let out = '';
  for (let k = 0; k < N; k++) {
    const x = (rnd() * W).toFixed(1), y = (rnd() * W).toFixed(1), sz = (13 + rnd() * 15).toFixed(0), r = (rnd() * 60 - 30).toFixed(0);
    out += `<text x="${x}" y="${y}" font-size="${sz}" transform="rotate(${r} ${x} ${y})">${g[k % g.length]}</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" font-family="Segoe UI Symbol,Apple Symbols,Noto Sans Symbols 2,DejaVu Sans,sans-serif" fill="#000">${out}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
// [id, название, фон (css) | узор, градиент рисунка]
const CHAT_WALLS = [
  ['none', 'Без фона', ''],
  ['d-space', 'Космос', { d: 'space', base: '#0b0b16', grad: 'linear-gradient(160deg,#6a5cff,#2ad4ff 60%,#8c52ff)' }],
  ['d-math', 'Формулы', { d: 'math', base: '#0d0f0d', grad: 'linear-gradient(160deg,#e7f59a,#9be15d 50%,#f9d976)' }],
  ['d-love', 'Сказка', { d: 'love', base: '#110b17', grad: 'linear-gradient(160deg,#ff6ec4,#7873f5 55%,#4adede)' }],
  ['d-games', 'Игры', { d: 'games', base: '#0a0f12', grad: 'linear-gradient(160deg,#f6d365,#45e3a7 45%,#b56cff)' }],
  ['d-music', 'Музыка', { d: 'music', base: '#120d0a', grad: 'linear-gradient(160deg,#ffb36b,#ff5e62 55%,#ffd86b)' }],
  ['d-snow', 'Снежинки', { d: 'snow', base: '#0a0f17', grad: 'linear-gradient(160deg,#5ee7df,#3f8cff 50%,#b490ca)' }],
  ['sky', 'Небо', 'linear-gradient(160deg,#4f7fb5,#8fb3d9 50%,#c7d9a7)'],
  ['night', 'Ночь', 'radial-gradient(circle at 20% 20%,#3a2d6b,transparent 45%),radial-gradient(circle at 80% 75%,#1d4e6b,transparent 50%),#0b0f1d'],
  ['mint', 'Мята', 'linear-gradient(135deg,#a8e6cf,#dcedc1 50%,#ffd3b6)'],
  ['sunset', 'Закат', 'linear-gradient(160deg,#ff9a8b,#ff6a88 45%,#ff99ac)'],
  ['lilac', 'Сирень', 'linear-gradient(160deg,#c3a6ff,#8ec5fc)'],
];
// превью в настройках — та же картинка, что и в чате
const wallPreview = w => !w ? '' : typeof w === 'string' ? `background:${w}` : `background:${w.base}; --pv-grad:${w.grad}; --pv-mask:${doodleSvg(w.d)}`;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const wallOk = () => rank() >= 1;
function wallCss() {
  const w = lsGet('rp_chat_wall') || 'none';
  if (w.startsWith('img:')) { const u = w.slice(4); return /^https:\/\/cdn\.renah0cki\.xyz\/file\/[^"'()\s]+$/.test(u) ? `url("${u}") center/cover no-repeat` : ''; }
  return (CHAT_WALLS.find(x => x[0] === w) || CHAT_WALLS[0])[2];
}
function applyChatLook() {
  const de = document.documentElement;
  de.dataset.chat = lsGet('rp_chat_style') === 'tg' ? 'tg' : 'x';
  const w = wallOk() ? wallCss() : '';
  ['--chat-wall', '--wall-grad', '--wall-mask'].forEach(v => de.style.removeProperty(v));
  de.classList.remove('has-wall', 'wall-doodle');
  if (!w) return;
  de.classList.add('has-wall');
  if (typeof w === 'string') de.style.setProperty('--chat-wall', w);
  else { de.classList.add('wall-doodle'); de.style.setProperty('--chat-wall', w.base); de.style.setProperty('--wall-grad', w.grad); de.style.setProperty('--wall-mask', doodleSvg(w.d)); }
}
function chatLookHtml() {
  const st = lsGet('rp_chat_style') === 'tg' ? 'tg' : 'x', w = lsGet('rp_chat_wall') || 'none', ok = wallOk();
  const own = w.startsWith('img:') ? w.slice(4) : '';
  return `<div class="set-sec"><h2>Переписки</h2><p>Как выглядят личные сообщения. Запоминается на этом устройстве.</p>
    <div class="theme-pick chat-pick" role="radiogroup" aria-label="Вид переписок">
      <label class="theme-opt${st === 'x' ? ' on' : ''}"><input type="radio" name="chatstyle" value="x"${st === 'x' ? ' checked' : ''}><span class="cl-prev cl-x"><i></i><i></i><i></i></span><b>Как в X</b></label>
      <label class="theme-opt${st === 'tg' ? ' on' : ''}"><input type="radio" name="chatstyle" value="tg"${st === 'tg' ? ' checked' : ''}><span class="cl-prev cl-tg"><i></i><i></i><i></i></span><b>Как в Telegram</b></label>
    </div>
    <h3 class="wall-h">Фон чата ${ok ? '' : '<span class="wall-lock">с роли ГОЙ</span>'}</h3>
    <div class="wall-grid${ok ? '' : ' locked'}">
      ${CHAT_WALLS.map(([id, name, css]) => `<button type="button" class="wall${typeof css === 'object' ? ' wall-dd' : ''}${w === id ? ' on' : ''}" data-wall="${id}" title="${name}" style="${esc(wallPreview(css))}"${ok ? '' : ' disabled'}><span>${name}</span></button>`).join('')}
      <label class="wall wall-own${own ? ' on' : ''}" title="Своя картинка" style="${own ? `background:url('${esc(own)}') center/cover` : ''}"><input type="file" accept="image/*" hidden${ok ? '' : ' disabled'}><span>${own ? 'Своя' : '+ Своя картинка'}</span></label>
    </div>
    ${ok ? '' : `<p class="wall-note">Свой фон в переписках — привилегия ГОЙ и выше. <a href="#" data-to-shop>Оформить подписку</a></p>`}</div>`;
}
function bindChatLook(root) {
  $$('input[name="chatstyle"]', root).forEach(inp => inp.onchange = () => {
    lsSet('rp_chat_style', inp.value === 'tg' ? 'tg' : null); applyChatLook();
    $$('.chat-pick .theme-opt', root).forEach(l => l.classList.toggle('on', $('input', l).checked));
  });
  const grid = $('.wall-grid', root); if (!grid) return;
  grid.onclick = e => {
    const b = e.target.closest('[data-wall]'); if (!b || !wallOk()) return;
    lsSet('rp_chat_wall', b.dataset.wall === 'none' ? null : b.dataset.wall); applyChatLook();
    $$('.wall', grid).forEach(x => x.classList.toggle('on', x === b));
    toast('Фон чата изменён');
  };
  const fi = $('.wall-own input', root);
  if (fi) fi.onchange = async () => {
    const f = fi.files[0]; fi.value = ''; if (!f || !wallOk()) return;
    const lbl = fi.parentElement; $('span', lbl).textContent = 'Загрузка…';
    try {
      const url = await uploadImage(f);
      lsSet('rp_chat_wall', 'img:' + url); applyChatLook();
      lbl.style.background = `url('${url}') center/cover`; $('span', lbl).textContent = 'Своя';
      $$('.wall', grid).forEach(x => x.classList.toggle('on', x === lbl)); toast('Фон чата изменён');
    } catch (e) { $('span', lbl).textContent = '+ Своя картинка'; toast(errText(e), true); }
  };
  const ts = $('[data-to-shop]', root);
  if (ts) ts.onclick = e => { e.preventDefault(); $('.shop-grid', root)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
}

/* ── подписка Y за renah0cki coin (пока только meRockstar) ── */
const shopVisible = () => !!S.uid; // подписки ГОЙ/VIP — всем вошедшим
const SHOP_ROLES = [
  { id: 'goy', price: 67, perks: ['Создавать своих персонажей', 'Своя аватарка в Y', 'Свой фон чата в переписках', 'GIF в постах и сообщениях: поиск, свои .gif и «Мои GIF»', 'Читать переписки обычных игроков'] },
  { id: 'vip', price: 141, perks: ['Всё, что даёт ГОЙ', 'Синяя галочка VIP ✓ у имени и персонажей (как в X)', 'Свой баннер (шапка) в профиле Y и у персонажей', 'Доступ к закрытым комнатам «VIP и выше»', 'Читать переписки ГОЕВ'] },
];
function shopHtml() {
  const me = S.me || {};
  const active = paidActive(me);
  const until = active ? new Date(me.paid_until) : null;
  const status = active
    ? `Активна роль <b>${ROLE_NAME[me.paid_role]}</b> до ${until.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
    : (ROLE_RANK[me.rp_role] ?? 0) >= 1 ? `Ваша роль: <b>${ROLE_NAME[me.rp_role]}</b>` : 'Подписки нет';
  return `<div class="set-sec"><h2>Подписка</h2><p>${status} · Баланс: ${coinIco()} <b data-coin-bal>…</b> coin</p>
    <div class="shop-grid">${SHOP_ROLES.map(r => {
      const base = (ROLE_RANK[me.rp_role] ?? 0) >= ROLE_RANK[r.id];
      const higher = active && ROLE_RANK[me.paid_role] > ROLE_RANK[r.id];
      const renew = active && me.paid_role === r.id;
      const label = base ? 'Уже есть' : higher ? 'Есть выше' : renew ? 'Продлить на 30 дней' : (active && me.paid_role === 'goy' && r.id === 'vip') ? 'Перейти на VIP' : 'Купить на 30 дней';
      return `<div class="shop-card"><div class="shop-name">${ROLE_NAME[r.id]}</div>
        <div class="shop-price">${coinIco()} <b>${r.price}</b> / 30 дней</div>
        <ul>${r.perks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <button type="button" class="btn${base || higher ? ' ghost' : ' blue'} small" data-buy-role="${r.id}"${base || higher ? ' disabled' : ''}>${label}</button></div>`;
    }).join('')}</div>
    <p style="margin:12px 0 0">Роль не продлевается сама: когда срок закончится, её можно купить снова. При переходе с ГОЯ на VIP оставшиеся дни пересчитываются в дни VIP. Синяя галочка ✓ означает активную подписку VIP в Y и не является подтверждением личности или официального аккаунта.</p></div>`;
}
function bindShop(root) {
  $$('[data-buy-role]', root).forEach(b => b.onclick = async () => {
    const r = SHOP_ROLES.find(x => x.id === b.dataset.buyRole);
    if (!r || !confirm(`Купить роль ${ROLE_NAME[r.id]} на 30 дней за ${r.price} coin?`)) return;
    b.disabled = true;
    try {
      const res = await api('rpc/buy_role', { method: 'POST', body: { p_role: r.id, p_months: 1 } });
      Object.assign(S.me, { paid_role: res.role, paid_until: res.until });
      toast(`Готово! ${ROLE_NAME[r.id]} до ${new Date(res.until).toLocaleDateString('ru-RU')}`);
      renderMe(); updateNav(); viewSettings();
    } catch (e) { toast(errText(e), true); b.disabled = false; }
  });
}

/* ── тема ───────────────────────────────────────────────── */
const curTheme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const themeLabel = () => curTheme() === 'light' ? 'Тёмная тема' : 'Светлая тема';
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('rp_theme', t); } catch {}
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'light' ? '#ffffff' : '#000000';
  $$('[data-theme-label]').forEach(el => { el.textContent = themeLabel(); });
}
document.addEventListener('click', e => { if (e.target.closest('[data-theme-toggle]')) setTheme(curTheme() === 'light' ? 'dark' : 'light'); });
$$('[data-theme-label]').forEach(el => { el.textContent = themeLabel(); });

/* ── ЛС ─────────────────────────────────────────────────── */
// от кого писать: свой слот; владелец/staff — ещё и свободные (NPC) слоты
function dmOptions() { if (!S.room || !S.uid) return []; return S.slots.filter(x => x.player_id === S.uid); }
function dmSlot() { return dmOptions()[0] || null; }
function dmAsSelect() {
  return ''; // писать в ЛС можно только за своего персонажа
  const o = dmOptions(); if (o.length < 2) return '';
  return `<select class="as-select" data-dm-as aria-label="Писать от имени">${o.map(x => `<option value="${x.id}"${x.id === dmSlot()?.id ? ' selected' : ''}>${esc(x.char_name)}${x.player_id ? '' : ' (NPC)'}</option>`).join('')}</select>`;
}
main.addEventListener('change', e => {
  const sel = e.target.closest('[data-dm-as]'); if (!sel) return;
  S.dmAs = sel.value; route();
});
function chatTime(ts) {
  const d = new Date(ts), now = new Date(), t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 864e5;
  if (diff === 0) return 'Сегодня ' + t;
  if (diff === 1) return 'Вчера ' + t;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''} ${t}`;
}

async function viewDmHub() {
  S.view = 'dmhub'; updateNav(); renderRight();
  const peek = peekOk();
  if (S.room && !peek) { location.replace(roomPath(S.room, '/dm')); return; }
  main.innerHTML = head('Сообщения') + loader();
  try { await loadMySlots(); } catch {}
  if (S.view !== 'dmhub') return;
  const mine = S.mySlots.filter(x => x.room);
  if (mine.length === 1 && !peek) { location.replace(roomPath(mine[0].room, '/dm')); return; }
  main.innerHTML = head('Сообщения', { sub: 'Переписка идёт внутри комнат' })
    + (peek && mine.length ? '<div class="peek-head" style="border-top:0;margin-top:0">Мои переписки</div>' : '')
    + (mine.length
      ? mine.map(x => `<a class="room-item" href="${roomPath(x.room, '/dm')}">${roomIcon(x.room)}<div style="min-width:0;flex:1"><div class="t">${esc(x.room.title)}</div><div class="m">вы играете за ${esc(x.char_name)}</div></div></a>`).join('')
      : (peek ? '' : '<div class="empty"><h2>Пока нет переписок</h2><p>Займите персонажа в комнате, чтобы писать другим персонажам.</p><a class="btn blue" href="#/rooms" style="margin-top:16px">К комнатам</a></div>'))
    + (peek ? `<div id="peekAll">${loader()}</div>` : '');
  if (peek) fillPeekAll(new Set(S.mySlots.map(x => x.id)));
}
// чужие переписки из всех комнат, которые видны по роли — без захода в комнату
async function fillPeekAll(mySlotIds) {
  // сначала — прошлый список из памяти (мгновенно), потом свежий
  const ck = 'rp_peek_' + (S.uid || '');
  try { const c = JSON.parse(localStorage.getItem(ck) || 'null'); if (c) drawPeekAll(c); } catch {}
  let pairs;
  try {
    // быстрый путь: база сама собирает по одной строке на переписку
    const r = await rpc('dm_pairs');
    pairs = r.map(x => ({ room: x.room_id, a: x.a, b: x.b, at: x.created_at, n: +x.cnt, m: { body: x.body, voice_url: x.has_voice ? 1 : null, images: x.n_imgs ? [1] : [] } }));
  } catch {
    let rows;
    try { rows = await api(`dms?select=*&order=created_at.desc&limit=1000`); }
    catch (e) { const b = $('#peekAll'); if (b) b.innerHTML = `<div class="empty">${esc(errText(e))}</div>`; return; }
    const map = new Map();
    rows.forEach(m => { const [a, b] = [m.from_slot, m.to_slot].sort(), k = m.room_id + a + b; if (!map.has(k)) map.set(k, { room: m.room_id, a, b, at: m.created_at, m, n: 0 }); map.get(k).n++; });
    pairs = [...map.values()];
  }
  pairs = pairs.filter(x => !mySlotIds.has(x.a) && !mySlotIds.has(x.b)).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 150);
  const slotIds = [...new Set(pairs.flatMap(x => [x.a, x.b]))], roomIds = [...new Set(pairs.map(x => x.room))];
  const chunk = (arr, n) => arr.reduce((acc, v, i) => (i % n ? acc[acc.length - 1].push(v) : acc.push([v]), acc), []);
  let slots = [], rooms = [];
  try {
    [slots, rooms] = await Promise.all([
      Promise.all(chunk(slotIds, 80).map(c => api(`slots?id=in.(${c.join(',')})&select=id,char_name,handle,avatar_url`))).then(r => r.flat()),
      Promise.all(chunk(roomIds, 80).map(c => api(`rooms?id=in.(${c.join(',')})&select=id,title,short_code,image_url`))).then(r => r.flat()),
    ]);
  } catch {}
  const sm = new Map(slots.map(x => [x.id, x])), rm = new Map(rooms.map(r => [r.id, r]));
  const data = pairs.filter(x => sm.has(x.a) && sm.has(x.b) && rm.has(x.room)).map(x => ({ ...x, A: sm.get(x.a), B: sm.get(x.b), R: rm.get(x.room) }));
  try { localStorage.setItem(ck, JSON.stringify(data)); } catch {}
  drawPeekAll(data);
}
function drawPeekAll(vis) {
  const box = $('#peekAll'); if (!box || S.view !== 'dmhub') return;
  box.innerHTML = `<div class="peek-head">Переписки других <span>видны вам по роли</span></div>` + (vis.length ? vis.map(({ a, b, m, n, A, B, R, at }) => {
    const txt = m.call_event ? '📞 ' + callEventText(m, true) : m.body || (m.voice_url ? '🎤 Голосовое' : m.images?.length ? 'Фото' : '');
    return `<a class="dm-row" href="${roomPath(R, `/peek/${a}/${b}`)}"><div class="peek-avs">${avatar(A, 'sm')}${avatar(B, 'sm')}</div><div class="dm-main"><div class="dm-top"><b>${esc(A.char_name)} и ${esc(B.char_name)}</b><span class="dot">·</span><time>${ago(at)}</time></div>
      <div class="dm-last"><span class="dm-none">${esc(R.title)} ·</span> ${esc(txt)} <span class="dm-none">· ${n} ${plural(n, 'сообщение', 'сообщения', 'сообщений')}</span></div></div></a>`;
  }).join('') : '<div class="empty"><p>Пока нет переписок, доступных вам по роли.</p></div>');
}

async function viewDmList(roomKey) {
  S.view = 'dms'; main.innerHTML = head('Сообщения', { back: true }) + loader(); updateNav();
  try { await loadRoom(roomKey); } catch (e) { return errorView(errText(e)); }
  updateNav(); renderRight();
  const me = dmSlot();
  const h = head('Сообщения', { back: true, extra: `<a class="dm-room" href="${roomPath(S.room)}">${roomIcon(S.room, 'mini')}<span>${esc(S.room.title)}</span></a>` });
  if (!S.uid) { main.innerHTML = h + `<div class="composer-hint"><span>Войдите, чтобы переписываться.</span><a class="btn small blue" href="/">Войти</a></div>`; return; }
  if (!me) { main.innerHTML = h + `<div class="empty"><h2>Нет персонажа</h2><p>Займите персонажа в этой комнате, чтобы писать другим.</p><a class="btn blue" href="${roomPath(S.room, '/chars')}" style="margin-top:16px">Выбрать персонажа</a></div>` + (peekOk() ? '<div id="peekList"></div>' : ''); if (peekOk()) fillPeekList(null); return; }
  let rows;
  try { rows = await api(`dms?room_id=eq.${S.room.id}&or=(from_slot.eq.${me.id},to_slot.eq.${me.id})&select=*&order=created_at.desc&limit=1000`); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'dms') return;
  const last = new Map();
  rows.forEach(m => { const peer = m.from_slot === me.id ? m.to_slot : m.from_slot; if (!last.has(peer)) last.set(peer, m); });
  // сначала те, с кем есть переписка (по свежести), потом все остальные персонажи комнаты
  const withMsgs = [...last.entries()].filter(([pid]) => S.slotMap.has(pid));
  const rest = S.slots.filter(x => x.id !== me.id && !last.has(x.id)).map(x => [x.id, null]);
  const items = [...withMsgs, ...rest];
  main.innerHTML = h + (items.length ? items.map(([pid, m]) => {
      const peer = S.slotMap.get(pid);
      const txt = m ? (m.call_event ? '📞 ' + callEventText(m, true) : m.body || (m.voice_url ? '🎤 Голосовое' : m.images?.length ? 'Фото' : '')) : '';
      return `<a class="dm-row" href="${roomPath(S.room, '/dm/' + pid)}">${avatar(peer)}<div class="dm-main"><div class="dm-top"><b>${esc(peer.char_name)}</b>${m ? `<span class="dot">·</span><time>${ago(m.created_at)}</time>` : ''}</div>
        <div class="dm-last">${m ? esc(txt) : '<span class="dm-none">Пусто</span>'}</div></div></a>`;
    }).join('')
    : '<div class="empty"><h2>В комнате больше никого</h2><p>Когда владелец добавит персонажей, им можно будет написать.</p></div>')
    + (peekOk() ? '<div id="peekList"></div>' : '');
  if (peekOk()) fillPeekList(me.id);
}
// переписки других персонажей, которые видны по роли (выше обоих участников)
async function fillPeekList(myId) {
  const box = $('#peekList'); if (!box) return;
  let rows;
  try { rows = await api(`dms?room_id=eq.${S.room.id}&select=*&order=created_at.desc&limit=2000`); }
  catch { return; }
  const pairs = new Map();
  rows.forEach(m => {
    if (myId && (m.from_slot === myId || m.to_slot === myId)) return;
    const [a, b] = [m.from_slot, m.to_slot].sort();
    const k = a + '|' + b;
    if (!pairs.has(k)) pairs.set(k, { a, b, m, n: 0 });
    pairs.get(k).n++;
  });
  const items = [...pairs.values()].filter(x => S.slotMap.has(x.a) && S.slotMap.has(x.b));
  if (!items.length || !$('#peekList')) return;
  box.innerHTML = `<div class="peek-head">Переписки других <span>видны вам по роли</span></div>` + items.map(({ a, b, m, n }) => {
    const A = S.slotMap.get(a), B = S.slotMap.get(b);
    const txt = m.call_event ? '📞 ' + callEventText(m, true) : m.body || (m.voice_url ? '🎤 Голосовое' : m.images?.length ? 'Фото' : '');
    return `<a class="dm-row" href="${roomPath(S.room, `/peek/${a}/${b}`)}"><div class="peek-avs">${avatar(A, 'sm')}${avatar(B, 'sm')}</div><div class="dm-main"><div class="dm-top"><b>${esc(A.char_name)} и ${esc(B.char_name)}</b><span class="dot">·</span><time>${ago(m.created_at)}</time></div>
      <div class="dm-last">${esc(txt)} <span class="dm-none">· ${n} ${plural(n, 'сообщение', 'сообщения', 'сообщений')}</span></div></div></a>`;
  }).join('');
}
// чтение чужой переписки (только просмотр)
async function viewDmPeek(roomKey, aId, bId) {
  S.view = 'dmpeek'; document.body.classList.add('chat-mode');
  main.innerHTML = head('Переписка', { back: true }) + loader(); updateNav();
  try { await loadRoom(roomKey); } catch (e) { return errorView(errText(e)); }
  updateNav(); renderRight();
  const A = S.slotMap.get(aId), B = S.slotMap.get(bId);
  if (!A || !B) return errorView('Персонаж не найден в этой комнате');
  if (!peekOk()) return errorView('Нет доступа');
  Object.assign(chat, { msgs: [], me: A.id, peer: B.id, ids: new Set() });
  main.innerHTML = `<div class="head chat-head"><div class="head-row">
      <button class="icon-btn" data-back aria-label="Назад">${I.back}</button>
      <div class="chat-peer"><span class="peek-avs">${avatar(A, 'sm')}${avatar(B, 'sm')}</span><span class="chat-peer-name">${esc(A.char_name)} и ${esc(B.char_name)}</span></div>
      <span class="chat-spacer"></span></div></div>
    <div class="peek-note">Вы читаете чужую переписку — только просмотр. Справа сообщения ${esc(A.char_name)}.</div>
    <div class="chat" id="chat">${loader()}</div>`;
  let rows;
  try { rows = await api(`dms?room_id=eq.${S.room.id}&or=(and(from_slot.eq.${A.id},to_slot.eq.${B.id}),and(from_slot.eq.${B.id},to_slot.eq.${A.id}))&select=*&order=created_at.asc&limit=1000`); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'dmpeek') return;
  if (!rows.length) { $('#chat').innerHTML = '<div class="empty"><h2>Нет доступа или пусто</h2><p>Переписка видна только ролям выше обоих участников.</p></div>'; return; }
  rows.forEach(m => { chat.msgs.push(m); chat.ids.add(m.id); });
  drawChat(true);
}
main.addEventListener('click', e => {
  if (!e.target.closest('[data-dm-new]') || !S.room) return;
  const me = dmSlot(); if (!me) return;
  const others = S.slots.filter(x => x.id !== me.id);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Новое сообщение"><div class="head"><div class="head-row"><button type="button" class="icon-btn" data-close aria-label="Закрыть">${I.close}</button><div class="head-title"><h1>Кому написать</h1></div></div></div>
    ${others.length ? others.map(x => `<a class="char lib-item" href="${roomPath(S.room, '/dm/' + x.id)}">${avatar(x)}<div class="char-main"><div class="name">${esc(x.char_name)}</div><div class="handle">@${esc(x.handle)}</div><div class="st">${x.player_id ? 'играет ' + esc(x.player?.nick || 'игрок') : 'свободен'}</div></div></a>`).join('') : '<div class="empty">В комнате больше нет персонажей.</div>'}</div>`;
  ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('[data-close]') || ev.target.closest('a')) { ov.remove(); document.body.style.overflow = ''; } });
  document.body.append(ov); document.body.style.overflow = 'hidden';
});

const chat = { msgs: [], me: null, peer: null, ids: new Set() };
async function viewDmChat(roomKey, peerId) {
  S.view = 'dm'; document.body.classList.add('chat-mode');
  main.innerHTML = head('Сообщения', { back: true }) + loader(); updateNav();
  try { await loadRoom(roomKey); } catch (e) { return errorView(errText(e)); }
  updateNav(); renderRight();
  const me = dmSlot(), peer = S.slotMap.get(peerId);
  if (!peer) return errorView('Персонаж не найден в этой комнате');
  if (!me) { main.innerHTML = head(peer.char_name, { back: true }) + `<div class="empty"><h2>Нет персонажа</h2><p>Займите персонажа в комнате, чтобы писать.</p><a class="btn blue" href="${roomPath(S.room, '/chars')}" style="margin-top:16px">Выбрать персонажа</a></div>`; return; }
  if (me.id === peer.id) { location.replace(roomPath(S.room, '/dm')); return; }
  Object.assign(chat, { msgs: [], me: me.id, peer: peer.id, ids: new Set() });
  main.innerHTML = `<div class="head chat-head"><div class="head-row">
      <button class="icon-btn" data-back aria-label="Назад">${I.back}</button>
      <a class="chat-peer" href="${peer.character_id ? `#/c/${peer.character_id}` : roomPath(S.room, '/chars')}">${avatar(peer, 'sm')}<span class="chat-peer-name">${esc(peer.char_name)}</span></a>
      ${callsOk() ? `<button class="icon-btn" data-call-dm title="Позвонить" aria-label="Позвонить">${I.phone}</button>` : '<span class="chat-spacer"></span>'}</div>
      ${dmAsSelect() ? `<div class="chat-as"><span>Вы пишете как</span>${dmAsSelect()}</div>` : ''}</div>
    <div class="chat" id="chat">${loader()}</div>
    <form class="chat-bar" id="chatBar" autocomplete="off">
      <label class="chat-tool" aria-label="Добавить фото">${I.image}<input type="file" accept="image/*" multiple hidden></label>
      ${gifOk() ? '<button type="button" class="chat-tool gif-tool" data-gif-open aria-label="Добавить GIF">GIF</button>' : ''}
      ${voiceOk() ? `<button type="button" class="chat-tool" data-voice aria-label="Записать голосовое">${I.mic}</button>` : ''}
      <div class="chat-input"><div class="thumbs hidden"></div><textarea rows="1" maxlength="1000" placeholder="Сообщение" aria-label="Сообщение"></textarea></div>
      <button class="chat-send" type="submit" disabled aria-label="Отправить">${I.send}</button>
    </form>`;
  let rows;
  try { rows = await api(`dms?room_id=eq.${S.room.id}&or=(and(from_slot.eq.${me.id},to_slot.eq.${peer.id}),and(from_slot.eq.${peer.id},to_slot.eq.${me.id}))&select=*&order=created_at.asc&limit=1000`); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'dm') return;
  rows.forEach(m => { chat.msgs.push(m); chat.ids.add(m.id); });
  drawChat(true);
  wireChatBar();
  markDmRead();
  callDraw();
}
// текст записи о звонке в ЛС (short — для списка переписок)
function callEventText(m, short = false) {
  const e = m.call_event || {};
  const dur = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  if (short) return e.type === 'end' ? `Звонок · ${dur(e.secs || 0)}` : e.type === 'declined' ? 'Отклонённый звонок' : e.type === 'missed' ? 'Пропущенный звонок' : 'Звонок';
  const mine = S.view === 'dm' && m.from_slot === chat.me;
  const who = S.slotMap.get(m.from_slot)?.char_name || 'Собеседник';
  if (e.type === 'start') return mine ? 'Вы начали звонок' : `${who} начал(а) звонок`;
  if (e.type === 'end') return `Звонок окончен · ${dur(e.secs || 0)}`;
  if (e.type === 'declined') return S.view !== 'dm' ? 'Звонок отклонён' : mine ? 'Собеседник отклонил звонок' : 'Вы отклонили звонок';
  if (e.type === 'missed') return S.view !== 'dm' ? 'Пропущенный звонок' : mine ? 'Звонок без ответа' : 'Пропущенный звонок';
  return 'Звонок';
}
function drawChat(jump = false) {
  const box = $('#chat'); if (!box) return;
  const nearBottom = innerHeight + scrollY >= document.body.scrollHeight - 160;
  if (!chat.msgs.length) { box.innerHTML = `<div class="chat-empty">${avatar(S.slotMap.get(chat.peer), 'lg')}<b>${esc(S.slotMap.get(chat.peer)?.char_name || '')}</b><span>Начните переписку. Её могут читать игроки с ролью выше вашей и выше роли собеседника.</span></div>`; return; }
  let html = '', prev = null;
  const HOUR = 60 * 60e3;
  chat.msgs.forEach((m, i) => {
    const next = chat.msgs[i + 1], t = new Date(m.created_at);
    if (!prev || t - new Date(prev.created_at) > HOUR) html += `<div class="chat-time">${chatTime(m.created_at)}</div>`;
    if (m.call_event) {
      html += `<div class="chat-call ${esc(m.call_event.type || '')}"><span class="cc-ic">${I.phone}</span><span>${esc(callEventText(m))}</span><time>${t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time></div>`;
      prev = m; return;
    }
    const mine = m.from_slot === chat.me;
    const tail = !next || next.call_event || next.from_slot !== m.from_slot || new Date(next.created_at) - t > HOUR;
    const first = !prev || prev.call_event || prev.from_slot !== m.from_slot || t - new Date(prev.created_at) > HOUR;
    html += `<div class="bub-row ${mine ? 'me' : 'them'}${first ? ' first' : ''}"><div class="bub${tail ? ' tail' : ''}" title="${esc(fullDate(m.created_at))}">`
      + (m.images?.length ? `<div class="bub-imgs n${m.images.length}">${m.images.map(u => `<img src="${esc(u)}" alt="" loading="lazy" data-zoom>`).join('')}</div>` : '')
      + voiceHtml(m.voice_url)
      + (m.body ? `<div class="bub-text">${richText(m.body)}</div>` : '') + `<span class="bub-time">${new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}${mine && (S.view === 'dm' || S.view === 'dmpeek') ? `<i class="ticks${m.read_at ? ' read' : ''}" title="${m.read_at ? 'Прочитано' : 'Отправлено'}">${m.read_at ? I.check2 : I.check1}</i>` : ''}</span></div></div>`;
    prev = m;
  });
  const lastM = [...chat.msgs].reverse().find(x => !x.call_event);
  if ((S.view === 'dm' || S.view === 'dmpeek') && lastM && lastM.from_slot === chat.me) html += `<div class="bub-status${lastM.read_at ? ' read' : ''}">${lastM.read_at ? I.check2 + 'Прочитано' : I.check1 + 'Отправлено'}</div>`;
  box.innerHTML = html;
  if (jump || nearBottom) requestAnimationFrame(() => scrollTo({ top: document.body.scrollHeight, behavior: jump ? 'auto' : 'smooth' }));
}
function wireChatBar() {
  const bar = $('#chatBar'), ta = $('textarea', bar), send = $('.chat-send', bar), file = $('input[type=file]', bar), thumbs = $('.thumbs', bar);
  const imgs = [];
  const update = () => {
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    send.disabled = imgs.some(i => i.loading) || (!ta.value.trim() && !imgs.some(i => i.url));
  };
  const drawThumbs = () => {
    thumbs.classList.toggle('hidden', !imgs.length);
    thumbs.innerHTML = imgs.map((im, i) => `<div class="thumb${im.loading ? ' loading' : ''}"><img src="${esc(im.preview)}" alt=""><button type="button" data-rm="${i}" aria-label="Убрать">${I.close}</button></div>`).join('');
    update();
  };
  thumbs.onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; imgs.splice(+b.dataset.rm, 1); drawThumbs(); };
  const gifBtn = $('[data-gif-open]', bar);
  if (gifBtn) gifBtn.onclick = () => {
    if (imgs.length >= MAX_IMG) return toast(`Не больше ${MAX_IMG} картинок`, true);
    gifPicker(url => { imgs.push({ url, preview: url, loading: false }); drawThumbs(); });
  };
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
  ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); if (!send.disabled) bar.requestSubmit(); } };
  const vBtn = $('[data-voice]', bar);
  if (vBtn) vBtn.onclick = () => recordVoice(bar, async url => {
    const [row] = await api('dms', { method: 'POST', body: { room_id: S.room.id, from_slot: chat.me, to_slot: chat.peer, body: '', images: [], voice_url: url }, prefer: 'return=representation' });
    addChatMsg(row);
  });
  bar.onsubmit = async e => {
    e.preventDefault();
    if (send.disabled) return;
    send.disabled = true;
    const body = { room_id: S.room.id, from_slot: chat.me, to_slot: chat.peer, body: ta.value.trim(), images: imgs.filter(i => i.url).map(i => i.url) };
    try {
      const [row] = await api('dms', { method: 'POST', body, prefer: 'return=representation' });
      ta.value = ''; imgs.length = 0; drawThumbs();
      addChatMsg(row);
      ta.focus();
    } catch (err) { toast(errText(err), true); update(); }
  };
  if (matchMedia('(pointer: fine)').matches) ta.focus();
}
function addChatMsg(m) {
  if (chat.ids.has(m.id)) return;
  chat.ids.add(m.id); chat.msgs.push(m); drawChat();
  if (m.from_slot === chat.peer) markDmRead();
}
// собеседник прочитал: открыт свой чат и вкладка видна
let readT;
function markDmRead() {
  clearTimeout(readT);
  readT = setTimeout(() => {
    if (S.view !== 'dm' || document.hidden || !chat.me || !chat.msgs.some(m => m.from_slot === chat.peer && !m.read_at)) return;
    rpc('dm_mark_read', { p_room: S.room.id, p_me: chat.me, p_peer: chat.peer }).then(() => { chat.msgs.forEach(m => { if (m.from_slot === chat.peer && !m.read_at) m.read_at = new Date().toISOString(); }); }).catch(() => {});
  }, 400);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) markDmRead(); });
function onDmUpdate(row) {
  if (S.view !== 'dm') return;
  const m = chat.msgs.find(x => x.id === row.id); if (!m || m.read_at === row.read_at) return;
  m.read_at = row.read_at; drawChat();
}
let dmListT;
function onDmInsert(row) {
  if (S.view === 'dm' && ((row.from_slot === chat.me && row.to_slot === chat.peer) || (row.from_slot === chat.peer && row.to_slot === chat.me))) addChatMsg(row);
  else if (S.view === 'dms') { clearTimeout(dmListT); dmListT = setTimeout(() => { if (S.view === 'dms') viewDmList(S.room.short_code || S.room.id); }, 300); }
}

/* правая колонка */
function renderRight() {
  if (!matchMedia('(min-width: 1024px)').matches) { right.innerHTML = ''; return; }
  if (!S.room || ['home', 'rooms', 'create', 'lib', 'char', 'user', 'dmhub', 'settings', 'notifs', 'rules', 'support', 'voice', 'calls', 'callinvite'].includes(S.view)) {
    const mine = S.mySlots.filter(x => x.room);
    right.innerHTML = `<div class="panel"><h2>Y (переписки)</h2><p>Заходите в комнату, занимайте персонажа и отыгрывайте его: посты, ответы, лайки, ЛС.</p></div>
      ${mine.length ? `<div class="panel"><h2>Ваши роли</h2>${mine.map(x => `<a class="row" href="${roomPath(x.room)}">${avatar(x, 'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(x.char_name)}</div><div class="h">${esc(x.room.title)}</div></div></a>`).join('')}</div>` : ''}
      <div class="panel"><a class="link" href="#/rooms">Все комнаты</a></div>
      <p class="side-note">Все персонажи вымышлены и не связаны с реальными людьми. <a href="#/rules">Правила</a> · <a href="#/support">Связь с модераторами</a></p>`;
    return;
  }
  const r = S.room;
  right.innerHTML = `<div class="panel"><div class="panel-room">${roomIcon(r, 'big')}<h2>${esc(r.title)} ${r.is_private ? I.lock : ''}</h2></div>${r.description ? `<p>${esc(r.description)}</p>` : ''}
    ${r.status === 'archived' ? '<p><span class="badge">Архив · только чтение</span></p>' : ''}</div>
    <div class="panel"><h2>Персонажи</h2>
      ${S.slots.slice(0, 8).map(s => `<a class="row" href="${roomPath(r, '/chars')}">${avatar(s, 'sm')}<div style="min-width:0;flex:1"><div class="n">${esc(s.char_name)}</div><div class="h">@${esc(s.handle)}</div></div>${s.player_id ? '' : '<span class="free">свободен</span>'}</a>`).join('')}
      <a class="link" href="${roomPath(r, '/chars')}">Все персонажи</a></div>
    <div class="panel"><a class="link" href="#/rooms">Другие комнаты</a></div>`;
}
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderRight, 200); });

/* ── голосовые звонки (WebRTC, до 10 человек) ───────────────
   Звук идёт только через наш TURN-сервер (relay): собеседники не видят IP друг друга.
   Главный админ может войти в любой звонок, но всегда ВИДИМО (is_admin в rp.call_members).
   Звонки не записываются. Права, лимит 10 и согласие проверяет база (060_rp_calls.sql). */
I.phone = '<svg viewBox="0 0 24 24"><path d="M5.2 3.5h3.1l1.6 4.2-2.1 1.5a11.5 11.5 0 0 0 7 7l1.5-2.1 4.2 1.6v3.1a1.9 1.9 0 0 1-2 1.9C10.3 20.2 3.8 13.7 3.3 5.5a1.9 1.9 0 0 1 1.9-2z"/></svg>';
I.hang = '<svg viewBox="0 0 24 24"><path d="M3 14.2c5-4.6 13-4.6 18 0l-1.8 2.9-3.7-1.2-.5-2.7a10.4 10.4 0 0 0-6 0l-.5 2.7-3.7 1.2z"/></svg>';
I.micOff = '<svg viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16"/></svg>';
I.shield = '<svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/></svg>';

const CALL_VER = 3, CALL_MAX = 10;
const callsOk = () => !!S.uid && !!S.callsOk;            // все вошедшие (rp.calls_dev_allowed)
const callGoy = () => !!S.callGoy;                       // ГОЙ+ / тестер / владелец (rp.call_goy)
const callLink = (id, code) => code ? `${location.origin}/y/v/${code}` : `${location.origin}/rp/#/call/${id}`;
const glMod = () => !!S.isGlMod;                         // главный модер / админ сайта / владелец (rp.is_gl_mod)
const callMaxOf = () => CALL.info?.max || CALL_MAX;
const mainAdmin = () => !!S.uid && S.uid === OWNER_ID;
const CALL = { id: null, info: null, stream: null, pcs: new Map(), audios: new Map(), members: [], muted: false,
  ping: null, tick: null, wait: null, ch: null, ice: null, seen: new Set(), lastSig: 0, joining: false, title: '', adminSeen: false,
  levels: new Map(), actx: null, lvl: null, since: 0 };
let callConsentOk = false, callIceWarned = false;

function callRulesHtml() {
  return `<ul class="call-rules">
    <li>Звонки <b>не записываются</b> — ни звук, ни текст.</li>
    <li>В звонке может быть <b>до ${CALL_MAX} человек</b>. Начать звонок в комнате может игрок с ролью <b>ГОЙ</b> и выше; позвонить в ЛС можно, если роль ГОЙ есть у вас или у собеседника.</li>
    <li>В каждом звонке должен быть хотя бы один участник с ролью ГОЙ. Когда последний такой участник выходит, звонок заканчивается.</li>
    <li>Войти в звонок можно по ссылке-приглашению. Отправляйте её только тем, кого зовёте: любой, у кого есть ссылка и аккаунт, сможет зайти.</li>
    <li>Главный администратор может подключиться к любому звонку, чтобы проверить жалобу или нарушение. <b>Когда он в звонке, это видят все участники.</b> Тайно подключиться нельзя.</li>
    <li>Голос идёт через сервер renah0cki: собеседники не видят ваш IP-адрес.</li>
    <li>По умолчанию голос каждого участника в звонке слегка изменяется (чаще чуть выше, иногда чуть ниже). Это можно выключить в настройках Y.</li>
    <li>Хранится только факт звонка (кто и когда) — 30 дней, для разбора жалоб.</li>
    <li>Запрещены оскорбления, угрозы, травля, разжигание ненависти, 18+, запись собеседников без их согласия и всё, что запрещено <a href="#/rules">правилами Y</a>. За нарушения звонок завершают, а доступ к звонкам или аккаунт блокируют.</li>
  </ul>`;
}
async function callConsent() {
  if (callConsentOk) return true;
  try { const r = await api(`call_consents?user_id=eq.${S.uid}&select=version`); if ((r[0]?.version || 0) >= CALL_VER) return (callConsentOk = true); } catch {}
  return new Promise(res => {
    let done = false;
    const form = modal('Правила звонков', `${callRulesHtml()}
      <label class="call-agree"><input type="checkbox" name="agree"> <span>Я прочитал(а) правила звонков и согласен(на) с ними</span></label>`, {
      submitLabel: 'Принять',
      onSubmit: async f => {
        if (!f.agree.checked) throw new Error('Поставьте галочку, чтобы продолжить');
        await rpc('call_accept_rules', { p_version: CALL_VER });
        callConsentOk = true; done = true; res(true);
      },
    });
    const ov = form.parentElement;
    new MutationObserver((_, mo) => { if (!ov.isConnected) { mo.disconnect(); if (!done) res(false); } }).observe(document.body, { childList: true });
  });
}

async function callIceConfig() {
  try {
    const t = await rpc('call_turn');
    if (t?.urls) return { iceServers: [{ urls: t.urls, username: t.username, credential: t.credential }], iceTransportPolicy: 'relay' };
  } catch {}
  if (!callIceWarned) { callIceWarned = true; toast('Сервер звонков ещё не настроен — соединение может не установиться', true); }
  return { iceServers: [] };
}

/* изменение голоса: у каждого участника голос случайно выше или ниже (делается у себя в браузере до отправки) */
const VOICE_WORKLET = `class RnPitch extends AudioWorkletProcessor {
  constructor(o) { super(); this.r = o.processorOptions.ratio; this.W = Math.floor(sampleRate * 0.05); this.N = this.W * 2 + 8;
    this.buf = new Float32Array(this.N); this.w = 0; this.ph = 0; }
  read(d) { let p = this.w - d; while (p < 0) p += this.N; const i = Math.floor(p), f = p - i, a = this.buf[i], b = this.buf[(i + 1) % this.N]; return a + (b - a) * f; }
  process(inputs, outputs) {
    const inp = inputs[0] && inputs[0][0], out = outputs[0][0]; if (!out) return true;
    const step = (1 - this.r) / this.W;
    for (let k = 0; k < out.length; k++) {
      this.buf[this.w] = inp ? inp[k] : 0;
      this.ph += step; this.ph -= Math.floor(this.ph);
      const p2 = (this.ph + 0.5) % 1;
      out[k] = this.read(this.ph * this.W + 2) * Math.sin(Math.PI * this.ph) + this.read(p2 * this.W + 2) * Math.sin(Math.PI * p2);
      this.w = (this.w + 1) % this.N;
    }
    return true;
  }
}
registerProcessor('rn-pitch', RnPitch);`;
const voiceFxOn = () => { try { return localStorage.getItem('rp_voice_fx') !== '0'; } catch { return true; } };
function callPickVoice() {
  const up = Math.random() < 0.7;   // чаще выше; сдвиг небольшой
  return up ? { up, ratio: 1.08 + Math.random() * 0.07 } : { up, ratio: 0.91 + Math.random() * 0.04 };
}
async function callVoiceChain(mic) {
  if (!voiceFxOn()) return { up: false, ratio: 1, ctx: null, out: mic, ok: false, off: true };
  const v = callPickVoice();
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.AudioWorkletNode) throw new Error('no worklet');
    const ctx = new AC();
    const url = URL.createObjectURL(new Blob([VOICE_WORKLET], { type: 'application/javascript' }));
    await ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url);
    const src = ctx.createMediaStreamSource(mic);
    const node = new AudioWorkletNode(ctx, 'rn-pitch', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { ratio: v.ratio } });
    const dst = ctx.createMediaStreamDestination();
    const gain = ctx.createGain(); gain.gain.value = 1.3;   // обработка чуть приглушает — возвращаем громкость
    src.connect(node).connect(gain).connect(dst);
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    return { ...v, ctx, out: dst.stream, ok: true };
  } catch (e) {
    console.warn('voice changer', e);
    return { ...v, ctx: null, out: mic, ok: false };
  }
}

// микрофон не дали: в Telegram — предложить открыть эту же страницу в обычном браузере
function callMicError(e) {
  const n = e?.name || '';
  if (TG.initData) {
    const url = location.origin + '/rp/' + (location.hash || '#/');
    modal('Звонок в браузере', `<div class="form-note">Telegram не даёт доступ к микрофону внутри мини-приложения (чаще всего на компьютере). Это ограничение Telegram, а не Y.</div>
      <div class="form-note">Откройте эту комнату в обычном браузере — там звонок работает. Если в браузере вы не вошли на renah0cki, нажмите «Войти» и войдите через Twitch.</div>`, {
      submitLabel: 'Открыть в браузере',
      onSubmit: async () => { const w = window.Telegram?.WebApp; w?.openLink ? w.openLink(url, { try_instant_view: false }) : open(url, '_blank'); },
    });
    return;
  }
  toast(n === 'NotFoundError' ? 'Микрофон не найден — подключите его и попробуйте снова'
    : n === 'NotReadableError' ? 'Микрофон занят другой программой — закройте её и попробуйте снова'
    : 'Нет доступа к микрофону — разрешите его для renah0cki.xyz в настройках браузера', true);
}

async function callJoin(fn, args) {
  if (!S.uid) return needLogin();
  if (CALL.joining) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return toast('Этот браузер не поддерживает звонки', true);
  if (!(await callConsent())) return;
  CALL.joining = true;
  try {
    if (CALL.id) await callHangup(true);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
    catch (e) { callMicError(e); return; }
    let info;
    try { info = await rpc(fn, args); } catch (e) { stream.getTracks().forEach(t => t.stop()); toast(errText(e), true); return; }
    const voice = await callVoiceChain(stream);
    if (!voice.ok && !voice.off) toast('Изменение голоса не работает в этом браузере — вас слышно обычным голосом', true);
    Object.assign(CALL, { voice, levels: new Map(), since: Date.now(), id: info.id, info, stream, muted: false, pcs: new Map(), audios: new Map(), members: [], seen: new Set(), lastSig: 0, adminSeen: false, title: '' });
    if (!$('#callAudio')) document.body.insertAdjacentHTML('beforeend', '<div id="callAudio" hidden></div>');
    callWatchLevel(S.uid, stream);
    CALL.lvl = setInterval(callLevelTick, 120);
    CALL.ice = await callIceConfig();
    CALL.title = await callTitle(info);
    api(`calls?id=eq.${info.id}&select=short_code`).then(r => { if (CALL.id === info.id && r?.[0]?.short_code) CALL.info.code = r[0].short_code; }).catch(() => {});
    callDraw();
    await callSubscribe();
    await callRefresh();
    CALL.ping = setInterval(callPing, 20000);
    CALL.tick = setInterval(callTick, 4000);
    if (fn === 'call_dm') CALL.wait = setTimeout(() => { if (CALL.id === info.id && !callOthers().some(m => !m.is_admin)) { toast('Не отвечает'); callHangup(true); } }, 45000);
    if (info.as_admin) toast('Вы в звонке как администратор — участники это видят');
  } finally { CALL.joining = false; }
}
async function callTitle(info) {
  try {
    if (info.kind === 'voice') return 'Войс · ' + (info.title || 'голосовой канал');
    if (info.kind === 'room') { const r = await api(`rooms?id=eq.${info.room_id}&select=title`); return 'Звонок · ' + (r[0]?.title || 'комната'); }
    const other = info.slot_id === info.slot_a ? info.slot_b : info.slot_a;
    const s = await api(`slots?id=in.(${info.slot_a},${info.slot_b})&select=id,char_name`);
    if (info.as_admin || !info.slot_id) return 'Звонок в ЛС · ' + s.map(x => x.char_name).join(' и ');
    return 'Звонок · ' + (s.find(x => x.id === other)?.char_name || 'ЛС');
  } catch { return 'Звонок'; }
}
async function callSubscribe() {
  const c = rtClient(); if (!c) return;
  c.realtime.setAuth((await getToken()) || SB_KEY);
  const id = CALL.id;
  await new Promise(res => {
    const t = setTimeout(res, 5000);
    CALL.ch = c.channel('rp-call-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'rp', table: 'call_signals', filter: 'to_user=eq.' + S.uid }, p => onCallSignal(p.new))
      .on('postgres_changes', { event: '*', schema: 'rp', table: 'call_members', filter: 'call_id=eq.' + id }, () => callRefresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'rp', table: 'calls', filter: 'id=eq.' + id }, p => { if (p.new.ended_at) callEnded(p.new.end_reason); })
      .subscribe(st => { if (st === 'SUBSCRIBED') { clearTimeout(t); res(); } });
  });
}
const callOthers = () => CALL.members.filter(m => m.user_id !== S.uid);
async function callRefresh() {
  const id = CALL.id; if (!id) return;
  let rows;
  const base = `call_members?call_id=eq.${id}&left_at=is.null&order=joined_at.asc&select=user_id,slot_id,is_admin,joined_at,last_seen,slot:slot_id(id,char_name,handle,avatar_url)`;
  try { rows = await api(base + ',prof:profiles!call_members_profile_fk(nick,y_name,avatar_url,y_avatar_url,username)'); }
  catch { try { rows = await api(base); } catch { return; } }
  if (CALL.id !== id) return;
  const live = rows.filter(r => Date.now() - new Date(r.last_seen).getTime() < 65000);
  CALL.members = live;
  for (const uid of [...CALL.pcs.keys()]) if (!live.some(m => m.user_id === uid)) callDropPeer(uid);
  const me = live.find(m => m.user_id === S.uid);
  if (me) for (const m of callOthers()) {
    // соединение начинает тот, кто вошёл позже
    const later = new Date(me.joined_at) > new Date(m.joined_at) || (me.joined_at === m.joined_at && S.uid > m.user_id);
    if (later && !CALL.pcs.has(m.user_id)) callOffer(m.user_id).catch(e => console.warn('offer', e));
  }
  const adm = live.some(m => m.is_admin && m.user_id !== S.uid);
  if (adm && !CALL.adminSeen) toast('В звонок вошёл администратор');
  CALL.adminSeen = adm;
  if (CALL.wait && callOthers().some(m => !m.is_admin)) { clearTimeout(CALL.wait); CALL.wait = null; }
  callDraw();
}
function callPeer(uid) {
  let pc = CALL.pcs.get(uid); if (pc) return pc;
  pc = new RTCPeerConnection(CALL.ice || { iceServers: [] });
  const send = CALL.voice?.out || CALL.stream;
  send.getAudioTracks().forEach(t => pc.addTrack(t, send));
  pc.ontrack = e => {
    let a = CALL.audios.get(uid);
    if (!a) { a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); CALL.audios.set(uid, a); $('#callAudio')?.append(a); }
    a.srcObject = e.streams[0]; a.play().catch(() => {});
    callWatchLevel(uid, e.streams[0]);
  };
  pc.onconnectionstatechange = () => {
    callDraw();
    if (pc.connectionState === 'connected') callLimitBitrate(pc);
    if (pc.connectionState === 'failed' && CALL.pcs.get(uid) === pc) { callDropPeer(uid); setTimeout(() => callRefresh(), 1500); }
  };
  CALL.pcs.set(uid, pc);
  return pc;
}
function callLimitBitrate(pc) {
  for (const s of pc.getSenders()) {
    if (s.track?.kind !== 'audio') continue;
    try { const p = s.getParameters(); if (!p.encodings?.length) p.encodings = [{}]; p.encodings[0].maxBitrate = 32000; s.setParameters(p).catch(() => {}); } catch {}
  }
}
function callGathered(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(res => {
    const t = setTimeout(res, 3500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
async function callOffer(uid) {
  const id = CALL.id, pc = callPeer(uid);
  await pc.setLocalDescription(await pc.createOffer());
  await callGathered(pc);
  if (CALL.id !== id || CALL.pcs.get(uid) !== pc) return;
  await rpc('call_signal', { p_call: id, p_to: uid, p_kind: 'offer', p_payload: { sdp: pc.localDescription.sdp } });
}
async function onCallSignal(s) {
  if (!CALL.id || s.call_id !== CALL.id || CALL.seen.has(s.id)) return;
  CALL.seen.add(s.id); CALL.lastSig = Math.max(CALL.lastSig, s.id);
  if (!CALL.members.some(m => m.user_id === s.from_user)) await callRefresh();
  if (!CALL.members.some(m => m.user_id === s.from_user)) return;   // не участник — игнор
  try {
    if (s.kind === 'offer') {
      if (CALL.pcs.get(s.from_user)?.signalingState === 'have-local-offer') callDropPeer(s.from_user);
      const pc = callPeer(s.from_user);
      await pc.setRemoteDescription({ type: 'offer', sdp: s.payload.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await callGathered(pc);
      await rpc('call_signal', { p_call: CALL.id, p_to: s.from_user, p_kind: 'answer', p_payload: { sdp: pc.localDescription.sdp } });
    } else if (s.kind === 'answer') {
      const pc = CALL.pcs.get(s.from_user);
      if (pc?.signalingState === 'have-local-offer') await pc.setRemoteDescription({ type: 'answer', sdp: s.payload.sdp });
    } else if (s.kind === 'bye') callDropPeer(s.from_user);
  } catch (e) { console.warn('call signal', e); }
}
function callDropPeer(uid) {
  const pc = CALL.pcs.get(uid); if (pc) { try { pc.close(); } catch {} CALL.pcs.delete(uid); }
  const a = CALL.audios.get(uid); if (a) { a.srcObject = null; a.remove(); CALL.audios.delete(uid); }
  callUnwatchLevel(uid);
}
// подстраховка, если realtime что-то пропустил
async function callTick() {
  if (!CALL.id) return;
  const pending = callOthers().some(m => CALL.pcs.get(m.user_id)?.connectionState !== 'connected');
  if (!pending) return;
  try {
    const rows = await api(`call_signals?call_id=eq.${CALL.id}&to_user=eq.${S.uid}&id=gt.${CALL.lastSig}&order=id.asc&select=id,call_id,from_user,kind,payload`);
    for (const s of rows) await onCallSignal(s);
  } catch {}
  callRefresh();
}
async function callPing() {
  if (!CALL.id) return;
  try { const ok = await rpc('call_ping', { p_call: CALL.id }); if (ok === false) return callEnded(); } catch {}
  callRefresh();
}
function callEnded(reason) {
  if (!CALL.id) return;
  const msg = reason === 'admin' ? 'Звонок завершён администратором' : reason === 'declined' ? 'Звонок отклонён' : 'Звонок завершён';
  callHangup(true); toast(msg);
}
async function callHangup(silent = false) {
  const id = CALL.id; if (!id) return;
  clearInterval(CALL.ping); clearInterval(CALL.tick); clearInterval(CALL.lvl); clearTimeout(CALL.wait);
  for (const uid of [...CALL.levels.keys()]) callUnwatchLevel(uid);
  try { CALL.actx?.close(); } catch {}
  CALL.actx = null; CALL.lvl = null; CALL.since = 0;
  for (const uid of [...CALL.pcs.keys()]) callDropPeer(uid);
  CALL.stream?.getTracks().forEach(t => t.stop());
  CALL.voice?.out?.getTracks().forEach(t => t.stop());
  try { CALL.voice?.ctx?.close(); } catch {}
  CALL.voice = null;
  if (CALL.ch) { try { rtClient()?.removeChannel(CALL.ch); } catch {} }
  Object.assign(CALL, { id: null, info: null, stream: null, members: [], ch: null, ping: null, tick: null, wait: null });
  $('#callAudio')?.remove();
  callDraw(); callRoomPill();
  try { await rpc('call_leave', { p_call: id }); } catch {}
  if (!silent) toast('Вы вышли из звонка');
}
addEventListener('pagehide', () => {
  if (!CALL.id) return;
  const t = readSession()?.token;
  try { fetch(`${SB_URL}/rest/v1/rpc/call_leave`, { method: 'POST', keepalive: true, headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), 'Content-Profile': 'rp', 'Content-Type': 'application/json' }, body: JSON.stringify({ p_call: CALL.id }) }); } catch {}
});
function callToggleMute() {
  CALL.muted = !CALL.muted;
  CALL.stream?.getAudioTracks().forEach(t => { t.enabled = !CALL.muted; });
  callDraw();
}

/* панель текущего звонка */
// кто говорит: громкость каждого голоса (свой — с микрофона, чужие — из пришедшего звука)
function callWatchLevel(uid, stream) {
  if (!stream || CALL.levels.has(uid)) return;
  try {
    if (!CALL.actx) CALL.actx = new (window.AudioContext || window.webkitAudioContext)();
    if (CALL.actx.state === 'suspended') CALL.actx.resume().catch(() => {});
    const src = CALL.actx.createMediaStreamSource(stream);
    const an = CALL.actx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.2;
    src.connect(an);
    CALL.levels.set(uid, { src, an, buf: new Float32Array(an.fftSize), until: 0 });
  } catch (e) { console.warn('level', e); }
}
function callUnwatchLevel(uid) {
  const l = CALL.levels.get(uid); if (!l) return;
  try { l.src.disconnect(); } catch {}
  CALL.levels.delete(uid);
}
function callLevelTick() {
  if (!CALL.id) return;
  const now = Date.now(), bar = $('#callBar');
  for (const [uid, l] of CALL.levels) {
    l.an.getFloatTimeDomainData(l.buf);
    let sum = 0; for (let i = 0; i < l.buf.length; i++) sum += l.buf[i] * l.buf[i];
    const rms = Math.sqrt(sum / l.buf.length);
    if (rms > 0.018 && !(uid === S.uid && CALL.muted)) l.until = now + 350;
    const talk = l.until > now;
    if (bar) $$(`[data-uid="${uid}"]`, bar).forEach(el => el.classList.toggle('talk', talk));
  }
  const t = bar && $('.cb-time', bar);
  if (t && CALL.since) { const s = Math.floor((now - CALL.since) / 1000); t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
}
function callInlineHost() {
  const i = CALL.info;
  if (!i || i.kind !== 'dm' || S.view !== 'dm') return null;
  if (![chat.me, chat.peer].every(x => x === i.slot_a || x === i.slot_b)) return null;
  return $('.chat-head', main);
}
addEventListener('hashchange', () => setTimeout(callDraw, 0));
const callMinKey = 'rp_call_min';
const callIsMin = () => { try { return localStorage.getItem(callMinKey) === '1'; } catch { return false; } };
function callMemberHtml(m) {
  const me = m.user_id === S.uid;
  const st = me ? 'me' : (CALL.pcs.get(m.user_id)?.connectionState || 'new');
  const ok = st === 'me' || st === 'connected';
  const muted = me && CALL.muted;
  const s = m.is_admin ? null : (m.slot || (m.prof ? userAv(m.prof) : { char_name: 'Гость', handle: '' }));
  const pic = m.is_admin ? `<span class="av cmx-adm">${I.shield}</span>` : avatar(s);
  const name = m.is_admin ? 'Администратор' : s.char_name;
  return `<div class="cmx${ok ? '' : ' wait'}${me ? ' me' : ''}${m.is_admin ? ' adm' : ''}" data-uid="${esc(m.user_id)}" title="${esc(name)}${ok ? '' : ' — соединяемся…'}">
    <div class="cmx-av">${pic}${muted ? `<span class="cmx-muted">${I.micOff}</span>` : ''}</div>
    <i>${me ? 'Вы' : esc(name)}</i></div>`;
}
function callDraw() {
  let bar = $('#callBar');
  if (!CALL.id) { bar?.remove(); document.body.classList.remove('in-call'); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'callBar'; bar.className = 'call-bar'; bindCallBar(bar); }
  // звонок в ЛС, открыта эта переписка — панель внутри окна диалога (в липкой шапке чата)
  const host = callInlineHost();
  if (host) { if (bar.parentElement !== host) host.append(bar); }
  else if (bar.parentElement !== document.body) document.body.append(bar);
  bar.classList.toggle('inline', !!host);
  document.body.classList.toggle('in-call', !host);
  const min = !host && callIsMin();
  bar.classList.toggle('min', min);
  const players = CALL.members.filter(m => !m.is_admin).length;
  const adminIn = CALL.members.some(m => m.is_admin);
  const waiting = CALL.wait && !callOthers().some(m => !m.is_admin);
  const head = `<div class="cb-head">
      <span class="cb-live"><span class="cb-dot"></span>${waiting ? 'Вызов' : 'В звонке'}</span>
      <b class="cb-title">${esc((CALL.title || 'Звонок').replace(/^(Звонок|Войс) · /, ''))}</b>
      <span class="cb-time">0:00</span>
      ${host ? '' : `<button type="button" class="cb-min" data-cb-min aria-label="${min ? 'Развернуть' : 'Свернуть'}" title="${min ? 'Развернуть' : 'Свернуть'}"><svg viewBox="0 0 24 24"><path d="${min ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}"/></svg></button>`}
    </div>`;
  const ctrl = `<div class="cb-ctrl">
      <button type="button" class="cb-btn${CALL.muted ? ' off' : ''}" data-cb-mute aria-label="${CALL.muted ? 'Включить микрофон' : 'Выключить микрофон'}" title="${CALL.muted ? 'Включить микрофон' : 'Выключить микрофон'}">${CALL.muted ? I.micOff : I.mic}</button>
      ${min ? '' : `<button type="button" class="cb-btn" data-cb-link aria-label="Скопировать ссылку на звонок" title="Скопировать ссылку-приглашение">${I.link}</button>`}
      ${min ? '' : `<a class="cb-btn" href="#/support" aria-label="Пожаловаться модераторам" title="Пожаловаться модераторам">${I.flag}</a>`}
      ${(mainAdmin() || glMod()) && !min ? `<button type="button" class="cb-btn" data-cb-end title="Завершить звонок для всех" aria-label="Завершить звонок для всех">${I.close}</button>` : ''}
      <button type="button" class="cb-btn hang" data-cb-leave aria-label="Выйти из звонка" title="Выйти из звонка">${I.hang}</button>
    </div>`;
  if (min) {
    bar.innerHTML = head + `<div class="cb-minrow"><div class="cb-stack">${CALL.members.slice(0, 6).map(callMemberHtml).join('')}</div>${ctrl}</div>`;
  } else {
    bar.innerHTML = head
      + (adminIn ? `<div class="cb-admin">${I.shield}<span>${CALL.info?.as_admin ? 'Вы в звонке как администратор — участники это видят' : 'В звонке администратор renah0cki'}</span></div>` : '')
      + `<div class="cb-grid">${CALL.members.map(callMemberHtml).join('')}</div>`
      + `<div class="cb-meta">${waiting ? '<span>Ждём ответа…</span>' : CALL.info?.kind === 'dm' ? '' : `<span>${players} из ${callMaxOf()}</span>`}${CALL.voice ? `<span class="cb-voice">Ваш голос: <b>${CALL.voice.ok ? (CALL.voice.up ? 'выше' : 'ниже') : 'обычный'}</b></span>` : ''}</div>`
      + ctrl;
  }
  callLevelTick();
}
function bindCallBar(bar) {
  bar.addEventListener('click', async e => {
    if (e.target.closest('[data-cb-min]')) { try { localStorage.setItem(callMinKey, callIsMin() ? '0' : '1'); } catch {} return callDraw(); }
    if (e.target.closest('[data-cb-mute]')) return callToggleMute();
    if (e.target.closest('[data-cb-link]')) {
      const url = callLink(CALL.id, CALL.info?.code);
      try { await navigator.clipboard.writeText(url); toast('Ссылка на звонок скопирована — отправьте её другу'); } catch { prompt('Ссылка на звонок', url); }
      return;
    }
    if (e.target.closest('[data-cb-leave]')) return callHangup();
    if (e.target.closest('[data-cb-end]')) {
      if (!confirm('Завершить этот звонок для всех участников?')) return;
      const id = CALL.id;
      try { await rpc('call_end', { p_call: id }); } catch (er) { toast(errText(er), true); }
      callHangup(true);
    }
  });
}

/* звонок комнаты: плашка под шапкой и кнопка в шапке */
async function callRoomPill() {
  const box = $('#callPill'); if (!box || !S.room || !callsOk()) return;
  const r = S.room;
  let c = null;
  try { c = (await api(`calls?room_id=eq.${r.id}&kind=eq.room&ended_at=is.null&select=id,members:call_members(user_id,is_admin,left_at,last_seen)`))[0] || null; } catch {}
  if (!$('#callPill') || S.room?.id !== r.id) return;
  if (!c) {
    box.innerHTML = mySlot() && r.status !== 'archived'
      ? (callGoy()
        ? `<div class="call-pill idle">${I.phone}<span>Голосовой звонок комнаты</span><button type="button" class="btn ghost small" data-call-room>Начать звонок</button></div>`
        : `<div class="call-pill idle">${I.phone}<span>Голосовой звонок комнаты</span><span class="cp-in">Начать — с роли ГОЙ</span></div>`) : '';
    return;
  }
  const live = c.members.filter(m => !m.left_at && Date.now() - new Date(m.last_seen).getTime() < 65000);
  const n = live.filter(m => !m.is_admin).length;
  const inIt = CALL.id === c.id;
  const act = inIt ? '<span class="cp-in">Вы в звонке</span>'
    : n >= CALL_MAX ? '<span class="cp-in">Звонок заполнен</span>'
    : !mySlot() && mainAdmin() ? `<button type="button" class="btn ghost small" data-call-admin="${c.id}">Войти (видно всем)</button>`
    : `<button type="button" class="btn blue small" data-call-admin="${c.id}">Присоединиться</button>`;
  box.innerHTML = `<div class="call-pill">${I.phone}<span><b>Голосовой звонок</b> · ${n}/${CALL_MAX}${live.some(m => m.is_admin) ? ' · в звонке админ' : ''}</span>${act}</div>`;
}
setInterval(() => { if (S.view === 'feed' && $('#callPill')) callRoomPill(); }, 15000);
document.addEventListener('click', async e => {
  const rb = e.target.closest('[data-call-room]');
  if (rb) {
    e.preventDefault();
    if (!S.room) return;
    if (!mySlot()) {
      const c = (await api(`calls?room_id=eq.${S.room.id}&kind=eq.room&ended_at=is.null&select=id`).catch(() => []))[0];
      if (c) { await callJoin('call_enter', { p_call: c.id }); callRoomPill(); return; }
      return toast('Чтобы начать звонок, займите персонажа в комнате', true);
    }
    await callJoin('call_room', { p_room: S.room.id });
    callRoomPill();
    return;
  }
  const ab = e.target.closest('[data-call-admin]');
  if (ab) { e.preventDefault(); await callJoin('call_enter', { p_call: ab.dataset.callAdmin }); callRoomPill(); if (S.view === 'calls') viewCallsAdmin(); if (S.view === 'voice') viewVoice(); if (S.view === 'callinvite' && CALL.id) viewCallInvite(CALL.id); return; }
  const eb = e.target.closest('[data-call-end]');
  if (eb) {
    e.preventDefault();
    if (!confirm('Завершить этот звонок для всех участников?')) return;
    try { await rpc('call_end', { p_call: eb.dataset.callEnd }); toast('Звонок завершён'); } catch (er) { toast(errText(er), true); }
    if (S.view === 'calls') viewCallsAdmin();
    if (S.view === 'voice') viewVoice();
    return;
  }
  const db = e.target.closest('[data-call-dm]');
  if (db) {
    e.preventDefault();
    const me = dmSlot(), peer = S.slotMap.get(chat.peer);
    if (!me || !peer) return;
    if (!peer.player_id) return toast('У этого персонажа сейчас нет игрока', true);
    await callJoin('call_dm', { p_from_slot: me.id, p_to_slot: peer.id });
  }
});

/* входящий звонок в ЛС */
let callRingEl = null, callRingPoll = null, callRingTone = null;
async function onCallInsert(row) {
  if (!callsOk() || row.kind !== 'dm' || row.created_by === S.uid || row.ended_at) return;
  let mine = S.mySlots.some(x => x.id === row.slot_b);
  if (!mine) { try { await loadMySlots(); } catch {} mine = S.mySlots.some(x => x.id === row.slot_b); }
  if (!mine || CALL.id === row.id) return;
  let from = null;
  try { from = (await api(`slots?id=eq.${row.slot_a}&select=id,char_name,handle,avatar_url,room:room_id(title)`))[0]; } catch {}
  callShowRing(row, from);
}
function callStopRing() {
  clearInterval(callRingPoll); callRingPoll = null;
  if (callRingTone) { try { callRingTone.close(); } catch {} callRingTone = null; }
  callRingEl?.remove(); callRingEl = null;
}
function callRingSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); callRingTone = ctx;
    const beep = t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 520; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.5); };
    for (let i = 0; i < 15; i++) { beep(ctx.currentTime + i * 3); beep(ctx.currentTime + i * 3 + 0.6); }
  } catch {}
}
function callShowRing(row, from) {
  callStopRing();
  const el = document.createElement('div');
  el.className = 'call-ring'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Входящий звонок');
  el.innerHTML = `${from ? avatar(from) : ''}<div class="cr-text"><b>${esc(from?.char_name || 'Персонаж')}</b><span>Входящий звонок${from?.room?.title ? ' · ' + esc(from.room.title) : ''}</span></div>
    <button type="button" class="cb-btn hang" data-ring-no aria-label="Отклонить" title="Отклонить">${I.hang}</button>
    <button type="button" class="cb-btn ok" data-ring-yes aria-label="Принять" title="Принять">${I.phone}</button>`;
  document.body.append(el); callRingEl = el;
  callRingSound();
  el.querySelector('[data-ring-no]').onclick = async () => { callStopRing(); try { await rpc('call_decline', { p_call: row.id }); } catch {} };
  el.querySelector('[data-ring-yes]').onclick = async () => { callStopRing(); await callJoin('call_enter', { p_call: row.id }); };
  const t0 = Date.now();
  callRingPoll = setInterval(async () => {
    if (Date.now() - t0 > 45000) { callStopRing(); toast('Пропущенный звонок'); return; }
    try { const c = (await api(`calls?id=eq.${row.id}&select=ended_at`))[0]; if (!c || c.ended_at) { callStopRing(); toast('Пропущенный звонок'); } } catch {}
  }, 3000);
}

/* приглашение по ссылке: #/call/<id> */
async function viewCallInvite(id) {
  S.view = 'callinvite'; updateNav(); renderRight();
  const shell = inner => head('Приглашение в звонок', { back: true }) + `<div class="call-invite">${inner}</div>`;
  if (!S.uid) { main.innerHTML = shell(`<div class="ci-ic">${I.phone}</div><h2>Вас зовут в звонок</h2><p>Войдите в аккаунт renah0cki, чтобы присоединиться.</p><a class="btn blue" href="/">Войти</a>`); return; }
  main.innerHTML = shell(loader());
  let c;
  // короткий код → id звонка
  if (!/^[0-9a-f-]{36}$/i.test(id)) { try { id = await rpc('call_by_code', { p_code: id }); } catch { id = null; } }
  if (!id) { main.innerHTML = shell(`<div class="ci-ic off">${I.phone}</div><h2>Звонок не найден</h2><p>Ссылка неверная или звонок давно закончился.</p><a class="btn ghost" href="#/">На главную Y</a>`); return; }
  try { c = await rpc('call_peek', { p_call: id }); } catch (e) { main.innerHTML = shell(`<h2>Не получилось</h2><p>${esc(errText(e))}</p>`); return; }
  if (S.view !== 'callinvite') return;
  if (!c || c.ended) { main.innerHTML = shell(`<div class="ci-ic off">${I.phone}</div><h2>Звонок уже закончился</h2><p>Попросите прислать новую ссылку.</p><a class="btn ghost" href="#/">На главную Y</a>`); return; }
  const what = c.kind === 'voice' ? `Войс «${esc(c.title)}»` : c.kind === 'room' ? `Комната «${esc(c.title)}»` : `ЛС: ${esc(c.title)}`;
  const cap = c.max || CALL_MAX;
  const inIt = CALL.id === c.id;
  main.innerHTML = shell(`<div class="ci-ic">${I.phone}</div><h2>${what}</h2>
    <p>Сейчас в звонке: <b>${c.count}</b> из ${cap}</p>
    ${!c.has_goy && !callGoy() ? '<p class="ci-warn">В звонке пока нет участника с ролью ГОЙ — войти можно, когда он зайдёт.</p>' : ''}
    ${inIt ? '<p><b>Вы уже в этом звонке</b></p>' : c.count >= cap ? '<p class="ci-warn">Звонок заполнен.</p>' : `<button type="button" class="btn blue" data-call-admin="${esc(c.id)}">Войти в звонок</button>`}
    <p class="ci-note">Звонки не записываются. Перед первым звонком нужно принять правила.</p>`);
}

/* голосовые каналы (войсы): видят все вошедшие, создают главные модеры */
async function viewVoice() {
  S.view = 'voice'; updateNav(); renderRight();
  const H = head('Голосовые каналы', { back: true, sub: 'Заходите своим аккаунтом, без персонажа' });
  if (!S.uid) { main.innerHTML = H + '<div class="empty"><h2>Войдите</h2><p>Чтобы зайти в войс, войдите в аккаунт.</p><a class="btn blue" href="/">Войти</a></div>'; return; }
  main.innerHTML = H + loader();
  let rows = [];
  const vsel = 'id,title,max_members,created_at,members:call_members(user_id,is_admin,left_at,last_seen,prof:profiles!call_members_profile_fk(nick,y_name,avatar_url,y_avatar_url,username))&order=created_at.asc';
  try { rows = await api('calls?kind=eq.voice&ended_at=is.null&select=short_code,' + vsel).catch(() => api('calls?kind=eq.voice&ended_at=is.null&select=' + vsel)); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'voice') return;
  const opts = sel => Array.from({ length: 9 }, (_, i) => i + 2).map(n => `<option value="${n}"${n === sel ? ' selected' : ''}>${n}</option>`).join('');
  const create = glMod() ? `<form class="vc-new" id="vcNew" autocomplete="off">
      <b>Новый войс</b>
      <div class="vc-new-row"><input name="t" maxlength="40" placeholder="Название, например «Болталка»" required>
        <label class="vc-max">Мест <select name="m">${opts(10)}</select></label>
        <button class="btn blue small" type="submit">Создать</button></div>
    </form>` : '';
  const items = rows.map(c => {
    const live = c.members.filter(m => !m.left_at && Date.now() - new Date(m.last_seen).getTime() < 65000 && !m.is_admin);
    const inIt = CALL.id === c.id, full = live.length >= c.max_members;
    const faces = live.slice(0, 6).map(m => avatar(m.prof ? userAv(m.prof) : { char_name: '?' }, 'sm')).join('');
    return `<div class="vc-row">
      <div class="vc-ic">${I.phone}</div>
      <div class="vc-main"><b>${esc(c.title)}</b><span>${live.length} из ${c.max_members}${live.length ? '' : ' · пусто'}</span>${faces ? `<div class="vc-faces">${faces}</div>` : ''}</div>
      <div class="vc-acts">
        ${inIt ? '<span class="cp-in">Вы здесь</span>' : full ? '<span class="cp-in">Мест нет</span>' : `<button type="button" class="btn blue small" data-call-admin="${c.id}">Зайти</button>`}
        <button type="button" class="icon-btn" data-vc-link="${c.id}" data-vc-code="${esc(c.short_code || '')}" title="Скопировать ссылку" aria-label="Скопировать ссылку">${I.link}</button>
        ${glMod() ? `<select class="vc-sel" data-vc-max="${c.id}" title="Мест" aria-label="Мест">${opts(c.max_members)}</select>
          <button type="button" class="btn danger small" data-call-end="${c.id}">Закрыть</button>` : ''}
      </div></div>`;
  }).join('');
  main.innerHTML = H + create + `<div class="vc-list">${items || `<div class="empty"><h2>Пока нет войсов</h2><p>${glMod() ? 'Создайте первый — сверху.' : 'Их создают главные модераторы.'}</p></div>`}</div>`;
  const f = $('#vcNew');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    const t = f.t.value.trim(); if (!t) return;
    await callJoin('call_voice_create', { p_title: t, p_max: +f.m.value });
    if (S.view === 'voice') viewVoice();
  };
  $$('[data-vc-link]', main).forEach(b => b.onclick = async () => {
    const url = callLink(b.dataset.vcLink, b.dataset.vcCode);
    try { await navigator.clipboard.writeText(url); toast('Ссылка на войс скопирована'); } catch { prompt('Ссылка на войс', url); }
  });
  $$('[data-vc-max]', main).forEach(sel => sel.onchange = async () => {
    try { await rpc('call_voice_set_max', { p_call: sel.dataset.vcMax, p_max: +sel.value }); toast('Мест: ' + sel.value); if (CALL.id === sel.dataset.vcMax && CALL.info) { CALL.info.max = +sel.value; callDraw(); } }
    catch (er) { toast(errText(er), true); }
  });
}

/* главный админ: все идущие звонки */
async function viewCallsAdmin() {
  S.view = 'calls'; updateNav(); renderRight();
  if (!mainAdmin() && !glMod()) { main.innerHTML = head('Звонки', { back: true }) + '<div class="empty"><h2>Нет доступа</h2></div>'; return; }
  main.innerHTML = head('Идущие звонки', { back: true, sub: 'Ваш вход всегда виден участникам' }) + loader();
  let rows = [];
  try { rows = await api('calls?ended_at=is.null&select=id,kind,title,max_members,created_at,room:room_id(title,short_code,id),a:slot_a(char_name),b:slot_b(char_name),members:call_members(user_id,is_admin,left_at,last_seen)&order=created_at.desc'); }
  catch (e) { return errorView(errText(e)); }
  if (S.view !== 'calls') return;
  const items = rows.map(c => {
    const live = c.members.filter(m => !m.left_at && Date.now() - new Date(m.last_seen).getTime() < 65000);
    const n = live.filter(m => !m.is_admin).length, inIt = CALL.id === c.id;
    const what = c.kind === 'voice' ? `Войс «${esc(c.title || '')}»` : c.kind === 'room' ? `Комната «${esc(c.room?.title || '')}»` : `ЛС: ${esc(c.a?.char_name || '?')} и ${esc(c.b?.char_name || '?')}`;
    return `<div class="call-adm-row"><div class="ca-main"><b>${what}</b><span>${n}/${c.max_members || CALL_MAX} · с ${new Date(c.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}${live.some(m => m.is_admin) ? ' · админ в звонке' : ''}</span></div>
      ${inIt ? '<span class="cp-in">Вы здесь</span>' : (mainAdmin() || c.kind === 'voice') ? `<button type="button" class="btn ghost small" data-call-admin="${c.id}">Войти</button>` : ''}
      <button type="button" class="btn danger small" data-call-end="${c.id}">Завершить</button></div>`;
  }).join('');
  main.innerHTML = head('Идущие звонки', { back: true, sub: 'Ваш вход всегда виден участникам' })
    + `<div class="call-adm">${items || '<div class="empty"><h2>Сейчас звонков нет</h2></div>'}</div>`;
}

/* ── роутер ─────────────────────────────────────────────── */
function route() {
  closeMenu();
  $$('.overlay, .lightbox').forEach(o => o.remove()); document.body.style.overflow = '';
  document.body.classList.remove('chat-mode');
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  window.scrollTo(0, 0);
  S.viewArg = null;
  const ok = k => /^[A-Za-z0-9-]{4,40}$/.test(k || '');
  if (parts[0] === 'p' && ok(parts[1])) return viewThread(parts[1]);
  if (parts[0] === 'r' && ok(parts[1])) {
    if (parts[2] === 'p' && ok(parts[3])) return viewThread(parts[3]);
    if (parts[2] === 'chars') return viewChars(parts[1]);
    if (parts[2] === 'dm') return ok(parts[3]) ? viewDmChat(parts[1], parts[3]) : viewDmList(parts[1]);
    if (parts[2] === 'peek' && ok(parts[3]) && ok(parts[4])) return viewDmPeek(parts[1], parts[3], parts[4]);
    return viewFeed(parts[1]);
  }
  if (parts[0] === 'new') return viewCreate();
  if (parts[0] === 'chars') return viewLibrary();
  if (parts[0] === 'c' && ok(parts[1])) return viewCharacter(parts[1]);
  if (parts[0] === 'u' && parts[1]) return viewUser(parts[1]);
  if (parts[0] === 'dm') return viewDmHub();
  if (parts[0] === 'settings') return viewSettings();
  if (parts[0] === 'rules') return viewRules();
  if (parts[0] === 'support') return viewSupport();
  if (parts[0] === 'notifications') return viewNotifs();
  if (parts[0] === 'rooms') return viewRooms();
  if (parts[0] === 'calls') return viewCallsAdmin();
  if (parts[0] === 'voice') return viewVoice();
  if (parts[0] === 'call' && ok(parts[1])) return viewCallInvite(parts[1]);
  if (parts[0] === 'v' && ok(parts[1])) return viewCallInvite(parts[1]);
  return viewHome();
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-copy]');
  if (c) { e.preventDefault(); copyLink(c.dataset.copy); }
});

/* ── потянуть вниз — обновить (как в X) ─────────────────── */
(function pullToRefresh() {
  if (!('ontouchstart' in window)) return;
  const ind = document.createElement('div');
  ind.className = 'ptr'; ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = '<div class="spinner"></div>';
  document.body.append(ind);
  const TRIGGER = 64;
  let y0 = null, dist = 0, busy = false;
  const set = d => { ind.style.transform = `translate(-50%, ${d - 56}px) rotate(${d * 4}deg)`; ind.style.opacity = Math.min(1, d / TRIGGER); };
  const reset = () => { ind.classList.add('back'); set(0); ind.classList.remove('ready', 'loading'); setTimeout(() => ind.classList.remove('back'), 200); };
  const blocked = () => busy || scrollY > 0 || document.body.classList.contains('chat-mode') || $('.overlay, .lightbox, .menu');
  addEventListener('touchstart', e => { y0 = (!blocked() && e.touches.length === 1) ? e.touches[0].clientY : null; dist = 0; }, { passive: true });
  addEventListener('touchmove', e => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy <= 0 || scrollY > 0) { dist = 0; set(0); return; }
    dist = Math.min(dy * 0.5, 96);
    set(dist); ind.classList.toggle('ready', dist >= TRIGGER);
  }, { passive: true });
  addEventListener('touchend', async () => {
    if (y0 === null) return;
    y0 = null;
    if (dist < TRIGGER) { reset(); return; }
    busy = true; reset(); // одна крутилка — у самой страницы
    try { await route(); } catch {}
    busy = false;
  });
})();

/* ── Telegram Mini App ──────────────────────────────────── */
// Telegram открывает страницу с #tgWebAppData=... — по этим подписанным данным
// сервер узнаёт привязанный в боте аккаунт renah0cki и выдаёт сессию.
const TG = { initData: null, status: '' };
(function detectTelegram() {
  try {
    const h = location.hash;
    if (h.includes('tgWebAppData=')) {
      TG.initData = new URLSearchParams(h.slice(1)).get('tgWebAppData');
      sessionStorage.setItem('rp_tg', TG.initData);
      history.replaceState(null, '', location.pathname + location.search + '#/');
    } else TG.initData = sessionStorage.getItem('rp_tg');
  } catch {}
  if (!TG.initData) return;
  document.documentElement.classList.add('in-tg');
  // в Telegram — только Y: ссылки на основной сайт не открываем (вход — через Twitch прямо здесь),
  // внешние сайты открываем браузером Telegram
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (u.origin === location.origin && (u.pathname.startsWith('/rp/') || u.pathname === location.pathname)) return;
    if (u.origin === location.origin && u.pathname.startsWith('/y/')) return;
    e.preventDefault(); e.stopPropagation();
    if (u.origin !== location.origin) { window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(u.href) : open(u.href, '_blank'); return; }
    if (!S.uid) startTwitchLogin();
  }, true);
  // SDK грузим только внутри Telegram (на сайте telegram.org не нужен)
  const sc = document.createElement('script');
  sc.src = 'https://telegram.org/js/telegram-web-app.js';
  sc.onload = () => {
    const w = window.Telegram?.WebApp; if (!w) return;
    w.ready(); w.expand();
    try { w.disableVerticalSwipes(); } catch {}
    const bg = getComputedStyle(document.body).backgroundColor;
    try { w.setHeaderColor(bg); w.setBackgroundColor(bg); } catch {}
    const upd = () => { const home = !location.hash || location.hash === '#/' || location.hash === '#'; home ? w.BackButton.hide() : w.BackButton.show(); };
    w.BackButton.onClick(() => history.back());
    addEventListener('hashchange', upd); upd();
  };
  document.head.append(sc);
})();
async function tgLogin() {
  try {
    const r = await fetch(`${CDN}/tg-auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: TG.initData }) });
    const d = await r.json().catch(() => ({}));
    if (d.access_token) {
      localStorage.setItem(LS_SESSION, JSON.stringify({ user: d.user, token: d.access_token, refreshToken: d.refresh_token }));
      return true;
    }
    TG.status = !r.ok ? 'error' : d.linked ? (d.error || 'error') : 'unlinked';
  } catch { TG.status = 'error'; }
  return false;
}

// вход через Twitch прямо в Y (нужен в Telegram, где бот не может прислать ссылку)
function startTwitchLogin() {
  try { sessionStorage.setItem('rp_tg_link', '1'); } catch {}
  location.href = `${SB_URL}/auth/v1/authorize?provider=twitch&redirect_to=${encodeURIComponent(location.origin + '/rp/')}`;
}
async function handleOAuthReturn() {
  const h = location.hash;
  if (!h.includes('access_token=')) return;
  const p = new URLSearchParams(h.replace(/^#\/?/, ''));
  const at = p.get('access_token'), rtk = p.get('refresh_token');
  history.replaceState(null, '', location.pathname + location.search + '#/');
  if (!at) return;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + at } });
    if (r.ok) localStorage.setItem(LS_SESSION, JSON.stringify({ user: await r.json(), token: at, refreshToken: rtk }));
  } catch {}
}
// привязать Telegram к вошедшему аккаунту (один раз за запуск)
async function tgLinkIfNeeded() {
  if (!TG.initData) return;
  let explicit = false, done = false;
  try { explicit = sessionStorage.getItem('rp_tg_link') === '1'; done = sessionStorage.getItem('rp_tg_done') === '1'; } catch {}
  if (done && !explicit) return;
  try {
    const r = await fetch(`${CDN}/tg-link`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await getToken() }, body: JSON.stringify({ initData: TG.initData }) });
    const d = await r.json().catch(() => ({}));
    if (explicit) toast(r.ok ? 'Telegram привязан — дальше вход будет сам' : (d.error || 'Не удалось привязать Telegram'), !r.ok);
    try { sessionStorage.setItem('rp_tg_done', '1'); sessionStorage.removeItem('rp_tg_link'); } catch {}
  } catch {}
}

/* ── старт ──────────────────────────────────────────────── */
async function init() {
  await handleOAuthReturn();
  let token = await getToken();
  if (!token && TG.initData && await tgLogin()) token = await getToken();
  const sess = readSession();
  if (token && sess?.user?.id) {
    S.uid = sess.user.id;
    await Promise.all([
      rpc('ensure_profile').then(me => { S.me = me; applyChatLook(); }).catch(e => console.warn('rp profile', e)),
      loadMySlots().catch(() => {}), loadUserReposts().catch(() => {}), loadUserLikes().catch(() => {}),
      rpc('calls_dev_allowed').then(v => { S.callsOk = v === true; }).catch(() => {}),
      rpc('call_goy', { p_user: sess.user.id }).then(v => { S.callGoy = v === true; }).catch(() => {}),
      rpc('is_gl_mod').then(v => { S.isGlMod = v === true; }).catch(() => {}),
    ]);
    loadUnread();
    tgLinkIfNeeded();
  } else {
    document.body.classList.add('guest');
    const msg = TG.status === 'unlinked' ? 'Telegram не привязан к renah0cki. Войди один раз через Twitch — дальше вход будет сам.'
      : TG.status === 'no_email' ? 'Не получилось войти через Telegram: у аккаунта нет почты. Войди на сайте.'
      : TG.status ? 'Не получилось войти через Telegram. Попробуй открыть Y ещё раз.'
      : 'Смотрите как гость. Войдите, чтобы играть.';
    document.body.insertAdjacentHTML('beforeend', `<div class="guest-bar"><span>${esc(msg)}</span>${TG.initData ? '<button class="btn small" type="button" data-tg-login>Войти через Twitch</button>' : '<a class="btn small" href="/">Войти</a>'}</div>`);
    const tl = $('[data-tg-login]'); if (tl) tl.onclick = startTwitchLogin;
  }
  renderMe();
  addEventListener('hashchange', route);
  route();
  subscribeGlobal();
}
addEventListener('storage', e => { if (e.key === LS_SESSION && !e.newValue) location.reload(); });
init();
})();
