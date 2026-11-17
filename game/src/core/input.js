// Keyboard and mouse state, mapped from screen pixels to the 1280x720 view.

import { VIEW } from '../config.js';

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { x: VIEW.w / 2, y: VIEW.h / 2, left: false, right: false, clicked: false, rightClicked: false, moved: false };
  let view = { scale: 1, ox: 0, oy: 0 };

  const toView = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left - view.ox) / view.scale;
    mouse.y = (e.clientY - r.top - view.oy) / view.scale;
    mouse.moved = true;
  };

  // Physical key codes, with a fallback from the typed letter: an input method (a Vietnamese
  // Telex layout treats S, F, R, X, J as tone keys) can report an empty or odd code.
  const LETTER = { w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', e: 'KeyE', q: 'KeyQ', p: 'KeyP', m: 'KeyM', r: 'KeyR', j: 'KeyJ' };
  const codeOf = (e) => {
    const k = (e.key ?? '').toLowerCase();
    if (e.code && e.code !== 'Unidentified' && !(e.keyCode === 229 && LETTER[k])) return e.code;
    return LETTER[k] ?? e.code;
  };
  window.addEventListener('keydown', (e) => {
    const code = codeOf(e);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code) || LETTER[(e.key ?? '').toLowerCase()]) e.preventDefault();
    if (!down.has(code)) pressed.add(code);
    down.add(code);
    if (e.code && e.code !== code) down.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    down.delete(codeOf(e));
    if (e.code) down.delete(e.code);
  });
  window.addEventListener('blur', () => { down.clear(); mouse.left = mouse.right = false; });
  canvas.addEventListener('mousemove', toView);
  canvas.addEventListener('mousedown', (e) => {
    toView(e);
    if (e.button === 0) { mouse.left = true; mouse.clicked = true; }
    if (e.button === 2) { mouse.right = true; mouse.rightClicked = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    mouse,
    isDown: (...codes) => codes.some((c) => down.has(c)),
    wasPressed: (...codes) => codes.some((c) => pressed.has(c)),
    anyPressed: () => pressed.size > 0 || mouse.clicked,
    setView: (v) => { view = v; },
    endFrame: () => { pressed.clear(); mouse.clicked = false; mouse.rightClicked = false; },
    moveAxis() {
      let x = 0, y = 0;
      if (down.has('KeyA') || down.has('ArrowLeft')) x -= 1;
      if (down.has('KeyD') || down.has('ArrowRight')) x += 1;
      if (down.has('KeyW') || down.has('ArrowUp')) y -= 1;
      if (down.has('KeyS') || down.has('ArrowDown')) y += 1;
      const l = Math.hypot(x, y) || 1;
      return { x: x / l, y: y / l };
    },
  };
}
