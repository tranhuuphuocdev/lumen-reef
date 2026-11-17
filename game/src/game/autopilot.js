// A simple pilot that plays Pip on its own: it backs away from danger, kites around the arena,
// aims at the nearest foe and dashes through tight spots. It drives the title screen's attract
// mode and stages the screenshot scenes, using the same controls a player has.

import { WORLD } from '../config.js';
import { MUTATIONS, applyMutation } from './upgrades.js';
import { createRun } from './state.js';
import { leadingAspect, MUTATION_ASPECT } from './attributes.js';
import { startWave } from './waves.js';

export function autopilot(run) {
  const p = run.player;
  let fx = 0, fy = 0;
  let nearest = null, nd = Infinity;
  let threat = 0;
  for (const e of run.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < nd && !e.untargetable) { nd = d; nearest = e; }
    const reach = e.r + (e.boss ? 260 : 150);
    if (d < reach) {
      const w = (reach - d) / reach;
      fx += (dx / d) * w * 2.2;
      fy += (dy / d) * w * 2.2;
      threat += w;
    }
  }
  for (const b of run.enemyShots) {
    const dx = p.x - b.x, dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 120) { fx += (dx / d) * (120 - d) / 60; fy += (dy / d) * (120 - d) / 60; threat += 0.3; }
  }
  for (const h of run.hazards) {
    const dx = p.x - h.x, dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < h.r + 50) { fx += (dx / d) * 3; fy += (dy / d) * 3; }
  }
  // Circle the centre so the pilot never pins itself to a wall.
  const cx = WORLD.w / 2 - p.x, cy = WORLD.h / 2 - p.y;
  const cd = Math.hypot(cx, cy) || 1;
  const orbit = Math.atan2(cy, cx) + Math.PI / 2;
  fx += Math.cos(orbit) * 0.6 + (cx / cd) * Math.min(1.4, cd / 500);
  fy += Math.sin(orbit) * 0.6 + (cy / cd) * Math.min(1.4, cd / 500);
  if (nearest && (nd > 420 || run.enemies.length <= 3)) { fx += (nearest.x - p.x) / nd * 0.6; fy += (nearest.y - p.y) / nd * 0.6; }
  for (const g of run.pickups) {
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < 260 && threat < 0.4) { fx += (g.x - p.x) / d * 0.5; fy += (g.y - p.y) / d * 0.5; break; }
  }
  const l = Math.hypot(fx, fy) || 1;
  const lead = nearest ? 0.12 : 0;
  return {
    move: { x: fx / l, y: fy / l },
    aimX: nearest ? nearest.x + (nearest.vx ?? 0) * lead : p.x + Math.cos(p.aim) * 100,
    aimY: nearest ? nearest.y + (nearest.vy ?? 0) * lead : p.y + Math.sin(p.aim) * 100,
    fire: !!nearest && nd < 760,
    dash: threat > 1.3,
    pulse: threat > 1.6 || (run.wave.boss && !run.wave.boss.dead && p.pulse >= 100),
  };
}

// The pilot's pick at a level-up: favour damage-dealing mutations it has not maxed.
export function autopilotChoice(run, choices) {
  // Lean into one Aspect, like a player committing to a build.
  const lead = leadingAspect(run);
  const same = choices.find((id) => lead && MUTATION_ASPECT[id] === lead);
  if (same && run.rng.chance(0.7)) return same;
  const pref = ['split', 'quick', 'dense', 'pearls', 'static', 'needle', 'seeker', 'ricochet', 'bell', 'nova', 'ward'];
  const sorted = [...choices].sort((a, b) => (pref.indexOf(a) + 99) % 99 - (pref.indexOf(b) + 99) % 99);
  return sorted[0] ?? MUTATIONS[0].id;
}

// The dive that plays behind the title screen: a few waves in, already mutated, so the reef is busy.
export function createAttractRun(seed) {
  const run = createRun({ seed, difficulty: 'rising', demo: 'invincible' });
  for (const id of ['split', 'quick', 'pearls', 'static']) applyMutation(run, id);
  startWave(run, 4);
  return run;
}
