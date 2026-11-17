// The in-dive HUD, laid out so a single frame explains the game. Top: shells (health) on the left,
// the tide title with its WIN / LOSE conditions and tide track in the middle, score, best and the
// chain multiplier on the right. Sides: the MUTATIONS build and the INCOMING list. Bottom: the
// ability bar (fire, dash, pulse), movement help and the pause / sound / restart keys. Over play:
// the boss bar, banners, hints and the crosshair.

import { VIEW, WAVES_TOTAL } from '../config.js';
import { formatScore } from '../core/math.js';
import { text, panel, bar } from './widgets.js';
import { drawHeart } from '../render/projectiles.js';
import { withAlpha } from '../render/glow.js';
import { drawObjectives, drawTideTrack, drawIncoming, drawStatus, drawBuild, drawAbilityBar, drawControlsAndKeys } from './hud-panels.js';
import { BOSS_PHASES } from '../game/bosses.js';
import { routeOf } from '../game/tides.js';
import { drawCallout } from './callout.js';

export function drawHud(ctx, run, ui, t) {
  const p = run.player;
  drawShells(ctx, run, ui, t);
  drawTideHeader(ctx, run);
  drawScorePanel(ctx, run, ui);
  const statusH = drawStatus(ctx, run, 18, 92, t);
  drawBuild(ctx, run, 18, 92 + statusH);
  drawIncoming(ctx, run, VIEW.w - 268, 150);
  drawAbilityBar(ctx, run, ui, t);
  drawControlsAndKeys(ctx, ui);
  if (run.wave.boss && !run.wave.boss.dead && run.wave.phase === 'fight') drawBossBar(ctx, run.wave.boss, ui);
  drawHint(ctx, ui);
  if (ui.volumeT > 0) text(ctx, `VOLUME ${Math.round((ui.volume ?? 0.8) * 100)}%`, VIEW.w / 2, VIEW.h - 150, { size: 16, weight: 800, align: 'center', color: '#cfefff', alpha: Math.min(1, ui.volumeT * 2) });
  drawBanner(ctx, ui);
  drawCallout(ctx, ui, run);
  if (!p.dead) drawCrosshair(ctx, ui.mouse.x, ui.mouse.y, p.fireCd, t);
}

function drawShells(ctx, run, ui, t) {
  const p = run.player;
  const s = p.stats;
  // A lost shell cracks and flashes for a moment.
  if (ui.lastHp !== undefined && p.hp < ui.lastHp) ui.heartLost = { i: Math.floor(p.hp), t: 0.6 };
  ui.lastHp = p.hp;
  if (ui.heartLost) ui.heartLost.t -= 1 / 60;
  panel(ctx, 18, 14, 250, 68, { alpha: 0.72, border: 0.4 });
  text(ctx, 'SHELLS', 32, 36, { size: 13, weight: 900, color: '#ff9ec0', stroke: false, spacing: 2 });
  text(ctx, `${Math.max(0, Math.ceil(p.hp))} / ${s.maxHp}`, 254, 36, { size: 13, weight: 900, align: 'right', color: '#ffffff', stroke: false });
  const n = s.maxHp + s.shieldMax;
  const step = Math.min(30, 220 / Math.max(1, n));
  for (let i = 0; i < s.maxHp; i++) {
    const x = 42 + i * step, y = 60;
    const full = i < p.hp;
    const beat = full && p.hp === 1 ? 1 + 0.15 * Math.sin(t * 10) : 1;
    const lost = ui.heartLost && ui.heartLost.t > 0 && ui.heartLost.i === i;
    const jx = lost ? Math.sin(t * 60) * 3 : 0;
    drawHeart(ctx, x + jx, y, 11 * beat * (lost ? 1 + ui.heartLost.t * 0.6 : 1), full ? '#ff6f9c' : lost ? '#ffffff' : 'rgba(255, 111, 156, 0.18)');
    if (full) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - 4, y - 4, 2.3, 0, Math.PI * 2); ctx.fill(); }
  }
  for (let i = 0; i < s.shieldMax; i++) {
    const x = 42 + (s.maxHp + i) * step, y = 60;
    ctx.strokeStyle = i < p.shield ? '#bff9ff' : 'rgba(191, 249, 255, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTideHeader(ctx, run) {
  const w = run.wave;
  const cx = VIEW.w / 2;
  text(ctx, `TIDE ${w.n} / ${WAVES_TOTAL}`, cx, 32, { size: 24, weight: 900, align: 'center', color: '#ffffff', spacing: 3 });
  const route = routeOf(run);
  const label = route.id === 'slack' ? (w.name ?? '').toUpperCase() : `${(w.name ?? '').toUpperCase()} · ${route.name.toUpperCase()} ${route.reward.split(':')[0]}`;
  text(ctx, label, cx, 51, { size: 12, weight: 800, align: 'center', color: route.id === 'slack' ? '#9cd8ea' : route.color, spacing: 2 });
  drawTideTrack(ctx, run, 64);
  drawObjectives(ctx, run, 76);
}

function drawScorePanel(ctx, run, ui) {
  const x = VIEW.w - 268, w = 250;
  panel(ctx, x, 14, w, 126, { alpha: 0.72, border: 0.4 });
  // The shown score counts up toward the real one.
  ui.shownScore = ui.shownScore === undefined || ui.shownScore > run.score ? run.score : ui.shownScore + (run.score - ui.shownScore) * 0.18;
  const climbing = run.score - ui.shownScore > 1;
  text(ctx, 'SCORE', x + 14, 36, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 2 });
  text(ctx, formatScore(Math.round(ui.shownScore)), x + w - 14, 44, { size: climbing ? 32 : 30, weight: 900, align: 'right', color: climbing ? '#fff6d0' : '#ffffff' });
  text(ctx, `BEST ${formatScore(Math.max(ui.best ?? 0, run.score))}`, x + w - 14, 64, { size: 12, weight: 800, align: 'right', color: '#ffd166', stroke: false });
  text(ctx, `${run.diff.name.toUpperCase()} ×${run.diff.score}`, x + 14, 64, { size: 11, weight: 800, color: '#7fa6c0', stroke: false });
  const col = run.mult >= 6 ? '#ff6f9c' : run.mult >= 3 ? '#ffd166' : '#7ff6ff';
  text(ctx, 'CHAIN', x + 14, 92, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 2 });
  text(ctx, `${run.combo}`, x + 78, 92, { size: 18, weight: 900, color: '#ffffff', stroke: false });
  text(ctx, `×${run.mult}`, x + w - 14, 100, { size: 34, weight: 900, align: 'right', color: col, glow: run.mult > 1 ? col : null });
  bar(ctx, x + 14, 106, 150, 6, run.combo > 0 ? run.comboT / 2.4 : 0, col);
  text(ctx, 'next ×: 6 kills · 25 = SURGE', x + 14, 128, { size: 11, weight: 700, color: '#7fa6c0', stroke: false });
}

function drawBossBar(ctx, boss, ui) {
  const w = 560, x = (VIEW.w - w) / 2, y = 118;
  const frac = Math.max(0, boss.hp / boss.maxHp);
  // A pale trail shows the damage just dealt, then drains to match.
  ui.bossGhost = ui.bossGhost === undefined || ui.bossGhost < frac ? frac : ui.bossGhost + (frac - ui.bossGhost) * 0.04;
  const phase = (boss.phaseIdx ?? 0) + 1;
  const names = BOSS_PHASES[boss.boss];
  text(ctx, boss.name, VIEW.w / 2, y + 2, { size: 16, weight: 900, align: 'center', color: '#ffd1dd', spacing: 4 });
  bar(ctx, x, y + 8, w, 14, ui.bossGhost, '#ffe9ef', { radius: 4, shine: false });
  bar(ctx, x, y + 8, w, 14, frac, boss.invuln ? '#9b8ac9' : boss.exposed > 0 ? '#ffd166' : boss.color, { radius: 4, back: 'rgba(0,0,0,0)' });
  ctx.strokeStyle = withAlpha(boss.color, 0.8);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y + 8, w, 14);
  for (const f of [0.25, 0.55]) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + w * f, y + 8, 2, 14); }
  const tip = boss.state === 'roar' ? 'ENRAGED: it shrugs off everything, keep moving' : boss.exposed > 0 ? 'WEAK POINT OPEN: hit it now' : boss.invuln ? 'shelled: PULSE (E) cracks it' : 'PULSE (E) interrupts attacks';
  text(ctx, `PHASE ${phase} · ${names[phase - 1]}   —   ${tip}`, VIEW.w / 2, y + 40, { size: 12, weight: 800, align: 'center', color: boss.exposed > 0 ? '#ffd166' : '#ff9ab8', spacing: 1 });
}

function drawHint(ctx, ui) {
  const h = ui.hint;
  if (!h || h.life <= 0) return;
  const a = Math.min(1, (h.max - h.life) * 3, h.life);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 15px "Trebuchet MS", sans-serif`;
  const w = ctx.measureText(h.text).width + 48;
  panel(ctx, (VIEW.w - w) / 2, VIEW.h - 136, w, 34, { alpha: 0.8, radius: 17, border: 0.5 });
  ctx.restore();
  text(ctx, h.text, VIEW.w / 2, VIEW.h - 114, { size: 15, weight: 700, align: 'center', color: '#e6fbff', stroke: false, alpha: a });
}

function drawBanner(ctx, ui) {
  const b = ui.banner;
  if (!b || b.life <= 0) return;
  const k = b.life / b.max;
  const a = Math.min(1, (1 - k) * 6, k * 3);
  const cy = VIEW.h * 0.4;
  ctx.save();
  ctx.globalAlpha = a * 0.75;
  const g = ctx.createLinearGradient(0, 0, VIEW.w, 0);
  g.addColorStop(0, 'rgba(2, 12, 26, 0)');
  g.addColorStop(0.5, 'rgba(2, 12, 26, 0.85)');
  g.addColorStop(1, 'rgba(2, 12, 26, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, cy - 60, VIEW.w, 120);
  ctx.restore();
  const slide = (1 - Math.min(1, (1 - k) * 5)) * 60;
  text(ctx, b.title, VIEW.w / 2 + slide, cy + 8, { size: b.big ? 56 : 46, weight: 900, align: 'center', color: b.color, glow: b.color, alpha: a, spacing: 6 });
  if (b.sub) text(ctx, b.sub, VIEW.w / 2 - slide, cy + 44, { size: 18, weight: 700, align: 'center', color: '#cfefff', alpha: a, spacing: 3 });
}

export function drawCrosshair(ctx, x, y, cd, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(200, 250, 255, 0.9)';
  ctx.lineWidth = 2;
  const r = 11 + Math.min(4, cd * 30);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + t * 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, a + 0.25, a + Math.PI / 2 - 0.25);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1.5, -1.5, 3, 3);
  ctx.restore();
}
