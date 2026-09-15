/**
 * Meta-description assembly that cannot overflow.
 *
 * A description is built from sentences in priority order and the ones that do
 * not fit are dropped whole. That matters because the variable part of these
 * strings is a game or part name, so a format that fits "Fable" can overflow
 * for "FINAL FANTASY VII REVELATION" — and Google cuts the line mid-word,
 * losing whatever mattered most at the end.
 */
export const DESC_MAX = 165;
export const TITLE_MAX = 65;

/** Joins the sentences that fit, in order, and drops the rest. */
export function fitMeta(parts: Array<string | false | null | undefined>, max = DESC_MAX): string {
  let out = '';
  for (const raw of parts) {
    if (!raw) continue;
    const part = raw.trim();
    if (!part) continue;
    const next = out ? `${out} ${part}` : part;
    if (next.length <= max) out = next;
  }
  // Nothing fit: the first sentence alone is over budget, so cut it at a word.
  if (!out) {
    const first = String(parts.find(Boolean) ?? '').trim();
    const cut = first.slice(0, max - 1);
    out = cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—-]$/, '') + '…';
  }
  return out;
}

/**
 * Fits a title into the budget by giving things up in order of least value:
 * first a shorter wording, then the brand suffix, and only as a last resort by
 * trimming the name itself at a word boundary.
 *
 * Long entity names are the whole problem here: "Warhammer 40,000: Dawn of War
 * II - Anniversary Edition (Classic)" is 63 characters before any of our own
 * words are added.
 */
export function fitTitle(
  name: string,
  suffixes: string[],
  brand: string,
  max = TITLE_MAX
): string {
  for (const suffix of suffixes) {
    if ((name + suffix + brand).length <= max) return name + suffix + brand;
  }
  // The brand is the first thing worth losing — the name carries the query.
  for (const suffix of suffixes) {
    if ((name + suffix).length <= max) return name + suffix;
  }
  const shortest = suffixes[suffixes.length - 1] ?? '';
  const room = Math.max(8, max - shortest.length - 1);
  const cut = name.slice(0, room);
  const atWord = cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut;
  return `${atWord.replace(/[:,\-–—]$/, '')}…${shortest}`;
}
