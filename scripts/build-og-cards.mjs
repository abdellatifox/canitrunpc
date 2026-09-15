/**
 * Builds a share card per game.
 *
 * Game pages had been advertising the SteamGridDB logo URL as their og:image.
 * That is a third-party origin the rest of the site no longer touches, and the
 * asset itself is a transparent PNG of arbitrary shape — social platforms
 * composite transparency onto black or white and crop to their own ratio, so
 * the card rendered badly wherever it was shared.
 *
 * These are 1200x630 JPEGs built from the art we already host: the game's logo
 * centred on the brand ground, wordmark bottom-left. Games without local art
 * keep the site default card.
 *
 * Run: node scripts/build-og-cards.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'public', 'art');
const OUT = path.join(ROOT, 'public', 'og');

const W = 1200;
const H = 630;

fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'art-manifest.json'), 'utf8'));
const slugs = Object.keys(manifest);

const ground = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#1E2128"/><stop offset="1" stop-color="#121418"/>
       </linearGradient>
       <radialGradient id="w" cx="0.5" cy="0.34" r="0.55">
         <stop offset="0" stop-color="#FF6A2B" stop-opacity="0.14"/>
         <stop offset="1" stop-color="#FF6A2B" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
     <rect width="${W}" height="${H}" fill="url(#w)"/>
     <rect width="${W}" height="10" fill="#C2410C"/>
   </svg>`
);

/* Brand lockup bottom-left. Game logos are almost all white, so the card
   ground is dark ink and the lockup is the light variant
   (brand/logo-on-dark.svg), small enough to stay out of the artwork's way. */
const wordmark = await sharp(path.join(ROOT, 'brand', 'logo-on-dark.png'))
  .trim({ threshold: 1 })
  .resize({ height: 52 })
  .png()
  .toBuffer();

let made = 0;
let skipped = 0;
let bytes = 0;

for (const slug of slugs) {
  // 640 is the widest tier we hold; anything narrower would upscale badly.
  const src = path.join(ART, `${slug}-640.webp`);
  if (!fs.existsSync(src)) { skipped++; continue; }

  try {
    const logo = await sharp(src)
      .resize({ width: 780, height: 300, fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    const card = await sharp(ground)
      .composite([
        { input: logo, gravity: 'center' },
        { input: wordmark, top: H - 52 - 40, left: 64 }
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(path.join(OUT, `${slug}.jpg`), card);
    bytes += card.length;
    made++;
  } catch {
    skipped++;
  }
}

console.log(`og cards -> public/og/`);
console.log(`  built   : ${made}`);
console.log(`  skipped : ${skipped} (no local art — these fall back to the default card)`);
console.log(`  total   : ${(bytes / 1048576).toFixed(1)} MB, avg ${(bytes / made / 1024).toFixed(1)} KB`);
