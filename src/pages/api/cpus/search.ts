export const prerender = false;
import type { APIRoute } from 'astro';
import { getCpus } from '../../../lib/db';
import { rank, JSON_HEADERS, type Suggestion } from '../../../lib/search';

export const GET: APIRoute = async (context) => {
  const q = new URL(context.request.url).searchParams.get('q')?.trim() || '';
  if (q.length < 1) {
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: JSON_HEADERS });
  }

  const cpus = await getCpus(context.locals);
  // Ties break on performance so a partial model shows the stronger parts first.
  const hits = rank(cpus, q, c => ({
    text: c.name,
    aliases: c.aliases ?? [],
    popularity: c.score / 100
  }));

  const data: Suggestion[] = hits.map(c => ({
    label: c.name,
    value: c.slug,
    meta: `${c.cores}C/${c.threads}T · ${c.boost_ghz}GHz · ${c.release_year}`,
    badge: `Tier ${c.tier}`
  }));

  return new Response(JSON.stringify({ data }), { status: 200, headers: JSON_HEADERS });
};
