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
import { showCallout } from './ui/callout.js';

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
    return { run, clock: run.time, mouse: { x: 700, y: 438 } };
  }

  if (name === 'play') {
    const run = createRun({ seed: 90 + seed, demo: 'invincible' });
    // build=N keeps the first N mutations: a lighter build fights the boss longer, as a real dive at tide 5 does.
    const picks = ['split', 'dense', 'keen', 'pearls', 'deep', 'split', 'static', 'dense', 'bloom', 'resonance', 'quick'];
    const nb = Number(params.get('build') ?? picks.length);
    grow(run, picks.slice(0, nb));
    run.level = nb + 1;
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
      // Pip and the Maw weigh most; escorts within reach pull the frame toward them a little.
      const near = run.enemies.filter((e) => !e.dead && !e.boss && Math.hypot(e.x - run.player.x, e.y - run.player.y) < 600);
      const pts = [run.player, run.player, b, b, b, b, ...near];
      const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length, cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
      run.camera.x = clamp(cx, VIEW.w / 2 / ZOOM, WORLD.w - VIEW.w / 2 / ZOOM);
      run.camera.y = clamp(cy + 30, VIEW.h / 2 / ZOOM, WORLD.h - VIEW.h / 2 / ZOOM);
    } else followCamera(run, 0, true);
    // Numbers that drifted under the HUD panels would read as glitches in a still frame.
    const underHud = (q) => {
      const x = (q.x - run.camera.x) * ZOOM + VIEW.w / 2, y = (q.y - run.camera.y) * ZOOM + VIEW.h / 2;
      return x < 280 || x > VIEW.w - 280 || y < 175 || y > VIEW.h - 120;
    };
    run.fx.texts = run.fx.texts.filter((q) => !underHud(q));
    ui.mode = 'play';
    ui.banner = null;
    const mx = b ? VIEW.w / 2 + (b.x - run.camera.x) * ZOOM : 900;
    const my = b ? VIEW.h / 2 + (b.y - run.camera.y) * ZOOM : 300;
    // The pulse that just broke the boss's attack is shouted across the fight, as in play.
    if (b && pulseAt > 0 && b.exposed > 0) showCallout(ui, 'STAGGERED!', 'WEAK POINT OPEN · DAMAGE ×2.2', '#ffd166', 1.3 - pulseAt * 0.4);
    return { run, clock: run.time, mouse: { x: mx, y: my } };
  }

  if (name === 'route') {
    // A dive played from its first tide by the pilot, which picks its own currents until the tide
    // before the choice; then the choice is left to the player, as in play.
    const run = createRun({ seed: 700 + seed, demo: 'invincible' });
    const upTo = Number(params.get('tide') ?? 7);
    for (let i = 0; i < 60 * 900 && !(run.wave.n === upTo && run.wave.phase === 'fight'); i++) simulate(run, TICK);
    run.manualRoute = true;
    for (let i = 0; i < 60 * 180 && run.wave.phase !== 'route'; i++) simulate(run, TICK);
    run.hitsTaken = 2;
    for (const l of run.tideLog ?? []) if ([3, 6].includes(l.n)) l.flawless = false;
    followCamera(run, 0, true);
    ui.mode = 'route';
    ui.routeAge = 2;
    return { run, clock: run.time, mouse: { x: 1040, y: 530 } };
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
    return { run, clock: run.time, mouse: { x: 690, y: 330 } };
  }

  // 'end': a whole dive played start to finish by the pilot, ending on the results screen.
  const run = createRun({ seed: 7 + seed, demo: 'invincible' });
  simulate(run, 1500);
  if (!run.outcome) run.outcome = 'victory';
  // The pilot swims invincible; give its journal the three hits its rank card claims.
  run.hitsTaken = 3;
  for (const l of run.tideLog ?? []) if ([4, 7, 9].includes(l.n)) l.flawless = false;
  followCamera(run, 0, true);
  ui.mode = 'results';
  ui.resultAge = 3;
  ui.best = Math.floor(run.score);
  ui.newBest = true;
  return { run, clock: run.time, mouse: { x: 470, y: 700 } };
}
