// Hands LUMEN REEF in for make.fun's best-game-01 bounty (Node 22, standard library only).
// The game is game/: static files a desktop browser plays offline (index.html and its ES modules,
// no library, no network request). This program copies game/ and the screenshots/ captured from
// the running game into the output folder, then writes dossier.json, the summary the judge
// reads, with the kit's unchanged vendor/makefun-game.ts.
//
//   node serve.ts                                   play it on http://localhost:8080
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's limits, the same numbers the scorer applies.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyGame(): void {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
}

function copyScreenshots(): number {
  const from = join(root, 'screenshots');
  const to = join(outDir, 'screenshots');
  mkdirSync(to, { recursive: true });
  if (!existsSync(from)) return 0;
  const shots = readdirSync(from).filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('.')).sort();
  for (const f of shots) cpSync(join(from, f), join(to, f));
  return shots.length;
}

copyGame();
const count = copyScreenshots();
if (count < 3) console.error(`warning: ${count} screenshots; the gate wants 3 or 4`);
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, LIMITS));
