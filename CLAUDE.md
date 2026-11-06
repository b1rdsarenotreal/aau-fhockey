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
  6 or fewer (`confTarget`, `DOUBLE_ROUND_ROBIN_MAX`); non-conference matches pair nearby teams of similar level;
  cap 18.
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
- On-screen text says "match", not "game".
- The side machinery (`league.side`, `SIDES`, `currentSide`) is kept with
  one side, 'women', so code reads like the other AAU apps.
- Teams start in the owner's conferences (the AAU Dynasty alignment) with
  drawn logos (`tools/conf_logos.py`, transparent SVGs in `img/conf/`).
  Ratings come from the 2025 season; coaches are the real 2026 head coaches.
  Say where data came from in `js/data.js` (team rows are edited there
  directly).
- Regionals avoid first-round matchups between conference rivals
  (`avoidConferenceMatchups` in `js/postseason.js`, the owner's rule): after
  the serpentine, teams on one seed line trade regionals (lowest lines
  first), then, as a last resort, a team moves one seed line; the top line
  never moves. `pods(field, n, season)` applies it, so bracketology, the
  selection preview and the announced field agree. Bracketology and the
  preview show each regional's first-round matchups.

## Before every commit

- `python3 tools/stamp.py`
- `sh tools/check.sh`
- `node tests/logic.test.mjs`
- `python3 tests/ui_test.py` (Playwright; Chromium is preinstalled)
