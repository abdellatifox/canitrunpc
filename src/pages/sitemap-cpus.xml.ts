export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod } from '../lib/sitemap';
import { getCpus } from '../lib/db';

export const GET: APIRoute = async (context) => {
  const cpus = await getCpus(context.locals);
  const today = toLastmod();
  return urlset(cpus.map(c => ({
    loc: `/cpu/${c.slug}`,
    lastmod: today,
    changefreq: 'monthly' as const,
    priority: 0.7
  })));
};
