// The two bosses, drawn large and detailed. The Undertow Maw: a deep-sea leviathan with a
// bending body, mottled skin, a hinged lower jaw of needle teeth, beating pectoral and tail fins,
// dorsal spines, photophores and its lantern lure. Queen Nacre: a giant scallop with an
// iridescent ribbed shell, a frilled mantle lined with glowing blue eyes, and the great pearl.

import { drawGlow, withAlpha, mix } from './glow.js';
import { chain, blink } from './rigs.js';
import { undulate, eye, fin } from './anatomy.js';

const TAU = Math.PI * 2;
const hash = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

export function drawMaw(ctx, e, t, rig) {
  const R = e.r;
  const face = e.face;
  const pts = chain(rig, 'spine', 6, R * 0.42, e.x + Math.cos(face) * R * 0.6, e.y + Math.sin(face) * R * 0.6, face + Math.PI, 0.18);
  const sp = undulate(pts, t, R * 0.12, e.state === 'charge' ? 10 : 4, 3, 0.3);
  const flip = Math.cos(face) < 0 ? -1 : 1; // keep the belly down on screen
  const open = e.state === 'ring' || e.state === 'intro' || (e.state === 'charge' && !e.telegraph) ? 0.5 + Math.sin(t * 7) * 0.08 : e.telegraph ? 0.25 : 0.12 + Math.sin(t * 1.5) * 0.04;
  const hurt = e.hitFlash > 0;
  const skin = hurt ? '#ff8fb3' : '#b5325e';
  const deep = '#2a0616';

  // Charge telegraph: a red lane along the line it is about to rush down.
  if (e.telegraph && e.aim !== undefined) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.aim);
    const pulse = 0.25 + 0.2 * Math.sin(t * 24);
    const lg = ctx.createLinearGradient(0, 0, 1100, 0);
    lg.addColorStop(0, `rgba(255, 45, 85, ${pulse + 0.15})`);
    lg.addColorStop(1, 'rgba(255, 45, 85, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, -R * 0.9, 1100, R * 1.8);
    ctx.strokeStyle = `rgba(255, 120, 150, ${pulse + 0.3})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -t * 120;
    ctx.strokeRect(0, -R * 0.9, 1100, R * 1.8);
    ctx.restore();
  }
  // Tail fin at the end of the bending spine.
  const tail = sp[sp.length - 1], pre = sp[sp.length - 2];
  const ta = Math.atan2(tail.y - pre.y, tail.x - pre.x);
  fin(ctx, tail.x, tail.y, ta + Math.sin(t * 5) * 0.35, R * 1.0, R * 0.75, '#c2416e', { rays: 7, alpha: 0.85 });

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(face);
  ctx.scale(1, flip);
  const bend = Math.sin(t * 4) * 0.06;

  // Far pectoral fin (behind the body).
  fin(ctx, -R * 0.05, R * 0.55, Math.PI * 0.62 + Math.sin(t * 6) * 0.35, R * 0.75, R * 0.4, '#8a2448', { rays: 6, alpha: 0.7 });

  // Lower jaw, hinged under the eye.
  ctx.save();
  ctx.translate(-R * 0.05, R * 0.15);
  ctx.rotate(open * 0.9);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(R * 0.7, R * 0.55, R * 1.25, R * 0.12);
  ctx.lineTo(R * 1.2, -R * 0.02);
  ctx.quadraticCurveTo(R * 0.6, R * 0.12, 0, -R * 0.1);
  ctx.closePath();
  const jg = ctx.createLinearGradient(0, -R * 0.1, 0, R * 0.55);
  jg.addColorStop(0, mix(skin, '#ffffff', 0.15));
  jg.addColorStop(1, deep);
  ctx.fillStyle = jg;
  ctx.fill();
  // Lower teeth, curved needles pointing up.
  ctx.fillStyle = '#fff4f7';
  for (let i = 0; i < 7; i++) {
    const x = R * (0.3 + i * 0.13), y = R * (0.08 - i * 0.005);
    const h = R * (0.22 + hash(i) * 0.14);
    ctx.beginPath(); ctx.moveTo(x - R * 0.03, y); ctx.quadraticCurveTo(x + R * 0.02, y - h * 0.6, x + R * 0.06, y - h); ctx.lineTo(x + R * 0.04, y); ctx.fill();
  }
  ctx.restore();

  // Mouth cavity.
  ctx.fillStyle = '#0d0106';
  ctx.beginPath();
  ctx.moveTo(-R * 0.05, R * 0.1);
  ctx.quadraticCurveTo(R * 0.6, R * 0.1 + open * R * 0.8, R * 1.15, open * R * 0.9);
  ctx.lineTo(R * 1.2, -R * 0.05);
  ctx.closePath();
  ctx.fill();

  // Body and head: a heavy skull tapering back into the tail.
  ctx.beginPath();
  ctx.moveTo(R * 1.22, -R * 0.02);
  ctx.bezierCurveTo(R * 1.15, -R * 0.75, R * 0.25, -R * (1.05 + bend), -R * 0.55, -R * 0.62);
  ctx.bezierCurveTo(-R * 1.1, -R * 0.35, -R * 1.25, R * 0.05, -R * 1.3, R * 0.12);
  ctx.bezierCurveTo(-R * 1.1, R * 0.45, -R * 0.4, R * 0.62, -R * 0.05, R * 0.2);
  ctx.quadraticCurveTo(R * 0.55, R * 0.02, R * 1.22, -R * 0.02);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -R, 0, R * 0.6);
  bg.addColorStop(0, mix(skin, '#ffd0de', 0.35));
  bg.addColorStop(0.45, skin);
  bg.addColorStop(1, deep);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Mottling and scars.
  for (let i = 0; i < 26; i++) {
    const x = -R * 1.1 + hash(i) * R * 2.2, y = -R * 0.9 + hash(i + 40) * R * 1.3;
    ctx.fillStyle = withAlpha(i % 3 ? deep : '#ffd1e0', i % 3 ? 0.35 : 0.15);
    ctx.beginPath();
    ctx.ellipse(x, y, R * (0.04 + hash(i + 7) * 0.08), R * (0.03 + hash(i + 9) * 0.05), hash(i + 2) * 3, 0, TAU);
    ctx.fill();
  }
  // Specular sheen along the back.
  const sg = ctx.createLinearGradient(0, -R * 0.95, 0, -R * 0.4);
  sg.addColorStop(0, 'rgba(255, 230, 240, 0.45)');
  sg.addColorStop(1, 'rgba(255, 230, 240, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-R * 1.3, -R * 1.1, R * 2.6, R * 0.7);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 170, 200, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Upper teeth hanging from the snout.
  ctx.fillStyle = '#fff4f7';
  for (let i = 0; i < 8; i++) {
    const x = R * (0.15 + i * 0.13), y = -R * 0.01 + i * R * 0.0;
    const h = R * (0.2 + hash(i + 20) * 0.18) * (0.6 + open);
    ctx.beginPath(); ctx.moveTo(x - R * 0.03, y); ctx.quadraticCurveTo(x + R * 0.02, y + h * 0.6, x + R * 0.06, y + h); ctx.lineTo(x + R * 0.045, y); ctx.fill();
  }

  // Dorsal spines with webbing.
  ctx.fillStyle = withAlpha('#7d1a3e', 0.7);
  ctx.beginPath();
  ctx.moveTo(R * 0.2, -R * 0.9);
  for (let i = 0; i < 5; i++) {
    const x = R * (0.15 - i * 0.22), y = -R * (0.92 - i * 0.07);
    ctx.lineTo(x - R * 0.06, y - R * (0.35 + Math.sin(t * 3 + i) * 0.05));
    ctx.lineTo(x - R * 0.16, y + R * 0.02);
  }
  ctx.closePath();
  ctx.fill();

  // Near pectoral fin, beating.
  fin(ctx, -R * 0.15, R * 0.25, Math.PI * 0.68 + Math.sin(t * 6 + 1) * 0.45, R * 0.85, R * 0.45, '#d4507e', { rays: 6, alpha: 0.85 });

  // Photophores along the flank.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = R * (0.6 - i * 0.2), y = -R * 0.12 + Math.sin(i * 0.9) * R * 0.08 + i * R * 0.02;
    drawGlow(ctx, x, y, R * 0.16, '#ff8ab4', 0.55 + 0.45 * Math.sin(t * 3 + i));
  }
  ctx.globalCompositeOperation = 'source-over';

  // The eye: huge, deep-sea pale, red when it lines up a charge.
  eye(ctx, R * 0.5, -R * 0.42, R * 0.2, -0.1, { iris: e.telegraph ? '#ff2d55' : '#f5e9a8', pupil: '#0a0004', lid: e.telegraph ? 0 : blink(rig, t) * 0.8, glow: e.telegraph ? '#ff2d55' : null, slit: true });

  // The lure: a flexible stalk from the brow to a glowing bulb.
  const lx = R * 1.45 + Math.sin(t * 2) * R * 0.1, ly = -R * 1.25 + Math.cos(t * 2.4) * R * 0.1;
  ctx.strokeStyle = '#8f2a50';
  ctx.lineWidth = R * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R * 0.35, -R * 0.82);
  ctx.bezierCurveTo(R * 0.6, -R * 1.65, R * 1.2, -R * 1.6, lx, ly);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, lx, ly, R * 0.75 + (e.lureGlow ?? 0) * R + Math.sin(t * 6) * R * 0.06, '#fff1a8', 0.95);
  ctx.globalCompositeOperation = 'source-over';
  const lg = ctx.createRadialGradient(lx - 2, ly - 2, 1, lx, ly, R * 0.13);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(1, '#ffe27a');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lx, ly, R * 0.12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// The exposed weak point: a turning gold reticle the player should hit right now.
export function drawWeakPoint(ctx, e, t) {
  if (!(e.exposed > 0)) return;
  const R = e.r;
  const x = e.x, y = e.y;
  const a = Math.min(1, e.exposed * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = a;
  ctx.rotate(t * 1.5);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  const rr = R * 0.55 + Math.sin(t * 10) * 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, rr, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + Math.PI / 2 - 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.cos(i * Math.PI / 2) * (rr + 6), Math.sin(i * Math.PI / 2) * (rr + 6));
    ctx.lineTo(Math.cos(i * Math.PI / 2) * (rr + 18), Math.sin(i * Math.PI / 2) * (rr + 18));
    ctx.stroke();
  }
  ctx.rotate(-t * 1.5);
  ctx.font = '900 16px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(2, 10, 24, 0.85)';
  ctx.strokeText('WEAK POINT x2.2', 0, -rr - 26);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('WEAK POINT x2.2', 0, -rr - 26);
  ctx.restore();
}

export function drawNacre(ctx, e, t, rig) {
  const R = e.r;
  const closed = e.state === 'closed';
  const gape = closed ? 0.04 : 0.3 + Math.sin(t * 1.8) * 0.06;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(Math.sin(t * 0.6) * 0.08);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, 0, 0, R * 2.2, '#ffe3a3', closed ? 0.08 : 0.14);
  ctx.globalCompositeOperation = 'source-over';

  // Lower valve (seen through the gape), then the mantle frill with its eyes, then upper valve.
  valve(ctx, R, 1, e, t);
  if (!closed) {
    // Mantle frill.
    ctx.fillStyle = 'rgba(255, 190, 210, 0.75)';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI;
      const rr = R * (1.02 + 0.04 * Math.sin(i * 2.3 + t * 5));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.12 + R * gape * 0.3;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineTo(R, R * gape * 0.6);
    ctx.lineTo(-R, R * gape * 0.6);
    ctx.fill();
    // The great pearl.
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, 0, R * 0.1, R * 0.8, '#fff3d0', 0.45);
    drawGlow(ctx, 0, R * 0.1, R * 0.5, '#b9f3ff', 0.3);
    ctx.globalCompositeOperation = 'source-over';
    const pg = ctx.createRadialGradient(-R * 0.1, 0, 2, 0, R * 0.1, R * 0.3);
    pg.addColorStop(0, '#ffffff');
    pg.addColorStop(0.55, '#fff0d6');
    pg.addColorStop(0.85, '#e0c8f0');
    pg.addColorStop(1, '#a98fc6');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(0, R * 0.1, R * 0.28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-R * 0.1, -R * 0.02, R * 0.07, R * 0.04, -0.6, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(0, -R * gape * 0.9);
  valve(ctx, R, -1, e, t);
  ctx.restore();
  // A row of glowing blue eyes along the mantle edge, like a real scallop's.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 1.08 + (i / 13) * Math.PI * 0.84;
    const x = Math.cos(a) * R * 1.0, y = Math.sin(a) * R * 0.25 + R * gape * 0.1 - R * gape * 0.4;
    const on = closed ? 0.25 : 0.7 + 0.3 * Math.sin(t * 3 + i);
    drawGlow(ctx, x, y, R * 0.12, '#5fd0ff', on);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 1.08 + (i / 13) * Math.PI * 0.84;
    const x = Math.cos(a) * R * 1.0, y = Math.sin(a) * R * 0.25 + R * gape * 0.1 - R * gape * 0.4;
    ctx.fillStyle = closed ? '#3a5a7a' : '#d8f6ff';
    ctx.beginPath(); ctx.arc(x, y, R * 0.035, 0, TAU); ctx.fill();
  }
  if (closed) {
    ctx.strokeStyle = withAlpha('#c9b6ff', 0.75);
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.45, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// One scallop valve: a ribbed fan with an iridescent sheen and growth rings; side = -1 for the
// upper valve (fan opening upward on screen), +1 for the lower one.
function valve(ctx, R, side, e, t) {
  const ribs = 15;
  const hurt = e.hitFlash > 0;
  ctx.save();
  ctx.scale(1, side < 0 ? 1 : -0.55);
  ctx.beginPath();
  ctx.moveTo(-R * 0.28, R * 0.3);
  for (let i = 0; i <= ribs; i++) {
    const a = Math.PI + 0.12 + (i / ribs) * (Math.PI - 0.24);
    const rr = R * (1.12 + (i % 2 ? 0.05 : 0));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.92 + R * 0.12);
  }
  ctx.lineTo(R * 0.28, R * 0.3);
  // The hinge ears.
  ctx.lineTo(R * 0.45, R * 0.42);
  ctx.lineTo(-R * 0.45, R * 0.42);
  ctx.closePath();
  const cg = ctx.createConicGradient(t * 0.2, 0, R * 0.3);
  const sheen = hurt ? ['#fff4f8', '#ffd0dc', '#fff4f8'] : ['#e9cfa8', '#d99ab4', '#9cc4e6', '#b9a2e0', '#e9cfa8'];
  sheen.forEach((c, i) => cg.addColorStop(i / (sheen.length - 1), c));
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const shade = ctx.createRadialGradient(0, R * 0.3, R * 0.1, 0, R * 0.3, R * 1.3);
  shade.addColorStop(0, 'rgba(255,255,255,0.35)');
  shade.addColorStop(0.7, 'rgba(120, 80, 120, 0.1)');
  shade.addColorStop(1, 'rgba(60, 30, 70, 0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(-R * 1.4, -R * 1.4, R * 2.8, R * 2);
  // Radial ribs.
  for (let i = 0; i <= ribs; i++) {
    const a = Math.PI + 0.12 + (i / ribs) * (Math.PI - 0.24);
    ctx.strokeStyle = i % 2 ? 'rgba(120, 70, 100, 0.35)' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = i % 2 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, R * 0.3);
    ctx.lineTo(Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.1 + R * 0.12);
    ctx.stroke();
  }
  // Growth rings.
  ctx.strokeStyle = 'rgba(110, 60, 90, 0.25)';
  ctx.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath();
    ctx.ellipse(0, R * 0.3, R * 0.27 * k, R * 0.25 * k, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(90, 50, 80, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
