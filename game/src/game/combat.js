// Hits and their consequences: bolts, pearls and ink against foes; foes, their shots and hazards
// against Pip. Kills feed the combo multiplier, the score, glim drops and the pulse charge.

import { PLAYER, COMBO } from '../config.js';
import { emit } from './state.js';
import { burst, floatText, damageText, ring, shake, flash, arc } from './effects.js';
import { orbitPositions, nearestEnemy } from './weapons.js';
import { dropGlim, dropHeart } from './pickups.js';
import { chargePulse } from './player.js';
import { checkPerfectDodge } from './reflexes.js';

export function damageEnemy(run, e, amount, src = {}) {
  if (e.dead || e.invuln) {
    if (e.invuln && !src.quiet && e.boss === 'nacre') floatText(run, e.x, e.y - e.r, 'SHELLED', '#9fb6c8', 14);
    return false;
  }
  const s = run.player.stats;
  let dmg = amount;
  let crit = false;
  if (!src.noCrit && run.rng.chance(s.crit)) { dmg *= 2; crit = true; }
  // An exposed boss takes heavy damage at its weak point.
  if (e.exposed > 0) { dmg *= 2.2; crit = true; }
  e.hp -= dmg;
  e.hitFlash = 0.1;
  if (!e.boss && src.x !== undefined) {
    const a = Math.atan2(e.y - src.y, e.x - src.x);
    const kb = (src.knock ?? 90) * (e.heavy ? 0.3 : 1);
    e.kx = (e.kx ?? 0) + Math.cos(a) * kb;
    e.ky = (e.ky ?? 0) + Math.sin(a) * kb;
  }
  if (!src.quiet) {
    damageText(run, e, dmg, crit);
    emit(run, 'hit');
  }
  if (src.venom && s.venom > 0) { e.poison = 3; e.poisonDps = 6 + s.venom * 6; }
  if (e.hp <= 0) killEnemy(run, e);
  return true;
}

export function killEnemy(run, e) {
  if (e.dead) return;
  e.dead = true;
  run.kills += 1;
  run.combo += 1;
  run.comboT = COMBO.window;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  run.mult = Math.min(COMBO.maxMult, 1 + Math.floor(run.combo / COMBO.killsPerStep));
  const pts = Math.round(e.score * run.mult * run.diff.score);
  run.score += pts;
  floatText(run, e.x, e.y - 8, `+${pts}`, run.mult > 1 ? '#ffd166' : '#bff9ff', e.boss ? 30 : 16);
  burst(run, e.x, e.y, e.color, e.boss ? 80 : 14 + Math.round(e.r / 2), e.boss ? 420 : 200, e.boss ? 1.4 : 0.6, e.boss ? 6 : 3);
  burst(run, e.x, e.y, '#ffffff', e.boss ? 30 : 5, e.boss ? 300 : 120, 0.35, 2);
  ring(run, e.x, e.y, e.color, e.r * 2.2, 0.35, 3);
  emit(run, 'kill', { big: e.boss || e.elite || e.r > 24 });
  if (e.boss) {
    run.bossesSlain += 1;
    shake(run, 22);
    flash(run, 0.8, '#ffffff');
    run.fx.slowmo = 1.6;
    run.fx.hitstop = 0.12;
    run.fx.bossDeath = { x: e.x, y: e.y, t: 0, color: e.color, r: e.r };
  } else if (e.elite) { shake(run, 5); run.fx.hitstop = Math.max(run.fx.hitstop, 0.04); }
  else shake(run, 1.5);
  dropGlim(run, e.x, e.y, e.glim);
  if (e.elite || (run.player.hp < run.player.stats.maxHp && run.rng.chance(e.heartChance ?? 0.012))) dropHeart(run, e.x, e.y);
  chargePulse(run, e.boss ? 100 : e.elite ? 18 : 4 + e.r * 0.12);
  if (e.onDeath) e.onDeath(run, e);
}

export function hurtPlayer(run, amount, fromX, fromY) {
  const p = run.player;
  if (p.inv > 0 || p.dead || run.demo === 'invincible') return;
  if (p.shield > 0) {
    p.shield -= 1;
    p.shieldCd = 0;
    p.inv = 0.6;
    emit(run, 'shield');
    ring(run, p.x, p.y, '#bff9ff', 50, 0.4, 5);
    burst(run, p.x, p.y, '#bff9ff', 18, 200, 0.5, 2);
    return;
  }
  const dmg = amount * run.diff.dmg;
  p.hp -= dmg;
  p.inv = PLAYER.hurtInvuln;
  p.hurtFlash = 0.35;
  run.hitsTaken += 1;
  run.wave.noHit = false;
  run.combo = Math.floor(run.combo / 2);
  run.mult = Math.min(COMBO.maxMult, 1 + Math.floor(run.combo / COMBO.killsPerStep));
  const a = Math.atan2(p.y - fromY, p.x - fromX);
  p.vx += Math.cos(a) * 380;
  p.vy += Math.sin(a) * 380;
  emit(run, 'hurt');
  shake(run, 12);
  flash(run, 0.35, '#ff4d6d');
  burst(run, p.x, p.y, '#ff6f9c', 22, 240, 0.6, 3);
  floatText(run, p.x, p.y - 30, `-${dmg}`, '#ff6f9c', 22);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    run.fx.slowmo = 1.5;
    burst(run, p.x, p.y, '#9cf7ff', 70, 360, 1.4, 4);
    ring(run, p.x, p.y, '#9cf7ff', 140, 0.9, 6);
    emit(run, 'playerDown');
  }
}

export function resolveCombat(run, dt) {
  const p = run.player;
  const s = p.stats;

  // Bolts against foes.
  for (let i = run.bullets.length - 1; i >= 0; i--) {
    const b = run.bullets[i];
    for (const e of run.enemies) {
      if (e.dead || b.hit.has(e.id)) continue;
      const rr = e.r + b.r;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > rr * rr) continue;
      b.hit.add(e.id);
      damageEnemy(run, e, b.dmg, { x: b.x - b.vx * 0.02, y: b.y - b.vy * 0.02, venom: true });
      burst(run, b.x, b.y, '#bff9ff', 4, 120, 0.25, 2);
      if (s.chain > 0 && run.rng.chance(Math.min(0.95, s.chain))) {
        const t = nearestEnemy(run, e.x, e.y, 220, new Set([e.id]));
        if (t) { arc(run, e.x, e.y, t.x, t.y); damageEnemy(run, t, b.dmg * 0.6, { quiet: false, noCrit: true }); }
      }
      if (b.pierce > 0) { b.pierce -= 1; continue; }
      if (b.bounce > 0 && !e.boss) {
        b.bounce -= 1;
        const nt = nearestEnemy(run, b.x, b.y, 320, b.hit);
        const a = nt ? Math.atan2(nt.y - b.y, nt.x - b.x) : Math.atan2(-b.vy, -b.vx) + run.rng.range(-0.8, 0.8);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * sp;
        b.vy = Math.sin(a) * sp;
        continue;
      }
      b.life = 0;
      break;
    }
    if (b.life <= 0) { run.bullets[i] = run.bullets[run.bullets.length - 1]; run.bullets.pop(); }
  }

  // Orbit pearls.
  if (s.orbit > 0) {
    for (const o of orbitPositions(run)) {
      for (const e of run.enemies) {
        if (e.dead) continue;
        e.pearlCd = Math.max(0, (e.pearlCd ?? 0) - dt / s.orbit);
        const rr = e.r + o.r;
        if (e.pearlCd <= 0 && (e.x - o.x) ** 2 + (e.y - o.y) ** 2 < rr * rr) {
          e.pearlCd = 0.35;
          damageEnemy(run, e, s.damage * 0.9, { x: p.x, y: p.y, knock: 160 });
          burst(run, o.x, o.y, '#fff2c8', 5, 100, 0.3, 2);
        }
      }
    }
  }

  // Ink pools.
  for (let i = run.inks.length - 1; i >= 0; i--) {
    const k = run.inks[i];
    k.life -= dt;
    if (k.life <= 0) { run.inks.splice(i, 1); continue; }
    for (const e of run.enemies) {
      if (e.dead) continue;
      if ((e.x - k.x) ** 2 + (e.y - k.y) ** 2 < (k.r + e.r) ** 2) {
        e.inkT = (e.inkT ?? 0) + dt;
        if (e.inkT > 0.25) { e.inkT = 0; damageEnemy(run, e, k.dps * 0.25, { quiet: true, noCrit: true }); }
      }
    }
  }

  // Poison ticks.
  for (const e of run.enemies) {
    if (e.dead || !e.poison) continue;
    e.poison -= dt;
    e.poisonTick = (e.poisonTick ?? 0) + dt;
    if (e.poisonTick >= 0.5) { e.poisonTick = 0; damageEnemy(run, e, e.poisonDps * 0.5, { quiet: true, noCrit: true }); }
    if (e.poison <= 0) e.poison = 0;
  }

  if (p.dead) return;

  // Foes' bodies against Pip.
  for (const e of run.enemies) {
    if (e.dead || e.harmless) continue;
    if (p.dashT > 0) checkPerfectDodge(run, e.x, e.y, e.r * 0.85);
    const rr = e.r * 0.85 + PLAYER.radius;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) hurtPlayer(run, e.contact ?? 1, e.x, e.y);
  }
  for (let i = run.enemyShots.length - 1; i >= 0; i--) {
    const b = run.enemyShots[i];
    if (p.dashT > 0) checkPerfectDodge(run, b.x, b.y, b.r);
    const rr = b.r + PLAYER.radius * 0.7;
    if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) {
      if (p.inv > 0) continue;
      hurtPlayer(run, 1, b.x, b.y);
      run.enemyShots.splice(i, 1);
    }
  }
  for (const h of run.hazards) {
    if (h.armed && (h.x - p.x) ** 2 + (h.y - p.y) ** 2 < (h.r + PLAYER.radius) ** 2) hurtPlayer(run, 1, h.x, h.y);
  }
}
