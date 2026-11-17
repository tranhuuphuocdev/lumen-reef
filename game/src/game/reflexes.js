// Skill rewards. A perfect dodge is a dash that slips past a shot or a foe within a hair of
// contact: it pays score, pulse charge and a Surge. Surge is a few seconds of faster fire and
// golden light, also earned at every 25-kill chain milestone, so chaining kills and dodging
// well both feed the same reward.

import { emit } from './state.js';
import { floatText, ring, burst } from './effects.js';
import { chargePulse } from './player.js';

const GRAZE = 26;

export function checkPerfectDodge(run, x, y, r) {
  const p = run.player;
  if (p.dashT <= 0 || p.perfectDash) return false;
  const rr = r + 15 + GRAZE;
  if ((x - p.x) ** 2 + (y - p.y) ** 2 > rr * rr) return false;
  p.perfectDash = true;
  const reflex = p.stats.reflex ?? 0;
  grantSurge(run, 2.4 + reflex * 1.2, 'PERFECT DODGE');
  chargePulse(run, 22);
  if (reflex > 0) p.dashCd = Math.min(p.dashCd, 0.15);
  const pts = Math.round(150 * run.mult * run.diff.score);
  run.score += pts;
  run.comboT = Math.max(run.comboT, 2.4);
  run.perfects = (run.perfects ?? 0) + 1;
  run.fx.slowmo = Math.max(run.fx.slowmo, 0.22);
  ring(run, p.x, p.y, '#ffd166', 46, 0.35, 4);
  burst(run, p.x, p.y, '#ffd166', 14, 220, 0.5, 3);
  emit(run, 'perfect');
  return true;
}

export function grantSurge(run, seconds, label) {
  const p = run.player;
  const was = p.surge > 0;
  p.surge = Math.max(p.surge, seconds);
  floatText(run, p.x, p.y - 44, label, '#ffd166', 20);
  if (!was) emit(run, 'surge');
}

export function updateReflexes(run, dt) {
  const p = run.player;
  p.surge = Math.max(0, (p.surge ?? 0) - dt);
  p.sinceDash = (p.sinceDash ?? 9) + dt;
  p.casting = Math.max(0, (p.casting ?? 0) - dt);
  if (p.dashT > 0) p.sinceDash = 0;
  else p.perfectDash = false;
  const milestone = Math.floor(run.combo / 25);
  if (milestone > (run.lastMilestone ?? 0)) {
    grantSurge(run, 4, `${milestone * 25} CHAIN — SURGE`);
    emit(run, 'milestone');
  }
  run.lastMilestone = milestone;
}
