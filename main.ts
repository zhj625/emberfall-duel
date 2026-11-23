// Emberfall Duel — the hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser, no build step, no network). This program delivers it:
// it copies game/ and screenshots/ into the output directory and writes
// dossier.json there with buildDossier from the vendored make.fun library,
// which is the summary the bounty judge reads.
//
// Run it the way the grader does, or locally with an output directory of
// your choice:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// With no MAKEFUN_OUTPUT_DIR it writes to /output. It writes the same
// bytes every run for the same repository contents.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own (see the kit's RULES.txt): the dossier text
// is capped, screenshots are at most 4 files of at most 256 KiB each, and
// game/ is at most 993 files, 48 MiB in all, no path over 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
