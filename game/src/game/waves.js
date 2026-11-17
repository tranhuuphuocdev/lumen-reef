// The tide director: ten waves, each a shuffled queue of foes released in groups from beyond the
// edge of the view, with bosses on waves 5 and 10. Between waves the reef calms, leftover glim
// flies home and the wave bonus (doubled for a wave without a hit) is paid.

import { WAVES_TOTAL, BOSS_WAVES } from '../config.js';
import { emit } from './state.js';
import { spawnEnemy, edgeSpawnPoint } from './enemies.js';
import { spawnBoss } from './bosses.js';
import { magnetiseAll } from './pickups.js';
import { floatText } from './effects.js';
import { layoutCurrents } from './currents.js';
import { drawRoutes, routeMods, autoRoute, ROUTES } from './tides.js';
import { RELIC_TIDES, drawRelics, takeRelic, autoRelic, hasRelic } from './relics.js';

export const WAVE_PLANS = {
  1: { whorl: 16, flicker: 6 },
  2: { whorl: 18, eel: 6, flicker: 10 },
  3: { whorl: 16, blowfin: 6, eel: 8, spitbloom: 3 },
  4: { whorl: 18, spitbloom: 6, ironclaw: 2, flicker: 14, eel: 6, broodbell: 2 },
  5: { whorl: 6, flicker: 6, eel: 4, blowfin: 3, spitbloom: 2 },
  6: { whorl: 22, eel: 10, blowfin: 8, spitbloom: 6, ironclaw: 3 },
  7: { flicker: 28, broodbell: 4, spitbloom: 8, ironclaw: 4, eel: 10 },
  8: { whorl: 28, blowfin: 10, spitbloom: 9, ironclaw: 5, broodbell: 4, eel: 12 },
  9: { whorl: 28, eel: 14, blowfin: 12, spitbloom: 11, ironclaw: 6, broodbell: 5, flicker: 18 },
  10: { whorl: 8, flicker: 8, eel: 4, spitbloom: 3, ironclaw: 2, broodbell: 2 },
};

export const WAVE_NAMES = {
  1: 'Shallow Glow', 2: 'Eel Currents', 3: 'Spore Gardens', 4: 'The Brood Shelf', 5: 'Undertow',
  6: 'Ironclaw Trench', 7: 'Flicker Storm', 8: 'Bloomfall', 9: 'The Black Bloom', 10: 'Pearl Abyss',
};

function buildQueue(run, n) {
  const plan = WAVE_PLANS[n];
  const q = [];
  for (const [kind, count] of Object.entries(plan)) {
    const c = Math.round(count * run.diff.count * routeMods(run).count);
    for (let i = 0; i < c; i++) q.push(kind);
  }
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng.next() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  // Weak foes first so each wave builds.
  const weight = { flicker: 0, whorl: 0, eel: 1, blowfin: 1, spitbloom: 2, broodbell: 2, ironclaw: 3 };
  return q.map((k, i) => ({ k, s: i / q.length + weight[k] * 0.12 })).sort((a, b) => a.s - b.s).map((x) => x.k);
}

export function startWave(run, n) {
  const w = run.wave;
  if (n === 1) run.route = 'slack';
  w.n = n;
  w.phase = 'intro';
  w.timer = 2.4;
  w.queue = buildQueue(run, n);
  w.total = w.queue.length + (BOSS_WAVES[n] ? 1 : 0);
  w.spawnCd = 0.5;
  w.boss = null;
  w.noHit = true;
  w.name = WAVE_NAMES[n];
  w.mark = { score: run.score, kills: run.kills, time: run.time, hits: run.hitsTaken };
  // Kelp Charm: every new tide regrows a shell.
  const p = run.player;
  if (n > 1 && hasRelic(run, 'kelp') && p.hp < p.stats.maxHp && !p.dead) { p.hp += 1; floatText(run, p.x, p.y - 40, 'KELP CHARM +1 SHELL', '#7dff9a', 18); }
  layoutCurrents(run, n);
  emit(run, 'waveStart', { n, name: w.name, boss: !!BOSS_WAVES[n] });
}

export function updateWaves(run, dt) {
  const w = run.wave;
  if (run.player.dead) return;
  if (w.phase === 'intro') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.phase = 'fight';
      if (BOSS_WAVES[w.n]) spawnBoss(run, BOSS_WAVES[w.n]);
    }
    return;
  }
  if (w.phase === 'fight') {
    const n = w.n;
    const cap = 16 + n * 3;
    w.spawnCd -= dt;
    const bossAlive = w.boss && !w.boss.dead;
    if (w.spawnCd <= 0 && w.queue.length && run.enemies.length < cap) {
      const mods = routeMods(run);
      const group = Math.min(w.queue.length, Math.round((1 + Math.floor(run.rng.next() * (2 + n * 0.35))) * mods.group));
      const at = edgeSpawnPoint(run);
      for (let i = 0; i < group; i++) {
        const kind = w.queue.shift();
        const elite = kind !== 'flicker' && run.rng.chance((0.015 + n * 0.012) * mods.elite);
        spawnEnemy(run, kind, at.x + run.rng.range(-50, 50), at.y + run.rng.range(-50, 50), { elite, hpScale: (1 + (n - 1) * 0.13) * mods.hp, speedScale: mods.speed });
      }
      w.spawnCd = (bossAlive ? 3.2 : Math.max(0.4, 1.35 - n * 0.09)) * (0.7 + run.rng.next() * 0.6);
    }
    // A tide never stalls: once the queue is spent, foes that keep their distance (or got
    // pinned against the reef wall) come hunting if nothing has fallen for a while.
    if (!w.queue.length && !bossAlive && run.enemies.length) {
      if (run.enemies.length !== w.stallCount) { w.stallCount = run.enemies.length; w.stallT = 0; }
      w.stallT = (w.stallT ?? 0) + dt;
      if (w.stallT > (run.enemies.length <= 3 ? 10 : 14)) for (const e of run.enemies) e.hunt = true;
    } else { w.stallT = 0; w.stallCount = -1; }
    if (!w.queue.length && !run.enemies.length && !bossAlive) {
      if (n >= WAVES_TOTAL) {
        logTide(run, true);
        w.phase = 'won';
        w.timer = 3;
        emit(run, 'victory');
        magnetiseAll(run);
        return;
      }
      w.phase = 'clear';
      w.timer = 2.6;
      const bonus = Math.round(400 * n * run.diff.score * (w.noHit ? 2 : 1));
      run.score += bonus;
      w.lastBonus = bonus;
      logTide(run, true);
      floatText(run, run.player.x, run.player.y - 60, w.noHit ? `FLAWLESS +${bonus}` : `TIDE TURNED +${bonus}`, '#ffd166', 26);
      emit(run, 'waveClear', { n, bonus, flawless: w.noHit });
      magnetiseAll(run);
    }
    return;
  }
  if (w.phase === 'clear') {
    w.timer -= dt;
    if (w.timer <= 0) {
      // Some tides end on a relic: three are offered and one is kept, before the route choice.
      const tier = RELIC_TIDES[w.n];
      if (tier && !(run.relicTides ??= []).includes(w.n)) {
        run.relicTides.push(w.n);
        const offer = drawRelics(run, tier);
        if (offer.length && run.demo && !run.manualRoute) takeRelic(run, autoRelic(run, offer));
        else if (offer.length) { w.phase = 'relic'; run.relicChoices = offer; return; }
      }
      // The player picks the next tide's route; the pilot (demo and screenshots) picks its own.
      const choices = drawRoutes(run);
      if (run.demo && !run.manualRoute) { run.route = autoRoute(run, choices); (run.routes ??= []).push(run.route); startWave(run, w.n + 1); }
      else { w.phase = 'route'; run.routeChoices = choices; }
    }
    return;
  }
  if (w.phase === 'won') {
    w.timer -= dt;
    if (w.timer <= 0 && !run.outcome) run.outcome = 'victory';
  }
}

// One line of the dive's journal per tide: what it scored, how many fell, whether Pip was hit,
// and the current it was swum under. The results screen charts it.
export function logTide(run, cleared) {
  const w = run.wave;
  const m = w.mark ?? { score: 0, kills: 0, time: 0, hits: 0 };
  (run.tideLog ??= []).push({
    n: w.n, cleared, boss: !!BOSS_WAVES[w.n], route: run.route ?? 'slack', flawless: w.noHit,
    score: Math.round(run.score - m.score), kills: run.kills - m.kills, time: run.time - m.time,
  });
}

export function waveProgress(run) {
  const w = run.wave;
  if (!w.total) return 0;
  const left = (w.queue?.length ?? 0) + run.enemies.filter((e) => !e.boss).length + (w.boss && !w.boss.dead ? 1 : 0);
  return 1 - Math.min(1, left / w.total);
}

export function chooseRelic(run, id) {
  takeRelic(run, id);
  run.relicChoices = null;
  run.wave.phase = 'clear';
  run.wave.timer = 0;
}

export function chooseRoute(run, id) {
  run.route = ROUTES[id] ? id : 'slack';
  (run.routes ??= []).push(run.route);
  run.routeChoices = null;
  startWave(run, run.wave.n + 1);
}
