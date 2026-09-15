/**
 * Builds the CanItRunPC blog from the site's own data.
 *
 * Every figure in these articles is computed at build time from three files:
 *   - data/upcoming.requirements.json  publishers' Steam listings, unreleased games
 *   - src/lib/game-reqs.json           publishers' Steam listings, released games
 *   - src/lib/hardware-data.json       the curated GPU/CPU performance index
 * Nothing numeric is typed in by hand, so `npm run data:refresh` moves the
 * articles along with the data instead of leaving them quietly out of date.
 *
 * The prose is hand-written per article, and where a sentence depends on the
 * data pointing one way ("the Ti is faster", "the cheaper card is better
 * value") the article asserts it first. If the data ever flips, the build
 * stops with a message instead of publishing a sentence that is now false.
 *
 * Keyword targets come from Semrush (US database, September 2026) and are
 * listed next to each article in PLAN.md. Each article answers one search
 * intent that no tool page on the site targets, so they do not cannibalise
 * /compare-gpu, /gpu/<slug>, /game/<slug> or /upcoming-games-<year>.
 *
 *   node scripts/build-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { SEO_YEAR } from '../src/lib/year.ts';
import { SITE_NAME } from '../src/lib/site.ts';
import { UPCOMING_GAMES, UPCOMING_APPIDS } from '../data/upcoming-games.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src', 'lib', 'blog-posts.json');

const UPCOMING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'upcoming.requirements.json'), 'utf8'));
const BUNDLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game-reqs.json'), 'utf8'));
const HW = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'hardware-data.json'), 'utf8'));

/** First publication dates are fixed; only the "updated" date follows the data. */
const PUBLISHED = {
  'rtx-5070-vs-rtx-5070-ti': '2026-09-15',
  'rtx-5080-vs-rtx-5090': '2026-09-15',
  'rtx-4090-vs-rtx-5090': '2026-09-15',
  'rx-9070-xt-vs-rtx-5070-ti': '2026-09-15',
  'rtx-5060-vs-rtx-4060': '2026-09-15',
  'is-8gb-vram-enough': '2026-09-15',
  'pc-game-system-requirements-2027': '2026-09-15',
  'graphics-card-for-2027-games': '2026-09-15',
  '16gb-vs-32gb-ram-for-gaming': '2026-09-15'
};

// --------------------------------------------------------------- helpers

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const list = items => items.length <= 1 ? (items[0] ?? '')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const median = nums => {
  const s = [...nums].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
const table = (head, rows, cls = 'data-table') => `<div class="table-scroll"><table class="${cls}">
<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>`;
const readTime = html => Math.max(3, Math.ceil(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 220));
const longDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Stop the build when the data no longer supports a sentence. */
function expect(cond, msg) {
  if (!cond) {
    console.error(`build-blog: ${msg}\nThe article text assumes otherwise — rewrite it before publishing.`);
    process.exit(1);
  }
}

// ------------------------------------------------------------------ data

const BUZZ = new Map(UPCOMING_GAMES.filter(g => g.buzz).map(g => [g.appid, g.buzz]));
const dataDate = Object.values(UPCOMING.games).map(g => g.fetchedAt).filter(Boolean).sort().pop()
  ?? new Date().toISOString().slice(0, 10);

/* Unreleased games that still have a page: shipped or excluded titles drop out
   of the bundle, and an article must never link to a 404. */
const upcoming = Object.values(UPCOMING.games)
  .filter(g => g.comingSoon && BUNDLE.bySlug[g.slug] === g.appid)
  .map(g => {
    const min = g.minimum, rec = g.recommended;
    const rawText = JSON.stringify([min?.raw, rec?.raw]);
    const os = (min?.raw?.os || rec?.raw?.os || '').replace(/®/g, '');
    return {
      name: g.name.trim().replace(/[™®]/g, ''),
      slug: g.slug,
      date: g.releaseDate,
      year: g.expectedYear,
      dated: /\d{4}/.test(g.releaseDate || ''),
      hasReqs: g.hasRequirements,
      buzz: BUZZ.get(g.appid) ?? null,
      minGpu: min?.gpu ?? null,            // { name, perf, vramGb } of the named card
      recGpu: rec?.gpu ?? null,
      minGpuText: min?.raw?.gpu ?? null,
      recGpuText: rec?.raw?.gpu ?? null,
      minVram: min?.vramGb ?? null,        // only a VRAM figure the publisher wrote down
      recVram: rec?.vramGb ?? null,
      minRam: min?.ramGb ?? null,
      recRam: rec?.ramGb ?? null,
      storage: min?.storageGb ?? rec?.storageGb ?? null,
      ssd: /\bssd\b/i.test(rawText),
      os,
      win11Only: /\b11\b/.test(os) && !/\b10\b/.test(os)
    };
  });
const upWithReqs = upcoming.filter(g => g.hasReqs);
const upThisYear = upcoming.filter(g => g.year === SEO_YEAR);

/* Released games in the bundle (everything that is not an upcoming title). */
const released = Object.values(BUNDLE.games).filter(g => !UPCOMING_APPIDS.has(g.a));
const releasedRec = released.filter(g => g.rec?.gpu?.p != null);
const recentYear = SEO_YEAR - 3;

const gameLink = g => a(`/game/${g.slug}`, g.name);
const due = g => g.dated ? esc(g.date) : 'Not announced';

const desktopGpus = HW.gpus.filter(g => !/laptop|mobile|max-q/i.test(g.name));
const gpuByName = new Map(desktopGpus.map(g => [g.name, g]));
const gpu = name => {
  const g = gpuByName.get(name);
  expect(g, `"${name}" is not in the hardware index`);
  return g;
};

/** Does a card match or beat a requirement? null when the requirement names no card. */
function meets(card, need, statedVram) {
  if (!need || need.perf == null) return null;
  if (card.perf < need.perf) return false;
  if (statedVram && card.vram_gb < statedVram) return false;
  return true;
}
const meetsReleased = (card, g) => card.perf >= g.rec.gpu.p && (g.rec.vram == null || card.vram_gb >= g.rec.vram);

const sources = `<h2>How these numbers were worked out</h2>
<p>Requirements are the publishers' own, read from each game's Steam store page (last checked ${longDate(dataDate)}). Entries such as "TBD" or "Coming soon" count as not published, never as a spec. Graphics cards are compared on the relative performance index explained in our ${a('/editorial-standards', 'editorial standards')}, where a card "meets" a requirement when it scores at least as high as the card the publisher named and has any VRAM amount the publisher stated. This article is rebuilt whenever that data is refreshed.</p>`;

// ===================================================== GPU head-to-heads

/**
 * One comparison article. `A` is always the cheaper or older card, `B` the
 * other; `write` receives the computed context and returns the prose.
 */
function pairArticle({ slug, a: nameA, b: nameB, short, title, excerpt, write }) {
  const A = gpu(nameA), B = gpu(nameB);
  const [sa, sb] = short;
  const faster = B.perf >= A.perf ? B : A;
  const slower = faster === A ? B : A;
  const gap = Math.round((faster.perf / slower.perf - 1) * 100);
  const perDollar = c => c.msrp_usd ? (c.perf / c.msrp_usd) * 100 : null;
  const perWatt = c => c.tdp_watts ? (c.perf / c.tdp_watts) * 100 : null;

  const relA = releasedRec.filter(g => meetsReleased(A, g)).length;
  const relB = releasedRec.filter(g => meetsReleased(B, g)).length;
  const recentRec = releasedRec.filter(g => g.y >= recentYear);
  const recentA = recentRec.filter(g => meetsReleased(A, g)).length;
  const recentB = recentRec.filter(g => meetsReleased(B, g)).length;

  const upRec = upWithReqs.filter(g => g.recGpu);
  const upA = upRec.filter(g => meets(A, g.recGpu, g.recVram)).length;
  const upB = upRec.filter(g => meets(B, g.recGpu, g.recVram)).length;
  const onlyFaster = upRec.filter(g => meets(faster, g.recGpu, g.recVram) && !meets(slower, g.recGpu, g.recVram));

  const upscalers = c => [c.supports_dlss && 'DLSS', c.supports_fsr && 'FSR', c.supports_xess && 'XeSS'].filter(Boolean).join(', ') || 'None listed';
  const fmt1 = n => n == null ? '—' : n.toFixed(1);

  const specRows = [
    ['Performance index', String(A.perf), String(B.perf)],
    ['Relative speed', A === slower ? '100%' : `${100 + gap}%`, B === slower ? '100%' : `${100 + gap}%`],
    ['Video memory', `${A.vram_gb}GB`, `${B.vram_gb}GB`],
    ['Board power', `${A.tdp_watts}W`, `${B.tdp_watts}W`],
    ['Launch price (MSRP)', A.msrp_usd ? `$${A.msrp_usd}` : '—', B.msrp_usd ? `$${B.msrp_usd}` : '—'],
    ['Index points per $100', fmt1(perDollar(A)), fmt1(perDollar(B))],
    ['Index points per 100W', fmt1(perWatt(A)), fmt1(perWatt(B))],
    ['Released', String(A.release_year), String(B.release_year)],
    ['Upscaling support', upscalers(A), upscalers(B)],
    [`Recommended specs met, ${recentYear}+ games`, `${recentA} of ${recentRec.length}`, `${recentB} of ${recentRec.length}`],
    [`Recommended specs met, upcoming games`, `${upA} of ${upRec.length}`, `${upB} of ${upRec.length}`]
  ].map(([k, x, y]) => [esc(k), x, y]);

  const ctx = {
    A, B, sa, sb, faster, slower, gap,
    priceGap: (A.msrp_usd && B.msrp_usd) ? Math.abs(B.msrp_usd - A.msrp_usd) : null,
    powerGap: Math.abs(B.tdp_watts - A.tdp_watts),
    perDollar, perWatt, fmt1,
    relA, relB, relTotal: releasedRec.length,
    recentA, recentB, recentTotal: recentRec.length,
    upA, upB, upTotal: upRec.length, onlyFaster,
    link: c => a(`/gpu/${c.slug}`, c.name)
  };
  const body = write(ctx);

  const content = `
${body.intro}

<h2>${esc(sa)} vs ${esc(sb)}: the specs side by side</h2>
${table(['', sa, sb], specRows, 'data-table keep-table')}
<p>"Recommended specs met" counts the games whose recommended graphics card each GPU matches or beats. It covers the ${plural(recentRec.length, 'game')} from ${recentYear} onward in our catalogue that name a recommended card, and the ${upRec.length} unreleased games whose publishers have posted one.</p>

${body.sections}

<h2>Verdict</h2>
${body.verdict}

<p>Want a different pairing? Put any two cards in the ${a(`/compare-gpu?a=${A.slug}&b=${B.slug}`, 'GPU comparison tool')}, see both on the ${a('/gpu-tier-list', `GPU tier list for ${SEO_YEAR}`)}, or estimate frame rates for a specific game with the ${a('/fps-estimator', 'FPS calculator')}.</p>

${sources}
<p>Prices are launch MSRPs in US dollars, not today's street prices, which we do not track.</p>`;

  return { slug, title, excerpt: excerpt(ctx), category: 'hardware', content };
}

const ARTICLES = [];

// ------------------------------------------------ RTX 5070 vs RTX 5070 Ti
ARTICLES.push(() => pairArticle({
  slug: 'rtx-5070-vs-rtx-5070-ti',
  a: 'NVIDIA GeForce RTX 5070', b: 'NVIDIA GeForce RTX 5070 Ti',
  short: ['RTX 5070', 'RTX 5070 Ti'],
  title: `RTX 5070 vs RTX 5070 Ti: Is the Ti Worth It in ${SEO_YEAR}?`,
  excerpt: c => `The RTX 5070 Ti is ${c.gap}% faster and has 16GB of VRAM instead of 12GB, for $${c.priceGap} more at launch. Which one makes sense for ${SEO_YEAR} games.`,
  write: c => {
    expect(c.faster === c.B, 'RTX 5070 Ti no longer leads the RTX 5070');
    expect(c.A.vram_gb < c.B.vram_gb, 'RTX 5070 no longer has less VRAM than the Ti');
    const cheaperBetterValue = c.perDollar(c.A) > c.perDollar(c.B);
    const bigVram = upWithReqs.filter(g => (g.recVram ?? 0) > c.A.vram_gb || (g.recGpu?.vramGb ?? 0) > c.A.vram_gb);
    return {
      intro: `<p><strong>The RTX 5070 Ti is ${c.gap}% faster than the RTX 5070 on our performance index, and it has 16GB of video memory where the 5070 has 12GB.</strong> The Ti launched at $${c.B.msrp_usd}, which is $${c.priceGap} above the 5070's $${c.A.msrp_usd}.</p>
<p>Both cards come from the same RTX 50 generation with the same feature set, so the choice comes down to three things: how much the extra speed is worth to you, whether 12GB will be enough for the games you plan to play, and how long you intend to keep the card.</p>`,
      sections: `<h2>Speed: how big is the gap?</h2>
<p>A ${c.gap}% lead on the index is roughly the difference between a game holding a steady frame rate and dipping below it at the same settings. The more useful test is what each card clears. Among ${c.recentTotal} recent games that name a recommended card, the RTX 5070 meets ${c.recentA} and the Ti meets ${c.recentB}. For unreleased games the count is ${c.upA} against ${c.upB} out of ${c.upTotal}.</p>
<p>${c.onlyFaster.length
  ? `Only the Ti clears the recommended card for ${list(c.onlyFaster.map(gameLink))}.`
  : `No upcoming game with published requirements separates them yet: whenever one of the two clears a recommended spec, the other does too. At recommended settings, the RTX 5070 is enough for every published ${SEO_YEAR} spec so far.`}</p>

<h2>12GB or 16GB of VRAM?</h2>
<p>This is the Ti's clearest advantage. ${bigVram.length
  ? `${list(bigVram.map(gameLink))} already ${bigVram.length === 1 ? 'asks' : 'ask'} for more than 12GB at the recommended tier, by naming a card with more memory or by stating the figure outright.`
  : `No upcoming game we track asks for more than 12GB of video memory at its recommended tier yet, whether by naming a card with more memory or by stating a figure.`} Recommended specs are usually written with 1080p or 1440p in mind, though. Higher resolutions, ultra textures and path tracing fill memory well beyond what a requirement table suggests, and a card cannot be upgraded later. See ${a('/blog/is-8gb-vram-enough', `how much VRAM ${SEO_YEAR} games actually ask for`)}.</p>

<h2>Value and power</h2>
<p>At launch prices, the RTX 5070 delivers ${c.fmt1(c.perDollar(c.A))} index points per $100 and the Ti delivers ${c.fmt1(c.perDollar(c.B))}, so ${cheaperBetterValue ? 'the cheaper card gives more performance for each dollar' : 'the Ti gives more performance for each dollar despite its higher price'}. The Ti's board power is ${c.powerGap}W higher (${c.B.tdp_watts}W against ${c.A.tdp_watts}W). Check your power supply with the ${a('/psu-calculator', 'PSU calculator')} before you switch.</p>`,
      verdict: `<ul>
<li><strong>Buy the ${c.link(c.A)}</strong> if price per frame matters most${cheaperBetterValue ? ', since it returns more performance per dollar' : ''}, and you play at 1080p or 1440p without maxed-out texture packs.</li>
<li><strong>Buy the ${c.link(c.B)}</strong> if you want to keep the card for years. The 16GB buffer and the ${c.gap}% extra speed are the two things that age best.</li>
</ul>`
    };
  }
}));

// ------------------------------------------------ RTX 5080 vs RTX 5090
ARTICLES.push(() => pairArticle({
  slug: 'rtx-5080-vs-rtx-5090',
  a: 'NVIDIA GeForce RTX 5080', b: 'NVIDIA GeForce RTX 5090',
  short: ['RTX 5080', 'RTX 5090'],
  title: 'RTX 5080 vs RTX 5090: How Much Faster Is the 5090?',
  excerpt: c => `The RTX 5090 is ${c.gap}% faster than the RTX 5080 with twice the VRAM, but it costs $${c.priceGap} more and draws ${c.powerGap}W extra. What that buys you.`,
  write: c => {
    expect(c.faster === c.B, 'RTX 5090 no longer leads the RTX 5080');
    expect(c.upA === c.upTotal, 'RTX 5080 no longer meets every upcoming recommended spec');
    return {
      intro: `<p><strong>The RTX 5090 is ${c.gap}% faster than the RTX 5080 on our performance index and doubles its video memory, from ${c.A.vram_gb}GB to ${c.B.vram_gb}GB.</strong> It also doubles the price: $${c.B.msrp_usd} at launch against $${c.A.msrp_usd}.</p>
<p>The spec sheet makes the 5090 look like the obvious winner. The real question is whether any game you will play in ${SEO_YEAR} needs it, and here the published requirements give a clear answer.</p>`,
      sections: `<h2>Does any game need an RTX 5090?</h2>
<p>Not yet. The RTX 5080 already meets the recommended graphics card of all ${c.upTotal} unreleased games that have posted one, and ${c.recentA} of the ${c.recentTotal} recent games that name a recommended card. Every extra frame the 5090 delivers goes beyond what publishers ask for. That is why it matters most for 4K at high refresh rates, heavy path tracing and creative work that fills 32GB of memory.</p>

<h2>What the extra $${c.priceGap} buys</h2>
<p>Measured per dollar, the RTX 5080 returns ${c.fmt1(c.perDollar(c.A))} index points per $100 and the 5090 returns ${c.fmt1(c.perDollar(c.B))}. The step up is ${c.gap}% more performance for ${Math.round((c.B.msrp_usd / c.A.msrp_usd - 1) * 100)}% more money, which is typical of flagship pricing.</p>

<h2>Power and heat</h2>
<p>The 5090 is rated at ${c.B.tdp_watts}W of board power, ${c.powerGap}W more than the 5080's ${c.A.tdp_watts}W. That often means a new power supply, and it always means more heat in the case. Run your parts through the ${a('/psu-calculator', 'PSU calculator')} before you buy.</p>`,
      verdict: `<ul>
<li><strong>Buy the ${c.link(c.A)}</strong> for gaming. It meets every published recommended spec for upcoming games and delivers more performance per dollar.</li>
<li><strong>Buy the ${c.link(c.B)}</strong> if you play at 4K with path tracing, want the most headroom money can buy, or need ${c.B.vram_gb}GB of memory for work as well as play.</li>
</ul>`
    };
  }
}));

// ------------------------------------------------ RTX 4090 vs RTX 5090
ARTICLES.push(() => pairArticle({
  slug: 'rtx-4090-vs-rtx-5090',
  a: 'NVIDIA GeForce RTX 4090', b: 'NVIDIA GeForce RTX 5090',
  short: ['RTX 4090', 'RTX 5090'],
  title: 'RTX 4090 vs RTX 5090: Is Upgrading Worth It?',
  excerpt: c => `The RTX 5090 is ${c.gap}% faster than the RTX 4090 and adds ${c.B.vram_gb - c.A.vram_gb}GB of VRAM. Whether a 4090 owner gains anything in ${SEO_YEAR} games.`,
  write: c => {
    expect(c.faster === c.B, 'RTX 5090 no longer leads the RTX 4090');
    expect(c.upA === c.upTotal, 'RTX 4090 no longer meets every upcoming recommended spec');
    return {
      intro: `<p><strong>The RTX 5090 is ${c.gap}% faster than the RTX 4090 on our performance index and has ${c.B.vram_gb}GB of video memory against ${c.A.vram_gb}GB.</strong> Their launch prices were $${c.B.msrp_usd} and $${c.A.msrp_usd}.</p>
<p>Most people asking this question already own a 4090 and want to know whether the newer card is worth the switch. For most games the answer is no.</p>`,
      sections: `<h2>The RTX 4090 still clears everything</h2>
<p>The RTX 4090 meets the recommended graphics card of all ${c.upTotal} unreleased games whose publishers have posted one, and ${c.recentA} of the ${c.recentTotal} recent games that name a recommended card. No published requirement for ${SEO_YEAR} comes close to it. An upgrade buys headroom above what games ask for, not the ability to run them.</p>

<h2>What is new on the RTX 5090</h2>
<p>Beyond the ${c.gap}% speed gain and the extra memory, the 5090 belongs to the RTX 50 generation. That matters for one feature: DLSS 4's Multi Frame Generation, which inserts several generated frames per rendered frame, runs only on RTX 50-series cards. The 4090 keeps DLSS upscaling and single frame generation. If a high-refresh 4K monitor is the goal, that feature is the strongest argument for the switch.</p>

<h2>Power</h2>
<p>The 5090 is rated at ${c.B.tdp_watts}W, ${c.powerGap}W above the 4090's ${c.A.tdp_watts}W. A power supply that was comfortable for a 4090 may be marginal for a 5090, so check with the ${a('/psu-calculator', 'PSU calculator')}.</p>`,
      verdict: `<ul>
<li><strong>Keep the ${c.link(c.A)}</strong> if you play at 1440p or 4K at ordinary refresh rates. Nothing announced for ${SEO_YEAR} asks for more.</li>
<li><strong>Upgrade to the ${c.link(c.B)}</strong> if you want Multi Frame Generation for a very high-refresh 4K display, or need ${c.B.vram_gb}GB of memory for AI or 3D work.</li>
</ul>`
    };
  }
}));

// ------------------------------------------------ RX 9070 XT vs RTX 5070 Ti
ARTICLES.push(() => pairArticle({
  slug: 'rx-9070-xt-vs-rtx-5070-ti',
  a: 'AMD Radeon RX 9070 XT', b: 'NVIDIA GeForce RTX 5070 Ti',
  short: ['RX 9070 XT', 'RTX 5070 Ti'],
  title: `RX 9070 XT vs RTX 5070 Ti: Which to Buy in ${SEO_YEAR}?`,
  excerpt: c => `The RX 9070 XT and RTX 5070 Ti are ${c.gap <= 3 ? 'within a few percent' : `${c.gap}% apart`} on our index, both with 16GB, but launched $${c.priceGap} apart. How to choose.`,
  write: c => {
    expect(c.gap <= 5, 'RX 9070 XT and RTX 5070 Ti are no longer close on the index');
    expect(c.A.msrp_usd < c.B.msrp_usd, 'RX 9070 XT no longer launched cheaper');
    expect(c.A.vram_gb === c.B.vram_gb, 'the two cards no longer share a VRAM size');
    return {
      intro: `<p><strong>On raw performance the RX 9070 XT and the RTX 5070 Ti are practically tied: ${c.A.perf} against ${c.B.perf} on our index${c.gap ? `, a ${c.gap}% gap` : ''}.</strong> Both have ${c.A.vram_gb}GB of video memory. The AMD card launched at $${c.A.msrp_usd}, which was $${c.priceGap} less than NVIDIA's $${c.B.msrp_usd}.</p>
<p>When two cards are this close, the choice comes down to price, upscaling technology and power draw rather than frame rates.</p>`,
      sections: `<h2>Game requirements: a draw</h2>
<p>Among ${c.recentTotal} recent games that name a recommended card, the RX 9070 XT meets ${c.recentA} and the RTX 5070 Ti meets ${c.recentB}. For unreleased games with published specs, the count is ${c.upA} against ${c.upB} out of ${c.upTotal}. With the same ${c.A.vram_gb}GB buffer, neither card has a memory advantage to grow into.</p>

<h2>Price per frame</h2>
<p>At launch prices, the RX 9070 XT gives ${c.fmt1(c.perDollar(c.A))} index points per $100 and the RTX 5070 Ti gives ${c.fmt1(c.perDollar(c.B))}. The AMD card delivers ${Math.round((c.perDollar(c.A) / c.perDollar(c.B) - 1) * 100)}% more performance for each dollar, which is the single biggest difference between them.</p>

<h2>DLSS or FSR</h2>
<p>The RTX 5070 Ti supports NVIDIA's DLSS, which more games have adopted, including Multi Frame Generation on RTX 50 cards. The RX 9070 XT uses AMD's FSR. FSR 4, AMD's machine-learning upscaler, is limited to Radeon RX 9000 cards like this one, and game support is still catching up with DLSS. If a game you care about only offers DLSS, that settles it. Compare what each card gets on the ${a('/dlss-fsr', 'DLSS vs FSR page')}.</p>

<h2>Power</h2>
<p>Board power is close: ${c.A.tdp_watts}W for the RX 9070 XT and ${c.B.tdp_watts}W for the RTX 5070 Ti. Either card fits the same power supply.</p>`,
      verdict: `<ul>
<li><strong>Buy the ${c.link(c.A)}</strong> if price decides. It matches the Ti in the games that matter for less money.</li>
<li><strong>Buy the ${c.link(c.B)}</strong> if you want DLSS and Multi Frame Generation, or the games you play favour NVIDIA's feature set.</li>
</ul>`
    };
  }
}));

// ------------------------------------------------ RTX 5060 vs RTX 4060
ARTICLES.push(() => pairArticle({
  slug: 'rtx-5060-vs-rtx-4060',
  a: 'NVIDIA GeForce RTX 4060', b: 'NVIDIA GeForce RTX 5060',
  short: ['RTX 4060', 'RTX 5060'],
  title: 'RTX 5060 vs RTX 4060: Same Price, How Much Faster?',
  excerpt: c => `Both launched at $${c.B.msrp_usd} with 8GB of VRAM, but the RTX 5060 is ${c.gap}% faster on our index. What changed, and whether the 8GB limit matters in ${SEO_YEAR}.`,
  write: c => {
    expect(c.faster === c.B, 'RTX 5060 no longer leads the RTX 4060');
    expect(c.A.msrp_usd === c.B.msrp_usd, 'the two cards no longer share a launch price');
    const eightNeed = upWithReqs.filter(g => (g.recVram ?? 0) > 8 || (g.recGpu?.vramGb ?? 0) > 8);
    return {
      intro: `<p><strong>The RTX 5060 is ${c.gap}% faster than the RTX 4060 on our performance index, and it launched at the same $${c.B.msrp_usd}.</strong> Both cards have ${c.A.vram_gb}GB of video memory, and the newer card is rated ${c.powerGap}W higher (${c.B.tdp_watts}W against ${c.A.tdp_watts}W).</p>
<p>If you are buying new, the 5060 is the better card at that price. If you already own a 4060, the gap is too small to justify replacing it.</p>`,
      sections: `<h2>What each card clears</h2>
<p>Among ${c.recentTotal} recent games that name a recommended card, the RTX 4060 meets ${c.recentA} and the RTX 5060 meets ${c.recentB}. For unreleased games with published specs, it is ${c.upA} against ${c.upB} of ${c.upTotal}. ${c.onlyFaster.length ? `Only the 5060 clears the recommended card for ${list(c.onlyFaster.map(gameLink))}.` : 'No upcoming game separates them at the recommended tier yet.'}</p>

<h2>The 8GB question</h2>
<p>Speed is not what limits these cards; memory is. ${eightNeed.length
  ? `${list(eightNeed.map(gameLink))} already ${eightNeed.length === 1 ? 'recommends' : 'recommend'} more than 8GB, and neither card can be upgraded.`
  : `No upcoming game we track recommends more than 8GB yet.`} Expect to lower texture quality in the heaviest games at 1440p on either card. The full picture is in ${a('/blog/is-8gb-vram-enough', `is 8GB of VRAM enough in ${SEO_YEAR}`)}.</p>

<h2>Features</h2>
<p>Both support DLSS upscaling and frame generation. Only the RTX 5060, as an RTX 50-series card, supports DLSS 4's Multi Frame Generation, which helps most in games that already run at a playable base frame rate.</p>`,
      verdict: `<ul>
<li><strong>Buying new:</strong> the ${c.link(c.B)}. It is faster for the same launch price.</li>
<li><strong>Already own an ${c.link(c.A)}:</strong> keep it. A ${c.gap}% gain with the same 8GB is not a meaningful upgrade. Look at a card with 12GB or more instead, using the ${a('/upgrade-advisor', 'upgrade advisor')}.</li>
</ul>`
    };
  }
}));

// ============================================================ VRAM guide

ARTICLES.push(() => {
  const slug = 'is-8gb-vram-enough';
  const rel = releasedRec.filter(g => g.rec.gpu.v != null && g.rec.gpu.v > 0);
  const relRecent = rel.filter(g => g.y >= recentYear);
  const over8Recent = relRecent.filter(g => g.rec.gpu.v > 8 || (g.rec.vram ?? 0) > 8);
  const upRec = upWithReqs.filter(g => g.recGpu?.vramGb != null || g.recVram != null);
  const upOver8 = upRec.filter(g => (g.recGpu?.vramGb ?? 0) > 8 || (g.recVram ?? 0) > 8);
  const upMinOver8 = upWithReqs.filter(g => (g.minGpu?.vramGb ?? 0) > 8 || (g.minVram ?? 0) > 8);
  const eightGbNew = desktopGpus.filter(g => g.vram_gb === 8 && g.release_year >= SEO_YEAR - 2)
    .sort((x, y) => y.perf - x.perf);

  expect(upRec.length >= 5, 'too few upcoming games state a recommended VRAM or card');
  const share = pct(upOver8.length, upRec.length);
  const majority = share >= 50;

  const buckets = {};
  for (const g of upRec) {
    const v = Math.max(g.recGpu?.vramGb ?? 0, g.recVram ?? 0);
    (buckets[v] ||= []).push(g);
  }
  const rows = Object.entries(buckets).sort((x, y) => Number(y[0]) - Number(x[0]))
    .map(([gb, gs]) => [`${gb}GB`, String(gs.length), gs.map(gameLink).join(', ')]);

  const content = `
<p><strong>8GB of VRAM is still enough to meet the recommended requirements of ${upRec.length - upOver8.length} of the ${upRec.length} upcoming PC games whose publishers have named a card or a memory figure${majority ? ', but that is now the minority' : ''}.</strong> ${upOver8.length
  ? `The ${upOver8.length} that ask for more (${share}%) are the ones to watch: ${list(upOver8.map(gameLink))}.`
  : 'None of them asks for more yet.'} ${upMinOver8.length
  ? `${list(upMinOver8.map(gameLink))} ${upMinOver8.length === 1 ? 'goes' : 'go'} further and ${upMinOver8.length === 1 ? 'needs' : 'need'} more than 8GB just to meet the minimum.`
  : 'No upcoming game needs more than 8GB to meet its minimum spec.'}</p>
<p>So the short answer is yes for most games at 1080p, and "only with compromises" for the heaviest new releases at higher resolutions. The rest of this page shows where that line sits, game by game.</p>

<h2>What upcoming games ask for</h2>
<p>For each game, this is the larger of two figures: the memory on the recommended card the publisher named, or a VRAM amount the publisher wrote down.</p>
${table(['Recommended VRAM', 'Games', 'Which'], rows)}

<h2>What recent released games ask for</h2>
<p>Of the ${relRecent.length} games from ${recentYear} onward in our catalogue that name a recommended card with a known memory size, ${over8Recent.length} (${pct(over8Recent.length, relRecent.length)}%) point to more than 8GB. Across the whole catalogue it is ${rel.filter(g => g.rec.gpu.v > 8 || (g.rec.vram ?? 0) > 8).length} of ${rel.length}. Requirement tables lag behind what games actually use: a publisher writes a recommended spec for 1080p or 1440p at high settings, not for 4K with the highest texture pack.</p>

<h2>When 8GB runs out</h2>
<ul>
<li><strong>Resolution.</strong> 1440p and 4K use far more memory than 1080p for the same game.</li>
<li><strong>Texture quality.</strong> The top texture setting is usually the biggest single consumer of VRAM, and dropping it one step is often enough to fit in 8GB.</li>
<li><strong>Ray tracing and frame generation.</strong> Both add memory overhead on top of the base game.</li>
</ul>
<p>When a game runs out of video memory, the result is stutter and blurry, late-loading textures rather than a lower average frame rate. That makes the problem easy to miss in a benchmark chart and hard to ignore in play.</p>

<h2>Still buying an 8GB card?</h2>
<p>New 8GB cards are still on sale. The fastest recent ones in our index are ${list(eightGbNew.slice(0, 4).map(g => a(`/gpu/${g.slug}`, g.name)))}. They are fine for 1080p. If you plan to keep a card through ${SEO_YEAR} and beyond, or play at 1440p, 12GB is the safer floor. Compare the options on the ${a('/gpu-tier-list', `GPU tier list`)}, or see how the ${a('/blog/rtx-5060-vs-rtx-4060', 'RTX 5060 and RTX 4060')} and the ${a('/blog/rtx-5070-vs-rtx-5070-ti', 'RTX 5070 and 5070 Ti')} compare.</p>

${sources}`;

  return {
    slug,
    title: `Is 8GB of VRAM Enough for Gaming in ${SEO_YEAR}?`,
    excerpt: `8GB meets the recommended spec of ${upRec.length - upOver8.length} of ${upRec.length} upcoming PC games that state one. Which games need more, and when 8GB starts to hold you back.`,
    category: 'guides',
    content
  };
});

// ============================================== every published 2027 spec

ARTICLES.push(() => {
  const slug = 'pc-game-system-requirements-2027';
  const namedMin = upWithReqs.filter(g => g.minGpu).sort((x, y) => y.minGpu.perf - x.minGpu.perf);
  const namedRec = upWithReqs.filter(g => g.recGpu);
  expect(namedMin.length >= 5, 'too few upcoming games name a minimum GPU');
  const hardest = namedMin[0], lightest = namedMin[namedMin.length - 1];
  const hardestRec = [...namedRec].sort((x, y) => y.recGpu.perf - x.recGpu.perf)[0];
  const midMin = namedMin[Math.floor((namedMin.length - 1) / 2)];

  const recRams = upWithReqs.map(g => g.recRam).filter(v => v != null);
  const rec16plus = recRams.filter(v => v >= 16).length;
  const stated = upWithReqs.filter(g => g.storage != null);
  const ssd = upWithReqs.filter(g => g.ssd);
  const win11 = upWithReqs.filter(g => g.win11Only);

  const rows = [...namedMin, ...upWithReqs.filter(g => !g.minGpu)].map(g => [
    gameLink(g), due(g),
    esc(g.minGpu?.name ?? 'Not stated'),
    esc(g.recGpu?.name ?? 'Not stated'),
    g.recRam != null ? `${g.recRam}GB` : 'Not stated',
    g.storage != null ? `${g.storage}GB` : 'Not stated'
  ]);

  const content = `
<p><strong>${plural(upWithReqs.length, 'upcoming PC game')} ${upWithReqs.length === 1 ? 'has' : 'have'} already published system requirements on Steam, out of the ${upcoming.length} unreleased games we follow.</strong> The typical minimum sits around ${esc(midMin.minGpu.name)} class, ${rec16plus} of the ${recRams.length} recommended specs that state memory ask for 16GB or more, and install sizes run from ${Math.min(...stated.map(g => g.storage))}GB to ${Math.max(...stated.map(g => g.storage))}GB.</p>
<p>The table lists every one of them, with the card names matched to our hardware index so they can be compared. Each game's page keeps the publisher's exact wording.</p>

<h2>All published requirements</h2>
<p>Sorted by how demanding the minimum graphics card is, heaviest first.</p>
${table(['Game', 'Release', 'Minimum GPU', 'Recommended GPU', 'Rec. RAM', 'Storage'], rows)}

<h2>The heaviest and the lightest</h2>
<p>${gameLink(hardest)} sets the highest floor: its minimum is the ${esc(hardest.minGpu.name)}. ${gameLink(hardestRec)} has the most demanding recommended card, the ${esc(hardestRec.recGpu.name)}. At the other end, ${gameLink(lightest)} starts at the ${esc(lightest.minGpu.name)}, a card most gaming PCs from the last decade will beat.</p>

<h2>Memory, storage and Windows</h2>
<ul>
<li><strong>RAM:</strong> 16GB is the standard recommended figure. ${list(upWithReqs.filter(g => (g.recRam ?? 0) >= 32).map(gameLink)) || 'No game'} ${upWithReqs.filter(g => (g.recRam ?? 0) >= 32).length === 1 ? 'recommends' : 'recommend'} 32GB. More in ${a('/blog/16gb-vs-32gb-ram-for-gaming', '16GB vs 32GB RAM for gaming')}.</li>
<li><strong>Storage:</strong> the median install is ${median(stated.map(g => g.storage))}GB. ${ssd.length ? `${list(ssd.map(gameLink))} name an SSD.` : 'None names an SSD yet.'}</li>
<li><strong>Windows:</strong> ${win11.length ? `${list(win11.map(gameLink))} list Windows 11 only. Every other game that names a version still accepts Windows 10.` : 'every game that names a version still accepts Windows 10.'}</li>
</ul>

<h2>Games still waiting on specs</h2>
<p>${upcoming.length - upWithReqs.length} of the games we follow have a Steam page but no requirements yet, including ${list(upcoming.filter(g => !g.hasReqs).slice(0, 5).map(gameLink))}. Their pages say so and update when the publisher posts. The full calendar is on ${a(`/upcoming-games-${SEO_YEAR}`, `upcoming PC games ${SEO_YEAR}`)}.</p>

<h2>Check your PC against them</h2>
<p>Open any game above and the ${a('/can-it-run', 'can I run it checker')} compares your graphics card, processor and memory with its specs. To see which card clears the most of them, read ${a('/blog/graphics-card-for-2027-games', `what graphics card ${SEO_YEAR} games need`)}.</p>

${sources}`;

  return {
    slug,
    title: `${SEO_YEAR} PC Game System Requirements, Side by Side`,
    excerpt: `${upWithReqs.length} upcoming PC games have posted system requirements. Minimum and recommended GPU, RAM and storage for each, in one table, sourced from Steam.`,
    category: 'guides',
    content
  };
});

// ====================================================== GPU for 2027 games

ARTICLES.push(() => {
  const slug = 'graphics-card-for-2027-games';
  const minGames = upWithReqs.filter(g => g.minGpu);
  const recGames = upWithReqs.filter(g => g.recGpu);
  const score = card => ({
    card,
    min: minGames.filter(g => meets(card, g.minGpu, g.minVram)).length,
    rec: recGames.filter(g => meets(card, g.recGpu, g.recVram)).length
  });
  const priced = desktopGpus.filter(g => g.msrp_usd && g.release_year >= SEO_YEAR - 3).map(score);
  const cheapest = pred => priced.filter(pred).sort((x, y) => x.card.msrp_usd - y.card.msrp_usd || y.card.perf - x.card.perf)[0] ?? null;

  const allRec = cheapest(s => s.rec === recGames.length);
  const allMin = cheapest(s => s.min === minGames.length);
  const mostRecUnder = cap => priced.filter(s => s.card.msrp_usd <= cap)
    .sort((x, y) => y.rec - x.rec || x.card.msrp_usd - y.card.msrp_usd)[0] ?? null;
  const b300 = mostRecUnder(300), b450 = mostRecUnder(450), b650 = mostRecUnder(650);
  expect(allRec && b300 && b450 && b650, 'a budget tier has no qualifying card');
  const minOutlier = [...minGames].sort((x, y) => y.minGpu.perf - x.minGpu.perf)[0];
  const allButOutlier = cheapest(s => minGames.filter(g => g !== minOutlier).every(g => meets(s.card, g.minGpu, g.minVram)));
  expect(allButOutlier, 'no card meets every minimum except the outlier');

  const tier = (label, s) => [esc(label), a(`/gpu/${s.card.slug}`, s.card.name), `$${s.card.msrp_usd}`,
    `${s.min}/${minGames.length}`, `${s.rec}/${recGames.length}`];

  const content = `
<p><strong>To meet the recommended graphics card of every upcoming PC game that has published one, the lowest-priced card from the last three years is the ${a(`/gpu/${allRec.card.slug}`, allRec.card.name)}, at $${allRec.card.msrp_usd} at launch.</strong> You do not need that much to play most of them. The ${a(`/gpu/${b300.card.slug}`, b300.card.name)} ($${b300.card.msrp_usd}) already meets ${b300.min} of ${minGames.length} minimum specs and ${b300.rec} of ${recGames.length} recommended ones.</p>
<p>${minOutlier && allMin && allMin.card === allRec.card
    ? `One game pulls the bar for minimums up on its own: ${gameLink(minOutlier)} names the ${esc(minOutlier.minGpu.name)} as its <em>minimum</em>. Leave it out and the ${a(`/gpu/${allButOutlier.card.slug}`, allButOutlier.card.name)} ($${allButOutlier.card.msrp_usd}) meets every other minimum.`
    : allMin ? `The cheapest recent card that meets every minimum spec is the ${a(`/gpu/${allMin.card.slug}`, allMin.card.name)} ($${allMin.card.msrp_usd}).` : ''} Rather than guessing what ${SEO_YEAR} games will demand, this page uses what publishers have actually posted: ${minGames.length} minimum and ${recGames.length} recommended graphics cards named on Steam.</p>

<h2>The best card at each budget</h2>
<p>For each launch-price ceiling, the recent card that meets the most recommended specs (ties go to the cheaper card).</p>
${table(['Budget', 'Card', 'Launch MSRP', 'Minimum specs met', 'Recommended specs met'], [
    tier('Up to $300', b300), tier('Up to $450', b450), tier('Up to $650', b650), tier('Every recommended spec', allRec)
  ])}

<h2>How to read "specs met"</h2>
<p>A card meets a requirement when it scores at least as high as the card the publisher named on our performance index and has any VRAM amount the publisher stated. Meeting the recommended spec means the card is in the class the developer had in mind. It is not a promise of a particular frame rate, because publishers rarely say which resolution or settings they tested. For a frame-rate estimate, use the ${a('/fps-estimator', 'FPS calculator')}.</p>

<h2>Where the bar is highest</h2>
<p>${(() => {
    const top = [...recGames].sort((x, y) => y.recGpu.perf - x.recGpu.perf).slice(0, 3);
    return `The most demanding recommended cards belong to ${list(top.map(g => `${gameLink(g)} (${esc(g.recGpu.name)})`))}. Those three decide which card clears everything.`;
  })()}</p>

<h2>Before you buy</h2>
<p>Check that your processor will not hold the new card back with the ${a('/bottleneck', 'bottleneck calculator')}, and that your power supply can carry it with the ${a('/psu-calculator', 'PSU calculator')}. Close calls between popular cards are covered in ${a('/blog/rtx-5070-vs-rtx-5070-ti', 'RTX 5070 vs 5070 Ti')} and ${a('/blog/rx-9070-xt-vs-rtx-5070-ti', 'RX 9070 XT vs RTX 5070 Ti')}.</p>

${sources}
<p>Launch MSRP is the manufacturer's price at release in US dollars, not today's price.</p>`;

  return {
    slug,
    title: `What Graphics Card Do ${SEO_YEAR} PC Games Need?`,
    excerpt: `The cheapest recent card that meets every published recommended GPU for upcoming PC games, and the best pick at $300, $450 and $650, measured against Steam specs.`,
    category: 'hardware',
    content
  };
});

// ================================================== 16GB vs 32GB of RAM

ARTICLES.push(() => {
  const slug = '16gb-vs-32gb-ram-for-gaming';
  const upRam = upWithReqs.filter(g => g.recRam != null);
  const up32 = upRam.filter(g => g.recRam >= 32);
  const upMin16 = upWithReqs.filter(g => (g.minRam ?? 0) >= 16);
  const relRam = released.filter(g => g.rec?.ram != null);
  const relRecent = relRam.filter(g => g.y >= recentYear);
  const rel32 = relRecent.filter(g => g.rec.ram >= 32);
  const rel16 = relRecent.filter(g => g.rec.ram === 16);
  expect(upRam.length >= 5, 'too few upcoming games state recommended RAM');
  expect(up32.length < upRam.length / 2, '32GB is now the majority recommendation; rewrite the verdict');

  const buckets = {};
  for (const g of upRam) (buckets[g.recRam] ||= []).push(g);
  const rows = Object.entries(buckets).sort((x, y) => Number(y[0]) - Number(x[0]))
    .map(([gb, gs]) => [`${gb}GB`, String(gs.length), gs.map(gameLink).join(', ')]);

  const content = `
<p><strong>16GB of RAM is still enough for gaming: it meets the recommended memory of ${upRam.length - up32.length} of the ${upRam.length} upcoming PC games that state one.</strong> ${up32.length
  ? `The exceptions are ${list(up32.map(gameLink))}, which recommend 32GB.`
  : 'None recommends 32GB yet.'} ${upMin16.length
  ? `${upMin16.length} ${upMin16.length === 1 ? 'game already treats' : 'games already treat'} 16GB as the bare minimum, so 8GB is no longer a realistic gaming configuration.`
  : ''}</p>
<p>Whether 32GB is worth buying depends less on today's requirement tables than on what else runs while you play, and on how long the PC has to last.</p>

<h2>Upcoming games: recommended RAM</h2>
${table(['Recommended RAM', 'Games', 'Which'], rows)}

<h2>Recent released games</h2>
<p>Of the ${relRecent.length} games from ${recentYear} onward in our catalogue that state a recommended amount, ${rel16.length} ${rel16.length === 1 ? 'asks' : 'ask'} for exactly 16GB and ${rel32.length} ${rel32.length === 1 ? 'asks' : 'ask'} for 32GB or more. The move to 32GB is happening, but slowly. Publishers raise the minimum before they raise the recommended figure.</p>

<h2>When 32GB makes a difference</h2>
<ul>
<li><strong>Background apps.</strong> A browser, Discord and a streaming or recording tool can take several gigabytes between them. That is memory the game cannot use.</li>
<li><strong>Large open worlds and simulations.</strong> Strategy, city-builder and flight-sim games tend to use more memory than their requirement tables suggest, especially late in a save.</li>
<li><strong>Keeping the PC for years.</strong> Memory requirements only go up, and adding a second pair of sticks later is not always possible at the same speed.</li>
</ul>

<h2>Verdict</h2>
<ul>
<li><strong>16GB</strong> if you mainly game, keep background apps light and build on a tight budget. It covers almost every published ${SEO_YEAR} requirement.</li>
<li><strong>32GB</strong> for a new build meant to last, or if you stream, record or keep a lot open while playing. It is also required for ${up32.length ? list(up32.map(gameLink)) : 'no upcoming game yet'} at the recommended tier.</li>
</ul>
<p>To see whether the rest of your PC keeps up, run it through the ${a('/can-it-run', 'can my PC run it checker')}. For graphics memory rather than system memory, see ${a('/blog/is-8gb-vram-enough', 'is 8GB of VRAM enough')}.</p>

${sources}`;

  return {
    slug,
    title: `16GB vs 32GB RAM for Gaming in ${SEO_YEAR}`,
    excerpt: `16GB meets the recommended RAM of ${upRam.length - up32.length} of ${upRam.length} upcoming PC games that state it. Which games want 32GB, and when the upgrade is worth it.`,
    category: 'guides',
    content
  };
});

// ------------------------------------------------------------------ write

if (upWithReqs.length < 5) {
  console.log(`only ${upWithReqs.length} upcoming games with requirements — not enough to write data articles; keeping the previous posts`);
  process.exit(0);
}

const posts = ARTICLES.map(make => make()).map(p => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  content: p.content.trim(),
  category: p.category,
  author: `${SITE_NAME} Hardware Desk`,
  image_url: '',
  read_time: readTime(p.content),
  featured: 1,
  published_at: PUBLISHED[p.slug],
  updated_at: dataDate
}));

let broken = 0;
for (const p of posts) {
  if (!p.published_at) { console.log(`  MISSING publish date for ${p.slug}`); broken++; }
  if (p.title.length > 52) console.log(`  WARNING: "${p.title}" is ${p.title.length} chars; the brand suffix will be dropped from its <title>`);
  if (p.excerpt.length > 165) console.log(`  WARNING: excerpt for ${p.slug} is ${p.excerpt.length} chars`);
  const links = [...p.content.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]);
  for (const href of links) {
    const game = href.match(/^\/game\/([^/?#]+)/);
    if (game && !BUNDLE.bySlug[game[1]]) { console.log(`  BROKEN LINK in ${p.slug}: ${href}`); broken++; }
    const card = href.match(/^\/gpu\/([^/?#]+)/);
    if (card && !HW.gpus.some(g => g.slug === card[1])) { console.log(`  BROKEN LINK in ${p.slug}: ${href}`); broken++; }
    const post = href.match(/^\/blog\/([^/?#]+)/);
    if (post && !posts.some(q => q.slug === post[1])) { console.log(`  BROKEN LINK in ${p.slug}: ${href}`); broken++; }
  }
}
if (broken) process.exit(1);

fs.writeFileSync(OUT, JSON.stringify({ posts, meta: { generated: new Date().toISOString().slice(0, 10), dataDate } }, null, 1));
console.log(`wrote ${posts.length} posts (data as of ${dataDate}) -> ${path.relative(ROOT, OUT)}`);
for (const p of posts) console.log(`  ${String(p.read_time).padStart(2)} min  ${p.title.length}t ${p.excerpt.length}d  /blog/${p.slug}`);
