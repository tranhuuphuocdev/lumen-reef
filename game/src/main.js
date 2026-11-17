// The game shell: canvas sizing, the fixed-step loop, the screen flow (title → dive ⇄ mutation
// choice / pause → results → dive again), input routing, sound events and the saved best score.

import { VIEW, TICK, ZOOM } from './config.js';
import { stepRun, followCamera } from './game/sim.js';
import { createRun } from './game/state.js';
import { autopilot, autopilotChoice, createAttractRun } from './game/autopilot.js';
import { drawChoices, applyMutation } from './game/upgrades.js';
import { releasePulse } from './game/player.js';
import { buildReef } from './render/background.js';
import { drawScene } from './render/scene-renderer.js';
import { drawHud, drawCrosshair } from './ui/hud.js';
import { drawTitle, DIFF_ORDER } from './ui/title-screen.js';
import { drawLevelUp } from './ui/levelup-screen.js';
import { drawRouteChoice } from './ui/route-screen.js';
import { chooseRoute } from './game/waves.js';
import { drawResults, drawPause } from './ui/results-screen.js';
import { createInput } from './core/input.js';
import { createAudio } from './core/audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
buildReef(7);

const ui = {
  mode: 'title',
  mouse: input.mouse,
  buttons: [],
  banner: null,
  diffIdx: 1,
  best: loadBest(),
  newBest: false,
  muted: false,
  cardSel: -1,
  levelAge: 0,
  resultAge: 0,
};

let run = createAttractRun(4242);
let clock = 0;

function loadBest() {
  try { return Number(localStorage.getItem('lumen-reef-best')) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('lumen-reef-best', String(v)); } catch { /* storage may be blocked */ }
}

function startDive() {
  audio.init();
  run = createRun({ difficulty: DIFF_ORDER[ui.diffIdx] });
  ui.mode = 'play';
  ui.banner = null;
  ui.hint = null;
  ui.shownScore = 0;
  ui.newBest = false;
  audio.sfx.pick();
}

function toTitle() {
  run = createAttractRun(4242 + Math.floor(clock));
  ui.mode = 'title';
}

function finish() {
  ui.mode = 'results';
  ui.resultAge = 0;
  if (run.score > ui.best) { ui.best = Math.floor(run.score); ui.newBest = true; saveBest(ui.best); }
}

// One line of teaching at the waves that bring something new.
const WAVE_HINTS = {
  1: 'Hold the left mouse button to fire · dash through a shot at the last moment for a PERFECT DODGE',
  2: 'Lash Eels flash a red line before they lunge: sidestep, or break it with your Pulse (E)',
  3: 'Currents carry you, your foes and every shot: ride a stream to outrun danger',
  4: 'Chain 25 kills without being hit to start a SURGE',
  5: 'Boss: your Pulse interrupts its attacks and exposes the WEAK POINT',
  6: 'A vortex swirls in the reef: its pull bends your bolts and drags you inward',
  10: 'Queen Nacre hides in her shell: a Pulse cracks it open',
};

function showHint(text) {
  ui.hint = { text, life: 7, max: 7 };
}

function showBanner(title, sub, color, big = false, life = 2.4) {
  ui.banner = { title, sub, color, big, life, max: life };
}

function playerControl() {
  const p = run.player;
  const m = input.mouse;
  const aimX = run.camera.x + (m.x - VIEW.w / 2) / ZOOM;
  const aimY = run.camera.y + (m.y - VIEW.h / 2) / ZOOM;
  run.lookX = m.x - VIEW.w / 2;
  run.lookY = m.y - VIEW.h / 2;
  return {
    move: input.moveAxis(),
    aimX, aimY,
    fire: m.left || input.isDown('KeyJ'),
    dash: input.wasPressed('Space', 'ShiftLeft', 'ShiftRight') || m.rightClicked,
    pulse: input.wasPressed('KeyE', 'KeyQ') && p.pulse >= 100,
  };
}

function drainEvents() {
  for (const ev of run.events) {
    const d = ev.data ?? {};
    switch (ev.name) {
      case 'shoot': audio.sfx.shoot(); break;
      case 'hit': audio.sfx.hit(); break;
      case 'kill': audio.sfx.kill(d.big); break;
      case 'glim': audio.sfx.glim(d.pitch); break;
      case 'heart': audio.sfx.heart(); break;
      case 'dash': audio.sfx.dash(); break;
      case 'hurt': audio.sfx.hurt(); break;
      case 'shield': audio.sfx.shield(); break;
      case 'pulse': audio.sfx.pulse(); break;
      case 'pulseReady': audio.sfx.pick(); break;
      case 'enemyShot': audio.sfx.enemyShot(); break;
      case 'explode': audio.sfx.explode(); break;
      case 'waveStart':
        audio.sfx.waveStart();
        if (WAVE_HINTS[d.n]) showHint(WAVE_HINTS[d.n]);
        showBanner(`WAVE ${d.n}`, d.boss ? `${d.name.toUpperCase()} — SOMETHING VAST STIRS` : d.name.toUpperCase(), d.boss ? '#ff6f9c' : '#7ff6ff');
        break;
      case 'boss':
        audio.sfx.bossRoar();
        showBanner(d.name, d.title.toUpperCase(), '#ff5c8a', true, 3);
        break;
      case 'waveClear':
        audio.sfx.waveClear();
        showBanner(d.flawless ? 'FLAWLESS TIDE' : 'TIDE TURNED', `+${d.bonus} BONUS`, '#ffd166', false, 2);
        break;
      case 'victory': audio.sfx.victory(); showBanner('VICTORY', 'THE ABYSS IS LIT', '#ffd166', true, 3); break;
      case 'playerDown': audio.sfx.defeat(); break;
      case 'perfect': audio.sfx.perfect(); break;
      case 'evolve':
        audio.sfx.victory();
        showBanner(`EVOLVED: ${d.name.toUpperCase()}`, d.power.toUpperCase(), d.color, true, 3);
        break;
      case 'lastLight':
        audio.sfx.bossPhase();
        showBanner('LAST LIGHT', 'ONE SHELL LEFT · DAMAGE ×1.5 · PULSE CHARGES ×2', '#ff6f9c', false, 2.4);
        break;
      case 'surge': audio.sfx.surge(); break;
      case 'interrupt': audio.sfx.interrupt(); break;
      case 'milestone': audio.sfx.milestone(); break;
      case 'bossPhase':
        audio.sfx.bossPhase();
        showBanner(`PHASE ${d.n}`, d.name, '#ff5c8a', true, 2.2);
        if (d.n === 2) showHint(run.wave.boss?.boss === 'maw' ? 'The Undertow drags you toward its jaws: swim against the swirl, dash out' : 'Pearls fall faster: keep moving, pulse to clear the storm');
        break;
      default: break;
    }
  }
  run.events.length = 0;
}

function clickedButton() {
  if (!input.mouse.clicked) return null;
  const m = input.mouse;
  for (const b of ui.buttons) if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) return b.id;
  return null;
}

function update(dt) {
  const hit = clickedButton();
  if (input.wasPressed('KeyM')) { audio.init(); ui.muted = audio.toggleMute(); }
  if (ui.banner) ui.banner.life -= dt;
  if (ui.hint) ui.hint.life -= dt;
  if (input.wasPressed('Minus', 'NumpadSubtract')) { audio.init(); ui.volume = audio.setVolume(audio.volume - 0.1); ui.volumeT = 1.5; }
  if (input.wasPressed('Equal', 'NumpadAdd')) { audio.init(); ui.volume = audio.setVolume(audio.volume + 0.1); ui.volumeT = 1.5; }
  ui.volumeT = Math.max(0, (ui.volumeT ?? 0) - dt);

  if (ui.mode === 'title') {
    audio.setIntensity(1);
    if (input.wasPressed('ArrowLeft', 'KeyA')) { ui.diffIdx = (ui.diffIdx + 2) % 3; audio.init(); audio.sfx.hover(); }
    if (input.wasPressed('ArrowRight', 'KeyD')) { ui.diffIdx = (ui.diffIdx + 1) % 3; audio.init(); audio.sfx.hover(); }
    if (hit?.startsWith('diff:')) { ui.diffIdx = Number(hit.slice(5)); audio.init(); audio.sfx.hover(); }
    if (hit === 'start' || input.wasPressed('Enter', 'NumpadEnter')) { startDive(); return; }
    // Attract mode: the pilot plays a demo dive behind the menu.
    stepRun(run, autopilot(run), dt);
    if (run.pendingLevels > 0) { run.pendingLevels -= 1; applyMutation(run, autopilotChoice(run, drawChoices(run))); }
    if (run.outcome) toTitle();
    run.events.length = 0;
    return;
  }

  if (ui.mode === 'play') {
    if (input.wasPressed('Escape', 'KeyP') || hit === 'key:pause') { ui.mode = 'paused'; return; }
    if (input.wasPressed('KeyR') || hit === 'key:restart') { startDive(); return; }
    if (hit === 'key:mute') { audio.init(); ui.muted = audio.toggleMute(); }
    const boss = run.wave.boss && !run.wave.boss.dead;
    audio.setIntensity(boss ? 3 : run.wave.phase === 'fight' ? 2 : 1);
    stepRun(run, playerControl(), dt);
    drainEvents();
    if (run.pendingLevels > 0 && !run.player.dead && run.wave.phase !== 'won') {
      run.choices = drawChoices(run);
      if (run.choices.length) {
        ui.mode = 'levelup';
        ui.levelAge = 0;
        ui.cardSel = -1;
        audio.sfx.levelUp();
      } else run.pendingLevels = 0;
    }
    if (run.wave.phase === 'route' && ui.mode === 'play' && run.pendingLevels === 0) {
      ui.mode = 'route';
      ui.routeAge = 0;
      audio.sfx.levelUp();
    }
    if (run.outcome) finish();
    return;
  }

  if (ui.mode === 'route') {
    ui.routeAge += dt;
    let pick = -1;
    if (hit?.startsWith('route:')) pick = Number(hit.slice(6));
    for (let i = 0; i < 3; i++) if (input.wasPressed(`Digit${i + 1}`, `Numpad${i + 1}`)) pick = i;
    if (ui.routeAge < 0.35) pick = -1;
    if (pick >= 0 && pick < (run.routeChoices?.length ?? 0)) {
      chooseRoute(run, run.routeChoices[pick]);
      audio.sfx.pick();
      ui.mode = 'play';
    }
    return;
  }

  if (ui.mode === 'levelup') {
    ui.levelAge += dt;
    let pick = -1;
    if (hit?.startsWith('pick:')) pick = Number(hit.slice(5));
    for (let i = 0; i < 3; i++) if (input.wasPressed(`Digit${i + 1}`, `Numpad${i + 1}`)) pick = i;
    if (input.wasPressed('ArrowLeft', 'KeyA')) ui.cardSel = Math.max(0, ui.cardSel - 1);
    if (input.wasPressed('ArrowRight', 'KeyD')) ui.cardSel = Math.min(run.choices.length - 1, ui.cardSel + 1);
    if (input.wasPressed('Enter') && ui.cardSel >= 0) pick = ui.cardSel;
    if (ui.levelAge < 0.35) pick = -1; // stop a held click from picking blind
    if (pick >= 0 && pick < run.choices.length) {
      applyMutation(run, run.choices[pick]);
      audio.sfx.pick();
      run.pendingLevels -= 1;
      run.choices = null;
      if (run.pendingLevels > 0) { run.choices = drawChoices(run); ui.levelAge = 0; ui.cardSel = -1; }
      else { ui.mode = 'play'; run.player.inv = Math.max(run.player.inv, 0.6); }
    }
    return;
  }

  if (ui.mode === 'paused') {
    audio.setIntensity(0);
    if (hit === 'resume' || input.wasPressed('Escape', 'KeyP')) ui.mode = 'play';
    else if (hit === 'restart' || input.wasPressed('KeyR')) startDive();
    else if (hit === 'title' || input.wasPressed('KeyQ')) toTitle();
    return;
  }

  if (ui.mode === 'results') {
    ui.resultAge += dt;
    audio.setIntensity(0);
    stepRun(run, { move: { x: 0, y: 0 }, aimX: 0, aimY: 0, fire: false, dash: false, pulse: false }, dt);
    run.events.length = 0;
    if (ui.resultAge > 0.5) {
      if (hit === 'restart' || input.wasPressed('KeyR', 'Enter')) startDive();
      else if (hit === 'title' || input.wasPressed('Escape')) toTitle();
    }
  }
}

function render() {
  ui.buttons = [];
  ctx.save();
  drawScene(ctx, run, clock);
  if (ui.mode === 'title') drawTitle(ctx, ui, clock);
  else {
    if (ui.mode !== 'results') drawHud(ctx, run, ui, clock);
    if (ui.mode === 'levelup') drawLevelUp(ctx, run, ui, clock);
    if (ui.mode === 'route' && run.routeChoices) drawRouteChoice(ctx, run, ui, clock);
    if (ui.mode === 'paused') drawPause(ctx, run, ui);
    if (ui.mode === 'results') drawResults(ctx, run, ui, clock);
    if (ui.mode !== 'play') drawCrosshair(ctx, ui.mouse.x, ui.mouse.y, 0, clock);
  }
  if (ui.mode === 'title') drawCrosshair(ctx, ui.mouse.x, ui.mouse.y, 0, clock);
  ctx.restore();
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const scale = Math.min(w / VIEW.w, h / VIEW.h);
  const ox = (w - VIEW.w * scale) / 2, oy = (h - VIEW.h * scale) / 2;
  input.setView({ scale, ox, oy });
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
}

window.addEventListener('resize', resize);
resize();

// Screenshot staging (?shot=...) freezes a prepared scene instead of running the loop.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  // Draw at exactly the 1280x720 view, whatever the capture window's size.
  window.removeEventListener('resize', resize);
  canvas.width = VIEW.w;
  canvas.height = VIEW.h;
  canvas.style.width = `${VIEW.w}px`;
  canvas.style.height = `${VIEW.h}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  input.setView({ scale: 1, ox: 0, oy: 0 });
  const staged = stageShot(shot, ui);
  run = staged.run;
  clock = staged.clock;
  input.mouse.x = staged.mouse?.x ?? VIEW.w / 2 + 160;
  input.mouse.y = staged.mouse?.y ?? VIEW.h / 2 - 60;
  // Redraw the frozen frame every animation frame so the compositor presents it to the capture.
  let frames = 0;
  // The finished frame is shown as a still image so a headless capture never has to keep
  // re-blurring the title's glowing text in software.
  const still = () => {
    ctx.fillStyle = '#02070f';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    render();
    if (++frames < 2) { requestAnimationFrame(still); return; }
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    img.style.cssText = `position:fixed;left:0;top:0;width:${VIEW.w}px;height:${VIEW.h}px`;
    img.onload = () => { canvas.style.display = 'none'; document.title = 'ready'; };
    document.body.appendChild(img);
  };
  requestAnimationFrame(still);
} else {
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= TICK) {
      update(TICK);
      input.endFrame();
      clock += TICK;
      acc -= TICK;
    }
    ctx.fillStyle = '#02070f';
    ctx.fillRect(-VIEW.w, -VIEW.h, VIEW.w * 3, VIEW.h * 3);
    render();
    requestAnimationFrame(frame);
  };
  followCamera(run, 0, true);
  requestAnimationFrame(frame);
}

// Exposed for quick play-testing from the console.
window.lumen = { get run() { return run; }, ui, releasePulse: () => releasePulse(run) };
