/**
 * Compiles the searchable game index the Worker ships with.
 *
 * We deliberately bundle only the most-owned slice rather than the whole
 * ~65k-title index: a Worker has a hard bundle-size budget and a cold start
 * pays for every byte. The bundled slice answers essentially every real query
 * instantly, and /api/games/search falls back to Steam's live store search for
 * the long tail, so no game is unreachable.
 *
 *   node scripts/build-game-index.mjs [bundleSize]
 */
import fs from 'node:fs';
import path from 'node:path';
import { deriveAliases } from '../src/lib/game-aliases.mjs';
import { isExcludedGame } from '../data/excluded-games.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'data', 'steam-index.json');
const REQ = path.join(ROOT, 'data', 'games.requirements.json');
const UPCOMING = path.join(ROOT, 'data', 'upcoming.requirements.json');
const OUT = path.join(ROOT, 'src', 'lib', 'game-index.json');

/*
 * Bundle size is a deliberate trade, measured against the real catalogue:
 *   15,000 ->  392 KB gzipped
 *   30,000 ->  786 KB gzipped   <- chosen
 *   45,000 -> 1171 KB gzipped
 *   76,000 -> 1952 KB gzipped   (whole catalogue)
 *
 * A Worker parses this on every cold start, and titles past ~30,000 by
 * ownership are genuinely obscure. Those still resolve through the live Steam
 * fallback, so nothing is unreachable — it just costs one request the first
 * time anyone looks it up.
 */
const BUNDLE = parseInt(process.argv[2] || '30000', 10);

function slugify(name) {
  return String(name).toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

if (!fs.existsSync(SRC)) {
  // Keep the import in the API valid before the first fetch has run.
  fs.writeFileSync(OUT, JSON.stringify({ games: [], meta: { pending: true } }));
  console.log('no steam-index.json yet — wrote empty placeholder');
  process.exit(0);
}

const index = JSON.parse(fs.readFileSync(SRC, 'utf8'));
/**
 * SteamSpy's cached title can be years out of date — it still calls appid 730
 * "Counter-Strike: Global Offensive" long after Valve renamed it to
 * Counter-Strike 2, which meant searching "cs2" found everything except the
 * actual game. Where we have fetched the app from Steam directly, that name
 * wins.
 */
const reqData = fs.existsSync(REQ)
  ? JSON.parse(fs.readFileSync(REQ, 'utf8')).games || {}
  : {};
const haveReqs = new Set(Object.keys(reqData).map(Number));
const canonicalName = new Map(
  Object.values(reqData).filter(g => g?.appid && g?.name).map(g => [g.appid, g.name])
);
let renamed = 0;

const seenSlug = new Set();
const games = [];
let excludedCount = 0;

/*
 * Unreleased games go first. The index is ordered by SteamSpy ownership, and a
 * game nobody owns yet is not in it at all — so typing "fable" into the
 * checker offered Fable Anniversary and Fabledom but never the Fable that the
 * homepage and /upcoming-games-2027 were sending people to check. Leading the
 * index also gives them top popularity, which is right: they are what people
 * are searching for now. `u` marks them and `d` carries Steam's own date text.
 */
let upcomingCount = 0;
if (fs.existsSync(UPCOMING)) {
  for (const g of Object.values(JSON.parse(fs.readFileSync(UPCOMING, 'utf8')).games || {})) {
    if (!g.comingSoon) continue;
    const name = g.name.trim();
    const slug = g.slug;
    if (!slug || seenSlug.has(slug)) continue;
    if (isExcludedGame({ appid: g.appid, slug, name })) { excludedCount++; continue; }
    seenSlug.add(slug);
    const al = deriveAliases(name);
    games.push({
      a: g.appid,
      n: name,
      s: slug,
      r: 1,                        // always bundled: it has its own page
      u: 1,
      ...(g.releaseDate ? { d: g.releaseDate } : {}),
      ...(al.length ? { x: al } : {})
    });
    upcomingCount++;
  }
}

for (const g of index.slice(0, BUNDLE)) {
  const name = canonicalName.get(g.a) ?? g.n;
  if (name !== g.n) renamed++;
  const slug = slugify(name);
  if (!slug || seenSlug.has(slug)) continue;   // first (most-owned) wins
  if (isExcludedGame({ appid: g.a, slug, name })) { excludedCount++; continue; }
  seenSlug.add(slug);
  const al = deriveAliases(name);
  games.push({
    a: g.a,                        // steam appid
    n: name,                       // name, preferring Steam's current one
    s: slug,
    r: haveReqs.has(g.a) ? 1 : 0,  // do we already hold parsed requirements?
    ...(al.length ? { x: al } : {})// abbreviations people actually type
  });
}

fs.writeFileSync(OUT, JSON.stringify({
  games,
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    bundled: games.length,
    indexTotal: index.length,
    withRequirements: games.filter(g => g.r).length,
    source: 'SteamSpy ownership ranking + Steam store'
  }
}));

const bytes = fs.statSync(OUT).size;
console.log(`bundled ${games.length} of ${index.length} games (${(bytes / 1024).toFixed(0)} KB)`);
console.log(`  with parsed requirements: ${games.filter(g => g.r).length}`);
console.log(`  unreleased (listed first): ${upcomingCount}`);
console.log(`  with abbreviations: ${games.filter(g => g.x).length}`);
console.log(`  renamed from Steam (stale SteamSpy titles): ${renamed}`);
