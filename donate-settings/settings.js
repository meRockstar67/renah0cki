/* renah0cki — страница настроек донатов, ссылок OBS и живого конструктора алертов */
(() => {
'use strict';

const SB_URL = 'https://api.renah0cki.xyz';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzk0NjgyNjI0LCJleHAiOjE5NTIzNjI2MjR9.KOLZWhB7uFppGB8SoJ-hT7Ilz4lAb2yPuxrzZN-ynZA';
const API = 'https://cdn.renah0cki.xyz';
const DEFAULT_IMG = 'https://cdn.renah0cki.xyz/file/static/Resurs-134x-8.png';
const FONTS = {
  Inter: '"Inter", system-ui, sans-serif',
  Montserrat: '"Montserrat", system-ui, sans-serif',
  Unbounded: '"Unbounded", system-ui, sans-serif',
  'Russo One': '"Russo One", system-ui, sans-serif',
  Spectral: '"Spectral", Georgia, serif',
};
const DEFAULTS = {
  duration: 8, min: 1, show_message: true, sound: true, sound_preset: 'chime', sound_url: '', volume: 75,
  tts: true, tts_voice: 'female', tts_viewer_pick: true, tts_volume: 85, tts_rate: 1,
  theme: 'glass', anim: 'pop', layout: 'top',
  accent: '#8b5cf6', text_color: '#f3f4fa', bg_color: '#0e0e18', bg_alpha: 82,
  font: 'Inter', head_size: 34, msg_size: 20, img_size: 92, image_url: '', da_image_url: '', dn_image_url: '',
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('ru-RU');
let toastT;
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
}

function readSession() { try { return JSON.parse(localStorage.getItem('fh_session')); } catch { return null; } }
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
      if (!r.ok) return null;
      const d = await r.json();
      localStorage.setItem('fh_session', JSON.stringify({ ...(readSession() || s), token: d.access_token, refreshToken: d.refresh_token }));
      return d.access_token;
    } catch { return null; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}
async function sb(path, body, strict = false) {
  const t = await getToken();
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (t || SB_KEY), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) { if (strict) throw new Error(j?.message || j?.error || 'HTTP ' + r.status); return null; }
  return j;
}
async function aucApi(path, body) {
  const t = await getToken();
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: JSON.stringify(body || {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  return d;
}
async function uploadFile(file) {
  const token = await getToken();
  if (!token) throw new Error('Нужно войти');
  const mime = file.type || (/\.avif$/i.test(file.name) ? 'image/avif' : /\.webp$/i.test(file.name) ? 'image/webp' : 'application/octet-stream');
  const r = await fetch(API + '/upload', {
    method: 'POST',
    headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(file.name), 'X-User-Id': S.uid, Authorization: 'Bearer ' + token },
    body: file,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || 'Ошибка загрузки');
  return j.url;
}

const S = { uid: readSession()?.user?.id || null, me: null, isAdmin: false, dockKey: '', alert: { ...DEFAULTS } };

function hexToRgba(hex, a) {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return `rgba(14, 14, 24, ${a})`;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`;
}

/* ── звук (1 в 1 с /auc/alert.html) ── */
let ac = null, prevSnd = null;
function playPreviewSound() {
  const volRaw = Math.max(0, Math.min(1, (Number(S.alert.volume ?? 75)) / 100));
  if (volRaw <= 0.001) return;
  try { prevSnd?.pause(); } catch {}
  if (/^https:\/\//i.test(S.alert.sound_url || '')) {
    prevSnd = new Audio(S.alert.sound_url);
    prevSnd.volume = volRaw;
    prevSnd.play().catch(() => toast('Не удалось воспроизвести MP3', true));
    return;
  }
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    const vol = volRaw * 0.45;
    const p = S.alert.sound_preset || 'chime';
    const seq = p === 'coin'
      ? [[987.77, 0, .09, 'triangle'], [1318.5, .08, .35, 'triangle']]
      : p === 'crystal'
        ? [[1046.5, 0, .45, 'sine'], [1567.98, .07, .5, 'sine'], [2093, .14, .65, 'sine']]
        : p === 'soft'
          ? [[523.25, 0, .55, 'sine'], [659.25, .06, .55, 'sine'], [783.99, .12, .6, 'sine']]
          : [[880, 0, .5, 'sine'], [1318.5, .09, .55, 'sine'], [1760, .18, .6, 'sine']];
    seq.forEach(([freq, delay, dur, type]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol, t + delay + .02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + delay + dur);
      o.connect(g).connect(ac.destination);
      o.start(t + delay); o.stop(t + delay + dur + .05);
    });
  } catch {}
}

let prevAudio = null;
async function playPreviewTts() {
  const vol = Math.max(0, Math.min(1, (Number(S.alert.tts_volume ?? 85)) / 100));
  if (vol <= 0.001) return toast('Громкость озвучки на 0%');
  const voice = S.alert.tts_voice === 'male' ? 'male' : 'female';
  const rate = Math.max(0.65, Math.min(1.6, Number(S.alert.tts_rate) || 1));
  const text = 'Топ стрим, удачи сегодня!';
  try { prevAudio?.pause(); } catch {}
  try {
    const r = await fetch(`${API}/auc/tts?voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate.toFixed(2))}&text=${encodeURIComponent(text)}`);
    if (!r.ok) throw new Error('tts ' + r.status);
    const url = URL.createObjectURL(await r.blob());
    prevAudio = new Audio(url);
    prevAudio.volume = vol;
    prevAudio.onended = () => URL.revokeObjectURL(url);
    await prevAudio.play();
  } catch {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU'; u.volume = vol; u.rate = rate; u.pitch = voice === 'male' ? 0.82 : 1.08;
      speechSynthesis.speak(u);
    } else toast('Озвучка недоступна', true);
  }
}

/* ── синхронизация формы ↔ живого превью ── */
function applyPreview() {
  const a = S.alert;
  const r = document.documentElement.style;
  const al = $('#prevAl');
  al.dataset.theme = a.theme;
  al.dataset.anim = a.anim;
  al.dataset.layout = a.layout;
  r.setProperty('--al-accent', a.accent);
  r.setProperty('--al-text', a.text_color);
  r.setProperty('--al-bg', hexToRgba(a.bg_color, Math.max(0, Math.min(100, Number(a.bg_alpha))) / 100));
  r.setProperty('--al-font', FONTS[a.font] || FONTS.Inter);
  r.setProperty('--al-hsz', a.head_size + 'px');
  r.setProperty('--al-msz', a.msg_size + 'px');
  r.setProperty('--al-isz', (a.img_size ?? 92) + 'px');
  const src = /^https:\/\//i.test(a.image_url || '') ? a.image_url : DEFAULT_IMG;
  if ($('#prevImg').src !== src) $('#prevImg').src = src;
  $('#prevM').hidden = !a.show_message;

  $('#bgAlphaVal').textContent = `${a.bg_alpha}%`;
  $('#headSizeVal').textContent = `${a.head_size}px`;
  $('#msgSizeVal').textContent = `${a.msg_size}px`;
  $('#imgSizeVal').textContent = `${a.img_size ?? 92}px`;
  $('#volVal').textContent = `${a.volume}%`;
  $('#ttsVolVal').textContent = `${a.tts_volume}%`;
  $('#ttsRateVal').textContent = `${Number(a.tts_rate || 1).toFixed(2)}×`;

  document.querySelectorAll('[data-seg="theme"] button').forEach(b => b.classList.toggle('on', b.dataset.val === a.theme));
  document.querySelectorAll('[data-seg="tts_voice"] button').forEach(b => b.classList.toggle('on', b.dataset.val === (a.tts_voice === 'male' ? 'male' : 'female')));
  document.querySelectorAll('#swatches [data-accent]').forEach(b => b.classList.toggle('on', b.dataset.accent.toLowerCase() === a.accent.toLowerCase()));
}

function fillForm() {
  const f = $('#alertForm');
  const a = S.alert;
  f.anim.value = a.anim;
  f.layout.value = a.layout;
  f.image_url.value = a.image_url || '';
  f.da_image_url.value = a.da_image_url || '';
  f.dn_image_url.value = a.dn_image_url || '';
  f.img_size.value = a.img_size ?? 92;
  f.accent.value = a.accent;
  f.text_color.value = a.text_color;
  f.bg_color.value = a.bg_color;
  f.bg_alpha.value = a.bg_alpha;
  f.font.value = a.font;
  f.head_size.value = a.head_size;
  f.msg_size.value = a.msg_size;
  f.duration.value = a.duration;
  f.min.value = a.min;
  f.show_message.checked = !!a.show_message;
  f.sound.checked = !!a.sound;
  f.sound_url.value = a.sound_url || '';
  f.sound_preset.value = a.sound_preset;
  f.volume.value = a.volume;
  f.tts.checked = a.tts !== false;
  f.tts_viewer_pick.checked = a.tts_viewer_pick !== false;
  f.tts_volume.value = a.tts_volume ?? 85;
  f.tts_rate.value = a.tts_rate ?? 1;
  applyPreview();
}

function readForm() {
  const f = $('#alertForm');
  S.alert = {
    ...S.alert,
    anim: f.anim.value,
    layout: f.layout.value,
    image_url: f.image_url.value.trim(),
    da_image_url: f.da_image_url.value.trim(),
    dn_image_url: f.dn_image_url.value.trim(),
    img_size: Number(f.img_size.value) || 92,
    accent: f.accent.value,
    text_color: f.text_color.value,
    bg_color: f.bg_color.value,
    bg_alpha: Number(f.bg_alpha.value),
    font: f.font.value,
    head_size: Number(f.head_size.value),
    msg_size: Number(f.msg_size.value),
    duration: Math.min(60, Math.max(3, Number(f.duration.value) || 8)),
    min: Math.max(1, Number(f.min.value) || 1),
    show_message: f.show_message.checked,
    sound: f.sound.checked,
    sound_url: f.sound_url.value.trim(),
    sound_preset: f.sound_preset.value,
    volume: Number(f.volume.value),
    tts: f.tts.checked,
    tts_viewer_pick: f.tts_viewer_pick.checked,
    tts_volume: Number(f.tts_volume.value),
    tts_rate: Number(f.tts_rate.value) || 1,
  };
  applyPreview();
}

function replayAnim() {
  const al = $('#prevAl');
  al.classList.remove('show');
  void al.offsetWidth;
  setTimeout(() => {
    al.classList.add('show');
    if (S.alert.sound) playPreviewSound();
    if (S.alert.tts) setTimeout(playPreviewTts, S.alert.sound ? 600 : 80);
  }, 80);
}

function renderLinks() {
  const me = S.me;
  if (!me?.username) return;
  const myUrl = `${location.origin}/donate/${encodeURIComponent(me.username)}`;
  $('#myLink').textContent = myUrl;
  $('#myLinkOpen').href = myUrl;
  $('#openMyDonate').href = myUrl;
  $('#openMyDonate').hidden = false;

  const on = me.coin_donate_enabled !== false;
  const tag = $('#myStateTag');
  tag.textContent = on ? 'Включена' : 'Отключена';
  tag.className = 'tag ' + (on ? 'ok' : 'off');
  const tb = $('#myToggle');
  tb.textContent = on ? 'Отключить' : 'Подключить';
  tb.className = 'btn sm ' + (on ? 'ghost' : 'pri');

  $('#obsLinks').hidden = !S.isAdmin;
  $('#obsStudio').hidden = !S.isAdmin;
  if (S.isAdmin) {
    $('#feedDockLink').textContent = `${location.origin}/donate-settings/feed.html${S.dockKey ? '?key=' + encodeURIComponent(S.dockKey) : ''}`;
    $('#feedWidgetLink').textContent = `${location.origin}/donate-settings/feed-widget.html`;
    $('#alertLink').textContent = `${location.origin}/auc/alert.html`;
    $('#overlayLink').textContent = `${location.origin}/auc/overlay.html`;
    $('#aucLink').textContent = `${location.origin}/auc/`;
  }
}

async function init() {
  if (!S.uid) { $('#needLogin').hidden = false; return; }
  const [profs, mine, adm] = await Promise.all([
    sb(`profiles?id=eq.${S.uid}&select=id,username,display_name,avatar_url,coin_donate_enabled`),
    sb('auc_donations?select=id,user_id,recipient_id,user_name,amount,message,kind,lot_label,created_at&order=id.desc&limit=15'),
    aucApi('/auc/admin/state').catch(() => null),
  ]);
  S.me = Array.isArray(profs) ? profs[0] : null;
  if (!S.me) { $('#needLogin').hidden = false; return; }
  $('#content').hidden = false;
  $('#mePill').hidden = false;
  $('#meName').textContent = S.me.display_name || S.me.username;
  $('#meAva').src = S.me.avatar_url || DEFAULT_IMG;

  if (adm?.config) {
    S.isAdmin = true;
    S.alert = { ...DEFAULTS, ...(adm.config.alert || {}) };
    const dk = await aucApi('/auc/feed/admin', { a: 'dock_key' }).catch(() => null);
    if (dk?.key) S.dockKey = dk.key;
    fillForm();
  }
  renderLinks();

  if (Array.isArray(mine) && mine.length) {
    $('#mineBox').hidden = false;
    $('#mine').innerHTML = mine.map(m => {
      const incoming = m.recipient_id === S.uid && m.user_id !== S.uid;
      const tag = incoming
        ? `<span class="src wallet">получено от ${esc(m.user_name)}</span>`
        : m.kind === 'bid'
          ? `<span class="src site">ставка${m.lot_label ? ': ' + esc(m.lot_label) : ''}</span>`
          : '<span class="src">донат</span>';
      return `<li class="item"><span class="main"><b${incoming ? ' class="inc"' : ''}>${incoming ? '+' : ''}${fmt(m.amount)} coin</b> ${tag}</span>
        <span class="side">${new Date(m.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>${m.message ? `<span class="meta">«${esc(m.message)}»</span>` : ''}</li>`;
    }).join('');
  }
}

/* ── события ── */
document.addEventListener('click', async e => {
  const c = e.target.closest('[data-copy]');
  if (c) {
    navigator.clipboard.writeText($('#' + c.dataset.copy).textContent).then(() => toast('Ссылка скопирована'), () => toast('Не удалось скопировать', true));
    return;
  }
  const seg = e.target.closest('[data-seg="theme"] button');
  if (seg) { S.alert.theme = seg.dataset.val; applyPreview(); return; }
  const vseg = e.target.closest('[data-seg="tts_voice"] button');
  if (vseg) { S.alert.tts_voice = vseg.dataset.val; applyPreview(); return; }
  const sw = e.target.closest('#swatches [data-accent]');
  if (sw) { S.alert.accent = sw.dataset.accent; $('#alertForm').accent.value = sw.dataset.accent; applyPreview(); return; }
  const bg = e.target.closest('#bgPick [data-bg]');
  if (bg) {
    $('#stage').dataset.bg = bg.dataset.bg;
    document.querySelectorAll('#bgPick button').forEach(b => b.classList.toggle('on', b === bg));
    return;
  }
  if (e.target.closest('[data-test-obs]')) {
    try { await aucApi('/auc/admin/do', { a: 'test_alert', voice: S.alert.tts_voice }); toast('Тестовый донат отправлен в OBS'); }
    catch (err) { toast(err.message, true); }
  }
});

$('#myToggle').addEventListener('click', async () => {
  const nextOn = !(S.me?.coin_donate_enabled !== false);
  try {
    const r = await sb('rpc/coin_donate_toggle', { p_enabled: nextOn }, true);
    S.me.coin_donate_enabled = r?.coin_donate_enabled ?? nextOn;
    toast(S.me.coin_donate_enabled ? 'Приём донатов включён' : 'Приём донатов отключён');
    renderLinks();
  } catch (err) { toast(err.message, true); }
});

$('#alertForm').addEventListener('input', readForm);
$('#alertForm').addEventListener('change', readForm);
$('#playSoundBtn').addEventListener('click', playPreviewSound);
$('#playTtsBtn').addEventListener('click', playPreviewTts);
$('#replayBtn').addEventListener('click', replayAnim);
$('#clearImg').addEventListener('click', () => { $('#alertForm').image_url.value = ''; readForm(); });
$('#clearDaImg').addEventListener('click', () => { $('#alertForm').da_image_url.value = ''; readForm(); });
$('#clearDnImg').addEventListener('click', () => { $('#alertForm').dn_image_url.value = ''; readForm(); });
$('#clearSound').addEventListener('click', () => { $('#alertForm').sound_url.value = ''; readForm(); });

async function handleUploadTo(inputEl, targetName, kindLabel = 'файл') {
  const file = inputEl.files?.[0];
  inputEl.value = '';
  if (!file) return;
  if (file.size > 15 * 1048576) return toast('Файл больше 15 МБ', true);
  try {
    toast(`Загружаю ${kindLabel}…`);
    const url = await uploadFile(file);
    $('#alertForm')[targetName].value = url;
    readForm();
    toast('Загружено — нажми «Сохранить настройки»');
  } catch (err) { toast(err.message, true); }
}
$('#imgFile').addEventListener('change', e => handleUploadTo(e.target, 'image_url', 'картинку'));
$('#daImgFile').addEventListener('change', e => handleUploadTo(e.target, 'da_image_url', 'картинку'));
$('#dnImgFile').addEventListener('change', e => handleUploadTo(e.target, 'dn_image_url', 'картинку'));
$('#soundFile').addEventListener('change', e => handleUploadTo(e.target, 'sound_url', 'звук'));

$('#resetBtn').addEventListener('click', () => {
  S.alert = { ...DEFAULTS };
  fillForm();
  toast('Сброшено к стандарту — нажми «Сохранить»');
});

$('#alertForm').addEventListener('submit', async e => {
  e.preventDefault();
  readForm();
  if (S.alert.image_url && !/^https:\/\//i.test(S.alert.image_url)) return toast('Ссылка на картинку должна начинаться с https://', true);
  if (S.alert.da_image_url && !/^https:\/\//i.test(S.alert.da_image_url)) return toast('Ссылка на картинку DA должна начинаться с https://', true);
  if (S.alert.dn_image_url && !/^https:\/\//i.test(S.alert.dn_image_url)) return toast('Ссылка на картинку Donatello должна начинаться с https://', true);
  if (S.alert.sound_url && !/^https:\/\//i.test(S.alert.sound_url)) return toast('Ссылка на звук должна начинаться с https://', true);
  const btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'Сохраняю…';
  try {
    await aucApi('/auc/admin/do', { a: 'config', config: { alert: S.alert } });
    toast('Настройки OBS сохранены и применены');
  } catch (err) { toast(err.message, true); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить настройки'; }
});

init();
})();
