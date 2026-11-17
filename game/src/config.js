// Tuning for LUMEN REEF: every number a designer would want to tweak lives here.

export const VIEW = { w: 1280, h: 800 };
export const ZOOM = 1.2; // world pixels are drawn 1.2x larger than the 1280x800 view
export const WORLD = { w: 2600, h: 1700, wall: 60 };
export const TICK = 1 / 60;

export const PLAYER = {
  radius: 15,
  speed: 265,
  accel: 2200,
  friction: 9,
  maxHp: 5,
  hurtInvuln: 1.1,
  dashSpeed: 820,
  dashTime: 0.17,
  dashCooldown: 1.15,
  fireRate: 5.2,
  bulletSpeed: 660,
  bulletDamage: 11,
  bulletRadius: 5,
  bulletLife: 0.95,
  spread: 0.13,
  pickupRadius: 70,
  pulseCharge: 100,
  pulseRadius: 300,
  pulseDamage: 70,
};

export const COMBO = { window: 2.4, maxMult: 8, killsPerStep: 6 };

export const DIFFICULTY = {
  calm: { id: 'calm', name: 'Calm Tide', hp: 0.8, dmg: 1, speed: 0.92, count: 0.85, score: 0.75, blurb: 'A gentle first dive.' },
  rising: { id: 'rising', name: 'Rising Tide', hp: 1, dmg: 1, speed: 1, count: 1, score: 1, blurb: 'The reef as it was meant.' },
  abyss: { id: 'abyss', name: 'Abyss', hp: 1.3, dmg: 2, speed: 1.1, count: 1.25, score: 1.6, blurb: 'Every hit costs two shells.' },
};

export const WAVES_TOTAL = 10;
export const BOSS_WAVES = { 5: 'maw', 10: 'nacre' };

export const XP = { base: 5, perLevel: 4, growth: 1.12 };

export const PALETTE = {
  abyss: '#040a1a',
  deep: '#08203a',
  mid: '#0d3a58',
  shallow: '#14607a',
  foam: '#e8fbff',
  glow: '#7ff6ff',
  pip: '#9cf7ff',
  pipCore: '#ffffff',
  glim: '#ffe27a',
  heart: '#ff6f9c',
  danger: '#ff4d6d',
  text: '#eafcff',
  dim: '#7fa6c0',
  gold: '#ffd166',
  violet: '#b78cff',
  coral: '#ff8a65',
};
