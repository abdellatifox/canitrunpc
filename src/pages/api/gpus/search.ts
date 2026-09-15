export const prerender = false;
import type { APIRoute } from 'astro';
import { getGpus } from '../../../lib/db';
import { rank, JSON_HEADERS, type Suggestion } from '../../../lib/search';

export const GET: APIRoute = async (context) => {
  const q = new URL(context.request.url).searchParams.get('q')?.trim() || '';
  if (q.length < 1) {
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: JSON_HEADERS });
  }

  const gpus = await getGpus(context.locals);

  // Ties break on performance, not release date. Someone typing "rtx 30" wants
  // the 3090 near the top; ranking by year put the newest low-end part first,
  // which reads as a broken suggestion list.
  const hits = rank(gpus, q, g => ({
    text: g.name,
    aliases: g.aliases ?? [],
    popularity: g.score / 100
  }));

  const data: Suggestion[] = hits.map(g => ({
    label: g.name,
    value: g.slug,
    meta: `${g.vram_gb ? `${g.vram_gb}GB · ` : ''}${g.tdp_watts}W · ${g.release_year}`,
    badge: `Tier ${g.tier}`
  }));

  return new Response(JSON.stringify({ data }), { status: 200, headers: JSON_HEADERS });
};
