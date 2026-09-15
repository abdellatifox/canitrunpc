/**
 * Data access layer.
 *
 * Every page goes through here instead of touching `locals.runtime.env.DB`
 * directly. When D1 is bound we query it; when it is not (local `astro dev`
 * without wrangler, or a misconfigured binding) we fall back to the same rows
 * baked out of the migration seeds. Pages therefore always render real content
 * rather than 500-ing or shipping a half-empty page to Googlebot.
 */
import fallback from './fallback-data.json';
import blogBundle from './blog-posts.json';
import hardware from './hardware-data.json';
import { allGames, gameBySlug, scorableGames, releasedGames, type SiteGame } from './games';

export interface Gpu {
  name: string; brand: string; score: number; vram_gb: number; tier: string;
  release_year: number; msrp_usd: number; supports_dlss: number; supports_fsr: number;
  supports_xess: number; supports_ray_tracing: number; tdp_watts: number; slug: string;
  /** Relative index the 0-100 score is derived from. */
  perf?: number;
  /** Requirement strings that should resolve to this part. */
  aliases?: string[];
}

export interface Cpu {
  name: string; brand: string; score: number; cores: number; threads: number;
  base_ghz: number; boost_ghz: number; tdp_watts: number; release_year: number;
  tier: string; slug: string;
  perf?: number;
  aliases?: string[];
}

/**
 * Re-exported from the Steam-derived adapter. Requirement fields are nullable
 * because a publisher may not state them — see src/lib/games.ts.
 */
export type Game = SiteGame;

export interface BlogPost {
  title: string; slug: string; excerpt: string; content: string; category: string;
  author: string; image_url: string; read_time: number; featured: number;
  published_at: string;
  /** Date of the data the article was generated from. */
  updated_at?: string;
}

/*
 * Articles are generated from the site's data by scripts/build-blog.mjs and
 * shipped in the bundle — not stored in D1. Their numbers are computed from the
 * same requirements the pages show, so they have to be rebuilt with that data;
 * a database copy would drift the moment the data refreshed (which is exactly
 * how a stale brand name survived in a D1 row on the first site).
 */
const POSTS = ((blogBundle as unknown as { posts: BlogPost[] }).posts ?? [])
  .slice()
  .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '') || a.title.localeCompare(b.title));

const FB = fallback as unknown as {
  gpus: Gpu[]; cpus: Cpu[]; games: Game[]; blog: BlogPost[];
};

/**
 * GPU and CPU data comes from the curated dataset in data/*.source.mjs
 * (compiled by scripts/build-hardware.mjs), never from the old migration
 * seeds — those carried scores that disagreed with each other. Games still
 * come from the seeds until the Steam-derived set replaces them.
 */
const HW = hardware as unknown as { gpus: Gpu[]; cpus: Cpu[] };

function getDb(locals: any) {
  return locals?.runtime?.env?.DB ?? null;
}

async function query<T>(locals: any, sql: string, binds: any[], fb: () => T[]): Promise<T[]> {
  const db = getDb(locals);
  if (!db) return fb();
  try {
    const res = await db.prepare(sql).bind(...binds).all();
    const rows = (res?.results ?? []) as T[];
    return rows.length ? rows : fb();
  } catch {
    return fb();
  }
}

/* ---------------------------------- GPUs --------------------------------- */

export async function getGpus(_locals: any): Promise<Gpu[]> {
  return [...HW.gpus].sort((a, b) => b.score - a.score);
}

export async function getGpu(_locals: any, slug: string): Promise<Gpu | null> {
  return HW.gpus.find(g => g.slug === slug) ?? null;
}

/* ---------------------------------- CPUs --------------------------------- */

export async function getCpus(_locals: any): Promise<Cpu[]> {
  return [...HW.cpus].sort((a, b) => b.score - a.score);
}

export async function getCpu(_locals: any, slug: string): Promise<Cpu | null> {
  return HW.cpus.find(c => c.slug === slug) ?? null;
}

/* ---------------------------------- Games -------------------------------- */

/**
 * Games now come from the Steam-derived set, not the old migration seed. The
 * seed carried values that were simply wrong (it listed Cyberpunk 2077 at 8GB
 * of RAM; the publisher states 12GB) and disagreed with what the tools showed.
 */
export async function getGames(_locals: any): Promise<Game[]> {
  return allGames();
}

/**
 * Only the games whose requirements resolved to parts we can measure. Anything
 * that ranks, sorts or filters on a requirement must use this: JavaScript
 * coerces `null` to 0 in a numeric comparison, so an unscored game would
 * silently pass a filter like `min_gpu_score <= 30` as if it were trivial to run.
 */
export async function getScorableGames(_locals: any): Promise<Game[]> {
  return scorableGames();
}

/**
 * Games that are out. Any page that presents games as playable, benchmarked or
 * "runnable on this card" must use this: unreleased titles are in the catalogue
 * with their publisher-stated requirements, and without this filter /benchmarks
 * listed Lords of the Fallen II and Tomb Raider: Legacy of Atlantis as though
 * they had been measured.
 */
export async function getReleasedGames(_locals: any): Promise<Game[]> {
  return releasedGames();
}

export async function getGame(_locals: any, slug: string): Promise<Game | null> {
  return gameBySlug(slug);
}

/* ---------------------------------- Blog --------------------------------- */

export async function getPosts(_locals: any): Promise<BlogPost[]> {
  return POSTS;
}

export async function getPost(_locals: any, slug: string): Promise<BlogPost | null> {
  return POSTS.find(p => p.slug === slug) ?? null;
}

/* Static-data accessors — used by prerendered pages and sitemaps, where we
   cannot await a request-scoped D1 binding. */
export const staticGpus = () => [...HW.gpus].sort((a, b) => b.score - a.score);
export const staticCpus = () => [...HW.cpus].sort((a, b) => b.score - a.score);
export const staticGames = () => allGames();
export const staticPosts = () => [...POSTS];
