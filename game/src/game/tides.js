// Tide routes: after each tide the player chooses the conditions of the next one from three
// currents, trading danger for reward. Each route changes the coming tide for real (more foes,
// tougher or faster ones, stronger currents, more elites, more glim) and multiplies the score
// earned during it. The choice shows on the HUD for the whole tide.

export const ROUTES = {
  slack: { id: 'slack', name: 'Slack Water', color: '#9cd8ea', score: 1, risk: 0, desc: 'A quiet tide. Nothing changes.', reward: 'safe passage' },
  riptide: { id: 'riptide', name: 'Riptide', color: '#5ff0ff', score: 1.4, risk: 1, desc: 'Currents run 60% stronger, and one more stream crosses the reef.', reward: 'score ×1.4' },
  shoal: { id: 'shoal', name: 'Teeming Shoal', color: '#4dffc3', score: 1.5, risk: 2, desc: '40% more foes pour in, in bigger groups.', reward: 'score ×1.5' },
  gilded: { id: 'gilded', name: 'Gilded Brood', color: '#ffd166', score: 1.3, risk: 1, desc: 'Elites three times as often. Every elite drops a shell.', reward: 'score ×1.3 · more shells' },
  glimstorm: { id: 'glimstorm', name: 'Glimstorm', color: '#ffe27a', score: 1, risk: 1, desc: 'Foes are 30% tougher but drop double glim.', reward: 'glim ×2: level faster' },
  redbloom: { id: 'redbloom', name: 'Red Bloom', color: '#ff6f9c', score: 1.7, risk: 2, desc: 'Foes and their spores move 20% faster.', reward: 'score ×1.7' },
};

const POOL = ['riptide', 'shoal', 'gilded', 'glimstorm', 'redbloom'];

// Three routes: always one safe option and two drawn from the risky pool.
export function drawRoutes(run) {
  const pool = [...POOL];
  const picks = ['slack'];
  while (picks.length < 3 && pool.length) {
    const i = Math.floor(run.rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function routeOf(run) {
  return ROUTES[run.route ?? 'slack'];
}

// Modifiers the rest of the simulation reads while a route is active.
export function routeMods(run) {
  const r = run.route ?? 'slack';
  return {
    count: r === 'shoal' ? 1.4 : 1,
    group: r === 'shoal' ? 1.5 : 1,
    hp: r === 'glimstorm' ? 1.3 : 1,
    speed: r === 'redbloom' ? 1.2 : 1,
    elite: r === 'gilded' ? 3 : 1,
    glim: r === 'glimstorm' ? 2 : 1,
    current: r === 'riptide' ? 1.6 : 1,
    score: ROUTES[r].score,
    eliteHeart: r === 'gilded',
  };
}

// The pilot's route: it takes risks only when healthy.
export function autoRoute(run, choices) {
  const p = run.player;
  if (p.hp <= 2) return 'slack';
  return choices[1 + Math.floor(run.rng.next() * (choices.length - 1))] ?? 'slack';
}
