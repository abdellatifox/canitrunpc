import { SITE_URL, USER_AGENT } from '../../../lib/site';
export const prerender = false;
import type { APIRoute } from 'astro';
import gameIndex from '../../../lib/game-index.json';
import { staticGames } from '../../../lib/db';
import { rank, JSON_HEADERS, type Suggestion } from '../../../lib/search';
import { isExcludedGame } from '../../../../data/excluded-games.mjs';

interface IndexRow { a: number; n: string; s: string; r: number; x?: string[]; u?: 1; d?: string }
const INDEX = (gameIndex as { games: IndexRow[] }).games ?? [];

/**
 * Live Steam store search, used when the bundled index has little or nothing
 * for a query. This is what makes obscure titles reachable without shipping a
 * 65,000-row index into the Worker.
 */
async function steamSearch(q: string): Promise<Suggestion[]> {
  try {
    const r = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`,
      { headers: { 'User-Agent': USER_AGENT } }
    );
    if (!r.ok) return [];
    const j: any = await r.json();
    return (j.items ?? [])
      .filter((it: any) => it?.type === 'app' && it?.name && it?.platforms?.windows !== false)
      .filter((it: any) => !isExcludedGame({ appid: it.id, name: it.name }))
      .slice(0, 8)
      .map((it: any) => ({
        label: it.name,
        value: `steam:${it.id}`,
        meta: 'From Steam',
        badge: 'Live'
      }));
  } catch {
    return [];
  }
}

export const GET: APIRoute = async (context) => {
  const q = new URL(context.request.url).searchParams.get('q')?.trim() || '';
  if (q.length < 2) {
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: JSON_HEADERS });
  }

  // The bundled index is ordered by ownership, so earlier rows are more popular.
  //
  // Popularity is scaled logarithmically rather than linearly. With a linear
  // scale the values bunch up near 1 as the index grows, so the gap between a
  // hugely popular title and a niche one shrinks every time we bundle more
  // games — growing the index from 15k to 30k was enough to push GWENT above
  // The Witcher 3 for the query "witcher". A log scale keeps the top ranks
  // clearly separated whatever the index size.
  const total = INDEX.length || 1;
  const denom = Math.log1p(total);
  let hits = rank(
    INDEX.map((g, i) => ({ ...g, pos: i })),
    q,
    g => ({ text: g.n, aliases: g.x ?? [], popularity: 1 - Math.log1p(g.pos) / denom }),
    10,
    220   // titles are noisy; ownership is the strongest disambiguator we have
  );

  // Only 478 of the index's 29,465 rows have bundled requirements (`r`); the
  // rest have a real slug in the index for search/display purposes, but that
  // slug is never in game-reqs.json's bySlug map, so submitting it resolved to
  // nothing and every one of those games — the large majority — showed
  // "we could not find published PC requirements" even though Steam has them.
  // Point unbundled titles at their real appid instead, so the same live-fetch
  // path used for titles found via Steam's own search also fires for these.
  const data: Suggestion[] = hits.map(g => ({
    label: g.n,
    value: g.r ? g.s : `steam:${g.a}`,
    // An unreleased game says so in the list, so nobody picks it thinking it is out.
    meta: g.u
      ? (g.d && /\d{4}/.test(g.d) ? `Unreleased · due ${g.d}` : 'Unreleased · date not announced')
      : g.r ? 'Requirements on file' : 'Requirements fetched on open',
    badge: g.u ? 'Upcoming' : undefined
  }));

  // Fall back to Steam when we have thin local coverage (or none bundled yet).
  if (data.length < 4) {
    const live = await steamSearch(q);
    const seen = new Set(data.map(d => d.label.toLowerCase()));
    for (const s of live) {
      if (data.length >= 10) break;
      if (seen.has(s.label.toLowerCase())) continue;
      data.push(s);
    }
  }

  // Last resort: the legacy seed set, so the field is never dead.
  if (data.length === 0) {
    const legacy = rank(staticGames(), q, g => ({ text: g.name }), 8);
    for (const g of legacy) data.push({ label: g.name, value: g.slug });
  }

  const clean = data.filter(d => !isExcludedGame({ name: d.label, slug: d.value }));
  return new Response(JSON.stringify({ data: clean }), { status: 200, headers: JSON_HEADERS });
};
