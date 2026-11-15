// Starlight Drift — best-game-01 entrypoint (Node 22, standard library only).
//
// The game lives in this directory's game/ folder: plain static files that a
// desktop browser loads offline (game/index.html plus its ES modules, no
// library, no network request). This program hands it in: it copies game/
// and screenshots/ from beside this file into the grader's output directory
// and writes /output/dossier.json with the vendored make.fun library, which
// the judge reads. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play it locally first with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Guardrails first, so a broken repo fails loudly here instead of shipping
// an entry the scorer refuses: at most 4 screenshots, each a PNG or JPEG
// under 256 KiB; game/ under the file-count and byte caps the gate enforces.
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shotNames = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotNames.length < 3 || shotNames.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const shotPath = join(shotsDir, name);
  const stats = statSync(shotPath);
  if (!stats.isFile()) fail(`screenshots/${name} is not a regular file`);
  if (stats.size > 262144) fail(`screenshots/${name} is over 256 KiB`);
  if (!/\.(png|jpe?g)$/i.test(name)) fail(`screenshots/${name} is not a PNG or JPEG`);
}

const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (statSync(join(gameDir, 'index.html')).size > 1048576) {
  fail('game/index.html is over 1 MiB');
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The dossier is built from the copied output, so what the judge reads is
// exactly what the grader ships — byte for byte, on both runs.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Starlight Drift handed in to ${outputDir}`);
console.log(`dossier.json: ${statSync(join(outputDir, 'dossier.json')).size} bytes`);
