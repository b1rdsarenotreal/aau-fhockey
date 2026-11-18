# AAU Field Hockey

A college field hockey dynasty set in 2030 for the 29 AAU schools with varsity
field hockey (25 Division I, 4 Division III). Field hockey is women's only, so
it is one dynasty with no women's/men's switch. It started as a copy of AAU
Soccer (itself from AAU Volleyball and the owner's MCS Dynasty) and keeps that
engine and its features, adapted to field hockey.

**It is not synced with MCS Dynasty, SACAA Dynasty, AAU Volleyball, AAU
Soccer, AAU Softball & Baseball or AAU Dynasty.** Changes here aren't ported
to those repos, and theirs aren't ported here, unless the owner asks.

## Field hockey adaptations to keep in mind

- Game fields keep the MCS names: `homeLine`/`awayLine` are goals per period
  (four quarters, then the overtime), `homeR`/`awayR` goals, `homeH`/`awayH`
  shots, `homeE`/`awayE` penalty corners, and `g.pk` the shootout goals
  ({ home, away }) after a level overtime. A record's `rs`/`ra` are goals for
  and against.
- **No ties.** Every level match (regular season too) goes to one 15-minute
  sudden-victory overtime, then a shootout; the shootout winner gets the W
  (`winnerOf`, `resultFor` in `js/standings.js`; `isTie` is only true for an
  unfinished hand entry). Records show W-L. The tie fields (`t`, `ct`, …)
  stay in the record objects from the soccer engine and are always 0.
- Ratings are stored as `off`, `pit`, `def` and shown as ATT, MID, DEF.
  OVR = 0.4/0.3/0.3.
- Schedule: two matches a week, Friday and Sunday; conference play is a single
  round robin, or a double round robin (home and away) for a conference of
  6 or fewer (`confTarget`, `DOUBLE_ROUND_ROBIN_MAX`); non-conference matches pair nearby teams of similar level (few marquee games each: top-third pairings get costlier per one a team has, `MARQUEE` in `js/schedule.js`);
  cap 18.
- Non-conference dates are shuffled (`shuffleNonConfRounds`, the owner's
  ask, Nov. 2026): the non-conference weekends are drawn one after another,
  each pairing similar teams, so a top team's best opponents would come in
  a row; the rounds are then dealt out to the non-conference dates at random.
- **Automatic bids only for conferences with at least `settings.aqMin` (4)
  teams** (`aqConferences` in `js/postseason.js`); conference tournaments (top
  4, single elimination) default to the same conferences.
- Postseason stages keep the MCS internal names: `regionals` = regions,
  `supers`, `mcws` = the Final Four. Default 4 regions of 3 (12 teams): top
  seed byes, Friday first round and Sunday quarterfinal at the higher seed's
  field in one week (`ncaa.homeSites`, `homeWeeks: 1`); Final Four at Trager
  Stadium, Louisville, semifinals Friday and final Sunday. User-facing text
  never says NCAA, MCWS, set, innings, runs or ties.
- Selection uses the Power Index (NPI): `npi` in `js/standings.js`, with
  each side's NCAA Division III dials in `settings.npi` (`NPI_BY_SIDE` in
  `js/league.js`), when `settings.index` is 'npi' (the default;
  `indexVersion` 1 switched older saves from the current or next season
  on). A level game counts as a tie in the NPI even if penalty kicks or a
  shootout decided it. The committee goes straight down the NPI: no tiers
  (`sheet.tiers` empty). `rating(season)` gives the season's index in the
  RPI's shape (value in `rpi`, plus `rank`, `sosRank`); use it, not
  `rpi()`, and `indexName(season)` for on-screen labels.
- The AAU look (Nov. 2026), built to match the owner's mockups: a two-row
  top bar (brand row, then the menu); scoreboard cards (`gameCard`: the
  conference's color bar and logo, a row per team with each quarter and the
  final, the loser faded); standings with the conference list down the side
  (`st-*`), each conference in its colors (`confVars`, `confHead`), All
  conferences compact; the poll as a board (`pb-*`) beside movers, receiving
  votes and dropped out, under the No. 1 team's card; the team page header in
  the team's colors with title banners and a numbers strip (`teamHero`) and
  schedule boxes (`ts2-*`); Postseason → Full bracket (`renderBoard`).
  Navy `--board`, gold `--optic`; Oswald, Saira Condensed, Inter.
- On-screen text says "match", not "game".
- The side machinery (`league.side`, `SIDES`, `currentSide`) is kept with
  one side, 'women', so code reads like the other AAU apps.
- Teams start in the owner's conferences (the AAU Dynasty alignment) with
  drawn logos (`tools/conf_logos.py`, transparent SVGs in `img/conf/`).
  Ratings come from the 2025 season; coaches are the real 2026 head coaches.
  Say where data came from in `js/data.js` (team rows are edited there
  directly).
- Travel partners (`js/partners.js`, the owner's ask, Nov. 2026): in a
  conference of four or more, nearby schools travel as a pair (picked by
  distance, `autoPartners`; the commissioner can re-pair them or turn them
  off in Standings → Commissioner: `settings.partners[conf]`,
  `settings.partnersOff[conf]`). A pair visits a pair for a weekend: each
  visitor plays one host on the first day and the other on the second.
  Partners meet on their pair's open weekend (or a rivalry weekend); a
  school without a partner (the odd one out, or any the commissioner sets:
  `settings.partnerSolos[conf]`; every school's partner is a menu) plays
  both schools of a pair in a weekend, or one match against another school on
  its own. No team is away more than two conference weekends in a row, or
  home more than three (the owner's rule, Nov. 2026: hosts and the order of
  weekends are searched for it). A partner match can't share a weekend with
  a school on its own (three schools need three days).
  `partnerRounds` builds everyone-once, everyone-twice or in between (second
  meetings left out by whole weekends where it can), with hosts chosen so
  each team is home for half (one off at most when meetings aren't all
  doubled); when it can't (an 8-team single round robin, for one), the
  conference gets the plain round robin. `season.partnerConfs` lists the
  conferences scheduled in pairs.
- Regionals avoid first-round matchups between conference rivals
  (`avoidConferenceMatchups` in `js/postseason.js`, the owner's rule): after
  the serpentine, teams on one seed line trade regionals (lowest lines
  first), then, as a last resort, a team moves one seed line; the top line
  never moves. `pods(field, n, season)` applies it, so bracketology, the
  selection preview and the announced field agree. Bracketology and the
  preview show each regional's first-round matchups.
- The Greater South Conference (the owner's, coming in; Kansas, Missouri,
  Tulane, UAB, Vanderbilt, Iowa State, Saint Louis, Memphis) has its logo
  ready (`gsc.svg`, the owner's pick: slanted GSC, striped S, compass in the
  G; Saira Black): it's in the Add conference pick (`AAU_CONFERENCES`), and
  a Greater South made by hand gets it on load (`migrateLeague`).
- The Horizon Valley Conference (the owner's, coming in; Loyola Chicago, UIC,
  IU Indianapolis, UMKC, Missouri S&T, Cincinnati, Dayton, West Virginia,
  Ohio, Southern Illinois) has its logo ready the same way (`hvc.svg`, the
  owner's pick: slanted HVC in Archivo Expanded Black with white, orange and
  plum outlines, a striped orange sun rising behind).
- The Western Athletic Conference is coming back (the owner's; Northern
  Arizona, San Diego State, Nevada, UNLV, Oregon State, BYU, Utah State,
  Washington State) with the owner's pick for its logo, the 1992–2010 WAC
  logo linked from the web (`CONF_LOGO_LINKS.wac`), ready the same way.
- Realignment from AAU Dynasty (`js/realign.js`, Nov. 2026): the hub's
  Realignment page leaves a plan in IndexedDB `aau-realignment` (read
  when the app loads or comes back into view, never created here); the
  Offseason page shows it (`realignBanner`) with a review where each move,
  join and leave can be unticked (`realignModal`). Only teams in the AAU's
  all-sports conferences move; schools join only if they play this sport
  (`AAU_PROGRAMS`), at `JOIN_RATING` (60) with their venue and logo; new
  conferences get their logo; empty ones can be retired. Applied or skipped
  is kept in `league.realign[planId]`.

## Before every commit

- `python3 tools/stamp.py`
- `sh tools/check.sh`
- `node tests/logic.test.mjs`
- `python3 tests/ui_test.py` (Playwright; Chromium is preinstalled)
