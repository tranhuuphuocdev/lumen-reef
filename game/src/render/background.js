// The reef itself: a seabed painted once into an offscreen canvas (sand, rock rims, coral fans,
// sea-grass and glowing polyps), far parallax ridges, swaying light shafts from the surface,
// animated caustics, drifting marine snow and a vignette.

import { WORLD, VIEW } from '../config.js';
import { createRng } from '../core/rng.js';
import { drawGlow, withAlpha } from './glow.js';

let floor = null;
let caustic = null;
let ridges = null;
let polyps = [];
let snow = [];

export function buildReef(seed = 7) {
  const rng = createRng(seed);
  floor = document.createElement('canvas');
  floor.width = WORLD.w;
  floor.height = WORLD.h;
  const g = floor.getContext('2d');

  const base = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, 200, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.7);
  base.addColorStop(0, '#0f4a63');
  base.addColorStop(0.55, '#0a3149');
  base.addColorStop(1, '#061a2e');
  g.fillStyle = base;
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // Sand ripples.
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = rng.range(0, WORLD.w), y = rng.range(0, WORLD.h);
    const len = rng.range(30, 110);
    g.strokeStyle = `rgba(140, 220, 235, ${rng.range(0.025, 0.07)})`;
    g.lineWidth = rng.range(1, 3);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + len / 2, y + rng.range(-8, 8), x + len, y + rng.range(-4, 4));
    g.stroke();
  }
  // Pebbles and soft patches.
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, WORLD.w), y = rng.range(0, WORLD.h);
    g.fillStyle = `rgba(${rng.int(4, 20)}, ${rng.int(30, 60)}, ${rng.int(60, 90)}, ${rng.range(0.25, 0.6)})`;
    g.beginPath();
    g.ellipse(x, y, rng.range(4, 26), rng.range(3, 14), rng.angle(), 0, Math.PI * 2);
    g.fill();
  }

  // Coral fans and sea-grass scattered in clumps, avoiding the very centre where fights start.
  const coralColors = ['#ff6f9c', '#ff9a6b', '#b78cff', '#4dffc3', '#7ff6ff', '#ffd166'];
  for (let i = 0; i < 70; i++) {
    const x = rng.range(120, WORLD.w - 120), y = rng.range(120, WORLD.h - 120);
    if (Math.hypot(x - WORLD.w / 2, y - WORLD.h / 2) < 220) continue;
    const col = rng.pick(coralColors);
    if (rng.chance(0.5)) drawFan(g, rng, x, y, col);
    else drawGrass(g, rng, x, y, col);
    if (rng.chance(0.6)) polyps.push({ x: x + rng.range(-20, 20), y: y + rng.range(-20, 20), r: rng.range(18, 40), color: col, phase: rng.angle() });
  }
  // Rock rim around the arena.
  drawRim(g, rng);

  caustic = buildCaustic(rng);
  ridges = buildRidges(rng);
  snow = Array.from({ length: 90 }, () => ({ x: rng.range(0, VIEW.w), y: rng.range(0, VIEW.h), z: rng.range(0.3, 1), s: rng.range(0.6, 2.2), p: rng.angle() }));
}

function drawFan(g, rng, x, y, col) {
  const n = rng.int(5, 9);
  const h = rng.range(26, 60);
  g.save();
  g.translate(x, y);
  g.rotate(rng.range(-0.6, 0.6));
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.22;
    g.strokeStyle = withAlpha(col, 0.35);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    const ex = Math.cos(a) * h, ey = Math.sin(a) * h;
    g.quadraticCurveTo(ex * 0.4 + rng.range(-6, 6), ey * 0.5, ex, ey);
    g.stroke();
    g.fillStyle = withAlpha(col, 0.55);
    g.beginPath();
    g.arc(ex, ey, 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawGrass(g, rng, x, y, col) {
  const n = rng.int(4, 8);
  for (let i = 0; i < n; i++) {
    const bx = x + rng.range(-18, 18);
    const h = rng.range(20, 50);
    g.strokeStyle = withAlpha(col, rng.range(0.18, 0.32));
    g.lineWidth = rng.range(2, 4);
    g.beginPath();
    g.moveTo(bx, y);
    g.bezierCurveTo(bx + rng.range(-12, 12), y - h * 0.4, bx + rng.range(-16, 16), y - h * 0.7, bx + rng.range(-10, 10), y - h);
    g.stroke();
  }
}

function drawRim(g, rng) {
  const W = WORLD.wall;
  const rockAt = (x, y, s) => {
    const grad = g.createRadialGradient(x - s * 0.3, y - s * 0.3, s * 0.1, x, y, s);
    grad.addColorStop(0, '#1d4f66');
    grad.addColorStop(1, '#03101d');
    g.fillStyle = grad;
    g.beginPath();
    const k = 9;
    for (let i = 0; i <= k; i++) {
      const a = (i / k) * Math.PI * 2;
      const rr = s * rng.range(0.75, 1.1);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.fill();
  };
  g.fillStyle = '#020a14';
  g.fillRect(0, 0, WORLD.w, W * 0.6);
  g.fillRect(0, WORLD.h - W * 0.6, WORLD.w, W * 0.6);
  g.fillRect(0, 0, W * 0.6, WORLD.h);
  g.fillRect(WORLD.w - W * 0.6, 0, W * 0.6, WORLD.h);
  for (let x = 0; x < WORLD.w; x += 46) { rockAt(x + rng.range(-10, 10), W * 0.5, rng.range(34, 60)); rockAt(x + rng.range(-10, 10), WORLD.h - W * 0.5, rng.range(34, 60)); }
  for (let y = 0; y < WORLD.h; y += 46) { rockAt(W * 0.5, y + rng.range(-10, 10), rng.range(34, 60)); rockAt(WORLD.w - W * 0.5, y + rng.range(-10, 10), rng.range(34, 60)); }
  // Glowing barnacles on the rim.
  for (let i = 0; i < 120; i++) {
    const side = rng.int(0, 3);
    const t = rng.next();
    const x = side < 2 ? t * WORLD.w : side === 2 ? W * rng.range(0.6, 1.1) : WORLD.w - W * rng.range(0.6, 1.1);
    const y = side >= 2 ? t * WORLD.h : side === 0 ? W * rng.range(0.6, 1.1) : WORLD.h - W * rng.range(0.6, 1.1);
    polyps.push({ x, y, r: rng.range(10, 22), color: rng.pick(['#7ff6ff', '#4dffc3', '#b78cff']), phase: rng.angle() });
  }
}

function buildCaustic(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(190, 250, 255, 0.11)';
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rng.range(0, 512), y = rng.range(0, 512);
    g.lineWidth = rng.range(2, 6);
    g.beginPath();
    const r = rng.range(20, 60);
    g.ellipse(x, y, r, r * rng.range(0.5, 0.9), rng.angle(), 0, Math.PI * rng.range(0.8, 1.6));
    g.stroke();
    // wrap copies so the tile repeats seamlessly
    for (const [ox, oy] of [[512, 0], [-512, 0], [0, 512], [0, -512]]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, r, r * 0.7, 0, 0, Math.PI * 1.2);
      g.stroke();
    }
  }
  return c;
}

function buildRidges(rng) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 260;
  const g = c.getContext('2d');
  const layer = (yBase, amp, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 260);
    for (let x = 0; x <= 2048; x += 16) {
      const y = yBase - Math.abs(Math.sin(x * 0.004 + yBase)) * amp - Math.sin(x * 0.017) * amp * 0.25 - rng.range(0, 6);
      g.lineTo(x, y);
    }
    g.lineTo(2048, 260);
    g.fill();
  };
  layer(150, 90, 'rgba(8, 40, 64, 0.65)');
  layer(200, 70, 'rgba(5, 26, 44, 0.85)');
  return c;
}

export function drawBackdrop(ctx, cam, t) {
  // Screen-space water column: brighter toward the surface.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  sky.addColorStop(0, '#0c4864');
  sky.addColorStop(1, '#03101f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

export function drawFloor(ctx, cam, t) {
  const ox = cam.x - VIEW.w / 2, oy = cam.y - VIEW.h / 2;
  ctx.drawImage(floor, ox, oy, VIEW.w, VIEW.h, 0, 0, VIEW.w, VIEW.h);
  // Animated caustics, two layers drifting against each other.
  ctx.globalCompositeOperation = 'lighter';
  for (const [k, sp, a] of [[1, 18, 0.45], [1.6, -11, 0.3]]) {
    ctx.globalAlpha = a;
    const size = 512 * k;
    const sx = ((-(ox * 1) + t * sp) % size + size) % size - size;
    const sy = ((-(oy * 1) + t * sp * 0.6) % size + size) % size - size;
    for (let x = sx; x < VIEW.w; x += size) for (let y = sy; y < VIEW.h; y += size) ctx.drawImage(caustic, x, y, size, size);
  }
  ctx.globalAlpha = 1;
  // Breathing polyps.
  for (const p of polyps) {
    const sx = p.x - ox, sy = p.y - oy;
    if (sx < -60 || sy < -60 || sx > VIEW.w + 60 || sy > VIEW.h + 60) continue;
    const b = 0.5 + 0.5 * Math.sin(t * 1.7 + p.phase);
    drawGlow(ctx, sx, sy, p.r * (0.8 + b * 0.4), p.color, 0.25 + b * 0.25);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawLightShafts(ctx, cam, t) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const base = ((i * 260 - cam.x * 0.15) % 1600 + 1600) % 1600 - 160;
    const sway = Math.sin(t * 0.3 + i * 1.7) * 40;
    const w = 70 + (i % 3) * 40;
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    grad.addColorStop(0, 'rgba(160, 240, 255, 0.10)');
    grad.addColorStop(1, 'rgba(160, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(base + sway, 0);
    ctx.lineTo(base + sway + w, 0);
    ctx.lineTo(base + sway + w + 260, VIEW.h);
    ctx.lineTo(base + sway + 180, VIEW.h);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawSnow(ctx, cam, t) {
  ctx.fillStyle = 'rgba(210, 245, 255, 0.5)';
  for (const s of snow) {
    const x = ((s.x - cam.x * s.z * 0.4 + Math.sin(t * 0.5 + s.p) * 12) % VIEW.w + VIEW.w) % VIEW.w;
    const y = ((s.y - cam.y * s.z * 0.4 + t * 10 * s.z) % VIEW.h + VIEW.h) % VIEW.h;
    ctx.globalAlpha = 0.25 + s.z * 0.45;
    ctx.fillRect(x, y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

export function drawRidges(ctx, cam) {
  const x = -((cam.x * 0.2) % 2048);
  ctx.drawImage(ridges, x, VIEW.h - 260);
  ctx.drawImage(ridges, x + 2048, VIEW.h - 260);
}

export function drawVignette(ctx) {
  const v = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.35, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.95);
  v.addColorStop(0, 'rgba(0, 6, 16, 0)');
  v.addColorStop(1, 'rgba(0, 6, 16, 0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}
