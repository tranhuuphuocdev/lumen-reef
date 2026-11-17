// Captures the game's screenshots with headless Chrome: for each scene in shots.json it opens
// game/index.html?shot=<scene>, waits for the page to title itself "ready", saves a 1280x720 PNG
// and converts it to a JPEG under screenshots/ (macOS sips). Needs `node serve.ts --port <p>`.
//   node tools/shoot.mjs [port] [only-name]

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const port = process.argv[2] ?? '8080';
const only = process.argv[3];
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const shots = JSON.parse(readFileSync('shots.json', 'utf8'));
mkdirSync('screenshots', { recursive: true });
mkdirSync('.shots', { recursive: true });

for (const s of shots) {
  if (only && !s.name.startsWith(only)) continue;
  const png = join('.shots', s.name.replace(/\.\w+$/, '.png'));
  const url = `http://127.0.0.1:${port}/index.html${s.query}`;
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    `--user-data-dir=${join(tmpdir(), `lumen-shot-${process.pid}`)}`,
    '--force-device-scale-factor=1', '--window-size=1280,720', '--virtual-time-budget=20000',
    `--screenshot=${png}`, url,
  ];
  // Headless Chrome occasionally stalls on start; one retry is enough in practice.
  for (let attempt = 1; ; attempt++) {
    try { execFileSync(chrome, args, { stdio: 'ignore', timeout: 60000 }); break; }
    catch (err) { if (attempt >= 3) throw err; console.log(`  retrying ${s.name}`); }
  }
  const out = join('screenshots', s.name);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(s.quality ?? 82), png, '--out', out], { stdio: 'ignore' });
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`${out}  ${kb} KiB`);
  if (kb > 250) console.log('  over the 256 KiB cap: lower its quality in shots.json');
}
rmSync('.shots/.keep', { force: true });
