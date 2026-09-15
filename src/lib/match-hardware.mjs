/**
 * Maps the free-text part names publishers write in Steam requirements onto
 * rows in our curated hardware datasets.
 *
 * The rule that matters: we only ever return a part we are confident about.
 * A requirement line we cannot resolve returns null, and the caller stores the
 * publisher's original string with no score attached. Guessing here would put
 * invented numbers in front of users, which is exactly what this rebuild exists
 * to remove.
 */

/** Lowercase, unify separators, drop vendor noise that carries no information. */
export function normalisePart(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[®™©]/g, ' ')
    .replace(/\((?:tm|r|c)\)/g, ' ')
    .replace(/[–—−]/g, '-')
    .replace(/\bnvidia\b|\bgeforce\b|\bamd\b|\bati\b|\bradeon\b|\bintel\b|\bcore\b|\bprocessor\b|\bcpu\b|\bgpu\b|\bseries\b/g, ' ')
    .replace(/\bgraphics card\b|\bvideo card\b|\bgraphics\b/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/[^a-z0-9+\-. ]/g, ' ')
    .replace(/\s+/g, ' ')
    // "1060 3 GB" and "580 4 gb" must fold to the same shape as the "3gb"
    // aliases, otherwise a 3GB card silently matches its 6GB sibling.
    .replace(/(\d)\s*gb\b/g, '$1gb')
    .replace(/(\d)\s*mb\b/g, '$1mb')
    // Publishers write both "i5-4690" and "i5 4690"; same part.
    .replace(/\b(i[3579])\s+(\d{3,5})/g, '$1-$2')
    .replace(/\b(fx)\s+(\d{4})/g, '$1-$2')
    .trim();
}

/** Build a lookup of alias -> row, sorted so the longest alias wins. */
export function buildIndex(rows, aliasIdx) {
  const entries = [];
  for (const row of rows) {
    const aliases = row[aliasIdx] || [];
    const all = new Set([normalisePart(row[0]), ...aliases.map(normalisePart)]);
    for (const a of all) {
      if (a.length >= 3) entries.push({ alias: a, row });
    }
  }
  // Longest alias first: "rtx 4060 ti" must beat "rtx 4060".
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

/**
 * Resolve one requirement string to a hardware row.
 * Returns { row, alias, exact } or null.
 */
export function matchPart(text, index) {
  const q = normalisePart(text);
  if (!q || q.length < 3) return null;

  // Exact normalised equality is the strongest signal.
  for (const e of index) {
    if (e.alias === q) return { row: e.row, alias: e.alias, exact: true };
  }

  // Otherwise the longest alias that appears as a whole token-run in the text.
  for (const e of index) {
    if (containsTokenRun(q, e.alias)) {
      return { row: e.row, alias: e.alias, exact: false };
    }
  }
  return null;
}

/**
 * Substring match constrained to token boundaries, so "gtx 106" never matches
 * "gtx 1060" and "i5-750" never matches "i5-7500".
 */
function containsTokenRun(haystack, needle) {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) return false;
    const before = i === 0 ? ' ' : haystack[i - 1];
    const after = i + needle.length >= haystack.length ? ' ' : haystack[i + needle.length];
    // A dash can precede a model name once separators are collapsed
    // ("4 threads-i5-750"), so it counts as a boundary too.
    const okBefore = before === ' ' || before === '-';
    // Allow a trailing size qualifier ("gtx 1060 6gb") but not a digit/letter
    // that would change the model ("rtx 4060" inside "rtx 4060ti").
    const okAfter = after === ' ' || after === '-' || after === '.';
    if (okBefore && okAfter) return true;
    from = i + 1;
  }
}

/**
 * Resolve a full requirement line that may list several alternatives.
 * Publishers write the *minimum acceptable* alternatives, so when several
 * resolve we take the weakest — that is the real bar to clear.
 */
export function matchRequirementLine(line, index, alternatives) {
  const candidates = alternatives && alternatives.length ? alternatives : [line];
  const hits = [];
  for (const c of candidates) {
    const m = matchPart(c, index);
    if (m) hits.push(m);
  }
  if (!hits.length) {
    // Last resort: scan the whole line, in case splitting broke the model name.
    const whole = matchPart(line, index);
    if (whole) hits.push(whole);
  }
  if (!hits.length) return null;

  // perf is the last-but-one column in both datasets; resolve by position.
  const perfOf = h => h.row[h.row.length - 2];
  hits.sort((a, b) => perfOf(a) - perfOf(b));
  return { best: hits[0], all: hits };
}
