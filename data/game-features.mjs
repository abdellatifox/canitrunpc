/**
 * Graphics-feature flags per game.
 *
 * Steam's API exposes no structured field for DLSS, FSR or ray-tracing support,
 * and the requirement text almost never mentions them. These are therefore
 * curated, and only titles listed here count as *known*. Everything else
 * resolves to `null` — "not verified", which the feature pages state plainly
 * rather than implying "not supported". The old seed data conflated the two.
 *
 * Keyed by **Steam appid**, not slug: slugs are generated from titles and shift
 * with them ("Sekiro: Shadows Die Twice" is published as the GOTY Edition, the
 * a re-release as a Complete Edition), and an earlier slug-keyed version silently
 * failed to match 27 of 62 entries. Non-Steam titles have no appid, so those are
 * keyed by their fixed manual slug in MANUAL_FEATURES below.
 *
 * `rtIntensity`: light | medium | heavy | path — only meaningful when rt is true.
 * `cpuBound`: the frame rate is set by the processor more than the graphics card.
 *
 * Verified 2026-09.
 */
export const GAME_FEATURES_BY_APPID = {
  1091500: { name: 'Cyberpunk 2077',            dlss: true,  fsr: true,  rt: true,  rtIntensity: 'path',   cpuBound: false },
  1245620: { name: 'ELDEN RING',                dlss: false, fsr: false, rt: true,  rtIntensity: 'light',  cpuBound: false },
  2622380: { name: 'ELDEN RING NIGHTREIGN',     dlss: false, fsr: false, rt: false, cpuBound: false },
  1174180: { name: 'Red Dead Redemption 2',     dlss: true,  fsr: true,  rt: false, cpuBound: false },
  730:     { name: 'Counter-Strike 2',          dlss: false, fsr: true,  rt: false, cpuBound: true  },
  1086940: { name: "Baldur's Gate 3",           dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  990080:  { name: 'Hogwarts Legacy',           dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy',  cpuBound: false },
  2842040: { name: 'Star Wars Outlaws',         dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy',  cpuBound: false },
  1903340: { name: 'Alan Wake 2',               dlss: true,  fsr: true,  rt: true,  rtIntensity: 'path',   cpuBound: false },
  2358720: { name: 'Black Myth: Wukong',        dlss: true,  fsr: true,  rt: true,  rtIntensity: 'path',   cpuBound: false },
  553850:  { name: 'HELLDIVERS 2',              dlss: false, fsr: false, rt: false, cpuBound: true  },
  1623730: { name: 'Palworld',                  dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  1716740: { name: 'Starfield',                 dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  2322010: { name: 'God of War Ragnarök',       dlss: true,  fsr: true,  rt: false, cpuBound: false },
  2420110: { name: 'Horizon Forbidden West',    dlss: true,  fsr: true,  rt: false, cpuBound: false },
  2651280: { name: "Marvel's Spider-Man 2",     dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy',  cpuBound: true  },
  2677660: { name: 'Indiana Jones: Great Circle', dlss: true, fsr: true, rt: true,  rtIntensity: 'path',   cpuBound: false },
  2344520: { name: 'Diablo IV',                 dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: false },
  2357570: { name: 'Overwatch 2',               dlss: false, fsr: true,  rt: false, cpuBound: true  },
  252950:  { name: 'Rocket League',             dlss: false, fsr: false, rt: false, cpuBound: true  },
  2694490: { name: 'Path of Exile 2',           dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  230410:  { name: 'Warframe',                  dlss: true,  fsr: true,  rt: false, cpuBound: false },
  1085660: { name: 'Destiny 2',                 dlss: true,  fsr: true,  rt: false, cpuBound: false },
  578080:  { name: 'PUBG: BATTLEGROUNDS',       dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  413150:  { name: 'Stardew Valley',            dlss: false, fsr: false, rt: false, cpuBound: false },
  367520:  { name: 'Hollow Knight',             dlss: false, fsr: false, rt: false, cpuBound: false },
  945360:  { name: 'Among Us',                  dlss: false, fsr: false, rt: false, cpuBound: false },
  1145350: { name: 'Hades II',                  dlss: false, fsr: false, rt: false, cpuBound: false },
  2050650: { name: 'Resident Evil 4',           dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: false },
  1888930: { name: 'The Last of Us Part I',     dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  2515020: { name: 'FINAL FANTASY XVI',         dlss: true,  fsr: true,  rt: false, cpuBound: false },
  1868140: { name: 'DAVE THE DIVER',            dlss: false, fsr: false, rt: false, cpuBound: false },
  1649240: { name: 'Returnal',                  dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: false },
  1895880: { name: 'Ratchet & Clank: Rift Apart', dlss: true, fsr: true, rt: true,  rtIntensity: 'heavy',  cpuBound: false },
  105600:  { name: 'Terraria',                  dlss: false, fsr: false, rt: false, cpuBound: false },
  814380:  { name: 'Sekiro (GOTY)',             dlss: false, fsr: false, rt: false, cpuBound: false },
  1475810: { name: 'Ghostwire: Tokyo',          dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy',  cpuBound: false },
  2488620: { name: 'F1 24',                     dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: false },
  1172470: { name: 'Apex Legends',              dlss: false, fsr: false, rt: false, cpuBound: true  },
  570:     { name: 'Dota 2',                    dlss: false, fsr: false, rt: false, cpuBound: true  },
  440:     { name: 'Team Fortress 2',           dlss: false, fsr: false, rt: false, cpuBound: true  },
  220:     { name: 'Half-Life 2',               dlss: false, fsr: false, rt: false, cpuBound: false },
  620:     { name: 'Portal 2',                  dlss: false, fsr: false, rt: false, cpuBound: false },
  949230:  { name: 'Cities: Skylines II',       dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  489830:  { name: 'Skyrim Special Edition',    dlss: false, fsr: false, rt: false, cpuBound: true  },
  275850:  { name: "No Man's Sky",              dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  526870:  { name: 'Satisfactory',              dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  252490:  { name: 'Rust',                      dlss: true,  fsr: true,  rt: false, cpuBound: true  },
  2073850: { name: 'THE FINALS',                dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: true  },
  2246340: { name: 'Monster Hunter Wilds',      dlss: true,  fsr: true,  rt: true,  rtIntensity: 'medium', cpuBound: true  },
  1771300: { name: 'Kingdom Come: Deliverance II', dlss: true, fsr: true, rt: false, cpuBound: true  },
  17470:   { name: 'Dead Space (2008)',         dlss: false, fsr: false, rt: false, cpuBound: false },
  1174370: { name: 'STAR WARS Jedi: Survivor',  dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy',  cpuBound: true  },
  1245040: { name: 'Forza Horizon 5',           dlss: true,  fsr: true,  rt: true,  rtIntensity: 'light',  cpuBound: false },
  1817070: { name: "Marvel's Spider-Man Remastered", dlss: true, fsr: true, rt: true, rtIntensity: 'heavy', cpuBound: true }
};

/** Non-Steam titles, keyed by the fixed slug in data/games.manual.mjs. */
export const MANUAL_FEATURES = {
  'valorant':          { dlss: false, fsr: false, rt: false, cpuBound: true  },
  'league-of-legends': { dlss: false, fsr: false, rt: false, cpuBound: true  },
  'fortnite':          { dlss: true,  fsr: true,  rt: true,  rtIntensity: 'heavy', cpuBound: false },
  'world-of-warcraft': { dlss: false, fsr: true,  rt: true,  rtIntensity: 'light', cpuBound: true  },
  'minecraft':         { dlss: true,  fsr: false, rt: true,  rtIntensity: 'path',  cpuBound: true  }
};
