// Pip's glow bolts: volleys with spread, piercing, ricochets, homing and the Starburst ring, plus
// the orbiting pearls. Enemy shots move here too, since they share the same simple physics.

import { PLAYER, WORLD } from '../config.js';
import { angleDiff } from '../core/math.js';
import { emit } from './state.js';

export function fireVolley(run) {
  const p = run.player;
  const s = p.stats;
  const n = s.projectiles;
  const spread = PLAYER.spread * (n > 1 ? 1 : 0);
  p.shotCount += 1;
  for (let i = 0; i < n; i++) {
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    spawnBolt(run, p.aim + off + run.rng.range(-0.025, 0.025));
  }
  // Solar Crown: every fifth volley adds a heavy lance that pierces everything.
  if (s.lance && p.shotCount % 5 === 0) {
    spawnBolt(run, p.aim, 2.2);
    const b = run.bullets[run.bullets.length - 1];
    b.pierce = 99;
    b.r *= 1.7;
    b.lance = true;
    b.life *= 1.3;
  }
  if (s.nova > 0 && p.shotCount % Math.max(4, 9 - s.nova * 2) === 0) {
    const k = 10 + s.nova * 4;
    for (let i = 0; i < k; i++) spawnBolt(run, p.aim + (i / k) * Math.PI * 2, 0.7);
  }
  // Recoil nudges Pip back a little: shooting has weight.
  p.vx -= Math.cos(p.aim) * 6;
  p.vy -= Math.sin(p.aim) * 6;
  emit(run, 'shoot');
}

function spawnBolt(run, angle, dmgScale = 1) {
  const p = run.player;
  const s = p.stats;
  const sp = PLAYER.bulletSpeed;
  const tip = 20;
  run.bullets.push({
    x: p.x + Math.cos(angle) * tip,
    y: p.y + Math.sin(angle) * tip,
    vx: Math.cos(angle) * sp,
    vy: Math.sin(angle) * sp,
    r: PLAYER.bulletRadius * s.size,
    dmg: s.damage * dmgScale,
    pierce: s.pierce,
    bounce: s.bounce,
    life: PLAYER.bulletLife,
    hit: new Set(),
    trail: [],
  });
}

export function updateBullets(run, dt) {
  const s = run.player.stats;
  const minX = WORLD.wall, minY = WORLD.wall, maxX = WORLD.w - WORLD.wall, maxY = WORLD.h - WORLD.wall;
  for (let i = run.bullets.length - 1; i >= 0; i--) {
    const b = run.bullets[i];
    b.life -= dt;
    b.trail.push(b.x, b.y);
    if (b.trail.length > 10) b.trail.splice(0, 2);
    if (s.homing > 0) {
      const t = nearestEnemy(run, b.x, b.y, 260, b.hit);
      if (t) {
        const cur = Math.atan2(b.vy, b.vx);
        const want = Math.atan2(t.y - b.y, t.x - b.x);
        const turn = Math.max(-1, Math.min(1, angleDiff(cur, want))) * (3.2 + s.homing * 2.5) * dt;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(cur + turn) * sp;
        b.vy = Math.sin(cur + turn) * sp;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let bounced = false;
    if (b.x < minX || b.x > maxX) { b.vx *= -1; b.x = Math.max(minX, Math.min(maxX, b.x)); bounced = true; }
    if (b.y < minY || b.y > maxY) { b.vy *= -1; b.y = Math.max(minY, Math.min(maxY, b.y)); bounced = true; }
    if (bounced) {
      if (b.bounce > 0) { b.bounce -= 1; b.life = Math.max(b.life, 0.5); b.hit.clear(); }
      else b.life = 0;
    }
    if (b.life <= 0) { run.bullets[i] = run.bullets[run.bullets.length - 1]; run.bullets.pop(); }
  }

  for (let i = run.enemyShots.length - 1; i >= 0; i--) {
    const e = run.enemyShots[i];
    e.life -= dt;
    if (e.accel) { e.vx *= 1 + e.accel * dt; e.vy *= 1 + e.accel * dt; }
    if (e.curve) {
      const a = Math.atan2(e.vy, e.vx) + e.curve * dt;
      const sp = Math.hypot(e.vx, e.vy);
      e.vx = Math.cos(a) * sp;
      e.vy = Math.sin(a) * sp;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.life <= 0 || e.x < 0 || e.y < 0 || e.x > WORLD.w || e.y > WORLD.h) {
      run.enemyShots[i] = run.enemyShots[run.enemyShots.length - 1];
      run.enemyShots.pop();
    }
  }
}

export function orbitPositions(run) {
  const p = run.player;
  const n = p.stats.orbit;
  const out = [];
  const R = 58 + n * 4;
  for (let i = 0; i < n; i++) {
    const a = run.time * 3.1 + (i / n) * Math.PI * 2;
    out.push({ x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, r: 9 });
  }
  return out;
}

export function nearestEnemy(run, x, y, maxDist = Infinity, exclude = null) {
  let best = null;
  let bd = maxDist * maxDist;
  for (const e of run.enemies) {
    if (e.dead || (exclude && exclude.has(e.id)) || e.untargetable) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function enemyShot(run, x, y, angle, speed, opts = {}) {
  if (run.route === 'redbloom') speed *= 1.2;
  if (run.relics?.includes('veil')) speed *= 0.78;
  run.enemyShots.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: opts.r ?? 7, life: opts.life ?? 5, color: opts.color ?? '#ff7aa8', accel: opts.accel ?? 0, curve: opts.curve ?? 0 });
}
