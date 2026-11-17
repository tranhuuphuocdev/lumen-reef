// Drawing of everything small that moves: Pip's bolts and their trails, enemy spores, glim and
// heart pickups, orbiting pearls, ink pools and Queen Nacre's pearl mines.

import { drawGlow, withAlpha } from './glow.js';
import { orbitPositions } from '../game/weapons.js';

export function drawInks(ctx, run) {
  for (const k of run.inks) {
    const a = Math.min(1, k.life / k.max * 2);
    ctx.fillStyle = `rgba(40, 10, 70, ${0.45 * a})`;
    ctx.beginPath();
    ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, k.x, k.y, k.r * 1.3, '#b78cff', 0.25 * a);
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function drawHazards(ctx, run, t) {
  for (const h of run.hazards) {
    const prog = Math.min(1, h.t / h.delay);
    if (h.t < h.delay) {
      ctx.strokeStyle = withAlpha(h.color, 0.35 + prog * 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = withAlpha(h.color, 0.12 + prog * 0.18);
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * prog, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 6 + Math.sin(t * 20) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, h.x, h.y, h.r * 1.6, h.color, 0.9);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

export function drawPickups(ctx, run, t) {
  ctx.globalCompositeOperation = 'lighter';
  for (const g of run.pickups) {
    if (g.kind === 'glim') {
      const tw = 0.7 + 0.3 * Math.sin(t * 8 + g.phase);
      drawGlow(ctx, g.x, g.y, g.r * 3.4, '#ffe27a', 0.55 * tw);
    } else {
      drawGlow(ctx, g.x, g.y, 34, '#ff6f9c', 0.6);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const g of run.pickups) {
    if (g.kind === 'glim') {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(t * 3 + g.phase);
      ctx.fillStyle = g.value > 1 ? '#fff3b0' : '#ffe27a';
      const r = g.r;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const bob = Math.sin(t * 4) * 3;
      drawHeart(ctx, g.x, g.y + bob, 10, '#ff6f9c');
    }
  }
}

export function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.8, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9);
  ctx.fill();
}

export function drawBolts(ctx, run) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of run.bullets) {
    const tr = b.trail;
    if (tr.length >= 4) {
      ctx.strokeStyle = 'rgba(127, 246, 255, 0.35)';
      ctx.lineWidth = b.r * 1.6;
      ctx.beginPath();
      ctx.moveTo(tr[0], tr[1]);
      for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    drawGlow(ctx, b.x, b.y, b.r * 4.5, '#7ff6ff', 0.8);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  for (const b of run.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  // Orbiting pearls.
  if (run.player.stats.orbit > 0 && !run.player.dead) {
    for (const o of orbitPositions(run)) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, o.x, o.y, 28, '#ffe3a3', 0.7);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(o.x - 3, o.y - 3, 1, o.x, o.y, o.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#e7c99a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawEnemyShots(ctx, run) {
  ctx.globalCompositeOperation = 'lighter';
  for (const s of run.enemyShots) drawGlow(ctx, s.x, s.y, s.r * 3.2, s.color, 0.75);
  ctx.globalCompositeOperation = 'source-over';
  for (const s of run.enemyShots) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
