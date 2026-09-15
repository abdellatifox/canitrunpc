export const prerender = true;
import type { APIRoute } from 'astro';
import { sitemapIndex } from '../lib/sitemap';

/** Sitemap index. Splitting by content type keeps each file well under the
 *  50,000-URL / 50MB limit and lets Search Console report coverage per section,
 *  which is how you find out *which* group of pages is being dropped. */
export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10);
  return sitemapIndex([
    { loc: '/sitemap-static.xml',   lastmod: today },
    { loc: '/sitemap-games.xml',    lastmod: today },
    { loc: '/sitemap-gpus.xml',     lastmod: today },
    { loc: '/sitemap-cpus.xml',     lastmod: today },
    { loc: '/sitemap-blog.xml',     lastmod: today },
    { loc: '/sitemap-matchups.xml', lastmod: today }
  ]);
};
