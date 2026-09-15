import { SITE_URL } from '../lib/site';
export const prerender = true;
import type { APIRoute } from 'astro';
export const GET: APIRoute = () => {
  const body = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# API routes return JSON, not pages — no value in the index.
Disallow: /api/

# Filtered/sorted views duplicate the canonical listing pages.
Disallow: /*?q=
Disallow: /*&q=

# Comparison tools are indexable with both parts chosen; a half-filled
# form is the same empty page over and over.
Allow: /compare-gpu$
Allow: /compare-cpu$

# Bandwidth-heavy crawlers that return nothing.
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
