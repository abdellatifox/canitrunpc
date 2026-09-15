/**
 * Single source of truth for the site's identity.
 *
 * Page titles, schema, the footer, feeds, API user agents and the build
 * scripts all read from here. Never type the domain or brand anywhere else,
 * so that changing either stays a one-line edit.
 */
export const SITE_DOMAIN = 'canitrunpc.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;

/** Brand, one word — used in titles, schema and the footer. */
export const SITE_NAME = 'CanItRunPC';
/** Brand, spaced — used in running prose. */
export const SITE_NAME_SPACED = 'Can It Run PC';

/** The logo renders the first segment in bold. */
export const SITE_NAME_PARTS = { bold: 'canitrun', rest: 'PC' } as const;

export const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`;

/**
 * Ownership tokens for search engines. Paste only the content value of the
 * meta tag each console gives you (Search Console: "HTML tag"; Bing Webmaster
 * Tools: "Meta tag"); an empty string renders nothing.
 */
export const GOOGLE_SITE_VERIFICATION = '';

/** Google Tag Manager container, injected at build time from the GTM_ID
 *  Cloudflare Pages variable (see astro.config.mjs). Empty when not set. */
declare const __GTM_ID__: string | undefined;
export const GTM_ID = typeof __GTM_ID__ === 'string' ? __GTM_ID__ : '';
export const BING_SITE_VERIFICATION = '';

/**
 * IndexNow key (Bing, Yandex, Seznam, Naver). The same value must be served
 * as /<key>.txt from public/ — scripts/indexnow.mjs checks that before submitting.
 */
export const INDEXNOW_KEY = '5c916014ea068a246c02a65ba71d0fa1';

/** Identifies our fetchers to Steam, SteamSpy and SteamGridDB. */
export const USER_AGENT = `${SITE_NAME}/1.0 (+${SITE_URL})`;

/**
 * The public path of the page being rendered.
 *
 * With build.format 'file', a prerendered page's Astro.url.pathname is the
 * *file* it is written to — "/tools.html", "/game/fable.html" — not the URL
 * Cloudflare serves it at ("/tools", which it 308s to from the .html form).
 * Every canonical built from the raw pathname pointed at that redirect: 887
 * pages told Google their real address was one that bounces back. Anything
 * that turns the current path into a URL, a nav state or an image choice must
 * go through this.
 */
export const publicPath = (pathname: string) => {
  const p = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return p.length > 1 ? p.replace(/\/$/, '') : '/';
};

/** Absolute URL for a site-relative path, for canonicals and schema. */
export const absUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Origin that serves game art, with no trailing slash.
 *
 * Empty means "this origin" — the files ship as Pages static assets, which is
 * the default and needs no extra DNS. Set it to an R2 bucket's custom domain
 * (e.g. https://cdn.canitrunpc.com, once it exists and has an edge Cache Rule)
 * to serve the same /art/<slug>-<width>.<ext> paths from R2 instead. Flip it
 * back to '' at any time to fall back to Pages.
 */
export const ART_BASE = '';
