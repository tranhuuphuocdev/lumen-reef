// The dive's journey, tide by tide: one bar per tide sized by the score it earned, coloured by the
// current it was swum under, crowned on boss tides and starred when flawless. Unreached tides
// stay as dim slots so a short dive shows how far it fell short.

import { WAVES_TOTAL } from '../config.js';
import { ROUTES } from '../game/tides.js';
import { text } from './widgets.js';
import { withAlpha } from '../render/glow.js';

export function drawJourneyChart(ctx, log, x, y, w, h, { grow = 1 } = {}) {
  const top = Math.max(1, ...log.map((l) => l.score));
  const slot = w / WAVES_TOTAL, bw = slot * 0.62;
  const base = y + h;
  ctx.save();
  ctx.strokeStyle = 'rgba(159, 210, 230, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const gy = base - (h * i) / 3;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  for (let n = 1; n <= WAVES_TOTAL; n++) {
    const l = log.find((e) => e.n === n);
    const bx = x + (n - 1) * slot + (slot - bw) / 2;
    if (!l) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.roundRect(bx, base - 8, bw, 8, 3); ctx.fill();
    } else {
      const col = l.cleared ? ROUTES[l.route]?.color ?? '#9cd8ea' : '#ff4d6d';
      const bh = Math.max(6, (l.score / top) * (h - 26) * grow);
      const g = ctx.createLinearGradient(0, base - bh, 0, base);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, col);
      g.addColorStop(1, withAlpha(col, 0.35));
      ctx.fillStyle = g;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(bx, base - bh, bw, bh, [5, 5, 2, 2]); ctx.fill();
      ctx.shadowBlur = 0;
      const mark = l.boss ? '♛' : l.flawless ? '★' : !l.cleared ? '✕' : '';
      if (mark) text(ctx, mark, bx + bw / 2, base - bh - 6, { size: l.boss ? 18 : 14, weight: 900, align: 'center', color: l.boss ? '#ff9ab8' : l.cleared ? '#ffd166' : '#ff4d6d' });
    }
    text(ctx, `${n}`, bx + bw / 2, base + 16, { size: 12, weight: 900, align: 'center', color: '#9cc0d4', stroke: false });
  }
  ctx.restore();
}

// Feats a dive can earn, best first; the results screen shows the ones this dive did.
export function feats(run) {
  const log = run.tideLog ?? [];
  const flawless = log.filter((l) => l.cleared && l.flawless).length;
  const risky = log.filter((l) => l.route !== 'slack').length;
  const out = [];
  if (run.outcome === 'victory' && run.hitsTaken === 0) out.push(['UNTOUCHED', '#ffd166']);
  if (run.bossesSlain >= 2) out.push(['BOTH BOSSES SLAIN', '#ff9ab8']);
  else if (run.bossesSlain === 1) out.push(['MAW SLAYER', '#ff9ab8']);
  if (flawless) out.push([`FLAWLESS TIDES ×${flawless}`, '#ffd166']);
  if (run.bestCombo >= 100) out.push([`CHAIN ${run.bestCombo}`, '#7ff6ff']);
  if ((run.perfects ?? 0) >= 10) out.push([`${run.perfects} PERFECT DODGES`, '#4dffc3']);
  if (risky >= 5) out.push([`RISK TAKER ×${risky}`, '#ff6f9c']);
  if ((run.forms?.length ?? 0) >= 2) out.push([`${run.forms.length} EVOLUTIONS`, '#b78cff']);
  return out;
}
