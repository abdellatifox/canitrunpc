export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod } from '../lib/sitemap';
import { getGames } from '../lib/db';

export const GET: APIRoute = async (context) => {
  const games = await getGames(context.locals);
  const today = toLastmod();
  return urlset(games.map(g => ({
    loc: `/game/${g.slug}`,
    lastmod: today,
    changefreq: 'weekly' as const,
    priority: 0.8
  })));
};
