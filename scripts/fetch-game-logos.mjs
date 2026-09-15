/**
 * Fetches a logo (wordmark) for every game in the catalogue.
 *
 * 472 of 498 games had no artwork at all and fell back to an initials tile.
 * Steam's own header image exists for nearly all of them, but headers are key
 * art — unreviewed, and this project has an absolute rule against shipping
 * imagery we have not checked. Logos are typographic by definition, so they
 * satisfy that rule by construction while still giving every card real art.
 *
 * Resumable: already-resolved games are skipped, so a re-run only fills gaps.
 *
 *   node scripts/fetch-game-logos.mjs [limit]
 */
import fs from 'node:fs';
import path from 'node:path';
import { isExcludedGame } from '../data/excluded-games.mjs';
import { USER_AGENT } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY = process.env.SGDB_API_KEY;
if (!KEY) {
  console.error('Set SGDB_API_KEY before running this script (SteamGridDB API key).');
  process.exit(1);
}
const H = { Authorization: `Bearer ${KEY}`, 'User-Agent': USER_AGENT };

const REQS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game-reqs.json'), 'utf8'));
const ART_PATH = path.join(ROOT, 'src', 'lib', 'game-art.json');
const art = JSON.parse(fs.readFileSync(ART_PATH, 'utf8'));

const LIMIT = parseInt(process.argv[2] || '0', 10) || Infinity;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(url, tries = 0) {
  try {
    const r = await fetch(url, { headers: H });
    if (r.status === 429) {
      if (tries > 4) return null;
      await sleep(4000 * (tries + 1));
      return api(url, tries + 1);
    }
    if (!r.ok) return null;
    const j = await r.json();
    return j?.success ? j.data : null;
  } catch {
    if (tries > 2) return null;
    await sleep(2500);
    return api(url, tries + 1);
  }
}

// Only Steam entries can be resolved by appid; manual ones already have art.
const targets = Object.entries(REQS.bySlug)
  .map(([slug, id]) => ({ slug, appid: id }))
  .filter(g => g.appid > 0 && !art[g.slug]?.logo)
  .slice(0, LIMIT);

console.log(`targets: ${targets.length}`);

let ok = 0, none = 0, failed = 0, i = 0;

for (const { slug, appid } of targets) {
  if (isExcludedGame({ slug, appid })) continue;
  i++;
  const game = await api(`https://www.steamgriddb.com/api/v2/games/steam/${appid}`);
  await sleep(140);

  if (!game?.id) { failed++; continue; }

  const logos = await api(
    `https://www.steamgriddb.com/api/v2/logos/game/${game.id}?nsfw=false&humor=false&types=static`
  );
  await sleep(140);

  const pick = logos && logos.length ? logos[0] : null;
  if (!pick?.url) { none++; continue; }

  const name = REQS.games[String(appid)]?.n ?? slug;
  art[slug] = {
    ...(art[slug] || {}),
    name,
    grid: art[slug]?.grid ?? null,
    gridThumb: art[slug]?.gridThumb ?? null,
    hero: null,
    heroThumb: null,
    logo: pick.url,
    logoThumb: pick.thumb ?? pick.url,
    // Wordmarks only — never a cover we have not reviewed.
    logoOnly: true
  };
  ok++;

  if (i % 40 === 0) {
    fs.writeFileSync(ART_PATH, JSON.stringify(art));
    console.log(`  ${i}/${targets.length} — ${ok} logos, ${none} none, ${failed} unresolved`);
  }
}

fs.writeFileSync(ART_PATH, JSON.stringify(art));
console.log(`\ndone: ${ok} logos added, ${none} had none, ${failed} unresolved`);
console.log(`game-art.json now covers ${Object.keys(art).length} games`);
