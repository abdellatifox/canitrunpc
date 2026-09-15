/**
 * Builds the autocomplete index: every game SteamSpy knows about, ordered by
 * ownership so the suggestion list ranks by real popularity rather than
 * alphabetically.
 *
 * Output: data/steam-index.json  ->  [{ a: appid, n: name, o: ownersBucket }]
 *
 * SteamSpy's `request=all` is paged 1000 at a time and rate-limited to roughly
 * one call per minute, so this is deliberately slow. Run it in the background.
 */
import fs from 'node:fs';
import path from 'node:path';
import { USER_AGENT } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'steam-index.json');
const UA = { 'User-Agent': USER_AGENT };

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** "10,000,000 .. 20,000,000" -> 15000000 (midpoint, for ranking only) */
function ownersMid(s) {
  if (!s) return 0;
  const nums = String(s).match(/[\d,]+/g);
  if (!nums) return 0;
  const v = nums.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(Number.isFinite);
  if (!v.length) return 0;
  return v.length > 1 ? Math.round((v[0] + v[1]) / 2) : v[0];
}

async function getPage(page, attempt = 0) {
  try {
    const r = await fetch(`https://steamspy.com/api.php?request=all&page=${page}`, { headers: UA });
    if (r.status === 429) {
      if (attempt > 5) return null;
      console.log(`  page ${page}: 429, backing off 65s`);
      await sleep(65000);
      return getPage(page, attempt + 1);
    }
    if (!r.ok) return null;
    const j = await r.json();
    return j && typeof j === 'object' ? j : null;
  } catch (e) {
    if (attempt > 3) return null;
    await sleep(5000);
    return getPage(page, attempt + 1);
  }
}

const seen = new Map();
const MAX_PAGES = 80;

/**
 * Write after every page rather than only at the end.
 *
 * The requirements fetcher reads this file, and SteamSpy's ~1 call/minute limit
 * means a full crawl takes over an hour. Flushing as we go lets the next stage
 * start on the most-owned few thousand titles within a couple of minutes
 * instead of waiting for the tail, and means an interrupted run still leaves
 * something usable on disk.
 */
function flush() {
  const list = [...seen.values()].sort((a, b) => b.o - a.o);
  fs.writeFileSync(OUT, JSON.stringify(list));
  return list.length;
}

// Resume from a previous run instead of re-fetching what we already hold.
if (fs.existsSync(OUT)) {
  try {
    for (const g of JSON.parse(fs.readFileSync(OUT, 'utf8'))) seen.set(g.a, g);
    console.log(`resuming with ${seen.size} games already on disk`);
  } catch { /* start clean if the file is unreadable */ }
}

for (let p = 0; p < MAX_PAGES; p++) {
  const data = await getPage(p);
  if (!data) { console.log(`page ${p}: no data -> stopping`); break; }

  const rows = Object.values(data);
  if (!rows.length) { console.log(`page ${p}: empty -> stopping`); break; }

  let added = 0;
  for (const g of rows) {
    if (!g?.appid || !g?.name) continue;
    const name = String(g.name).trim();
    if (!name) continue;
    if (seen.has(g.appid)) continue;
    seen.set(g.appid, { a: g.appid, n: name, o: ownersMid(g.owners) });
    added++;
  }

  const written = flush();
  console.log(`page ${p}: +${added} (total ${written}) [written]`);
  if (rows.length < 1000) { console.log('short page -> end of list'); break; }

  await sleep(62000); // respect the ~1/min limit on request=all
}

const total = flush();
console.log(`
wrote ${total} games -> ${OUT}`);
