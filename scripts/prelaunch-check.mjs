/**
 * Pre-indexing check: everything Google will look at, verified against the
 * live site before it is submitted to Search Console.
 *
 *   node scripts/prelaunch-check.mjs                      # https://canitrunpc.com
 *   node scripts/prelaunch-check.mjs https://canitrunpc.pages.dev
 *   node scripts/prelaunch-check.mjs --report report.json # also write details
 *
 * What it checks
 *   1. robots.txt and the sitemap index: reachable, absolute URLs on the
 *      canonical host, no duplicates.
 *   2. Every URL in every sitemap: 200 without a redirect, HTML, indexable,
 *      canonical pointing at itself, one <h1>, title/description within budget
 *      and unique site-wide, valid JSON-LD, no "1970", no http:// resources.
 *   3. Every internal link found on those pages resolves.
 *   4. Share images named by og:image actually load as images.
 *   5. Unknown URLs return a real 404 (no soft-404s), http -> https, www.
 *   6. The tool APIs answer with real data.
 *   7. Response times and page weight.
 *
 * Server-rendered routes are detected from src/pages. If the Worker is not
 * answering at all (for example the free plan's daily request limit has been
 * reached), those routes are reported once as unavailable instead of as
 * hundreds of individual 404s, and the run is marked incomplete.
 *
 * Request budget: prerendered pages and assets cost no Worker requests. Server
 * routes do, so matchup links discovered on pages are sampled, not all fetched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../src/lib/site.ts';
import { SEO_YEAR } from '../src/lib/year.ts';

const args = process.argv.slice(2);
const reportIdx = args.indexOf('--report');
const REPORT = reportIdx >= 0 ? args.splice(reportIdx, 2)[1] : null;
const BASE = (args[0] || SITE_URL).replace(/\/$/, '');
const CANON = SITE_URL.replace(/\/$/, '');
const ROOT = path.resolve(import.meta.dirname, '..');

const TITLE_MAX = 65;
const DESC_MAX = 165;
const CONCURRENCY = 12;
const SERVER_LINK_SAMPLE = 80;
const SLOW_MS = 1500;
const UA = { 'User-Agent': 'CanItRunPC-prelaunch-check/1.0' };

// ------------------------------------------------------------- reporting

const results = [];            // { section, level: 'pass'|'warn'|'fail'|'skip', msg, detail? }
const add = (section, level, msg, detail) => results.push({ section, level, msg, detail });
const pass = (s, m, d) => add(s, 'pass', m, d);
const warn = (s, m, d) => add(s, 'warn', m, d);
const fail = (s, m, d) => add(s, 'fail', m, d);
const skip = (s, m, d) => add(s, 'skip', m, d);

/** Groups many identical problems into one line with examples. */
function grouped(section, level, label, items, max = 8) {
  if (!items.length) return;
  add(section, level, `${label}: ${items.length}`, items.slice(0, max).join('\n'));
}

// ---------------------------------------------------------------- fetching

const toBase = url => url.startsWith(CANON) ? BASE + url.slice(CANON.length) : url;
const pathOf = url => { try { return new URL(url).pathname; } catch { return url; } };

async function get(url, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: 'manual', headers: UA, ...opts });
    const body = opts.method === 'HEAD' ? '' : await res.text();
    return { url, status: res.status, headers: res.headers, body, ms: Date.now() - t0,
             location: res.headers.get('location') };
  } catch (e) {
    return { url, status: 0, headers: new Headers(), body: '', ms: Date.now() - t0, error: e.message };
  }
}

async function pool(items, fn, n = CONCURRENCY) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// ------------------------------------------------- server-rendered routes

/** Regexes for routes that run in the Worker, read from src/pages. */
function serverRoutes() {
  const dir = path.join(ROOT, 'src', 'pages');
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(astro|ts|js|mjs)$/.test(e.name)) continue;
      if (/export\s+const\s+prerender\s*=\s*true/.test(fs.readFileSync(full, 'utf8'))) continue;
      let route = '/' + path.relative(dir, full).replace(/\\/g, '/').replace(/\.(astro|ts|js|mjs)$/, '');
      route = route.replace(/\/index$/, '') || '/';
      const re = '^' + route.replace(/\[\.\.\.[^\]]+\]/g, '.*').replace(/\[[^\]]+\]/g, '[^/]+') + '$';
      out.push({ route, re: new RegExp(re) });
    }
  };
  walk(dir);
  return out;
}
const SERVER = serverRoutes();
const isServer = p => SERVER.some(r => r.re.test(p.split('?')[0]));

// ------------------------------------------------------------ HTML helpers

const decode = s => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const headOf = html => html.slice(0, Math.max(0, html.indexOf('</head>')) + 7);
const one = (html, re) => (html.match(re) || [])[1];

function inspect(html) {
  const head = headOf(html);
  const body = html.slice(head.length);
  return {
    title: decode(one(head, /<title>([\s\S]*?)<\/title>/)?.trim() ?? ''),
    desc: decode(one(head, /<meta name="description" content="([^"]*)"/) ?? ''),
    canonical: one(head, /<link rel="canonical" href="([^"]*)"/) ?? '',
    robots: one(head, /<meta name="robots" content="([^"]*)"/) ?? '',
    ogImage: one(head, /<meta property="og:image" content="([^"]*)"/) ?? '',
    lang: one(html, /<html[^>]*\slang="([^"]+)"/) ?? '',
    viewport: /<meta name="viewport"/.test(head),
    h1: (body.match(/<h1[\s>]/g) || []).length,
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]),
    insecure: [...html.matchAll(/\s(?:src|href)="(http:\/\/[^"]+)"/g)].map(m => m[1])
      .filter(u => !/^http:\/\/(www\.)?w3\.org/.test(u)),
    // Markup inside <script> (templates a tool fills in at runtime) is not a link a crawler follows.
    links: [...body.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/<a\s[^>]*href="([^"#]+)(?:#[^"]*)?"/g)].map(m => decode(m[1]))
  };
}

// ==================================================================== run

const started = Date.now();
console.log(`Pre-indexing check  ${BASE}  (canonical host ${CANON}, advertised year ${SEO_YEAR})\n`);

// ---- 0. Is the Worker answering? --------------------------------------
const probe = await get(`${BASE}/api/games/search?q=fable`);
let workerUp = probe.status === 200 && /json/.test(probe.headers.get('content-type') || '');
if (workerUp) {
  pass('Server routes', 'Worker is answering (search API returned JSON)');
} else {
  const why = /1046/.test(probe.body) ? 'Cloudflare Error 1046 — daily request limit reached'
    : probe.status === 404 ? '404 from static fallback — the Worker is not being invoked (usually the daily request limit)'
    : `HTTP ${probe.status}`;
  fail('Server routes', `Worker is not answering: ${why}. Server-rendered routes (${SERVER.map(r => r.route).join(', ')}) could not be verified — re-run after the quota resets.`);
}

// ---- 1. robots.txt ------------------------------------------------------
const robots = await get(`${BASE}/robots.txt`);
if (robots.status !== 200) fail('robots.txt', `robots.txt returned ${robots.status}`);
else {
  const sm = [...robots.body.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]);
  sm.includes(`${CANON}/sitemap.xml`) ? pass('robots.txt', `declares ${CANON}/sitemap.xml`)
    : fail('robots.txt', `does not declare ${CANON}/sitemap.xml`, sm.join('\n') || '(no Sitemap line)');
  const disallows = [...robots.body.matchAll(/^disallow:\s*(\S*)/gim)].map(m => m[1]).filter(Boolean);
  if (disallows.includes('/')) fail('robots.txt', 'Disallow: / blocks the whole site');
  else pass('robots.txt', `Disallow rules: ${disallows.join(' ') || 'none'}`);
}

// ---- 2. sitemaps --------------------------------------------------------
const sitemapIndex = await get(`${BASE}/sitemap.xml`);
let sitemapUrls = [];
if (sitemapIndex.status !== 200) {
  fail('Sitemaps', `sitemap.xml returned ${sitemapIndex.status}`);
} else {
  const children = [...sitemapIndex.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const isIndex = /<sitemapindex/.test(sitemapIndex.body);
  const lists = isIndex ? children : [`${CANON}/sitemap.xml`];
  pass('Sitemaps', isIndex ? `sitemap index lists ${children.length} sitemaps` : 'single sitemap');
  const badHost = [];
  for (const child of lists) {
    const r = isIndex ? await get(toBase(child)) : sitemapIndex;
    if (r.status !== 200) {
      if (isServer(pathOf(child)) && !workerUp) skip('Sitemaps', `${pathOf(child)} not checked (server route, Worker down)`);
      else fail('Sitemaps', `${pathOf(child)} returned ${r.status}`);
      continue;
    }
    const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1].trim()));
    locs.filter(u => !u.startsWith(CANON + '/') && u !== CANON).forEach(u => badHost.push(u));
    const lastmods = [...r.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
    const badDates = lastmods.filter(d => !/^\d{4}-\d{2}-\d{2}/.test(d) || Date.parse(d) > Date.now() + 864e5);
    if (badDates.length) warn('Sitemaps', `${pathOf(child)}: ${badDates.length} lastmod values are invalid or in the future`);
    sitemapUrls.push(...locs.map(u => ({ url: u, from: pathOf(child) })));
    pass('Sitemaps', `${pathOf(child)}: ${locs.length} URLs`);
  }
  grouped('Sitemaps', 'fail', 'URLs not on the canonical host', badHost);
  const seen = new Set(), dupes = [];
  for (const { url } of sitemapUrls) (seen.has(url) ? dupes.push(url) : seen.add(url));
  grouped('Sitemaps', 'fail', 'duplicate URLs across sitemaps', dupes);
  if (!dupes.length) pass('Sitemaps', `${seen.size} unique URLs in total`);
  sitemapUrls = [...new Map(sitemapUrls.map(x => [x.url, x])).values()];
}

// ---- 3. every sitemap URL ----------------------------------------------
const pages = sitemapUrls.filter(x => workerUp || !isServer(pathOf(x.url)));
const skippedServer = sitemapUrls.length - pages.length;
if (skippedServer) skip('Pages', `${skippedServer} server-rendered sitemap URLs not checked (Worker down)`);

const fetched = await pool(pages, async x => ({ ...x, res: await get(toBase(x.url)) }));
const issues = {
  status: [], redirect: [], notHtml: [], noindex: [], canonicalMissing: [], canonicalOther: [],
  titleMissing: [], titleLong: [], descMissing: [], descLong: [], h1: [], jsonLd: [], year1970: [],
  insecure: [], lang: [], viewport: [], slow: [], heavy: []
};
const titles = new Map(), descs = new Map();
const internalLinks = new Map();   // path -> first page it was seen on
const ogImages = new Map();
const times = [];

for (const { url, res } of fetched) {
  const p = pathOf(url);
  if (res.status >= 300 && res.status < 400) { issues.redirect.push(`${p} -> ${res.status} ${res.location}`); continue; }
  if (res.status !== 200) { issues.status.push(`${p} -> ${res.status || res.error}`); continue; }
  if (!/text\/html/.test(res.headers.get('content-type') || '')) { issues.notHtml.push(`${p} (${res.headers.get('content-type')})`); continue; }
  times.push(res.ms);
  if (res.ms > SLOW_MS) issues.slow.push(`${p} ${res.ms}ms`);
  if (res.body.length > 1_000_000) issues.heavy.push(`${p} ${(res.body.length / 1e6).toFixed(1)}MB`);

  const h = inspect(res.body);
  if (/noindex/i.test(h.robots)) issues.noindex.push(p);
  if (!h.canonical) issues.canonicalMissing.push(p);
  else if (h.canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) issues.canonicalOther.push(`${p} -> ${h.canonical}`);
  if (!h.title) issues.titleMissing.push(p); else if (h.title.length > TITLE_MAX) issues.titleLong.push(`${p} (${h.title.length}) ${h.title}`);
  if (!h.desc) issues.descMissing.push(p); else if (h.desc.length > DESC_MAX) issues.descLong.push(`${p} (${h.desc.length})`);
  if (h.h1 !== 1) issues.h1.push(`${p} (${h.h1})`);
  for (const block of h.jsonLd) { try { JSON.parse(block); } catch (e) { issues.jsonLd.push(`${p}: ${e.message}`); } }
  if (/\b1970\b/.test(h.title + h.desc)) issues.year1970.push(p);
  if (h.insecure.length) issues.insecure.push(`${p}: ${h.insecure[0]}`);
  if (!h.lang) issues.lang.push(p);
  if (!h.viewport) issues.viewport.push(p);

  (titles.get(h.title) ?? titles.set(h.title, []).get(h.title)).push(p);
  if (h.desc) (descs.get(h.desc) ?? descs.set(h.desc, []).get(h.desc)).push(p);
  if (h.ogImage) ogImages.set(h.ogImage, p);
  for (const href of h.links) {
    let abs;
    try { abs = new URL(href, CANON + p); } catch { continue; }
    if (abs.origin !== CANON && abs.origin !== BASE) continue;
    // Cloudflare's email obfuscation rewrites mailto: links to this path and
    // decodes them in the browser; it is not a page and is never crawlable.
    if (abs.pathname.startsWith('/cdn-cgi/')) continue;
    const key = abs.pathname + abs.search;
    if (!internalLinks.has(key)) internalLinks.set(key, p);
  }
}

const S = 'Pages';
const ok = fetched.length - issues.status.length - issues.redirect.length - issues.notHtml.length;
pass(S, `${ok} of ${fetched.length} sitemap URLs returned 200 HTML`);
grouped(S, 'fail', 'not 200', issues.status);
grouped(S, 'fail', 'redirect instead of 200 (sitemaps must list final URLs)', issues.redirect);
grouped(S, 'fail', 'not HTML', issues.notHtml);
grouped(S, 'fail', 'noindex but listed in a sitemap', issues.noindex);
grouped(S, 'fail', 'missing canonical', issues.canonicalMissing);
grouped(S, 'fail', 'canonical points elsewhere', issues.canonicalOther);
grouped(S, 'fail', 'missing <title>', issues.titleMissing);
grouped(S, 'warn', `title over ${TITLE_MAX} characters`, issues.titleLong);
grouped(S, 'fail', 'missing meta description', issues.descMissing);
grouped(S, 'warn', `description over ${DESC_MAX} characters`, issues.descLong);
grouped(S, 'fail', 'not exactly one <h1>', issues.h1);
grouped(S, 'fail', 'invalid JSON-LD', issues.jsonLd);
grouped(S, 'fail', '"1970" in title or description (clock frozen in the Worker)', issues.year1970);
grouped(S, 'fail', 'http:// resources on an https page', issues.insecure);
grouped(S, 'warn', 'missing <html lang>', issues.lang);
grouped(S, 'fail', 'missing viewport meta', issues.viewport);
grouped(S, 'warn', `slower than ${SLOW_MS}ms`, issues.slow);
grouped(S, 'warn', 'HTML over 1MB', issues.heavy);
const dupTitles = [...titles].filter(([t, ps]) => t && ps.length > 1).map(([t, ps]) => `"${t}" on ${ps.length} pages: ${ps.slice(0, 3).join(', ')}`);
const dupDescs = [...descs].filter(([, ps]) => ps.length > 1).map(([d, ps]) => `${ps.length} pages share: ${ps.slice(0, 3).join(', ')} — "${d.slice(0, 60)}…"`);
grouped(S, 'warn', 'duplicate titles', dupTitles);
grouped(S, 'warn', 'duplicate descriptions', dupDescs);
if (!Object.values(issues).some(a => a.length) && !dupTitles.length && !dupDescs.length) {
  pass(S, 'every checked page: indexable, self-canonical, one h1, title and description in budget and unique, valid JSON-LD');
}
if (times.length) {
  const sorted = [...times].sort((a, b) => a - b);
  const q = f => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
  pass('Performance', `HTML response time: median ${q(0.5)}ms, p95 ${q(0.95)}ms over ${times.length} pages`);
}

// ---- 4. internal links ---------------------------------------------------
const sitemapPaths = new Set(sitemapUrls.map(x => pathOf(x.url)));
const linkTargets = [...internalLinks.keys()].filter(k => !sitemapPaths.has(k.split('?')[0]) || k.includes('?'));
const staticTargets = linkTargets.filter(k => !isServer(k));
const serverTargets = linkTargets.filter(k => isServer(k));
const sampledServer = workerUp
  ? serverTargets.filter((_, i) => i % Math.max(1, Math.ceil(serverTargets.length / SERVER_LINK_SAMPLE)) === 0)
  : [];
const linkRes = await pool([...staticTargets, ...sampledServer], async k => ({ k, res: await get(BASE + k) }));
const broken = [], redirected = [];
for (const { k, res } of linkRes) {
  if (res.status >= 300 && res.status < 400) {
    const target = res.location || '';
    // A redirect that only adds or removes a trailing slash, or is a deliberate
    // alias, is fine; anything landing on an error is not.
    const follow = await get(new URL(target, BASE + k).href);
    if (follow.status !== 200) broken.push(`${k} -> ${res.status} -> ${follow.status} (linked from ${internalLinks.get(k)})`);
    else redirected.push(`${k} -> ${target} (linked from ${internalLinks.get(k)})`);
  } else if (res.status !== 200) {
    broken.push(`${k} -> ${res.status || res.error} (linked from ${internalLinks.get(k)})`);
  }
}
const L = 'Internal links';
pass(L, `${internalLinks.size} unique internal links found; ${linkRes.length} non-sitemap targets fetched`
  + (serverTargets.length ? ` (${sampledServer.length} of ${serverTargets.length} server-rendered sampled)` : ''));
grouped(L, 'fail', 'broken links', broken, 15);
grouped(L, 'warn', 'links that go through a redirect (link to the final URL instead)', redirected);
if (!workerUp && serverTargets.length) skip(L, `${serverTargets.length} links to server-rendered pages not checked (Worker down)`);
if (!broken.length) pass(L, 'no broken internal links among those checked');

// ---- 5. share images ---------------------------------------------------
const imgRes = await pool([...ogImages.keys()], async u => ({ u, res: await get(toBase(u), { method: 'HEAD' }) }), 16);
const badImg = imgRes.filter(({ res }) => res.status !== 200 || !/^image\/(png|jpe?g|webp)/.test(res.headers.get('content-type') || ''))
  .map(({ u, res }) => `${pathOf(u)} -> ${res.status} ${res.headers.get('content-type') || ''} (on ${ogImages.get(u)})`);
grouped('Share images', 'fail', 'og:image missing or not a raster image', badImg);
if (!badImg.length) pass('Share images', `all ${imgRes.length} distinct og:image files load as images`);

// ---- 6. status codes, hosts, redirects --------------------------------
const H = 'HTTP & hosts';
for (const p of ['/this-page-does-not-exist-9f3a', '/game/not-a-real-game-9f3a', '/blog/not-a-real-post-9f3a', '/gpu/not-a-real-card-9f3a']) {
  const r = await get(BASE + p);
  r.status === 404 ? pass(H, `${p} -> 404`) : fail(H, `${p} -> ${r.status} (should be 404; anything else is a soft-404)`);
}
if (BASE === CANON) {
  const http = await get(CANON.replace('https://', 'http://') + '/');
  [301, 308].includes(http.status) && (http.location || '').startsWith('https://')
    ? pass(H, `http -> ${http.status} https`) : fail(H, `http:// is not redirected to https (${http.status})`);
  const wwwHost = CANON.replace('https://', 'https://www.');
  const www = await get(wwwHost + '/');
  if ([301, 308].includes(www.status)) pass(H, `www -> ${www.status} ${www.location}`);
  else if (www.status === 200) {
    const c = inspect(www.body).canonical;
    c.startsWith(CANON) ? warn(H, `www serves 200 instead of redirecting (canonical points to ${CANON}, so it will not be indexed twice — a Redirect Rule is still cleaner)`)
      : fail(H, 'www serves 200 with no canonical to the apex — duplicate site');
  } else warn(H, `www returned ${www.status}`);
  const hsts = (await get(CANON + '/', { method: 'HEAD' })).headers.get('strict-transport-security');
  hsts ? pass(H, `HSTS: ${hsts}`) : warn(H, 'no Strict-Transport-Security header (optional; Cloudflare can add it)');
}
const slash = await get(`${BASE}/game/fable/`);
if ([301, 308].includes(slash.status)) pass(H, `trailing slash /game/fable/ -> ${slash.status} ${slash.location}`);
else if (slash.status === 200) {
  inspect(slash.body).canonical.endsWith('/game/fable') ? pass(H, 'trailing slash serves 200 with the no-slash canonical')
    : warn(H, 'trailing-slash URL serves 200 without a canonical to the clean URL');
} else warn(H, `/game/fable/ returned ${slash.status}`);

// ---- 7. tool APIs -----------------------------------------------------
const T = 'Tools & APIs';
if (!workerUp) {
  skip(T, 'not checked — the Worker is not answering');
} else {
  const json = async (p, body) => {
    const r = await get(BASE + p, body ? { method: 'POST', body: JSON.stringify(body), headers: { ...UA, 'Content-Type': 'application/json' } } : {});
    try { return { r, j: JSON.parse(r.body) }; } catch { return { r, j: null }; }
  };
  const checks = [
    ['GET /api/games/search?q=fable', await json('/api/games/search?q=fable'), j => j?.data?.some(x => /fable/i.test(x.label))],
    ['GET /api/gpus/search?q=4060', await json('/api/gpus/search?q=4060'), j => j?.data?.length > 0],
    ['GET /api/cpus/search?q=5600', await json('/api/cpus/search?q=5600'), j => j?.data?.length > 0],
    ['POST /api/tools/can-it-run', await json('/api/tools/can-it-run', { game: 'cyberpunk-2077', gpu: 'nvidia-geforce-rtx-4060', ram: 16 }), j => typeof j?.verdict === 'string'],
    ['POST /api/tools/fps-estimate', await json('/api/tools/fps-estimate', { game: 'cyberpunk-2077', gpu: 'nvidia-geforce-rtx-4060', cpu: 'amd-ryzen-5-5600', res: '1080p', preset: 'high' }), j => j && !j.error],
    ['POST /api/tools/bottleneck', await json('/api/tools/bottleneck', { cpu: 'amd-ryzen-5-5600', gpu: 'nvidia-geforce-rtx-4060', res: '1080p' }), j => j && !j.error],
    ['POST /api/tools/what-can-my-pc-run', await json('/api/tools/what-can-my-pc-run', { gpu: 'nvidia-geforce-rtx-4060', cpu: 'amd-ryzen-5-5600', ram: 16 }), j => j?.counts],
    ['GET a matchup page', { r: await get(`${BASE}/can-it-run/fable/nvidia-geforce-rtx-4060`), j: null }, (_, r) => r.status === 200],
    ['GET a GPU comparison', { r: await get(`${BASE}/compare-gpu?a=nvidia-geforce-rtx-4060&b=amd-radeon-rx-7600`), j: null }, (_, r) => r.status === 200]
  ];
  for (const [label, { r, j }, test] of checks) {
    test(j, r) ? pass(T, `${label} -> ${r.status} OK (${r.ms}ms)`) : fail(T, `${label} -> ${r.status}`, r.body.slice(0, 200));
  }
}

// ================================================================= summary

const order = ['Server routes', 'robots.txt', 'Sitemaps', 'Pages', 'Internal links', 'Share images', 'HTTP & hosts', 'Tools & APIs', 'Performance'];
const icon = { pass: ' ok ', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' };
for (const section of order) {
  const rows = results.filter(r => r.section === section);
  if (!rows.length) continue;
  console.log(`\n${section}`);
  for (const r of rows) {
    console.log(`  ${icon[r.level]}  ${r.msg}`);
    if (r.detail && r.level !== 'pass') console.log(r.detail.split('\n').map(l => `          ${l}`).join('\n'));
  }
}
const count = lvl => results.filter(r => r.level === lvl).length;
const verdict = count('fail') ? 'NOT READY' : count('skip') ? 'INCOMPLETE' : count('warn') ? 'READY (with warnings)' : 'READY';
console.log(`\n${verdict} — ${count('fail')} fail, ${count('warn')} warn, ${count('skip')} skipped, ${count('pass')} passed  (${((Date.now() - started) / 1000).toFixed(0)}s)`);

if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ base: BASE, date: new Date().toISOString(), verdict, results }, null, 2));
  console.log(`details written to ${REPORT}`);
}
process.exit(count('fail') ? 1 : 0);
