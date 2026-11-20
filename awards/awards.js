/* OvosheAwards 2026 — голосование зрителей. Та же база и тот же вход, что у renah0cki. */
(() => {
'use strict';
const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const CDN = 'https://cdn.renah0cki.xyz';
const OWNER = '23c6cb47-27b0-45ac-8fd9-c43b84d57aba';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
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
const S = { uid: readSession()?.user?.id || null, me: null, admin: false, noms: [], nees: [], votes: new Map(), results: null, showRes: false };
const ytId = u => (String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/) || [])[1] || null;
const thumb = (u, w = 720) => { const m = String(u || '').match(/^https:\/\/cdn\.renah0cki\.xyz\/file\/(.+\.(?:jpe?g|png|webp))$/i); return m ? `${CDN}/thumb/${w}/${m[1]}` : u; };
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
const neesOf = id => S.nees.filter(x => x.nomination_id === id).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

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
  if (!S.uid) return;
  try {
    const [me] = await api(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,role,extra_roles`);
    S.me = me;
    S.admin = S.uid === OWNER || me?.role === 'admin' || (me?.extra_roles || []).includes('admin');
    $('#awMe').innerHTML = me ? `<img src="${esc(me.avatar_url || '/icon-32.png')}" alt=""><span>${esc(me.display_name || me.username)}</span>` : '';
  } catch {}
}

/* ── главная: все номинации ── */
function viewHome() {
  const total = S.noms.length, voted = S.noms.filter(n => S.votes.has(n.id)).length;
  page.innerHTML = `<section class="aw-hero">
      <div class="aw-hero-txt"><div class="aw-kicker">Народное голосование</div>
        <h1>Ovoshe<b>Awards</b> <span>2026</span></h1>
        <p>Выбирай лучших в каждой номинации. Один голос на номинацию — передумал, просто нажми на другого.</p>
        ${S.uid ? `<div class="aw-prog"><div class="aw-prog-bar"><i style="width:${total ? voted / total * 100 : 0}%"></i></div><span>Вы проголосовали в <b>${voted}</b> из ${total}</span></div>` : `<a class="aw-btn gold" href="/">Войдите на renah0cki, чтобы голосовать</a>`}
      </div>
      <div class="aw-trophy" aria-hidden="true">🏆</div>
    </section>
    ${S.admin ? `<div class="aw-admin-bar"><span>Админ</span><button class="aw-btn" data-add-nom>＋ Номинация</button><label class="aw-sw"><input type="checkbox" data-show-res${S.showRes ? ' checked' : ''}><i></i>Показывать голоса</label></div>` : ''}
    <div class="aw-grid">${S.noms.map((n, i) => {
      const list = neesOf(n.id), mine = S.votes.get(n.id), pick = list.find(x => x.id === mine);
      const cover = list.find(x => x.media_type === 'image' || x.media_type === 'youtube');
      const bg = cover ? (cover.media_type === 'youtube' ? `https://img.youtube.com/vi/${ytId(cover.media_url)}/mqdefault.jpg` : thumb(cover.media_url, 480)) : '';
      return `<a class="aw-nom${mine ? ' voted' : ''}" href="#/n/${n.id}" style="--i:${i}">
        <div class="aw-nom-bg"${bg ? ` style="background-image:url('${esc(bg)}')"` : ''}></div>
        <div class="aw-nom-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="aw-nom-emo">${esc(n.emoji || '🏅')}</div>
        <h2>${esc(n.title)}</h2>
        <div class="aw-nom-meta">${list.length ? `${list.length} ${plural(list.length, 'номинант', 'номинанта', 'номинантов')}` : 'номинанты скоро'}${n.is_open ? '' : ' · голосование закрыто'}</div>
        ${pick ? `<div class="aw-nom-pick">✓ Ваш голос: <b>${esc(pick.title)}</b></div>` : ''}
      </a>`;
    }).join('') || '<div class="aw-empty">Номинаций пока нет.</div>'}</div>`;
}

/* ── номинация ── */
function mediaHtml(x, big) {
  const u = x.media_url || '';
  if (x.media_type === 'image') return `<button class="aw-media" data-zoom="${esc(u)}"><img src="${esc(big ? u : thumb(u, 720))}" alt="" loading="lazy"></button>`;
  if (x.media_type === 'video') return `<div class="aw-media"><video src="${esc(u)}" controls playsinline preload="metadata"></video></div>`;
  if (x.media_type === 'youtube' && ytId(u)) return `<div class="aw-media yt"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(u)}" allowfullscreen loading="lazy"></iframe></div>`;
  if (x.media_type === 'link') return `<a class="aw-media aw-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span>🔗</span>${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}</a>`;
  return `<div class="aw-media aw-nomedia">${esc((x.title || '?').slice(0, 1).toUpperCase())}</div>`;
}
function viewNom(id) {
  const n = S.noms.find(x => x.id === id);
  if (!n) { page.innerHTML = '<div class="aw-empty">Номинация не найдена. <a href="#/">Ко всем номинациям</a></div>'; return; }
  const list = neesOf(id), mine = S.votes.get(id), idx = S.noms.indexOf(n);
  const prev = S.noms[idx - 1], next = S.noms[idx + 1];
  const max = S.results ? Math.max(1, ...list.map(x => S.results.get(x.id) || 0)) : 1;
  page.innerHTML = `<a class="aw-crumb" href="#/">← Все номинации</a>
    <section class="aw-nom-head"><div class="aw-nom-emo big">${esc(n.emoji || '🏅')}</div><div>
      <div class="aw-kicker">Номинация ${idx + 1} из ${S.noms.length}${n.is_open ? '' : ' · голосование закрыто'}</div>
      <h1>${esc(n.title)}</h1>${n.description ? `<p>${esc(n.description)}</p>` : ''}</div>
      ${S.admin ? `<div class="aw-head-acts"><button class="aw-btn" data-edit-nom="${n.id}">Изменить</button><button class="aw-btn" data-toggle-nom="${n.id}">${n.is_open ? 'Закрыть голосование' : 'Открыть голосование'}</button><button class="aw-btn danger" data-del-nom="${n.id}">Удалить</button></div>` : ''}
    </section>
    <div class="aw-nees">${list.map((x, i) => {
      const on = mine === x.id, v = S.results?.get(x.id) || 0;
      return `<article class="aw-nee${on ? ' on' : ''}" style="--i:${i}">
        ${mediaHtml(x)}
        <div class="aw-nee-body"><h3>${esc(x.title)}</h3>${x.description ? `<p>${esc(x.description)}</p>` : ''}
          ${S.results && S.showRes ? `<div class="aw-res"><div class="aw-res-bar"><i style="width:${v / max * 100}%"></i></div><span>${v} ${plural(v, 'голос', 'голоса', 'голосов')}</span></div>` : ''}
          <div class="aw-nee-acts">${n.is_open ? `<button class="aw-btn ${on ? 'gold' : 'vote'}" data-vote="${x.id}">${on ? '✓ Ваш голос' : 'Голосовать'}</button>` : on ? '<span class="aw-btn gold static">✓ Ваш голос</span>' : ''}
            ${S.admin ? `<button class="aw-btn icon" data-edit-nee="${x.id}" title="Изменить">✎</button><button class="aw-btn icon danger" data-del-nee="${x.id}" title="Удалить">✕</button>` : ''}</div></div>
      </article>`;
    }).join('')}
    ${S.admin ? `<button class="aw-nee aw-add" data-add-nee="${id}"><span>＋</span>Добавить номинанта<small>фото, гиф, видео или ссылка</small></button>` : ''}</div>
    ${!list.length && !S.admin ? '<div class="aw-empty">Номинанты скоро появятся.</div>' : ''}
    <nav class="aw-pager">${prev ? `<a href="#/n/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#/n/${next.id}">${esc(next.title)} →</a>` : ''}</nav>`;
}

/* ── голос ── */
async function vote(id) {
  if (!S.uid) return toast('Войдите на renah0cki, чтобы голосовать', true);
  const x = S.nees.find(y => y.id === id); if (!x) return;
  try {
    const r = await rpc('aw_vote', { p_nominee: id });
    if (r) { S.votes.set(x.nomination_id, r); toast('Голос учтён 🥕'); } else { S.votes.delete(x.nomination_id); toast('Голос снят'); }
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
page.addEventListener('click', async e => {
  const t = e.target;
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
page.addEventListener('change', e => { if (e.target.matches('[data-show-res]')) { S.showRes = e.target.checked; route(); } });

/* ── роутер ── */
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'n' && p[1]) viewNom(p[1]); else viewHome();
}
addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
page.innerHTML = '<div class="aw-load"><span>🥕</span></div>';
loadMe().then(loadAll).then(route).catch(e => { page.innerHTML = `<div class="aw-empty">Не удалось загрузить: ${esc(e.message)}</div>`; });
})();
