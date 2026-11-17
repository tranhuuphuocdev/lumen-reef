// Pip the lantern-jelly: swimming with momentum, the dash (brief invulnerability), aiming, the
// auto-fire trigger, the charged Deep Pulse, shell regrowth and the bubble ward.

import { PLAYER, WORLD } from '../config.js';
import { clamp } from '../core/math.js';
import { emit } from './state.js';
import { fireVolley } from './weapons.js';
import { burst, bubbles, ring, shake, flash } from './effects.js';
import { damageEnemy } from './combat.js';
import { releaseSonar } from './sonar.js';
import { isLastLight } from './attributes.js';

export function updatePlayer(run, ctl, dt) {
  const p = run.player;
  const s = p.stats;
  if (p.dead) return;
  p.bob += dt;
  p.inv = Math.max(0, p.inv - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.inkCd = Math.max(0, p.inkCd - dt);

  p.aim = Math.atan2(ctl.aimY - p.y, ctl.aimX - p.x);

  // Dash: a burst along the move direction (or the aim when standing still).
  // Maelstrom Fins: a second dash charge that refills on the cooldown.
  if (s.dashCharges > 1 && p.dashStock < s.dashCharges - 1) {
    p.stockT += dt;
    if (p.stockT >= s.dashCooldown) { p.stockT = 0; p.dashStock += 1; }
  }
  const canDash = p.dashCd <= 0 || p.dashStock > 0;
  if (ctl.dash && canDash && p.dashT <= 0) {
    if (p.dashCd > 0) p.dashStock -= 1;
    p.dashId += 1;
    const mx = ctl.move.x, my = ctl.move.y;
    const has = mx || my;
    p.dashDir = has ? { x: mx, y: my } : { x: Math.cos(p.aim), y: Math.sin(p.aim) };
    p.dashT = PLAYER.dashTime;
    p.dashCd = s.dashCooldown;
    p.inv = Math.max(p.inv, PLAYER.dashTime + 0.08);
    emit(run, 'dash');
    bubbles(run, p.x, p.y, 8);
    ring(run, p.x, p.y, '#9cf7ff', 34, 0.25, 3);
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    // Riptail: the dash itself slashes every foe it passes through, once per dash.
    if (s.riptail) {
      for (const e of run.enemies) {
        if (e.dead || e.riptailDash === p.dashId) continue;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 26) ** 2) {
          e.riptailDash = p.dashId;
          damageEnemy(run, e, s.damage * 2, { x: p.x, y: p.y, knock: 200 });
          burst(run, e.x, e.y, '#4dffc3', 10, 220, 0.4, 3);
        }
      }
    }
    p.vx = p.dashDir.x * PLAYER.dashSpeed;
    p.vy = p.dashDir.y * PLAYER.dashSpeed;
    if (s.ink > 0 && p.inkCd <= 0) {
      run.inks.push({ x: p.x, y: p.y, r: 26 + s.ink * 6, life: 2.2 + s.ink * 0.6, max: 2.2 + s.ink * 0.6, dps: 22 + s.ink * 14 });
      p.inkCd = 0.03;
    }
  } else {
    const ax = ctl.move.x * PLAYER.accel;
    const ay = ctl.move.y * PLAYER.accel;
    p.vx += ax * dt;
    p.vy += ay * dt;
    const k = Math.exp(-PLAYER.friction * dt);
    p.vx *= k;
    p.vy *= k;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > s.speed) { p.vx *= s.speed / sp; p.vy *= s.speed / sp; }
  }

  p.x = clamp(p.x + p.vx * dt, WORLD.wall + PLAYER.radius, WORLD.w - WORLD.wall - PLAYER.radius);
  p.y = clamp(p.y + p.vy * dt, WORLD.wall + PLAYER.radius, WORLD.h - WORLD.wall - PLAYER.radius);

  if (ctl.fire && p.fireCd <= 0) {
    fireVolley(run);
    p.fireCd = 1 / (s.fireRate * (p.surge > 0 ? 1.6 : 1));
  }

  // Deep Pulse: charged by kills, clears enemy shots and pushes everything back.
  if (ctl.pulse && p.pulse >= PLAYER.pulseCharge) releaseSonar(run);

  if (s.regen > 0 && p.hp < s.maxHp) {
    p.regenT += dt;
    const every = 30 / s.regen;
    if (p.regenT >= every) {
      p.regenT = 0;
      p.hp += 1;
      emit(run, 'heart');
      burst(run, p.x, p.y, '#ff9ec0', 14, 120, 0.6, 3);
    }
  }
  if (s.shieldMax > 0 && p.shield < s.shieldMax) {
    p.shieldCd += dt;
    if (p.shieldCd >= 11) { p.shieldCd = 0; p.shield += 1; emit(run, 'shield'); }
  }
  if (run.rng.chance(dt * 3)) bubbles(run, p.x, p.y + 10, 1);
}

export function releasePulse(run) {
  if (run.player.pulse >= PLAYER.pulseCharge) releaseSonar(run);
}

export function chargePulse(run, amount) {
  const p = run.player;
  const before = p.pulse;
  p.pulse = Math.min(PLAYER.pulseCharge, p.pulse + amount * p.stats.pulseRate * (isLastLight(run) ? 2 : 1));
  if (before < PLAYER.pulseCharge && p.pulse >= PLAYER.pulseCharge) emit(run, 'pulseReady');
}
