# Domain search

**Chosen: canitrunpc.com** (owner, 2026-09-15). The sections below are the
search record, kept as written.

## Second search (2026-09-15, owner asked for stronger names)

Method: 110 .com names checked on Verisign RDAP, archive history on the Wayback
CDX API, keyword volume on Semrush (US), competitor names by web search.

**Crowded pattern.** "can i run it" names are already live competitors:
can-i-run-it.com, canirunit.net, checkcanirunit.com, canirunthegame.com,
canirun.gg. **willirunit.com** is a live "Will It Run?" checker, which makes
willitrunpc.com easy to confuse with it. Avoid "can you run it" names: that is
System Requirements Lab's product name.

| Domain | RDAP | Wayback | Matching keyword (US/mo, KD) | Notes |
|---|---|---|---|---|
| **canitrunpc.com** | free | no history | can i run it pc 9,900 KD50 · can my pc run 6,600 KD48 | short, distinct from the canirunit crowd |
| **willitrunonmypc.com** | free | no history | will it run on my pc 5,400 KD35 | exact match, long; "onmypc" echoes RunsOnMyPC |
| **doesitrunpc.com** | free | no history | none (brandable) | clean, no competitor uses it |
| canirunitpc.com | free | no history | can i run it pc 9,900 KD50 | confusable with canirunit.net / can-i-run-it.com |
| canmycomputerrunthis.com | free | no history | can my computer run it 9,900 KD40 | very long |
| willthisgamerun.com | free | no history | will this game run on my pc 1,600 KD32 | |
| playablepc.com | free | no history | none (brandable) | |
| fpsfit.com | free | no history | none | "fit" echoes PCGameFit |
| canitrunonpc.com, canmyrigrun.com, canirunpc.com, gamereqcheck.com, sysreqcheck.com, pcgamereqs.com, fpsestimator.com, frameratecheck.com, fpsverdict.com | free | no history | small or none | |
| canirunthisgame.com | free | live site 2013–2024, then 522 | can i run this game 1,900 | expired site: inspect backlinks before considering |
| canmypcrunthis.com | free | 2013–2019 | 320 | old parked/used history |
| canmycomputerrunit.com, willmypcrunit.com, runitcheck.com | free | earlier use | | skip |

Rejected: gamecheckpc.com and pcgamecheck2027.com (confusable with the
competitor's brand), and any name with a year in it (worthless after that year).

---

## WillItRunPC (2026-09-15)

Verisign RDAP (404 = unregistered) on 2026-09-15:

| Domain | RDAP | Why it was considered |
|---|---|---|
| **willitrunpc.com** | 404 — chosen | exact match for "willitrun" (6,600/mo, KD 29) and "will it run" |
| canmyrigrun.com | 404 | "can my pc run it" variant |
| gamereqcheck.com | 404 | requirements check |
| sysreqcheck.com | 404 | requirements check |
| pcgamereqs.com | 404 | requirements |
| specsverdict.com, fpsverdict.com, reqsradar.com, pcreadycheck.com | 404 | brandable |
| rigverdict.com, readyrig.com, rigscore.com, framegate.com, specgate.com | 200 — taken | |

The Wayback Machine CDX API was offline at the time, so **the chosen domain's
archive history is unchecked**. Check it before buying: a dropped domain with a
spam past (see runthisgame.com in PCGameFit's notes) is worse than a longer name.

---

## Earlier search (RunsOnMyPC, 2026-09-11)


Checked 2026-09-11. Re-check the chosen name right before buying — availability changes.

Requirement from the owner: the name must say what the site does (checks whether a
game runs on your PC: requirements, FPS, bottleneck). Abstract brands like
rigverdicts.com were rejected.

Method: 133 descriptive candidates, each checked for registration via Verisign RDAP
(`404` = unregistered), for Wayback Machine history, and with a web search for an
existing brand. 90 were unregistered. The best were re-checked a second time.

## Shortlist — all unregistered, zero archived history, `.net` also free

| Domain | Length | Reads as | Notes |
|---|---|---|---|
| **runsonmypc.com** | 14 | "Runs On My PC" | The exact question the site answers. Natural phrase, easy to say and remember. |
| **pcreqs.com** | 10 | "PC Reqs" (requirements) | Shortest. "Reqs" is common gamer shorthand. Matches the biggest template (game requirements pages). |
| **willitrunpc.com** | 15 | "Will It Run — PC" | Matches "will it run" searches; grammar slightly off. |
| **sysreqcheck.com** | 15 | "System Requirements Check" | Very literal. Close in idea to the competitor sysrqmts.com. |
| **pcgamereqs.com** | 14 | "PC Game Requirements" | Descriptive, but the `pcgame…` shape is close to pcgamecheck.com — the main competitor. |
| **gamereqcheck.com** | 16 | "Game Requirements Check" | One character over the 15 limit. |

## Rejected — unregistered but with a past
- **canirunthisgame.com** — a large site archived 2013–2022, then dropped.
- **mypccheck.com** — a site archived from 2011, 200/403 captures over years.
- **willmypcrunit.com** — captures in 2016–2017.
- **canmyrigrunit.com** — a capture in 2025.

## Rejected by the owner (round 1)
rigverdicts.com, pcverdict.com, rigreckon.com, specjudge.com — not descriptive enough.

## Commands
```bash
# 404 = unregistered
curl -s -o /dev/null -w "%{http_code}\n" https://rdap.verisign.com/com/v1/domain/NAME.com
# any rows = the name has a past
curl -s "http://web.archive.org/cdx/search/cdx?url=NAME.com*&output=txt"
```
