// The relic draft: after tides 2 and 8, and when the Maw falls, three sunken relics rise and the
// player keeps one for the rest of the dive. Click a card or press 1-3. Beneath, the relics
// already held.

import { VIEW } from '../config.js';
import { easeOutBack } from '../core/math.js';
import { RELICS, RELICS_MAX } from '../game/relics.js';
import { text, panel, keycap } from './widgets.js';
import { drawRelicIcon } from './relic-icons.js';

export function drawRelicChoice(ctx, run, ui, t) {
  const veil = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  veil.addColorStop(0, 'rgba(2, 10, 24, 0.88)');
  veil.addColorStop(0.35, 'rgba(2, 10, 24, 0.68)');
  veil.addColorStop(1, 'rgba(2, 10, 24, 0.86)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const ids = run.relicChoices ?? [];
  const boss = ids.length && RELICS[ids[0]].tier === 'boss';
  const col = boss ? '#ff6f9c' : '#ffd166';
  text(ctx, boss ? 'THE MAW LEAVES ITS TREASURE' : `TIDE ${run.wave.n} CLEARED · A SUNKEN CACHE`, VIEW.w / 2, 120, { size: 20, weight: 900, align: 'center', color: col, spacing: 4 });
  text(ctx, boss ? 'CLAIM A BOSS RELIC' : 'CHOOSE A RELIC', VIEW.w / 2, 176, { size: 56, weight: 900, align: 'center', color: '#fff3d0', glow: col, spacing: 5 });
  text(ctx, 'a relic changes the rules for the rest of the dive · click or press 1 2 3', VIEW.w / 2, 212, { size: 16, weight: 700, align: 'center', color: '#cfefff', spacing: 1 });

  const cw = 300, ch = 330, gap = 30;
  const x0 = VIEW.w / 2 - (cw * ids.length + gap * (ids.length - 1)) / 2;
  const age = ui.relicAge ?? 1;
  ids.forEach((id, i) => {
    const r = RELICS[id];
    const k = Math.min(1, Math.max(0, (age - i * 0.1) / 0.4));
    const x = x0 + i * (cw + gap), y = 250 + (1 - easeOutBack(k)) * 120;
    const over = ui.mouse.x >= x && ui.mouse.x <= x + cw && ui.mouse.y >= y && ui.mouse.y <= y + ch;
    ui.buttons.push({ id: `relic:${i}`, x, y, w: cw, h: ch });
    ctx.save();
    ctx.globalAlpha = k;
    if (over) { ctx.shadowColor = r.color; ctx.shadowBlur = 34; }
    panel(ctx, x, y - (over ? 8 : 0), cw, ch, { color: boss ? '#ff6f9c' : r.color, alpha: 0.92, border: over ? 1 : 0.6, radius: 18 });
    ctx.restore();
    const yy = y - (over ? 8 : 0);
    ctx.save();
    ctx.globalAlpha = k;
    keycap(ctx, String(i + 1), x + 14, yy + 32, { size: 13 });
    text(ctx, boss ? 'BOSS RELIC' : 'RELIC', x + cw / 2, yy + 30, { size: 12, weight: 900, align: 'center', color: boss ? '#ff9ab8' : '#ffd166', stroke: false, spacing: 4 });
    drawRelicIcon(ctx, id, x + cw / 2, yy + 110 + Math.sin(t * 2 + i) * 4, 54);
    text(ctx, r.name.toUpperCase(), x + cw / 2, yy + 206, { size: 25, weight: 900, align: 'center', color: '#ffffff', spacing: 1 });
    wrap(ctx, r.desc, x + cw / 2, yy + 242, cw - 44, 21);
    ctx.restore();
  });

  // The relics already held.
  const held = run.relics ?? [];
  const py = 622;
  panel(ctx, VIEW.w / 2 - 330, py, 660, 64, { alpha: 0.8, border: 0.35 });
  text(ctx, `RELICS HELD ${held.length} / ${RELICS_MAX}`, VIEW.w / 2 - 310, py + 38, { size: 13, weight: 900, color: '#9cd8ea', stroke: false, spacing: 2 });
  if (!held.length) text(ctx, 'none yet: this is your first', VIEW.w / 2 - 110, py + 38, { size: 14, weight: 700, color: '#7fa6c0', stroke: false });
  held.forEach((id, i) => {
    const hx = VIEW.w / 2 - 110 + i * 150;
    drawRelicIcon(ctx, id, hx + 16, py + 32, 16);
    text(ctx, RELICS[id].name, hx + 38, py + 37, { size: 14, weight: 800, color: '#eafcff', stroke: false });
  });
}

function wrap(ctx, str, cx, y, maxW, lh) {
  ctx.font = `600 17px "Trebuchet MS", sans-serif`;
  let line = '';
  let yy = y;
  for (const w of str.split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, cx, yy, { size: 17, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) text(ctx, line, cx, yy, { size: 17, weight: 600, align: 'center', color: '#d8f4ff', stroke: false });
}
