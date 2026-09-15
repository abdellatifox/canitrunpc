/**
 * Pulls real PC system requirements from Steam for the top N games by
 * ownership and resolves the named parts against our curated hardware data.
 *
 * Every record keeps the publisher's original requirement text. The resolved
 * part is an addition to that, never a replacement — if we cannot confidently
 * identify a part we store null and the site shows the publisher's words alone
 * rather than a number we made up.
 *
 * Resumable: progress is checkpointed, so re-running continues where it left
 * off instead of re-fetching everything.
 *
 *   node scripts/fetch-steam-requirements.mjs [limit]
 */
import fs from 'node:fs';
import path from 'node:path';
import { GPU_ROWS } from '../data/gpus.source.mjs';
import { CPU_ROWS } from '../data/cpus.source.mjs';
import { buildIndex, matchRequirementLine } from '../src/lib/match-hardware.mjs';
import {
  parsePcRequirements, parseRamGb, parseStorageGb,
  parseVramGb, parseDirectX, parseOs, splitAlternatives, parseCpuFloor
} from '../src/lib/steam-parse.mjs';
import { USER_AGENT } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const INDEX = path.join(ROOT, 'data', 'steam-index.json');
const OUT = path.join(ROOT, 'data', 'games.requirements.json');
const UA = { 'User-Agent': USER_AGENT };

const LIMIT = parseInt(process.argv[2] || '3000', 10);
const DELAY_MS = 1500;               // ~40 req/min, inside Steam's store-API budget

const GPU_IDX = buildIndex(GPU_ROWS, 7);
const CPU_IDX = buildIndex(CPU_ROWS, 9);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(name) {
  return String(name).toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Turn one parsed requirement block into structured + raw fields. */
function buildSide(block) {
  if (!block) return null;

  const gpuAlts = splitAlternatives(block.gpu);
  const cpuAlts = splitAlternatives(block.cpu);
  const gpuHit = block.gpu ? matchRequirementLine(block.gpu, GPU_IDX, gpuAlts) : null;
  const cpuHit = block.cpu ? matchRequirementLine(block.cpu, CPU_IDX, cpuAlts) : null;

  return {
    raw: {
      os: block.os ?? null,
      cpu: block.cpu ?? null,
      gpu: block.gpu ?? null,
      ram: block.ram ?? null,
      storage: block.storage ?? null,
      directx: block.directx ?? null,
      notes: block.notes ?? null
    },
    os: parseOs(block.os),
    directx: parseDirectX(block.directx),
    ramGb: parseRamGb(block.ram),
    storageGb: parseStorageGb(block.storage),
    vramGb: parseVramGb(block.gpu),
    gpu: gpuHit ? { name: gpuHit.best.row[0], perf: gpuHit.best.row[6], vramGb: gpuHit.best.row[3] } : null,
    cpu: cpuHit ? { name: cpuHit.best.row[0], perf: cpuHit.best.row[8] } : null,
    // Structural fallback for lines that state a clock/core count but no model.
    cpuFloor: cpuHit ? null : parseCpuFloor(block.cpu)
  };
}

async function fetchApp(appid, attempt = 0) {
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      { headers: UA }
    );
    if (r.status === 429 || r.status === 403) {
      if (attempt > 4) return { rateLimited: true };
      const wait = 30000 * (attempt + 1);
      console.log(`  ${appid}: ${r.status} -> waiting ${wait / 1000}s`);
      await sleep(wait);
      return fetchApp(appid, attempt + 1);
    }
    if (!r.ok) return null;
    const j = await r.json();
    const entry = j?.[appid];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch (e) {
    if (attempt > 2) return null;
    await sleep(4000);
    return fetchApp(appid, attempt + 1);
  }
}

// ---------------------------------------------------------------- run

if (!fs.existsSync(INDEX)) {
  console.error(`Missing ${INDEX} — run scripts/fetch-steam-index.mjs first.`);
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const targets = index.slice(0, LIMIT);

const existing = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, 'utf8'))
  : { games: {}, meta: {} };
const games = existing.games || {};

console.log(`targets: ${targets.length} | already have: ${Object.keys(games).length}`);

let done = 0, added = 0, skipped = 0, noReq = 0;
const t0 = Date.now();

for (const g of targets) {
  done++;
  if (games[g.a]) continue;

  const data = await fetchApp(g.a);
  await sleep(DELAY_MS);

  if (data?.rateLimited) {
    console.log('rate limited hard — stopping early, re-run to continue');
    break;
  }
  if (!data) { skipped++; continue; }

  // Only real games with Windows support are useful here.
  if (data.type !== 'game' || !data.platforms?.windows) { skipped++; continue; }

  const parsed = parsePcRequirements(data.pc_requirements);
  const min = buildSide(parsed.minimum);
  const rec = buildSide(parsed.recommended);
  if (!min && !rec) { noReq++; continue; }

  games[g.a] = {
    appid: g.a,
    name: data.name,
    slug: slugify(data.name),
    owners: g.o,
    releaseDate: data.release_date?.date ?? null,
    releaseYear: (() => {
      const m = String(data.release_date?.date || '').match(/(19|20)\d{2}/);
      return m ? parseInt(m[0], 10) : null;
    })(),
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    genres: (data.genres ?? []).map(x => x.description),
    isFree: Boolean(data.is_free),
    headerImage: data.header_image ?? null,
    minimum: min,
    recommended: rec,
    source: `https://store.steampowered.com/app/${g.a}/`,
    fetchedAt: new Date().toISOString().slice(0, 10)
  };
  added++;

  if (added % 25 === 0) {
    const rate = added / ((Date.now() - t0) / 60000);
    fs.writeFileSync(OUT, JSON.stringify({ games, meta: { updated: new Date().toISOString() } }));
    console.log(`  ${done}/${targets.length} | added ${added} | skip ${skipped} | noreq ${noReq} | ${rate.toFixed(0)}/min`);
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  games,
  meta: {
    updated: new Date().toISOString(),
    total: Object.keys(games).length,
    source: 'Steam store appdetails API'
  }
}));

const list = Object.values(games);
const withGpu = list.filter(g => g.minimum?.gpu).length;
const withCpu = list.filter(g => g.minimum?.cpu).length;
console.log(`\ndone. stored ${list.length} games`);
console.log(`  min GPU resolved: ${withGpu} (${(withGpu / list.length * 100).toFixed(0)}%)`);
console.log(`  min CPU resolved: ${withCpu} (${(withCpu / list.length * 100).toFixed(0)}%)`);
