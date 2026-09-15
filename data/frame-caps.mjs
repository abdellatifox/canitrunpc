/**
 * Games that enforce a hard frame-rate cap in the engine.
 *
 * Without this, the FPS model happily reports 113 FPS for Elden Ring — a game
 * that will not exceed 60 no matter what hardware you own. The estimate would
 * be arithmetically consistent and practically wrong.
 *
 * Keyed by Steam appid, because names change. Only titles with a documented,
 * on-by-default cap belong here; a setting the user can toggle does not count.
 */
export const FRAME_CAPS = {
  1245620: { fps: 60, note: 'Elden Ring is locked to 60 FPS by the engine.' },
  374320:  { fps: 60, note: 'DARK SOULS III is locked to 60 FPS by the engine.' },
  335300:  { fps: 60, note: 'DARK SOULS II: Scholar of the First Sin is locked to 60 FPS.' },
  814380:  { fps: 60, note: 'Sekiro: Shadows Die Twice is locked to 60 FPS by the engine.' },
  1888160: { fps: 60, note: 'ARMORED CORE VI is locked to 60 FPS by the engine.' },
  2622380: { fps: 60, note: 'ELDEN RING NIGHTREIGN is locked to 60 FPS by the engine.' },
  1259420: { fps: 60, note: 'Persona 5 Royal is locked to 60 FPS.' },
  485510:  { fps: 60, note: 'Nioh is locked to 60 FPS by default.' }
};
