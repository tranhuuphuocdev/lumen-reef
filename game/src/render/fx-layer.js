// Drawing of the simulation's feedback effects: particles and bubbles, shock rings, chain-lightning
// arcs and floating combat text.

import { drawGlow, withAlpha } from './glow.js';

export function drawParticles(ctx, run) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of run.fx.particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.bubble) continue;
    drawGlow(ctx, p.x, p.y, p.size * 3.2, p.color, a * 0.9);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(210, 250, 255, 0.6)';
  ctx.lineWidth = 1;
  for (const p of run.fx.particles) {
    if (!p.bubble) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawRings(ctx, run) {
  for (const r of run.fx.rings) {
    const k = 1 - r.life / r.max;
    ctx.strokeStyle = withAlpha(r.color, (1 - k) * 0.9);
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * (0.2 + 0.8 * Math.sqrt(k)), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const b of run.fx.bolts) {
    ctx.strokeStyle = withAlpha(b.color, b.life / b.max);
    ctx.lineWidth = 3;
    ctx.beginPath();
    b.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = withAlpha(b.color, 0.2 * b.life / b.max);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawTexts(ctx, run) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of run.fx.texts) {
    const k = t.life / t.max;
    const pop = k > 0.8 ? 1 + (k - 0.8) * 2 : 1;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = `800 ${Math.round(t.size * pop)}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(2, 10, 24, 0.85)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
