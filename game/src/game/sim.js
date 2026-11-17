// One fixed simulation tick of a run, in a fixed order: player, bolts, foes, combat, pickups,
// the wave director, effects, combo decay and the camera.

import { VIEW, WORLD, ZOOM } from '../config.js';
import { clamp, approach } from '../core/math.js';
import { updatePlayer } from './player.js';
import { updateBullets } from './weapons.js';
import { updateEnemies } from './enemies.js';
import { resolveCombat } from './combat.js';
import { updatePickups } from './pickups.js';
import { updateWaves, startWave } from './waves.js';
import { updateEffects } from './effects.js';
import { applyCurrents } from './currents.js';
import { updateSonar } from './sonar.js';
import { updateReflexes } from './reflexes.js';

export function stepRun(run, ctl, dt) {
  if (run.wave.n === 0) startWave(run, 1);
  // Hit-stop: a few frozen frames on the heaviest impacts; effects keep breathing.
  if (run.fx.hitstop > 0) {
    run.fx.hitstop -= dt;
    updateEffects(run, dt * 0.25);
    return;
  }
  const slow = run.fx.slowmo > 0 ? 0.35 : 1;
  const sdt = dt * slow;
  run.time += sdt;
  updatePlayer(run, ctl, sdt);
  updateReflexes(run, sdt);
  applyCurrents(run, sdt);
  updateBullets(run, sdt);
  updateSonar(run, sdt);
  updateEnemies(run, sdt);
  resolveCombat(run, sdt);
  updatePickups(run, sdt);
  updateWaves(run, sdt);
  updateEffects(run, dt);

  if (run.comboT > 0) {
    run.comboT -= sdt;
    if (run.comboT <= 0) { run.combo = 0; run.mult = 1; }
  }
  if (run.player.dead) {
    run.deadT = (run.deadT ?? 0) + dt;
    if (run.deadT > 2.2 && !run.outcome) run.outcome = 'defeat';
  }
  followCamera(run, dt);
}

export function followCamera(run, dt, snap = false) {
  const p = run.player;
  const lookX = p.x + (run.lookX ?? 0) * 0.18;
  const lookY = p.y + (run.lookY ?? 0) * 0.18;
  // The camera may look a little past the arena's top and bottom edges, so Pip is never hidden
  // under the HUD's top panels or the ability bar when hugging a wall.
  const hw = VIEW.w / 2 / ZOOM, hh = VIEW.h / 2 / ZOOM;
  const tx = clamp(lookX, hw - 40, WORLD.w - hw + 40);
  const ty = clamp(lookY, hh - 70, WORLD.h - hh + 120);
  run.camera.x = snap ? tx : approach(run.camera.x, tx, 6, dt);
  run.camera.y = snap ? ty : approach(run.camera.y, ty, 6, dt);
}
