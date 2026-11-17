// Render-side animation rigs. Each creature that bends (eels, fish, jelly tentacles, the Maw's
// body) owns follow-the-leader point chains here, keyed by entity id: the head is pinned to the
// creature and every link trails the one before it at a fixed length, so bodies curve through
// turns the way a swimming animal does. The simulation never reads this; it is pure presentation.

const rigs = new Map();
let frameT = 0;

export function beginRigFrame(t) {
  // Drop rigs whose owner has not been drawn for a while.
  if (t - frameT > 0.5 || t < frameT) for (const [id, r] of rigs) if (t - r.seen > 1 || t < r.seen) rigs.delete(id);
  frameT = t;
}

export function getRig(id, t) {
  let r = rigs.get(id);
  if (!r) { r = { chains: {}, seen: t, last: t, blink: 2 + (id % 7) * 0.6 }; rigs.set(id, r); }
  r.dt = Math.min(0.05, Math.max(0, t - r.last));
  r.last = t;
  r.seen = t;
  return r;
}

// A chain of n points trailing from (x, y); `back` is the direction the chain hangs toward
// when first made. Links keep length `seg`; `stiff` pulls each link toward the straight line.
export function chain(rig, key, n, seg, x, y, back, stiff = 0.12) {
  let c = rig.chains[key];
  if (!c) {
    c = [];
    for (let i = 0; i < n; i++) c.push({ x: x + Math.cos(back) * seg * i, y: y + Math.sin(back) * seg * i });
    rig.chains[key] = c;
  }
  c[0].x = x;
  c[0].y = y;
  for (let i = 1; i < n; i++) {
    const a = c[i - 1], b = c[i];
    // Gentle straightening toward the hang direction keeps chains from collapsing on themselves.
    const prev = i > 1 ? Math.atan2(a.y - c[i - 2].y, a.x - c[i - 2].x) : back;
    b.x += (a.x + Math.cos(prev) * seg - b.x) * stiff;
    b.y += (a.y + Math.sin(prev) * seg - b.y) * stiff;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    b.x = a.x + (dx / d) * seg;
    b.y = a.y + (dy / d) * seg;
  }
  return c;
}

// Eye blinks: returns 0..1 lid closure, a quick blink every few seconds.
export function blink(rig, t) {
  const period = rig.blink;
  const k = (t % period) / period;
  return k > 0.96 ? Math.sin(((k - 0.96) / 0.04) * Math.PI) : 0;
}
