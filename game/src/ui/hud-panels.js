// The HUD's information panels, so one glance at the screen explains the dive: the win and lose
// conditions, the tide track, the INCOMING list of what this tide still holds (with how each foe
// fights), the MUTATIONS build with its growth pips, the ability bar (fire, dash, pulse with their
// keys and charge) and the pause, sound and restart keys.

import { VIEW, PLAYER, WAVES_TOTAL, BOSS_WAVES } from '../config.js';
import { ENEMY_KINDS } from '../game/enemies.js';
import { BOSS_INFO } from '../game/bosses.js';
import { WAVE_NAMES } from '../game/waves.js';
import { MUTATION_BY_ID, RARITY } from '../game/upgrades.js';
import { text, panel, bar, keycap } from './widgets.js';
import { drawMutationIcon } from './icons.js';
import { withAlpha } from '../render/glow.js';
import { ASPECTS, ASPECT_ORDER, formName, isLastLight } from '../game/attributes.js';

const TACTIC = {
  whorl: 'swarms', eel: 'lunges', blowfin: 'bursts', spitbloom: 'spits spores',
  ironclaw: 'armoured', flicker: 'darts in packs', broodbell: 'splits in 4',
};

// WIN and LOSE pills under the tide title.
export function drawObjectives(ctx, run, y) {
  const left = WAVES_TOTAL - run.wave.n;
  const win = left > 0 ? `survive ${left} more tide${left > 1 ? 's' : ''}, slay Queen Nacre` : 'slay Queen Nacre';
  const hp = Math.max(0, Math.ceil(run.player.hp));
  const lose = `all shells break (${hp} left)`;
  ctx.font = `700 14px "Trebuchet MS", sans-serif`;
  const w1 = ctx.measureText(win).width + 66, w2 = ctx.measureText(lose).width + 70;
  const x0 = VIEW.w / 2 - (w1 + w2 + 10) / 2;
  pill(ctx, x0, y, w1, 'WIN', win, '#4dffc3');
  pill(ctx, x0 + w1 + 10, y, w2, 'LOSE', lose, '#ff6f9c');
}

function pill(ctx, x, y, w, tag, body, col) {
  ctx.save();
  ctx.fillStyle = 'rgba(3, 14, 30, 0.78)';
  ctx.strokeStyle = withAlpha(col, 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(ctx, tag, x + 12, y + 17, { size: 13, weight: 900, color: col, stroke: false, spacing: 1 });
  text(ctx, body, x + (tag === 'WIN' ? 52 : 56), y + 17, { size: 14, weight: 700, color: '#e6fbff', stroke: false });
}

// Ten dots for the ten tides; boss tides are crowned.
export function drawTideTrack(ctx, run, y) {
  const n = run.wave.n;
  const gap = 18;
  const x0 = VIEW.w / 2 - ((WAVES_TOTAL - 1) * gap) / 2;
  for (let i = 1; i <= WAVES_TOTAL; i++) {
    const x = x0 + (i - 1) * gap;
    const boss = !!BOSS_WAVES[i];
    const done = i < n, cur = i === n;
    ctx.fillStyle = cur ? '#ffffff' : done ? '#4dffc3' : 'rgba(160, 210, 230, 0.25)';
    ctx.beginPath();
    if (boss) { ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); }
    else ctx.arc(x, y, cur ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (boss && !done) { ctx.strokeStyle = '#ff6f9c'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
}

// What this tide still holds, grouped by kind, with how each kind fights.
export function drawIncoming(ctx, run, x, y) {
  const counts = new Map();
  for (const k of run.wave.queue ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
  let onField = 0;
  for (const e of run.enemies) {
    if (e.dead) continue;
    if (e.boss) continue;
    onField++;
    counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }
  const boss = run.wave.boss && !run.wave.boss.dead ? run.wave.boss : null;
  const pendingBoss = !boss && BOSS_WAVES[run.wave.n] && run.wave.phase === 'intro' ? BOSS_WAVES[run.wave.n] : null;
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((t, r) => t + r[1], 0) + (boss || pendingBoss ? 1 : 0);
  const w = 250, h = 58 + Math.max(1, rows.length + (boss || pendingBoss ? 1 : 0)) * 21 + 40;
  panel(ctx, x, y, w, h, { alpha: 0.72, border: 0.4 });
  text(ctx, 'INCOMING', x + 14, y + 24, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 2 });
  text(ctx, `${total} left`, x + w - 14, y + 24, { size: 13, weight: 800, align: 'right', color: '#ffffff', stroke: false });
  let ry = y + 50;
  const bossId = boss?.boss ?? pendingBoss;
  if (bossId) {
    const info = BOSS_INFO[bossId];
    dot(ctx, x + 20, ry - 5, info.color, true);
    text(ctx, bossId === 'maw' ? 'Undertow Maw' : 'Queen Nacre', x + 34, ry, { size: 14, weight: 900, color: info.color, stroke: false });
    text(ctx, 'BOSS', x + w - 14, ry, { size: 12, weight: 900, align: 'right', color: '#ff6f9c', stroke: false, spacing: 1 });
    ry += 21;
  }
  for (const [kind, c] of rows) {
    const k = ENEMY_KINDS[kind];
    dot(ctx, x + 20, ry - 5, k.color);
    text(ctx, k.name, x + 34, ry, { size: 14, weight: 800, color: k.color, stroke: false });
    text(ctx, TACTIC[kind], x + 136, ry, { size: 12, weight: 600, color: '#9cc0d4', stroke: false });
    text(ctx, `×${c}`, x + w - 14, ry, { size: 14, weight: 900, align: 'right', color: '#ffffff', stroke: false });
    ry += 21;
  }
  if (!rows.length && !bossId) { text(ctx, 'the tide is calm', x + 20, ry, { size: 13, weight: 600, color: '#9cc0d4', stroke: false }); ry += 21; }
  text(ctx, `${onField} on the reef now`, x + 14, ry + 6, { size: 12, weight: 600, color: '#7fa6c0', stroke: false });
  const next = run.wave.n + 1;
  if (next <= WAVES_TOTAL) text(ctx, `NEXT: ${WAVE_NAMES[next]}${BOSS_WAVES[next] ? ' · BOSS' : ''}`, x + 14, ry + 26, { size: 12, weight: 900, color: BOSS_WAVES[next] ? '#ff9ab8' : '#ffd166', stroke: false, spacing: 1 });
}

function dot(ctx, x, y, col, big = false) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, big ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

// The build so far: each mutation with its glyph, name and growth pips.
export function drawBuild(ctx, run, x, y) {
  const ids = Object.keys(run.mutations);
  const rowsShown = Math.min(ids.length, 9);
  const w = 250, h = 40 + Math.max(1, rowsShown) * 22 + 8;
  panel(ctx, x, y, w, h, { alpha: 0.72, border: 0.4 });
  text(ctx, 'MUTATIONS', x + 14, y + 24, { size: 13, weight: 900, color: '#c9a8ff', stroke: false, spacing: 2 });
  text(ctx, `LV ${run.level}`, x + w - 14, y + 24, { size: 13, weight: 900, align: 'right', color: '#ffe27a', stroke: false });
  if (!ids.length) { text(ctx, 'level up to choose one', x + 14, y + 52, { size: 13, weight: 600, color: '#9cc0d4', stroke: false }); return; }
  ids.slice(-rowsShown).forEach((id, i) => {
    const m = MUTATION_BY_ID[id];
    const ry = y + 50 + i * 22;
    drawMutationIcon(ctx, id, x + 22, ry - 5, 9);
    text(ctx, m.name, x + 38, ry, { size: 14, weight: 800, color: '#e6fbff', stroke: false });
    const lvl = run.mutations[id];
    const col = RARITY[m.rarity].color;
    for (let j = 0; j < m.max; j++) {
      ctx.fillStyle = j < lvl ? col : 'rgba(255,255,255,0.14)';
      ctx.fillRect(x + w - 14 - (m.max - j) * 9, ry - 9, 6, 8);
    }
  });
}

// The ability bar: what each key does right now, with its charge.
export function drawAbilityBar(ctx, run, ui, t) {
  const p = run.player;
  const s = p.stats;
  const slotW = 112, slotH = 60, gap = 10;
  const slots = [
    { key: 'LMB', name: 'FIRE', info: `${s.projectiles} bolt${s.projectiles > 1 ? 's' : ''} · ${(s.fireRate * (p.surge > 0 ? 1.6 : 1)).toFixed(1)}/s`, frac: 1, col: p.surge > 0 ? '#ffd166' : '#7ff6ff' },
    { key: 'SPACE', name: 'DASH', info: p.dashCd <= 0 ? 'READY' : `${p.dashCd.toFixed(1)}s`, frac: 1 - p.dashCd / s.dashCooldown, col: '#9cf7ff' },
    { key: 'E', name: 'PULSE', info: p.pulse >= PLAYER.pulseCharge ? 'READY' : `${Math.floor(p.pulse)}%`, frac: p.pulse / PLAYER.pulseCharge, col: '#5ff0ff', glow: p.pulse >= PLAYER.pulseCharge },
  ];
  const total = slots.length * slotW + (slots.length - 1) * gap;
  const x0 = VIEW.w / 2 - total / 2, y = VIEW.h - slotH - 14;
  // Glim (experience) bar above the slots.
  bar(ctx, x0, y - 14, total, 7, run.xp / run.xpNext, '#ffe27a');
  text(ctx, `${run.xp}/${run.xpNext} GLIM`, x0 + total, y - 20, { size: 11, weight: 800, align: 'right', color: '#d9c98a', stroke: false });
  text(ctx, `LV ${run.level}`, x0, y - 20, { size: 12, weight: 900, color: '#ffe27a', stroke: false });
  slots.forEach((sl, i) => {
    const x = x0 + i * (slotW + gap);
    ctx.save();
    if (sl.glow) { ctx.shadowColor = sl.col; ctx.shadowBlur = 18 + Math.sin(t * 8) * 6; }
    panel(ctx, x, y, slotW, slotH, { color: sl.col, alpha: 0.82, border: sl.frac >= 1 ? 0.9 : 0.35, radius: 10 });
    ctx.restore();
    ctx.fillStyle = withAlpha(sl.col, 0.18);
    ctx.fillRect(x + 2, y + slotH - 2 - (slotH - 4) * Math.max(0, Math.min(1, sl.frac)), slotW - 4, (slotH - 4) * Math.max(0, Math.min(1, sl.frac)));
    keycap(ctx, sl.key, x + 8, y + 20, { size: 11 });
    text(ctx, sl.name, x + slotW - 10, y + 22, { size: 15, weight: 900, align: 'right', color: '#ffffff', stroke: false, spacing: 1 });
    text(ctx, sl.info, x + slotW / 2, y + 47, { size: 13, weight: 800, align: 'center', color: sl.frac >= 1 ? sl.col : '#9cc0d4', stroke: false });
  });
  if (p.surge > 0) text(ctx, `SURGE ${p.surge.toFixed(1)}s`, x0 + total / 2, y - 32, { size: 15, weight: 900, align: 'center', color: '#ffd166', glow: '#ffd166', spacing: 2 });
}

// Movement help on the left, system keys on the right (clickable).
export function drawControlsAndKeys(ctx, ui) {
  const y = VIEW.h - 28;
  let x = 22;
  for (const k of ['W', 'A', 'S', 'D']) x += keycap(ctx, k, x, y, { size: 11 }) + 3;
  text(ctx, 'swim', x + 4, y - 3, { size: 13, weight: 700, color: '#cfefff', stroke: false });
  x += 46;
  x += keycap(ctx, 'MOUSE', x, y, { size: 11 }) + 4;
  text(ctx, 'aim', x + 2, y - 3, { size: 13, weight: 700, color: '#cfefff', stroke: false });
  text(ctx, 'dash through a shot = PERFECT DODGE', 22, y - 30, { size: 12, weight: 700, color: '#ffd166', stroke: false });
  const keys = [['P', 'PAUSE', 'pause'], ['M', ui.muted ? 'MUTED' : 'SOUND', 'mute'], ['R', 'RESTART', 'restart']];
  let bx = VIEW.w - 22 - keys.length * 74;
  for (const [k, label, id] of keys) {
    const over = ui.mouse.x >= bx && ui.mouse.x <= bx + 66 && ui.mouse.y >= VIEW.h - 66 && ui.mouse.y <= VIEW.h - 12;
    ui.buttons.push({ id: `key:${id}`, x: bx, y: VIEW.h - 66, w: 66, h: 54 });
    panel(ctx, bx, VIEW.h - 66, 66, 54, { alpha: over ? 0.9 : 0.7, border: over ? 0.9 : 0.35, radius: 10 });
    keycap(ctx, k, bx + 23, VIEW.h - 40, { size: 11 });
    text(ctx, label, bx + 33, VIEW.h - 19, { size: 11, weight: 900, align: 'center', color: '#cfefff', stroke: false, spacing: 1 });
    bx += 74;
  }
}

// Pip's status sheet: form, the four Aspects with their evolution marks, live combat stats and
// the mutations that built them.
export function drawStatus(ctx, run, x, y, t) {
  const p = run.player;
  const s = p.stats;
  const w = 250, h = 236;
  const last = isLastLight(run);
  panel(ctx, x, y, w, h, { alpha: 0.76, border: last ? 0.9 : 0.4, color: last ? '#ff6f9c' : '#7ff6ff' });
  text(ctx, 'PIP', x + 14, y + 24, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 2 });
  text(ctx, formName(run).toUpperCase(), x + 46, y + 24, { size: 14, weight: 900, color: '#ffffff', stroke: false, spacing: 1 });
  text(ctx, `LV ${run.level}`, x + w - 14, y + 24, { size: 13, weight: 900, align: 'right', color: '#ffe27a', stroke: false });
  // Aspects: 9 cells each, with the evolution thresholds marked.
  ASPECT_ORDER.forEach((id, i) => {
    const a = ASPECTS[id];
    const v = run.aspects[id];
    const ry = y + 46 + i * 21;
    text(ctx, a.name, x + 14, ry + 4, { size: 12, weight: 900, color: a.color, stroke: false, spacing: 1 });
    for (let k = 0; k < 9; k++) {
      const cx = x + 104 + k * 13;
      ctx.fillStyle = k < v ? a.color : 'rgba(255,255,255,0.12)';
      ctx.fillRect(cx, ry - 6, 10, 10);
      if (k === 2 || k === 5) { ctx.strokeStyle = withAlpha(a.color, 0.9); ctx.lineWidth = 1.5; ctx.strokeRect(cx - 1, ry - 7, 12, 12); }
    }
    text(ctx, `${v}`, x + w - 14, ry + 4, { size: 13, weight: 900, align: 'right', color: '#ffffff', stroke: false });
  });
  // Live stats.
  const dmg = s.damage * (last ? 1.5 : 1);
  const stats = [
    ['DMG', dmg.toFixed(0)], ['FIRE', `${(s.fireRate * (p.surge > 0 ? 1.6 : 1)).toFixed(1)}/s`],
    ['SPEED', s.speed.toFixed(0)], ['CRIT', `${Math.round(s.crit * 100)}%`],
    ['PULSE', `${Math.round(s.pulseRadius)}px`], ['DASH', `${s.dashCooldown.toFixed(2)}s${s.dashCharges > 1 ? ' ×2' : ''}`],
  ];
  stats.forEach(([k, v], i) => {
    const cx = x + 14 + (i % 2) * 118, cy = y + 140 + Math.floor(i / 2) * 18;
    text(ctx, k, cx, cy, { size: 11, weight: 900, color: '#7fa6c0', stroke: false, spacing: 1 });
    text(ctx, v, cx + 104, cy, { size: 13, weight: 900, align: 'right', color: '#e6fbff', stroke: false });
  });
  // Mutations as a row of glyphs with their growth.
  const ids = Object.keys(run.mutations);
  ids.slice(0, 11).forEach((id, i) => {
    const cx = x + 22 + i * 21, cy = y + 210;
    drawMutationIcon(ctx, id, cx, cy, 9);
    const l = run.mutations[id];
    if (l > 1) text(ctx, `${l}`, cx + 7, cy + 10, { size: 9, weight: 900, align: 'center', color: '#ffffff' });
  });
  if (!ids.length) text(ctx, 'level up to grow a mutation', x + 14, y + 214, { size: 12, weight: 600, color: '#9cc0d4', stroke: false });
  if (last) text(ctx, 'LAST LIGHT · DMG ×1.5 · PULSE ×2', x + w / 2, y + h + 18, { size: 13, weight: 900, align: 'center', color: '#ff6f9c', glow: '#ff6f9c', alpha: 0.75 + 0.25 * Math.sin(t * 8), spacing: 1 });
}
