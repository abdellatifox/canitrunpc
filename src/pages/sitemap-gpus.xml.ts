export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod } from '../lib/sitemap';
import { getGpus } from '../lib/db';

export const GET: APIRoute = async (context) => {
  const gpus = await getGpus(context.locals);
  const today = toLastmod();
  return urlset(gpus.map(g => ({
    loc: `/gpu/${g.slug}`,
    lastmod: today,
    changefreq: 'monthly' as const,
    priority: 0.7
  })));
};
