/**
 * Uploads public/art/ to the canitrunpc-assets R2 bucket.
 *
 * wrangler has no bulk upload, and one `r2 object put` costs ~4s of process
 * startup, so this fans out N at a time against wrangler's own entry point
 * (skipping the npx resolve) and records what landed. Re-running only uploads
 * what is missing, so an interrupted run resumes instead of starting over.
 *
 * Deliberately uses the existing wrangler OAuth session rather than an R2 API
 * token, so no new credential has to be created or stored.
 *
 * Run: node scripts/sync-r2.mjs [--dir public/art] [--prefix art] [--concurrency 12]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const BUCKET = 'canitrunpc-assets';
const STATE = path.join(ROOT, 'src', 'lib', 'r2-uploaded.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const DIR = path.join(ROOT, arg('dir', 'public/art'));
const PREFIX = arg('prefix', 'art');
const CONCURRENCY = Number(arg('concurrency', 12));

/**
 * Without this R2 answers every request from origin — `cf-cache-status: DYNAMIC`
 * — so the art loaded slower from the bucket than it had from Pages. A month is
 * long enough for a high edge hit rate and short enough that art regenerated
 * under the same filename heals on its own, which `immutable` would prevent.
 */
const CACHE_CONTROL = arg('cache-control', 'public, max-age=2592000, stale-while-revalidate=86400');

const TYPES = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

if (!fs.existsSync(WRANGLER)) {
  console.error('wrangler entry point not found — run npm install first');
  process.exit(1);
}
if (!fs.existsSync(DIR)) {
  console.error(`source directory not found: ${DIR}`);
  process.exit(1);
}

const done = new Set(fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : []);

const files = fs
  .readdirSync(DIR)
  .filter((f) => TYPES[path.extname(f).toLowerCase()])
  .map((f) => ({ name: f, key: `${PREFIX}/${f}`, abs: path.join(DIR, f) }))
  .filter((f) => !done.has(f.key));

const total = files.length;
console.log(`bucket   : ${BUCKET}`);
console.log(`source   : ${path.relative(ROOT, DIR)}`);
console.log(`cache    : ${CACHE_CONTROL}`);
console.log(`to upload: ${total} (${done.size} already done)`);
if (!total) process.exit(0);

let ok = 0;
let failed = 0;
const failures = [];

function upload(file) {
  return new Promise((resolve) => {
    const ct = TYPES[path.extname(file.name).toLowerCase()];
    const p = spawn(
      process.execPath,
      [WRANGLER, 'r2', 'object', 'put', `${BUCKET}/${file.key}`,
        '--file', file.abs, '--content-type', ct, '--cache-control', CACHE_CONTROL],
      { stdio: 'ignore' }
    );
    p.on('close', (code) => {
      if (code === 0) {
        ok++;
        done.add(file.key);
      } else {
        failed++;
        failures.push(file.key);
      }
      resolve();
    });
    p.on('error', () => {
      failed++;
      failures.push(file.key);
      resolve();
    });
  });
}

const save = () => fs.writeFileSync(STATE, JSON.stringify([...done]));

const started = Date.now();
let next = 0;

async function worker() {
  while (next < files.length) {
    const file = files[next++];
    await upload(file);
    const seen = ok + failed;
    if (seen % 50 === 0 || seen === total) {
      const mins = (Date.now() - started) / 60000;
      const rate = seen / mins;
      const left = rate > 0 ? ((total - seen) / rate).toFixed(1) : '?';
      console.log(`  ${seen}/${total}  ok:${ok} failed:${failed}  ~${left} min left`);
      save();
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();

console.log(`\nuploaded ${ok}, failed ${failed}, in ${((Date.now() - started) / 60000).toFixed(1)} min`);
if (failures.length) {
  console.log('failed keys (re-run to retry):');
  for (const f of failures.slice(0, 20)) console.log('  ' + f);
}
