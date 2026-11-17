// Cached soft-glow sprites: one radial gradient canvas per colour, stamped with additive blending
// so hundreds of bioluminescent lights cost a drawImage each.

const cache = new Map();

export function glowSprite(color, size = 64) {
  const key = `${color}|${size}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size, size, 0, size, size, size);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, withAlpha(color, 0.55));
  grad.addColorStop(0.6, withAlpha(color, 0.14));
  grad.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size * 2, size * 2);
  cache.set(key, c);
  return c;
}

export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
  const s = glowSprite(color);
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

export function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
