// Headless balance check: the autopilot plays whole dives in Node and reports how far it gets.
import { createRun } from '../game/src/game/state.js';
import { stepRun } from '../game/src/game/sim.js';
import { autopilot, autopilotChoice } from '../game/src/game/autopilot.js';
import { applyMutation, drawChoices } from '../game/src/game/upgrades.js';
import { TICK } from '../game/src/config.js';

const diff = process.argv[2] ?? 'rising';
const invincible = process.argv[3] === 'inv';
for (let seed = 1; seed <= 4; seed++) {
  const run = createRun({ seed, difficulty: diff, demo: invincible ? 'invincible' : true });
  const t0 = performance.now();
  let steps = 0;
  while (!run.outcome && steps < 60 * 60 * 30) {
    stepRun(run, autopilot(run), TICK);
    while (run.pendingLevels > 0) { run.pendingLevels--; const c = drawChoices(run); if (c.length) applyMutation(run, autopilotChoice(run, c)); }
    run.events.length = 0;
    steps++;
  }
  console.log(`seed ${seed}: ${run.outcome ?? 'timeout'} wave ${run.wave.n} lvl ${run.level} score ${run.score} kills ${run.kills} time ${run.time.toFixed(0)}s hits ${run.hitsTaken} bosses ${run.bossesSlain} (${(performance.now() - t0).toFixed(0)}ms)`);
}
