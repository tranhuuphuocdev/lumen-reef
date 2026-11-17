// Synthesised sound: every effect and the music are built from oscillators and noise at run time,
// so the game ships no audio files. The music is a small step sequencer in a minor pentatonic key
// whose layers (pad, pluck arpeggio, bass, drums) rise with the danger on screen.

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
const ROOT = 49; // C#3

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

export function createAudio() {
  let ctx = null;
  let master, sfxBus, musicBus, noiseBuf, delay, delayGain;
  let muted = false;
  let volume = 0.8;
  let intensity = 0; // 0 calm .. 1 menu-ish .. 2 combat .. 3 boss
  let step = 0;
  let nextStepTime = 0;
  let schedTimer = null;
  const lastPlayed = new Map();

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    delay = ctx.createDelay(1);
    delay.delayTime.value = 0.375;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.32;
    musicBus.connect(master);
    musicBus.connect(delay);
    delay.connect(delayGain).connect(delay);
    delayGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextStepTime = ctx.currentTime + 0.1;
    schedTimer = setInterval(scheduleMusic, 40);
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, attack = 0.005, bus = sfxBus, at = 0, filter = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, attack, vol, dur);
    let node = o;
    if (filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = filter;
      node.connect(lp);
      node = lp;
    }
    node.connect(g).connect(bus);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.3, from = 2000, to = 200, q = 1, type = 'bandpass', bus = sfxBus, at = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    const g = ctx.createGain();
    env(g, t, 0.004, vol, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // Rate-limit each effect so a screen full of hits never turns into noise.
  function throttle(name, gap) {
    if (!ctx) return false;
    const now = ctx.currentTime;
    if ((lastPlayed.get(name) ?? -1) + gap > now) return false;
    lastPlayed.set(name, now);
    return true;
  }

  const sfx = {
    shoot() { if (throttle('shoot', 0.05)) tone({ type: 'triangle', f0: 980 + Math.random() * 80, f1: 520, dur: 0.07, vol: 0.09 }); },
    hit() { if (throttle('hit', 0.03)) tone({ type: 'square', f0: 340, f1: 160, dur: 0.05, vol: 0.06, filter: 1800 }); },
    kill(big = false) {
      if (!throttle('kill', 0.04)) return;
      tone({ type: 'sine', f0: big ? 300 : 620, f1: big ? 60 : 140, dur: big ? 0.35 : 0.14, vol: 0.22 });
      noise({ dur: big ? 0.4 : 0.12, vol: big ? 0.25 : 0.12, from: 3000, to: 300 });
    },
    glim(pitch = 0) {
      if (!throttle('glim', 0.035)) return;
      const n = SCALE[Math.min(SCALE.length - 1, pitch % SCALE.length)] + ROOT + 36;
      tone({ type: 'sine', f0: mtof(n), dur: 0.12, vol: 0.09 });
    },
    heart() { [0, 4, 7].forEach((s, i) => tone({ type: 'sine', f0: mtof(ROOT + 31 + s), dur: 0.25, vol: 0.12, at: i * 0.06 })); },
    dash() { noise({ dur: 0.22, vol: 0.22, from: 600, to: 3200, q: 2 }); },
    hurt() {
      tone({ type: 'sawtooth', f0: 220, f1: 70, dur: 0.35, vol: 0.22, filter: 1200 });
      noise({ dur: 0.25, vol: 0.2, from: 1500, to: 100, type: 'lowpass' });
    },
    shield() { tone({ type: 'sine', f0: 1400, f1: 500, dur: 0.3, vol: 0.18 }); },
    levelUp() { [0, 2, 4, 5, 7].forEach((s, i) => tone({ type: 'triangle', f0: mtof(ROOT + 24 + SCALE[s]), dur: 0.3, vol: 0.13, at: i * 0.07 })); },
    pick() { tone({ type: 'sine', f0: mtof(ROOT + 31), f1: mtof(ROOT + 43), dur: 0.2, vol: 0.16 }); },
    hover() { if (throttle('hover', 0.06)) tone({ type: 'sine', f0: 1200, dur: 0.04, vol: 0.05 }); },
    pulse() {
      tone({ type: 'sine', f0: 140, f1: 32, dur: 0.9, vol: 0.5 });
      noise({ dur: 0.8, vol: 0.3, from: 1200, to: 60, type: 'lowpass' });
    },
    waveStart() { [0, 3, 5].forEach((s, i) => tone({ type: 'triangle', f0: mtof(ROOT + 12 + SCALE[s]), dur: 0.5, vol: 0.12, at: i * 0.12 })); },
    waveClear() { [0, 2, 4, 7].forEach((s, i) => tone({ type: 'sine', f0: mtof(ROOT + 24 + SCALE[s]), dur: 0.6, vol: 0.13, at: i * 0.09 })); },
    bossRoar() {
      tone({ type: 'sawtooth', f0: 90, f1: 40, dur: 1.6, vol: 0.35, filter: 600 });
      noise({ dur: 1.4, vol: 0.3, from: 400, to: 60, type: 'lowpass' });
    },
    enemyShot() { if (throttle('eshot', 0.08)) tone({ type: 'sine', f0: 420, f1: 260, dur: 0.1, vol: 0.06 }); },
    explode() { if (throttle('boom', 0.06)) { noise({ dur: 0.5, vol: 0.35, from: 900, to: 50, type: 'lowpass' }); tone({ type: 'sine', f0: 120, f1: 30, dur: 0.4, vol: 0.3 }); } },
    defeat() { [7, 5, 3, 0].forEach((s, i) => tone({ type: 'triangle', f0: mtof(ROOT + 12 + SCALE[s]), dur: 0.7, vol: 0.15, at: i * 0.22 })); },
    perfect() { [12, 19, 24].forEach((s, i) => tone({ type: 'sine', f0: mtof(ROOT + 24 + s), dur: 0.22, vol: 0.13, at: i * 0.035 })); noise({ dur: 0.15, vol: 0.08, from: 6000, to: 9000, type: 'highpass' }); },
    surge() { tone({ type: 'sawtooth', f0: 220, f1: 880, dur: 0.45, vol: 0.09, filter: 2400 }); tone({ type: 'sine', f0: 440, f1: 1320, dur: 0.45, vol: 0.08 }); },
    interrupt() { if (throttle('interrupt', 0.08)) { tone({ type: 'square', f0: 1800, f1: 600, dur: 0.12, vol: 0.06, filter: 3000 }); tone({ type: 'sine', f0: 2400, dur: 0.25, vol: 0.06, at: 0.03 }); } },
    milestone() { [0, 4, 7, 12].forEach((s, i) => tone({ type: 'triangle', f0: mtof(ROOT + 24 + SCALE[s % SCALE.length]), dur: 0.25, vol: 0.12, at: i * 0.05 })); },
    bossPhase() {
      tone({ type: 'sawtooth', f0: 70, f1: 140, dur: 1.2, vol: 0.32, filter: 500 });
      noise({ dur: 1.2, vol: 0.28, from: 200, to: 1600, type: 'lowpass' });
    },
    victory() { [0, 2, 4, 5, 7, 9].forEach((s, i) => tone({ type: 'triangle', f0: mtof(ROOT + 24 + SCALE[s]), dur: 0.8, vol: 0.14, at: i * 0.11 })); },
  };

  // ---- music sequencer -------------------------------------------------------------------
  const CHORDS = [0, 3, 5, 2]; // scale-degree roots per bar
  const ARP = [0, 2, 4, 2, 5, 4, 2, 4, 0, 2, 4, 7, 5, 4, 2, 1];

  function scheduleMusic() {
    if (!ctx || muted) { if (ctx) nextStepTime = ctx.currentTime + 0.1; return; }
    const bpm = intensity >= 3 ? 132 : intensity >= 2 ? 118 : 96;
    const stepDur = 60 / bpm / 4;
    while (nextStepTime < ctx.currentTime + 0.12) {
      playStep(step, nextStepTime, stepDur);
      nextStepTime += stepDur;
      step = (step + 1) % 64;
    }
  }

  function playStep(s, t, sd) {
    const bar = Math.floor(s / 16) % 4;
    const deg = CHORDS[bar];
    const at = t - ctx.currentTime;
    if (s % 16 === 0) {
      for (const k of [0, 2, 4]) {
        const n = ROOT + 12 + SCALE[(deg + k) % SCALE.length];
        tone({ type: 'sine', f0: mtof(n), dur: sd * 15, vol: 0.05, attack: 0.6, bus: musicBus, at });
      }
    }
    if (intensity >= 1 && s % 2 === 0) {
      const n = ROOT + 24 + SCALE[(deg + ARP[(s / 2) % 16]) % SCALE.length];
      tone({ type: 'triangle', f0: mtof(n), dur: sd * 1.6, vol: 0.05, bus: musicBus, at });
    }
    if (intensity >= 2) {
      if (s % 8 === 0 || s % 16 === 11) tone({ type: 'sine', f0: mtof(ROOT + SCALE[deg]), dur: sd * 3, vol: 0.16, bus: musicBus, at, filter: 400 });
      if (s % 8 === 0) tone({ type: 'sine', f0: 120, f1: 40, dur: 0.18, vol: 0.32, bus: musicBus, at });
      if (s % 8 === 4) noise({ dur: 0.12, vol: 0.12, from: 2500, to: 900, bus: musicBus, at });
      if (s % 2 === 1) noise({ dur: 0.03, vol: 0.035, from: 9000, to: 7000, type: 'highpass', bus: musicBus, at });
    }
    if (intensity >= 3 && s % 4 === 2) tone({ type: 'sawtooth', f0: mtof(ROOT + SCALE[deg] - 12), dur: sd * 1.5, vol: 0.08, bus: musicBus, at, filter: 700 });
  }

  return {
    init,
    sfx,
    setIntensity(v) { intensity = v; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : volume;
      return muted;
    },
    get muted() { return muted; },
    get volume() { return volume; },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master && !muted) master.gain.value = volume;
      return volume;
    },
    dispose() { if (schedTimer) clearInterval(schedTimer); },
  };
}
