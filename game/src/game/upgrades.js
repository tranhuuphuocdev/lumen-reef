// Mutations: the upgrades Pip chooses from on each level-up. Each one changes the player's stats;
// some stack, some have a cap, and a few unlock whole new attacks (orbiting pearls, chain sparks,
// ink trails, the bubble ward). drawChoices deals three distinct cards weighted by rarity.

import { PLAYER } from '../config.js';
import { MUTATION_ASPECT, investAspect, leadingAspect, ASPECTS } from './attributes.js';
import { emit } from './state.js';

export const RARITY = {
  common: { weight: 10, color: '#9cf7ff', label: 'COMMON' },
  rare: { weight: 5, color: '#b78cff', label: 'RARE' },
  mythic: { weight: 2, color: '#ffd166', label: 'MYTHIC' },
};

export const MUTATIONS = [
  { id: 'split', name: 'Split Fin', icon: 'split', rarity: 'rare', max: 4, desc: (l) => `+1 glow bolt per shot (${l + 1} total)`, apply: (s) => { s.projectiles += 1; } },
  { id: 'needle', name: 'Needle Spine', icon: 'needle', rarity: 'common', max: 4, desc: () => 'Bolts pierce +1 more foe', apply: (s) => { s.pierce += 1; } },
  { id: 'quick', name: 'Quickpulse', icon: 'quick', rarity: 'common', max: 6, desc: () => 'Fire rate +18%', apply: (s) => { s.fireRate *= 1.18; } },
  { id: 'dense', name: 'Dense Glow', icon: 'dense', rarity: 'common', max: 6, desc: () => 'Bolt damage +22%', apply: (s) => { s.damage *= 1.22; } },
  { id: 'current', name: 'Current Rider', icon: 'current', rarity: 'common', max: 4, desc: () => 'Swim speed +11%, dash recharges faster', apply: (s) => { s.speed *= 1.11; s.dashCooldown *= 0.88; } },
  { id: 'bell', name: 'Thick Bell', icon: 'bell', rarity: 'common', max: 5, desc: () => '+1 max shell, heal 1', apply: (s, p) => { s.maxHp += 1; p.hp = Math.min(p.hp + 1, s.maxHp); } },
  { id: 'lure', name: 'Lure Glow', icon: 'lure', rarity: 'common', max: 3, desc: () => 'Pick up glim from 50% further', apply: (s) => { s.pickup *= 1.5; } },
  { id: 'ricochet', name: 'Ricochet Coral', icon: 'ricochet', rarity: 'rare', max: 3, desc: () => 'Bolts bounce off the reef wall and off foes +1', apply: (s) => { s.bounce += 1; } },
  { id: 'pearls', name: 'Orbit Pearls', icon: 'pearls', rarity: 'rare', max: 4, desc: (l) => (l ? `${l + 1} pearls circle you, cutting foes` : 'A pearl circles you, cutting foes'), apply: (s) => { s.orbit += 1; } },
  { id: 'static', name: 'Static Tendrils', icon: 'static', rarity: 'rare', max: 4, desc: () => 'Hits arc to a nearby foe (+25% chance)', apply: (s) => { s.chain += 0.25; } },
  { id: 'ink', name: 'Ink Trail', icon: 'ink', rarity: 'rare', max: 3, desc: () => 'Dashing leaves burning ink', apply: (s) => { s.ink += 1; } },
  { id: 'regrow', name: 'Regrowth', icon: 'regrow', rarity: 'rare', max: 3, desc: () => 'Regrow a shell every so often', apply: (s) => { s.regen += 1; } },
  { id: 'keen', name: 'Keen Eye', icon: 'keen', rarity: 'common', max: 5, desc: () => '+10% chance to crit for double', apply: (s) => { s.crit += 0.1; } },
  { id: 'seeker', name: 'Seeker Glow', icon: 'seeker', rarity: 'rare', max: 2, desc: () => 'Bolts curve toward foes', apply: (s) => { s.homing += 1; } },
  { id: 'bloom', name: 'Big Bloom', icon: 'bloom', rarity: 'common', max: 3, desc: () => 'Bolts 30% larger, +10% damage', apply: (s) => { s.size *= 1.3; s.damage *= 1.1; } },
  { id: 'ward', name: 'Bubble Ward', icon: 'ward', rarity: 'mythic', max: 2, desc: () => 'A bubble blocks one hit, then regrows', apply: (s) => { s.shieldMax += 1; } },
  { id: 'deep', name: 'Deep Pulse', icon: 'deep', rarity: 'rare', max: 3, desc: () => 'Pulse charges 35% faster, reaches further', apply: (s) => { s.pulseRate *= 1.35; s.pulseRadius *= 1.15; } },
  { id: 'venom', name: 'Siren Venom', icon: 'venom', rarity: 'rare', max: 3, desc: () => 'Hits poison foes over time', apply: (s) => { s.venom += 1; } },
  { id: 'wake', name: 'Static Wake', icon: 'wake', rarity: 'rare', max: 1, desc: () => 'Pulse within a second of a dash: lightning leaps from every foe it touches', apply: (s) => { s.wake += 1; } },
  { id: 'lens', name: 'Glim Lens', icon: 'lens', rarity: 'common', max: 2, desc: () => 'Each glim gathered since your last pulse widens the next one', apply: (s) => { s.lens += 1; } },
  { id: 'reflex', name: 'Reflex Fins', icon: 'reflex', rarity: 'rare', max: 2, desc: () => 'Perfect dodges refresh your dash and Surge lasts longer', apply: (s) => { s.reflex += 1; } },
  { id: 'resonance', name: 'Resonance', icon: 'resonance', rarity: 'common', max: 3, desc: () => 'Pulse damage +40%', apply: (s) => { s.sonarDmg += 0.4; } },
  { id: 'nova', name: 'Starburst', icon: 'nova', rarity: 'mythic', max: 2, desc: () => 'Every 8th shot bursts into a ring of bolts', apply: (s) => { s.nova += 1; } },
];

export const MUTATION_BY_ID = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

export function baseStats() {
  return {
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireRate: PLAYER.fireRate,
    damage: PLAYER.bulletDamage,
    projectiles: 1,
    pierce: 0,
    bounce: 0,
    pickup: PLAYER.pickupRadius,
    orbit: 0,
    chain: 0,
    ink: 0,
    regen: 0,
    crit: 0.05,
    homing: 0,
    size: 1,
    shieldMax: 0,
    pulseRate: 1,
    pulseRadius: PLAYER.pulseRadius,
    venom: 0,
    nova: 0,
    wake: 0,
    lens: 0,
    reflex: 0,
    sonarDmg: 0,
    dashCooldown: PLAYER.dashCooldown,
    burn: 0,
    lance: 0,
    riptail: 0,
    dashCharges: 1,
    echo: 0,
    choir: 0,
    thorns: 0,
  };
}

export function applyMutation(run, id) {
  const m = MUTATION_BY_ID[id];
  const lvl = run.mutations[id] ?? 0;
  m.apply(run.player.stats, run.player, lvl);
  run.mutations[id] = lvl + 1;
  if (id === 'ward') run.player.shield = run.player.stats.shieldMax;
  // Every mutation also grows the Aspect it belongs to; enough points evolve Pip.
  const aspect = MUTATION_ASPECT[id];
  const form = aspect ? investAspect(run, aspect) : null;
  if (form) emit(run, 'evolve', { aspect, name: form.name, power: form.power, color: ASPECTS[aspect].color });
  return form;
}

export function drawChoices(run, count = 3) {
  const pool = MUTATIONS.filter((m) => (run.mutations[m.id] ?? 0) < m.max);
  const picks = [];
  // The Aspect the build leans on is offered more often; the last card is always a different
  // Aspect, so a build can still turn.
  const lead = leadingAspect(run);
  const weightOf = (m) => RARITY[m.rarity].weight * (lead && MUTATION_ASPECT[m.id] === lead ? 2.4 : 1);
  while (picks.length < count && pool.length) {
    let cands = pool;
    if (picks.length === count - 1 && lead) {
      const other = pool.filter((m) => MUTATION_ASPECT[m.id] !== lead);
      if (other.length && picks.every((id) => MUTATION_ASPECT[id] === lead)) cands = other;
    }
    const total = cands.reduce((t, m) => t + weightOf(m), 0);
    let r = run.rng.next() * total;
    let i = 0;
    for (; i < cands.length - 1; i++) {
      r -= weightOf(cands[i]);
      if (r <= 0) break;
    }
    const chosen = cands[i];
    picks.push(chosen.id);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return picks;
}
