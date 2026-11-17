// The mutation choice: the dive pauses, three cards rise, and the player picks one with the mouse
// or keys 1-3. Each card shows the mutation's glyph, rarity, effect and how far it has grown;
// beneath them the four Aspects' evolution paths show where each pick leads.

import { VIEW } from '../config.js';
import { easeOutBack } from '../core/math.js';
import { MUTATION_BY_ID, RARITY } from '../game/upgrades.js';
import { text, panel, keycap } from './widgets.js';
import { drawMutationIcon } from './icons.js';
import { withAlpha } from '../render/glow.js';
import { ASPECTS, ASPECT_ORDER, MUTATION_ASPECT } from '../game/attributes.js';

export function drawLevelUp(ctx, run, ui, t) {
  const veil = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  veil.addColorStop(0, 'rgba(2, 10, 24, 0.9)');
  veil.addColorStop(0.3, 'rgba(2, 10, 24, 0.7)');
  veil.addColorStop(1, 'rgba(2, 10, 24, 0.86)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const age = ui.levelAge ?? 1;
  text(ctx, `LEVEL ${run.level - run.pendingLevels + 1}`, VIEW.w / 2, 112, { size: 64, weight: 900, align: 'center', color: '#ffe27a', glow: '#ffe27a', spacing: 6 });
  text(ctx, 'CHOOSE A MUTATION · each one grows an Aspect · click or press 1 2 3', VIEW.w / 2, 152, { size: 17, weight: 800, align: 'center', color: '#cfefff', spacing: 3 });

  const ids = run.choices ?? [];
  const cw = 280, ch = 318, gap = 34;
  const x0 = VIEW.w / 2 - (cw * ids.length + gap * (ids.length - 1)) / 2;
  ids.forEach((id, i) => {
    const m = MUTATION_BY_ID[id];
    const rar = RARITY[m.rarity];
    const k = Math.min(1, Math.max(0, (age - i * 0.08) / 0.35));
    const rise = (1 - easeOutBack(k)) * 120;
    const x = x0 + i * (cw + gap), y = 186 + rise;
    const over = ui.mouse.x >= x && ui.mouse.x <= x + cw && ui.mouse.y >= y && ui.mouse.y <= y + ch;
    const sel = over || ui.cardSel === i;
    ui.buttons.push({ id: `pick:${i}`, x, y, w: cw, h: ch });
    ctx.save();
    ctx.globalAlpha = k;
    if (sel) { ctx.shadowColor = rar.color; ctx.shadowBlur = 34; }
    panel(ctx, x, y - (sel ? 8 : 0), cw, ch, { color: rar.color, alpha: 0.92, border: sel ? 1 : 0.55, radius: 18 });
    ctx.restore();
    const yy = y - (sel ? 8 : 0);
    ctx.save();
    ctx.globalAlpha = k;
    text(ctx, rar.label, x + cw / 2, yy + 30, { size: 12, weight: 900, align: 'center', color: rar.color, stroke: false, spacing: 4 });
    drawMutationIcon(ctx, id, x + cw / 2, yy + 100, 46);
    text(ctx, m.name.toUpperCase(), x + cw / 2, yy + 186, { size: 24, weight: 900, align: 'center', color: '#ffffff', spacing: 1 });
    const lvl = run.mutations[id] ?? 0;
    wrap(ctx, m.desc(lvl), x + cw / 2, yy + 220, cw - 40, 19);
    // Growth pips.
    const pw = 16;
    const px = x + cw / 2 - (m.max * pw) / 2 + pw / 2;
    for (let j = 0; j < m.max; j++) {
      ctx.fillStyle = j < lvl ? rar.color : j === lvl ? withAlpha(rar.color, 0.5 + 0.5 * Math.sin(t * 6)) : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(px + j * pw, yy + 284, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, lvl ? `GROWTH ${lvl} → ${lvl + 1}` : 'NEW', x + cw / 2, yy + 308, { size: 12, weight: 800, align: 'center', color: '#9cc0d4', stroke: false, spacing: 2 });
    keycap(ctx, String(i + 1), x + 14, yy + 32, { size: 13 });
    // The Aspect this card grows, and the evolution it brings closer.
    const asp = ASPECTS[MUTATION_ASPECT[id]];
    if (asp) {
      const now = run.aspects[asp.id];
      const next = asp.forms.find((f) => f.at > now);
      const tag = next ? (next.at === now + 1 ? `EVOLVES: ${next.name.toUpperCase()}!` : `${now + 1}/${next.at} → ${next.name}`) : 'mastered';
      ctx.fillStyle = withAlpha(asp.color, next && next.at === now + 1 ? 0.35 : 0.16);
      ctx.beginPath();
      ctx.roundRect(x + 16, yy + ch + 10, cw - 32, 46, 10);
      ctx.fill();
      text(ctx, `+1 ${asp.name}`, x + cw / 2, yy + ch + 29, { size: 15, weight: 900, align: 'center', color: asp.color, stroke: false, spacing: 1 });
      text(ctx, tag, x + cw / 2, yy + ch + 47, { size: 12, weight: 800, align: 'center', color: next && next.at === now + 1 ? '#ffffff' : '#cfefff', stroke: false });
    }
    ctx.restore();
  });
  drawEvolutionPaths(ctx, run, ids, 584);
}

// The four Aspects side by side: points so far, and the two forms each one evolves into at 3
// and 6, lit once reached. The Aspects this draft's cards would grow glow.
function drawEvolutionPaths(ctx, run, ids, y) {
  const fed = new Set(ids.map((id) => MUTATION_ASPECT[id]));
  const w = 292, gap = 12, x0 = VIEW.w / 2 - (w * 4 + gap * 3) / 2;
  text(ctx, 'EVOLUTION PATHS', VIEW.w / 2, y - 8, { size: 13, weight: 900, align: 'center', color: '#9cd8ea', spacing: 4 });
  ASPECT_ORDER.forEach((id, i) => {
    const a = ASPECTS[id];
    const v = run.aspects[id];
    const x = x0 + i * (w + gap);
    panel(ctx, x, y, w, 170, { color: a.color, alpha: 0.85, border: fed.has(id) ? 0.95 : 0.3 });
    text(ctx, a.name, x + 14, y + 26, { size: 16, weight: 900, color: a.color, spacing: 2 });
    text(ctx, `${v} / 9`, x + w - 14, y + 26, { size: 14, weight: 900, align: 'right', color: '#ffffff', stroke: false });
    for (let c = 0; c < 9; c++) {
      const cx = x + 14 + c * 30;
      ctx.fillStyle = c < v ? a.color : 'rgba(255,255,255,0.12)';
      ctx.fillRect(cx, y + 38, 26, 9);
      if (c === 2 || c === 5) { ctx.strokeStyle = a.color; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 1.5, y + 36.5, 29, 12); }
    }
    a.forms.forEach((f, j) => {
      const fy = y + 80 + j * 46;
      const got = v >= f.at;
      ctx.fillStyle = got ? a.color : 'rgba(3, 14, 30, 0.9)';
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 26, fy - 5, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      text(ctx, `${f.at}`, x + 26, fy, { size: 12, weight: 900, align: 'center', color: got ? '#04121f' : a.color, stroke: false });
      text(ctx, f.name.toUpperCase(), x + 46, fy - 1, { size: 14, weight: 900, color: got ? '#ffffff' : '#cfefff', stroke: false, spacing: 1 });
      text(ctx, f.power, x + 46, fy + 16, { size: 11, weight: 600, color: '#9cc0d4', stroke: false });
    });
  });
}

function wrap(ctx, str, cx, y, maxW, lh) {
  ctx.font = `600 16px "Trebuchet MS", sans-serif`;
  const words = str.split(' ');
  let lineStr = '';
  let yy = y;
  for (const w of words) {
    const test = lineStr ? `${lineStr} ${w}` : w;
    if (ctx.measureText(test).width > maxW && lineStr) {
      text(ctx, lineStr, cx, yy, { size: 16, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
      lineStr = w;
      yy += lh;
    } else lineStr = test;
  }
  if (lineStr) text(ctx, lineStr, cx, yy, { size: 16, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
}
