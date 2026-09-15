/**
 * Game artwork resolution.
 *
 * Art comes from SteamGridDB. Two presentations exist:
 *  - "cover": the vertical grid image, used as a full-bleed card background.
 *  - "logo":  the transparent text logo, centred on a gradient tile.
 *
 * Titles flagged `logoOnly` in game-art.json are always rendered as logos.
 * Anything without art at all falls back to a generated gradient + initials,
 * so a card never renders as a broken image (which would also cost us on
 * Core Web Vitals via layout shift).
 */
import art from './game-art.json';
import artManifest from './art-manifest.json';
import { ART_BASE } from './site';

type ArtEntry = {
  name: string;
  grid: string | null;
  gridThumb: string | null;
  hero: string | null;
  heroThumb: string | null;
  logo: string | null;
  logoThumb?: string | null;
  logoOnly?: boolean;
};

const ART = art as unknown as Record<string, ArtEntry>;

/**
 * Which games have locally optimised art (scripts/build-art.mjs).
 *
 * Cards used to load full-size PNG/JPEG straight from cdn2.steamgriddb.com —
 * 51 KB each, roughly 600 KB for one screen of the games grid, from a
 * third-party origin. Local AVIF at the displayed size is about 11 KB.
 */
const LOCAL = artManifest as unknown as Record<string, { logo: boolean; w: Record<string, unknown> }>;

export interface ArtSources {
  /** AVIF srcset — smallest, and supported everywhere that matters now. */
  avif?: string;
  /** WebP srcset — the universal fallback. */
  webp?: string;
  /** Final <img src>: the remote original, so a missing file still renders. */
  src: string;
  /** Tells the browser the layout width before CSS loads. */
  sizes: string;
}

/**
 * Build a <picture> ladder for a game.
 * Returns null when we have no local art, so the caller falls back to a plain
 * <img> pointing at the remote original.
 */
export function getArtSources(slug: string, _remote: string, sizes: string): ArtSources | null {
  if (!LOCAL[slug]) return null;
  // The <img> is the last rung of the ladder, and pointing it at SteamGridDB
  // kept a third-party origin in the critical path for every card. Once a game
  // has local art the WebP serves that role — it is universally supported, so
  // the remote URL is now only reached when we have no local copy at all.
  const b = ART_BASE;
  return {
    avif: `${b}/art/${slug}-320.avif 320w, ${b}/art/${slug}-480.avif 480w, ${b}/art/${slug}-640.avif 640w`,
    webp: `${b}/art/${slug}-320.webp 320w, ${b}/art/${slug}-480.webp 480w, ${b}/art/${slug}-640.webp 640w`,
    src: `${b}/art/${slug}-640.webp`,
    sizes
  };
}

export type GameArt =
  | { kind: 'cover'; src: string; srcLarge: string; alt: string }
  | { kind: 'logo'; src: string; alt: string; hue: number }
  | { kind: 'none'; initials: string; alt: string; hue: number };

/** Stable hue per slug so a game's fallback tile is always the same colour. */
function hueOf(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name: string): string {
  return name
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function getGameArt(slug: string, name?: string): GameArt {
  const e = ART[slug];
  const label = name ?? e?.name ?? slug;
  const alt = `${label} cover art`;

  if (e?.logoOnly && e.logo) {
    return { kind: 'logo', src: e.logoThumb || e.logo, alt: `${label} logo`, hue: hueOf(slug) };
  }
  // SteamGridDB "grid" art is community-uploaded key art we have not reviewed,
  // exactly like "hero". A game without a logo therefore falls through to the
  // generated tile rather than borrowing artwork we cannot vouch for.
  if (e?.logo) {
    return { kind: 'logo', src: e.logoThumb || e.logo, alt: `${label} logo`, hue: hueOf(slug) };
  }
  return { kind: 'none', initials: initialsOf(label), alt, hue: hueOf(slug) };
}

/**
 * Image for og:image and schema.
 *
 * Only the game's logo is used. SteamGridDB "hero" and "grid" art are both
 * community-uploaded key art we have not reviewed, and this URL is syndicated
 * into link previews and search results — so a game without a logo gets the
 * site's default card instead of borrowed artwork.
 */
export function getGameOgImage(slug: string): string | undefined {
  // Prefer the card built by scripts/build-og-cards.mjs: 1200x630, opaque, on
  // our own origin. Falling back to the SteamGridDB logo would hand social
  // platforms a transparent PNG of arbitrary shape from a third party.
  if (LOCAL[slug]) return `/og/${slug}.jpg`;
  return undefined;
}

export const hasArt = (slug: string) => Boolean(ART[slug]);

/**
 * Cover art for a blog post.
 *
 * The seed data points every post at a `cdn.` subdomain that was never set
 * up, so those URLs render as broken images. We ignore them and use
 * the generated cover for the slug instead (scripts/build-covers.mjs).
 *
 * `svg` is for on-page use — ~2KB and crisp at any density. `png` is for
 * og:image, because no social platform renders SVG in a link preview.
 */
export function getPostCover(slug: string): { svg: string; png: string; thumb: string } {
  const safe = String(slug || '').replace(/[^a-z0-9-]/gi, '');
  return safe
    ? {
        svg: `/covers/${safe}.svg`,
        png: `/covers/${safe}.png`,
        // Untitled banner: the card and the article header both print the
        // title next to the image already.
        thumb: `/covers/${safe}-thumb.svg`
      }
    : { svg: '/covers/default.svg', png: '/covers/default.png', thumb: '/covers/default.svg' };
}

/**
 * Share image for a page that does not supply its own.
 *
 * Thirty-one pages were all falling back to one generic brand card, so a link
 * to the bottleneck calculator previewed identically to a link to the CPU
 * database. This maps the path to a card that names the section. Anything
 * unmatched still gets the brand card.
 *
 * Returns a PNG: no social platform renders SVG in a link preview.
 */
const PAGE_COVERS = new Set([
  'tools', 'games', 'gpus', 'cpus', 'gpu-tier-list', 'cpu-tier-list',
  'benchmarks', 'game-lists', 'blog', 'can-it-run', 'bottleneck',
  'fps-estimator', 'build-suggest', 'upgrade-advisor', 'pc-value', 'vr-ready',
  'ray-tracing', 'dlss-fsr', 'compare-gpu', 'compare-cpu', 'psu-calculator',
  'what-can-my-pc-run', 'gpu', 'cpu'
]);

export function getPageCover(pathname: string): string {
  const seg = String(pathname || '/').split('/').filter(Boolean)[0] ?? '';
  return PAGE_COVERS.has(seg) ? `/covers/page-${seg}.png` : '/og-default.png';
}
