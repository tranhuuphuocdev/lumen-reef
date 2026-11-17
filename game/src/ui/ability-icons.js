// Pictures for the ability bar, so each slot shows what its key does: FIRE as glow bolts
// streaking out, DASH as Pip darting with speed lines, PULSE as sonar rings spreading from Pip.
// Each is drawn live, in its slot's colour, brighter when the ability is ready.

import { drawGlow } from '../render/glow.js';

export function drawAbilityIcon(ctx, kind, x, y, size, col, ready, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = ready ? 1 : 0.55;
  const k = size / 2;
  if (kind === 'fire') {
    jelly(ctx, -k * 0.6, 0, k * 0.36);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * 0.28;
      const d = k * (0.15 + ((t * 2.2 + i * 0.33) % 1) * 0.85);
      const bx = Math.cos(a) * d, by = Math.sin(a) * d;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx - Math.cos(a) * k * 0.3, by - Math.sin(a) * k * 0.3); ctx.lineTo(bx, by); ctx.stroke();
      drawGlow(ctx, bx, by, 7, col, 0.9);
    }
  } else if (kind === 'dash') {
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = 2.5 - i * 0.5;
      ctx.globalAlpha = (ready ? 0.9 : 0.45) * (1 - i * 0.25);
      const yy = (i - 1) * k * 0.32;
      ctx.beginPath(); ctx.moveTo(-k * 0.95, yy); ctx.lineTo(-k * (0.25 + i * 0.05), yy); ctx.stroke();
    }
    ctx.globalAlpha = ready ? 1 : 0.55;
    ctx.rotate(Math.PI / 2);
    jelly(ctx, 0, -k * 0.3, k * 0.4);
  } else {
    jelly(ctx, -k * 0.45, 0, k * 0.3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = col;
    for (let i = 0; i < 3; i++) {
      const ph = ready ? (t * 0.9 + i / 3) % 1 : (i + 1) / 4;
      ctx.globalAlpha = (ready ? 1 - ph : 0.4) * 0.95;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-k * 0.45, 0, k * (0.4 + ph * 1.0), -0.9, 0.9); ctx.stroke();
    }
  }
  ctx.restore();
}

// A small lantern-jelly: bell and three tentacles, glowing.
function jelly(ctx, x, y, r) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, x, y, r * 2.6, '#7ff6ff', 0.6);
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#3ad8f0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.quadraticCurveTo(x, y + r * 0.5, x - r, y);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 250, 255, 0.85)';
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.45, y + r * 0.25);
    ctx.quadraticCurveTo(x + i * r * 0.6, y + r * 0.9, x + i * r * 0.5, y + r * 1.5);
    ctx.stroke();
  }
}
