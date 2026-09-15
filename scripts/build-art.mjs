/**
 * Downloads game artwork once and re-encodes it as AVIF + WebP at the sizes the
 * site actually displays.
 *
 * Before this, every card pulled a full-size PNG/JPEG straight from
 * cdn2.steamgriddb.com — 51 KB on average, ~600 KB for one screenful of the
 * games grid, in formats a decade behind what browsers accept. It also put a
 * third-party origin on the critical path of the most-visited pages.
 *
 * Output is a <picture> ladder: AVIF first (smallest), WebP second (universal
 * since 2020), and the original URL stays in the data as the last-resort src so
 * nothing breaks if a file is missing.
 *
 * Sizes are driven by real layout: cards render at ~150-300 CSS px wide, detail
 * pages at ~210. 320w covers 1x on desktop and 2x on a phone; 640w covers 2x on
 * desktop.
 *
 *   node scripts/build-art.mjs [limit]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { isExcludedGame } from '../data/excluded-games.mjs';
import { USER_AGENT } from '../src/lib/site.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'art');
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game-art.json'), 'utf8'));
const REQS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game-reqs.json'), 'utf8'));
const MANIFEST = path.join(ROOT, 'src', 'lib', 'art-manifest.json');

const LIMIT = parseInt(process.argv[2] || '0', 10) || Infinity;
/*
 * Quality is tuned per width, not fixed. A 320px card thumbnail tolerates far
 * more compression than a 640px detail cover, and a flat quality setting either
 * wastes bytes on thumbnails or bands the gradients on the large one.
 */
const WIDTHS = [
  { w: 320, avif: 42, webp: 70 },
  // Cards render at ~182 CSS px on a typical mobile viewport; at the ~2.6x
  // device pixel ratio Lighthouse tests with, that needs ~475 real px. 320w
  // undershoots it and forces the browser up to 640w, shipping roughly twice
  // the pixels actually displayed — this tier closes that gap.
  { w: 480, avif: 46, webp: 73 },
  { w: 640, avif: 50, webp: 76 }
];
const UA = { 'User-Agent': USER_AGENT };

fs.mkdirSync(OUT, { recursive: true });

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : {};

/** Only bother with games the site can actually surface. */
const wanted = new Set(Object.keys(REQS.bySlug));
const targets = Object.entries(ART)
  .filter(([slug]) => wanted.has(slug))
  .slice(0, LIMIT);

console.log(`art targets: ${targets.length} (already done: ${Object.keys(manifest).length})`);

let done = 0, skipped = 0, failed = 0;
let srcBytes = 0, outBytes = 0;

for (const [slug, a] of targets) {
  if (isExcludedGame({ slug, name: a?.name })) { skipped++; continue; }
  // A logo sits on a gradient tile and must keep its transparency; a cover is
  // photographic and crops to the card.
  const isLogo = Boolean(a.logoOnly);

  // Resume per width, not per game: a game already encoded at 320/640 (from
  // before this ran with a 480 tier added) should only fetch once more to
  // fill the gap, not be treated as fully done or re-encoded from scratch.
  // Games that gained a logo after their first encode still had a
  // cover-cropped key-art file on disk, so a kind change still starts fresh.
  const existing = manifest[slug];
  const sameKind = Boolean(existing) && existing.logo === isLogo;
  const missingWidths = WIDTHS.filter(({ w }) => !(sameKind && existing.w?.[w]));
  if (!missingWidths.length) { skipped++; continue; }

  const url = isLogo ? (a.logo || a.logoThumb) : (a.grid || a.gridThumb);
  if (!url) { skipped++; continue; }

  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) { failed++; continue; }
    const input = Buffer.from(await res.arrayBuffer());
    srcBytes += input.length;

    const entry = sameKind ? existing : { logo: isLogo, w: {} };

    for (const { w, avif: aq, webp: pq } of missingWidths) {
      const base = sharp(input).resize({
        width: w,
        // Covers fill a 2:3 card; logos must stay whole inside their box.
        height: isLogo ? undefined : Math.round(w * 1.5),
        fit: isLogo ? 'inside' : 'cover',
        withoutEnlargement: true
      });

      const avif = await base.clone().avif({ quality: aq, effort: 4 }).toBuffer();
      const webp = await base.clone().webp({ quality: pq, effort: 5 }).toBuffer();

      fs.writeFileSync(path.join(OUT, `${slug}-${w}.avif`), avif);
      fs.writeFileSync(path.join(OUT, `${slug}-${w}.webp`), webp);
      outBytes += avif.length + webp.length;
      entry.w[w] = { a: avif.length, p: webp.length };
    }

    manifest[slug] = entry;
    done++;

    if (done % 25 === 0) {
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
      console.log(`  ${done} encoded (${skipped} skipped, ${failed} failed)`);
    }
  } catch (e) {
    failed++;
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest));

const n = Object.keys(manifest).length;
console.log(`\nencoded ${done} this run — ${n} games have local art`);
if (srcBytes) {
  console.log(`  source downloaded : ${(srcBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  re-encoded output : ${(outBytes / 1024 / 1024).toFixed(1)} MB (both formats, both widths)`);
  console.log(`  avg AVIF @320w    : ${(Object.values(manifest).reduce((s, e) => s + (e.w?.[320]?.a || 0), 0) / n / 1024).toFixed(1)} KB`);
}
console.log(`  manifest -> src/lib/art-manifest.json`);
