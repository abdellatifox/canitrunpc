/**
 * Curated GPU dataset.
 *
 * `perf` is a relative gaming-performance index anchored at RTX 4090 = 100,
 * reflecting aggregate 1080p/1440p rasterised gaming performance from published
 * benchmark data. It is a *relative* figure: a card's number moves only when the
 * anchor changes, never to flatter a vendor.
 *
 * `aliases` exist so we can match the strings publishers actually write in Steam
 * system requirements ("NVIDIA GeForce GTX 1060 6GB", "GTX 1060", "Nvidia 1060").
 * Matching is done on a normalised form, so aliases only need to cover genuinely
 * different namings, not case or punctuation variants.
 *
 * Columns: [name, brand, year, vramGb, tdpW, msrpUsd|null, perf, [aliases]]
 * A null MSRP means the part never had a public launch price (OEM/integrated).
 */

export const GPU_ROWS = [
  // ---------------------------------------------------------------- NVIDIA RTX 50
  ['NVIDIA GeForce RTX 5090',        'NVIDIA', 2025, 32, 575, 1999, 128, ['rtx 5090']],
  ['NVIDIA GeForce RTX 5080',        'NVIDIA', 2025, 16, 360, 999,   89, ['rtx 5080']],
  ['NVIDIA GeForce RTX 5070 Ti',     'NVIDIA', 2025, 16, 300, 749,   78, ['rtx 5070 ti']],
  ['NVIDIA GeForce RTX 5070',        'NVIDIA', 2025, 12, 250, 549,   63, ['rtx 5070']],
  ['NVIDIA GeForce RTX 5060 Ti 16GB','NVIDIA', 2025, 16, 180, 429,   50, ['rtx 5060 ti 16gb', 'rtx 5060ti 16gb']],
  ['NVIDIA GeForce RTX 5060 Ti 8GB', 'NVIDIA', 2025,  8, 180, 379,   49, ['rtx 5060 ti 8gb']],
  ['NVIDIA GeForce RTX 5060',        'NVIDIA', 2025,  8, 145, 299,   41, ['rtx 5060']],
  // Reviews put it ~5-7% behind the RTX 4060 and clearly ahead of the RTX
  // 3060, consistent across Tom's Hardware, TweakTown and VideoCardz launch
  // coverage (July 2025).
  ['NVIDIA GeForce RTX 5050',        'NVIDIA', 2025,  8, 130, 249,   33, ['rtx 5050']],

  // ---------------------------------------------------------------- NVIDIA RTX 40
  ['NVIDIA GeForce RTX 4090',        'NVIDIA', 2022, 24, 450, 1599, 100, ['rtx 4090']],
  ['NVIDIA GeForce RTX 4080 SUPER',  'NVIDIA', 2024, 16, 320, 999,   84, ['rtx 4080 super']],
  ['NVIDIA GeForce RTX 4080',        'NVIDIA', 2022, 16, 320, 1199,  82, ['rtx 4080']],
  ['NVIDIA GeForce RTX 4070 Ti SUPER','NVIDIA',2024, 16, 285, 799,   74, ['rtx 4070 ti super']],
  ['NVIDIA GeForce RTX 4070 Ti',     'NVIDIA', 2023, 12, 285, 799,   69, ['rtx 4070 ti']],
  ['NVIDIA GeForce RTX 4070 SUPER',  'NVIDIA', 2024, 12, 220, 599,   64, ['rtx 4070 super']],
  ['NVIDIA GeForce RTX 4070',        'NVIDIA', 2023, 12, 200, 599,   55, ['rtx 4070']],
  ['NVIDIA GeForce RTX 4060 Ti 16GB','NVIDIA', 2023, 16, 165, 499,   43, ['rtx 4060 ti 16gb']],
  ['NVIDIA GeForce RTX 4060 Ti',     'NVIDIA', 2023,  8, 160, 399,   42, ['rtx 4060 ti', 'rtx 4060ti']],
  ['NVIDIA GeForce RTX 4060',        'NVIDIA', 2023,  8, 115, 299,   35, ['rtx 4060']],

  // ---------------------------------------------------------------- NVIDIA RTX 30
  ['NVIDIA GeForce RTX 3090 Ti',     'NVIDIA', 2022, 24, 450, 1999,  73, ['rtx 3090 ti']],
  ['NVIDIA GeForce RTX 3080 Ti',     'NVIDIA', 2021, 12, 350, 1199,  70, ['rtx 3080 ti']],
  ['NVIDIA GeForce RTX 3090',        'NVIDIA', 2020, 24, 350, 1499,  68, ['rtx 3090']],
  ['NVIDIA GeForce RTX 3080 12GB',   'NVIDIA', 2022, 12, 350, 799,   66, ['rtx 3080 12gb']],
  ['NVIDIA GeForce RTX 3080',        'NVIDIA', 2020, 10, 320, 699,   63, ['rtx 3080', 'rtx 3080 10gb']],
  ['NVIDIA GeForce RTX 3070 Ti',     'NVIDIA', 2021,  8, 290, 599,   54, ['rtx 3070 ti']],
  ['NVIDIA GeForce RTX 3070',        'NVIDIA', 2020,  8, 220, 499,   51, ['rtx 3070']],
  ['NVIDIA GeForce RTX 3060 Ti',     'NVIDIA', 2020,  8, 200, 399,   45, ['rtx 3060 ti', 'rtx 3060ti']],
  ['NVIDIA GeForce RTX 3060 12GB',   'NVIDIA', 2021, 12, 170, 329,   34, ['rtx 3060', 'rtx 3060 12gb']],
  ['NVIDIA GeForce RTX 3060 8GB',    'NVIDIA', 2022,  8, 170, 329,   31, ['rtx 3060 8gb']],
  ['NVIDIA GeForce RTX 3050 8GB',    'NVIDIA', 2022,  8, 130, 249,   22, ['rtx 3050', 'rtx 3050 8gb']],
  ['NVIDIA GeForce RTX 3050 6GB',    'NVIDIA', 2024,  6,  70, 179,   17, ['rtx 3050 6gb']],

  // ---------------------------------------------------------------- NVIDIA RTX 20
  ['NVIDIA GeForce RTX 2080 Ti',     'NVIDIA', 2018, 11, 250, 999,   50, ['rtx 2080 ti']],
  ['NVIDIA GeForce RTX 2080 SUPER',  'NVIDIA', 2019,  8, 250, 699,   43, ['rtx 2080 super']],
  ['NVIDIA GeForce RTX 2080',        'NVIDIA', 2018,  8, 215, 699,   41, ['rtx 2080']],
  ['NVIDIA GeForce RTX 2070 SUPER',  'NVIDIA', 2019,  8, 215, 499,   38, ['rtx 2070 super']],
  ['NVIDIA GeForce RTX 2070',        'NVIDIA', 2018,  8, 175, 499,   34, ['rtx 2070']],
  ['NVIDIA GeForce RTX 2060 SUPER',  'NVIDIA', 2019,  8, 175, 399,   33, ['rtx 2060 super']],
  ['NVIDIA GeForce RTX 2060 12GB',   'NVIDIA', 2021, 12, 184, 299,   31, ['rtx 2060 12gb']],
  ['NVIDIA GeForce RTX 2060',        'NVIDIA', 2019,  6, 160, 349,   29, ['rtx 2060']],

  // ---------------------------------------------------------------- NVIDIA GTX 16
  ['NVIDIA GeForce GTX 1660 Ti',     'NVIDIA', 2019,  6, 120, 279,   25, ['gtx 1660 ti']],
  ['NVIDIA GeForce GTX 1660 SUPER',  'NVIDIA', 2019,  6, 125, 229,   24, ['gtx 1660 super']],
  ['NVIDIA GeForce GTX 1660',        'NVIDIA', 2019,  6, 120, 219,   22, ['gtx 1660']],
  ['NVIDIA GeForce GTX 1650 SUPER',  'NVIDIA', 2019,  4, 100, 159,   19, ['gtx 1650 super']],
  ['NVIDIA GeForce GTX 1650',        'NVIDIA', 2019,  4,  75, 149,   14, ['gtx 1650']],

  // ---------------------------------------------------------------- NVIDIA GTX 10
  ['NVIDIA GeForce GTX 1080 Ti',     'NVIDIA', 2017, 11, 250, 699,   39, ['gtx 1080 ti']],
  ['NVIDIA GeForce GTX 1080',        'NVIDIA', 2016,  8, 180, 599,   32, ['gtx 1080']],
  ['NVIDIA GeForce GTX 1070 Ti',     'NVIDIA', 2017,  8, 180, 449,   30, ['gtx 1070 ti']],
  ['NVIDIA GeForce GTX 1070',        'NVIDIA', 2016,  8, 150, 379,   27, ['gtx 1070']],
  ['NVIDIA GeForce GTX 1060 6GB',    'NVIDIA', 2016,  6, 120, 249,   19, ['gtx 1060 6gb', 'gtx 1060']],
  ['NVIDIA GeForce GTX 1060 3GB',    'NVIDIA', 2016,  3, 120, 199,   17, ['gtx 1060 3gb']],
  ['NVIDIA GeForce GTX 1050 Ti',     'NVIDIA', 2016,  4,  75, 139,   11, ['gtx 1050 ti']],
  ['NVIDIA GeForce GTX 1050',        'NVIDIA', 2016,  2,  75, 109,    9, ['gtx 1050']],

  // ---------------------------------------------------------------- NVIDIA GTX 900
  ['NVIDIA GeForce GTX 980 Ti',      'NVIDIA', 2015,  6, 250, 649,   27, ['gtx 980 ti']],
  ['NVIDIA GeForce GTX 980',         'NVIDIA', 2014,  4, 165, 549,   22, ['gtx 980']],
  ['NVIDIA GeForce GTX 970',         'NVIDIA', 2014,  4, 145, 329,   19, ['gtx 970']],
  ['NVIDIA GeForce GTX 960',         'NVIDIA', 2015,  2, 120, 199,   12, ['gtx 960']],
  ['NVIDIA GeForce GTX 950',         'NVIDIA', 2015,  2,  90, 159,    9, ['gtx 950']],

  // ---------------------------------------------------------------- NVIDIA GTX 700/600
  ['NVIDIA GeForce GTX 780 Ti',      'NVIDIA', 2013,  3, 250, 699,   19, ['gtx 780 ti']],
  ['NVIDIA GeForce GTX 780',         'NVIDIA', 2013,  3, 250, 649,   17, ['gtx 780']],
  ['NVIDIA GeForce GTX 770',         'NVIDIA', 2013,  2, 230, 399,   13, ['gtx 770']],
  ['NVIDIA GeForce GTX 760',         'NVIDIA', 2013,  2, 170, 249,   10, ['gtx 760']],
  ['NVIDIA GeForce GTX 750 Ti',      'NVIDIA', 2014,  2,  60, 149,    7, ['gtx 750 ti']],
  ['NVIDIA GeForce GTX 680',         'NVIDIA', 2012,  2, 195, 499,   12, ['gtx 680']],
  ['NVIDIA GeForce GTX 670',         'NVIDIA', 2012,  2, 170, 399,   11, ['gtx 670']],
  ['NVIDIA GeForce GTX 660 Ti',      'NVIDIA', 2012,  2, 150, 299,    9, ['gtx 660 ti']],
  ['NVIDIA GeForce GTX 660',         'NVIDIA', 2012,  2, 140, 229,    8, ['gtx 660']],
  ['NVIDIA GeForce GTX 650 Ti',      'NVIDIA', 2012,  1, 110, 149,    5, ['gtx 650 ti']],
  ['NVIDIA GeForce GT 1030',         'NVIDIA', 2017,  2,  30,  79,    4, ['gt 1030']],
  ['NVIDIA GeForce GT 730',          'NVIDIA', 2014,  2,  49,  75,    2, ['gt 730']],

  // ---------------------------------------------------------------- NVIDIA laptop
  // perf cross-checked against Notebookcheck/Tom's Hardware RTX 50-laptop
  // launch coverage: the 5090 laptop chip lands close to a desktop 4070 Ti
  // SUPER/5070, the 5080 laptop chip benchmarks ~10% behind it and ~32%
  // behind its own desktop namesake, and the desktop 5070 runs 15-20%
  // ahead of the 5070 laptop chip.
  ['NVIDIA GeForce RTX 5090 Laptop', 'NVIDIA', 2025, 24, 150, null,  70, ['rtx 5090 laptop', 'rtx 5090 mobile']],
  ['NVIDIA GeForce RTX 5080 Laptop', 'NVIDIA', 2025, 16, 150, null,  66, ['rtx 5080 laptop', 'rtx 5080 mobile']],
  ['NVIDIA GeForce RTX 5070 Laptop', 'NVIDIA', 2025,  8, 115, null,  54, ['rtx 5070 laptop', 'rtx 5070 mobile']],
  ['NVIDIA GeForce RTX 4090 Laptop', 'NVIDIA', 2023, 16, 175, null,  63, ['rtx 4090 laptop', 'rtx 4090 mobile']],
  ['NVIDIA GeForce RTX 4080 Laptop', 'NVIDIA', 2023, 12, 150, null,  53, ['rtx 4080 laptop']],
  ['NVIDIA GeForce RTX 4070 Laptop', 'NVIDIA', 2023,  8, 115, null,  40, ['rtx 4070 laptop']],
  ['NVIDIA GeForce RTX 4060 Laptop', 'NVIDIA', 2023,  8, 115, null,  33, ['rtx 4060 laptop']],
  ['NVIDIA GeForce RTX 4050 Laptop', 'NVIDIA', 2023,  6,  95, null,  24, ['rtx 4050 laptop']],
  ['NVIDIA GeForce RTX 3080 Laptop', 'NVIDIA', 2021, 16, 165, null,  44, ['rtx 3080 laptop']],
  ['NVIDIA GeForce RTX 3070 Laptop', 'NVIDIA', 2021,  8, 140, null,  38, ['rtx 3070 laptop']],
  ['NVIDIA GeForce RTX 3060 Laptop', 'NVIDIA', 2021,  6, 115, null,  30, ['rtx 3060 laptop']],
  ['NVIDIA GeForce RTX 3050 Laptop', 'NVIDIA', 2021,  4,  75, null,  17, ['rtx 3050 laptop']],
  ['NVIDIA GeForce GTX 1660 Ti Laptop','NVIDIA',2019, 6,  80, null,  19, ['gtx 1660 ti laptop']],
  ['NVIDIA GeForce GTX 1650 Laptop', 'NVIDIA', 2019,  4,  50, null,  11, ['gtx 1650 laptop']],

  // ---------------------------------------------------------------- AMD RX 9000
  ['AMD Radeon RX 9070 XT',          'AMD', 2025, 16, 304, 599,  77, ['rx 9070 xt']],
  ['AMD Radeon RX 9070',             'AMD', 2025, 16, 220, 549,  68, ['rx 9070']],
  ['AMD Radeon RX 9060 XT 16GB',     'AMD', 2025, 16, 160, 349,  44, ['rx 9060 xt']],

  // ---------------------------------------------------------------- AMD RX 7000
  ['AMD Radeon RX 7900 XTX',         'AMD', 2022, 24, 355, 999,  86, ['rx 7900 xtx']],
  ['AMD Radeon RX 7900 XT',          'AMD', 2022, 20, 315, 899,  76, ['rx 7900 xt']],
  ['AMD Radeon RX 7900 GRE',         'AMD', 2023, 16, 260, 549,  66, ['rx 7900 gre']],
  ['AMD Radeon RX 7800 XT',          'AMD', 2023, 16, 263, 499,  60, ['rx 7800 xt']],
  ['AMD Radeon RX 7700 XT',          'AMD', 2023, 12, 245, 449,  52, ['rx 7700 xt']],
  ['AMD Radeon RX 7600 XT',          'AMD', 2024, 16, 190, 329,  37, ['rx 7600 xt']],
  ['AMD Radeon RX 7600',             'AMD', 2023,  8, 165, 269,  35, ['rx 7600']],

  // ---------------------------------------------------------------- AMD RX 6000
  ['AMD Radeon RX 6950 XT',          'AMD', 2022, 16, 335, 1099, 71, ['rx 6950 xt']],
  ['AMD Radeon RX 6900 XT',          'AMD', 2020, 16, 300, 999,  67, ['rx 6900 xt']],
  ['AMD Radeon RX 6800 XT',          'AMD', 2020, 16, 300, 649,  64, ['rx 6800 xt']],
  ['AMD Radeon RX 6800',             'AMD', 2020, 16, 250, 579,  56, ['rx 6800']],
  ['AMD Radeon RX 6750 XT',          'AMD', 2022, 12, 250, 549,  48, ['rx 6750 xt']],
  ['AMD Radeon RX 6700 XT',          'AMD', 2021, 12, 230, 479,  45, ['rx 6700 xt']],
  ['AMD Radeon RX 6700 10GB',        'AMD', 2021, 10, 175, 379,  40, ['rx 6700']],
  ['AMD Radeon RX 6650 XT',          'AMD', 2022,  8, 180, 399,  36, ['rx 6650 xt']],
  ['AMD Radeon RX 6600 XT',          'AMD', 2021,  8, 160, 379,  34, ['rx 6600 xt']],
  ['AMD Radeon RX 6600',             'AMD', 2021,  8, 132, 329,  29, ['rx 6600']],
  ['AMD Radeon RX 6500 XT',          'AMD', 2022,  4, 107, 199,  15, ['rx 6500 xt']],
  ['AMD Radeon RX 6400',             'AMD', 2022,  4,  53, 159,  11, ['rx 6400']],

  // ---------------------------------------------------------------- AMD RX 5000 / Vega
  ['AMD Radeon RX 5700 XT',          'AMD', 2019,  8, 225, 399,  38, ['rx 5700 xt']],
  ['AMD Radeon RX 5700',             'AMD', 2019,  8, 180, 349,  34, ['rx 5700']],
  ['AMD Radeon RX 5600 XT',          'AMD', 2020,  6, 150, 279,  30, ['rx 5600 xt']],
  ['AMD Radeon RX 5500 XT 8GB',      'AMD', 2019,  8, 130, 199,  20, ['rx 5500 xt']],
  ['AMD Radeon VII',                 'AMD', 2019, 16, 300, 699,  40, ['radeon vii', 'radeon 7']],
  ['AMD Radeon RX Vega 64',          'AMD', 2017,  8, 295, 499,  32, ['rx vega 64', 'vega 64']],
  ['AMD Radeon RX Vega 56',          'AMD', 2017,  8, 210, 399,  28, ['rx vega 56', 'vega 56']],

  // ---------------------------------------------------------------- AMD RX 400/500
  ['AMD Radeon RX 590',              'AMD', 2018,  8, 225, 279,  23, ['rx 590']],
  ['AMD Radeon RX 580 8GB',          'AMD', 2017,  8, 185, 229,  21, ['rx 580 8gb', 'rx 580']],
  ['AMD Radeon RX 580 4GB',          'AMD', 2017,  4, 185, 199,  20, ['rx 580 4gb']],
  ['AMD Radeon RX 570 4GB',          'AMD', 2017,  4, 150, 169,  18, ['rx 570']],
  ['AMD Radeon RX 560',              'AMD', 2017,  4,  60,  99,   9, ['rx 560']],
  ['AMD Radeon RX 550',              'AMD', 2017,  2,  50,  79,   6, ['rx 550']],
  ['AMD Radeon RX 480 8GB',          'AMD', 2016,  8, 150, 239,  20, ['rx 480']],
  ['AMD Radeon RX 470',              'AMD', 2016,  4, 120, 179,  17, ['rx 470']],
  ['AMD Radeon RX 460',              'AMD', 2016,  2,  75, 109,   8, ['rx 460']],

  // ---------------------------------------------------------------- AMD R9/R7 + HD
  ['AMD Radeon R9 Fury X',           'AMD', 2015,  4, 275, 649,  26, ['r9 fury x']],
  ['AMD Radeon R9 Fury',             'AMD', 2015,  4, 275, 549,  24, ['r9 fury']],
  ['AMD Radeon R9 390X',             'AMD', 2015,  8, 275, 429,  21, ['r9 390x']],
  ['AMD Radeon R9 390',              'AMD', 2015,  8, 275, 329,  20, ['r9 390']],
  ['AMD Radeon R9 290X',             'AMD', 2013,  4, 290, 549,  19, ['r9 290x']],
  ['AMD Radeon R9 290',              'AMD', 2013,  4, 275, 399,  18, ['r9 290']],
  ['AMD Radeon R9 380X',             'AMD', 2015,  4, 190, 229,  14, ['r9 380x']],
  ['AMD Radeon R9 280X',             'AMD', 2013,  3, 250, 299,  14, ['r9 280x']],
  ['AMD Radeon R9 380',              'AMD', 2015,  2, 190, 199,  13, ['r9 380']],
  ['AMD Radeon R9 280',              'AMD', 2014,  3, 250, 279,  12, ['r9 280']],
  ['AMD Radeon R9 270X',             'AMD', 2013,  2, 180, 199,  10, ['r9 270x']],
  ['AMD Radeon R7 370',              'AMD', 2015,  2, 110, 149,   9, ['r7 370']],
  ['AMD Radeon R7 360',              'AMD', 2015,  2, 100, 109,   7, ['r7 360']],
  ['AMD Radeon R7 260X',             'AMD', 2013,  2, 115, 139,   7, ['r7 260x']],
  ['AMD Radeon R7 250',              'AMD', 2013,  1,  65,  89,   4, ['r7 250']],
  ['AMD Radeon HD 7970',             'AMD', 2012,  3, 250, 549,  13, ['hd 7970']],
  ['AMD Radeon HD 7950',             'AMD', 2012,  3, 200, 449,  11, ['hd 7950']],
  ['AMD Radeon HD 7870',             'AMD', 2012,  2, 175, 349,   9, ['hd 7870']],
  ['AMD Radeon HD 7850',             'AMD', 2012,  2, 130, 249,   8, ['hd 7850']],
  ['AMD Radeon HD 7770',             'AMD', 2012,  1,  80, 159,   6, ['hd 7770']],
  ['AMD Radeon HD 4870',             'AMD', 2008,  1, 160, 299,   2, ['hd 4870']],

  // ---------------------------------------------------------------- Intel Arc
  ['Intel Arc B580',                 'Intel', 2024, 12, 190, 249, 39, ['arc b580']],
  ['Intel Arc B570',                 'Intel', 2025, 10, 150, 219, 33, ['arc b570']],
  ['Intel Arc A770 16GB',            'Intel', 2022, 16, 225, 349, 33, ['arc a770 16gb', 'arc a770']],
  ['Intel Arc A770 8GB',             'Intel', 2022,  8, 225, 329, 32, ['arc a770 8gb']],
  ['Intel Arc A750',                 'Intel', 2022,  8, 225, 289, 30, ['arc a750']],
  ['Intel Arc A580',                 'Intel', 2023,  8, 185, 179, 25, ['arc a580']],
  ['Intel Arc A380',                 'Intel', 2022,  6,  75, 139, 13, ['arc a380']],
  ['Intel Arc A310',                 'Intel', 2022,  4,  75,  99,  8, ['arc a310']],

  // ---------------------------------------------------------------- Integrated
  ['AMD Radeon 890M',                'AMD',   2024,  0,  28, null, 17, ['radeon 890m']],
  ['AMD Radeon 780M',                'AMD',   2023,  0,  28, null, 14, ['radeon 780m']],
  ['AMD Radeon 760M',                'AMD',   2023,  0,  28, null, 11, ['radeon 760m']],
  ['AMD Radeon Vega 8',              'AMD',   2018,  0,  25, null,  5, ['vega 8', 'radeon vega 8']],
  ['Intel Arc Graphics 140V',        'Intel', 2024,  0,  30, null, 13, ['arc 140v', 'arc graphics 140v']],
  ['Intel Iris Xe Graphics G7 96EU', 'Intel', 2020,  0,  28, null,  7, ['iris xe', 'iris xe graphics']],
  ['Intel UHD Graphics 770',         'Intel', 2021,  0,  30, null,  4, ['uhd 770', 'uhd graphics 770']],
  ['Intel UHD Graphics 630',         'Intel', 2017,  0,  25, null,  3, ['uhd 630', 'uhd graphics 630']],
  ['Intel HD Graphics 4000',         'Intel', 2012,  0,  20, null,  1, ['hd 4000', 'hd graphics 4000']],
  ['Intel HD Graphics 4600',         'Intel', 2013,  0,  25, null,  2, ['hd 4600', 'hd graphics 4600']],

  // ---------------------------------------------------------------- Legacy entry level
  // Cited constantly in minimum specs for older and lightweight titles.
  ['NVIDIA GeForce GTX 560',         'NVIDIA', 2011,  1, 150, 199,  6, ['gtx 560']],
  ['NVIDIA GeForce GTX 550 Ti',      'NVIDIA', 2011,  1, 116, 149,  4, ['gtx 550 ti']],
  ['NVIDIA GeForce GT 740',          'NVIDIA', 2014,  2,  64,  95,  3, ['gt 740']],
  ['NVIDIA GeForce GT 710',          'NVIDIA', 2016,  2,  19,  45,  1, ['gt 710']],
  ['AMD Radeon HD 6950',             'AMD', 2010,  2, 200, 299,  6, ['hd 6950']],
  ['AMD Radeon HD 6870',             'AMD', 2010,  1, 151, 239,  5, ['hd 6870']],
  ['AMD Radeon HD 6570',             'AMD', 2011,  1,  60,  79,  2, ['hd 6570']],
  ['AMD Radeon R7 240',              'AMD', 2013,  2,  30,  69,  2, ['r7 240']],
  ['AMD Radeon R5 230',              'AMD', 2014,  1,  20,  45,  1, ['r5 230', 'r5 200']],

  // ---------------------------------------------------------------- Pre-2010
  // Older Valve, Civilization and Call of Duty titles still state their minimum
  // in terms of these. They are far below anything in current use, but naming
  // them lets us say "your card vastly exceeds this" instead of "not stated".
  ['NVIDIA GeForce 7900 GS',         'NVIDIA', 2006,  1,  49, 199, 1, ['geforce 7900 gs', '7900 gs']],
  ['NVIDIA GeForce 8800 GT',         'NVIDIA', 2007,  1, 105, 199, 2, ['geforce 8800 gt', '8800 gt']],
  ['NVIDIA GeForce 9800 GT',         'NVIDIA', 2008,  1, 105, 149, 2, ['geforce 9800 gt', '9800 gt']],
  ['NVIDIA GeForce 6600 GT',         'NVIDIA', 2004,  1,  48, 199, 1, ['geforce 6600 gt', '6600gt', '6600 gt', 'geforce 6600', 'nvidia 6600']],
  ['NVIDIA GeForce GTX 460',         'NVIDIA', 2010,  1, 160, 229, 4, ['gtx 460']],
  ['AMD Radeon HD 2600 XT',          'AMD', 2007,  1,  45,  99, 1, ['hd 2600 xt', 'hd2600 xt']],
  ['AMD Radeon HD 5770',             'AMD', 2009,  1, 108, 159, 3, ['hd 5770']],
  ['AMD Radeon HD 4850',             'AMD', 2008,  1, 110, 199, 2, ['hd 4850']],
  ['ATI Radeon X800',                'AMD', 2004,  1,  70, 199, 1, ['radeon x800', 'ati x800', 'x800']],
  ['ATI Radeon 9600',                'AMD', 2003,  1,  30,  99, 1, ['radeon 9600', 'ati 9600']],
  ['ATI Radeon X1600 XT',            'AMD', 2005,  1,  45, 149, 1, ['radeon 1600xt', 'x1600 xt', 'radeon x1600']]
];
