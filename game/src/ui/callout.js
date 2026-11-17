// Callouts: one big tilted word across the fight for a moment worth shouting about (a boss
// staggered by the pulse, a chain milestone), popping in large and fading within a second.

import { VIEW, ZOOM } from '../config.js';
import { text } from './widgets.js';

export function showCallout(target, title, sub, color, life = 1.3) {
  target.callout = { title, sub, color, life, max: life };
}

// The callout pops in large and tilted, then shrinks and fades. It sits high or low on the screen,
// whichever keeps it further from both Pip and the boss, so it never hides the fight.
export function drawCallout(ctx, ui, run) {
  const c = ui.callout;
  if (!c || c.life <= 0) return;
  const age = c.max - c.life;
  const pop = age < 0.12 ? 1.5 - (age / 0.12) * 0.5 : 1;
  const a = Math.min(1, c.life * 3);
  ctx.save();
  ctx.translate(VIEW.w / 2, calloutY(run));
  ctx.rotate(-0.05);
  ctx.scale(pop, pop);
  text(ctx, c.title, 0, 0, { size: 46, weight: 900, align: 'center', color: c.color, glow: c.color, alpha: a, spacing: 4 });
  if (c.sub) text(ctx, c.sub, 0, 28, { size: 15, weight: 900, align: 'center', color: '#ffffff', alpha: a, spacing: 3 });
  ctx.restore();
}


export function calloutY(run) {
  if (!run) return 226;
  const sy = (q) => (q.y - run.camera.y) * ZOOM + VIEW.h / 2;
  const b = run.wave.boss;
  const marks = [sy(run.player)];
  if (b && !b.dead) marks.push(sy(b));
  const clear = (y) => Math.min(...marks.map((m) => Math.abs(m - y)));
  const high = 226, low = VIEW.h * 0.73;
  return clear(high) >= clear(low) ? high : low;
}
