/**
 * Rewrites dist/_routes.json so static files are never served by the Worker.
 *
 * Why this exists: Cloudflare Pages allows 100 rules in _routes.json. The
 * Astro adapter lists static files one by one and then cuts the list at 100,
 * so it spent the budget on 91 individual game images and sent everything
 * else — ~2,800 more images, every share card, every cover and several
 * prerendered pages — through the Worker. Each image became a billable
 * Function invocation: one visit to /games cost hundreds of them. That drained
 * the free plan's 100,000 daily requests, and with fail-open on, Pages then
 * served only static files — so every server-rendered page, the blog
 * included, returned 404 for the rest of the day.
 *
 * This derives a compact rule set from the build output instead:
 *   - a directory no server route lives under -> one wildcard
 *     (/art/*, /og/*, and prerendered sections such as /game/* and /blog/*)
 *   - a directory that shares a prefix with a server route -> its pages one
 *     by one, so the server route is not swallowed
 *   - a prerendered root page         -> its clean URL  (/tools, /)
 *   - any other root file             -> its path       (/favicon.ico)
 *   - every _redirects source         -> its path (Pages does not apply
 *     _redirects to requests a Function handles)
 * and fails the build rather than silently truncating if that is over 100.
 *
 * Runs after `astro build` (see package.json "build").
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(DIST, '_routes.json');
const LIMIT = 100;

// Build artefacts that are not requestable files.
const SKIP = new Set(['_worker.js', '_routes.json', '_headers', '_redirects']);

if (!fs.existsSync(path.join(DIST, '_worker.js'))) {
  console.log('write-routes: no dist/_worker.js — nothing server-rendered, leaving _routes.json alone');
  process.exit(0);
}

/*
 * First path segment of every server-rendered route, read from src/pages: a
 * page is server-rendered unless it says `export const prerender = true`
 * (output is 'server'). A dynamic first segment (/[slug]) could match any
 * directory, so it is recorded as '*' and disables wildcards entirely.
 */
function serverPrefixes() {
  const pagesDir = path.join(ROOT, 'src', 'pages');
  const prefixes = new Set();
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(astro|ts|js|mjs|md|mdx)$/.test(e.name)) continue;
      if (/export\s+const\s+prerender\s*=\s*true/.test(fs.readFileSync(full, 'utf8'))) continue;
      const rel = path.relative(pagesDir, full).replace(/\\/g, '/');
      const first = rel.split('/')[0].replace(/\.(astro|ts|js|mjs|md|mdx)$/, '');
      prefixes.add(first.startsWith('[') ? '*' : first);
    }
  };
  walk(pagesDir);
  return prefixes;
}
const SERVER = serverPrefixes();
const canWildcard = name => !SERVER.has('*') && !SERVER.has(name);

const hasHtml = dir => fs.readdirSync(dir, { withFileTypes: true }).some(e =>
  e.isDirectory() ? hasHtml(path.join(dir, e.name)) : e.name.endsWith('.html'));

/** Clean URL for a prerendered HTML file, given build.format 'file'. */
function pageUrl(rel) {
  const p = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
  if (p === '/index') return '/';
  return p.endsWith('/index') ? p.slice(0, -'/index'.length) || '/' : p;
}

function htmlFiles(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) return htmlFiles(path.join(dir, e.name), rel);
    return e.name.endsWith('.html') ? [rel] : [];
  });
}

const exclude = new Set();

for (const entry of fs.readdirSync(DIST, { withFileTypes: true })) {
  if (SKIP.has(entry.name)) continue;
  const full = path.join(DIST, entry.name);

  if (entry.isDirectory()) {
    if (!hasHtml(full) || canWildcard(entry.name)) {
      exclude.add(`/${entry.name}/*`);
    } else {
      // Mixed directory: exclude its pages one by one, never wildcard it, or a
      // server-rendered route under the same prefix would be swallowed.
      for (const rel of htmlFiles(full, entry.name)) exclude.add(pageUrl(rel));
    }
    continue;
  }

  if (entry.name === '404.html') continue;        // served by Pages on any miss
  exclude.add(entry.name.endsWith('.html') ? pageUrl(entry.name) : `/${entry.name}`);
}

const redirectsFile = path.join(DIST, '_redirects');
if (fs.existsSync(redirectsFile)) {
  for (const line of fs.readFileSync(redirectsFile, 'utf8').split(/\r?\n/)) {
    const src = line.trim().split(/\s+/)[0];
    if (src && src.startsWith('/') && !src.startsWith('#')) exclude.add(src);
  }
}

const rules = { version: 1, include: ['/*'], exclude: [...exclude].sort() };
const total = rules.include.length + rules.exclude.length;

if (total > LIMIT) {
  console.error(`write-routes: ${total} rules exceeds Cloudflare's limit of ${LIMIT}.`);
  console.error('Group more static files into a directory so they collapse into one wildcard.');
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(rules, null, 2) + '\n');
console.log(`write-routes: ${total} rules (limit ${LIMIT}) -> dist/_routes.json`);
console.log(`  wildcards: ${rules.exclude.filter(r => r.endsWith('/*')).join(' ')}`);
console.log(`  server-rendered prefixes: ${[...SERVER].sort().join(' ')}`);
