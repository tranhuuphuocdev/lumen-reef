// The two tide-bosses. The Undertow Maw (wave 5) is a lantern-jawed leviathan that drifts, lunges,
// rings the arena with spores and calls Flickers with its lure. Queen Nacre (wave 10) is a great
// pearl-shell who spins spirals, seeds the floor with bursting pearls and shuts her shell while her
// brood fights for her. Both cycle patterns and grow faster as their health falls.

import { WORLD } from '../config.js';
import { clamp } from '../core/math.js';
import { emit } from './state.js';
import { enemyShot } from './weapons.js';
import { spawnEnemy } from './enemies.js';
import { burst, ring, shake, floatText } from './effects.js';

export const BOSS_INFO = {
  maw: { name: 'THE UNDERTOW MAW', title: 'Leviathan of the Second Shelf', color: '#ff5c8a', r: 66, hp: 1700, score: 2500, glim: 40 },
  nacre: { name: 'QUEEN NACRE', title: 'Mother of the Pearl Abyss', color: '#ffe3a3', r: 78, hp: 4200, score: 6000, glim: 60 },
};

export function spawnBoss(run, id) {
  const info = BOSS_INFO[id];
  const p = run.player;
  const x = p.x < WORLD.w / 2 ? WORLD.w - 380 : 380;
  const y = WORLD.h / 2;
  const hp = info.hp * run.diff.hp;
  const e = {
    id: run.nextId++,
    kind: id,
    boss: id,
    name: info.name,
    x, y, vx: 0, vy: 0, kx: 0, ky: 0,
    r: info.r,
    hp, maxHp: hp,
    score: info.score,
    glim: info.glim,
    color: info.color,
    contact: 1,
    heavy: true,
    state: 'intro',
    t: 0,
    phase: 0,
    face: Math.PI,
    hitFlash: 0,
    stun: 0,
    spin: 0,
    pattern: 0,
    intro: 2.2,
    update: id === 'maw' ? updateMaw : updateNacre,
  };
  run.enemies.push(e);
  run.wave.boss = e;
  emit(run, 'boss', { name: info.name, title: info.title });
  shake(run, 10);
  return e;
}

export const BOSS_PHASES = {
  maw: ['HUNTER', 'UNDERTOW', 'ABYSSAL FRENZY'],
  nacre: ['PEARL QUEEN', 'PEARL STORM', 'ABYSSAL CROWN'],
};

// Shared boss beats: a phase change (a roar, a shockwave that shoves Pip back, a brief
// invulnerability) and the stagger after a sonar interrupt or a wall crash (a free window on the
// exposed weak point). Returns true while one of them owns the boss this tick.
function bossBeats(run, e, dt, cycle) {
  const r = rage(e);
  if (r > (e.phaseIdx ?? 0) && e.state !== 'roar') {
    e.phaseIdx = r;
    e.state = 'roar';
    e.t = 0;
    e.telegraph = false;
    const name = BOSS_PHASES[e.boss][r];
    emit(run, 'bossPhase', { name, n: r + 1 });
    ring(run, e.x, e.y, e.color, 420, 0.8, 10);
    shake(run, 14);
    run.enemyShots.length = 0;
    const p = run.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    p.vx += Math.cos(a) * 520;
    p.vy += Math.sin(a) * 520;
    if (e.boss === 'maw' && r === 1) run.currents.push({ kind: 'vortex', follow: e, x: e.x, y: e.y, r: 420, spin: 1, pull: 85 });
  }
  if (e.state === 'roar') {
    e.vx *= 0.9; e.vy *= 0.9;
    e.invuln = true;
    if (e.t > 1.3) { e.invuln = false; nextPattern(e, cycle); }
    return true;
  }
  if (e.interrupt) {
    e.interrupt = false;
    e.state = 'stagger';
    e.t = 0;
    e.telegraph = false;
    e.lureGlow = 0;
  }
  if (e.state === 'stagger') {
    e.vx *= 0.92; e.vy *= 0.92;
    e.exposed = Math.max(e.exposed ?? 0, 0.2);
    if (e.t > 1.5) nextPattern(e, cycle);
    return true;
  }
  return false;
}

function rage(e) {
  const f = e.hp / e.maxHp;
  return f < 0.25 ? 2 : f < 0.55 ? 1 : 0;
}

function nextPattern(e, list) {
  e.pattern = (e.pattern + 1) % list.length;
  e.state = list[e.pattern];
  e.t = 0;
  e.fired = 0;
}

const MAW_CYCLE = ['drift', 'charge', 'ring', 'drift', 'lure', 'charge', 'ring'];

function updateMaw(run, e, dt, toP, dP) {
  const r = rage(e);
  const sp = 1 + r * 0.25;
  if (e.state === 'intro') {
    e.vx = e.vy = 0;
    if (e.t > e.intro) { e.state = 'drift'; e.t = 0; }
    return;
  }
  if (bossBeats(run, e, dt, MAW_CYCLE)) return;
  if (e.state === 'drift') {
    const a = toP + Math.sin(e.t * 1.3) * 0.6;
    e.vx = Math.cos(a) * 85 * sp;
    e.vy = Math.sin(a) * 85 * sp;
    e.face = toP;
    if (e.t > 2.4 / sp) nextPattern(e, MAW_CYCLE);
  } else if (e.state === 'charge') {
    if (e.t < 0.85 / sp) {
      e.aim = toP;
      e.face = toP;
      e.vx *= 0.9; e.vy *= 0.9;
      e.telegraph = true;
    } else if (e.t < 0.85 / sp + 0.9) {
      e.telegraph = false;
      e.vx = Math.cos(e.aim) * 620 * sp;
      e.vy = Math.sin(e.aim) * 620 * sp;
      if (run.rng.chance(dt * 30)) burst(run, e.x - e.vx * 0.08, e.y - e.vy * 0.08, '#ff9ab8', 2, 60, 0.5, 3);
      if (e.x < WORLD.wall + e.r + 5 || e.x > WORLD.w - WORLD.wall - e.r - 5 || e.y < WORLD.wall + e.r + 5 || e.y > WORLD.h - WORLD.wall - e.r - 5) {
        shake(run, 12);
        emit(run, 'explode');
        for (let i = 0; i < 10 + r * 4; i++) enemyShot(run, e.x, e.y, (i / (10 + r * 4)) * Math.PI * 2, 200, { color: '#ff7aa8', r: 8 });
        // Crashing into the reef wall dazes it: a window to hit the weak point.
        e.state = 'stagger';
        e.t = 0;
        e.exposed = 1.8;
        e.vx = e.vy = 0;
        floatText(run, e.x, e.y - e.r - 20, 'DAZED', '#ffd166', 22);
        return;
      }
    } else {
      e.vx *= 0.85; e.vy *= 0.85;
      if (e.t > 0.85 / sp + 1.4) nextPattern(e, MAW_CYCLE);
    }
  } else if (e.state === 'ring') {
    e.vx *= 0.92; e.vy *= 0.92;
    e.face = toP;
    const waves = 3 + r;
    const gap = 0.55 / sp;
    while (e.fired < waves && e.t > 0.4 + e.fired * gap) {
      const n = 20 + r * 4;
      const off = e.fired * 0.17;
      for (let i = 0; i < n; i++) enemyShot(run, e.x, e.y, off + (i / n) * Math.PI * 2, 170 + r * 30, { color: '#ff7aa8', r: 8, curve: r >= 1 ? (e.fired % 2 ? 0.35 : -0.35) : 0 });
      ring(run, e.x, e.y, '#ff7aa8', e.r * 1.4, 0.3, 5);
      emit(run, 'enemyShot');
      e.fired += 1;
    }
    if (e.t > 0.6 + waves * gap) nextPattern(e, MAW_CYCLE);
  } else if (e.state === 'lure') {
    e.vx *= 0.9; e.vy *= 0.9;
    e.lureGlow = Math.min(1, e.t);
    if (e.fired === 0 && e.t > 0.9) {
      e.fired = 1;
      const n = 5 + r * 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEnemy(run, 'flicker', e.x + Math.cos(a) * 110, e.y + Math.sin(a) * 110);
      }
      if (r >= 1) spawnEnemy(run, 'blowfin', e.x, e.y + 120);
      burst(run, e.x + Math.cos(e.face) * 70, e.y + Math.sin(e.face) * 70 - 40, '#fff1a8', 30, 260, 0.8, 3);
      emit(run, 'bossRoar');
    }
    if (e.t > 1.8) { e.lureGlow = 0; nextPattern(e, MAW_CYCLE); }
  }
}

const NACRE_CYCLE = ['spiral', 'fan', 'pearls', 'spiral', 'closed', 'fan', 'pearls'];

function updateNacre(run, e, dt, toP, dP) {
  const r = rage(e);
  const sp = 1 + r * 0.22;
  e.spin += dt * (1.2 + r * 0.5);
  if (e.state === 'intro') {
    e.vx = e.vy = 0;
    if (e.t > e.intro) { e.state = 'spiral'; e.t = 0; }
    return;
  }
  if (bossBeats(run, e, dt, NACRE_CYCLE)) return;
  // Nacre glides slowly toward the arena's centre line, keeping some distance from Pip.
  const cx = clamp(run.player.x + (run.player.x < WORLD.w / 2 ? 420 : -420), 300, WORLD.w - 300);
  const cy = clamp(run.player.y + Math.sin(e.t * 0.5) * 160, 250, WORLD.h - 250);
  const ga = Math.atan2(cy - e.y, cx - e.x);
  const gd = Math.hypot(cx - e.x, cy - e.y);
  const glide = e.state === 'closed' ? 20 : Math.min(70, gd) * sp;
  e.vx = Math.cos(ga) * glide;
  e.vy = Math.sin(ga) * glide;
  e.face = toP;
  e.invuln = e.state === 'closed' && !(e.forcedOpen > 0);

  if (e.state === 'spiral') {
    e.shotT = (e.shotT ?? 0) + dt;
    const every = 0.085 / sp;
    const arms = 4 + r * 2;
    while (e.shotT > every) {
      e.shotT -= every;
      for (let i = 0; i < arms; i++) enemyShot(run, e.x, e.y, e.spin * 1.6 + (i / arms) * Math.PI * 2, 165 + r * 20, { color: '#ffe3a3', r: 7, life: 6 });
      if (r >= 1) for (let i = 0; i < 2; i++) enemyShot(run, e.x, e.y, -e.spin * 1.2 + i * Math.PI, 140, { color: '#b9f3ff', r: 6, life: 6 });
    }
    if (run.rng.chance(dt * 6)) emit(run, 'enemyShot');
    if (e.t > 3.2) nextPattern(e, NACRE_CYCLE);
  } else if (e.state === 'fan') {
    const volleys = 4 + r;
    while (e.fired < volleys && e.t > 0.5 + e.fired * 0.45 / sp) {
      const n = 7 + r * 2;
      for (let i = 0; i < n; i++) enemyShot(run, e.x, e.y, toP + (i - (n - 1) / 2) * 0.13, 280 + r * 30, { color: '#ffd166', r: 7, accel: 0.3 });
      ring(run, e.x, e.y, '#ffd166', e.r * 1.3, 0.25, 4);
      emit(run, 'enemyShot');
      e.fired += 1;
    }
    if (e.t > 0.9 + volleys * 0.45 / sp) nextPattern(e, NACRE_CYCLE);
  } else if (e.state === 'pearls') {
    if (e.fired === 0 && e.t > 0.4) {
      e.fired = 1;
      const n = 6 + r * 3;
      const p = run.player;
      for (let i = 0; i < n; i++) {
        const a = run.rng.angle();
        const d = i === 0 ? 0 : run.rng.range(60, 300);
        run.hazards.push({ x: clamp(p.x + Math.cos(a) * d, 100, WORLD.w - 100), y: clamp(p.y + Math.sin(a) * d, 100, WORLD.h - 100), r: 64, t: 0, delay: 1.25 - r * 0.15 + i * 0.08, active: 0.3, armed: false, color: '#ffe3a3' });
      }
      emit(run, 'bossRoar');
    }
    for (const h of run.hazards) {
      if (!h.popped && h.t >= h.delay) {
        h.popped = true;
        burst(run, h.x, h.y, '#ffe3a3', 22, 260, 0.6, 3);
        ring(run, h.x, h.y, '#fff6d8', h.r, 0.35, 5);
        shake(run, 3);
        emit(run, 'explode');
      }
    }
    if (e.t > 2.6) nextPattern(e, NACRE_CYCLE);
  } else if (e.state === 'closed') {
    if (e.fired === 0) {
      e.fired = 1;
      floatText(run, e.x, e.y - e.r - 20, 'THE SHELL CLOSES', '#ffe3a3', 22);
      const kinds = r >= 1 ? ['whorl', 'whorl', 'blowfin', 'eel', 'eel', 'spitbloom'] : ['whorl', 'whorl', 'whorl', 'eel', 'blowfin'];
      kinds.forEach((k, i) => {
        const a = (i / kinds.length) * Math.PI * 2;
        spawnEnemy(run, k, e.x + Math.cos(a) * 140, e.y + Math.sin(a) * 140);
      });
    }
    e.shotT = (e.shotT ?? 0) + dt;
    if (e.shotT > 0.7) {
      e.shotT = 0;
      const n = 12;
      for (let i = 0; i < n; i++) enemyShot(run, e.x, e.y, e.spin + (i / n) * Math.PI * 2, 120, { color: '#c9b6ff', r: 6 });
    }
    if (e.t > 3.4 || e.forcedOpen > 0) { e.invuln = false; if (e.t > 3.4) nextPattern(e, NACRE_CYCLE); }
  }
}
