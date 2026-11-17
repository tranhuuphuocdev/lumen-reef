// Choosing the next tide's route: three cards between tides, each a current with its danger
// (shown as risk pips), what it changes and what it pays. Click a card or press 1-3. Beneath
// them, the map of the whole dive: tides swum in the colour of their current, bosses ahead.

import { VIEW, WAVES_TOTAL } from '../config.js';
import { easeOutBack } from '../core/math.js';
import { ROUTES } from '../game/tides.js';
import { WAVE_NAMES } from '../game/waves.js';
import { BOSS_WAVES } from '../config.js';
import { text, panel, keycap } from './widgets.js';
import { withAlpha } from '../render/glow.js';
import { RELIC_TIDES } from '../game/relics.js';
import { drawRelicIcon } from './relic-icons.js';

export function drawRouteChoice(ctx, run, ui, t) {
  ctx.fillStyle = 'rgba(2, 10, 24, 0.62)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const next = run.wave.n + 1;
  text(ctx, `TIDE ${run.wave.n} CLEARED`, VIEW.w / 2, 140, { size: 20, weight: 900, align: 'center', color: '#4dffc3', spacing: 4 });
  text(ctx, 'CHOOSE THE CURRENT', VIEW.w / 2, 192, { size: 52, weight: 900, align: 'center', color: '#e6fbff', glow: '#5ff0ff', spacing: 5 });
  text(ctx, `into tide ${next}: ${WAVE_NAMES[next]}${BOSS_WAVES[next] ? ' — a boss waits' : ''}`, VIEW.w / 2, 226, { size: 17, weight: 700, align: 'center', color: BOSS_WAVES[next] ? '#ff9ab8' : '#9cd8ea' });
  const ids = run.routeChoices ?? [];
  const cw = 300, ch = 250, gap = 28;
  const x0 = VIEW.w / 2 - (cw * ids.length + gap * (ids.length - 1)) / 2;
  const age = ui.routeAge ?? 1;
  ids.forEach((id, i) => {
    const r = ROUTES[id];
    const k = Math.min(1, Math.max(0, (age - i * 0.08) / 0.35));
    const x = x0 + i * (cw + gap), y = 262 + (1 - easeOutBack(k)) * 100;
    const over = ui.mouse.x >= x && ui.mouse.x <= x + cw && ui.mouse.y >= y && ui.mouse.y <= y + ch;
    ui.buttons.push({ id: `route:${i}`, x, y, w: cw, h: ch });
    ctx.save();
    ctx.globalAlpha = k;
    if (over) { ctx.shadowColor = r.color; ctx.shadowBlur = 30; }
    panel(ctx, x, y - (over ? 6 : 0), cw, ch, { color: r.color, alpha: 0.92, border: over ? 1 : 0.55, radius: 18 });
    ctx.restore();
    const yy = y - (over ? 6 : 0);
    ctx.save();
    ctx.globalAlpha = k;
    keycap(ctx, String(i + 1), x + 14, yy + 32, { size: 13 });
    drawCurrentGlyph(ctx, x + cw / 2, yy + 70, r, t);
    text(ctx, r.name.toUpperCase(), x + cw / 2, yy + 128, { size: 24, weight: 900, align: 'center', color: r.color, spacing: 1 });
    wrapCentered(ctx, r.desc, x + cw / 2, yy + 156, cw - 40);
    // Risk pips and the reward line.
    text(ctx, 'DANGER', x + 22, yy + ch - 26, { size: 11, weight: 900, color: '#9cc0d4', stroke: false, spacing: 2 });
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = j < r.risk ? '#ff6f9c' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(x + 92 + j * 14, yy + ch - 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, r.reward, x + cw - 20, yy + ch - 26, { size: 14, weight: 900, align: 'right', color: '#ffd166', stroke: false });
    ctx.restore();
  });
  text(ctx, 'click a card or press 1 · 2 · 3', VIEW.w / 2, 548, { size: 14, weight: 700, align: 'center', color: '#7fa6c0', stroke: false, spacing: 2 });
  drawDiveMap(ctx, run, 590, t);
}

// The dive as a line of ten tides: swum ones in their current's colour (starred if flawless), the
// one being chosen pulsing, the two bosses marked where they wait.
function drawDiveMap(ctx, run, y, t) {
  const log = run.tideLog ?? [];
  const w = 940, x0 = VIEW.w / 2 - w / 2;
  panel(ctx, x0 - 30, y, w + 60, 116, { alpha: 0.8, border: 0.35 });
  text(ctx, 'THE DIVE SO FAR', x0, y + 26, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 3 });
  const next = run.wave.n + 1;
  const step = w / (WAVES_TOTAL - 1);
  const ny = y + 70;
  for (let n = 1; n <= WAVES_TOTAL; n++) {
    const x = x0 + (n - 1) * step;
    const l = log.find((e) => e.n === n);
    const col = l ? ROUTES[l.route]?.color ?? '#9cd8ea' : 'rgba(255,255,255,0.18)';
    if (n < WAVES_TOTAL) {
      ctx.strokeStyle = l ? col : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = l ? 4 : 2;
      ctx.setLineDash(l ? [] : [6, 6]);
      ctx.beginPath(); ctx.moveTo(x + 14, ny); ctx.lineTo(x + step - 14, ny); ctx.stroke();
      ctx.setLineDash([]);
    }
    const boss = BOSS_WAVES[n];
    const r = boss ? 15 : 11;
    const isNext = n === next;
    ctx.fillStyle = l ? col : 'rgba(3, 14, 30, 0.95)';
    ctx.strokeStyle = boss ? '#ff6f9c' : isNext ? '#ffffff' : l ? col : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isNext ? 3 : 2;
    ctx.beginPath(); ctx.arc(x, ny, r + (isNext ? 2 * Math.sin(t * 5) + 2 : 0), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const mark = boss ? '♛' : l?.flawless ? '★' : isNext ? '?' : `${n}`;
    text(ctx, mark, x, ny + 5, { size: boss ? 15 : 12, weight: 900, align: 'center', color: l ? '#04121f' : boss ? '#ff9ab8' : '#cfefff', stroke: false });
    const label = boss ? (boss === 'maw' ? 'UNDERTOW MAW' : 'QUEEN NACRE') : l ? ROUTES[l.route].name : isNext ? 'YOUR CHOICE' : '';
    // Relic caches sit above the tides that end in one: the relic kept, or a promise of one.
    if (RELIC_TIDES[n]) {
      const got = (run.relics ?? [])[Object.keys(RELIC_TIDES).map(Number).indexOf(n)];
      if (got && l) drawRelicIcon(ctx, got, x, ny - 30, 11);
      else text(ctx, RELIC_TIDES[n] === 'boss' ? 'BOSS RELIC' : 'RELIC', x, ny - 24, { size: 10, weight: 900, align: 'center', color: '#ffd166', stroke: false, spacing: 1 });
    }
    if (label) text(ctx, label, x, ny + 36, { size: 11, weight: 900, align: 'center', color: boss ? '#ff9ab8' : isNext ? '#ffffff' : col, stroke: false, spacing: 1 });
  }
}

function drawCurrentGlyph(ctx, cx, cy, r, t) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = withAlpha(r.color, 0.9);
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  const lines = 2 + r.risk;
  for (let i = 0; i < lines; i++) {
    const y = (i - (lines - 1) / 2) * 12;
    const ph = t * (2 + r.risk) + i;
    ctx.beginPath();
    for (let x = -50; x <= 50; x += 5) {
      const yy = y + Math.sin(x * 0.08 + ph) * (3 + r.risk * 2);
      x === -50 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function wrapCentered(ctx, str, cx, y, maxW) {
  ctx.font = `600 15px "Trebuchet MS", sans-serif`;
  let line = '';
  let yy = y;
  for (const w of str.split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, cx, yy, { size: 15, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
      line = w;
      yy += 20;
    } else line = test;
  }
  if (line) text(ctx, line, cx, yy, { size: 15, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
}
