// The title screen's living backdrop: the game's own creature renderer draws a great Undertow Maw
// prowling the lower right, Broodbells drifting on the left and a school of Flickers crossing
// above, all animated from the clock in screen space.

import { drawEnemy } from '../render/creatures.js';
import { ENEMY_KINDS } from '../game/enemies.js';
import { BOSS_INFO } from '../game/bosses.js';

function actor(id, kind, x, y, r, extra = {}) {
  const k = ENEMY_KINDS[kind] ?? BOSS_INFO[kind];
  return { id, kind, x, y, r, color: k.color, hp: 1, maxHp: 1, spawnT: 0, hitFlash: 0, elite: false, face: 0, vx: 0, vy: 0, t: 0, phase: 0, state: 'move', ...extra };
}

export function drawTitleArt(ctx, t) {
  // School of Flickers sweeping across the top on a slow wave.
  for (let i = 0; i < 9; i++) {
    const span = 1700;
    const x = ((t * 90 + i * 46 + (i % 3) * 30) % span) - 200;
    const y = 120 + Math.sin(x * 0.006 + i * 0.4) * 40 + (i % 3) * 22;
    const vy = Math.cos(x * 0.006 + i * 0.4) * 40 * 0.54;
    drawEnemy(ctx, actor(`title-f${i}`, 'flicker', x, y, 9, { vx: 90, vy, face: Math.atan2(vy, 90), phase: i }), t);
  }
  // Broodbells drifting upward on the left.
  const bells = [[150, 470, 34, 0], [110, 300, 22, 2.1], [70, 160, 18, 4.2]];
  for (const [bx, by, r, ph] of bells) {
    const y = by + Math.sin(t * 0.6 + ph) * 18;
    drawEnemy(ctx, actor(`title-b${ph}`, 'broodbell', bx + Math.sin(t * 0.4 + ph) * 10, y, r, { vx: 0, vy: -20, phase: ph }), t);
  }
  // The Maw, huge, prowling at the lower right with its lure lit.
  const mx = 1150 + Math.sin(t * 0.35) * 20, my = 390 + Math.sin(t * 0.5) * 14;
  drawEnemy(ctx, actor('title-maw', 'maw', mx, my, 120, { boss: 'maw', face: Math.PI + 0.12 + Math.sin(t * 0.35) * 0.05, state: 'drift', lureGlow: 0.4 + 0.3 * Math.sin(t * 2) }), t);
  // A Spinewhorl and a Blowfin keep their distance on the right.
  drawEnemy(ctx, actor('title-w', 'whorl', 1180, 150 + Math.sin(t) * 8, 20, { vx: -10, phase: 1 }), t);
  drawEnemy(ctx, actor('title-p', 'blowfin', 1100, 600 + Math.sin(t * 0.8) * 10, 18, { vx: -30, face: Math.PI }), t);
}

// A small Undertow Maw for the title's how-to strip.
export function drawMiniMaw(ctx, x, y, r, t) {
  drawEnemy(ctx, actor('title-mini-maw', 'maw', x, y, r, { boss: 'maw', face: Math.PI, state: 'drift', lureGlow: 0.6 }), t);
}
