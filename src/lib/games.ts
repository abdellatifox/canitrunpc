/**
 * Presents the Steam-derived requirements in the shape the site's pages already
 * consume, so thirteen pages keep working while the numbers underneath become
 * real ones.
 *
 * Two things had to be reconciled to do this safely:
 *
 * 1. **Scale.** The pages compare a game's `*_gpu_score` against a card's
 *    `score` (0-100, normalised so the fastest tracked part is 100), but the
 *    requirement data stores the raw `perf` index (GPUs top out at 128). Mixing
 *    them would silently understate every GPU requirement by ~28%, so `perf` is
 *    converted with exactly the same normalisation `build-hardware.mjs` uses.
 *
 * 2. **Absence.** Steam states no DLSS/FSR/ray-tracing flags, and for roughly
 *    half of titles it names no comparable graphics card either. Those fields
 *    are `null` here — not `0` — because "we have not verified this" and "this
 *    is not supported" are different claims, and the old seed data conflated
 *    them.
 */
import reqs from './game-reqs.json';
import hardware from './hardware-data.json';
import { GAME_FEATURES_BY_APPID, MANUAL_FEATURES } from '../../data/game-features.mjs';
import { isExcludedGame } from '../../data/excluded-games.mjs';

const HW = hardware as unknown as { gpus: any[]; cpus: any[] };
const GPU_MAX_PERF = Math.max(...HW.gpus.map(g => g.perf));
const CPU_MAX_PERF = Math.max(...HW.cpus.map(c => c.perf));

/** perf -> the 0-100 scale the pages compare against. */
const gpuScore = (perf: number | null | undefined) =>
  perf == null ? null : Math.max(1, Math.round((perf / GPU_MAX_PERF) * 100));
const cpuScore = (perf: number | null | undefined) =>
  perf == null ? null : Math.max(1, Math.round((perf / CPU_MAX_PERF) * 100));

interface RawSide {
  os: string | null; dx: string | null; ram: number | null; sto: number | null;
  vram: number | null;
  gpu: { n: string; p: number; v?: number } | null;
  cpu: { n: string; p: number } | null;
  cf?: { ghz: number | null; cores: number | null } | null;
  rg: string | null; rc: string | null;
}
interface RawGame {
  a: number; n: string; y: number | null; g: string | null; d: string | null;
  img: string | null; min: RawSide | null; rec: RawSide | null; src: string;
  manual?: boolean; unpublished?: boolean; note?: string;
  /** Unreleased: 1, plus the publisher's own date string and whether
      requirements are published yet. See scripts/fetch-upcoming.mjs. */
  up?: 1; rd?: string | null; hq?: 0 | 1; buzz?: string; buzzSrc?: string;
}

const BUNDLE = reqs as unknown as {
  games: Record<string, RawGame>;
  bySlug: Record<string, number>;
};

type Feat = { dlss: boolean; fsr: boolean; rt: boolean; rtIntensity?: string; cpuBound: boolean };
const BY_APPID = GAME_FEATURES_BY_APPID as Record<string, Feat & { name?: string }>;
const BY_SLUG = MANUAL_FEATURES as Record<string, Feat>;

/** Steam titles resolve by appid; non-Steam ones (negative ids) by slug. */
function featuresFor(appid: number, slug: string): Feat | null {
  return BY_APPID[String(appid)] ?? BY_SLUG[slug] ?? null;
}

export interface SiteGame {
  name: string;
  slug: string;
  steam_id: number | null;
  genre: string;
  release_year: number | null;
  developer: string;
  publisher: string;
  image_url: string | null;

  /** null when the publisher named nothing we can measure against. */
  min_gpu_score: number | null;
  rec_gpu_score: number | null;
  min_cpu_score: number | null;
  rec_cpu_score: number | null;
  min_ram_gb: number | null;
  rec_ram_gb: number | null;
  min_vram_gb: number | null;
  rec_vram_gb: number | null;
  min_storage_gb: number | null;
  rec_storage_gb: number | null;
  min_os: string | null;
  min_directx: string | null;

  /** The publisher's own wording, for display. */
  min_gpu_text: string | null;
  min_cpu_text: string | null;
  rec_gpu_text: string | null;
  rec_cpu_text: string | null;

  /** null = unverified, not "unsupported". */
  supports_dlss: number | null;
  supports_fsr: number | null;
  supports_ray_tracing: number | null;
  ray_tracing_intensity: string | null;
  cpu_intensive: number | null;
  gpu_intensive: number | null;

  source: string;

  /** Not out yet. Everything below is only meaningful when this is true. */
  upcoming: boolean;
  /** The publisher's own date text: "Feb 23, 2027", "Q1 2027", "Coming soon". */
  release_date: string | null;
  /** False when the game is announced but has published no requirements yet. */
  requirements_published: boolean;
  /** A sourced anticipation note, with the source that ranked it. */
  buzz: { label: string; source: string } | null;

  unpublished: boolean;
  notes: string | null;
  /** True when both GPU tiers resolved, i.e. the game can be ranked/compared. */
  scorable: boolean;
  /**
   * Where this game's recommended GPU requirement sits among the games we can
   * score, 0 (lightest) to 1 (heaviest). null when unscorable.
   *
   * Demand has to be expressed relative to the catalogue, not against fixed
   * thresholds. Requirements name the cards that were current when a game
   * shipped, so on a scale anchored to today's flagship almost everything looks
   * trivial — fixed bands labelled Cyberpunk 2077 "light on hardware", which is
   * plainly wrong to any reader.
   */
  demandPercentile: number | null;
}

function slugFor(appid: number): string {
  for (const [slug, id] of Object.entries(BUNDLE.bySlug)) {
    if (id === appid) return slug;
  }
  return String(appid);
}

// bySlug is the authoritative slug map; invert it once rather than per lookup.
const SLUG_BY_ID = new Map<number, string>(
  Object.entries(BUNDLE.bySlug).map(([slug, id]) => [id, slug])
);

function adapt(raw: RawGame): SiteGame {
  const slug = SLUG_BY_ID.get(raw.a) ?? slugFor(raw.a);
  const f = featuresFor(raw.a, slug);
  const min = raw.min, rec = raw.rec;

  const minG = gpuScore(min?.gpu?.p);
  const recG = gpuScore(rec?.gpu?.p) ?? minG;

  return {
    name: raw.n,
    slug,
    steam_id: raw.a > 0 ? raw.a : null,
    genre: raw.g ?? 'Game',
    release_year: raw.y,
    developer: raw.d ?? '',
    publisher: raw.d ?? '',
    image_url: raw.img,

    min_gpu_score: minG,
    rec_gpu_score: recG,
    min_cpu_score: cpuScore(min?.cpu?.p),
    rec_cpu_score: cpuScore(rec?.cpu?.p) ?? cpuScore(min?.cpu?.p),
    min_ram_gb: min?.ram ?? null,
    rec_ram_gb: rec?.ram ?? min?.ram ?? null,
    // VRAM: prefer an explicitly stated figure, else the memory of the card the
    // publisher actually named. Never inherit the minimum tier's figure into the
    // recommended one — Cyberpunk states 6GB minimum and names an 8GB card as
    // recommended, and inheriting made the recommended row read 6GB.
    min_vram_gb: min?.vram ?? min?.gpu?.v ?? null,
    rec_vram_gb: rec?.vram ?? rec?.gpu?.v ?? null,
    min_storage_gb: min?.sto ?? null,
    rec_storage_gb: rec?.sto ?? min?.sto ?? null,
    min_os: min?.os ?? null,
    min_directx: min?.dx ?? null,

    min_gpu_text: min?.rg ?? null,
    min_cpu_text: min?.rc ?? null,
    rec_gpu_text: rec?.rg ?? null,
    rec_cpu_text: rec?.rc ?? null,

    supports_dlss: f ? (f.dlss ? 1 : 0) : null,
    supports_fsr: f ? (f.fsr ? 1 : 0) : null,
    supports_ray_tracing: f ? (f.rt ? 1 : 0) : null,
    ray_tracing_intensity: f?.rt ? (f.rtIntensity ?? 'medium') : null,
    cpu_intensive: f ? (f.cpuBound ? 1 : 0) : null,
    gpu_intensive: f ? (f.cpuBound ? 0 : 1) : null,

    source: raw.src,
    upcoming: raw.up === 1,
    release_date: raw.rd ?? null,
    // A released game always has requirements; an upcoming one may not yet.
    requirements_published: raw.up === 1 ? raw.hq === 1 : true,
    buzz: raw.buzz ? { label: raw.buzz, source: raw.buzzSrc ?? '' } : null,
    unpublished: Boolean(raw.unpublished),
    notes: raw.note ?? null,
    scorable: minG != null && recG != null,
    demandPercentile: null   // assigned in allGames() once the set is ranked
  };
}

let _all: SiteGame[] | null = null;

/** Every game we hold requirements for, newest first. */
export function allGames(): SiteGame[] {
  if (!_all) {
    // Backstop for the build-time filter: if a removed title ever survives into
    // a generated bundle, it still never reaches a page.
    const list = Object.values(BUNDLE.games)
      .map(adapt)
      .filter(g => !isExcludedGame({ appid: g.steam_id, slug: g.slug, name: g.name }));

    // Rank the scorable subset once, then write each game's percentile back.
    const ranked = list
      .filter(g => g.rec_gpu_score != null)
      .sort((a, b) => a.rec_gpu_score! - b.rec_gpu_score!);
    ranked.forEach((g, i) => {
      g.demandPercentile = ranked.length > 1 ? i / (ranked.length - 1) : 1;
    });

    _all = list.sort(
      (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || a.name.localeCompare(b.name)
    );
  }
  return _all;
}

/**
 * A demand description grounded in the catalogue rather than in absolute
 * numbers. Returns null when we cannot score the game at all.
 */
export function demandLabelFor(g: SiteGame): string | null {
  const p = g.demandPercentile;
  if (p == null) return null;
  if (p >= 0.95) return 'among the most demanding titles we track';
  if (p >= 0.85) return 'demanding';
  if (p >= 0.6) return 'moderately demanding';
  if (p >= 0.3) return 'undemanding by current standards';
  return 'very light on modern hardware';
}

/**
 * Games we can rank and compare. Pages that sort by requirement or estimate a
 * frame rate must use this rather than filtering nulls themselves — a null
 * compared numerically silently becomes 0 and the game sorts to the bottom as
 * though it were trivially easy to run.
 */
export function scorableGames(): SiteGame[] {
  return allGames().filter(g => g.scorable);
}

/** Games whose graphics features have been verified. */
export function featuredGames(): SiteGame[] {
  return allGames().filter(g => g.supports_ray_tracing !== null);
}

/**
 * Unreleased games, soonest first. Ones with a full date come before ones with
 * only a year or "coming soon", because a reader scanning for what is close is
 * not served by "2027" sitting above "Feb 4, 2027".
 */
export function upcomingGames(): SiteGame[] {
  const rank = (g: SiteGame) => {
    const d = g.release_date ?? '';
    if (/[A-Za-z]{3,} \d{1,2},? \d{4}/.test(d)) return 0;   // "Feb 23, 2027"
    if (/^Q[1-4]/i.test(d)) return 1;                        // "Q1 2027"
    if (/^\d{4}$/.test(d.trim())) return 2;                  // "2027"
    return 3;                                                // "Coming soon"
  };
  return allGames()
    .filter(g => g.upcoming)
    .sort((a, b) =>
      (a.release_year ?? 9999) - (b.release_year ?? 9999) ||
      rank(a) - rank(b) ||
      Date.parse(`${a.release_date} UTC`) - Date.parse(`${b.release_date} UTC`) ||
      a.name.localeCompare(b.name));
}

/** Released games only — anything presented as playable today must use this. */
export function releasedGames(): SiteGame[] {
  return allGames().filter(g => !g.upcoming);
}

export function gameBySlug(slug: string): SiteGame | null {
  return allGames().find(g => g.slug === slug) ?? null;
}

export const gameCounts = () => {
  const all = allGames();
  return {
    total: all.length,
    scorable: all.filter(g => g.scorable).length,
    featureVerified: all.filter(g => g.supports_ray_tracing !== null).length,
    upcoming: all.filter(g => g.upcoming).length,
    upcomingWithReqs: all.filter(g => g.upcoming && g.requirements_published).length
  };
};
