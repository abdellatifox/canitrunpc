# Where the data comes from

Every number this site shows is either published by the game's publisher, or
derived from a curated hardware dataset with a stated basis. Nothing is
generated to fill a gap: a field a publisher does not state stays empty and the
UI says "not stated".

## Sources

| Data | Source | Authority |
|---|---|---|
| Game system requirements | Steam `appdetails` API | The publisher's own store listing |
| Game catalogue & popularity | SteamSpy `request=all` | Ownership ranking, used only for ordering |
| Non-Steam games | `data/games.manual.mjs` | Publisher support pages, each with a URL and verified date |
| GPU / CPU performance | `data/gpus.source.mjs`, `data/cpus.source.mjs` | Curated relative gaming index, see below |
| Game artwork | SteamGridDB | See `src/lib/images.ts` |

## The hardware index

`perf` is a **relative** gaming-performance figure, not an absolute benchmark
score:

- GPUs are anchored at RTX 4090 = 100, reflecting aggregate 1080p/1440p
  rasterised gaming performance.
- CPUs are anchored at Ryzen 7 9800X3D = 100, weighted for 1080p gaming rather
  than multi-threaded throughput. This is why big workstation parts sit below
  cheaper 8-core gaming chips — correct for this site, wrong for a render farm.

The 0–100 `score` on the site is `perf` normalised so the fastest tracked part
is 100. **A part's score can fall when a new flagship launches** even though the
part has not changed. The tier-list pages say so.

Tier thresholds differ between GPU and CPU on purpose: GPU performance spreads
across a huge range, CPU gaming performance compresses hard at the top.

## Pipeline

```bash
npm run data:index      # SteamSpy catalogue -> data/steam-index.json (resumable, writes per page)
npm run data:reqs 3000  # Steam requirements for the top N -> data/games.requirements.json (resumable)
npm run data:build      # compile everything into src/lib/*.json for the Worker
npm run data:refresh    # all three in order
```

Both fetchers are **resumable** — re-running continues from what is already on
disk rather than starting over. `data:reqs` is rate-limited to roughly 40
requests a minute to stay inside Steam's store-API budget, so a 3,000-game run
takes about 75 minutes.

## What gets bundled into the Worker

The full catalogue is far too large to ship in a Worker bundle, so:

- `src/lib/game-index.json` — the most-owned slice (default 30,000 of ~76,000)
  for instant autocomplete, with derived abbreviations (`gta`, `rdr2`, `bg3`).
  Measured cost, so the trade is explicit:

  | bundled | gzipped |
  |---|---|
  | 15,000 | 392 KB |
  | **30,000** | **786 KB** |
  | 45,000 | 1,171 KB |
  | 76,000 (all) | 1,952 KB |

  A Worker parses this on every cold start, and titles past ~30,000 by ownership
  are genuinely obscure — they still resolve through the live Steam fallback.
- `src/lib/game-reqs.json` — compact requirements for the top N games.
- Anything outside those falls through to a **live Steam lookup**, cached in KV
  after the first hit. No game is unreachable.

## Adding a game by hand

Non-Steam titles go in `data/games.manual.mjs`. State the publisher's wording,
cite the page, and set `verified`. If the publisher has not published
requirements, set `unpublished: true` and leave the tiers null — the site will
say so rather than show a guess.

## Matching

`src/lib/match-hardware.mjs` maps publisher prose ("GeForce GTX 1060 6GB or
Radeon RX 580 8GB") onto dataset rows. When several alternatives resolve, the
**weakest** wins — that is the real bar to clear. A line it cannot resolve
returns null and the site shows the publisher's text with no comparison
attached.
