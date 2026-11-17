// The living things of the reef, drawn from anatomy rather than icons. Pip is a translucent
// lantern-jelly whose bell contracts to swim while tentacles trail on physical chains. Foes:
// Spinewhorl urchins bristle with swaying spines, Lash Eels ripple along a jointed spine with a
// fin ribbon and photophores, Blowfins flutter and erect their spines when they swell, Spitbloom
// anemones sway in the current and recoil when they spit, Ironclaw crabs walk on jointed legs and
// snap their claws, Flickers are darting minnows, Broodbells are bells full of young, and Gloom
// Lurkers are shadow rays: unseen but for a ripple and two eyes until a pulse lights them up.

import { drawGlow, withAlpha, mix } from './glow.js';
import { getRig, chain, blink } from './rigs.js';
import { undulate, bodyPath, shadeBody, rimLight, eye, fin, tentacle, castShadow } from './anatomy.js';
import { drawMaw, drawNacre, drawWeakPoint } from './boss-art.js';
import { angleDiff } from '../core/math.js';
import { drawFormsBehind, drawFormsOnBell, bellColors } from './pip-forms.js';

const TAU = Math.PI * 2;
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Smoothly turning heading for a creature, kept on its rig.
function heading(rig, vx, vy, fallback, rate = 8) {
  if (rig.head === undefined) rig.head = fallback;
  if (Math.abs(vx) + Math.abs(vy) > 12) rig.head += angleDiff(rig.head, Math.atan2(vy, vx)) * Math.min(1, rig.dt * rate + 0.02);
  return rig.head;
}

export function drawShadows(ctx, run) {
  for (const e of run.enemies) if (!e.veiled) castShadow(ctx, e.x, e.y, e.r * (e.boss ? 1.2 : 1), e.boss ? 2.2 : e.kind === 'spitbloom' ? 0.3 : 1);
  const p = run.player;
  if (!p.dead) castShadow(ctx, p.x, p.y, 16, 1.6);
}

// ---------------------------------------------------------------------------------------------
// Pip
// ---------------------------------------------------------------------------------------------
export function drawPip(ctx, p, t, aim) {
  const rig = getRig('pip', t);
  const speed = Math.hypot(p.vx, p.vy);
  const head = heading(rig, p.vx, p.vy, -Math.PI / 2, 6);
  rig.swim = (rig.swim ?? 0) + rig.dt * (3 + speed / 60);
  const c = 0.5 + 0.5 * Math.sin(rig.swim * 2); // bell contraction 0..1
  const R = 17;
  // The bell flares wide while casting a pulse and stretches long in a dash.
  const cast = (p.casting ?? 0) / 0.35;
  const W = R * (0.95 + 0.16 * (1 - c) + cast * 0.35 - (p.dashT > 0 ? 0.18 : 0));
  const L = R * (0.95 + 0.12 * c - cast * 0.15 + (p.dashT > 0 ? 0.3 : 0));
  const blinkOn = p.inv > 0 && !p.dashT && Math.floor(t * 18) % 2 === 0;
  const hurt = p.hurtFlash > 0;
  const tint = hurt ? '#ff9ec0' : '#8ff4ff';
  const ch = Math.cos(head), sh = Math.sin(head);
  const toWorld = (lx, ly) => ({ x: p.x + ch * lx - sh * ly, y: p.y + sh * lx + ch * ly });

  // Dash afterimages: a fading line of ghost bells along the dash.
  rig.ghosts = rig.ghosts ?? [];
  if (p.dashT > 0 && (rig.ghosts.length === 0 || Math.hypot(rig.ghosts[rig.ghosts.length - 1].x - p.x, rig.ghosts[rig.ghosts.length - 1].y - p.y) > 14)) rig.ghosts.push({ x: p.x, y: p.y, a: head, life: 0.3 });
  for (let i = rig.ghosts.length - 1; i >= 0; i--) {
    const g = rig.ghosts[i];
    g.life -= rig.dt;
    if (g.life <= 0) { rig.ghosts.splice(i, 1); continue; }
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.a);
    ctx.globalAlpha = g.life / 0.3 * 0.5;
    ctx.fillStyle = p.surge > 0 ? '#ffe08a' : '#8ff4ff';
    ctx.beginPath();
    ctx.ellipse(R * 0.3, 0, R * 0.75, R * 0.95, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  if (blinkOn) ctx.globalAlpha = 0.45;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, p.x, p.y, 74 + c * 10 + (p.casting ?? 0) * 160, '#5ff0ff', 0.5 + (p.casting ?? 0));
  if (p.surge > 0) drawGlow(ctx, p.x, p.y, 58 + Math.sin(t * 14) * 6, '#ffd166', 0.55);
  ctx.globalCompositeOperation = 'source-over';

  drawFormsBehind(ctx, p, rig, t, head, L, W);
  // Trailing tentacles and frilled oral arms hang on chains behind the bell margin.
  const back = head + Math.PI;
  for (let i = 0; i < 6; i++) {
    const lat = (i / 5 - 0.5) * 2 * W * 0.85;
    const root = toWorld(-L * 0.25, lat);
    const pts = chain(rig, `t${i}`, 10, 5.2, root.x, root.y, back, 0.08);
    const wav = undulate(pts, t + i * 0.7, 3.2, 7, 4, 0);
    tentacle(ctx, wav, 1.6, 0.4, '#bdf9ff', 0.6);
  }
  for (let i = 0; i < 3; i++) {
    const lat = (i - 1) * W * 0.32;
    const root = toWorld(-L * 0.1, lat);
    const pts = chain(rig, `o${i}`, 7, 4.6, root.x, root.y, back, 0.1);
    const wav = undulate(pts, t * 1.3 + i, 4, 5, 5, 0);
    tentacle(ctx, wav, 4, 1.2, '#e2fdff', 0.55);
    for (let k = 1; k < wav.length; k += 2) { ctx.fillStyle = 'rgba(230, 255, 255, 0.5)'; ctx.beginPath(); ctx.arc(wav[k].x, wav[k].y, 1.6, 0, TAU); ctx.fill(); }
  }

  // The bell, in its own frame: +x is forward.
  ctx.translate(p.x, p.y);
  ctx.rotate(head);
  const bell = () => {
    ctx.beginPath();
    ctx.moveTo(-L * 0.25, -W);
    ctx.bezierCurveTo(L * 0.25, -W * 1.12, L * 0.95, -W * 0.72, L * 0.98, 0);
    ctx.bezierCurveTo(L * 0.95, W * 0.72, L * 0.25, W * 1.12, -L * 0.25, W);
    const lobes = 7;
    for (let i = 0; i < lobes; i++) {
      const y0 = W - (i / lobes) * 2 * W, y1 = W - ((i + 1) / lobes) * 2 * W;
      ctx.quadraticCurveTo(-L * 0.25 - 4 - c * 2, (y0 + y1) / 2, -L * 0.25, y1);
    }
    ctx.closePath();
  };
  bell();
  const g = ctx.createRadialGradient(L * 0.45, -W * 0.3, 1, L * 0.2, 0, R * 1.3);
  const bc = bellColors(p, hurt);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  g.addColorStop(0.35, withAlpha(bc.mid, 0.72));
  g.addColorStop(1, withAlpha(bc.edge, 0.5));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(235, 255, 255, 0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Radial canals and the four glowing gonads seen through the bell.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (i / 4 - 0.5) * 2 * W * 0.9;
    ctx.beginPath(); ctx.moveTo(L * 0.3, 0); ctx.quadraticCurveTo(L * 0.1, y * 0.6, -L * 0.22, y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.785;
    drawGlow(ctx, L * 0.3 + Math.cos(a) * 5, Math.sin(a) * 5.5, 7, '#9ffff0', 0.75);
  }
  drawGlow(ctx, L * 0.32, 0, 16 + c * 4, '#ffffff', 0.85);
  ctx.globalCompositeOperation = 'source-over';
  // Specular crescent on the dome.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(L * 0.35, 0, L * 0.5, W * 0.72, 0, -1.25, -0.35);
  ctx.stroke();
  drawFormsOnBell(ctx, p, t, L, W);
  // Two little eyes that follow the aim.
  const look = aim - head;
  const lid = blink(rig, t);
  for (const s of [-1, 1]) eye(ctx, L * 0.52, s * W * 0.36, 3.6, look, { lid, iris: '#1b6f8c', sclera: '#ffffff' });
  ctx.restore();

  if (p.shield > 0) {
    ctx.save();
    const sg = ctx.createRadialGradient(p.x - 8, p.y - 10, 4, p.x, p.y, 30);
    sg.addColorStop(0, 'rgba(255,255,255,0.05)');
    sg.addColorStop(0.85, 'rgba(190,250,255,0.12)');
    sg.addColorStop(1, 'rgba(190,250,255,0.5)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 29 + Math.sin(t * 4) * 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(p.x - 11, p.y - 13, 6, 3, -0.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Foes
// ---------------------------------------------------------------------------------------------
export function drawEnemy(ctx, e, t) {
  const rig = getRig(e.id, t);
  const spawn = e.spawnT > 0 ? 1 - e.spawnT / 0.6 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, spawn);
  ctx.globalCompositeOperation = 'lighter';
  if (!e.boss && !e.veiled) drawGlow(ctx, e.x, e.y, e.r * (e.elite ? 3.6 : 2.5), e.elite ? '#ffd166' : e.color, e.elite ? 0.5 : 0.32);
  ctx.globalCompositeOperation = 'source-over';
  const col = e.hitFlash > 0 ? mix(e.color, '#ffffff', 0.7) : e.color;
  // A hit squashes the body for a moment.
  const squash = 1 + e.hitFlash * 1.6;
  if (squash !== 1 && !e.boss) {
    ctx.translate(e.x, e.y);
    ctx.scale(squash, 1 / squash);
    ctx.translate(-e.x, -e.y);
  }
  DRAW[e.kind](ctx, e, t, col, rig);
  ctx.restore();
  if (e.boss) drawWeakPoint(ctx, e, t);

  if (e.elite) {
    ctx.save();
    ctx.strokeStyle = withAlpha('#ffd166', 0.85);
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 12, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if (e.poison > 0) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, e.x, e.y, e.r * 1.6, '#9dff6a', 0.3);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (!e.boss && e.hp < e.maxHp && e.maxHp > 25) {
    const w = Math.max(28, e.r * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w, 4);
    ctx.fillStyle = e.elite ? '#ffd166' : e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.r - 16, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

function tubeHighlight(ctx, pts, width, color) {
  for (let i = 1; i < pts.length; i++) {
    const k = i / (pts.length - 1);
    const a = pts[i - 1], b = pts[i];
    const w = width(k);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ox = Math.sin(ang) * w * 0.3, oy = -Math.cos(ang) * w * 0.3;
    ctx.strokeStyle = withAlpha(color, 0.35);
    ctx.lineWidth = w * 0.7;
    ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke();
  }
}

const DRAW = {
  // Gloom Lurker: a shadow ray. Veiled, only a heat-haze ripple and its two eyes show (they flare
  // before it strikes); revealed, its dark wings beat, edged in violet, ringed by the light that
  // found it.
  lurker(ctx, e, t, col, rig) {
    const R = e.r;
    const striking = e.state === 'aim' || e.state === 'lunge';
    const head = striking ? e.lunge : heading(rig, e.vx, e.vy, e.face, 6);
    const flap = Math.sin(t * 5 + e.phase);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(head);
    if (e.veiled) {
      ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 3 + e.phase);
      ctx.strokeStyle = '#cbb8ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.05, R * (1.35 + flap * 0.12), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const reveal = Math.min(1, (4 - (e.revealT ?? 0)) * 4);
      ctx.globalAlpha = reveal;
      // Wings.
      const g = ctx.createRadialGradient(R * 0.2, 0, R * 0.2, 0, 0, R * 1.6);
      g.addColorStop(0, mix(col, '#2a1748', 0.3));
      g.addColorStop(1, '#120a24');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(R * 1.1, 0);
      ctx.quadraticCurveTo(R * 0.2, -R * (1.5 + flap * 0.35), -R * 0.7, -R * (1.4 + flap * 0.4));
      ctx.quadraticCurveTo(-R * 0.3, -R * 0.3, -R * 0.9, 0);
      ctx.quadraticCurveTo(-R * 0.3, R * 0.3, -R * 0.7, R * (1.4 + flap * 0.4));
      ctx.quadraticCurveTo(R * 0.2, R * (1.5 + flap * 0.35), R * 1.1, 0);
      ctx.fill();
      ctx.strokeStyle = withAlpha(col, 0.9);
      ctx.lineWidth = 2;
      ctx.stroke();
      // Whip tail.
      ctx.strokeStyle = withAlpha(col, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-R * 0.9, 0);
      ctx.quadraticCurveTo(-R * 1.8, Math.sin(t * 4 + e.phase) * R * 0.5, -R * 2.5, Math.sin(t * 4 + e.phase + 1) * R * 0.3);
      ctx.stroke();
      // The light that found it, fading.
      ctx.globalAlpha = Math.max(0, (e.revealT ?? 0) / 4) * 0.7;
      ctx.strokeStyle = '#7ff6ff';
      ctx.beginPath(); ctx.arc(0, 0, R * 1.8, 0, TAU); ctx.stroke();
    }
    // Eyes: always visible, flaring red before a strike.
    ctx.globalAlpha = 1;
    const ec = striking ? '#ff4d6d' : '#e0d4ff';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, R * 0.55, s * R * 0.32, R * (striking ? 1.1 : e.veiled ? 0.9 : 0.55), ec, striking ? 0.95 : 0.8);
      ctx.restore();
      ctx.fillStyle = ec;
      ctx.beginPath(); ctx.ellipse(R * 0.55, s * R * 0.32, R * 0.2, R * 0.11, s * 0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  whorl(ctx, e, t, col, rig) {
    const R = e.r;
    const rot = e.t * 0.5 + e.phase;
    ctx.save();
    ctx.translate(e.x, e.y);
    // Spines: tapered, each swaying on its own, brightest at the tips.
    const n = 24;
    const dark = mix(col, '#1a0526', 0.55);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU + Math.sin(t * 2.5 + i * 1.7) * 0.06;
      const len = R * (1.25 + hash(i + e.id) * 0.45) + Math.sin(t * 4 + i) * R * 0.05;
      const bw = R * 0.1;
      const ca = Math.cos(a), sa = Math.sin(a);
      ctx.fillStyle = i % 2 ? dark : mix(col, '#1a0526', 0.35);
      ctx.beginPath();
      ctx.moveTo(ca * R * 0.6 - sa * bw, sa * R * 0.6 + ca * bw);
      ctx.lineTo(ca * len, sa * len);
      ctx.lineTo(ca * R * 0.6 + sa * bw, sa * R * 0.6 - ca * bw);
      ctx.fill();
      ctx.fillStyle = withAlpha(mix(col, '#ffffff', 0.5), 0.9);
      ctx.beginPath();
      ctx.arc(ca * len, sa * len, 1.3, 0, TAU);
      ctx.fill();
    }
    // Test (body), lit from the upper left, with rows of tubercles.
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.78, 0, TAU);
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.05, 0, 0, R * 0.8);
    g.addColorStop(0, mix(col, '#ffffff', 0.55));
    g.addColorStop(0.5, col);
    g.addColorStop(1, mix(col, '#12001c', 0.65));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 245, 0.35)';
    for (let i = 0; i < 10; i++) {
      const a = rot * 1.1 + (i / 10) * TAU;
      ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.52, Math.sin(a) * R * 0.52, R * 0.07, 0, TAU); ctx.fill();
    }
    // Glowing eye-spots on the side it moves toward.
    const mv = Math.atan2(e.vy, e.vx);
    for (const s of [-1, 1]) {
      const a = mv + s * 0.42;
      eye(ctx, Math.cos(a) * R * 0.38, Math.sin(a) * R * 0.38, R * 0.17, mv, { lid: blink(rig, t), iris: '#ff2f6d', sclera: '#ffe6f0', glow: '#ff6fb5' });
    }
    ctx.restore();
  },

  flicker(ctx, e, t, col, rig) {
    const R = e.r;
    const head = heading(rig, e.vx, e.vy, e.face, 12);
    const pts = chain(rig, 'b', 5, R * 0.6, e.x + Math.cos(head) * R * 0.6, e.y + Math.sin(head) * R * 0.6, head + Math.PI, 0.2);
    const wav = undulate(pts, t + e.phase, R * 0.35, 20, 3);
    const width = (k) => R * (0.5 * Math.sin(Math.PI * (0.25 + k * 0.75)) + 0.06);
    const tail = wav[wav.length - 1], pre = wav[wav.length - 2];
    const ta = Math.atan2(tail.y - pre.y, tail.x - pre.x);
    fin(ctx, tail.x, tail.y, ta - 0.45, R * 1.0, R * 0.35, col, { rays: 3 });
    fin(ctx, tail.x, tail.y, ta + 0.45, R * 1.0, R * 0.35, col, { rays: 3 });
    bodyPath(ctx, wav, width);
    shadeBody(ctx, wav[1].x, wav[1].y, R, head, col);
    rimLight(ctx, '#e8fbff', 1, 0.6);
    eye(ctx, wav[0].x + Math.cos(head + 1.2) * R * 0.25, wav[0].y + Math.sin(head + 1.2) * R * 0.25, R * 0.22, head, { iris: '#08223a' });
  },

  eel(ctx, e, t, col, rig) {
    const R = e.r;
    const lunging = e.state === 'lunge';
    const aiming = e.state === 'aim';
    const face = aiming || lunging ? e.lunge : heading(rig, e.vx, e.vy, e.face, 7);
    if (aiming || lunging) rig.head = face;
    const n = 13;
    const seg = R * (aiming ? 0.48 : 0.64);
    const pts = chain(rig, 'b', n, seg, e.x + Math.cos(face) * R * 0.5, e.y + Math.sin(face) * R * 0.5, face + Math.PI, aiming ? 0.02 : 0.1);
    const amp = aiming ? R * 0.8 : lunging ? R * 0.18 : R * 0.42;
    const wav = undulate(pts, t + e.phase, amp, aiming ? 5 : lunging ? 18 : 9, aiming ? 7 : 5);
    const width = (k) => R * 0.6 * (k < 0.12 ? 0.82 + k * 1.5 : 1 - (k - 0.12) * 0.95);
    // Fin ribbon along the back, rippling.
    ctx.beginPath();
    for (let i = 2; i < n; i++) {
      const p = wav[i];
      const w = width(i / (n - 1)) + R * (0.35 + 0.12 * Math.sin(t * 12 - i));
      const x = p.x + Math.sin(p.ang) * w, y = p.y - Math.cos(p.ang) * w;
      i === 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let i = n - 1; i >= 2; i--) {
      const p = wav[i];
      const w = width(i / (n - 1)) * 0.6;
      ctx.lineTo(p.x + Math.sin(p.ang) * w, p.y - Math.cos(p.ang) * w);
    }
    ctx.closePath();
    ctx.fillStyle = withAlpha(mix(col, '#ffffff', 0.3), 0.35);
    ctx.fill();
    bodyPath(ctx, wav, width);
    ctx.fillStyle = mix(col, '#03140f', 0.45);
    ctx.fill();
    tubeHighlight(ctx, wav, width, mix(col, '#ffffff', 0.25));
    bodyPath(ctx, wav, width);
    rimLight(ctx, col, 1.2, 0.8);
    // Photophores along the lateral line.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 2; i < n - 1; i += 2) drawGlow(ctx, wav[i].x, wav[i].y, R * 0.45, '#aaffe6', 0.8);
    ctx.globalCompositeOperation = 'source-over';
    // Head: jaw opens as it lines up a lunge.
    const h = wav[0];
    const jaw = aiming ? 0.35 + 0.1 * Math.sin(t * 30) : lunging ? 0.45 : 0.06;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(face);
    ctx.fillStyle = '#04110c';
    ctx.beginPath();
    ctx.moveTo(R * 0.85, 0);
    ctx.lineTo(R * 0.05, -R * jaw);
    ctx.lineTo(R * 0.05, R * jaw);
    ctx.closePath();
    ctx.fill();
    if (jaw > 0.2) {
      ctx.fillStyle = '#eafff6';
      for (let i = 0; i < 3; i++) {
        const x = R * (0.2 + i * 0.2);
        const y = R * jaw * (1 - i / 3.2);
        ctx.beginPath(); ctx.moveTo(x, -y); ctx.lineTo(x + R * 0.06, -y + R * 0.15); ctx.lineTo(x + R * 0.12, -y); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + R * 0.06, y - R * 0.15); ctx.lineTo(x + R * 0.12, y); ctx.fill();
      }
    }
    const iris = aiming ? '#ff2d55' : '#ffe066';
    eye(ctx, R * 0.25, -R * 0.38, R * 0.22, 0, { iris, slit: true, lid: aiming ? 0 : blink(rig, t), glow: aiming ? '#ff2d55' : null });
    eye(ctx, R * 0.25, R * 0.38, R * 0.22, 0, { iris, slit: true, lid: aiming ? 0 : blink(rig, t), glow: aiming ? '#ff2d55' : null });
    ctx.restore();
    if (aiming) {
      ctx.save();
      ctx.strokeStyle = withAlpha('#ff4d6d', 0.35 + 0.35 * Math.sin(t * 30));
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.x + Math.cos(face) * 300, h.y + Math.sin(face) * 300);
      ctx.stroke();
      ctx.restore();
    }
  },

  blowfin(ctx, e, t, col, rig) {
    const R = ENEMY_R.blowfin * (e.elite ? 1.4 : 1);
    const swell = e.state === 'swell' ? Math.min(1, e.t / 0.85) : 0;
    const face = heading(rig, e.vx, e.vy, e.face, 5);
    const rx = R * (1.2 - 0.05 * swell) * (1 + swell * 0.75), ry = R * (0.85 + 0.3 * swell) * (1 + swell * 0.75);
    const warn = swell > 0 && Math.floor(t * (8 + swell * 16)) % 2 === 0;
    const c = warn ? mix(col, '#ffffff', 0.6) : col;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(face);
    // Tail and fluttering pectoral fins.
    fin(ctx, -rx * 0.9, 0, Math.PI + Math.sin(t * 9 + e.phase) * 0.4, R * 0.9, R * 0.55, mix(c, '#ff9f1a', 0.3), { rays: 5 });
    for (const s of [-1, 1]) fin(ctx, rx * 0.05, s * ry * 0.85, s * (Math.PI / 2 + 0.5 + Math.sin(t * 16 + e.phase) * 0.45), R * 0.55, R * 0.3, mix(c, '#fff3b0', 0.3), { rays: 4 });
    // Spines lie flat until it swells, then stand straight out.
    const n = 20;
    ctx.strokeStyle = mix(c, '#5a3a00', 0.45);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const bx = Math.cos(a) * rx * 0.92, by = Math.sin(a) * ry * 0.92;
      const normal = Math.atan2(by / (ry * ry), bx / (rx * rx));
      // Relaxed, each spine folds back toward the tail; swollen, it points straight out.
      const dirA = normal + angleDiff(normal, Math.PI) * 0.8 * (1 - swell);
      const out = R * (0.2 + swell * 0.5);
      ctx.lineWidth = 2 + swell;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(dirA) * out, by + Math.sin(dirA) * out);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    const g = ctx.createRadialGradient(rx * 0.2, -ry * 0.45, R * 0.1, 0, 0, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, mix(c, '#ffffff', 0.6));
    g.addColorStop(0.5, c);
    g.addColorStop(1, mix(c, '#3d2200', 0.6));
    ctx.fillStyle = g;
    ctx.fill();
    // Pale belly and dark saddle spots.
    ctx.fillStyle = 'rgba(255, 250, 225, 0.35)';
    ctx.beginPath();
    ctx.ellipse(rx * 0.05, ry * 0.42, rx * 0.7, ry * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = withAlpha(mix(c, '#3d2200', 0.7), 0.55);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(-rx * 0.55 + i * rx * 0.17, -ry * (0.35 + hash(i) * 0.2), R * (0.08 + hash(i + 3) * 0.06), 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 250, 220, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, -2.6, -0.6);
    ctx.stroke();
    // Big worried eyes and a small round mouth.
    for (const s of [-1, 1]) eye(ctx, rx * 0.45, s * ry * 0.42, R * (0.26 + swell * 0.08), 0, { iris: '#2a6f8f', lid: swell > 0 ? 0 : blink(rig, t) });
    ctx.fillStyle = '#4a1d00';
    ctx.beginPath();
    ctx.ellipse(rx * 0.98, 0, R * 0.1, R * (0.1 + swell * 0.08), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (swell > 0) {
      const RR = 105 * (e.elite ? 1.4 : 1);
      ctx.strokeStyle = withAlpha('#ffe066', 0.3 + swell * 0.5);
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, RR, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = withAlpha('#ffe066', 0.08 * swell);
      ctx.fill();
    }
  },

  spitbloom(ctx, e, t, col, rig) {
    const R = e.r;
    const charge = e.charging ? Math.min(1, (0.6 - Math.max(0, e.cool)) / 0.6) : 0;
    const recoil = e.cool > 2.0 ? (e.cool - 2.0) * 3 : 0; // just fired: tentacles flare out
    ctx.save();
    ctx.translate(e.x, e.y);
    // Column skirt.
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.95, 0, TAU);
    ctx.fillStyle = mix(col, '#2a0800', 0.65);
    ctx.fill();
    ctx.strokeStyle = withAlpha(mix(col, '#ffffff', 0.2), 0.35);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6); ctx.lineTo(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95); ctx.stroke();
    }
    // Tentacles sway in a travelling current and curl in while charging.
    const n = 15;
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU + ring * (Math.PI / n);
        const sway = Math.sin(t * 1.7 + a0 * 2 + e.phase) * 0.28;
        const len = R * (ring ? 1.25 : 1.6) * (1 - charge * 0.45 + recoil * 0.25);
        const pts = [];
        for (let k = 0; k <= 5; k++) {
          const f = k / 5;
          const a = a0 + sway * f + charge * 0.9 * f * f * (i % 2 ? 1 : -1);
          const d = R * 0.45 + len * f;
          pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
        }
        tentacle(ctx, pts, R * (ring ? 0.2 : 0.24), R * 0.07, ring ? mix(col, '#ffffff', 0.25) : col, 0.95);
        const tip = pts[5];
        ctx.fillStyle = mix(col, '#fff0e0', 0.7);
        ctx.beginPath(); ctx.arc(tip.x, tip.y, R * 0.1, 0, TAU); ctx.fill();
      }
    }
    // Oral disc and the mouth that glows before each volley.
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.5, 0, TAU);
    const g = ctx.createRadialGradient(-R * 0.15, -R * 0.15, 1, 0, 0, R * 0.5);
    g.addColorStop(0, mix(col, '#ffffff', 0.5));
    g.addColorStop(1, mix(col, '#3a0d00', 0.4));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 0, 0, R * (0.4 + charge * 0.9), '#ffb27a', 0.4 + charge * 0.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = charge > 0.5 ? '#fff1e0' : '#3a0d0d';
    ctx.beginPath();
    ctx.ellipse(0, 0, R * (0.12 + charge * 0.1), R * (0.05 + charge * 0.14), e.phase, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  ironclaw(ctx, e, t, col, rig) {
    const R = e.r;
    const face = heading(rig, e.vx, e.vy, e.face, 4);
    const sp = Math.hypot(e.vx, e.vy);
    rig.walk = (rig.walk ?? 0) + rig.dt * (2 + sp / 6);
    const shellDark = mix(col, '#1a0204', 0.55);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(face);
    // Legs: three a side, jointed, stepping in alternating tripods.
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const ph = rig.walk + i * 2.1 + (s > 0 ? Math.PI : 0);
        const swing = Math.sin(ph) * 0.32;
        const lift = Math.max(0, Math.cos(ph));
        const hx = R * (0.25 - i * 0.38), hy = s * R * 0.55;
        const a1 = s * (Math.PI / 2 + 0.25 - i * 0.35) + swing;
        const kx = hx + Math.cos(a1) * R * 0.75, ky = hy + Math.sin(a1) * R * 0.75;
        const a2 = a1 + s * (0.9 - lift * 0.3);
        const fx = kx + Math.cos(a2) * R * 0.75, fy = ky + Math.sin(a2) * R * 0.75;
        ctx.strokeStyle = shellDark;
        ctx.lineWidth = R * 0.2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
        ctx.lineWidth = R * 0.14;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = withAlpha(mix(col, '#ffffff', 0.3), 0.55);
        ctx.lineWidth = R * 0.06;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(kx, ky, R * 0.1, 0, TAU); ctx.fill();
      }
    }
    // Claws on two-segment arms; the pincers open and snap shut.
    for (const s of [-1, 1]) {
      const snap = Math.max(0, Math.sin(t * 3.2 + (s > 0 ? 0 : 1.6)));
      const open = 0.08 + snap * 0.42;
      const ex = R * 0.95, ey = s * R * 0.95;
      ctx.strokeStyle = shellDark;
      ctx.lineWidth = R * 0.24;
      ctx.beginPath(); ctx.moveTo(R * 0.55, s * R * 0.45); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(-s * 0.35);
      const cg = ctx.createLinearGradient(0, -R * 0.4, 0, R * 0.4);
      cg.addColorStop(0, mix(col, '#ffffff', 0.4));
      cg.addColorStop(1, shellDark);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(R * 0.25, 0, R * 0.42, R * 0.3, 0, 0, TAU);
      ctx.fill();
      for (const j of [-1, 1]) {
        ctx.save();
        ctx.translate(R * 0.55, j * R * 0.08);
        ctx.rotate(j * open);
        ctx.beginPath();
        ctx.moveTo(0, -R * 0.12 * -j);
        ctx.quadraticCurveTo(R * 0.45, -j * R * 0.2, R * 0.6, j * R * 0.05);
        ctx.quadraticCurveTo(R * 0.3, j * R * 0.02, 0, R * 0.12 * j);
        ctx.fillStyle = j < 0 ? mix(col, '#ffffff', 0.25) : col;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    // Carapace: lit dome, a ridge, bumps and a dark rim.
    ctx.beginPath();
    ctx.moveTo(R * 0.9, 0);
    ctx.bezierCurveTo(R * 0.9, -R * 0.85, -R * 0.75, -R * 0.95, -R * 0.85, 0);
    ctx.bezierCurveTo(-R * 0.75, R * 0.95, R * 0.9, R * 0.85, R * 0.9, 0);
    const g = ctx.createRadialGradient(R * 0.1, -R * 0.35, R * 0.1, 0, 0, R * 1.05);
    g.addColorStop(0, mix(col, '#ffffff', 0.5));
    g.addColorStop(0.55, col);
    g.addColorStop(1, shellDark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 0, 6, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 220, 220, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(R * 0.7, 0); ctx.quadraticCurveTo(0, -R * 0.08, -R * 0.65, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 210, 210, 0.4)';
    for (let i = 0; i < 9; i++) {
      const a = hash(i) * TAU;
      const d = R * (0.25 + hash(i + 9) * 0.45);
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8, R * 0.06, 0, TAU); ctx.fill();
    }
    // Eyes on stalks.
    for (const s of [-1, 1]) {
      ctx.strokeStyle = shellDark;
      ctx.lineWidth = R * 0.08;
      ctx.beginPath(); ctx.moveTo(R * 0.75, s * R * 0.18); ctx.lineTo(R * 1.02, s * R * 0.3); ctx.stroke();
      eye(ctx, R * 1.04, s * R * 0.31, R * 0.12, 0, { iris: '#111', sclera: '#ffe2c0', lid: blink(rig, t) });
    }
    ctx.restore();
  },

  broodbell(ctx, e, t, col, rig) {
    const R = e.r;
    const head = heading(rig, e.vx, e.vy, -Math.PI / 2, 3);
    rig.swim = (rig.swim ?? 0) + rig.dt * 2.2;
    const c = 0.5 + 0.5 * Math.sin(rig.swim * 2);
    const W = R * (0.95 + 0.18 * (1 - c)), L = R * (0.9 + 0.12 * c);
    const ch = Math.cos(head), sh = Math.sin(head);
    const back = head + Math.PI;
    for (let i = 0; i < 4; i++) {
      const lat = (i / 3 - 0.5) * W * 1.1;
      const pts = chain(rig, `a${i}`, 9, R * 0.3, e.x - ch * L * 0.2 - sh * lat, e.y - sh * L * 0.2 + ch * lat, back, 0.07);
      const wav = undulate(pts, t * 1.2 + i * 1.3, R * 0.25, 4, 5, 0);
      tentacle(ctx, wav, R * 0.22, R * 0.05, mix(col, '#ffffff', 0.3), 0.6);
    }
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(head);
    ctx.beginPath();
    ctx.moveTo(-L * 0.25, -W);
    ctx.bezierCurveTo(L * 0.3, -W * 1.15, L, -W * 0.7, L, 0);
    ctx.bezierCurveTo(L, W * 0.7, L * 0.3, W * 1.15, -L * 0.25, W);
    for (let i = 0; i < 9; i++) {
      const y0 = W - (i / 9) * 2 * W, y1 = W - ((i + 1) / 9) * 2 * W;
      ctx.quadraticCurveTo(-L * 0.25 - R * 0.18, (y0 + y1) / 2, -L * 0.25, y1);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(L * 0.45, -W * 0.3, 1, L * 0.2, 0, R * 1.3);
    g.addColorStop(0, 'rgba(255, 245, 255, 0.85)');
    g.addColorStop(0.4, withAlpha(col, 0.6));
    g.addColorStop(1, withAlpha(mix(col, '#1a0033', 0.4), 0.55));
    ctx.fillStyle = g;
    ctx.fill();
    rimLight(ctx, '#f3e6ff', 1.4, 0.8);
    // The brood: small glowing young circling inside the bell.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = t * 1.4 + i * 1.26;
      drawGlow(ctx, L * 0.3 + Math.cos(a) * L * 0.32, Math.sin(a) * W * 0.5, R * 0.3, '#bfe9ff', 0.9);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(L * 0.35, 0, L * 0.5, W * 0.75, 0, -1.25, -0.35);
    ctx.stroke();
    ctx.restore();
  },

  maw(ctx, e, t, col, rig) { drawMaw(ctx, e, t, rig); },
  nacre(ctx, e, t, col, rig) { drawNacre(ctx, e, t, rig); },
};

const ENEMY_R = { blowfin: 18 };
