// The title screen: the reef plays itself behind the logo, the player picks a tide (difficulty),
// reads how a dive goes in four steps and the controls, and dives in.

import { VIEW, DIFFICULTY } from '../config.js';
import { formatScore } from '../core/math.js';
import { text, panel, button, keycap } from './widgets.js';
import { drawGlow, withAlpha } from '../render/glow.js';
import { drawTitleArt, drawMiniMaw } from './title-art.js';
import { drawMutationIcon } from './icons.js';
import { ROUTES } from '../game/tides.js';

export const DIFF_ORDER = ['calm', 'rising', 'abyss'];

export function drawTitle(ctx, ui, t) {
  // Darken the attract-mode dive so the menu reads.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, 'rgba(2, 10, 24, 0.55)');
  g.addColorStop(0.5, 'rgba(2, 10, 24, 0.35)');
  g.addColorStop(1, 'rgba(2, 10, 24, 0.8)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  drawTitleArt(ctx, t);
  // Keep the menu legible over the creatures.
  const veil = ctx.createRadialGradient(VIEW.w / 2, 340, 120, VIEW.w / 2, 340, 600);
  veil.addColorStop(0, 'rgba(2, 10, 24, 0.55)');
  veil.addColorStop(1, 'rgba(2, 10, 24, 0)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  drawLogo(ctx, VIEW.w / 2, 150, t);

  text(ctx, 'A BIOLUMINESCENT SURVIVAL SHOOTER', VIEW.w / 2, 226, { size: 16, weight: 800, align: 'center', color: '#9cd8ea', spacing: 5 });
  text(ctx, 'Guide Pip the lantern-jelly through ten tides of the drowned reef. Grow, mutate, and outshine its two great monsters.', VIEW.w / 2, 254, { size: 15, weight: 600, align: 'center', color: '#cfefff', stroke: false, alpha: 0.85 });

  // Tide (difficulty) cards.
  const cw = 230, ch = 84, gap = 22;
  const x0 = VIEW.w / 2 - (cw * 3 + gap * 2) / 2;
  DIFF_ORDER.forEach((id, i) => {
    const d = DIFFICULTY[id];
    const x = x0 + i * (cw + gap), y = 278;
    const sel = ui.diffIdx === i;
    const col = ['#4dffc3', '#7ff6ff', '#ff6f9c'][i];
    const m = ui.mouse;
    const over = m.x >= x && m.x <= x + cw && m.y >= y && m.y <= y + ch;
    ui.buttons.push({ id: `diff:${i}`, x, y, w: cw, h: ch });
    ctx.save();
    if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 26; }
    panel(ctx, x, y, cw, ch, { color: col, alpha: sel ? 0.9 : 0.6, border: sel ? 1 : over ? 0.7 : 0.3 });
    ctx.restore();
    text(ctx, d.name.toUpperCase(), x + cw / 2, y + 32, { size: 20, weight: 900, align: 'center', color: sel ? col : '#cfefff', spacing: 2 });
    text(ctx, d.blurb, x + cw / 2, y + 54, { size: 13, weight: 600, align: 'center', color: '#9cc0d4', stroke: false });
    text(ctx, `score x${d.score}`, x + cw / 2, y + 72, { size: 12, weight: 800, align: 'center', color: withAlpha(col, 0.9), stroke: false });
  });
  text(ctx, '◀  choose your tide  ▶', VIEW.w / 2, 384, { size: 13, weight: 700, align: 'center', color: '#7fa6c0', stroke: false, spacing: 2 });

  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  button(ui, ctx, 'start', 'DIVE IN', VIEW.w / 2 - 130, 400, 260, 58, { hot: pulse > 0.5, size: 26, hint: 'press Enter or click' });

  drawDiveSteps(ctx, VIEW.w / 2, 514, t);
  drawControls(ctx, VIEW.w / 2, 718);

  if (ui.best > 0) {
    text(ctx, 'BEST DIVE', VIEW.w - 28, 40, { size: 12, weight: 800, align: 'right', color: '#7fa6c0', stroke: false, spacing: 2 });
    text(ctx, formatScore(ui.best), VIEW.w - 28, 70, { size: 28, weight: 900, align: 'right', color: '#ffd166' });
  }
  text(ctx, ui.muted ? 'SOUND OFF  [M]' : 'SOUND ON  [M]', 28, 40, { size: 12, weight: 800, color: '#7fa6c0', stroke: false, spacing: 2 });
}

// How a dive goes, in four cards: shoot, mutate, choose the current, break the bosses.
const STEPS = [
  { title: 'SWIM & SHOOT', color: '#7ff6ff', lines: ['Glow bolts burst the reef\'s foes;', 'their glim levels you up'] },
  { title: 'MUTATE & EVOLVE', color: '#b78cff', lines: ['Pick 1 of 3 mutations a level;', '4 Aspects evolve Pip\'s form'] },
  { title: 'CHOOSE THE CURRENT', color: '#ff6f9c', lines: ['After each tide pick its route:', 'more danger, up to ×1.7 score'] },
  { title: 'BREAK THE BOSSES', color: '#ffd166', lines: ['Your sonar pulse staggers them', 'and opens a weak point'] },
];

function drawDiveSteps(ctx, cx, y, t) {
  const cw = 222, ch = 150, gap = 18;
  const x0 = cx - (cw * 4 + gap * 3) / 2;
  text(ctx, 'HOW A DIVE GOES', cx, y - 10, { size: 13, weight: 900, align: 'center', color: '#9cd8ea', spacing: 4 });
  STEPS.forEach((s, i) => {
    const x = x0 + i * (cw + gap);
    panel(ctx, x, y, cw, ch, { color: s.color, alpha: 0.72, border: 0.55 });
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(x + 22, y + 22, 13, 0, Math.PI * 2); ctx.fill();
    text(ctx, `${i + 1}`, x + 22, y + 28, { size: 16, weight: 900, align: 'center', color: '#04121f', stroke: false });
    text(ctx, s.title, x + 42, y + 28, { size: 16, weight: 900, color: s.color, spacing: 1 });
    drawStepArt(ctx, i, x + cw / 2, y + 74, t);
    s.lines.forEach((l, j) => text(ctx, l, x + cw / 2, y + 116 + j * 17, { size: 13, weight: 600, align: 'center', color: '#cfefff', stroke: false }));
    if (i < STEPS.length - 1) text(ctx, '▶', x + cw + gap / 2, y + ch / 2 + 6, { size: 14, weight: 900, align: 'center', color: '#7fa6c0', stroke: false });
  });
}

function drawStepArt(ctx, i, x, y, t) {
  if (i === 0) {
    drawMiniPip(ctx, x - 50, y, t, 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) drawGlow(ctx, x - 10 + k * 30, y - 6 + k * 3, 12, '#7ff6ff', 0.9);
    drawGlow(ctx, x + 70, y, 22, '#ff6f9c', 0.9);
    ctx.restore();
  } else if (i === 1) {
    ['split', 'static', 'pearls'].forEach((id, k) => drawMutationIcon(ctx, id, x - 52 + k * 52, y, 17));
  } else if (i === 2) {
    ['slack', 'riptide', 'redbloom'].forEach((id, k) => {
      const r = ROUTES[id];
      const py = y - 22 + k * 19;
      ctx.fillStyle = 'rgba(3, 14, 30, 0.85)';
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x - 78, py - 8, 156, 16, 8); ctx.fill(); ctx.stroke();
      text(ctx, `${r.name.toUpperCase()}  ${r.score > 1 ? `×${r.score}` : 'safe'}`, x, py + 4, { size: 11, weight: 900, align: 'center', color: r.color, stroke: false, spacing: 1 });
    });
  } else {
    ctx.save();
    ctx.strokeStyle = 'rgba(127, 246, 255, 0.8)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x - 40, y, 18 + k * 14 + ((t * 20) % 14), -0.9, 0.9); ctx.stroke(); }
    ctx.restore();
    drawMiniPip(ctx, x - 62, y, t, 0.7);
    drawMiniMaw(ctx, x + 40, y + 2, 30, t);
  }
}

// Pip in miniature: the logo's bobbing lantern-jelly, at any size.
function drawMiniPip(ctx, cx, y, t, s = 1) {
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(s, s);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, 0, 0, 46, '#7ff6ff', 0.8);
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#3ad8f0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 12, Math.PI, 0);
  ctx.quadraticCurveTo(0, 6, -12, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 250, 255, 0.8)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, 3);
    ctx.quadraticCurveTo(i * 4 + Math.sin(t * 6 + i) * 4, 12, i * 5, 20);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLogo(ctx, cx, cy, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, cx, cy - 10, 340, '#1fb6d8', 0.35);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  text(ctx, 'LUMEN', cx - 8, cy - 18, { size: 96, weight: 900, align: 'right', color: '#eafcff', glow: '#7ff6ff', spacing: 6 });
  text(ctx, 'REEF', cx + 8, cy - 18, { size: 96, weight: 900, align: 'left', color: '#7ff6ff', glow: '#7ff6ff', spacing: 6 });
  // A tiny Pip bobbing between the words' baseline and the tagline.
  drawMiniPip(ctx, cx, cy + 28 + Math.sin(t * 2) * 5, t);
}

function drawControls(ctx, cx, y) {
  panel(ctx, cx - 470, y - 26, 940, 78, { alpha: 0.55, border: 0.25 });
  const items = [
    [['W', 'A', 'S', 'D'], 'swim'],
    [['MOUSE'], 'aim'],
    [['LMB'], 'fire'],
    [['SPACE'], 'dash'],
    [['E'], 'deep pulse'],
    [['P'], 'pause'],
  ];
  let x = cx - 440;
  for (const [keys, label] of items) {
    let kx = x;
    for (const k of keys) kx += keycap(ctx, k, kx, y, { size: 13 }) + 4;
    text(ctx, label, kx + 4, y - 2, { size: 14, weight: 700, color: '#cfefff', stroke: false, base: 'middle' });
    ctx.font = `700 14px sans-serif`;
    x = kx + ctx.measureText(label).width + 30;
  }
  text(ctx, 'WIN: survive 10 tides and slay Queen Nacre  ·  LOSE: every shell breaks  ·  chain kills for up to ×8 score', cx, y + 36, { size: 13, weight: 600, align: 'center', color: '#9cc0d4', stroke: false });
}
