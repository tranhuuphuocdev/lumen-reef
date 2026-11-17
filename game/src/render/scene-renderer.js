// Composes one frame of the reef: backdrop, seabed, world entities in depth order, effects, light
// shafts, snow and vignette, with camera shake, damage flash and edge arrows for off-screen foes.

import { VIEW, ZOOM } from '../config.js';
import { drawBackdrop, drawFloor, drawLightShafts, drawSnow, drawVignette } from './background.js';
import { drawPip, drawEnemy, drawShadows } from './creatures.js';
import { beginRigFrame } from './rigs.js';
import { applyBloom } from './bloom.js';
import { drawCurrents, drawSonar } from './currents-art.js';
import { drawBolts, drawEnemyShots, drawPickups, drawInks, drawHazards } from './projectiles.js';
import { drawParticles, drawRings, drawTexts } from './fx-layer.js';
import { withAlpha } from './glow.js';

export function drawScene(ctx, run, t) {
  const cam = run.camera;
  const sh = run.fx.shake;
  const sx = sh ? (Math.sin(t * 91) + Math.sin(t * 57)) * sh * 0.5 : 0;
  const sy = sh ? (Math.cos(t * 83) + Math.sin(t * 61)) * sh * 0.5 : 0;
  const view = { x: cam.x + sx, y: cam.y + sy };

  drawBackdrop(ctx, view, t);
  ctx.save();
  ctx.translate(VIEW.w / 2, VIEW.h / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-VIEW.w / 2, -VIEW.h / 2);
  drawFloor(ctx, view, t);
  ctx.translate(Math.round(VIEW.w / 2 - view.x), Math.round(VIEW.h / 2 - view.y));
  beginRigFrame(t);
  drawCurrents(ctx, run, t);
  drawShadows(ctx, run);
  drawInks(ctx, run);
  drawHazards(ctx, run, t);
  drawPickups(ctx, run, t);
  drawRings(ctx, run);
  for (const e of run.enemies) if (!e.boss) drawEnemy(ctx, e, t);
  for (const e of run.enemies) if (e.boss) drawEnemy(ctx, e, t);
  drawBolts(ctx, run);
  if (!run.player.dead) drawPip(ctx, run.player, t, run.player.aim);
  drawEnemyShots(ctx, run);
  drawSonar(ctx, run);
  drawParticles(ctx, run);
  drawTexts(ctx, run);
  ctx.restore();

  applyBloom(ctx);
  drawLightShafts(ctx, view, t);
  drawSnow(ctx, view, t);
  drawOffscreenArrows(ctx, run, view, t);
  drawVignette(ctx);

  const p = run.player;
  if (p.hp === 1 && !p.dead) {
    const a = 0.18 + 0.12 * Math.sin(t * 6);
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.4, VIEW.w / 2, VIEW.h / 2, VIEW.h);
    g.addColorStop(0, 'rgba(255, 40, 80, 0)');
    g.addColorStop(1, `rgba(255, 40, 80, ${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  if (run.fx.flash > 0) {
    ctx.fillStyle = withAlpha(run.fx.flashColor, run.fx.flash * 0.45);
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
}

function drawOffscreenArrows(ctx, run, view, t) {
  const m = 30;
  for (const e of run.enemies) {
    if (!(e.boss || e.elite)) continue;
    const sx = (e.x - view.x) * ZOOM + VIEW.w / 2, sy = (e.y - view.y) * ZOOM + VIEW.h / 2;
    if (sx > -e.r && sx < VIEW.w + e.r && sy > -e.r && sy < VIEW.h + e.r) continue;
    const a = Math.atan2(sy - VIEW.h / 2, sx - VIEW.w / 2);
    const x = Math.max(m, Math.min(VIEW.w - m, sx)), y = Math.max(m + 40, Math.min(VIEW.h - m, sy));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = withAlpha(e.boss ? '#ff5c8a' : '#ffd166', 0.7 + 0.3 * Math.sin(t * 8));
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10);
    ctx.fill();
    ctx.restore();
  }
}
