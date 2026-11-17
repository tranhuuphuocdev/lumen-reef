// Relic glyphs: each relic is drawn from one of a few shapes (orb, star, scale, spiral, hook,
// bubble, leaf, drop, lantern, heart, fang) in its own colour, inside a glowing medallion.

import { RELICS } from '../game/relics.js';
import { withAlpha } from '../render/glow.js';

export function drawRelicIcon(ctx, id, x, y, r) {
  const rel = RELICS[id];
  if (!rel) return;
  const c = rel.color;
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, withAlpha(c, 0.35));
  g.addColorStop(1, 'rgba(3, 14, 30, 0.95)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rel.tier === 'boss' ? '#ff6f9c' : withAlpha(c, 0.9);
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.stroke();
  if (rel.tier === 'boss') { ctx.strokeStyle = withAlpha('#ffd166', 0.8); ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.stroke(); }
  ctx.shadowColor = c;
  ctx.shadowBlur = r * 0.5;
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const k = r * 0.5;
  SHAPES[rel.shape]?.(ctx, k, c);
  ctx.restore();
}

const SHAPES = {
  orb(ctx, k, c) {
    const g = ctx.createRadialGradient(-k * 0.35, -k * 0.35, k * 0.1, 0, 0, k);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, k * 0.85, 0, Math.PI * 2); ctx.fill();
  },
  star(ctx, k) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? k * 0.45 : k;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  },
  scale(ctx, k) {
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -k * 0.6 + i * k * 0.55, k * 0.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  },
  spiral(ctx, k) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i * 0.42, rr = (i / 40) * k; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.stroke();
  },
  hook(ctx, k) {
    ctx.beginPath(); ctx.moveTo(0, -k); ctx.lineTo(0, k * 0.3); ctx.arc(-k * 0.4, k * 0.3, k * 0.4, 0, Math.PI * 0.95); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -k, k * 0.18, 0, Math.PI * 2); ctx.stroke();
  },
  bubble(ctx, k) {
    ctx.beginPath(); ctx.arc(0, 0, k * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-k * 0.3, -k * 0.3, k * 0.22, Math.PI, Math.PI * 1.6); ctx.stroke();
  },
  leaf(ctx, k) {
    ctx.beginPath(); ctx.moveTo(0, k); ctx.quadraticCurveTo(k * 0.9, 0, 0, -k); ctx.quadraticCurveTo(-k * 0.9, 0, 0, k); ctx.fill();
  },
  drop(ctx, k) {
    ctx.beginPath(); ctx.moveTo(0, -k); ctx.quadraticCurveTo(k * 0.85, k * 0.2, 0, k * 0.85); ctx.quadraticCurveTo(-k * 0.85, k * 0.2, 0, -k); ctx.fill();
  },
  lantern(ctx, k) {
    ctx.beginPath(); ctx.moveTo(-k * 0.6, k * 0.9); ctx.quadraticCurveTo(-k * 0.2, -k * 0.6, k * 0.4, -k * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(k * 0.45, -k * 0.35, k * 0.38, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  },
  heart(ctx, k) {
    ctx.beginPath(); ctx.moveTo(0, k * 0.85);
    ctx.bezierCurveTo(-k * 1.2, 0, -k * 0.6, -k, 0, -k * 0.35);
    ctx.bezierCurveTo(k * 0.6, -k, k * 1.2, 0, 0, k * 0.85); ctx.fill();
  },
  fang(ctx, k) {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * k * 0.75, -k * 0.6); ctx.lineTo(s * k * 0.15, -k * 0.6); ctx.lineTo(s * k * 0.45, k * 0.9); ctx.closePath(); ctx.fill(); }
  },
};
