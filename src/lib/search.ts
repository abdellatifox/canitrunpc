/**
 * Ranking shared by the autocomplete endpoints.
 *
 * The ordering rule that matters for a type-ahead: a prefix match on the whole
 * string beats a prefix match on a later word, which beats a match in the
 * middle. Typing "gtx 10" should surface the GTX 1080 before the "Radeon RX
 * 580 (GTX 1060 class)" style entries, and typing "half" should put
 * "Half-Life" above "Behind Enemy Lines: Half Truth".
 */

export interface Suggestion {
  label: string;
  value: string;
  meta?: string;
  badge?: string;
}

export function normalise(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score a candidate against a query. Higher is better; 0 means no match.
 * `popularity` (0..1) only breaks ties between equally good text matches.
 */
export function scoreMatch(
  text: string,
  aliases: string[],
  query: string,
  popularity = 0,
  popularityWeight = 50
): number {
  const q = normalise(query);
  if (!q) return 0;

  const candidates = [normalise(text), ...aliases.map(normalise)];
  let best = 0;

  for (const c of candidates) {
    if (!c) continue;
    let s = 0;
    if (c === q) s = 1000;
    else if (c.startsWith(q)) s = 800 - Math.min(200, c.length - q.length);
    else {
      // Prefix of any word, e.g. "1080" inside "geforce gtx 1080 ti".
      const wordStart = c.split(' ').some(w => w.startsWith(q));
      if (wordStart) s = 600 - Math.min(200, c.length - q.length);
      else if (c.includes(q)) s = 400 - Math.min(200, c.length - q.length);
      else {
        // All query tokens present somewhere, in any order ("1080 gtx").
        const toks = q.split(' ').filter(Boolean);
        if (toks.length > 1 && toks.every(t => c.includes(t))) s = 300;
      }
    }
    if (s > best) best = s;
  }

  if (!best) return 0;
  return best + popularity * popularityWeight;
}

export function rank<T>(
  rows: T[],
  query: string,
  get: (row: T) => { text: string; aliases?: string[]; popularity?: number },
  limit = 12,
  /**
   * How much popularity may outweigh a tighter text match. Hardware needs
   * little (model names are precise). Game titles need a lot: without it,
   * "witcher" surfaced GWENT and Thronebreaker above The Witcher 3 purely
   * because their titles are shorter.
   */
  popularityWeight = 50
): T[] {
  const scored: Array<{ row: T; s: number }> = [];
  for (const row of rows) {
    const { text, aliases = [], popularity = 0 } = get(row);
    const s = scoreMatch(text, aliases, query, popularity, popularityWeight);
    if (s > 0) scored.push({ row, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map(x => x.row);
}

export const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300'
};
