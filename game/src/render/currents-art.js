// Drawing of ocean currents and the sonar wave. Streams are bands of drifting light streaks and
// silt that flow in their direction; vortices are rotating spiral arms around a dark eye. The
// sonar wave is a bright expanding front split into cyan, white and magenta like refracted light,
// with a faint lit disc behind it.

import { withAlpha, drawGlow } from './glow.js';

const TAU = Math.PI * 2;

export function drawCurrents(ctx, run, t) {
  for (const c of run.currents) {
    if (c.follow?.dead) continue;
    if (c.kind === 'stream') drawStream(ctx, c, t);
    else drawVortex(ctx, c, t);
  }
}

function drawStream(ctx, c, t) {
  const horiz = c.vx !== 0;
  const dir = Math.sign(c.vx || c.vy);
  const len = horiz ? c.hw * 2 : c.hh * 2;
  const width = horiz ? c.hh * 2 : c.hw * 2;
  ctx.save();
  ctx.translate(c.x, c.y);
  if (!horiz) ctx.rotate(Math.PI / 2);
  if (dir < 0) ctx.scale(-1, 1);
  // Soft band of moving water.
  const g = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
  g.addColorStop(0, 'rgba(120, 230, 255, 0)');
  g.addColorStop(0.5, 'rgba(120, 230, 255, 0.07)');
  g.addColorStop(1, 'rgba(120, 230, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(-len / 2, -width / 2, len, width);
  // Streaks travel along the band; brighter and faster near its centre line.
  ctx.lineCap = 'round';
  const n = Math.round(len / 26);
  for (let i = 0; i < n; i++) {
    const lane = ((i * 0.618) % 1) * 2 - 1;
    const speed = 115 * (1 - Math.abs(lane) * 0.6);
    const x = ((i * 97.3 + t * speed) % len + len) % len - len / 2;
    const y = lane * width * 0.45 + Math.sin(t * 1.3 + i) * 6;
    const a = 0.12 + 0.25 * (1 - Math.abs(lane));
    ctx.strokeStyle = `rgba(190, 248, 255, ${a})`;
    ctx.lineWidth = 1.5 + (1 - Math.abs(lane)) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 26, y);
    ctx.lineTo(x + 26, y);
    ctx.stroke();
  }
  // Chevrons along the centre so the direction reads at a glance.
  ctx.strokeStyle = 'rgba(200, 250, 255, 0.22)';
  ctx.lineWidth = 3;
  for (let x = -len / 2 + ((t * 60) % 180); x < len / 2; x += 180) {
    ctx.beginPath();
    ctx.moveTo(x - 10, -14);
    ctx.lineTo(x + 6, 0);
    ctx.lineTo(x - 10, 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVortex(ctx, c, t) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, c.r);
  g.addColorStop(0, 'rgba(0, 6, 20, 0.45)');
  g.addColorStop(0.5, c.follow ? 'rgba(255, 80, 140, 0.06)' : 'rgba(120, 200, 255, 0.07)');
  g.addColorStop(1, 'rgba(120, 200, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, c.r, 0, TAU);
  ctx.fill();
  const arms = 5;
  const col = c.follow ? '#ff9ac0' : '#a8ecff';
  ctx.lineCap = 'round';
  for (let i = 0; i < arms; i++) {
    const base = (i / arms) * TAU + t * 1.6 * c.spin;
    ctx.strokeStyle = withAlpha(col, 0.28);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const f = k / 24;
      const r = c.r * (1 - f * 0.85);
      const a = base + f * 3.2 * c.spin;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSonar(ctx, run) {
  for (const w of run.sonar) {
    const k = w.r / w.max;
    const fade = 1 - k * 0.7;
    // The lit disc behind the front: the sea briefly illuminated.
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, w.x, w.y, w.r * 1.05, '#3fd8ff', 0.12 * fade);
    // Chromatic front: three offset strokes.
    const parts = [['#ff5fd2', -4, 0.35], ['#5ff0ff', 4, 0.5], ['#ffffff', 0, 0.55]];
    for (const [col, off, a] of parts) {
      ctx.strokeStyle = withAlpha(col, a * fade);
      ctx.lineWidth = 2.5 + (1 - k) * 4;
      ctx.beginPath();
      ctx.arc(w.x, w.y, Math.max(1, w.r + off), 0, TAU);
      ctx.stroke();
    }
    if (w.charged) {
      ctx.strokeStyle = withAlpha('#e0fbff', 0.8 * fade);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU;
        const rr = w.r + ((i * 7919) % 13) - 6;
        const x = w.x + Math.cos(a) * rr, y = w.y + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
