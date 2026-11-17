// The in-dive HUD: shells (health) and bubble ward, the Deep Pulse gauge, dash readiness, wave
// name and progress, score with the combo multiplier and its fuse, the glim level bar, the boss
// health bar, owned mutations, the crosshair and the banners announcing waves and bosses.

import { VIEW, PLAYER, WAVES_TOTAL } from '../config.js';
import { formatScore } from '../core/math.js';
import { text, panel, bar, keycap } from './widgets.js';
import { drawHeart } from '../render/projectiles.js';
import { drawMutationIcon } from './icons.js';
import { waveProgress } from '../game/waves.js';
import { withAlpha } from '../render/glow.js';

export function drawHud(ctx, run, ui, t) {
  const p = run.player;
  drawVitals(ctx, run, ui, t);
  drawWaveHeader(ctx, run, t);
  drawScore(ctx, run, ui, t);
  drawHint(ctx, ui);
  if (ui.volumeT > 0) text(ctx, `VOLUME ${Math.round((ui.volume ?? 0.8) * 100)}%`, VIEW.w / 2, VIEW.h - 90, { size: 16, weight: 800, align: 'center', color: '#cfefff', alpha: Math.min(1, ui.volumeT * 2) });
  drawLevelBar(ctx, run);
  drawMutationTray(ctx, run);
  if (run.wave.boss && !run.wave.boss.dead && run.wave.phase === 'fight') drawBossBar(ctx, run.wave.boss, ui, t);
  drawBanner(ctx, ui, t);
  if (!p.dead) drawCrosshair(ctx, ui.mouse.x, ui.mouse.y, p.fireCd, t);
}

function drawVitals(ctx, run, ui, t) {
  const p = run.player;
  const s = p.stats;
  // A lost shell cracks and flashes for a moment.
  if (ui.lastHp !== undefined && p.hp < ui.lastHp) ui.heartLost = { i: Math.floor(p.hp), t: 0.6 };
  ui.lastHp = p.hp;
  if (ui.heartLost) ui.heartLost.t -= 1 / 60;
  panel(ctx, 18, 16, 54 + s.maxHp * 34, 92, { alpha: 0.6 });
  for (let i = 0; i < s.maxHp; i++) {
    const x = 46 + i * 34, y = 44;
    const full = i < p.hp;
    const beat = full && p.hp === 1 ? 1 + 0.15 * Math.sin(t * 10) : 1;
    const lost = ui.heartLost && ui.heartLost.t > 0 && ui.heartLost.i === i;
    const jx = lost ? Math.sin(t * 60) * 3 : 0;
    drawHeart(ctx, x + jx, y, 12 * beat * (lost ? 1 + ui.heartLost.t * 0.6 : 1), full ? '#ff6f9c' : lost ? '#ffffff' : 'rgba(255, 111, 156, 0.18)');
    if (full) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - 4, y - 4, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }
  for (let i = 0; i < s.shieldMax; i++) {
    const x = 46 + (s.maxHp + i) * 34, y = 44;
    ctx.strokeStyle = i < p.shield ? '#bff9ff' : 'rgba(191, 249, 255, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Pulse gauge.
  const ready = p.pulse >= PLAYER.pulseCharge;
  const pw = 54 + s.maxHp * 34 - 120;
  text(ctx, 'PULSE', 34, 88, { size: 13, weight: 800, color: ready ? '#7ff6ff' : '#7fa6c0', stroke: false, spacing: 1 });
  bar(ctx, 86, 78, Math.max(60, pw), 12, p.pulse / PLAYER.pulseCharge, ready ? '#7ff6ff' : '#3aa6c8');
  if (ready) {
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
    keycap(ctx, 'E', 86 + Math.max(60, pw) + 8, 90, { size: 12 });
    ctx.restore();
  }
  // Surge: a gold gauge that drains while fire rate is boosted.
  if (p.surge > 0) {
    text(ctx, 'SURGE', 34, 128, { size: 14, weight: 900, color: '#ffd166', glow: '#ffd166', spacing: 2 });
    bar(ctx, 96, 118, 120, 10, p.surge / 4, '#ffd166');
  }
  // Dash ring beside the vitals.
  const dx = 54 + s.maxHp * 34 + 44, dy = 58;
  const frac = 1 - p.dashCd / s.dashCooldown;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(dx, dy, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = frac >= 1 ? '#9cf7ff' : '#3a7ea0';
  ctx.beginPath(); ctx.arc(dx, dy, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
  text(ctx, 'DASH', dx, dy + 4, { size: 10, weight: 800, align: 'center', color: frac >= 1 ? '#ffffff' : '#7fa6c0', stroke: false });
}

function drawWaveHeader(ctx, run) {
  const w = run.wave;
  const cx = VIEW.w / 2;
  text(ctx, `WAVE ${w.n} / ${WAVES_TOTAL}`, cx, 38, { size: 24, weight: 900, align: 'center', color: '#ffffff', spacing: 3 });
  text(ctx, (w.name ?? '').toUpperCase(), cx, 60, { size: 13, weight: 700, align: 'center', color: '#9cd8ea', spacing: 2 });
  if (!(w.boss && !w.boss.dead)) bar(ctx, cx - 140, 70, 280, 6, waveProgress(run), '#4dffc3');
}

function drawScore(ctx, run, ui, t) {
  const rx = VIEW.w - 24;
  // The shown score counts up toward the real one.
  ui.shownScore = ui.shownScore === undefined || ui.shownScore > run.score ? run.score : ui.shownScore + (run.score - ui.shownScore) * 0.18;
  const climbing = run.score - ui.shownScore > 1;
  text(ctx, formatScore(Math.round(ui.shownScore)), rx, 50, { size: climbing ? 40 : 38, weight: 900, align: 'right', color: climbing ? '#fff6d0' : '#ffffff' });
  text(ctx, 'SCORE', rx, 70, { size: 12, weight: 800, align: 'right', color: '#7fa6c0', stroke: false, spacing: 2 });
  if (run.combo > 1) {
    const pop = 1 + Math.max(0, run.comboT - 2.1) * 1.2;
    const col = run.mult >= 6 ? '#ff6f9c' : run.mult >= 3 ? '#ffd166' : '#7ff6ff';
    text(ctx, `x${run.mult}`, rx, 108, { size: Math.round(32 * pop), weight: 900, align: 'right', color: col, glow: col });
    text(ctx, `${run.combo} CHAIN`, rx - 70, 104, { size: 14, weight: 800, align: 'right', color: '#cfefff', spacing: 1 });
    bar(ctx, rx - 170, 116, 100, 5, run.comboT / 2.4, col);
  }
}

function drawLevelBar(ctx, run) {
  const y = VIEW.h - 26;
  const x = 90, w = VIEW.w - 180;
  bar(ctx, x, y, w, 12, run.xp / run.xpNext, '#ffe27a');
  text(ctx, `LV ${run.level}`, x - 12, y + 11, { size: 18, weight: 900, align: 'right', color: '#ffe27a' });
  text(ctx, `${run.xp} / ${run.xpNext} GLIM`, x + w + 10, y + 11, { size: 12, weight: 700, color: '#d9c98a', stroke: false });
}

function drawMutationTray(ctx, run) {
  const ids = Object.keys(run.mutations);
  let x = VIEW.w - 30, y = VIEW.h - 62;
  for (let i = ids.length - 1; i >= 0; i--) {
    drawMutationIcon(ctx, ids[i], x, y, 15);
    const lvl = run.mutations[ids[i]];
    if (lvl > 1) text(ctx, `${lvl}`, x + 11, y + 14, { size: 12, weight: 900, align: 'center', color: '#ffffff' });
    x -= 38;
  }
}

function drawBossBar(ctx, boss, ui, t) {
  const w = 620, x = (VIEW.w - w) / 2, y = 92;
  const frac = Math.max(0, boss.hp / boss.maxHp);
  // A pale trail shows the damage just dealt, then drains to match.
  ui.bossGhost = ui.bossGhost === undefined || ui.bossGhost < frac ? frac : ui.bossGhost + (frac - ui.bossGhost) * 0.04;
  const phase = (boss.phaseIdx ?? 0) + 1;
  const names = { maw: ['HUNTER', 'UNDERTOW', 'ABYSSAL FRENZY'], nacre: ['PEARL QUEEN', 'PEARL STORM', 'ABYSSAL CROWN'] }[boss.boss];
  text(ctx, boss.name, VIEW.w / 2, y - 2, { size: 18, weight: 900, align: 'center', color: '#ffd1dd', spacing: 4 });
  bar(ctx, x, y + 6, w, 16, ui.bossGhost, '#ffe9ef', { radius: 4, shine: false });
  bar(ctx, x, y + 6, w, 16, frac, boss.invuln ? '#9b8ac9' : boss.exposed > 0 ? '#ffd166' : boss.color, { radius: 4, back: 'rgba(0,0,0,0)' });
  text(ctx, `PHASE ${phase} · ${names[phase - 1]}`, x + w / 2, y + 40, { size: 12, weight: 800, align: 'center', color: boss.exposed > 0 ? '#ffd166' : '#ff9ab8', stroke: true, spacing: 2 });
  ctx.strokeStyle = withAlpha(boss.color, 0.8);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y + 6, w, 16);
  for (const f of [0.25, 0.55]) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + w * f, y + 6, 2, 16); }
}

function drawHint(ctx, ui) {
  const h = ui.hint;
  if (!h || h.life <= 0) return;
  const a = Math.min(1, (h.max - h.life) * 3, h.life);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 16px "Trebuchet MS", sans-serif`;
  const w = ctx.measureText(h.text).width + 48;
  panel(ctx, (VIEW.w - w) / 2, VIEW.h - 100, w, 38, { alpha: 0.72, radius: 19, border: 0.5 });
  ctx.restore();
  text(ctx, h.text, VIEW.w / 2, VIEW.h - 75, { size: 16, weight: 700, align: 'center', color: '#e6fbff', stroke: false, alpha: a });
}

function drawBanner(ctx, ui, t) {
  const b = ui.banner;
  if (!b || b.life <= 0) return;
  const k = b.life / b.max;
  const a = Math.min(1, (1 - k) * 6, k * 3);
  const cy = VIEW.h * 0.36;
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
