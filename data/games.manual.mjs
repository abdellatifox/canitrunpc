/**
 * Games that are not on Steam, so the Steam pipeline cannot reach them.
 *
 * Every entry records the publisher's own stated requirements and the page
 * they were taken from. Where a publisher has not stated a field, it is null —
 * we do not fill gaps with estimates. Where a publisher has not published
 * requirements at all (an unreleased title, say), `unpublished: true` says so
 * and the site tells the user that plainly instead of inventing a spec.
 *
 * `verified` is the date a human last checked the source page.
 */

export const MANUAL_GAMES = [
  {
    slug: 'valorant',
    name: 'VALORANT',
    year: 2020,
    genre: 'Shooter',
    developer: 'Riot Games',
    source: 'https://support-valorant.riotgames.com/hc/en-us/articles/360043312213',
    verified: '2026-09-04',
    minimum: {
      os: 'Windows 10',
      cpu: 'Intel Core 2 Duo E8400 or AMD Athlon 200GE',
      gpu: 'Intel HD 4000 or AMD Radeon R5 200',
      ram: 4,
      vram: 1,
      storage: 35,
      directx: 'DirectX 11',
      note: 'Riot states this tier targets 30 FPS.'
    },
    recommended: {
      os: 'Windows 10',
      cpu: 'Intel Core i3-4150 or AMD Ryzen 3 1200',
      gpu: 'NVIDIA GeForce GT 730 or AMD Radeon R7 240',
      ram: 4,
      vram: 1,
      storage: 35,
      directx: 'DirectX 11',
      note: 'Riot states this tier targets 60 FPS. Their separate 144 FPS tier lists an Intel Core i5-4460 or Ryzen 5 2600X with a GTX 1050 Ti or Radeon R7 370.'
    }
  },
  {
    slug: 'league-of-legends',
    name: 'League of Legends',
    year: 2009,
    genre: 'MOBA',
    developer: 'Riot Games',
    source: 'https://www.leagueoflegends.com/en-us/news/game-updates/updated-min-and-recommended-specs-for-lol-tft/',
    verified: '2026-09-04',
    minimum: {
      os: 'Windows 10 64-bit with TPM 2.0',
      cpu: 'Intel Core i3-530',
      gpu: 'NVIDIA GeForce 400 series, AMD Radeon HD 6570 or Intel HD 4600',
      ram: 2,
      vram: 1,
      storage: 12,
      directx: 'DirectX 11',
      note: 'TPM 2.0 is required by Riot Vanguard.'
    },
    recommended: {
      os: 'Windows 10 64-bit with TPM 2.0',
      cpu: null,
      gpu: 'NVIDIA GeForce 560, AMD Radeon HD 6950 or Intel UHD 630',
      ram: 4,
      vram: 2,
      storage: 16,
      directx: 'DirectX 11',
      note: 'Riot recommends installing on an SSD. No recommended processor is stated.'
    }
  },
  {
    slug: 'fortnite',
    name: 'Fortnite',
    year: 2017,
    genre: 'Battle Royale',
    developer: 'Epic Games',
    source: 'https://www.epicgames.com/help/en-US/c-Category_Fortnite/c-Fortnite_BattleRoyale/what-are-the-system-requirements-for-fortnite-a000084828',
    verified: '2026-09-04',
    minimum: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i3-3225',
      gpu: 'Intel HD 4000',
      ram: 8,
      vram: null,
      storage: 26,
      directx: 'DirectX 11',
      note: 'Epic states this targets 720p at low settings.'
    },
    recommended: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i7-8700 or AMD Ryzen 7 3700X',
      gpu: 'NVIDIA GeForce RTX 3070 or AMD Radeon RX 6700 XT',
      ram: 16,
      vram: 8,
      storage: 26,
      directx: 'DirectX 12',
      note: 'This is Epic’s tier for the Epic quality preset with Lumen and Nanite enabled; the older recommended tier was far lower.'
    }
  },
  {
    slug: 'world-of-warcraft',
    name: 'World of Warcraft: The War Within',
    year: 2024,
    genre: 'MMO',
    developer: 'Blizzard Entertainment',
    source: 'https://battle.net/support/article/353553',
    verified: '2026-09-04',
    minimum: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i5-4690 (4th gen Haswell) or AMD Ryzen (Zen), 4 cores at 3.0 GHz',
      gpu: 'NVIDIA GeForce GTX 960, AMD Radeon RX 470 (GCN 4th gen) or Intel Iris Xe',
      ram: 8,
      vram: 3,
      storage: 128,
      directx: 'DirectX 12',
      note: 'Blizzard states an SSD is required.'
    },
    recommended: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i7-9700 or AMD Ryzen 5 2600',
      gpu: 'NVIDIA GeForce RTX 2080 or AMD Radeon RX 6800 (RDNA 2) or Intel Arc 7',
      ram: 16,
      vram: 8,
      storage: 128,
      directx: 'DirectX 12',
      note: 'Blizzard notes the game will attempt to run below minimum spec with a diminished experience.'
    }
  },
  {
    slug: 'minecraft',
    name: 'Minecraft: Java Edition',
    year: 2011,
    genre: 'Sandbox',
    developer: 'Mojang Studios',
    source: 'https://www.minecraft.net/en-us/store/minecraft-deluxe-collection-pc',
    verified: '2026-09-04',
    minimum: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i3-3210 or AMD A8-7600 APU',
      gpu: 'Intel HD Graphics 4000 or AMD Radeon R5',
      ram: 4,
      vram: null,
      storage: 1,
      directx: 'DirectX 11',
      note: 'Integrated graphics are explicitly supported at this tier.'
    },
    recommended: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i5-4690 or AMD A10-7800',
      gpu: 'NVIDIA GeForce 700 series or AMD Radeon Rx 200 series',
      ram: 8,
      vram: null,
      storage: 4,
      directx: 'DirectX 11',
      note: 'Mojang recommends an SSD.'
    }
  },
];
