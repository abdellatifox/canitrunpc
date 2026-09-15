import { SITE_URL, USER_AGENT } from './site';
/**
 * Runtime access to real, publisher-stated PC requirements.
 *
 * Two sources, in order:
 *  1. the bundled set compiled from Steam by scripts/fetch-steam-requirements.mjs
 *  2. a live Steam lookup for anything not bundled, parsed with the same code
 *
 * Both paths run identical parsing and part-matching, so a live-resolved game
 * and a bundled one produce the same answer. Nothing here invents a value: a
 * field Steam does not state stays null and the UI says so.
 */
import bundled from './game-reqs.json';
import { parsePcRequirements, parseRamGb, parseStorageGb, parseVramGb, parseDirectX, parseOs, splitAlternatives, parseCpuFloor } from './steam-parse.mjs';
import { buildIndex, matchRequirementLine } from './match-hardware.mjs';
import hardware from './hardware-data.json';
import { isExcludedGame } from '../../data/excluded-games.mjs';

export interface ReqPart { n: string; p: number; v?: number }
export interface ReqSide {
  os: string | null;
  dx: string | null;
  ram: number | null;
  sto: number | null;
  vram: number | null;
  gpu: ReqPart | null;
  cpu: ReqPart | null;
  /** Clock/core floor for lines that name no model. */
  cf?: { ghz: number | null; cores: number | null } | null;
  /** The publisher's own wording, shown verbatim. */
  rg: string | null;
  rc: string | null;
}
export interface GameReqs {
  a: number;
  n: string;
  y: number | null;
  g: string | null;
  d: string | null;
  img: string | null;
  min: ReqSide | null;
  rec: ReqSide | null;
  src: string;
  live?: boolean;
  /** 1 for an unreleased title (see scripts/fetch-upcoming.mjs). */
  up?: 1;
}

const BUNDLE = bundled as unknown as {
  games: Record<string, GameReqs>;
  bySlug: Record<string, number>;
  meta: any;
};

const HW = hardware as unknown as { gpus: any[]; cpus: any[] };

/* The matcher wants the same positional row shape the build scripts use. */
const GPU_IDX = buildIndex(
  HW.gpus.map(g => [g.name, g.brand, g.release_year, g.vram_gb, g.tdp_watts, g.msrp_usd, g.perf, g.aliases ?? []]),
  7
);
const CPU_IDX = buildIndex(
  HW.cpus.map(c => [c.name, c.brand, c.release_year, c.cores, c.threads, c.base_ghz, c.boost_ghz, c.tdp_watts, c.perf, c.aliases ?? []]),
  9
);

function trim(s: string | null | undefined, n = 120): string | null {
  if (!s) return null;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function buildSide(block: any): ReqSide | null {
  if (!block) return null;
  const gpuHit = block.gpu ? matchRequirementLine(block.gpu, GPU_IDX, splitAlternatives(block.gpu)) : null;
  const cpuHit = block.cpu ? matchRequirementLine(block.cpu, CPU_IDX, splitAlternatives(block.cpu)) : null;
  return {
    os: parseOs(block.os),
    dx: parseDirectX(block.directx),
    ram: parseRamGb(block.ram),
    sto: parseStorageGb(block.storage),
    vram: parseVramGb(block.gpu),
    gpu: gpuHit ? { n: gpuHit.best.row[0], p: gpuHit.best.row[6], v: gpuHit.best.row[3] } : null,
    cpu: cpuHit ? { n: cpuHit.best.row[0], p: cpuHit.best.row[8] } : null,
    cf: cpuHit ? null : parseCpuFloor(block.cpu),
    rg: trim(block.gpu),
    rc: trim(block.cpu)
  };
}

/** Fetch and parse one Steam title. Returns null when Steam has nothing usable. */
export async function fetchLive(appid: number): Promise<GameReqs | null> {
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const d = j?.[appid]?.data;
    if (!d || !j[appid].success) return null;
    if (isExcludedGame({ appid, name: d.name })) return null;

    const parsed = parsePcRequirements(d.pc_requirements);
    const min = buildSide(parsed.minimum);
    const rec = buildSide(parsed.recommended);
    if (!min && !rec) return null;

    const yr = String(d.release_date?.date || '').match(/(19|20)\d{2}/);
    return {
      a: appid,
      n: d.name,
      y: yr ? parseInt(yr[0], 10) : null,
      g: (d.genres ?? [])[0]?.description ?? null,
      d: (d.developers ?? [])[0] ?? null,
      img: d.header_image ?? null,
      min,
      rec,
      src: `https://store.steampowered.com/app/${appid}/`,
      live: true
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a game reference to requirements.
 * Accepts a bundled slug, a numeric appid, or the "steam:<appid>" value the
 * autocomplete emits for live Steam results.
 */
export async function getRequirements(ref: string, kv?: any): Promise<GameReqs | null> {
  if (!ref) return null;
  if (isExcludedGame({ slug: ref })) return null;

  const steamMatch = /^steam:(\d+)$/.exec(ref);
  const numeric = /^\d+$/.test(ref) ? parseInt(ref, 10) : null;
  const appid = steamMatch ? parseInt(steamMatch[1], 10) : numeric;

  if (appid !== null) {
    if (isExcludedGame({ appid })) return null;
    const hit = BUNDLE.games[String(appid)];
    if (hit) return hit;
    return cachedLive(appid, kv);
  }

  const mapped = BUNDLE.bySlug?.[ref];
  if (mapped) return BUNDLE.games[String(mapped)] ?? null;

  return null;
}

/** Live lookups are cached in KV when available so we hit Steam once per game. */
async function cachedLive(appid: number, kv?: any): Promise<GameReqs | null> {
  const key = `reqs:${appid}`;
  if (kv) {
    try {
      const cached = await kv.get(key, 'json');
      if (cached) return cached as GameReqs;
    } catch { /* cache is optional */ }
  }
  const live = await fetchLive(appid);
  if (live && kv) {
    try { await kv.put(key, JSON.stringify(live), { expirationTtl: 60 * 60 * 24 * 30 }); } catch { /* non-fatal */ }
  }
  return live;
}

export const bundleMeta = BUNDLE.meta;
/**
 * Released titles only. Both of these answer "which games can you play", and an
 * unreleased game cannot be played however good the PC is — counting the 50
 * upcoming titles made What Can My PC Run report games like Fable as runnable
 * today. Unreleased games are still checked individually through can-it-run.
 */
const released = () => Object.values(BUNDLE.games || {}).filter(g => g.up !== 1);

export const bundledCount = () => released().length;

/** Every released bundled title with real, publisher-stated requirements — used to scan a whole library against one set of parts (see /api/tools/what-can-my-pc-run). */
export const allBundledGames = (): GameReqs[] => released();
