// Shared UI drawing: fonts, outlined text, glassy panels, bars and clickable buttons. Buttons are
// registered each frame into a list the shell hit-tests against the mouse.

import { withAlpha } from '../render/glow.js';

export const FONT = '"Trebuchet MS", "Segoe UI", "Helvetica Neue", sans-serif';

export function text(ctx, str, x, y, { size = 18, weight = 700, color = '#eafcff', align = 'left', base = 'alphabetic', stroke = true, glow = null, alpha = 1, spacing = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.8; }
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = 'rgba(2, 10, 24, 0.85)';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function panel(ctx, x, y, w, h, { color = '#7ff6ff', alpha = 0.78, radius = 14, border = 0.45 } = {}) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(10, 44, 70, ${alpha})`);
  g.addColorStop(1, `rgba(4, 16, 34, ${alpha})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, border);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function bar(ctx, x, y, w, h, frac, color, { back = 'rgba(0, 0, 0, 0.45)', radius = h / 2, shine = true } = {}) {
  ctx.save();
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  const fw = Math.max(0, Math.min(1, frac)) * w;
  if (fw > 1) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color);
    g.addColorStop(1, withAlpha(color, 0.75));
    ctx.fillStyle = shine ? g : color;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, radius);
    ctx.fill();
  }
  ctx.restore();
}

export function button(ui, ctx, id, label, x, y, w, h, { hot = false, color = '#7ff6ff', size = 22, hint = '' } = {}) {
  const m = ui.mouse;
  const over = m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  ui.buttons.push({ id, x, y, w, h });
  const lit = over || hot;
  ctx.save();
  if (lit) { ctx.shadowColor = color; ctx.shadowBlur = 24; }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, lit ? withAlpha(color, 0.55) : 'rgba(14, 60, 88, 0.85)');
  g.addColorStop(1, lit ? withAlpha(color, 0.25) : 'rgba(6, 24, 44, 0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = withAlpha(color, lit ? 1 : 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  text(ctx, label, x + w / 2, y + h / 2 + 1, { size, weight: 800, align: 'center', base: 'middle', color: '#ffffff', spacing: 1.5 });
  if (hint) text(ctx, hint, x + w / 2, y + h + 18, { size: 13, weight: 600, align: 'center', base: 'middle', color: '#7fa6c0', stroke: false });
  return over;
}

export function keycap(ctx, label, x, y, { size = 14 } = {}) {
  ctx.save();
  ctx.font = `800 ${size}px ${FONT}`;
  const w = Math.max(size * 1.8, ctx.measureText(label).width + size);
  ctx.fillStyle = 'rgba(220, 250, 255, 0.12)';
  ctx.strokeStyle = 'rgba(220, 250, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y - size, w, size * 1.6, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y - size * 0.2);
  ctx.restore();
  return w;
}
