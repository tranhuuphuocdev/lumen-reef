// Pip's four Aspects, the spine of every build. Each mutation feeds one Aspect; every point in an
// Aspect adds a small permanent bonus, and reaching 3 and 6 points evolves Pip into a new form
// with a real new power and a new look. The Aspect a build leans on also tilts which mutations the
// reef offers next, so a run grows in the direction the player steers it.
//
// LAST LIGHT: on the final shell Pip burns brighter (more damage, faster pulse) — a desperate
// window to turn a losing fight.

export const ASPECTS = {
  radiance: {
    id: 'radiance', name: 'RADIANCE', color: '#ffd166', glyph: 'sun',
    per: '+7% damage, +4% bolt size',
    forms: [
      { at: 3, name: 'Sunbell', power: 'Bolts ignite foes: they burn for 3s' },
      { at: 6, name: 'Solar Crown', power: 'Every 5th volley adds a piercing sunlance' },
    ],
  },
  current: {
    id: 'current', name: 'CURRENT', color: '#4dffc3', glyph: 'wave',
    per: '+5% swim speed, -5% dash cooldown',
    forms: [
      { at: 3, name: 'Riptail', power: 'Dashing through foes slashes them' },
      { at: 6, name: 'Maelstrom Fins', power: 'Two dash charges' },
    ],
  },
  resonance: {
    id: 'resonance', name: 'RESONANCE', color: '#5ff0ff', glyph: 'rings',
    per: '+12% pulse charge, +5% pulse reach',
    forms: [
      { at: 3, name: 'Echo Bell', power: 'Every pulse echoes a second wave' },
      { at: 6, name: 'Choir of the Deep', power: 'A pulse that hits 6+ foes regrows a shell' },
    ],
  },
  carapace: {
    id: 'carapace', name: 'CARAPACE', color: '#ff8fb3', glyph: 'shell',
    per: '+1 max shell every 2 points',
    forms: [
      { at: 3, name: 'Nacre Bell', power: 'A bubble ward that regrows' },
      { at: 6, name: 'Thorn Plate', power: 'Being hit bursts spines at nearby foes' },
    ],
  },
};

export const ASPECT_ORDER = ['radiance', 'current', 'resonance', 'carapace'];
export const ASPECT_MAX = 9;

// Which Aspect each mutation feeds.
export const MUTATION_ASPECT = {
  split: 'radiance', dense: 'radiance', keen: 'radiance', bloom: 'radiance', nova: 'radiance', needle: 'radiance',
  current: 'current', ink: 'current', reflex: 'current', ricochet: 'current', seeker: 'current',
  deep: 'resonance', resonance: 'resonance', lens: 'resonance', wake: 'resonance', static: 'resonance', venom: 'resonance',
  bell: 'carapace', ward: 'carapace', regrow: 'carapace', lure: 'carapace', pearls: 'carapace', quick: 'current',
};

export function createAspects() {
  return { radiance: 0, current: 0, resonance: 0, carapace: 0 };
}

// Add a point to an Aspect: apply its per-point bonus, and return the form it unlocks, if any.
export function investAspect(run, aspect) {
  const p = run.player;
  const s = p.stats;
  if (run.aspects[aspect] >= ASPECT_MAX) return null;
  const a = (run.aspects[aspect] += 1);
  if (aspect === 'radiance') { s.damage *= 1.07; s.size *= 1.04; }
  if (aspect === 'current') { s.speed *= 1.05; s.dashCooldown *= 0.95; }
  if (aspect === 'resonance') { s.pulseRate *= 1.12; s.pulseRadius *= 1.05; }
  if (aspect === 'carapace' && a % 2 === 0) { s.maxHp += 1; p.hp = Math.min(s.maxHp, p.hp + 1); }
  const form = ASPECTS[aspect].forms.find((f) => f.at === a);
  if (form) {
    if (aspect === 'radiance' && a === 3) s.burn = 1;
    if (aspect === 'radiance' && a === 6) s.lance = 1;
    if (aspect === 'current' && a === 3) s.riptail = 1;
    if (aspect === 'current' && a === 6) { s.dashCharges = 2; p.dashStock = 2; }
    if (aspect === 'resonance' && a === 3) s.echo = 1;
    if (aspect === 'resonance' && a === 6) s.choir = 1;
    if (aspect === 'carapace' && a === 3) { s.shieldMax += 1; p.shield = s.shieldMax; }
    if (aspect === 'carapace' && a === 6) s.thorns = 1;
    run.forms.push({ aspect, ...form });
  }
  return form ?? null;
}

// The Aspect a build leans on (ties keep the earlier one), or null before any investment.
export function leadingAspect(run) {
  let best = null, bv = 0;
  for (const id of ASPECT_ORDER) if (run.aspects[id] > bv) { bv = run.aspects[id]; best = id; }
  return best;
}

// Pip's current form name: the highest form reached, else "Lantern-Jelly".
export function formName(run) {
  // The highest tier wins; between equal tiers, the latest one.
  let best = null;
  for (const f of run.forms) if (!best || f.at >= best.at) best = f;
  return best ? best.name : 'Lantern-Jelly';
}

export function isLastLight(run) {
  const p = run.player;
  return !p.dead && p.hp > 0 && p.hp <= 1 && p.stats.maxHp > 1;
}
