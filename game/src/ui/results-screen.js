// The end of a dive, won or lost: a headline, the rank letter, the run's numbers (score, best,
// tide reached, foes, best chain, time, bosses), the mutations it grew, and the restart buttons.

import { VIEW, WAVES_TOTAL } from '../config.js';
import { formatScore, formatTime, easeOutCubic } from '../core/math.js';
import { text, panel, button } from './widgets.js';
import { drawMutationIcon } from './icons.js';
import { MUTATION_BY_ID } from '../game/upgrades.js';

export function rankFor(run) {
  const s = run.score / run.diff.score;
  let r = s >= 105000 ? 'S' : s >= 80000 ? 'A' : s >= 50000 ? 'B' : s >= 22000 ? 'C' : 'D';
  if (run.outcome === 'victory' && (r === 'C' || r === 'D')) r = 'B';
  if (run.outcome === 'victory' && run.hitsTaken <= 2) r = 'S';
  return r;
}

const RANK_COLOR = { S: '#ffd166', A: '#ff6f9c', B: '#7ff6ff', C: '#4dffc3', D: '#9fb6c8' };

export function drawResults(ctx, run, ui, t) {
  const won = run.outcome === 'victory';
  const age = ui.resultAge ?? 2;
  const k = easeOutCubic(Math.min(1, age / 0.6));
  ctx.fillStyle = `rgba(2, 10, 24, ${0.72 * k})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  const head = won ? 'THE REEF SHINES AGAIN' : 'YOUR LIGHT FADES';
  const col = won ? '#ffd166' : '#ff6f9c';
  text(ctx, head, VIEW.w / 2, 104 - (1 - k) * 30, { size: 54, weight: 900, align: 'center', color: col, glow: col, alpha: k, spacing: 5 });
  const sub = won ? `Queen Nacre is beaten. ${run.diff.name} conquered.` : `Lost in ${run.wave.name ?? 'the deep'} — wave ${run.wave.n} of ${WAVES_TOTAL}.`;
  text(ctx, sub, VIEW.w / 2, 142, { size: 18, weight: 700, align: 'center', color: '#cfefff', alpha: k, spacing: 1 });

  const pw = 760, ph = 330, px = (VIEW.w - pw) / 2, py = 172;
  ctx.save();
  ctx.globalAlpha = k;
  panel(ctx, px, py, pw, ph, { color: col, alpha: 0.88, radius: 20, border: 0.6 });

  // Rank letter.
  const rank = rankFor(run);
  const rc = RANK_COLOR[rank];
  text(ctx, 'RANK', px + 120, py + 52, { size: 14, weight: 900, align: 'center', color: '#9cc0d4', stroke: false, spacing: 4 });
  const pop = age > 0.6 && age < 1 ? 1 + (1 - (age - 0.6) / 0.4) * 0.4 : 1;
  text(ctx, rank, px + 120, py + 170, { size: Math.round(130 * pop), weight: 900, align: 'center', color: rc, glow: rc });

  // Score and best.
  const shown = Math.min(run.score, run.score * Math.min(1, age / 1.2));
  text(ctx, 'FINAL SCORE', px + 250, py + 52, { size: 14, weight: 900, color: '#9cc0d4', stroke: false, spacing: 3 });
  text(ctx, formatScore(shown), px + 250, py + 104, { size: 54, weight: 900, color: '#ffffff' });
  if (ui.newBest) text(ctx, '★ NEW BEST', px + 252, py + 134, { size: 18, weight: 900, color: '#ffd166', glow: '#ffd166' });
  else text(ctx, `BEST ${formatScore(ui.best)}`, px + 252, py + 134, { size: 16, weight: 800, color: '#9cc0d4', stroke: false });

  const stats = [
    ['TIDE', won ? `${WAVES_TOTAL} / ${WAVES_TOTAL}` : `${run.wave.n} / ${WAVES_TOTAL}`],
    ['FOES', `${run.kills}`],
    ['BEST CHAIN', `${run.bestCombo}`],
    ['PERFECT DODGES', `${run.perfects ?? 0}`],
    ['TIME', formatTime(run.time)],
    ['BOSSES', `${run.bossesSlain} / 2`],
  ];
  stats.forEach(([label, val], i) => {
    const cx = px + 250 + (i % 3) * 165, cy = py + 180 + Math.floor(i / 3) * 56;
    text(ctx, label, cx, cy, { size: 12, weight: 900, color: '#7fa6c0', stroke: false, spacing: 2 });
    text(ctx, val, cx, cy + 28, { size: 26, weight: 900, color: '#eafcff' });
  });

  // Mutations grown this dive.
  const ids = Object.keys(run.mutations);
  text(ctx, 'MUTATIONS', px + 36, py + 268, { size: 12, weight: 900, color: '#7fa6c0', stroke: false, spacing: 2 });
  ids.slice(0, 16).forEach((id, i) => {
    const x = px + 50 + i * 42, y = py + 300;
    drawMutationIcon(ctx, id, x, y, 16);
    const l = run.mutations[id];
    if (l > 1) text(ctx, `${l}`, x + 12, y + 15, { size: 12, weight: 900, align: 'center', color: '#ffffff' });
  });
  if (!ids.length) text(ctx, 'none — pure Pip', px + 36, py + 300, { size: 15, weight: 700, color: '#9cc0d4', stroke: false });
  ctx.restore();

  if (age > 0.5) {
    button(ui, ctx, 'restart', 'DIVE AGAIN', VIEW.w / 2 - 290, 548, 270, 58, { hot: true, size: 24, color: col, hint: 'press R or Enter' });
    button(ui, ctx, 'title', 'CHANGE TIDE', VIEW.w / 2 + 20, 548, 270, 58, { size: 22, hint: 'press Esc for the title' });
  }
  const top = ids.map((id) => MUTATION_BY_ID[id].name).slice(0, 3).join(' · ');
  if (top) text(ctx, `build: ${top}`, VIEW.w / 2, 660, { size: 13, weight: 700, align: 'center', color: '#7fa6c0', stroke: false, alpha: k });
}

export function drawPause(ctx, run, ui) {
  ctx.fillStyle = 'rgba(2, 10, 24, 0.7)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'PAUSED', VIEW.w / 2, 230, { size: 64, weight: 900, align: 'center', color: '#7ff6ff', glow: '#7ff6ff', spacing: 8 });
  text(ctx, `Wave ${run.wave.n} · ${formatScore(run.score)} points · level ${run.level}`, VIEW.w / 2, 272, { size: 18, weight: 700, align: 'center', color: '#cfefff' });
  button(ui, ctx, 'resume', 'RESUME', VIEW.w / 2 - 130, 320, 260, 54, { hot: true, hint: 'P or Esc' });
  button(ui, ctx, 'restart', 'RESTART DIVE', VIEW.w / 2 - 130, 410, 260, 54, { hint: 'R' });
  button(ui, ctx, 'title', 'QUIT TO TITLE', VIEW.w / 2 - 130, 500, 260, 54, { hint: 'Q' });
  text(ctx, ui.muted ? 'sound off — M to turn on' : 'sound on — M to mute', VIEW.w / 2, 620, { size: 14, weight: 700, align: 'center', color: '#7fa6c0', stroke: false });
}
