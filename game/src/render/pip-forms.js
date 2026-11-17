// Pip's evolutions made visible. Each Aspect grows its own body part as it levels: RADIANCE a
// crown of sun-spines (a full solar crown at 6), CURRENT streaming fin ribbons (four at 6),
// RESONANCE orbiting echo rings (studded with nodes at 6), CARAPACE a rim of shell plates (spiked
// at 6). The leading Aspect also tints the bell. Drawn in the bell's own frame (+x forward).

import { ASPECTS, ASPECT_ORDER } from '../game/attributes.js';
import { drawGlow, withAlpha, mix } from './glow.js';
import { chain } from './rigs.js';
import { undulate, tentacle } from './anatomy.js';

const TAU = Math.PI * 2;

export function leadTint(aspects) {
  let best = null, bv = 0;
  for (const id of ASPECT_ORDER) if ((aspects?.[id] ?? 0) > bv) { bv = aspects[id]; best = id; }
  return best && bv >= 3 ? ASPECTS[best].color : null;
}

// Parts that sit behind the bell: fin ribbons and echo rings (world space, around Pip).
export function drawFormsBehind(ctx, p, rig, t, head, L, W) {
  const a = p.aspects;
  if (!a) return;
  const ch = Math.cos(head), sh = Math.sin(head);
  if (a.current >= 3) {
    const n = a.current >= 6 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const lat = side * W * (0.95 + Math.floor(i / 2) * 0.25);
      const rx = p.x + ch * L * 0.1 - sh * lat, ry = p.y + sh * L * 0.1 + ch * lat;
      const pts = chain(rig, `fin${i}`, 9, 6.5, rx, ry, head + Math.PI + side * 0.35, 0.06);
      const wav = undulate(pts, t * 1.4 + i, 5, 9, 4, 0);
      tentacle(ctx, wav, 7, 1.5, '#4dffc3', 0.7);
      tentacle(ctx, wav, 2.5, 0.6, '#d8fff2', 0.8);
    }
  }
  if (a.resonance >= 3) {
    const rings = a.resonance >= 6 ? 3 : 2;
    for (let k = 0; k < rings; k++) {
      const ph = (t * 0.7 + k / rings) % 1;
      const r = 26 + ph * 26;
      ctx.strokeStyle = withAlpha('#5ff0ff', 0.55 * (1 - ph));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();
    }
    if (a.resonance >= 6) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) {
        const ang = t * 1.6 + (k / 6) * TAU;
        drawGlow(ctx, p.x + Math.cos(ang) * 40, p.y + Math.sin(ang) * 40, 9, '#bff9ff', 0.9);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

// Parts that sit on the bell, in its rotated frame: crown spines and shell plates.
export function drawFormsOnBell(ctx, p, t, L, W) {
  const a = p.aspects;
  if (!a) return;
  if (a.carapace >= 3) {
    const plates = 7;
    for (let i = 0; i < plates; i++) {
      const ang = -Math.PI / 2 + ((i + 0.5) / plates) * Math.PI;
      const px = L * 0.3 + Math.cos(ang) * L * 0.62;
      const py = Math.sin(ang) * W * 0.98;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(-6, 0, 6, 0);
      g.addColorStop(0, '#ffd6e3');
      g.addColorStop(1, '#c2557e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 7.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 20, 50, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (a.carapace >= 6) {
        ctx.fillStyle = '#fff0f5';
        ctx.beginPath();
        ctx.moveTo(3, -3); ctx.lineTo(13, 0); ctx.lineTo(3, 3);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  if (a.radiance >= 3) {
    const spikes = a.radiance >= 6 ? 9 : 5;
    const len = a.radiance >= 6 ? 15 : 10;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, L * 0.9, 0, a.radiance >= 6 ? 34 : 22, '#ffd166', 0.8);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < spikes; i++) {
      const ang = (i / (spikes - 1) - 0.5) * 1.9;
      const bx = L * 0.55 + Math.cos(ang) * L * 0.45, by = Math.sin(ang) * W * 0.75;
      const fl = len * (0.8 + 0.2 * Math.sin(t * 6 + i));
      ctx.fillStyle = i % 2 ? '#ffe9a8' : '#ffd166';
      ctx.beginPath();
      ctx.moveTo(bx - Math.sin(ang) * 3, by + Math.cos(ang) * 3);
      ctx.lineTo(bx + Math.cos(ang) * fl, by + Math.sin(ang) * fl);
      ctx.lineTo(bx + Math.sin(ang) * 3, by - Math.cos(ang) * 3);
      ctx.fill();
    }
  }
}

// The bell's gradient colours, shifted toward the leading Aspect once Pip has evolved.
export function bellColors(p, hurt) {
  const tint = leadTint(p.aspects);
  const base = hurt ? '#ff9ec0' : '#8ff4ff';
  const edge = hurt ? '#ff4d7d' : '#1aa9cc';
  if (!tint || hurt) return { mid: base, edge };
  return { mid: mix(base, tint, 0.55), edge: mix(edge, tint, 0.5) };
}
