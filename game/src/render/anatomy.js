// Drawing primitives for living things: tapered bodies built around a spine with a lateral swim
// wave, shaded with rim light and a specular highlight; eyes with iris, glint and blinking lids;
// rayed fins; tapered tentacles; and soft contact shadows cast on the seabed.

import { withAlpha, mix } from './glow.js';

// Offset each spine point sideways by a travelling sine wave (the swim undulation).
export function undulate(pts, t, amp, freq, wavelength, headStill = 0.15) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const k = i / (n - 1);
    const w = Math.sin(t * freq - k * wavelength) * amp * Math.max(0, k - headStill) / (1 - headStill);
    out.push({ x: pts[i].x - Math.sin(ang) * w, y: pts[i].y + Math.cos(ang) * w, ang });
  }
  return out;
}

// Outline of a body of varying width along a spine, as one smooth closed path.
export function bodyPath(ctx, pts, width) {
  const n = pts.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const w = width(i / (n - 1));
    left.push({ x: pts[i].x + Math.sin(ang) * w, y: pts[i].y - Math.cos(ang) * w });
    right.push({ x: pts[i].x - Math.sin(ang) * w, y: pts[i].y + Math.cos(ang) * w });
  }
  ctx.beginPath();
  // Round nose in front of the first point.
  const h = pts[0], h1 = pts[1];
  const hang = Math.atan2(h.y - h1.y, h.x - h1.x);
  const w0 = width(0);
  ctx.moveTo(right[0].x, right[0].y);
  ctx.quadraticCurveTo(h.x + Math.cos(hang) * w0 * 1.3 - Math.sin(hang) * w0, h.y + Math.sin(hang) * w0 * 1.3 + Math.cos(hang) * w0, h.x + Math.cos(hang) * w0 * 1.25, h.y + Math.sin(hang) * w0 * 1.25);
  ctx.quadraticCurveTo(h.x + Math.cos(hang) * w0 * 1.3 + Math.sin(hang) * w0, h.y + Math.sin(hang) * w0 * 1.3 - Math.cos(hang) * w0, left[0].x, left[0].y);
  smoothThrough(ctx, left);
  ctx.lineTo(right[n - 1].x, right[n - 1].y);
  smoothThrough(ctx, right.slice().reverse());
  ctx.closePath();
  return { left, right };
}

function smoothThrough(ctx, p) {
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
    ctx.quadraticCurveTo(p[i].x, p[i].y, mx, my);
  }
  const l = p[p.length - 1];
  ctx.lineTo(l.x, l.y);
}

// Volume shading: a dark belly-to-light back gradient across the body, then a specular streak.
export function shadeBody(ctx, cx, cy, r, ang, base, { light = '#ffffff', dark = null, alpha = 1 } = {}) {
  const lx = cx + Math.cos(ang - Math.PI / 2) * r, ly = cy + Math.sin(ang - Math.PI / 2) * r;
  const dx = cx - Math.cos(ang - Math.PI / 2) * r, dy = cy - Math.sin(ang - Math.PI / 2) * r;
  const g = ctx.createLinearGradient(lx, ly, dx, dy);
  g.addColorStop(0, mix(base, light, 0.45));
  g.addColorStop(0.45, base);
  g.addColorStop(1, dark ?? mix(base, '#000814', 0.6));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function rimLight(ctx, color, width = 1.5, alpha = 0.7) {
  ctx.strokeStyle = withAlpha(color, alpha);
  ctx.lineWidth = width;
  ctx.stroke();
}

export function eye(ctx, x, y, r, look, { lid = 0, iris = '#ffd166', pupil = '#05070f', sclera = '#f4fbff', slit = false, glow = null } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 2.5;
  }
  ctx.fillStyle = sclera;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const ix = Math.cos(look) * r * 0.28, iy = Math.sin(look) * r * 0.28;
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(ix, iy, r * 0.66, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pupil;
  ctx.beginPath();
  if (slit) ctx.ellipse(ix, iy, r * 0.16, r * 0.55, look, 0, Math.PI * 2);
  else ctx.arc(ix, iy, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(ix - r * 0.25, iy - r * 0.28, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (lid > 0.02) {
    ctx.fillStyle = 'rgba(20, 30, 50, 0.95)';
    ctx.beginPath();
    ctx.rect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2 * lid);
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// A translucent fin fanned between a root and a tip, with visible rays.
export function fin(ctx, x, y, ang, len, spread, color, { rays = 5, alpha = 0.75 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, alpha * 0.25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -spread * 0.25);
  ctx.quadraticCurveTo(len * 0.6, -spread, len, -spread * 0.6);
  ctx.quadraticCurveTo(len * 1.05, 0, len, spread * 0.6);
  ctx.quadraticCurveTo(len * 0.6, spread, 0, spread * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(mix(color, '#ffffff', 0.5), alpha * 0.6);
  ctx.lineWidth = 1;
  for (let i = 0; i < rays; i++) {
    const k = rays === 1 ? 0 : (i / (rays - 1)) * 2 - 1;
    ctx.beginPath();
    ctx.moveTo(0, k * spread * 0.2);
    ctx.quadraticCurveTo(len * 0.6, k * spread * 0.8, len * 0.98, k * spread * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

// A tentacle along a chain of points, tapering from base width to a fine tip.
export function tentacle(ctx, pts, w0, w1, color, alpha = 0.85) {
  for (let i = 1; i < pts.length; i++) {
    const k = i / (pts.length - 1);
    ctx.strokeStyle = withAlpha(color, alpha * (1 - k * 0.6));
    ctx.lineWidth = w0 + (w1 - w0) * k;
    ctx.beginPath();
    const a = pts[i - 1], b = pts[i];
    const c = pts[Math.min(pts.length - 1, i + 1)];
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    ctx.stroke();
  }
}

let shadowSprite = null;
function getShadow() {
  if (shadowSprite) return shadowSprite;
  shadowSprite = document.createElement('canvas');
  shadowSprite.width = shadowSprite.height = 128;
  const g = shadowSprite.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0, 8, 18, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 8, 18, 0.28)');
  grad.addColorStop(1, 'rgba(0, 8, 18, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return shadowSprite;
}

// Soft shadow on the seabed below a swimmer; `lift` is how high it hovers (larger = fainter, further).
export function castShadow(ctx, x, y, r, lift = 1) {
  const s = getShadow();
  const off = 16 * lift;
  const w = r * (2.4 + lift * 0.4), h = r * (1.5 + lift * 0.2);
  ctx.globalAlpha = Math.max(0.25, 0.95 - lift * 0.18);
  ctx.drawImage(s, x + off * 0.6 - w / 2, y + off - h / 2, w, h);
  ctx.globalAlpha = 1;
}
