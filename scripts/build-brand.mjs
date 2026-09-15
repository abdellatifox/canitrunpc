/**
 * Derives every shipped brand asset from the two masters in brand/.
 *
 * Before this existed the site was still serving the old project's favicon — a
 * green square with the letter "R" — and pointed apple-touch-icon at an SVG,
 * which iOS does not support and silently ignores.
 *
 * Masters:
 *   brand/icon.png  square C-and-tick mark, transparent (trimmed from brand/source-favicon.png)
 *   brand/logo.png  full canitrun PC lockup, transparent (trimmed from brand/source-logo.png)
 *   brand/logo-on-dark.png  the same lockup with a cream wordmark, for dark share cards
 *
 * Run: node scripts/build-brand.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public');
const ICON = path.join(ROOT, 'brand', 'icon.png');
const LOGO = path.join(ROOT, 'brand', 'logo.png');

/** Site background, for surfaces that cannot keep transparency. */
const BG = { r: 244, g: 241, b: 232, alpha: 1 };   // --bg #F4F1E8

const written = [];
const write = (name, buf) => {
  fs.writeFileSync(path.join(OUT, name), buf);
  written.push([name, buf.length]);
};

/** Trim the master's transparent margin so every output crops identically. */
const trimmed = (src) => sharp(src).trim({ threshold: 1 });

/** Square icon at `size`, transparent, with a little breathing room. */
async function iconPng(size, { background = null, padRatio = 0 } = {}) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const mark = await trimmed(ICON)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

/**
 * Minimal multi-image ICO. Each entry stores a full PNG, which every browser
 * from Vista onward reads; sharp cannot emit .ico itself.
 */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, e);      // width  (0 means 256)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);  // height
    dir.writeUInt8(0, e + 2);                       // palette size
    dir.writeUInt8(0, e + 3);                       // reserved
    dir.writeUInt16LE(1, e + 4);                    // colour planes
    dir.writeUInt16LE(32, e + 6);                   // bits per pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

for (const src of [ICON, LOGO]) {
  if (!fs.existsSync(src)) {
    console.error(`missing master: ${path.relative(ROOT, src)}`);
    process.exit(1);
  }
}

/* ------------------------------- favicons ------------------------------- */

const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push({ size, data: await iconPng(size) });
}
write('favicon.ico', buildIco(icoPngs));
write('favicon-16.png', icoPngs[0].data);
write('favicon-32.png', icoPngs[1].data);

/* iOS composites transparency onto black and ignores SVG entirely, so this one
   is opaque and raster. */
write('apple-touch-icon.png', await iconPng(180, { background: BG, padRatio: 0.08 }));

/* Manifest icons. The maskable variant keeps the mark inside the safe zone so
   Android can crop it to any shape without clipping the mark. */
write('icon-192.png', await iconPng(192));
write('icon-512.png', await iconPng(512));
write('icon-maskable-512.png', await iconPng(512, { background: BG, padRatio: 0.1 }));

/* --------------------------------- logo --------------------------------- */

/* The navbar draws the lockup at up to 40px tall; 2x covers retina. Height
   drives the resize so the aspect ratio stays exactly as drawn. */
const LOGO_H = 80;
const logoBase = trimmed(LOGO).resize({ height: LOGO_H });
const logoMeta = await logoBase.clone().png().toBuffer({ resolveWithObject: true });

/* The header logo is on every page, so it gets a content hash in its name and
   a one-year immutable cache: a fixed name capped it at 7 days, and a longer
   TTL on a fixed name would strand a changed logo in caches for a year.
   AVIF at q45 is 5.2 KB against 7.4 KB at q62 with no visible loss on a flat
   wordmark this size. */
for (const f of fs.readdirSync(OUT)) {
  if (/^logo(\.[0-9a-f]{8})?\.(avif|webp|png)$/.test(f)) fs.unlinkSync(path.join(OUT, f));
}
const hashed = (buf, ext) => `logo.${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.${ext}`;
const logoFiles = {};
for (const [ext, buf] of [
  ['avif', await logoBase.clone().avif({ quality: 45, effort: 9 }).toBuffer()],
  ['webp', await logoBase.clone().webp({ quality: 80, effort: 6 }).toBuffer()],
  ['png',  await logoBase.clone().png({ compressionLevel: 9, palette: true }).toBuffer()]
]) {
  const name = hashed(buf, ext);
  write(name, buf);
  logoFiles[ext] = `/${name}`;
}

/* Wide lockup for share cards and schema, where a 64px-tall image would blur. */
write('logo-512.png', await trimmed(LOGO).resize({ height: 160 }).png({ compressionLevel: 9 }).toBuffer());

const ratio = logoMeta.info.width / logoMeta.info.height;
fs.writeFileSync(
  path.join(ROOT, 'src', 'lib', 'brand-meta.json'),
  JSON.stringify({ logoWidth: logoMeta.info.width, logoHeight: logoMeta.info.height, ratio, logo: logoFiles }, null, 2)
);

console.log(`brand assets -> public/`);
for (const [name, bytes] of written) {
  console.log(`  ${name.padEnd(24)} ${(bytes / 1024).toFixed(1).padStart(7)} KB`);
}
console.log(`\nlogo renders at ${logoMeta.info.width}x${logoMeta.info.height} (ratio ${ratio.toFixed(3)})`);
