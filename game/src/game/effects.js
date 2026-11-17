// Visual feedback the simulation spawns: particle bursts, floating score text, shock rings,
// lightning arcs, screen shake and flashes. Updated in the same fixed tick as the game.

const MAX_PARTICLES = 900;

export function burst(run, x, y, color, count = 12, speed = 160, life = 0.6, size = 3) {
  const { particles } = run.fx;
  const rng = run.rng;
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const a = rng.angle();
    const v = speed * (0.35 + rng.next() * 0.9);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + rng.next() * 0.6), max: life, color, size: size * (0.6 + rng.next() * 0.8), drag: 3.2, glow: true });
  }
}

export function bubbles(run, x, y, count = 4) {
  const rng = run.rng;
  for (let i = 0; i < count && run.fx.particles.length < MAX_PARTICLES; i++) {
    run.fx.particles.push({ x: x + rng.range(-8, 8), y: y + rng.range(-8, 8), vx: rng.range(-20, 20), vy: rng.range(-90, -40), life: rng.range(0.6, 1.3), max: 1.3, color: '#cff8ff', size: rng.range(1.5, 4), drag: 1, bubble: true });
  }
}

export function floatText(run, x, y, text, color = '#ffffff', size = 18) {
  if (run.fx.texts.length > 60) run.fx.texts.shift();
  run.fx.texts.push({ x, y, text, color, size, life: 0.9, max: 0.9 });
}

// Damage numbers: rapid hits on one foe add up into a single number that grows and re-pops,
// instead of a pile of overlapping digits.
export function damageText(run, e, amount, crit) {
  const texts = run.fx.texts;
  for (const o of texts) {
    if (o.target === e.id && o.life > o.max - 0.45) {
      o.sum += amount;
      o.crit = o.crit || crit;
      o.text = `${Math.round(o.sum)}${o.crit ? '!' : ''}`;
      o.color = o.crit ? '#ffd166' : '#e8fbff';
      o.size = Math.min(34, (o.crit ? 20 : 15) + Math.log2(1 + o.sum / 20) * 3);
      o.life = o.max;
      return;
    }
  }
  if (texts.length > 60) texts.shift();
  texts.push({ x: e.x + run.rng.range(-8, 8), y: e.y - e.r - 8, text: `${Math.round(amount)}${crit ? '!' : ''}`, color: crit ? '#ffd166' : '#e8fbff', size: crit ? 20 : 15, life: 0.9, max: 0.9, target: e.id, sum: amount, crit });
}

export function ring(run, x, y, color, radius = 60, life = 0.4, width = 4) {
  run.fx.rings.push({ x, y, color, radius, life, max: life, width });
}

export function arc(run, x1, y1, x2, y2, color = '#bff9ff') {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = i === 0 || i === n ? 0 : run.rng.range(-14, 14);
    pts.push({ x: x1 + (x2 - x1) * t + j, y: y1 + (y2 - y1) * t + j });
  }
  run.fx.bolts.push({ pts, color, life: 0.18, max: 0.18 });
}

export function shake(run, amount) {
  run.fx.shake = Math.min(22, run.fx.shake + amount);
}

export function flash(run, amount, color = '#ffffff') {
  run.fx.flash = Math.max(run.fx.flash, amount);
  run.fx.flashColor = color;
}

export function updateEffects(run, dt) {
  const fx = run.fx;
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) { fx.particles[i] = fx.particles[fx.particles.length - 1]; fx.particles.pop(); continue; }
    const k = Math.exp(-p.drag * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    t.y -= 38 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  for (let i = fx.rings.length - 1; i >= 0; i--) {
    fx.rings[i].life -= dt;
    if (fx.rings[i].life <= 0) fx.rings.splice(i, 1);
  }
  for (let i = fx.bolts.length - 1; i >= 0; i--) {
    fx.bolts[i].life -= dt;
    if (fx.bolts[i].life <= 0) fx.bolts.splice(i, 1);
  }
  if (fx.bossDeath) {
    const d = fx.bossDeath;
    const before = d.t;
    d.t += dt;
    // A chain of eruptions across the carcass, then one final bloom.
    if (Math.floor(d.t / 0.11) > Math.floor(before / 0.11) && d.t < 1.5) {
      const a = run.rng.angle(), rr = run.rng.range(0, d.r);
      burst(run, d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, run.rng.chance(0.5) ? d.color : '#ffffff', 16, 260, 0.7, 4);
      ring(run, d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, d.color, 50, 0.35, 4);
      shake(run, 4);
    }
    if (before < 1.5 && d.t >= 1.5) {
      burst(run, d.x, d.y, '#ffffff', 90, 520, 1.4, 5);
      ring(run, d.x, d.y, d.color, d.r * 4, 0.9, 10);
      flash(run, 0.6, '#ffffff');
      shake(run, 18);
    }
    if (d.t > 2.5) fx.bossDeath = null;
  }
  fx.shake = Math.max(0, fx.shake - dt * 40);
  fx.flash = Math.max(0, fx.flash - dt * 2.5);
  fx.slowmo = Math.max(0, fx.slowmo - dt);
}
