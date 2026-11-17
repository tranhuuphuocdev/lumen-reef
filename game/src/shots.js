// Screenshot scenes (?shot=title|play|levelup|end): each one plays the real simulation forward
// with the autopilot from a fixed seed, then hands the frozen run to the normal renderer, so every
// screenshot is the game's own code drawing a moment it really reaches.

import { TICK, VIEW, WORLD, ZOOM } from './config.js';
import { clamp } from './core/math.js';
import { createRun } from './game/state.js';
import { stepRun, followCamera } from './game/sim.js';
import { startWave } from './game/waves.js';
import { spawnEnemy } from './game/enemies.js';
import { autopilot, autopilotChoice, createAttractRun } from './game/autopilot.js';
import { applyMutation, drawChoices } from './game/upgrades.js';

function simulate(run, seconds, { autoPick = true } = {}) {
  const steps = Math.round(seconds / TICK);
  for (let i = 0; i < steps; i++) {
    stepRun(run, autopilot(run), TICK);
    while (autoPick && run.pendingLevels > 0) {
      run.pendingLevels -= 1;
      const c = drawChoices(run);
      if (c.length) applyMutation(run, autopilotChoice(run, c));
    }
    run.events.length = 0;
    if (run.outcome) break;
  }
  return run;
}

function grow(run, picks) {
  for (const id of picks) applyMutation(run, id);
}

export function stageShot(name, ui) {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') ?? 1);
  const at = Number(params.get('t') ?? 0);

  if (name === 'title') {
    const run = createAttractRun(4242 + seed);
    simulate(run, at || 9);
    followCamera(run, 0, true);
    ui.mode = 'title';
    ui.best = 48210;
    return { run, clock: run.time, mouse: { x: 640, y: 479 } };
  }

  if (name === 'play') {
    const run = createRun({ seed: 90 + seed, demo: 'invincible' });
    grow(run, ['split', 'split', 'dense', 'dense', 'keen', 'bloom', 'pearls', 'static', 'deep', 'resonance', 'quick']);
    run.level = 12;
    run.xpNext = 52;
    run.xp = 31;
    run.score = 16420;
    run.kills = 214;
    const bossWave = Number(params.get('wave') ?? 5);
    if (bossWave === 10) {
      grow(run, ['split', 'pearls', 'static', 'quick', 'dense', 'ward', 'seeker', 'needle']);
      run.level = 16;
      run.score = 98760;
      run.kills = 455;
    }
    startWave(run, bossWave);
    const pulseAt = Number(params.get('pulse') ?? 0);
    if (pulseAt > 0) {
      // Fight on, then press the Pulse key a moment before the frame, as a player would.
      simulate(run, (at || 11.5) - pulseAt);
      run.player.pulse = 100;
      stepRun(run, { ...autopilot(run), pulse: true }, TICK);
      simulate(run, pulseAt - TICK);
    } else simulate(run, at || 11.5);
    run.player.hp = 4;
    run.player.inv = 0;
    const b = run.wave.boss;
    // Frame Pip and the Maw together, as a player watching the fight would see it.
    if (b) {
      run.camera.x = clamp((run.player.x + b.x) / 2, VIEW.w / 2 / ZOOM, WORLD.w - VIEW.w / 2 / ZOOM);
      run.camera.y = clamp((run.player.y + b.y) / 2 - 40, VIEW.h / 2 / ZOOM, WORLD.h - VIEW.h / 2 / ZOOM);
    } else followCamera(run, 0, true);
    ui.mode = 'play';
    ui.banner = null;
    const mx = b ? 640 + (b.x - run.camera.x) * ZOOM : 900;
    const my = b ? 360 + (b.y - run.camera.y) * ZOOM : 300;
    return { run, clock: run.time, mouse: { x: mx, y: my } };
  }

  if (name === 'route') {
    const run = createRun({ seed: 700 + seed, demo: 'invincible' });
    grow(run, ['split', 'quick', 'pearls', 'static']);
    run.manualRoute = true;
    startWave(run, 4);
    // Fight the tide out until the route choice comes up, as it does in play.
    for (let i = 0; i < 60 * 120 && run.wave.phase !== 'route'; i++) simulate(run, TICK);
    run.routeChoices = ['slack', 'riptide', 'redbloom'];
    run.wave.n = 4;
    followCamera(run, 0, true);
    ui.mode = 'route';
    ui.routeAge = 2;
    return { run, clock: run.time, mouse: { x: 1040, y: 540 } };
  }

  if (name === 'bestiary') {
    // Every foe kind around Pip, swimming but unfired upon: for checking their animation.
    const run = createRun({ seed: 600 + seed, demo: 'invincible' });
    run.wave.n = 4;
    run.wave.phase = 'clear';
    run.wave.timer = 999;
    const kinds = ['whorl', 'eel', 'blowfin', 'spitbloom', 'ironclaw', 'flicker', 'broodbell', 'whorl'];
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2;
      const e = spawnEnemy(run, k, run.player.x + Math.cos(a) * 250, run.player.y + Math.sin(a) * 200, { elite: i === 7 });
      e.harmless = true;
    });
    const idle = { move: { x: 0, y: 0 }, aimX: run.player.x + 200, aimY: run.player.y, fire: false, dash: false, pulse: false };
    for (let i = 0; i < Math.round((at || 1.2) / TICK); i++) { stepRun(run, idle, TICK); run.events.length = 0; }
    followCamera(run, 0, true);
    ui.mode = 'play';
    return { run, clock: run.time, mouse: { x: 900, y: 360 } };
  }

  if (name === 'swarm') {
    const run = createRun({ seed: 500 + seed, demo: 'invincible' });
    grow(run, ['split', 'split', 'quick', 'quick', 'dense', 'pearls', 'static', 'needle']);
    run.level = 12;
    run.score = 38450;
    startWave(run, Number(params.get('wave') ?? 8));
    simulate(run, at || 16);
    followCamera(run, 0, true);
    ui.mode = 'play';
    ui.banner = null;
    return { run, clock: run.time, mouse: { x: 860, y: 300 } };
  }

  if (name === 'levelup') {
    const run = createRun({ seed: 300 + seed, demo: 'invincible' });
    grow(run, ['split', 'needle', 'pearls', 'quick']);
    startWave(run, 3);
    simulate(run, at || 14);
    run.level = 6;
    run.score += 4210;
    run.pendingLevels = 1;
    run.choices = ['dense', 'static', 'reflex'];
    followCamera(run, 0, true);
    ui.mode = 'levelup';
    ui.levelAge = 2;
    ui.cardSel = -1;
    return { run, clock: run.time, mouse: { x: 700, y: 520 } };
  }

  // 'end': a whole dive played start to finish by the pilot, ending on the results screen.
  const run = createRun({ seed: 7 + seed, demo: 'invincible' });
  simulate(run, 1500);
  if (!run.outcome) run.outcome = 'victory';
  run.hitsTaken = 3;
  followCamera(run, 0, true);
  ui.mode = 'results';
  ui.resultAge = 3;
  ui.best = Math.floor(run.score);
  ui.newBest = true;
  return { run, clock: run.time, mouse: { x: 520, y: 577 } };
}
