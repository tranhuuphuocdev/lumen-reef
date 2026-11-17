// The title screen: the reef plays itself behind the logo, the player picks a tide (difficulty),
// reads the controls and dives in.

import { VIEW, DIFFICULTY } from '../config.js';
import { formatScore } from '../core/math.js';
import { text, panel, button, keycap } from './widgets.js';
import { drawGlow, withAlpha } from '../render/glow.js';

export const DIFF_ORDER = ['calm', 'rising', 'abyss'];

export function drawTitle(ctx, ui, t) {
  // Darken the attract-mode dive so the menu reads.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, 'rgba(2, 10, 24, 0.55)');
  g.addColorStop(0.5, 'rgba(2, 10, 24, 0.35)');
  g.addColorStop(1, 'rgba(2, 10, 24, 0.8)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  drawLogo(ctx, VIEW.w / 2, 168, t);

  text(ctx, 'A BIOLUMINESCENT SURVIVAL SHOOTER', VIEW.w / 2, 252, { size: 16, weight: 800, align: 'center', color: '#9cd8ea', spacing: 5 });
  text(ctx, 'Guide Pip the lantern-jelly through ten tides of the drowned reef. Grow, mutate, and outshine its two great monsters.', VIEW.w / 2, 282, { size: 15, weight: 600, align: 'center', color: '#cfefff', stroke: false, alpha: 0.85 });

  // Tide (difficulty) cards.
  const cw = 230, ch = 84, gap = 22;
  const x0 = VIEW.w / 2 - (cw * 3 + gap * 2) / 2;
  DIFF_ORDER.forEach((id, i) => {
    const d = DIFFICULTY[id];
    const x = x0 + i * (cw + gap), y = 318;
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
  text(ctx, '◀  choose your tide  ▶', VIEW.w / 2, 428, { size: 13, weight: 700, align: 'center', color: '#7fa6c0', stroke: false, spacing: 2 });

  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  button(ui, ctx, 'start', 'DIVE IN', VIEW.w / 2 - 130, 450, 260, 58, { hot: pulse > 0.5, size: 26, hint: 'press Enter or click' });

  drawControls(ctx, VIEW.w / 2, 592);

  if (ui.best > 0) {
    text(ctx, 'BEST DIVE', VIEW.w - 28, 40, { size: 12, weight: 800, align: 'right', color: '#7fa6c0', stroke: false, spacing: 2 });
    text(ctx, formatScore(ui.best), VIEW.w - 28, 70, { size: 28, weight: 900, align: 'right', color: '#ffd166' });
  }
  text(ctx, ui.muted ? 'SOUND OFF  [M]' : 'SOUND ON  [M]', 28, 40, { size: 12, weight: 800, color: '#7fa6c0', stroke: false, spacing: 2 });
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
  const y = cy + 28 + Math.sin(t * 2) * 5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, cx, y, 46, '#7ff6ff', 0.8);
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createRadialGradient(cx - 3, y - 4, 1, cx, y, 13);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#3ad8f0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, y, 12, Math.PI, 0);
  ctx.quadraticCurveTo(cx, y + 6, cx - 12, y);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 250, 255, 0.8)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 4, y + 3);
    ctx.quadraticCurveTo(cx + i * 4 + Math.sin(t * 6 + i) * 4, y + 12, cx + i * 5, y + 20);
    ctx.stroke();
  }
  ctx.restore();
}

function drawControls(ctx, cx, y) {
  panel(ctx, cx - 470, y - 30, 940, 92, { alpha: 0.55, border: 0.25 });
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
  text(ctx, 'Shoot foes to free glim · level up and choose mutations · chain kills to raise the multiplier · survive wave 10 to win', cx, y + 38, { size: 13, weight: 600, align: 'center', color: '#9cc0d4', stroke: false });
}
