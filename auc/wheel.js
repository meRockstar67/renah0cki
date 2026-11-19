/* Колесо фортуны аукциона: общий код для страницы и оверлея OBS.
   Размер сектора = доля баллов лота. Победитель выбирается заранее (crypto), колесо докручивается до него. */
(() => {
'use strict';
const TAU = Math.PI * 2;
const COLORS = ['#6cc4ff', '#5fd3a0', '#ffc06b', '#ff8fa3', '#b79bff', '#7fe0e0', '#ffd166', '#8ab4ff', '#f4a6ff', '#9be27a', '#ff9b52', '#3b9eff'];
const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

function segs(lots) {
  const L = lots.filter(l => +l.total > 0).slice().sort((a, b) => a.num - b.num);
  const sum = L.reduce((s, l) => s + +l.total, 0);
  let a = 0;
  return L.map((l, i) => { const w = +l.total / sum * TAU; const s = { id: l.id, num: l.num, name: l.name, total: +l.total, start: a, end: a + w, color: COLORS[i % COLORS.length] }; a += w; return s; });
}
function draw(cv, S, rot, hiId) {
  const size = cv.clientWidth || cv.width; if (!size) return;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = size / 2; ctx.clearRect(0, 0, size, size);
  if (!S.length) {
    ctx.beginPath(); ctx.arc(r, r, r - 6, 0, TAU); ctx.fillStyle = '#17233a'; ctx.fill();
    ctx.fillStyle = '#8ea3c2'; ctx.font = `600 ${Math.max(13, r / 14)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('Нет лотов с баллами', r, r + 5); return;
  }
  ctx.save(); ctx.translate(r, r); ctx.rotate(rot);
  const fs = Math.max(11, Math.min(18, r / 15));
  for (const s of S) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r - 6, s.start, s.end); ctx.closePath();
    ctx.globalAlpha = hiId != null && hiId !== s.id ? 0.3 : 1;
    ctx.fillStyle = s.color; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.stroke();
    if (s.end - s.start > 0.07) {
      ctx.save(); ctx.rotate((s.start + s.end) / 2);
      ctx.fillStyle = '#06121f'; ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      let t = s.name; const maxW = r * 0.6;
      if (ctx.measureText(t).width > maxW) { while (t.length > 2 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
      ctx.fillText(t, r - 20, 0); ctx.restore();
    }
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(r, r, Math.max(14, r * 0.11), 0, TAU); ctx.fillStyle = '#0b1220'; ctx.fill(); ctx.strokeStyle = '#6cc4ff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r - 15, 1); ctx.lineTo(r + 15, 1); ctx.lineTo(r, 32); ctx.closePath();
  ctx.fillStyle = '#eaf2ff'; ctx.fill(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.stroke();
}
function pick(S) { let x = rnd() * S.reduce((t, s) => t + s.total, 0); for (const s of S) if ((x -= s.total) < 0) return s; return S[S.length - 1]; }
// угол поворота, при котором указатель (сверху) смотрит в случайную точку сектора s
function target(s, from, turns) {
  const t = s.start + (s.end - s.start) * (0.12 + 0.76 * rnd());
  let R = ((-Math.PI / 2 - t) % TAU + TAU) % TAU;
  const base = from - (from % TAU);
  R += base + turns * TAU;
  while (R < from + 2 * TAU) R += TAU;
  return R;
}
function at(S, rot) { const t = ((-Math.PI / 2 - rot) % TAU + TAU) % TAU; return S.find(s => t >= s.start && t < s.end) || null; }
const ease = x => 1 - Math.pow(1 - x, 4);
// анимация; startAt — локальное время старта (мс)
function spin(cv, S, from, to, ms, startAt, onTick, done) {
  let stop = false;
  const f = () => {
    if (stop) return;
    const p = Math.min(1, Math.max(0, (Date.now() - startAt) / ms));
    const rot = from + (to - from) * ease(p);
    draw(cv, S, rot); if (onTick) onTick(at(S, rot), p, rot);
    if (p < 1) requestAnimationFrame(f); else if (done) done(rot);
  };
  f();
  return () => { stop = true; };
}
window.AucWheel = { segs, draw, pick, target, at, spin };
})();
