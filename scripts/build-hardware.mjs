/**
 * Compiles the curated hardware sources into the runtime dataset the site
 * reads (src/lib/hardware-data.json).
 *
 * The 0-100 `score` shown on the site is derived from the relative `perf`
 * index, normalised so the fastest tracked part is 100. That is why a card's
 * score can fall when a new flagship launches: the scale is relative, and the
 * site says so on the tier-list pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GPU_ROWS } from '../data/gpus.source.mjs';
import { CPU_ROWS } from '../data/cpus.source.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src', 'lib', 'hardware-data.json');

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Tier thresholds differ by component because the two distributions genuinely
 * differ. GPU gaming performance spreads across an enormous range (a 5090 is
 * ~60x an HD 4870), while CPU gaming performance compresses hard at the top —
 * a 5600X is not far off a 9800X3D once you leave 1080p. Using one set of
 * thresholds for both would put almost every modern CPU in S tier.
 */
const TIER_CUTS = {
  gpu: [['S', 70], ['A', 50], ['B', 32], ['C', 18], ['D', 8]],
  cpu: [['S', 90], ['A', 78], ['B', 62], ['C', 45], ['D', 28]]
};

function tierOf(score, kind) {
  for (const [tier, min] of TIER_CUTS[kind]) if (score >= min) return tier;
  return 'F';
}

// ---- GPUs ----------------------------------------------------------------
const gpuMax = Math.max(...GPU_ROWS.map(r => r[6]));
const gpus = GPU_ROWS.map(([name, brand, year, vram, tdp, msrp, perf, aliases]) => {
  const score = Math.max(1, Math.round((perf / gpuMax) * 100));
  const n = name.toLowerCase();
  return {
    name,
    slug: slugify(name),
    brand,
    release_year: year,
    vram_gb: vram,
    tdp_watts: tdp,
    msrp_usd: msrp,
    perf,
    score,
    tier: tierOf(score, 'gpu'),
    // Feature support follows the hardware generation, not marketing tiers.
    supports_dlss: brand === 'NVIDIA' && /\brtx\b/.test(n) ? 1 : 0,
    supports_fsr: 1,                                   // FSR is vendor-agnostic
    supports_xess: brand === 'Intel' ? 1 : 0,
    supports_ray_tracing:
      (brand === 'NVIDIA' && /\brtx\b/.test(n)) ||
      (brand === 'AMD' && /\brx (6|7|9)\d{3}/.test(n)) ||
      (brand === 'Intel' && /\barc [ab]/.test(n)) ? 1 : 0,
    aliases
  };
}).sort((a, b) => b.perf - a.perf);

// ---- CPUs ----------------------------------------------------------------
const cpuMax = Math.max(...CPU_ROWS.map(r => r[8]));
const cpus = CPU_ROWS.map(([name, brand, year, cores, threads, base, boost, tdp, perf, aliases]) => {
  const score = Math.max(1, Math.round((perf / cpuMax) * 100));
  return {
    name,
    slug: slugify(name),
    brand,
    release_year: year,
    cores,
    threads,
    base_ghz: base,
    boost_ghz: boost,
    tdp_watts: tdp,
    perf,
    score,
    tier: tierOf(score, 'cpu'),
    aliases
  };
}).sort((a, b) => b.perf - a.perf);

// Slugs are used as URLs; a collision would silently shadow a part.
for (const [label, list] of [['gpu', gpus], ['cpu', cpus]]) {
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p.slug)) throw new Error(`duplicate ${label} slug: ${p.slug}`);
    seen.add(p.slug);
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  gpus,
  cpus,
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    gpuAnchor: 'relative gaming index, normalised so the fastest tracked GPU = 100',
    cpuAnchor: 'relative 1080p gaming index, normalised so the fastest tracked CPU = 100'
  }
}));

console.log(`GPUs: ${gpus.length} (top: ${gpus[0].name} ${gpus[0].score})`);
console.log(`CPUs: ${cpus.length} (top: ${cpus[0].name} ${cpus[0].score})`);
console.log('tier spread GPU:', ['S','A','B','C','D','F'].map(t => `${t}:${gpus.filter(g => g.tier === t).length}`).join(' '));
console.log('tier spread CPU:', ['S','A','B','C','D','F'].map(t => `${t}:${cpus.filter(c => c.tier === t).length}`).join(' '));
console.log(`wrote ${OUT}`);
