export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod, type UrlEntry } from '../lib/sitemap';
import { TOOLS, GAME_LISTS } from '../lib/site-data';
import { upcomingGames } from '../lib/games';
import { SEO_YEAR } from '../lib/year';

export const GET: APIRoute = () => {
  const today = toLastmod();

  const core: UrlEntry[] = [
    { loc: '/',                   priority: 1.0, changefreq: 'daily',   lastmod: today },
    { loc: '/games',              priority: 0.9, changefreq: 'daily',   lastmod: today },
    { loc: '/tools',              priority: 0.9, changefreq: 'weekly',  lastmod: today },
    { loc: '/gpus',               priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/cpus',               priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/benchmarks',         priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/game-lists',         priority: 0.8, changefreq: 'weekly',  lastmod: today },
    { loc: '/blog',               priority: 0.8, changefreq: 'weekly',  lastmod: today }
  ];

  const tools: UrlEntry[] = TOOLS.map(t => ({
    loc: t.href, priority: 0.9, changefreq: 'weekly' as const, lastmod: today
  }));

  const lists: UrlEntry[] = GAME_LISTS.map(l => ({
    loc: `/game-list/${l.slug}`, priority: 0.7, changefreq: 'weekly' as const, lastmod: today
  }));

  /* Year hubs for unreleased games. Generated from the data so a year appears
     the moment a game is dated into it, and /upcoming-games itself is left out
     because it only redirects here. */
  const years = new Set<number>([SEO_YEAR]);
  for (const g of upcomingGames()) if (g.release_year) years.add(g.release_year);
  const upcoming: UrlEntry[] = [...years].sort().map(y => ({
    loc: `/upcoming-games-${y}`, priority: 0.9, changefreq: 'daily' as const, lastmod: today
  }));

  const info: UrlEntry[] = [
    { loc: '/about',               priority: 0.5, changefreq: 'monthly', lastmod: today },
    { loc: '/contact',             priority: 0.4, changefreq: 'yearly',  lastmod: today },
    { loc: '/editorial-standards', priority: 0.5, changefreq: 'yearly',  lastmod: today },
    { loc: '/privacy',             priority: 0.3, changefreq: 'yearly',  lastmod: today },
    { loc: '/terms',               priority: 0.3, changefreq: 'yearly',  lastmod: today }
  ];

  // De-duplicate: TOOLS already contains several of the core tool routes.
  const seen = new Set<string>();
  const all = [...core, ...upcoming, ...tools, ...lists, ...info].filter(e => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });

  return urlset(all);
};
