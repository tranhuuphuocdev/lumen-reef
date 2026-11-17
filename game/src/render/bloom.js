// Bloom: the frame is shrunk to a quarter, its bright parts kept and blurred, then added back
// over the full frame, so every glowing creature and bolt bleeds light like it would underwater.

let small = null;
let sctx = null;

export function applyBloom(ctx, strength = 0.38) {
  const src = ctx.canvas;
  const w = Math.max(1, Math.round(src.width / 4)), h = Math.max(1, Math.round(src.height / 4));
  if (!small || small.width !== w || small.height !== h) {
    small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    sctx = small.getContext('2d');
  }
  sctx.globalCompositeOperation = 'copy';
  sctx.filter = 'brightness(0.8) contrast(2.8) saturate(1.3) blur(3px)';
  sctx.drawImage(src, 0, 0, w, h);
  sctx.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, src.width, src.height);
  ctx.restore();
}
