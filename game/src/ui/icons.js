// Little vector glyphs for each mutation, drawn inside a rarity-coloured badge on cards and the HUD.

import { RARITY, MUTATION_BY_ID } from '../game/upgrades.js';
import { withAlpha } from '../render/glow.js';

export function drawMutationIcon(ctx, id, x, y, size, alpha = 1) {
  const m = MUTATION_BY_ID[id];
  const col = RARITY[m.rarity].color;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(0, -size * 0.3, size * 0.1, 0, 0, size);
  g.addColorStop(0, withAlpha(col, 0.45));
  g.addColorStop(1, 'rgba(4, 16, 32, 0.9)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size * 0.5;
  (GLYPH[m.icon] ?? GLYPH.dense)(ctx, s, col);
  ctx.restore();
}

const dot = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const line = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); };

const GLYPH = {
  split(ctx, s) { line(ctx, [[-s, s * 0.6], [0, -s * 0.2], [s, s * 0.6]]); line(ctx, [[0, s * 0.8], [0, -s]]); },
  needle(ctx, s) { line(ctx, [[-s, s], [s, -s]]); line(ctx, [[s * 0.4, -s], [s, -s], [s, -s * 0.4]]); },
  quick(ctx, s) { line(ctx, [[s * 0.2, -s], [-s * 0.5, s * 0.1], [s * 0.4, s * 0.1], [-s * 0.2, s]]); },
  dense(ctx, s) { dot(ctx, 0, 0, s * 0.55); ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2); ctx.stroke(); },
  current(ctx, s) { for (const y of [-0.5, 0.1, 0.7]) line(ctx, [[-s, y * s], [-s * 0.3, (y - 0.25) * s], [s * 0.3, (y + 0.1) * s], [s, (y - 0.15) * s]]); },
  bell(ctx, s) { ctx.beginPath(); ctx.arc(0, s * 0.1, s * 0.8, Math.PI, 0); ctx.closePath(); ctx.fill(); line(ctx, [[-s * 0.4, s * 0.3], [-s * 0.5, s]]); line(ctx, [[s * 0.4, s * 0.3], [s * 0.5, s]]); },
  lure(ctx, s) { line(ctx, [[-s * 0.8, s], [-s * 0.6, -s * 0.2], [s * 0.2, -s * 0.8]]); dot(ctx, s * 0.45, -s * 0.55, s * 0.35); },
  ricochet(ctx, s) { line(ctx, [[-s, -s * 0.6], [0, s * 0.7], [s, -s * 0.6]]); line(ctx, [[-s, s], [s, s]]); },
  pearls(ctx, s) { ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 3; i++) dot(ctx, Math.cos(i * 2.09) * s * 0.8, Math.sin(i * 2.09) * s * 0.8, s * 0.25); },
  static(ctx, s) { line(ctx, [[-s, -s * 0.2], [-s * 0.3, s * 0.3], [0, -s * 0.4], [s * 0.4, s * 0.4], [s, -s * 0.1]]); },
  ink(ctx, s) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s, s * 0.3, 0, s); ctx.quadraticCurveTo(-s, s * 0.3, 0, -s); ctx.fill(); },
  regrow(ctx, s) { line(ctx, [[0, s], [0, -s * 0.3]]); ctx.beginPath(); ctx.ellipse(-s * 0.4, -s * 0.4, s * 0.45, s * 0.22, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.4, -s * 0.6, s * 0.45, s * 0.22, 0.6, 0, Math.PI * 2); ctx.fill(); },
  keen(ctx, s) { ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); dot(ctx, 0, 0, s * 0.3); },
  seeker(ctx, s) { ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.stroke(); line(ctx, [[-s, 0], [-s * 0.4, 0]]); line(ctx, [[s, 0], [s * 0.4, 0]]); line(ctx, [[0, -s], [0, -s * 0.4]]); line(ctx, [[0, s], [0, s * 0.4]]); },
  bloom(ctx, s) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.4, s * 0.2, a, 0, Math.PI * 2); ctx.fill(); } },
  ward(ctx, s) { ctx.beginPath(); ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2); ctx.fill(); },
  deep(ctx, s) { for (const r of [0.3, 0.65, 1]) { ctx.beginPath(); ctx.arc(0, 0, s * r, 0, Math.PI * 2); ctx.stroke(); } },
  venom(ctx, s) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, s * 0.2, 0, s * 0.8); ctx.quadraticCurveTo(-s * 0.9, s * 0.2, 0, -s); ctx.stroke(); dot(ctx, 0, s * 0.25, s * 0.22); },
  wake(ctx, s) { line(ctx, [[-s, s * 0.6], [-s * 0.2, s * 0.6]]); line(ctx, [[-s * 0.1, -s], [-s * 0.5, 0], [s * 0.2, 0], [-s * 0.2, s]]); ctx.beginPath(); ctx.arc(s * 0.4, 0, s * 0.5, -1.2, 1.2); ctx.stroke(); },
  lens(ctx, s) { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.45, s * 0.95, 0, 0, Math.PI * 2); ctx.stroke(); dot(ctx, 0, 0, s * 0.2); line(ctx, [[-s, 0], [-s * 0.6, 0]]); line(ctx, [[s * 0.6, 0], [s, 0]]); },
  reflex(ctx, s) { ctx.beginPath(); ctx.moveTo(-s, s * 0.4); ctx.quadraticCurveTo(0, -s * 1.2, s, s * 0.4); ctx.stroke(); line(ctx, [[s * 0.55, s * 0.05], [s, s * 0.4], [s * 0.5, s * 0.6]]); dot(ctx, 0, s * 0.55, s * 0.2); },
  resonance(ctx, s) { dot(ctx, 0, 0, s * 0.25); for (const r of [0.55, 0.9]) { ctx.beginPath(); ctx.arc(0, 0, s * r, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * r, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke(); } },
  nova(ctx, s) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(ctx, [[Math.cos(a) * s * 0.35, Math.sin(a) * s * 0.35], [Math.cos(a) * s, Math.sin(a) * s]]); } dot(ctx, 0, 0, s * 0.25); },
};
