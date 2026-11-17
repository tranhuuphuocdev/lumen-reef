// One run's whole state: the player, every live entity, the wave director and the score. The
// simulation mutates it in fixed ticks; the renderer only reads it. Events the sim raises (sounds,
// banners) queue on run.events for the shell to drain each frame.

import { WORLD, DIFFICULTY, XP } from '../config.js';
import { createRng } from '../core/rng.js';
import { baseStats } from './upgrades.js';

export function createRun({ seed = Date.now() % 1e9, difficulty = 'rising', demo = false } = {}) {
  const stats = baseStats();
  return {
    seed,
    rng: createRng(seed),
    diff: DIFFICULTY[difficulty],
    demo,
    time: 0,
    player: {
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      hp: stats.maxHp,
      stats,
      inv: 0,
      hurtFlash: 0,
      dashT: 0,
      dashCd: 0,
      dashDir: { x: 0, y: -1 },
      fireCd: 0,
      shotCount: 0,
      shield: 0,
      shieldCd: 0,
      regenT: 0,
      pulse: 0,
      surge: 0,
      sinceDash: 9,
      glimSincePulse: 0,
      casting: 0,
      inkCd: 0,
      bob: 0,
      dead: false,
    },
    bullets: [],
    enemyShots: [],
    enemies: [],
    pickups: [],
    inks: [],
    hazards: [],
    sonar: [],
    currents: [],
    perfects: 0,
    fx: { particles: [], texts: [], rings: [], bolts: [], shake: 0, flash: 0, flashColor: '#ffffff', slowmo: 0, hitstop: 0, bossDeath: null },
    wave: { n: 0, phase: 'intro', timer: 2.5, toSpawn: 0, spawnCd: 0, spawned: 0, boss: null, noHit: true, groups: [] },
    level: 1,
    xp: 0,
    xpNext: XP.base,
    pendingLevels: 0,
    choices: null,
    mutations: {},
    score: 0,
    kills: 0,
    combo: 0,
    comboT: 0,
    mult: 1,
    bestCombo: 0,
    hitsTaken: 0,
    glim: 0,
    bossesSlain: 0,
    outcome: null,
    events: [],
    camera: { x: WORLD.w / 2, y: WORLD.h / 2 },
    nextId: 1,
  };
}

export function emit(run, name, data) {
  if (!run.demo) run.events.push({ name, data });
}

export function xpForLevel(level) {
  return Math.round((XP.base + XP.perLevel * (level - 1)) * XP.growth ** (level - 1));
}
