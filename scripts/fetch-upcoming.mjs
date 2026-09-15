/**
 * Fetches Steam data for the curated upcoming titles in data/upcoming-games.mjs.
 *
 * Same parser and the same hardware matcher as the main crawl, so an unreleased
 * game's verdict is calculated exactly like a released one. A game whose
 * publisher has not posted requirements yet is still recorded — with
 * `hasRequirements: false` — because the announced date and publisher are real
 * information, and the page says plainly that requirements are not out yet
 * rather than guessing them.
 *
 * Re-run any time: it overwrites, and it is cheap (one request per title).
 *
 *   node scripts/fetch-upcoming.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { UPCOMING_GAMES } from '../data/upcoming-games.mjs';
import { isExcludedGame } from '../data/excluded-games.mjs';
import { GPU_ROWS } from '../data/gpus.source.mjs';
import { CPU_ROWS } from '../data/cpus.source.mjs';
import { buildIndex, matchRequirementLine } from '../src/lib/match-hardware.mjs';
import {
  parsePcRequirements, parseRamGb, parseStorageGb,
  parseVramGb, parseDirectX, parseOs, splitAlternatives, parseCpuFloor
} from '../src/lib/steam-parse.mjs';
import { USER_AGENT } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'upcoming.requirements.json');
const UA = { 'User-Agent': USER_AGENT };
const DELAY_MS = 1500;                 // ~40 req/min, Steam's store-API budget

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

/**
 * An unreleased game's requirement fields are very often filled with
 * placeholders rather than left empty: "TBD", "TBA", "To be confirmed",
 * "Coming Soon", and Steam's own boilerplate line about needing a 64-bit
 * processor. Treating those as data would put "TBD" on the site as though the
 * publisher had stated it, so they are erased here and the field stays null —
 * which the pages already render as "not stated".
 */
const PLACEHOLDER = /^(tb[adc]|n\/?a|none|null|-+|\?+|to be (announced|confirmed|determined|advised)|coming soon|not (yet )?(announced|available|determined)|unknown|todo|tbd gb ram|tbd mb ram|tbd gb available space|tbd mb available space|requires a 64-bit processor and operating system)$/i;

function clean(v) {
  if (v == null) return null;
  const t = String(v)
    .replace(/\s+/g, ' ')
    // Steam prints this line inside the requirement block itself, sometimes
    // with the next field's label stuck to it ("... operating system OS:").
    .replace(/requires a 64[- ]bit processor and operating system\.?/i, '')
    .replace(/(OS|Processor|Memory|Graphics|Storage|DirectX)\s*:?\s*$/i, '')
    .trim()
    .replace(/[.:,;]+$/, '');
  if (!t) return null;
  if (PLACEHOLDER.test(t)) return null;
  /* A bare field label left behind by the block's own formatting — METRO 2039
     ships "Requires a 64-bit processor and operating system
OS:" as its
     processor line, and the leftover "OS" is not a requirement. */
  if (/^(os|cpu|gpu|ram|dx|directx|processor|memory|graphics|storage|notes?)$/i.test(t)) return null;
  if (t.length < 3) return null;
  // "TBD GB RAM", "TBA", "TBD" embedded in an otherwise empty value.
  if (/^(tb[adc]|to be (announced|confirmed))/i.test(t)) return null;
  return t;
}

function cleanBlock(block) {
  if (!block) return null;
  const out = {};
  let real = 0;
  for (const k of ['os', 'cpu', 'gpu', 'ram', 'storage', 'directx', 'notes']) {
    out[k] = clean(block[k]);
    if (out[k] && k !== 'notes') real++;
  }
  return real ? out : null;
}

function buildSide(rawBlock) {
  const block = cleanBlock(rawBlock);
  if (!block) return null;
  const gpuAlts = splitAlternatives(block.gpu);
  const cpuAlts = splitAlternatives(block.cpu);
  const gpuHit = block.gpu ? matchRequirementLine(block.gpu, GPU_IDX, gpuAlts) : null;
  const cpuHit = block.cpu ? matchRequirementLine(block.cpu, CPU_IDX, cpuAlts) : null;
  return {
    raw: {
      os: block.os ?? null, cpu: block.cpu ?? null, gpu: block.gpu ?? null,
      ram: block.ram ?? null, storage: block.storage ?? null,
      directx: block.directx ?? null, notes: block.notes ?? null
    },
    os: parseOs(block.os),
    directx: parseDirectX(block.directx),
    ramGb: parseRamGb(block.ram),
    storageGb: parseStorageGb(block.storage),
    vramGb: parseVramGb(block.gpu),
    gpu: gpuHit ? { name: gpuHit.best.row[0], perf: gpuHit.best.row[6], vramGb: gpuHit.best.row[3] } : null,
    cpu: cpuHit ? { name: cpuHit.best.row[0], perf: cpuHit.best.row[8] } : null,
    cpuFloor: cpuHit ? null : parseCpuFloor(block.cpu)
  };
}

/**
 * Steam's date string for an unreleased game is free text: "Feb 23, 2027",
 * "Q1 2027", "2027", "Coming soon", "To be announced". Keep the string for
 * display and pull a year out only when one is actually stated.
 */
function expectedYear(date) {
  const m = String(date || '').match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}

const games = {};
let withReq = 0, noReq = 0, released = 0, skipped = 0;

for (const entry of UPCOMING_GAMES) {
  const { appid } = entry;
  let data = null;
  try {
    const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=en&cc=us`, { headers: UA });
    const j = await r.json();
    data = j?.[appid]?.success ? j[appid].data : null;
  } catch (e) {
    console.log(`  ${appid} fetch failed: ${e.message}`);
  }
  await sleep(DELAY_MS);

  if (!data) { console.log(`  ${appid} no store data — skipped`); skipped++; continue; }
  if (!data.platforms?.windows) { console.log(`  ${appid} ${data.name}: no Windows build — skipped`); skipped++; continue; }

  const slug = slugify(data.name);
  if (isExcludedGame({ appid, slug, name: data.name })) {
    console.log(`  ${appid} ${data.name}: on the exclusion list — skipped`);
    skipped++; continue;
  }

  const comingSoon = Boolean(data.release_date?.coming_soon);
  if (!comingSoon) released++;        // shipped since the list was written

  const parsed = parsePcRequirements(data.pc_requirements);
  const min = buildSide(parsed.minimum);
  const rec = buildSide(parsed.recommended);
  /* "Windows 10" alone is not a requirement anyone can be checked against.
     A record counts as having requirements only once the publisher names a
     GPU, a CPU or an amount of memory. */
  const measurable = s => Boolean(s && (s.raw.gpu || s.ramGb || s.gpu || s.cpu));
  const hasRequirements = measurable(min) || measurable(rec);
  hasRequirements ? withReq++ : noReq++;

  games[appid] = {
    appid,
    name: data.name,
    slug,
    comingSoon,
    releaseDate: data.release_date?.date || null,
    expectedYear: expectedYear(data.release_date?.date),
    developers: data.developers ?? [],
    publishers: data.publishers ?? [],
    genres: (data.genres ?? []).map(x => x.description),
    headerImage: data.header_image ?? null,
    hasRequirements,
    minimum: min,
    recommended: rec,
    buzz: entry.buzz ?? null,
    source: `https://store.steampowered.com/app/${appid}/`,
    fetchedAt: new Date().toISOString().slice(0, 10)
  };

  console.log([
    String(appid).padEnd(8),
    comingSoon ? 'SOON' : 'OUT ',
    hasRequirements ? 'REQ' : '---',
    (data.release_date?.date || '').padEnd(16),
    data.name.slice(0, 40)
  ].join(' '));
}

fs.writeFileSync(OUT, JSON.stringify({
  games,
  meta: {
    updated: new Date().toISOString(),
    source: 'Steam store appdetails API (publisher-stated)',
    total: Object.keys(games).length
  }
}, null, 1));

console.log(`\n${Object.keys(games).length} recorded — ${withReq} with published requirements, ${noReq} without`);
if (released) console.log(`${released} have released since the list was written — move them to the normal crawl`);
if (skipped) console.log(`${skipped} skipped`);
