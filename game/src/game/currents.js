// Ocean currents: streams that carry Pip, foes and every bolt in one direction, and vortices that
// swirl and drag things toward their eye. Each wave lays out its own currents (from wave 3 on),
// and the Undertow Maw raises a vortex around itself in its second phase. Riding a stream makes
// Pip faster; fighting one slows Pip down; shots bend as they cross.

import { WORLD } from '../config.js';

export function layoutCurrents(run, n) {
  run.currents = [];
  if (n < 3 || n === 5 || n === 10) return;
  const rng = run.rng;
  const streams = n >= 7 ? 2 : 1;
  for (let i = 0; i < streams; i++) {
    const horizontal = rng.chance(0.5);
    const dir = rng.chance(0.5) ? 1 : -1;
    const along = rng.range(0.3, 0.7);
    run.currents.push({
      kind: 'stream',
      // A band across the arena, 220 px wide.
      x: horizontal ? WORLD.w / 2 : WORLD.w * along,
      y: horizontal ? WORLD.h * along : WORLD.h / 2,
      hw: horizontal ? WORLD.w / 2 : 110,
      hh: horizontal ? 110 : WORLD.h / 2,
      vx: horizontal ? 115 * dir : 0,
      vy: horizontal ? 0 : 115 * dir,
    });
  }
  if (n >= 6) {
    run.currents.push({ kind: 'vortex', x: rng.range(500, WORLD.w - 500), y: rng.range(400, WORLD.h - 400), r: 230, spin: rng.chance(0.5) ? 1 : -1, pull: 70 });
  }
}

// The current's flow at a point, in px/s.
export function flowAt(run, x, y) {
  let fx = 0, fy = 0;
  for (const c of run.currents) {
    if (c.kind === 'stream') {
      const dx = Math.abs(x - c.x), dy = Math.abs(y - c.y);
      if (dx < c.hw && dy < c.hh) {
        // Strongest along the band's centre line, fading at its edges.
        const edge = c.vx ? 1 - dy / c.hh : 1 - dx / c.hw;
        const k = Math.min(1, edge * 1.6);
        fx += c.vx * k;
        fy += c.vy * k;
      }
    } else {
      if (c.follow) { if (c.follow.dead) continue; c.x = c.follow.x; c.y = c.follow.y; }
      const dx = x - c.x, dy = y - c.y;
      const d = Math.hypot(dx, dy);
      if (d < c.r && d > 1) {
        const k = 1 - d / c.r;
        const sp = 170 * k;
        fx += (-dy / d) * sp * c.spin - (dx / d) * c.pull * k;
        fy += (dx / d) * sp * c.spin - (dy / d) * c.pull * k;
      }
    }
  }
  return { x: fx, y: fy };
}

export function applyCurrents(run, dt) {
  if (!run.currents?.length) return;
  const p = run.player;
  if (!p.dead && p.dashT <= 0) {
    const f = flowAt(run, p.x, p.y);
    p.x += f.x * dt;
    p.y += f.y * dt;
    p.riding = Math.hypot(f.x, f.y) > 30;
  } else p.riding = false;
  for (const e of run.enemies) {
    // Foes are only nudged (and hunters not at all), so no current can pin one to a wall.
    if (e.boss || e.dead || e.hunt) continue;
    const f = flowAt(run, e.x, e.y);
    e.x += f.x * dt * 0.4;
    e.y += f.y * dt * 0.4;
  }
  for (const b of run.bullets) {
    const f = flowAt(run, b.x, b.y);
    b.vx += f.x * dt * 1.6;
    b.vy += f.y * dt * 1.6;
  }
  for (const s of run.enemyShots) {
    const f = flowAt(run, s.x, s.y);
    s.x += f.x * dt * 0.8;
    s.y += f.y * dt * 0.8;
  }
}
