// Relics: sunken treasures that stay with Pip for the whole dive. After tide 2 and tide 8 the
// reef offers three common relics, and the Undertow Maw drops three boss relics when it falls;
// the player keeps one each time. Unlike mutations they are rule changes, not just numbers: a
// relic can make Pip ignore currents, regrow a shell every tide or keep a boss staggered longer.

import { emit } from './state.js';

export const RELIC_TIDES = { 2: 'common', 5: 'boss', 8: 'common' };
export const RELICS_MAX = 3;

export const RELICS = {
  tidepearl: { id: 'tidepearl', tier: 'common', name: 'Tide Pearl', shape: 'orb', color: '#e8fbff', desc: '+1 max shell, and heal one now', apply: (s, p) => { s.maxHp += 1; p.hp = Math.min(s.maxHp, p.hp + 1); } },
  sunstone: { id: 'sunstone', tier: 'common', name: 'Sunstone', shape: 'star', color: '#ffd166', desc: 'Bolt damage +18%', apply: (s) => { s.damage *= 1.18; } },
  ripscale: { id: 'ripscale', tier: 'common', name: 'Riptide Scale', shape: 'scale', color: '#4dffc3', desc: 'Dash recharges 22% faster, swim 8% faster', apply: (s) => { s.dashCooldown *= 0.78; s.speed *= 1.08; } },
  conch: { id: 'conch', tier: 'common', name: 'Echo Conch', shape: 'spiral', color: '#5ff0ff', desc: 'The pulse charges 30% faster', apply: (s) => { s.pulseRate *= 1.3; } },
  hook: { id: 'hook', tier: 'common', name: "Angler's Hook", shape: 'hook', color: '#ff8a65', desc: '+12% crit chance; crits hit ×2.5', apply: (s) => { s.crit += 0.12; s.critMult = 2.5; } },
  float: { id: 'float', tier: 'common', name: 'Glass Float', shape: 'bubble', color: '#bff9ff', desc: 'A bubble ward that blocks one hit and regrows', apply: (s, p) => { s.shieldMax += 1; p.shield = s.shieldMax; } },
  blackpearl: { id: 'blackpearl', tier: 'common', name: 'Black Pearl', shape: 'orb', color: '#b78cff', desc: 'Every point scored ×1.2', apply: () => {} },
  kelp: { id: 'kelp', tier: 'common', name: 'Kelp Charm', shape: 'leaf', color: '#7dff9a', desc: 'Regrow a shell at the start of every tide', apply: () => {} },
  veil: { id: 'veil', tier: 'common', name: 'Spore Veil', shape: 'drop', color: '#ff9ab8', desc: "Foes' shots fly 22% slower", apply: () => {} },
  lantern: { id: 'lantern', tier: 'boss', name: "Maw's Lantern", shape: 'lantern', color: '#ffe27a', desc: 'Glim flies to you from twice as far, and every 30 glim fires a free pulse', apply: (s) => { s.pickup *= 2; } },
  heart: { id: 'heart', tier: 'boss', name: 'Undertow Heart', shape: 'heart', color: '#ff6f9c', desc: 'Currents never push you; foes caught in a current take +40% damage', apply: () => {} },
  jaw: { id: 'jaw', tier: 'boss', name: "Maw's Jawbone", shape: 'fang', color: '#ffffff', desc: 'Pulse damage +60%; a staggered boss stays open 60% longer', apply: (s) => { s.sonarDmg += 0.6; } },
};

export function hasRelic(run, id) {
  return !!run.relics?.includes(id);
}

// Three relics of the tier, none the player already holds.
export function drawRelics(run, tier) {
  const pool = Object.values(RELICS).filter((r) => r.tier === tier && !hasRelic(run, r.id)).map((r) => r.id);
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(run.rng.next() * pool.length), 1)[0]);
  return picks;
}

export function takeRelic(run, id) {
  const r = RELICS[id];
  if (!r || hasRelic(run, id)) return;
  (run.relics ??= []).push(id);
  r.apply(run.player.stats, run.player);
  emit(run, 'relic', { name: r.name, desc: r.desc, color: r.color });
}

// The pilot's pick: the first relic that keeps it alive, else the first offered.
export function autoRelic(run, choices) {
  const safe = ['tidepearl', 'float', 'kelp', 'jaw'];
  return choices.find((id) => safe.includes(id)) ?? choices[0];
}

// Score multiplier relics grant on every point.
export function relicScore(run) {
  return hasRelic(run, 'blackpearl') ? 1.2 : 1;
}
