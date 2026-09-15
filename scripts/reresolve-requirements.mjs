/**
 * Re-runs part matching over already-fetched requirement text.
 *
 * The publisher's wording never changes, but our hardware dataset does — every
 * time a card or chip is added, previously unresolved requirement lines may now
 * resolve. Re-fetching thousands of games from Steam to pick that up would be
 * slow and rude; this replays the matcher over the stored raw strings instead.
 *
 * Safe to run any time after editing data/gpus.source.mjs or cpus.source.mjs.
 *
 *   node scripts/reresolve-requirements.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { GPU_ROWS } from '../data/gpus.source.mjs';
import { CPU_ROWS } from '../data/cpus.source.mjs';
import { buildIndex, matchRequirementLine } from '../src/lib/match-hardware.mjs';
import { splitAlternatives, parseVramGb, parseCpuFloor } from '../src/lib/steam-parse.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', 'games.requirements.json');

if (!fs.existsSync(FILE)) {
  console.error('Nothing fetched yet — run scripts/fetch-steam-requirements.mjs first.');
  process.exit(1);
}

const GPU_IDX = buildIndex(GPU_ROWS, 7);
const CPU_IDX = buildIndex(CPU_ROWS, 9);

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const games = data.games || {};

let gpuGained = 0, cpuGained = 0, gpuLost = 0, cpuLost = 0, sides = 0;

for (const g of Object.values(games)) {
  for (const key of ['minimum', 'recommended']) {
    const side = g[key];
    if (!side?.raw) continue;
    sides++;

    if (side.raw.gpu) {
      const hit = matchRequirementLine(side.raw.gpu, GPU_IDX, splitAlternatives(side.raw.gpu));
      const now = hit ? { name: hit.best.row[0], perf: hit.best.row[6], vramGb: hit.best.row[3] } : null;
      if (!side.gpu && now) gpuGained++;
      if (side.gpu && !now) gpuLost++;
      side.gpu = now;
      side.vramGb = parseVramGb(side.raw.gpu);
    }

    if (side.raw.cpu) {
      const hit = matchRequirementLine(side.raw.cpu, CPU_IDX, splitAlternatives(side.raw.cpu));
      const now = hit ? { name: hit.best.row[0], perf: hit.best.row[8] } : null;
      if (!side.cpu && now) cpuGained++;
      if (side.cpu && !now) cpuLost++;
      side.cpu = now;
      side.cpuFloor = now ? null : parseCpuFloor(side.raw.cpu);
    }
  }
}

data.meta = { ...(data.meta || {}), reresolved: new Date().toISOString() };
fs.writeFileSync(FILE, JSON.stringify(data));

const list = Object.values(games);
const gpuNow = list.filter(g => g.minimum?.gpu).length;
const cpuNow = list.filter(g => g.minimum?.cpu).length;

console.log(`replayed ${sides} requirement blocks across ${list.length} games`);
console.log(`  GPU: +${gpuGained} newly resolved, -${gpuLost} lost`);
console.log(`  CPU: +${cpuGained} newly resolved, -${cpuLost} lost`);
console.log(`  min GPU resolved now: ${gpuNow}/${list.length} (${Math.round(gpuNow / list.length * 100)}%)`);
console.log(`  min CPU resolved now: ${cpuNow}/${list.length} (${Math.round(cpuNow / list.length * 100)}%)`);
if (gpuLost || cpuLost) console.log('  NOTE: a loss means an alias was removed or changed — check recent dataset edits.');
