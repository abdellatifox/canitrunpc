/**
 * Games we cover before they ship.
 *
 * Why this list is curated by hand: the catalogue is built from SteamSpy
 * ownership, and an unreleased game has no owners, so upcoming titles are
 * invisible to that pipeline no matter how much they are being discussed.
 * These are the ones worth a page early — a game's requirements page has
 * almost no competition months before launch.
 *
 * Only `appid` drives the fetch. Everything shown on the site (name, date,
 * publisher, requirements) comes from that game's Steam page via
 * scripts/fetch-upcoming.mjs — nothing here is typed by hand, so nothing here
 * can go stale or be wrong.
 *
 * `buzz` is only set where a named source ranked the game, and it is rendered
 * with that source next to it. No invented hype.
 */

/* Each claim is worded as its source words it, and links the page that says
   it. Both were checked by reading the source (2026-09-12); an earlier version
   linked the Fable figure to a forum thread that does not contain it. */
const GDC_SGF26 = {
  label: "In GameDiscoverCo's top 10 most-wishlisted Steam games from Summer Game Fest 2026",
  source: 'https://newsletter.gamediscover.co/p/what-were-the-top-games-and-showcases'
};
const FABLE_JUNE26 = {
  label: 'Jumped to No. 3 in Steam wishlist adds after its June 2026 date reveal (~125k)',
  source: 'https://www.gamer.org/the-most-wishlisted-games-on-steam-right-now-and-which-ones-will-actually-ship/'
};

export const UPCOMING_GAMES = [
  // --- dated 2027 ---------------------------------------------------------
  { appid: 4814120, name: 'ANANTA' },
  { appid: 4253770, name: 'Muramasa: Revenant Blades' },
  { appid: 2590240, name: 'METRO 2039' },
  { appid: 3130220, name: 'Sagas of Lumin' },
  { appid: 3558670, name: 'Tomb Raider: Legacy of Atlantis' },
  { appid: 2963950, name: 'Persona 4 Revival' },
  { appid: 2769570, name: 'Fable', buzz: FABLE_JUNE26 },
  { appid: 3230960, name: 'EXODUS' },
  { appid: 4354570, name: 'FINAL FANTASY VII REVELATION' },
  { appid: 2017940, name: 'Pony Island 2: Panda Circus' },
  { appid: 4507990, name: 'Wo Long 2: Wings of Ember' },
  { appid: 3727390, name: 'The Expanse: Osiris Reborn' },

  // --- 2027, month not announced -----------------------------------------
  { appid: 4824610, name: 'Resident Evil Veronica', buzz: GDC_SGF26 },
  { appid: 3216600, name: 'KINGDOM HEARTS IV' },
  { appid: 2439280, name: 'Clockwork Revolution' },
  { appid: 3645160, name: 'Frostpunk: 1886' },
  { appid: 2581850, name: 'HUMANKIND 2' },
  { appid: 2849490, name: 'Outward 2' },
  { appid: 1857810, name: 'DRAGON BALL XENOVERSE 3' },
  { appid: 1731290, name: 'SPINE' },
  { appid: 2838950, name: 'Game of Thrones: War for Westeros' },
  { appid: 3621390, name: "Tom Clancy's Rainbow Six Tactics" },
  { appid: 1952620, name: 'The Lost Wild' },
  { appid: 1757350, name: 'ILL', buzz: GDC_SGF26 },
  { appid: 2161710, name: 'NO LAW' },
  { appid: 2924520, name: 'ONTOS' },
  { appid: 3633680, name: 'Sea of Remnants' },
  { appid: 1373530, name: 'Militsioner' },
  { appid: 2956040, name: 'PVKK' },
  { appid: 4829700, name: 'Monster Hunter Wilds: Ascendance' },
  { appid: 3603000, name: 'Maneater 2' },
  { appid: 4223290, name: 'Mega Man: Dual Override' },

  // --- due in the coming months (late 2026) -------------------------------
  // Added 2026-09-15 for CanItRunPC: searched titles missing from the list
  // (Semrush US: "gears of war e-day release date" 720/mo).
  { appid: 3010850, name: 'Gears of War: E-Day' },
  { appid: 4115450, name: 'Phantom Blade Zero' },

  // --- announced, date still open (most land in 2027 or later) ------------
  // Added 2026-09-15 (Semrush US: "ark 2 release date" 4,400/mo,
  // "atomic heart 2 release date" 880/mo).
  { appid: 2050420, name: 'ARK 2' },
  { appid: 3788800, name: 'Atomic Heart 2' },
  { appid: 4767480, name: 'Lords of the Fallen II', buzz: GDC_SGF26 },
  { appid: 4743930, name: 'Guild Wars 3', buzz: GDC_SGF26 },
  { appid: 2865960, name: 'SAW: Genesis', buzz: GDC_SGF26 },
  { appid: 3524720, name: 'HAEX', buzz: GDC_SGF26 },
  { appid: 4665290, name: 'Alien: Isolation 2', buzz: GDC_SGF26 },
  { appid: 1884870, name: 'The Wolf Among Us 2' },
  { appid: 3703630, name: 'The Talos Principle 3' },
  { appid: 4744030, name: 'Star Trek: Shadow Frontier' },
  { appid: 4039200, name: 'Exterminauts' },
  { appid: 2873440, name: 'Chrono Odyssey' },
  { appid: 1967610, name: 'Turok: Origins' },
  { appid: 4245560, name: 'Spyro: A Realm Beyond' },
  { appid: 2235430, name: 'Holstin' },
  { appid: 3642020, name: 'El Paso, Elsewhere 2' },
  { appid: 3292470, name: 'Tides of Annihilation' },
  { appid: 1340720, name: 'State of Decay 3' },
  { appid: 388860, name: 'Judas' },
  { appid: 2719590, name: 'Light No Fire' }
];

export const UPCOMING_APPIDS = new Set(UPCOMING_GAMES.map(g => g.appid));
