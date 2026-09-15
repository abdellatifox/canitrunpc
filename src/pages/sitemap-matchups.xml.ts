export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod, type UrlEntry } from '../lib/sitemap';
import { getGames, getGpus } from '../lib/db';

/**
 * "Can <game> run on <gpu>" matchup pages.
 *
 * The full cross product is games × GPUs, which for the current catalogue is
 * ~3,800 near-identical pages. Submitting all of them invites a thin-content
 * assessment and burns crawl budget that the game and GPU pages need more.
 *
 * So we submit a deliberate subset: the most demanding, most searched games
 * against the cards people actually own. The remaining combinations still
 * resolve and are still crawlable via on-page links — they just are not
 * pushed at Google as priority URLs.
 */
const MAX_UPCOMING = 12;
const MAX_GAMES = 18;
const MAX_GPUS = 24;

export const GET: APIRoute = async (context) => {
  const [games, gpus] = await Promise.all([
    getGames(context.locals),
    getGpus(context.locals)
  ]);

  /* Unreleased games first. "Can a 4060 run <game due next February>" is asked
     constantly and answered by almost nobody, because the game is not out — but
     its publisher has already stated what it needs, so we can answer it. */
  const upcoming = games
    .filter(g => g.upcoming && g.requirements_published && g.rec_gpu_score != null)
    .slice(0, MAX_UPCOMING);

  // Then the demanding released games, which are the ones people check most.
  const demanding = games
    .filter(g => !g.upcoming && g.rec_gpu_score != null)
    .sort((a, b) => b.rec_gpu_score! - a.rec_gpu_score!)
    .slice(0, MAX_GAMES);

  const topGames = [...upcoming, ...demanding];

  // Skip the very top of the stack: nobody searches whether a 5090 runs a game.
  const topGpus = [...gpus]
    .filter(g => g.score <= 92)
    .slice(0, MAX_GPUS);

  const today = toLastmod();
  const entries: UrlEntry[] = [];

  for (const game of topGames) {
    for (const gpu of topGpus) {
      entries.push({
        loc: `/can-it-run/${game.slug}/${gpu.slug}`,
        lastmod: today,
        changefreq: 'monthly',
        priority: 0.5
      });
    }
  }

  return urlset(entries);
};
