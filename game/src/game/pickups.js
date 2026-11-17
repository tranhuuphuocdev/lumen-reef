// Glim (the glowing shards foes drop, Pip's experience) and sea-heart pickups: they scatter,
// drift, get pulled in by Pip's lure radius and level Pip up.

import { emit, xpForLevel } from './state.js';
import { burst, floatText } from './effects.js';

export function dropGlim(run, x, y, value) {
  let left = value;
  while (left > 0) {
    const v = left >= 5 ? 5 : 1;
    left -= v;
    const a = run.rng.angle();
    const sp = run.rng.range(60, 200);
    run.pickups.push({ kind: 'glim', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, value: v, r: v === 5 ? 8 : 5, age: 0, phase: run.rng.angle() });
  }
}

export function dropHeart(run, x, y) {
  run.pickups.push({ kind: 'heart', x, y, vx: 0, vy: -60, value: 1, r: 11, age: 0, phase: 0 });
}

export function updatePickups(run, dt) {
  const p = run.player;
  const lure = p.stats.pickup;
  for (let i = run.pickups.length - 1; i >= 0; i--) {
    const g = run.pickups[i];
    g.age += dt;
    const dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = g.magnet || (!p.dead && d < lure);
    if (pull) {
      g.magnet = true;
      const sp = 380 + g.age * 300;
      g.vx = (dx / d) * sp;
      g.vy = (dy / d) * sp;
    } else {
      const k = Math.exp(-3 * dt);
      g.vx *= k;
      g.vy *= k;
    }
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    if (!p.dead && d < 18 + g.r) {
      collect(run, g);
      run.pickups.splice(i, 1);
    } else if (g.kind === 'heart' && g.age > 14) {
      run.pickups.splice(i, 1);
    }
  }
}

function collect(run, g) {
  const p = run.player;
  if (g.kind === 'heart') {
    if (p.hp < p.stats.maxHp) {
      p.hp = Math.min(p.stats.maxHp, p.hp + 1);
      floatText(run, p.x, p.y - 30, '+1 shell', '#ff9ec0', 18);
    } else {
      run.score += 250;
      floatText(run, p.x, p.y - 30, '+250', '#ff9ec0', 18);
    }
    burst(run, p.x, p.y, '#ff9ec0', 16, 140, 0.6, 3);
    emit(run, 'heart');
    return;
  }
  run.glim += g.value;
  p.glimSincePulse = (p.glimSincePulse ?? 0) + g.value;
  run.xp += g.value;
  run.score += g.value * 5;
  emit(run, 'glim', { pitch: run.xp % 10 });
  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level += 1;
    run.xpNext = xpForLevel(run.level);
    run.pendingLevels += 1;
  }
}

// Called when a wave ends: every glim left on the floor flies to Pip.
export function magnetiseAll(run) {
  for (const g of run.pickups) if (g.kind === 'glim') g.magnet = true;
}
