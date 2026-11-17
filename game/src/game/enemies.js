// The reef's glowing foes. Each kind has a body (radius, health, speed, score, glim) and a
// behaviour: Spinewhorls swarm, Lash Eels circle then lunge, Blowfins swell and burst, Spitblooms
// keep their distance and lob spore volleys, Ironclaws soak damage, Flickers dart in packs and
// Broodbells split into Flickers when popped. Elites are larger, tougher and always drop a heart.

import { WORLD } from '../config.js';
import { clamp, angleDiff } from '../core/math.js';
import { enemyShot } from './weapons.js';
import { emit } from './state.js';
import { burst, ring, shake } from './effects.js';
import { hurtPlayer } from './combat.js';

export const ENEMY_KINDS = {
  whorl: { name: 'Spinewhorl', r: 15, hp: 22, speed: 105, score: 10, glim: 1, color: '#ff6fb5', contact: 1 },
  eel: { name: 'Lash Eel', r: 14, hp: 30, speed: 150, score: 18, glim: 2, color: '#4dffc3', contact: 1 },
  blowfin: { name: 'Blowfin', r: 18, hp: 36, speed: 70, score: 20, glim: 2, color: '#ffd84d', contact: 1 },
  spitbloom: { name: 'Spitbloom', r: 19, hp: 42, speed: 80, score: 24, glim: 3, color: '#ff8a4d', contact: 1 },
  ironclaw: { name: 'Ironclaw', r: 26, hp: 150, speed: 58, score: 45, glim: 6, color: '#ff5a5a', contact: 1, heavy: true },
  flicker: { name: 'Flicker', r: 8, hp: 7, speed: 210, score: 4, glim: 1, color: '#7fd8ff', contact: 1 },
  broodbell: { name: 'Broodbell', r: 24, hp: 80, speed: 55, score: 35, glim: 4, color: '#c58bff', contact: 1 },
};

export function spawnEnemy(run, kind, x, y, { elite = false, hpScale = 1, speedScale = 1 } = {}) {
  const k = ENEMY_KINDS[kind];
  const d = run.diff;
  const scale = elite ? 1.4 : 1;
  const hp = k.hp * d.hp * hpScale * (elite ? 3.2 : 1);
  const e = {
    id: run.nextId++,
    kind,
    x, y,
    vx: 0, vy: 0, kx: 0, ky: 0,
    r: k.r * scale,
    hp, maxHp: hp,
    speed: k.speed * d.speed * speedScale * (elite ? 0.92 : 1),
    score: k.score * (elite ? 4 : 1),
    glim: k.glim * (elite ? 4 : 1),
    color: k.color,
    contact: k.contact,
    heavy: k.heavy || elite,
    elite,
    state: 'move',
    t: run.rng.range(0, 1.5),
    phase: run.rng.angle(),
    face: 0,
    hitFlash: 0,
    stun: 0,
    spawnT: 0.6,
    harmless: true,
  };
  if (kind === 'broodbell') e.onDeath = (r, me) => { for (let i = 0; i < 4; i++) spawnEnemy(r, 'flicker', me.x + r.rng.range(-20, 20), me.y + r.rng.range(-20, 20)); };
  run.enemies.push(e);
  return e;
}

// A spot on the reef just outside the player's view, so foes swim in rather than pop in.
export function edgeSpawnPoint(run) {
  const p = run.player;
  for (let tries = 0; tries < 20; tries++) {
    const a = run.rng.angle();
    const d = run.rng.range(720, 900);
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    if (x > WORLD.wall + 40 && x < WORLD.w - WORLD.wall - 40 && y > WORLD.wall + 40 && y < WORLD.h - WORLD.wall - 40) return { x, y };
  }
  return { x: clamp(p.x + 700, 120, WORLD.w - 120), y: clamp(p.y, 120, WORLD.h - 120) };
}

export function updateEnemies(run, dt) {
  const p = run.player;
  const list = run.enemies;
  for (const e of list) {
    if (e.dead) continue;
    e.t += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.exposed > 0) e.exposed -= dt;
    if (e.forcedOpen > 0) e.forcedOpen -= dt;
    if (e.spawnT > 0) { e.spawnT -= dt; if (e.spawnT <= 0) e.harmless = false; }
    const toP = Math.atan2(p.y - e.y, p.x - e.x);
    const dP = Math.hypot(p.x - e.x, p.y - e.y);
    let want = { x: 0, y: 0 };
    if (e.stun > 0) e.stun -= dt;
    else if (e.boss) e.update(run, e, dt, toP, dP);
    else want = BEHAVIOUR[e.kind](run, e, dt, toP, dP);
    if (!e.boss) {
      const acc = 1 - Math.exp(-5 * dt);
      e.vx += (want.x - e.vx) * acc;
      e.vy += (want.y - e.vy) * acc;
    }
    const kd = Math.exp(-7 * dt);
    e.kx *= kd;
    e.ky *= kd;
    e.x += (e.vx + e.kx) * dt;
    e.y += (e.vy + e.ky) * dt;
    if (Math.abs(e.vx) + Math.abs(e.vy) > 8) e.face += angleDiff(e.face, Math.atan2(e.vy, e.vx)) * Math.min(1, dt * 8);
    e.x = clamp(e.x, WORLD.wall + e.r * 0.5, WORLD.w - WORLD.wall - e.r * 0.5);
    e.y = clamp(e.y, WORLD.wall + e.r * 0.5, WORLD.h - WORLD.wall - e.r * 0.5);
  }
  separate(list);
  for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);

  for (let i = run.hazards.length - 1; i >= 0; i--) {
    const h = run.hazards[i];
    h.t += dt;
    h.armed = h.t >= h.delay && h.t < h.delay + h.active;
    if (h.t >= h.delay + h.active) run.hazards.splice(i, 1);
  }
}

function separate(list) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.boss) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const rr = (a.r + b.r) * 0.9;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2);
        const push = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        const wa = a.heavy ? 0.25 : 1, wb = b.heavy ? 0.25 : 1;
        a.x -= nx * push * wa; a.y -= ny * push * wa;
        b.x += nx * push * wb; b.y += ny * push * wb;
      }
    }
  }
}

const toward = (a, sp) => ({ x: Math.cos(a) * sp, y: Math.sin(a) * sp });

const BEHAVIOUR = {
  whorl(run, e, dt, toP) {
    const wob = Math.sin(e.t * 3 + e.phase) * 0.5;
    return toward(toP + wob, e.speed);
  },
  flicker(run, e, dt, toP) {
    const wob = Math.sin(e.t * 6 + e.phase) * 0.9;
    return toward(toP + wob, e.speed);
  },
  ironclaw(run, e, dt, toP) {
    return toward(toP, e.speed * (0.8 + 0.4 * Math.max(0, Math.sin(e.t * 2))));
  },
  broodbell(run, e, dt, toP) {
    return toward(toP + Math.sin(e.t) * 0.4, e.speed * (0.6 + 0.6 * Math.max(0, Math.sin(e.t * 2.2))));
  },
  eel(run, e, dt, toP, dP) {
    if (e.state === 'move') {
      if (dP < 300 && e.t > 1.6) { e.state = 'aim'; e.t = 0; e.lunge = toP; }
      const side = toP + (dP > 260 ? 0.5 : 1.45) * (e.id % 2 ? 1 : -1);
      return toward(side, e.speed);
    }
    if (e.state === 'aim') {
      e.lunge += angleDiff(e.lunge, toP) * Math.min(1, dt * 6);
      if (e.t > 0.55) { e.state = 'lunge'; e.t = 0; emit(run, 'enemyShot'); }
      return { x: -Math.cos(e.lunge) * 40, y: -Math.sin(e.lunge) * 40 };
    }
    if (e.state === 'lunge') {
      if (e.t > 0.42) { e.state = 'move'; e.t = 0; }
      return toward(e.lunge, 640 * run.diff.speed);
    }
    return { x: 0, y: 0 };
  },
  blowfin(run, e, dt, toP, dP) {
    if (e.state === 'move') {
      if (dP < 120) { e.state = 'swell'; e.t = 0; }
      return toward(toP, e.speed);
    }
    if (e.state === 'swell') {
      e.r = ENEMY_KINDS.blowfin.r * (e.elite ? 1.4 : 1) * (1 + e.t * 0.7);
      if (e.t > 0.85) {
        e.dead = true;
        const R = 105 * (e.elite ? 1.4 : 1);
        if (Math.hypot(run.player.x - e.x, run.player.y - e.y) < R + 12) hurtPlayer(run, 1, e.x, e.y);
        const n = e.elite ? 14 : 8;
        for (let i = 0; i < n; i++) enemyShot(run, e.x, e.y, (i / n) * Math.PI * 2 + e.phase, 210, { color: '#ffe066', r: 6, life: 2.5 });
        burst(run, e.x, e.y, '#ffe066', 30, 300, 0.7, 4);
        ring(run, e.x, e.y, '#ffe066', R, 0.45, 6);
        shake(run, 6);
        emit(run, 'explode');
      }
      return { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  },
  spitbloom(run, e, dt, toP, dP) {
    e.cool = (e.cool ?? 1.5 + run.rng.next()) - dt;
    e.charging = e.cool < 0.6;
    if (e.cool <= 0) {
      e.cool = 2.3 / run.diff.speed;
      const n = e.elite ? 5 : 3;
      for (let i = 0; i < n; i++) enemyShot(run, e.x, e.y, toP + (i - (n - 1) / 2) * 0.22, 230 * run.diff.speed, { color: '#ff9a5a', r: 7 });
      emit(run, 'enemyShot');
      ring(run, e.x, e.y, '#ff9a5a', 30, 0.25, 3);
    }
    const ideal = e.hunt ? 90 : 360;
    const dir = dP > ideal + 40 ? toP : dP < ideal - 40 ? toP + Math.PI : toP + Math.PI / 2;
    return toward(dir, e.speed * (e.charging ? 0.2 : 1));
  },
};
