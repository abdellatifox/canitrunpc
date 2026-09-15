import { SEO_YEAR } from './year';
/** Single source of truth for the toolkit and the curated game lists.
 *  Used by /tools, the homepage, the footer and the sitemap so a new tool is
 *  added in exactly one place and can never be orphaned from the crawl graph. */

export interface Tool {
  name: string;
  href: string;
  icon: string;
  blurb: string;
  /** Short label used in the "related tools" rails. */
  short: string;
}

export const TOOLS: Tool[] = [
  { name: 'Can I Run It?',       href: '/can-it-run',       icon: 'bi-controller',       short: 'Can I Run It',      blurb: "Pick a game, enter your graphics card, processor and memory, and see which of the publisher's two specs you clear." },
  { name: 'FPS Calculator',      href: '/fps-estimator',    icon: 'bi-speedometer2',     short: 'FPS Calculator',    blurb: "A modelled frame rate for your parts in any game we track, from 1080p low up to 4K ultra." },
  { name: 'Bottleneck Calculator', href: '/bottleneck',     icon: 'bi-diagram-3',        short: 'Bottleneck Calc',   blurb: "Tells you which part of a CPU and GPU pairing runs out first, and how wide the gap is." },
  { name: 'Build Suggester',     href: '/build-suggest',    icon: 'bi-pc-display',       short: 'Build Suggester',   blurb: "Give it a budget and a target resolution; it returns a parts list balanced around that." },
  { name: 'Compare GPUs',        href: '/compare-gpu',      icon: 'bi-bar-chart-line',   short: 'Compare GPUs',      blurb: "Two graphics cards in one view: index, memory, power and launch price." },
  { name: 'Compare CPUs',        href: '/compare-cpu',      icon: 'bi-cpu',              short: 'Compare CPUs',      blurb: "Two processors in one view: cores, speed, power and where each lands for gaming." },
  { name: 'GPU Tier List',       href: '/gpu-tier-list',    icon: 'bi-trophy',           short: 'GPU Tier List',     blurb: "Every graphics card we score, cut into six bands with the share of games each one runs." },
  { name: 'CPU Tier List',       href: '/cpu-tier-list',    icon: 'bi-list-ol',          short: 'CPU Tier List',     blurb: "Every gaming processor we score, cut into six bands from S down to F." },
  { name: 'PSU Calculator',      href: '/psu-calculator',   icon: 'bi-plug',             short: 'PSU Calculator',    blurb: "Adds up your parts' power draw, leaves room for spikes, then names a wattage." },
  { name: 'Upgrade Advisor',     href: '/upgrade-advisor',  icon: 'bi-arrow-up-circle',  short: 'Upgrade Advisor',   blurb: "Works out which one part to replace first for the biggest gain on the PC you have." },
  { name: 'PC Value Calculator', href: '/pc-value',         icon: 'bi-cash-coin',        short: 'PC Value',          blurb: "A rough resale figure for a used gaming PC, based on its main parts." },
  { name: 'VR Ready Test',       href: '/vr-ready',         icon: 'bi-badge-vr',         short: 'VR Ready Test',     blurb: "Checks a PC against the published requirements of the main PC VR headsets." },
  { name: 'Ray Tracing Check',   href: '/ray-tracing',      icon: 'bi-lightbulb',        short: 'Ray Tracing',       blurb: "Games with confirmed ray tracing, and how hard each graphics card can push it." },
  { name: 'DLSS vs FSR',         href: '/dlss-fsr',         icon: 'bi-magic',            short: 'DLSS vs FSR',       blurb: "Which upscaler your card can use, what each mode renders at, and the games that have them." },
  { name: 'What Can My PC Run?', href: '/what-can-my-pc-run', icon: 'bi-search',         short: 'What Can I Run',    blurb: "Enter your parts once and get every game sorted by how comfortably your PC runs it." }
];

export interface GameList {
  slug: string;
  title: string;
  h1: string;
  blurb: string;
  icon: string;
  /** Predicate applied to the games table to build the list. */
  filter: (g: any) => boolean;
  sort?: (a: any, b: any) => number;
  /**
   * True when the list depends on a curated feature flag rather than a
   * published requirement, so the page can say the list covers only the titles
   * whose features we have verified.
   */
  featureBased?: boolean;
  /**
   * Explicit membership by Steam appid, for lists that no published field can
   * express. Steam reports a single primary genre and it is "Action" for 357 of
   * the 503 titles we hold, so genre-based membership does not work.
   */
  appids?: number[];
}

/**
 * Requirement fields are null when the publisher did not state something we can
 * measure. These guards exist because JavaScript coerces null to 0 in a numeric
 * comparison — `null <= 30` is true — so a bare `g.min_gpu_score <= 30` would
 * quietly fill "games for low-end PCs" with every unscored title.
 */
const lte = (v: number | null | undefined, n: number) => v != null && v <= n;
const gte = (v: number | null | undefined, n: number) => v != null && v >= n;

/**
 * Demand bands are percentile-based, not absolute.
 *
 * Requirements name the cards that were current when a game shipped, so against
 * a scale anchored to today's flagship the median recommended requirement lands
 * around 9/100. A fixed cut like `min_gpu_score <= 30` therefore swept 237 of
 * 280 scorable games into "games for low-end PCs", which is useless. Ranking
 * within the catalogue keeps these lists meaningful as the catalogue grows.
 */
const pctAtMost = (g: any, n: number) => g.demandPercentile != null && g.demandPercentile <= n;
const pctAtLeast = (g: any, n: number) => g.demandPercentile != null && g.demandPercentile >= n;

export const GAME_LISTS: GameList[] = [
  {
    slug: 'low-end-pc-games',
    title: "Games for Low-End PCs",
    h1: `Low-End PC Games ${SEO_YEAR}: What Runs on Weak Hardware`,
    blurb: "The lightest 35% of the library by graphics requirement. If your PC has integrated graphics, an older GTX card or a work laptop, start here.",
    icon: 'bi-laptop',
    filter: (g) => pctAtMost(g, 0.35),
    sort: (a, b) => (a.demandPercentile ?? 9) - (b.demandPercentile ?? 9)
  },
  {
    slug: 'most-demanding-pc-games',
    title: "Most Demanding PC Games",
    h1: `Most Demanding PC Games ${SEO_YEAR}`,
    blurb: "The heaviest 15% of the library by recommended graphics card, heaviest first. Useful for stress-testing a new build or deciding how far to stretch a budget.",
    icon: 'bi-fire',
    filter: (g) => pctAtLeast(g, 0.85),
    sort: (a, b) => (b.demandPercentile ?? -1) - (a.demandPercentile ?? -1)
  },
  {
    slug: 'ray-tracing-games',
    title: "Ray Tracing Games",
    h1: `PC Games With Ray Tracing (${SEO_YEAR} List)`,
    blurb: "Games where ray tracing is confirmed, with how heavy each implementation is, so you know what to expect before switching it on.",
    icon: 'bi-lightbulb',
    filter: (g) => g.supports_ray_tracing === 1,
    featureBased: true,
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'dlss-games',
    title: "DLSS Games",
    h1: `PC Games With DLSS (${SEO_YEAR} List)`,
    blurb: "Games with NVIDIA's upscaler confirmed. Owners of RTX cards can usually trade a little sharpness for a lot of frames in these.",
    icon: 'bi-magic',
    filter: (g) => g.supports_dlss === 1,
    featureBased: true,
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'cpu-intensive-games',
    title: "CPU-Heavy Games",
    h1: 'CPU-Heavy PC Games: Where the Processor Matters Most',
    blurb: "Strategy, simulation and crowded open worlds, where frame rate is capped by the processor long before the graphics card runs out.",
    icon: 'bi-cpu',
    filter: (g) => g.cpu_intensive === 1,
    featureBased: true,
    sort: (a, b) => (b.rec_cpu_score ?? 0) - (a.rec_cpu_score ?? 0)
  },
  {
    slug: 'games-under-8gb-ram',
    title: "Games for 8GB of RAM",
    h1: 'PC Games You Can Play With 8GB of RAM',
    blurb: "Every game whose publisher lists 8GB or less as the memory minimum, lowest first.",
    icon: 'bi-memory',
    filter: (g) => lte(g.min_ram_gb, 8),
    sort: (a, b) => (a.min_ram_gb ?? 999) - (b.min_ram_gb ?? 999)
  },
  {
    slug: 'newest-pc-games',
    title: "Newest PC Games",
    h1: 'New PC Games and Their System Requirements',
    blurb: "Recent releases, newest first, each with the publisher's minimum and recommended hardware.",
    icon: 'bi-stars',
    filter: (g) => gte(g.release_year, 2024),
    sort: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0)
  },
  {
    slug: 'esports-games',
    title: "Esports Games",
    h1: 'Esports Games: PC Requirements for Competitive Play',
    blurb: "Competitive shooters, MOBAs and arena games built for high frame rates on ordinary hardware. Picked by hand: Steam files most under one Action genre.",
    icon: 'bi-trophy',
    appids: [
      730,      // Counter-Strike 2
      570,      // Dota 2
      1172470,  // Apex Legends
      578080,   // PUBG: BATTLEGROUNDS
      252950,   // Rocket League
      440,      // Team Fortress 2
      1085660,  // Destiny 2
      2357570,  // Overwatch 2
      2073850,  // THE FINALS
      1517290,  // Battlefield 2042
      359550,   // Rainbow Six Siege
      230410,   // Warframe
      386180    // Brawlhalla
    ],
    filter: () => true,
    sort: (a, b) => (a.demandPercentile ?? 9) - (b.demandPercentile ?? 9)
  }
];
