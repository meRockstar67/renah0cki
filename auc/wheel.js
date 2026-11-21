/* Колесо фортуны аукциона: общий код для страницы и оверлея OBS.
   Размер сектора = вес лота (баллы; в режиме «Выбывание» — обратная величина).
   Победитель выбирается заранее (crypto), колесо плавно докручивается до него. */
(() => {
'use strict';
const TAU = Math.PI * 2;
const PALETTES = {
  rainbow: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#63e6be'],
  ocean:   ['#0b7285', '#1098ad', '#15aabf', '#3bc9db', '#66d9e8', '#1c7ed6', '#339af0', '#4dabf7', '#74c0fc', '#22b8cf'],
  sunset:  ['#e8590c', '#f76707', '#fd7e14', '#ff922b', '#f03e3e', '#fa5252', '#e64980', '#f06595', '#fab005', '#d9480f'],
  forest:  ['#2b8a3e', '#37b24d', '#51cf66', '#8ce99a', '#5c940d', '#74b816', '#94d82d', '#087f5b', '#0ca678', '#20c997'],
  noir:    ['#343a40', '#495057', '#868e96', '#adb5bd', '#212529', '#5c5f66', '#6c727a', '#9aa0a6', '#3d4249', '#7b8189'],
  cyber:   ['#ff2a85', '#00e5ff', '#a855f7', '#39ff14', '#ff9f1c', '#3b82f6', '#f43f5e', '#22d3ee', '#c084fc', '#facc15'],
  pastel:  ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#f1c0e8', '#cfbaf0'],
  berry:   ['#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#e879f9'],
  gold:    ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#92400e', '#ca8a04', '#eab308', '#facc15'],
  ice:     ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'],
  pointauc:['#e33b60', '#2a8bea', '#63c575', '#f3bf41', '#9b5de5', '#e58221', '#00b6ac', '#e385cf', '#36b5e9', '#f85842', '#5d60e2', '#3cb787', '#ea631d', '#0085cb', '#4a91ae', '#7daee8'],
};
function isDark(hex) {
  const m = String(hex || '').replace('#', '');
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 165;
}
const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const fmt = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('ru-RU');
const plural = n => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? 'балл' : m >= 2 && m <= 4 && (h < 12 || h > 14) ? 'балла' : 'баллов'; };

// цвет лота стабилен по его номеру — одинаковый в списке, на колесе и в оверлее
const colorOf = (num, palette) => { const p = PALETTES[palette] || PALETTES.rainbow; return p[(Math.max(1, num) - 1) % p.length]; };

function segs(lots, palette, split = 1) {
  const L = lots.filter(l => +(l.w ?? l.total) > 0).slice().sort((a, b) => a.num - b.num);
  if (!L.length) return [];
  const sp = Number(split);
  let pieces;
  if (Number.isFinite(sp) && sp > 0 && sp < 0.99 && L.length > 1) {
    const maxW = Math.max(...L.map(l => +(l.w ?? l.total)));
    const cap = Math.max(maxW * Math.max(0.1, sp), maxW * 0.1);
    const buckets = L.map(l => {
      const w = +(l.w ?? l.total);
      const n = Math.max(1, Math.min(16, Math.ceil(w / cap)));
      const col = l.color || colorOf(l.num, palette);
      return Array.from({ length: n }, () => ({ id: l.id, num: l.num, name: l.name, total: +l.total, weight: w / n, color: col }));
    });
    pieces = [];
    const maxN = Math.max(...buckets.map(b => b.length));
    for (let i = 0; i < maxN; i++) {
      for (const b of buckets) {
        const idx = Math.floor(i * b.length / maxN);
        if (i === Math.floor(idx * maxN / b.length) && b[idx]) pieces.push(b[idx]);
      }
    }
    if (!pieces.length) pieces = buckets.flat();
  } else {
    pieces = L.map(l => ({ id: l.id, num: l.num, name: l.name, total: +l.total, weight: +(l.w ?? l.total), color: l.color || colorOf(l.num, palette) }));
  }
  const sum = pieces.reduce((s, p) => s + p.weight, 0) || 1;
  let a = 0;
  return pieces.map(p => { const w = p.weight / sum * TAU; const s = { ...p, start: a, end: a + w }; a += w; return s; });
}

function fitText(ctx, t, maxW, full) {
  if (ctx.measureText(t).width <= maxW || full) return t;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

// o: { hi, labels: 'radial'|'horizontal', hideSum, fullText, img (HTMLImageElement), pointauc }
function draw(cv, S, rot, o = {}) {
  const size = cv.clientWidth || cv.width; if (!size) return;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pa = o.pointauc ?? (document.documentElement.dataset.theme === 'pointauc');
  const r = size / 2, R = r - 8; ctx.clearRect(0, 0, size, size);
  // обод
  ctx.beginPath(); ctx.arc(r, r, R + (pa ? 3.5 : 3), 0, TAU); ctx.fillStyle = pa ? '#eeeeee' : 'rgba(255,240,230,.85)'; ctx.fill();
  if (!S.length) {
    ctx.beginPath(); ctx.arc(r, r, R, 0, TAU); ctx.fillStyle = pa ? '#242424' : '#1a1a26'; ctx.fill();
    ctx.fillStyle = '#8e8ea8'; ctx.font = `600 ${Math.max(14, r / 16)}px Inter, system-ui`; ctx.textAlign = 'center'; ctx.fillText('Нет участников', r, r + r * 0.42);
  } else {
    ctx.save(); ctx.translate(r, r); ctx.rotate(rot);
    const fs = pa ? Math.max(13, Math.min(20, r / 16)) : Math.max(12, Math.min(22, r / 14));
    const hideSum = pa ? (o.hideSum !== false) : !!o.hideSum;
    for (const s of S) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, s.start, s.end); ctx.closePath();
      const dimmed = o.hi != null && o.hi !== s.id;
      ctx.fillStyle = s.color; ctx.globalAlpha = dimmed ? (pa ? 0.22 : 0.28) : 1; ctx.fill(); ctx.globalAlpha = 1;
      if (S.length > 1) { ctx.strokeStyle = pa ? 'rgba(255,255,255,.88)' : 'rgba(12,12,20,.55)'; ctx.lineWidth = pa ? 1.6 : 1.5; ctx.stroke(); }
      const span = s.end - s.start; if (span < 0.045) continue;
      const mid = (s.start + s.end) / 2;
      ctx.save();
      ctx.fillStyle = pa ? '#ffffff' : (isDark(s.color) ? '#f8fafc' : '#14141f');
      if (dimmed) ctx.globalAlpha = 0.45;
      if (o.labels === 'horizontal') {
        const d = R * 0.62; ctx.translate(Math.cos(mid) * d, Math.sin(mid) * d); ctx.rotate(-rot);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${pa ? 600 : 800} ${fs}px Inter, system-ui, sans-serif`;
        const maxW = Math.min(R * 0.7, Math.max(40, span * d * 1.1));
        ctx.fillText(fitText(ctx, s.name, maxW, o.fullText), 0, hideSum ? 0 : -fs * 0.55);
        if (!hideSum) { ctx.font = `600 ${fs * 0.75}px Inter, system-ui`; ctx.globalAlpha *= .75; ctx.fillText(`${fmt(s.total)} ${plural(Math.round(s.total))}`, 0, fs * 0.6); }
      } else {
        ctx.rotate(mid); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const lineH = span * R * 0.85;
        const two = !hideSum && lineH > fs * 2.3;
        ctx.font = `${pa ? 600 : 800} ${fs}px Inter, system-ui, sans-serif`;
        ctx.fillText(fitText(ctx, s.name, R * (o.fullText ? 0.78 : 0.6), o.fullText), R - (pa ? 26 : 22), two ? -fs * 0.5 : 0);
        if (two) { ctx.font = `600 ${fs * 0.72}px Inter, system-ui`; ctx.globalAlpha *= .75; ctx.fillText(`${fmt(s.total)} ${plural(Math.round(s.total))}`, R - 22, fs * 0.62); }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // центр с картинкой (если передан htmlImg — картинку рендерит <img> поверх canvas, чтобы работала анимация 7TV)
  const cr = Math.max(26, r * (pa ? 0.21 : 0.2));
  ctx.save(); ctx.beginPath(); ctx.arc(r, r, cr, 0, TAU); ctx.fillStyle = pa ? '#212121' : '#0c0c14'; ctx.fill();
  if (!o.htmlImg && o.img && o.img.complete && o.img.naturalWidth) {
    ctx.clip(); const iw = o.img.naturalWidth, ih = o.img.naturalHeight, k = Math.max(cr * 2 / iw, cr * 2 / ih);
    ctx.drawImage(o.img, r - iw * k / 2, r - ih * k / 2, iw * k, ih * k);
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(r, r, cr, 0, TAU); ctx.strokeStyle = pa ? '#eeeeee' : 'rgba(255,240,230,.9)'; ctx.lineWidth = 3; ctx.stroke();
}

function pick(S) { let x = rnd() * S.reduce((t, s) => t + s.weight, 0); for (const s of S) if ((x -= s.weight) < 0) return s; return S[S.length - 1]; }
// угол, при котором стрелка (сверху) смотрит в случайную точку сектора s
function target(s, from, turns) {
  const t = s.start + (s.end - s.start) * (0.15 + 0.7 * rnd());
  let R = ((-Math.PI / 2 - t) % TAU + TAU) % TAU;
  R += from - (from % TAU) + turns * TAU;
  while (R < from + 2 * TAU) R += TAU;
  return R;
}
function at(S, rot) { const t = ((-Math.PI / 2 - rot) % TAU + TAU) % TAU; return S.find(s => t >= s.start && t < s.end) || null; }
// сначала быстро, потом долго и плавно тормозит; с «ускорением» — ещё и плавный разгон в начале
const easeOut = x => 1 - Math.pow(1 - x, 5);
const easeAccel = x => 1 - Math.pow(1 - Math.pow(x, 1.6), 5);
function spin(cv, S, from, to, ms, startAt, o, onTick, done) {
  let stop = false; const ease = o.accel ? easeAccel : easeOut;
  const f = () => {
    if (stop) return;
    const p = Math.min(1, Math.max(0, (Date.now() - startAt) / ms));
    const rot = from + (to - from) * ease(p);
    draw(cv, S, rot, o); if (onTick) onTick(at(S, rot), p, rot);
    if (p < 1) requestAnimationFrame(f); else if (done) done(rot);
  };
  f();
  return () => { stop = true; };
}

// щелчок при смене сектора под стрелкой (без файлов)
let ac = null;
function tick(vol = 0.5) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.04);
    g.gain.setValueAtTime(0.25 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.06);
  } catch {}
}

window.AucWheel = { PALETTES, colorOf, segs, draw, pick, target, at, spin, tick };
})();
