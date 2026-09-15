export const prerender = true;
import type { APIRoute } from 'astro';
import { urlset, toLastmod } from '../lib/sitemap';
import { getPosts } from '../lib/db';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts(context.locals);
  return urlset(posts.map(p => ({
    loc: `/blog/${p.slug}`,
    lastmod: toLastmod(p.published_at),
    changefreq: 'monthly' as const,
    priority: 0.7
  })));
};
