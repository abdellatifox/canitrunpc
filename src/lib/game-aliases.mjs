/**
 * Abbreviation handling for game search.
 *
 * People type "gta", "rdr2", "bg3" — none of which appear as a substring of
 * "Grand Theft Auto V", "Red Dead Redemption 2" or "Baldur's Gate 3". Without
 * this layer the search silently fails on exactly the queries users are most
 * likely to type.
 *
 * Acronyms are derived mechanically from the title, so the coverage grows with
 * the catalogue instead of needing a hand-maintained list. MANUAL_ALIASES only
 * carries the cases the mechanical rule cannot reach.
 */

/** Words that carry no signal in an acronym. */
const STOP = new Set([
  'of', 'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'from',
  'with', 'de', 'la', 'le', 'el', 'x', 'vs', 'or'
]);

/** Roman numerals we should treat as their digit form and vice versa. */
const ROMAN = {
  i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7',
  viii: '8', ix: '9', x: '10', xi: '11', xii: '12', xiii: '13',
  xiv: '14', xv: '15', xvi: '16', xvii: '17'
};

/** Hand-written synonyms for titles whose common name is not derivable. */
export const MANUAL_ALIASES = {
  "playerunknown's battlegrounds": ['pubg'],
  'pubg: battlegrounds': ['pubg'],
  // appid 730 is Counter-Strike 2 now; SteamSpy may still serve the old title.
  'counter-strike: global offensive': ['csgo', 'cs go', 'cs2', 'counter strike 2'],
  'counter-strike 2': ['cs2', 'cs'],
  'dota 2': ['dota'],
  'league of legends': ['lol'],
  'world of warcraft': ['wow'],
  'the elder scrolls v: skyrim': ['skyrim', 'tes5'],
  'the elder scrolls online': ['eso'],
  "baldur's gate 3": ['bg3'],
  'red dead redemption 2': ['rdr2'],
  'red dead redemption': ['rdr'],
  'the last of us part i': ['tlou'],
  'the last of us part ii remastered': ['tlou2'],
  'call of duty': ['cod'],
  'need for speed': ['nfs'],
  'kingdom come: deliverance ii': ['kcd2'],
  'kingdom come: deliverance': ['kcd'],
  'no man\'s sky': ['nms'],
  'euro truck simulator 2': ['ets2'],
  'american truck simulator': ['ats'],
  'microsoft flight simulator': ['msfs'],
  'tom clancy\'s rainbow six siege': ['r6', 'r6s', 'siege'],
  'apex legends': ['apex'],
  'black myth: wukong': ['wukong'],
  'elden ring': ['er'],
  'monster hunter: world': ['mhw'],
  'monster hunter wilds': ['mh wilds'],
  'final fantasy': ['ff'],
  'god of war': ['gow'],
  'god of war ragnarök': ['gow ragnarok', 'gowr'],
  'assassin\'s creed': ['ac'],
  'cyberpunk 2077': ['cp77', 'cyberpunk'],
  'helldivers 2': ['hd2'],
  'path of exile 2': ['poe2'],
  'path of exile': ['poe'],
  'escape from tarkov': ['eft', 'tarkov'],
  'sid meier\'s civilization vi': ['civ6', 'civ 6'],
  'sid meier\'s civilization vii': ['civ7', 'civ 7'],
  'garry\'s mod': ['gmod'],
  'team fortress 2': ['tf2'],
  'half-life 2': ['hl2'],
  'half-life: alyx': ['hla'],
  'portal 2': ['p2'],
  'star wars jedi: survivor': ['jedi survivor'],
  'marvel\'s spider-man 2': ['spiderman 2'],
  'the finals': ['finals'],
  'dead by daylight': ['dbd'],
  'rocket league': ['rl'],
  'fall guys': ['fg'],
  'among us': ['amongus'],
  'stardew valley': ['sdv'],
  'terraria': ['tr'],
  'minecraft': ['mc'],
  'valorant': ['val'],
  'overwatch 2': ['ow2'],
  'diablo iv': ['d4', 'diablo 4'],
  'diablo ii: resurrected': ['d2r'],
  'starcraft ii': ['sc2'],
  'hearts of iron iv': ['hoi4'],
  'europa universalis iv': ['eu4'],
  'crusader kings iii': ['ck3'],
  'cities: skylines ii': ['cs2 cities', 'cities skylines 2'],
  'battlefield 2042': ['bf2042'],
  'battlefield v': ['bfv'],
  'battlefield 1': ['bf1'],
  'the sims 4': ['sims 4', 'ts4'],
};

/**
 * Plain-object lookup by an arbitrary game title is unsafe: a game called
 * "Constructor" (there is one) resolves `MANUAL_ALIASES[lower]` to
 * Object.prototype.constructor and the spread then throws. A Map has no
 * inherited keys.
 */
const MANUAL_MAP = new Map(Object.entries(MANUAL_ALIASES));

/**
 * Derive searchable abbreviations from a title.
 * "Red Dead Redemption 2" -> ["rdr2", "rdr"]
 * "Grand Theft Auto V"    -> ["gtav", "gta", "gta5"]
 */
export function deriveAliases(name) {
  const out = new Set();
  const lower = String(name).toLowerCase().trim();

  // Hand-written aliases are trusted at any length; "cs" and "bg3" are real
  // things people type. Derived ones are held to 3+ characters because
  // two-letter initials collide with far too much ("er", "hl", "bg").
  for (const a of MANUAL_MAP.get(lower) ?? []) out.add(a);

  // Split on separators, keeping alphanumeric words.
  const words = lower
    .replace(/[^a-z0-9\s:'’-]/g, ' ')
    .split(/[\s:_-]+/)
    .filter(Boolean);

  const significant = words.filter(w => !STOP.has(w));
  if (significant.length >= 2) {
    // Letters take the initial; a trailing number stays whole ("2" in rdr2).
    let acro = '';
    let tail = '';
    for (const w of significant) {
      if (/^\d+$/.test(w)) tail = w;
      else if (ROMAN[w] !== undefined) tail = ROMAN[w];
      else acro += w[0];
    }
    if (acro.length >= 3) {
      out.add(acro);
      if (tail) out.add(acro + tail);
    } else if (acro.length === 2 && tail) {
      // "bg" alone is noise, but "bg3" identifies one game.
      out.add(acro + tail);
    }
  }

  out.delete(lower);
  const manual = new Set(MANUAL_MAP.get(lower) ?? []);
  return [...out].filter(a =>
    a.length <= 14 && (manual.has(a) || a.length >= 3)
  );
}
