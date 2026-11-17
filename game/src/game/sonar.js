// The Deep Pulse as a travelling sonar wave. Released, it expands from Pip over half a second;
// as its front reaches each thing it acts on it: enemy shots dissolve, foes are pushed, stunned
// and hurt, and attacks being wound up are broken: a lining-up eel is stunned, a charging
// Spitbloom loses its volley, a swelling Blowfin is defused, a boss's telegraphed attack is
// interrupted and its weak point exposed. Queen Nacre's closed shell is forced open.

import { PLAYER } from '../config.js';
import { emit } from './state.js';
import { burst, ring, shake, flash, floatText, arc } from './effects.js';
import { damageEnemy } from './combat.js';

export function releaseSonar(run) {
  const p = run.player;
  const s = p.stats;
  // Glim Lens: glim gathered since the last pulse widens it.
  const lens = s.lens ? Math.min(0.6, (p.glimSincePulse ?? 0) * 0.012 * s.lens) : 0;
  const R = s.pulseRadius * (1 + lens);
  // Static Wake: a pulse right after a dash crackles with lightning.
  const charged = s.wake > 0 && p.sinceDash < 0.9;
  p.pulse = 0;
  p.glimSincePulse = 0;
  p.casting = 0.35;
  run.sonar.push({ x: p.x, y: p.y, r: 0, max: R, speed: R / 0.5, hit: new Set(), charged });
  emit(run, 'pulse');
  shake(run, 9);
  flash(run, 0.3, '#7ff6ff');
  ring(run, p.x, p.y, '#ffffff', 40, 0.3, 6);
  if (lens > 0.1) floatText(run, p.x, p.y - 40, `LENS +${Math.round(lens * 100)}%`, '#ffe27a', 16);
}

export function updateSonar(run, dt) {
  for (let i = run.sonar.length - 1; i >= 0; i--) {
    const w = run.sonar[i];
    w.r = Math.min(w.max, w.r + w.speed * dt);
    const r2hi = (w.r + 12) ** 2;
    // Shots inside the front dissolve into sparks.
    for (let j = run.enemyShots.length - 1; j >= 0; j--) {
      const b = run.enemyShots[j];
      const d2 = (b.x - w.x) ** 2 + (b.y - w.y) ** 2;
      if (d2 < r2hi) {
        burst(run, b.x, b.y, '#bff9ff', 2, 70, 0.3, 2);
        run.enemyShots[j] = run.enemyShots[run.enemyShots.length - 1];
        run.enemyShots.pop();
      }
    }
    for (const e of run.enemies) {
      if (e.dead || w.hit.has(e.id)) continue;
      const d = Math.hypot(e.x - w.x, e.y - w.y);
      if (d - e.r > w.r) continue;
      w.hit.add(e.id);
      sonarHit(run, w, e, d);
    }
    if (w.r >= w.max) run.sonar.splice(i, 1);
  }
}

function sonarHit(run, w, e, d) {
  const p = run.player;
  const a = Math.atan2(e.y - w.y, e.x - w.x);
  const falloff = 1 - Math.min(0.6, d / w.max * 0.6);
  let broke = null;
  if (e.boss) {
    if (e.state === 'roar') return; // a phase change shrugs the wave off
    if (e.boss === 'nacre' && e.state === 'closed') { e.invuln = false; e.forcedOpen = 2.5; broke = 'SHELL CRACKED'; }
    if (e.telegraph || e.state === 'ring' || e.state === 'lure' || e.state === 'fan' || e.state === 'pearls' || e.state === 'closed') {
      e.interrupt = true;
      broke = broke ?? 'INTERRUPTED';
    }
    e.exposed = Math.max(e.exposed ?? 0, 3.2);
    e.stun = Math.max(e.stun, 0.5);
  } else {
    if (e.kind === 'eel' && (e.state === 'aim' || e.state === 'lunge')) { e.state = 'move'; e.t = 0; broke = 'BROKEN'; }
    if (e.kind === 'spitbloom' && e.charging) { e.cool = 2.3; e.charging = false; broke = 'SILENCED'; }
    if (e.kind === 'blowfin' && e.state === 'swell') { e.state = 'move'; e.t = 0; e.r = 18 * (e.elite ? 1.4 : 1); broke = 'DEFUSED'; }
    e.kx += Math.cos(a) * 520 * falloff;
    e.ky += Math.sin(a) * 520 * falloff;
    e.stun = Math.max(e.stun, 1.3);
  }
  const dmg = PLAYER.pulseDamage * (p.stats.damage / PLAYER.bulletDamage) ** 0.6 * falloff * (1 + (p.stats.sonarDmg ?? 0));
  damageEnemy(run, e, dmg, { x: w.x, y: w.y, knock: 0 });
  if (broke) {
    floatText(run, e.x, e.y - e.r - 18, broke, '#7ff6ff', e.boss ? 26 : 16);
    run.score += Math.round(80 * run.mult * run.diff.score);
    run.comboT = Math.max(run.comboT, 2.4);
    ring(run, e.x, e.y, '#7ff6ff', e.r * 2, 0.4, 3);
    emit(run, 'interrupt');
  }
  if (w.charged) {
    // Static Wake: lightning leaps from each foe the wave touches.
    let n = 0;
    for (const o of run.enemies) {
      if (o === e || o.dead || n >= 2) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < 200) { arc(run, e.x, e.y, o.x, o.y, '#e0fbff'); damageEnemy(run, o, p.stats.damage * 1.2, { noCrit: true }); n++; }
    }
  }
}
