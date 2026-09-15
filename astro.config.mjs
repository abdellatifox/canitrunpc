import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { SITE_URL } from './src/lib/site';
import { seoYear } from './src/lib/year';

/* Google Tag Manager container. The ID is kept out of the repository: it is an
   encrypted variable (GTM_ID) on the Cloudflare Pages production environment and
   is read here during the build. Local and preview builds have no GTM_ID, so
   they ship no tag and never send test traffic. Anything not shaped like a
   container ID is ignored rather than injected into every page. */
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/.test((process.env.GTM_ID ?? '').trim()) ? process.env.GTM_ID.trim() : '';
if (process.env.GTM_ID && !GTM_ID) console.warn('GTM_ID is set but is not a valid container ID; no tag will be added.');

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile'
  }),
  site: SITE_URL,
  trailingSlash: 'never',
  compressHTML: true,

  /* Alias routes.
     These cover the URL shapes people arrive with from competitors and from
     older links. Each is a 301 to the canonical page so the link equity lands
     on one URL instead of being split across near-duplicates. */
  redirects: {
    '/can-i-run': { status: 301, destination: '/can-it-run' },
    '/can-i-run-it': { status: 301, destination: '/can-it-run' },
    '/tier-list-gpu': { status: 301, destination: '/gpu-tier-list' },
    '/tier-list-cpu': { status: 301, destination: '/cpu-tier-list' },
    '/gpu-tier-list-2026': { status: 301, destination: '/gpu-tier-list' },
    '/build': { status: 301, destination: '/build-suggest' },
    '/build-generator': { status: 301, destination: '/build-suggest' },
    '/fps-calculator': { status: 301, destination: '/fps-estimator' },
    '/bottleneck-calculator': { status: 301, destination: '/bottleneck' },
    '/privacy-policy': { status: 301, destination: '/privacy' },
    '/cookie-policy': { status: 301, destination: '/privacy' },
    '/terms-of-service': { status: 301, destination: '/terms' },
    '/game': { status: 301, destination: '/games' },
    '/gpu': { status: 301, destination: '/gpus' },
    '/cpu': { status: 301, destination: '/cpus' },
    '/best-picks': { status: 301, destination: '/game-lists' },
    '/game-list': { status: 301, destination: '/game-lists' },
    // Evergreen entry to the current year's release hub. The year is fixed at
    // build time (see src/lib/year.ts), so this can be a static redirect.
    '/upcoming-games': { status: 301, destination: `/upcoming-games-${seoYear()}` }
  },

  build: {
    /* Prerendered pages as /upcoming-games-2027.html rather than
       /upcoming-games-2027/index.html. With the directory form Cloudflare Pages
       answers the canonical no-slash URL with a 308 to the slash version, so
       every prerendered page's canonical pointed at a redirect. */
    format: 'file',
    /* Every page's CSS is ~9 KB compressed. As two external files it blocked
       first render for a round trip each; inline, it arrives with the HTML. */
    inlineStylesheets: 'always'
  },
  vite: {
    // Computed here, in Node, at build time — see src/lib/year.ts for why.
    define: {
      __SEO_YEAR__: JSON.stringify(seoYear()),
      __CALENDAR_YEAR__: JSON.stringify(new Date().getUTCFullYear()),
      __GTM_ID__: JSON.stringify(GTM_ID)
    },
    ssr: { external: ['node:buffer'] }
  }
});
