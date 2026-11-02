# AAU Field Hockey

A commissioner-style college field hockey dynasty. It's 2030: the NCAA has
collapsed and the **Association of American Universities** runs college
athletics. This dynasty covers **every AAU member with a varsity field hockey
team**: 29 programs, 25 from Division I and 4 from Division III. It has box
scores by quarter, sudden-victory overtime and shootouts, standings, the RPI,
a voters' poll, conference tournaments, the **AAU National Tournament**
through the **Final Four**, coaches, the offseason and a record book.

It's built on the MCS Dynasty engine (by way of AAU Soccer) and works the same
way, with field hockey's rules, schedule and tournament. Field hockey is a
women's sport, so there is one dynasty and no women's/men's switch.

Open `index.html` through any static web server (GitHub Pages works: Settings
→ Pages → Deploy from a branch → `main`, `/ (root)`). The dynasty saves in the
browser; **Settings → Download backup** keeps a copy or moves it to another
device.

## The league

The teams start in the owner's conference alignment from the AAU Dynasty, each
conference with a drawn logo:

| Conference | Teams |
|---|---|
| Ivy League | Princeton, Harvard, Yale, Cornell, Brown, Penn, Columbia, Dartmouth |
| Big Ten | Northwestern, Iowa, Michigan, Indiana, Ohio State, Penn State, Michigan State |
| Coastal Atlantic Conference | North Carolina, Virginia, Duke, Maryland |
| University Athletic Association | Tufts, Johns Hopkins, Rochester, MIT (Division III) |
| Metro Conference | Rutgers, Boston University, Georgetown |
| Pacific-10 Conference | California, Stanford |
| UC Athletic Association | UC Davis |

The program list is the owner's AAU Dynasty file less WashU, whose field
hockey is a self-coached club. Every team has its school's real colors, its
real 2026 head coach and its real home field.

## Ratings

Every team has three ratings from 40 to 99: **ATT** (attack), **MID**
(midfield) and **DEF** (defense and goalkeeping). **OVR = 40% ATT + 30% MID +
30% DEF.** Starting ratings come from the 2025 season: Northwestern won the
NCAA title over Princeton, with North Carolina and Harvard in the Final Four;
Tufts won the Division III title over Johns Hopkins. `js/data.js` lists the
sources. Ratings move with results during the season and develop between
seasons, as in MCS Dynasty.

## Matches

- **Four 15-minute quarters**, played minute by minute from the ratings. Teams
  average about 2.5 goals, 12 shots and 6 penalty corners a match.
- **No ties.** A match level after 60 minutes, regular season or postseason,
  plays a **15-minute sudden-victory overtime**, then a **shootout** (five
  one-on-one attempts each, then more rounds of five until one team leads).
  The shootout winner gets the win.
- **Match cards and box scores** show goals by quarter and overtime, goals,
  shootout goals, shots and penalty corners, and Final/OT or Final/SO.
- **Entering a score:** goals for each quarter, the overtime and shootout when
  level. The editor checks the rules, and shots and corners left blank are
  estimated from the goals.

## The season

- **Ten weeks** from the last Friday in August, **two matches a week, Friday
  and Sunday** (each conference can pick other days on the Standings page).
- **Conference play is a single round robin**, everyone once. **A conference
  of 6 or fewer plays a double round robin**: everyone twice, once at home and
  once away (the Coastal Atlantic, UAA, Metro and Pac-10). Bigger
  conferences start earlier; everyone finishes on the last weekend.
- **Non-conference matches** fill the weeks before: nearby schools of a similar
  level from other conferences, up to the season cap (18). Teams play about
  15–18 matches.
- **Standings** go by conference record (a shootout counts as a win or a
  loss), with games back.

## The postseason

1. **Conference tournaments:** conferences with 4 or more teams (Ivy, Big Ten,
   Coastal Atlantic, UAA) send their top 4 to a single-elimination tournament
   at one member's field, semifinals Friday and the final Sunday.
2. **Automatic bids go only to conferences with 4 or more teams.** The Metro,
   Pac-10 and UCAA champions compete for at-large spots. The minimum is a
   setting (`aqMin`).
3. **Selection:** the committee compares teams tier by tier (RPI, quadrant
   wins, strength of schedule, head-to-head and more). You pick, confirm and
   seed the field.
4. **The national tournament: 12 teams in four regions of three.** The top four
   national seeds wait a round while seeds 2 and 3 of each region play on
   Friday at the higher seed's field; the winner plays at the top seed on
   Sunday in the quarterfinal.
5. **The Final Four** at Trager Stadium in Louisville, Ky. (the real 2026
   host): semifinals Friday, the final Sunday.

**Settings → AAU National Tournament** changes the shape: the number of regions
and teams in each, region rounds over two weeks, super regionals or a bigger
Final Four.

## The offseason, history and records

As in MCS Dynasty: realign conferences, add teams and conferences, the
coaching carousel and hot seat, coach and program prestige, and rating points
to place on ATT, MID and DEF. The **Records** page has program, single-season
(most goals, fewest allowed, goal differential, winning streaks), single-match
(most goals, biggest win, most shots, highest-scoring shootout), poll and
coaching records.

## Logos

Logos set in the owner's **AAU Dynasty** come first; **Settings → Backups →
Logos from an AAU Dynasty backup** brings in newer ones. Everyone else gets a
logo from the college logo list MCS uses (ESPN logos). Any team or conference
can get its own logo on its page.

## Development

Plain ES modules, no build step. Before every commit:

```
python3 tools/stamp.py      # version-stamp script and stylesheet links
sh tools/check.sh           # every module parses
node tests/logic.test.mjs   # engine tests
python3 tests/ui_test.py    # browser test (Playwright + Chromium)
```

| File | What it does |
|---|---|
| `js/data.js` | Teams, conferences, fields, ratings, coaches, sources |
| `js/sim.js` | Minute-by-minute match simulator, overtime, shootout, odds |
| `js/schedule.js` | Non-conference and conference schedules |
| `js/standings.js` | Records, standings, tiebreakers, RPI, quadrants |
| `js/polls.js` | Power ratings and the voters' poll |
| `js/postseason.js` | Conference tournaments, automatic bids, selection, the national tournament |
| `js/league.js` | Seasons, results, coaches, offseason |
| `js/views-*.js`, `js/ui.js` | Pages |
| `tools/conf_logos.py` | Draws the conference logos in `img/conf/` |
