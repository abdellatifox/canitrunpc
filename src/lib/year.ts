/**
 * The year the site advertises in titles, headings and schema.
 *
 * Why this is not simply `new Date().getFullYear()`: year-in-title queries
 * ("gpu tier list 2027", "best gpu 2027") start climbing months before that
 * January, and a page still labelled with the old year loses the click to one
 * that is not. So the label rolls over ahead of the calendar.
 *
 * ROLLOVER_MONTH is the month (1-12) from which the *next* year is advertised.
 * At 9 the site says 2027 from September 2026 onwards. Raise it to 10 or 11 to
 * switch later in the year; the whole site follows this one number.
 *
 * Two things to know:
 *  - Every page — prerendered or server-rendered — gets the year the build
 *    computed, so the site has to be rebuilt for the rollover to appear. Any
 *    push rebuilds it, and so does the monthly data refresh.
 *  - It is a *label*, never a fact. Anything factual — a card's release year, a
 *    game's announced date, a "last updated" line — comes from the data, not
 *    from here.
 */
export const ROLLOVER_MONTH = 9;

/* Filled in by astro.config.mjs (vite `define`) with values computed in Node
   at build time. They must not be computed here at module load: Cloudflare
   Workers freeze the clock at 0 outside a request, so a module-level
   `new Date()` is 1 January 1970 in production — which put "GPU Tier List
   1970" on every server-rendered page while local builds looked fine. */
declare const __SEO_YEAR__: number | undefined;
declare const __CALENDAR_YEAR__: number | undefined;

export function seoYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + (now.getUTCMonth() + 1 >= ROLLOVER_MONTH ? 1 : 0);
}

/** The advertised year, fixed for this build. */
export const SEO_YEAR: number =
  typeof __SEO_YEAR__ === 'number' ? __SEO_YEAR__ : seoYear();

/** The calendar year of this build, for anything that must state the present. */
export const CALENDAR_YEAR: number =
  typeof __CALENDAR_YEAR__ === 'number' ? __CALENDAR_YEAR__ : new Date().getUTCFullYear();
