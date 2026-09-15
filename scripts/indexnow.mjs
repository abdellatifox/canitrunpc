/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver) which URLs exist
 * or changed, so they crawl them without waiting to discover the sitemap.
 * Google does not use IndexNow; it reads the sitemap submitted in Search Console.
 *
 *   node scripts/indexnow.mjs                 # every URL in the live sitemaps
 *   node scripts/indexnow.mjs /game/fable ... # just these paths
 *
 * Run it after a deploy is live. It refuses to submit if the key file is not
 * served, because engines reject (and may distrust) keys they cannot verify.
 */
import { readFileSync } from 'node:fs';

const siteTs = readFileSync(new URL('../src/lib/site.ts', import.meta.url), 'utf8');
const DOMAIN = siteTs.match(/SITE_DOMAIN = '([^']+)'/)[1];
const KEY = siteTs.match(/INDEXNOW_KEY = '([0-9a-f]{8,128})'/)?.[1];
const ORIGIN = `https://${DOMAIN}`;
if (!KEY) { console.error('INDEXNOW_KEY is not set in src/lib/site.ts'); process.exit(1); }

const keyUrl = `${ORIGIN}/${KEY}.txt`;
const served = await fetch(keyUrl).then(r => (r.ok ? r.text() : '')).catch(() => '');
if (served.trim() !== KEY) {
  console.error(`Key file not served correctly at ${keyUrl} — deploy first.`);
  process.exit(1);
}

async function sitemapUrls(url) {
  const xml = await fetch(url).then(r => r.text());
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (/<sitemapindex/.test(xml)) return (await Promise.all(locs.map(sitemapUrls))).flat();
  return locs;
}

const args = process.argv.slice(2);
const urls = args.length
  ? args.map(p => new URL(p, ORIGIN).href)
  : [...new Set(await sitemapUrls(`${ORIGIN}/sitemap.xml`))];

const own = urls.filter(u => new URL(u).host === DOMAIN);
console.log(`Submitting ${own.length} URLs for ${DOMAIN}`);

// The protocol allows up to 10,000 URLs per request.
for (let i = 0; i < own.length; i += 10000) {
  const batch = own.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: DOMAIN, key: KEY, keyLocation: keyUrl, urlList: batch })
  });
  // 200 = accepted, 202 = accepted pending key check; anything else is a problem.
  console.log(`batch ${i / 10000 + 1}: ${res.status} ${res.statusText} ${await res.text().catch(() => '')}`.trim());
  if (![200, 202].includes(res.status)) process.exitCode = 1;
}
