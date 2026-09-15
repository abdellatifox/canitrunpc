/**
 * Games the site owner has removed permanently.
 *
 * This is a blocklist rather than a set of deletions on purpose: the catalogue
 * is regenerated from SteamSpy and the Steam store API by `npm run data:refresh`,
 * so anything merely deleted from the generated JSON would reappear on the next
 * crawl. Every build step filters through here instead, and `src/lib/games.ts`
 * applies it again at runtime as a backstop.
 *
 * Matching is by Steam appid where the id is stable, plus slug prefixes so that
 * re-releases, remasters and "Complete Edition" repackagings of the same title
 * are caught without needing a new appid added by hand.
 */

/** Exact Steam appids (negative ids are our own manual, non-Steam entries). */
export const EXCLUDED_APPIDS = new Set([
  12100,   // Grand Theft Auto III
  12120,   // Grand Theft Auto: San Andreas
  12210,   // Grand Theft Auto IV: The Complete Edition
  12220,   // Grand Theft Auto: Episodes from Liberty City
  271590,  // Grand Theft Auto V Legacy
  901583,  // Grand Theft Auto IV: Complete Edition
  3240220, // Grand Theft Auto V Enhanced
  -6,      // Grand Theft Auto VI (manual entry)
  20900,   // The Witcher: Enhanced Edition Director's Cut
  20920,   // The Witcher 2: Assassins of Kings
  292030,  // The Witcher 3: Wild Hunt
  698780,  // Doki Doki Literature Club!
  397900,  // Business Tour - Board Game with Online Multiplayer
  436150,  // Governor of Poker 3

  // Not a removal by title but by quality: a keyword-stuffed listing whose name
  // is a string of unrelated search terms, one of them a slur. It surfaced in
  // autocomplete for several ordinary queries.
  2868820  // "Elite Hacker: Retro Hacking Evolution: ... SEO Words"
]);

/**
 * Slug prefixes, applied to the whole catalogue including the 76k-title search
 * index that has no per-game requirements. These cover the spin-offs, bundles
 * and regional re-listings that share the name but not the appid above.
 */
export const EXCLUDED_SLUG_PREFIXES = [
  'grand-theft-auto',
  'gta-',
  'the-witcher',
  'witcher',
  'doki-doki-literature-club',
  'business-tour',
  'governor-of-poker'
];

/** Name fragments, lower-cased, for sources that carry no usable slug. */
export const EXCLUDED_NAME_FRAGMENTS = [
  'grand theft auto',
  'gta+',                 // Rockstar's GTA subscription, listed as its own app
  'the witcher',
  'gwent',                // CD Projekt's Witcher card game and its expansions
  'thronebreaker:',       // Thronebreaker: The Witcher Tales, plus its DLC rows.
                          // The colon is deliberate: bare "ThroneBreaker" is an
                          // unrelated indie title that must stay.
  'doki doki literature club',
  'business tour',
  'governor of poker'
];

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * True when a game must not appear anywhere on the site.
 * Pass whatever identifiers you have — any single match excludes.
 */
export function isExcludedGame({ appid, slug, name } = {}) {
  if (appid != null && EXCLUDED_APPIDS.has(Number(appid))) return true;

  const s = slug ? String(slug).toLowerCase() : name ? slugify(name) : '';
  if (s && EXCLUDED_SLUG_PREFIXES.some((p) => s === p || s.startsWith(p))) return true;

  const n = name ? String(name).toLowerCase() : '';
  if (n && EXCLUDED_NAME_FRAGMENTS.some((f) => n.includes(f))) return true;

  return false;
}
