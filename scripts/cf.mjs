/**
 * Runs wrangler against this site's own Cloudflare account.
 *
 * Why this wrapper exists: canitrunpc.com lives in a different Cloudflare
 * login than the one `wrangler login` is signed into on this machine, and that
 * other login owns a different site. Rather than logging in and out — which
 * would break the other project's deploys and hand us an OAuth session that
 * cannot even create a Cache Rule — this reads an API token scoped to this
 * account from a local, git-ignored file and passes it to wrangler in the
 * environment for that one command.
 *
 * Setup, once:
 *   1. Cloudflare dashboard (the account that owns canitrunpc.com)
 *      -> My Profile -> API Tokens -> Create Token -> Custom token.
 *   2. Permissions:
 *        Account | Cloudflare Pages      | Edit
 *        Account | D1                    | Edit
 *        Account | Workers KV Storage    | Edit
 *        Account | Workers R2 Storage    | Edit
 *        Zone    | Zone                  | Read
 *        Zone    | DNS                   | Edit
 *        Zone    | Cache Rules           | Edit
 *        Zone    | Cache Purge           | Purge
 *      Account Resources: that account. Zone Resources: canitrunpc.com.
 *   3. Save the token as the only line of  .cloudflare/token
 *      — .cloudflare/token.txt works too, because Windows editors append the
 *      extension to a file saved without one.
 *      Never paste a token into chat or a commit.
 *
 * Then every command runs with no browser and no login:
 *   npm run cf -- whoami
 *   npm run deploy
 *   npm run db:migrate
 *
 * CLOUDFLARE_API_TOKEN in the environment wins over the file, so CI can set it
 * without touching any of this.
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, '.cloudflare');
const TOKEN_FILES = [path.join(DIR, 'token'), path.join(DIR, 'token.txt')];
const ACCOUNT_FILES = [path.join(DIR, 'account'), path.join(DIR, 'account.txt')];

/** First usable line across the given files, ignoring comments and blanks. */
function firstLine(...files) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    const line = readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      // Tolerate a pasted "api: <value>" prefix.
      .map(l => l.replace(/^(api|token|account)\s*[:=]\s*/i, ''))
      .find(l => l && !l.startsWith('#'));
    if (line) return line;
  }
  return null;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node scripts/cf.mjs <wrangler args…>   e.g. whoami');
  process.exit(2);
}

const token = process.env.CLOUDFLARE_API_TOKEN || firstLine(...TOKEN_FILES);
if (!token) {
  console.error(
    `No Cloudflare API token found.\n\n` +
    `Create one for the account that owns canitrunpc.com (the permission list\n` +
    `is in the comment at the top of scripts/cf.mjs), then save it as the only\n` +
    `line of:\n\n  ${TOKEN_FILES[0]}\n\n` +
    `That folder is git-ignored, so the token never leaves this machine.`
  );
  process.exit(1);
}

const env = { ...process.env, CLOUDFLARE_API_TOKEN: token };

// Optional: pin the account id, needed only if the token can see several.
const account = process.env.CLOUDFLARE_ACCOUNT_ID || firstLine(...ACCOUNT_FILES);
if (account) env.CLOUDFLARE_ACCOUNT_ID = account;

/* An OAuth session on this machine would otherwise take precedence for some
   commands; clearing it here keeps one command from silently talking to the
   other account. */
delete env.CLOUDFLARE_API_KEY;
delete env.CLOUDFLARE_EMAIL;

/* Run wrangler's own entry point with this Node, not `npx` through a shell.
   On Windows a shell is needed to find npx.cmd, and a shell concatenates the
   arguments unescaped — so `d1 execute --command "SELECT a, b FROM t"`
   reached wrangler split at every space and it printed its help instead. */
const WRANGLER = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
if (!existsSync(WRANGLER)) {
  console.error('wrangler is not installed — run `npm ci` first.');
  process.exit(1);
}

const child = spawn(process.execPath, [WRANGLER, ...args], {
  cwd: ROOT,
  env,
  stdio: 'inherit'
});
child.on('exit', code => process.exit(code ?? 1));
