# CanItRunPC

canitrunpc.com — can my PC run it? Publisher-stated requirements checked
against your parts, with 2027 releases, FPS, bottleneck and hardware tools.
Benchmarked against pcgamecheck.com, which it is built to outrank.

Forked from RunsOnMyPC on 2026-09-15 (fresh git history, no remote, no
Cloudflare ids, no tokens or API keys carried over), with a new identity, a new
light "spec sheet" design and its own original articles.

- `PLAN.md` — Semrush keyword map and the week-by-week content schedule.
- `DECISIONS.md` — rules that do not change (data, images, exclusions).
- `DOMAINS.md` — how the domain was chosen.
- `DATA.md` — the data pipeline.

## Deploy

Push to `main`. Cloudflare Pages builds and deploys it (project `canitrunpc`,
Git-connected to the private repo github.com/abdellatifox/canitrunpc, on the
Abdellatifsite1 account). There is no manual deploy step. Until the domain is
bought the site lives at https://canitrunpc.pages.dev, which sends
`X-Robots-Tag: noindex` so search engines wait for canitrunpc.com.

Everything else on Cloudflare goes through `npm run cf -- <wrangler args>`,
which reads `.cloudflare/token.txt` and `.cloudflare/account.txt` (both
git-ignored).

Anything else on Cloudflare goes through `npm run cf -- <wrangler args>`, which
reads the API token from `.cloudflare/token.txt` (git-ignored) so it can never
reach another account. See the comment in `scripts/cf.mjs` for token setup.

After a deploy, check production with:

```bash
npm run seo:audit -- https://canitrunpc.com
```

## Run it

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build
```

## Design

All colours, fonts and radii are tokens at the top of `src/styles/global.css`.
Pages use the tokens (`var(--accent)`, `rgb(var(--accent-rgb) / .1)`), never literals.

## SEO

- `src/lib/year.ts` owns every year label. `SEO_YEAR` rolls to the next year
  from September (`ROLLOVER_MONTH`), so titles never advertise a past year.
  Prerendered pages bake it in at build time — the monthly refresh rebuilds.
- `src/lib/seo.ts` fits titles (65) and descriptions (165) so a long game or
  part name drops a clause instead of being cut off in the results.
- `npm run seo:audit` checks one URL per template and each title format against
  the longest name in the data. Keep it at 0 problems.
- Unreleased games: `data/upcoming-games.mjs` lists them by appid,
  `npm run data:upcoming` fetches each one's Steam listing, and
  `/upcoming-games-<year>` is generated per year from that data. Placeholder
  requirement text ("TBD", "Coming Soon", Steam's 64-bit boilerplate) is
  stripped, and a game with nothing measurable says so rather than showing a
  guessed spec.

## Before submitting to search engines

```bash
npm run check:prelaunch
```

Crawls the live site like a search engine: robots.txt, every sitemap URL,
every internal link, share images, 404s, http/www, the tool APIs. It must end
`READY` (warnings allowed). If it reports the Worker is not answering, the
daily Functions quota is spent — re-run after 00:00 UTC.

After a deploy that adds or changes many pages:

```bash
npm run indexnow
```

Notifies Bing, Yandex and the other IndexNow engines of every sitemap URL. The
key is `INDEXNOW_KEY` in `src/lib/site.ts`, served as `public/<key>.txt`.

Manual steps the token cannot do:
1. Cloudflare dashboard → canitrunpc.com → Rules → Redirect Rules → template
   "Redirect from WWW to root". Until then an inline script in BaseLayout sends
   www visitors to the apex, and canonicals point there.
2. Cloudflare dashboard → Email → Email Routing → forward `hello@canitrunpc.com`
   to a real inbox. The zone has no MX records, so mail to that address bounces.
3. Google Search Console → Add property → URL prefix `https://canitrunpc.com/`
   → HTML tag → paste the content value into `GOOGLE_SITE_VERIFICATION` in
   `src/lib/site.ts`, deploy, verify, then submit `/sitemap.xml`.
4. Bing Webmaster Tools → import from Search Console (or set
   `BING_SITE_VERIFICATION` the same way).

## Blog

Articles are generated, not written by hand: `scripts/build-blog.mjs` computes
every figure from `data/upcoming.requirements.json` and the hardware index, and
writes `src/lib/blog-posts.json`. `npm run data:blog` rebuilds the articles and
their covers; `data:build` does it as part of the monthly refresh, so an article
never quotes a spec the data no longer holds. Anticipation claims come from
`data/upcoming-games.mjs`, each with the source that says it.

## Identity

Domain, brand, contact address and fetcher User-Agent live only in
`src/lib/site.ts`. Never type them anywhere else.

## Status

| Phase | State |
|---|---|
| 00 Decisions | done — DECISIONS.md |
| 01 Domain | canitrunpc.com chosen by the owner 2026-09-15 (RDAP free, no Wayback history), **not bought yet** |
| 02 Keywords | done — Semrush US, PLAN.md |
| 2027 coverage | 54 unreleased titles tracked, 21 with published requirements |
| 04 Repo | github.com/abdellatifox/canitrunpc (private), push to main deploys |
| 05 Cloudflare | done 2026-09-15: Pages (Git-connected), D1 canitrunpc-db, KV tools + session; custom domain waits on the purchase |
| 07 Design | done — light spec-sheet tokens, new homepage copy; tool-page copy still RunsOnMyPC wording |
| 08 Brand assets | done — brand/icon.svg, brand/logo.svg, logo-on-dark.svg; favicons, covers and 477 game share cards rebuilt |
| Content | batch 1: 9 original articles (PLAN.md §1) |

Known leftovers: `migrations/0002–0004` and `src/lib/fallback-data.json` are
old PCGameFit seed data; the live pages read the Steam-derived JSON instead.
New upcoming games (ARK 2, Atomic Heart 2, Gears of War: E-Day, Phantom Blade
Zero) show initials tiles until `SGDB_API_KEY` is set in `.env` and
`scripts/fetch-game-logos.mjs` is run.
