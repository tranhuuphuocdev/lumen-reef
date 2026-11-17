// The end of a dive, won or lost: a headline, the rank letter and form, the run's numbers, the
// build by name, the journey chart tide by tide, the feats earned, and the restart buttons.

import { VIEW, WAVES_TOTAL } from '../config.js';
import { formatScore, formatTime, easeOutCubic } from '../core/math.js';
import { text, panel, button } from './widgets.js';
import { drawMutationIcon } from './icons.js';
import { MUTATION_BY_ID } from '../game/upgrades.js';
import { ROUTES } from '../game/tides.js';
import { ASPECTS, ASPECT_ORDER, formName } from '../game/attributes.js';
import { drawJourneyChart, feats } from './journey-chart.js';

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
  ctx.fillStyle = `rgba(2, 10, 24, ${0.76 * k})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  const head = won ? 'THE REEF SHINES AGAIN' : 'YOUR LIGHT FADES';
  const col = won ? '#ffd166' : '#ff6f9c';
  text(ctx, head, VIEW.w / 2, 92 - (1 - k) * 30, { size: 62, weight: 900, align: 'center', color: col, glow: col, alpha: k, spacing: 5 });
  const sub = won ? `Queen Nacre is beaten. ${run.diff.name} conquered.` : `Lost in ${run.wave.name ?? 'the deep'}: tide ${run.wave.n} of ${WAVES_TOTAL}.`;
  text(ctx, sub, VIEW.w / 2, 130, { size: 19, weight: 700, align: 'center', color: '#cfefff', alpha: k, spacing: 1 });

  const pw = 1060, ph = 440, px = (VIEW.w - pw) / 2, py = 152;
  ctx.save();
  ctx.globalAlpha = k;
  panel(ctx, px, py, pw, ph, { color: col, alpha: 0.9, radius: 20, border: 0.6 });
  drawRankColumn(ctx, run, px, py, age);
  drawScoreColumn(ctx, run, ui, px + 280, py, age, won);
  drawJourneyColumn(ctx, run, px + 650, py, Math.min(1, Math.max(0, (age - 0.4) / 0.8)));
  ctx.restore();

  drawFeats(ctx, run, VIEW.w / 2, 626, k);
  if (age > 0.5) {
    button(ui, ctx, 'restart', 'DIVE AGAIN', VIEW.w / 2 - 300, 664, 280, 62, { hot: true, size: 26, color: col, hint: 'press R or Enter' });
    button(ui, ctx, 'title', 'CHANGE TIDE', VIEW.w / 2 + 20, 664, 280, 62, { size: 24, hint: 'press Esc for the title' });
  }
}

// Left: the rank letter, the form Pip reached and the four Aspects that built it.
function drawRankColumn(ctx, run, px, py, age) {
  const cx = px + 135;
  const rank = rankFor(run);
  const rc = RANK_COLOR[rank];
  text(ctx, 'RANK', cx, py + 46, { size: 14, weight: 900, align: 'center', color: '#9cc0d4', stroke: false, spacing: 4 });
  const pop = age > 0.6 && age < 1 ? 1 + (1 - (age - 0.6) / 0.4) * 0.4 : 1;
  text(ctx, rank, cx, py + 168, { size: Math.round(128 * pop), weight: 900, align: 'center', color: rc, glow: rc });
  text(ctx, 'FORM', cx, py + 210, { size: 12, weight: 900, align: 'center', color: '#7fa6c0', stroke: false, spacing: 3 });
  text(ctx, formName(run).toUpperCase(), cx, py + 236, { size: 20, weight: 900, align: 'center', color: '#ffffff' });
  ASPECT_ORDER.forEach((id, i) => {
    const a = ASPECTS[id];
    const v = run.aspects[id];
    const ax = px + 36, ay = py + 286 + i * 38;
    text(ctx, a.name, ax, ay, { size: 13, weight: 900, color: a.color, stroke: false, spacing: 1 });
    text(ctx, `${v}`, ax + 198, ay, { size: 14, weight: 900, align: 'right', color: '#ffffff', stroke: false });
    for (let c = 0; c < 9; c++) {
      ctx.fillStyle = c < v ? a.color : 'rgba(255,255,255,0.12)';
      ctx.fillRect(ax + c * 22, ay + 8, 19, 9);
    }
  });
  ctx.fillStyle = 'rgba(159, 210, 230, 0.18)';
  ctx.fillRect(px + 266, py + 30, 1, 380);
}

// Middle: the score, the dive's numbers and the build, by name.
function drawScoreColumn(ctx, run, ui, x, py, age, won) {
  const shown = Math.min(run.score, run.score * Math.min(1, age / 1.2));
  text(ctx, 'FINAL SCORE', x, py + 46, { size: 14, weight: 900, color: '#9cc0d4', stroke: false, spacing: 3 });
  text(ctx, formatScore(shown), x, py + 100, { size: 56, weight: 900, color: '#ffffff' });
  if (ui.newBest) text(ctx, '★ NEW BEST', x + 2, py + 130, { size: 18, weight: 900, color: '#ffd166', glow: '#ffd166' });
  else text(ctx, `BEST ${formatScore(ui.best)}`, x + 2, py + 130, { size: 16, weight: 800, color: '#9cc0d4', stroke: false });
  const stats = [
    ['TIDES', won ? `${WAVES_TOTAL} / ${WAVES_TOTAL}` : `${run.wave.n} / ${WAVES_TOTAL}`],
    ['FOES', `${run.kills}`],
    ['BEST CHAIN', `${run.bestCombo}`],
    ['PERFECT DODGES', `${run.perfects ?? 0}`],
    ['TIME', formatTime(run.time)],
    ['BOSSES', `${run.bossesSlain} / 2`],
  ];
  stats.forEach(([label, val], i) => {
    const cx = x + (i % 3) * 120, cy = py + 172 + Math.floor(i / 3) * 54;
    text(ctx, label, cx, cy, { size: 11, weight: 900, color: '#7fa6c0', stroke: false, spacing: 1.5 });
    text(ctx, val, cx, cy + 27, { size: 24, weight: 900, color: '#eafcff' });
  });
  text(ctx, 'BUILD', x, py + 300, { size: 12, weight: 900, color: '#7fa6c0', stroke: false, spacing: 3 });
  const ids = Object.keys(run.mutations).sort((a, b) => run.mutations[b] - run.mutations[a]);
  ids.slice(0, 8).forEach((id, i) => {
    const bx = x + (i % 2) * 180, by = py + 326 + Math.floor(i / 2) * 26;
    drawMutationIcon(ctx, id, bx + 9, by - 5, 10);
    const l = run.mutations[id];
    text(ctx, `${MUTATION_BY_ID[id].name}${l > 1 ? ` ×${l}` : ''}`, bx + 24, by, { size: 14, weight: 800, color: '#eafcff', stroke: false });
  });
  if (!ids.length) text(ctx, 'no mutations: pure Pip', x, py + 330, { size: 15, weight: 700, color: '#9cc0d4', stroke: false });
}

// Right: the journey chart and its legend of the currents swum.
function drawJourneyColumn(ctx, run, x, py, grow) {
  const log = run.tideLog ?? [];
  ctx.fillStyle = 'rgba(159, 210, 230, 0.18)';
  ctx.fillRect(x - 20, py + 30, 1, 380);
  text(ctx, 'THE DIVE, TIDE BY TIDE', x, py + 46, { size: 14, weight: 900, color: '#9cc0d4', stroke: false, spacing: 3 });
  text(ctx, 'score earned each tide', x + 370, py + 46, { size: 12, weight: 700, align: 'right', color: '#7fa6c0', stroke: false });
  drawJourneyChart(ctx, log, x, py + 80, 370, 240, { grow });
  const used = [...new Set(log.filter((l) => l.cleared).map((l) => l.route))];
  let lx = x;
  const ly = py + 372;
  for (const id of used) {
    const r = ROUTES[id];
    ctx.fillStyle = r.color;
    ctx.fillRect(lx, ly - 9, 10, 10);
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    text(ctx, r.name, lx + 15, ly, { size: 12, weight: 800, color: '#cfefff', stroke: false });
    lx += ctx.measureText(r.name).width + 32;
    if (lx > x + 330) break;
  }
  text(ctx, '♛ boss tide   ★ flawless   bar colour = the current chosen', x, ly + 26, { size: 12, weight: 700, color: '#7fa6c0', stroke: false });
}

function drawFeats(ctx, run, cx, y, k) {
  const list = feats(run).slice(0, 5);
  if (!list.length) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.font = `900 13px "Trebuchet MS", sans-serif`;
  const pills = list.map(([label, color]) => ({ label: `★ ${label}`, color, w: ctx.measureText(`★ ${label}`).width + 30 }));
  const total = pills.reduce((s, p) => s + p.w + 10, -10);
  let x = cx - total / 2;
  for (const p of pills) {
    ctx.fillStyle = 'rgba(3, 14, 30, 0.85)';
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y - 15, p.w, 26, 13);
    ctx.fill();
    ctx.stroke();
    text(ctx, p.label, x + p.w / 2, y + 3, { size: 13, weight: 900, align: 'center', color: p.color, stroke: false, spacing: 1 });
    x += p.w + 10;
  }
  ctx.restore();
}

export function drawPause(ctx, run, ui) {
  ctx.fillStyle = 'rgba(2, 10, 24, 0.7)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'PAUSED', VIEW.w / 2, 250, { size: 64, weight: 900, align: 'center', color: '#7ff6ff', glow: '#7ff6ff', spacing: 8 });
  text(ctx, `Wave ${run.wave.n} · ${formatScore(run.score)} points · level ${run.level}`, VIEW.w / 2, 292, { size: 18, weight: 700, align: 'center', color: '#cfefff' });
  button(ui, ctx, 'resume', 'RESUME', VIEW.w / 2 - 130, 340, 260, 54, { hot: true, hint: 'P or Esc' });
  button(ui, ctx, 'restart', 'RESTART DIVE', VIEW.w / 2 - 130, 430, 260, 54, { hint: 'R' });
  button(ui, ctx, 'title', 'QUIT TO TITLE', VIEW.w / 2 - 130, 520, 260, 54, { hint: 'Q' });
  text(ctx, ui.muted ? 'sound off — M to turn on' : 'sound on — M to mute', VIEW.w / 2, 640, { size: 14, weight: 700, align: 'center', color: '#7fa6c0', stroke: false });
}
