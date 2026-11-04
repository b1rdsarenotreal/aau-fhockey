// Regular-season schedule for college field hockey. Its length comes from the
// season's settings (10 weeks by default, late August to early November).
//
// - Two matches a week, Friday and Sunday (conferences can pick other days
//   on the Standings page).
// - Conference play is a single round robin: everyone once, home or away
//   (at most `confMatches`, 11 by default). A conference needs one week per
//   two rounds, so a bigger conference starts earlier; everyone finishes on
//   the last weekend. Every member plays the same number of conference
//   matches, with an even home/away split (a fail-safe in the schedule
//   builder).
// - Until its conference season starts, a team plays two non-conference
//   matches a week against teams from other conferences, leaning toward
//   schools near home and avoiding repeat opponents, up to the season cap
//   (`maxMatches`, 18).
// - A team with a conference bye in one of a week's two slots plays just its
//   one conference match that week. A team with no match at all that week is
//   paired with another such team for one non-conference match when it can
//   be.
// When `prev` (last season) is given, conference opponents who met last year
// swap home and away.

import { isIndependent } from './standings.js?v=20261104000804';
import { cityPoint, miles } from './geo.js?v=20261104000804';
import { rng, shuffle, hashStr } from './util.js?v=20261104000804';

export const DEFAULT_REG_WEEKS = 10;
export const DEFAULT_TOURNEY_WEEKS = 0; // kept for older code paths: no invitationals
export const MAX_CONF_WEEKS = 11;
export const PER_WEEK = 2; // conference matches a week
export const DEFAULT_CONF_MATCHES = 10; // most conference matches a team plays
export const DEFAULT_MAX_MATCHES = 18;  // most regular-season matches (about what NCAA teams play)

// A conference this small plays a double round robin: everyone twice, once
// at home and once away.
export const DOUBLE_ROUND_ROBIN_MAX = 6;
// Conference matches each team in an n-team conference plays: everyone twice
// (home and away) in a conference of 6 or fewer, otherwise everyone once (a
// single round robin); never more than `max`.
export const confTarget = (n, max = DEFAULT_CONF_MATCHES) => (n < 2 ? 0 : Math.min(n <= DOUBLE_ROUND_ROBIN_MAX ? 2 * (n - 1) : n - 1, max));
const TOURNEY_NAMES = ['Classic', 'Invitational', 'Challenge', 'Showcase', 'Kickoff', 'Cup'];

// Kept for older code paths that read these (no midweek games in volleyball).
export const MIDWEEK = {}; export const MIDWEEK_FREQ = {};

export const DAY_ORDER = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Conference weeks in a season of `regWeeks` with `tourneyWeeks` of
// invitationals first.
export function confWeeksFor(regWeeks, tourneyWeeks = DEFAULT_TOURNEY_WEEKS) { return Math.max(1, Math.min(MAX_CONF_WEEKS, regWeeks - tourneyWeeks)); }
// The most weeks a conference may use (it can start before the invitational
// weeks end when it needs to; week 1 is always non-conference).
export function confWeeksMax(regWeeks) { return Math.max(1, Math.min(MAX_CONF_WEEKS, regWeeks - 1)); }
const rrRounds = n => (n < 2 ? 0 : n % 2 ? n : n - 1);

export function blankGame(season, fields) {
  return {
    id: season.nextId++, type: 'regular', week: 1, day: 'Fri', order: DAY_ORDER.Fri,
    home: null, away: null, neutral: false, confGame: false, series: null, label: '',
    final: false, homeLine: [], awayLine: [], homeR: null, homeH: null, homeE: null, awayR: null, awayH: null, awayE: null,
    pitching: null, source: null, ...fields,
  };
}

// The two days a conference plays its matches each week: Thursday or Friday,
// then Saturday or Sunday. Set per conference (Standings → Commissioner).
// (Older saves may say 'ws', Wednesday and Saturday; it now means Friday and
// Saturday.)
export const CONF_WEEKENDS = [
  ['fsu', 'Friday and Sunday'],
  ['tsu', 'Thursday and Sunday'],
  ['ts', 'Thursday and Saturday'],
  ['fs', 'Friday and Saturday'],
];
export function seriesDays(fmt) {
  const days = { fs: ['Fri', 'Sat'], fsu: ['Fri', 'Sun'], ts: ['Thu', 'Sat'], tsu: ['Thu', 'Sun'] }[fmt] || ['Fri', 'Sun'];
  return days.map(day => ({ day, order: DAY_ORDER[day] }));
}
// Re-lay a conference's unplayed conference matches after its days change.
export function applyConfWeekend(season, conf) {
  const days = seriesDays(season.settings?.confWeekend?.[conf]);
  let n = 0;
  for (const g of season.games) {
    if (g.type !== 'regular' || !g.confGame || g.final || season.teams[g.home]?.conference !== conf || g.slot == null) continue;
    Object.assign(g, days[g.slot]);
    n++;
  }
  return n;
}

// Count each team's conference matches in a set of rounds.
export function confSeriesCounts(rounds, list) {
  const n = Object.fromEntries(list.map(t => [t, 0]));
  for (const pairs of rounds) for (const [a, b] of pairs) if (a && b) { n[a]++; n[b]++; }
  return n;
}

// Pick matches to drop so every team ends with the same number: team t must
// lose `need[t]` matches, each shared with another team that has matches to
// lose. Small conferences, so a backtracking search is quick.
function pickDrops(edges, need, r) {
  const left = { ...need }, chosen = [], used = new Set();
  let steps = 0;
  const solve = () => {
    if (++steps > 20000) return false;
    const todo = Object.keys(left).filter(t => left[t] > 0);
    if (!todo.length) return true;
    const opts = t => edges.filter((e, i) => !used.has(i) && (e.a === t ? left[e.b] > 0 : e.b === t && left[e.a] > 0));
    const t = todo.reduce((x, y) => (opts(y).length - left[y] < opts(x).length - left[x] ? y : x));
    for (const e of shuffle(opts(t), r)) {
      const i = edges.indexOf(e);
      used.add(i); left[e.a]--; left[e.b]--; chosen.push(i);
      if (solve()) return true;
      used.delete(i); left[e.a]++; left[e.b]++; chosen.pop();
    }
    return false;
  };
  return solve() ? chosen : null;
}

// Home/away for single meetings so every team hosts half its conference
// matches. Pairs that meet twice already have one home each. The rest are
// walked as closed trails (an Euler orientation: every visit to a team is one
// arrival and one departure, so hosts and visits balance). A team with an
// odd number of single meetings gets a dummy partner, so it ends at most one
// off. `prefer(a, b)` > 0 means a should host (last season's swap); each
// trail runs whichever way satisfies more of those.
function balanceHomes(edges, r, prefer) {
  const adj = new Map(), deg = new Map();
  const all = edges.map(e => ({ ...e }));
  for (const e of all) for (const t of [e.a, e.b]) deg.set(t, (deg.get(t) || 0) + 1);
  const odd = [...deg].filter(([, d]) => d % 2).map(([t]) => t);
  for (let i = 0; i + 1 < odd.length; i += 2) all.push({ a: odd[i], b: '\u0000', dummy: true }, { a: odd[i + 1], b: '\u0000', dummy: true });
  all.forEach((e, i) => { for (const t of [e.a, e.b]) { if (!adj.has(t)) adj.set(t, []); adj.get(t).push(i); } });
  for (const l of adj.values()) l.splice(0, l.length, ...shuffle(l, r));
  const used = new Set();
  for (const start of shuffle([...adj.keys()], r)) {
    while ((adj.get(start) || []).some(i => !used.has(i))) {
      const trail = [];
      let at = start;
      for (;;) {
        const i = adj.get(at).find(j => !used.has(j));
        if (i == null) break;
        used.add(i);
        const e = all[i], to = e.a === at ? e.b : e.a;
        trail.push({ e, host: at, visit: to });
        at = to;
      }
      const score = trail.reduce((s2, x) => s2 + (x.e.dummy || !prefer ? 0 : Math.sign(prefer(x.host, x.visit))), 0);
      for (const x of trail) [x.e.home, x.e.away] = score < 0 ? [x.visit, x.host] : [x.host, x.visit];
    }
  }
  return all.filter(e => !e.dummy);
}

// A conference's rounds for the season, at most `maxRounds`: a round robin,
// then a second one with home and away swapped, taken until every team has
// its number of conference matches (confTarget). Fail-safe: every member plays
// the same number, with an even home/away split. When the last rounds give
// some teams an extra match, extra second meetings are dropped (those teams
// get a non-conference match or an open date instead); if no clean set of
// drops exists, the round robin is redrawn and tried again.
export function confRounds(list, maxRounds, r, max = DEFAULT_CONF_MATCHES, prefer = null) {
  if (list.length < 2) return [];
  const T = confTarget(list.length, max);
  for (let attempt = 0; attempt < 40; attempt++) {
    const first = roundRobin(list, r);
    const all = [...first, ...first.map(pairs => pairs.map(([a, b]) => [b, a]))];
    const rounds = [], cnt = Object.fromEntries(list.map(t => [t, 0]));
    for (const pairs of all) {
      if (rounds.length >= maxRounds || list.every(t => cnt[t] >= T)) break;
      rounds.push(pairs);
      for (const [a, b] of pairs) if (a && b) { cnt[a]++; cnt[b]++; }
    }
    let k = Math.min(T, ...Object.values(cnt));
    if ((list.length * k) % 2) k--;
    const edges = rounds.flatMap((pairs, ri) => pairs.filter(([a, b]) => a && b).map(([a, b]) => ({ a, b, ri, second: ri >= first.length })));
    const need = Object.fromEntries(list.map(t => [t, cnt[t] - k]));
    let gone = new Set();
    if (Object.values(need).some(x => x > 0)) {
      const seconds = edges.filter(e => e.second);
      let drops = pickDrops(seconds, need, r);
      if (drops) drops = drops.map(i => seconds[i]);
      else { drops = pickDrops(edges, need, r); if (drops) drops = drops.map(i => edges[i]); }
      if (!drops) continue;
      gone = new Set(drops);
    }
    const kept = edges.filter(e => !gone.has(e));
    // Pairs meeting twice keep their swapped home and away; balance the rest.
    const meets = {};
    for (const e of kept) meets[key(e.a, e.b)] = (meets[key(e.a, e.b)] || 0) + 1;
    const singles = kept.filter(e => meets[key(e.a, e.b)] === 1);
    for (const e of balanceHomes(singles, r, prefer)) { const o = singles.find(x => x.a === e.a && x.b === e.b && x.ri === e.ri); o.home = e.home; o.away = e.away; }
    const out = rounds.map(() => []);
    for (const e of kept) out[e.ri].push(e.home ? [e.home, e.away] : [e.a, e.b]);
    while (out.length && !out[out.length - 1].length) out.pop();
    return out;
  }
  throw new Error(`Couldn't give every team in a ${list.length}-team conference the same number of conference matches.`);
}

// Circle-method round robin. Returns rounds of [a, b] pairs (null = bye).
export function roundRobin(teams, r) {
  const list = shuffle(teams, r);
  if (list.length % 2) list.push(null);
  const n = list.length, rounds = [];
  for (let k = 0; k < n - 1; k++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      pairs.push(k % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
// Conference rivals; independents are nobody's rivals.
const rival = (teams, a, b) => teams[a].conference === teams[b].conference && !isIndependent(teams[a].conference);

// Pair teams across conferences, avoiding repeat opponents when possible.
function crossPairs(pool, teams, met, r) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const left = shuffle(pool, r), pairs = [];
    let ok = true;
    while (left.length > 1) {
      const a = left.shift();
      let j = left.findIndex(b => !rival(teams, a, b) && !met.has(key(a, b)));
      if (j < 0) j = left.findIndex(b => !rival(teams, a, b));
      if (j < 0) { ok = false; break; }
      pairs.push([a, left.splice(j, 1)[0]]);
    }
    if (ok) return { pairs, idle: left };
  }
  return { pairs: [], idle: [...pool] };
}

// Pair teams across conferences for non-conference matches: each team (in
// random order) takes the free opponent with the lowest cost, which is the
// distance between their homes, the gap in their ratings and some
// randomness, with a big penalty for a repeat opponent. `dist` is in miles.
function nearCross(pool, teams, met, r, dist) {
  const lvl = t => (teams[t].off ?? 65) * 0.4 + (teams[t].pit ?? 65) * 0.3 + (teams[t].def ?? 65) * 0.3;
  const left = shuffle(pool, r), pairs = [];
  while (left.length > 1) {
    const a = left.shift();
    let best = -1, bs = Infinity;
    left.forEach((b, j) => {
      if (rival(teams, a, b)) return;
      // Teams of a similar level, too: a Division I power rarely plays a
      // Division III school (about 40 miles a rating point).
      const c = dist(a, b) + r() * 700 + Math.abs(lvl(a) - lvl(b)) * 40 + (met.has(key(a, b)) ? 4000 : 0);
      if (c < bs) { bs = c; best = j; }
    });
    if (best >= 0) pairs.push([a, left.splice(best, 1)[0]]);
  }
  return pairs;
}

// Event sizes for n teams in `events` events, as even as possible.
export function eventSizes(n, events = Math.floor(n / 4)) {
  if (n < 3 || events < 1) return [];
  const base = Math.floor(n / events), extra = n % events;
  return Array.from({ length: events }, (_, i) => base + (i < extra ? 1 : 0));
}

export function generateSchedule(season, seed = hashStr(String(season.year)), prev = null) {
  const r = rng(seed);
  const teams = season.teams;
  const names = Object.keys(teams);
  const homeCount = Object.fromEntries(names.map(n => [n, 0]));
  const played = Object.fromEntries(names.map(n => [n, 0]));
  const met = new Set();
  const games = [];
  const REG = season.settings?.regWeeks ?? DEFAULT_REG_WEEKS;
  const TW = Math.max(0, Math.min(season.settings?.tourneyWeeks ?? DEFAULT_TOURNEY_WEEKS, REG - 1));
  season.regWeeks = REG;

  // Who hosted each conference match last season, for pairs that met once.
  const hosts = new Map();
  for (const g of prev?.games || []) if (g.type === 'regular' && g.confGame) { const k = key(g.home, g.away); hosts.set(k, hosts.has(k) ? 'both' : g.home); }
  const orient = (a, b) => {
    if (homeCount[a] > homeCount[b]) return [b, a];
    if (homeCount[a] < homeCount[b]) return [a, b];
    return r() < 0.5 ? [a, b] : [b, a];
  };
  const add = (week, home, away, extra) => {
    games.push(blankGame(season, { week, home, away, ...extra }));
    if (!extra.neutral) homeCount[home]++;
    played[home]++; played[away]++;
    met.add(key(home, away));
  };

  // ---- conference rounds, two a week, ending on the last weekend ----
  const byConf = {};
  for (const n of names) if (!isIndependent(teams[n].conference)) (byConf[teams[n].conference] ||= []).push(n);
  const confWeeks = confWeeksMax(REG);
  const slotPairs = {}; // `${week}|${slot}` -> [[a, b, conf]]
  for (const [conf, list] of Object.entries(byConf).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (list.length < 2) continue;
    // A pair that only meets once this year swaps hosts from last year when
    // the home/away balance allows.
    const prefer = (a, b) => { const h = hosts.get(key(a, b)); return !h || h === 'both' ? 0 : h === a ? -1 : 1; };
    const rounds = confRounds(list, confWeeks * PER_WEEK, r, season.settings?.confMatches ?? DEFAULT_CONF_MATCHES, prefer);
    const weeksNeeded = Math.ceil(rounds.length / PER_WEEK);
    const firstWeek = REG - weeksNeeded + 1;
    rounds.forEach((pairs, i) => {
      const week = firstWeek + Math.floor(i / PER_WEEK), slot = i % PER_WEEK;
      for (const [a, b] of pairs) if (a && b) (slotPairs[`${week}|${slot}`] ||= []).push([a, b, conf]);
    });
  }

  // ---- invitationals ----
  const pts = Object.fromEntries(names.map(n => [n, cityPoint(teams[n].city)]));
  const dist = (a, b) => (pts[a] && pts[b] ? miles(pts[a], pts[b]) : 900);
  let tNo = 1;
  const invitationals = (week, free) => {
    // Enough events that no event needs two teams from one conference.
    const confCount = {};
    for (const n of free) if (!isIndependent(teams[n].conference)) confCount[teams[n].conference] = (confCount[teams[n].conference] || 0) + 1;
    // At most five a site (a five-team round robin fills Thursday to Saturday).
    // At most four teams an event: three matches each, one a day.
    const E = Math.max(1, Math.floor(free.length / 4), Math.ceil(free.length / 4), ...Object.values(confCount));
    const sizes = eventSizes(free.length, E);
    if (!sizes.length) return free;
    // Too few teams outside the biggest conference for events of three (a
    // small league, like the men's two conferences of seven): non-conference
    // matches instead, one a day for three days against different teams.
    if (Math.min(...sizes) < 3) {
      const days = r() < 0.5 ? ['Thu', 'Fri', 'Sat'] : ['Fri', 'Sat', 'Sun'];
      for (const day of days) {
        const { pairs } = crossPairs(free, teams, met, r);
        for (const [a, b] of pairs) { const [h, aw] = orient(a, b); add(week, h, aw, { day, order: DAY_ORDER[day] }); }
      }
      return;
    }
    const events = sizes.map(() => []);
    // Place the biggest conferences first, each team in the open event that
    // suits it best: no rival there, nearby, not played yet, some randomness.
    const order = shuffle(free, r).sort((a, b) => (confCount[teams[b].conference] || 0) - (confCount[teams[a].conference] || 0));
    const leftovers = [];
    for (const t of order) {
      let best = -1, bs = Infinity;
      events.forEach((ev, i) => {
        if (ev.length >= sizes[i] || ev.some(x => rival(teams, x, t))) return;
        const sc = (ev.length ? ev.reduce((s2, x) => s2 + dist(x, t) * 1.6 + (met.has(key(x, t)) ? 2500 : 0), 0) / ev.length : 900) + r() * 600 - ev.length * 60;
        if (sc < bs) { bs = sc; best = i; }
      });
      if (best < 0) leftovers.push(t); else events[best].push(t);
    }
    // A team with no rival-free event left: move someone from another event
    // into an open spot so it can take that someone's place.
    for (const t of leftovers.splice(0)) {
      let done = false;
      for (let i = 0; i < events.length && !done; i++) {
        if (events[i].length >= sizes[i]) continue;
        for (let j = 0; j < events.length && !done; j++) {
          if (j === i) continue;
          for (const x of events[j]) {
            if (events[i].some(y => rival(teams, x, y)) || events[j].some(y => y !== x && rival(teams, t, y))) continue;
            events[i].push(x); events[j][events[j].indexOf(x)] = t; done = true; break;
          }
        }
      }
      if (!done) leftovers.push(t);
    }
    const byeDay = { Thu: [], Fri: [], Sat: [], Sun: [] };
    for (const ev of events) {
      if (ev.length < 3) { leftovers.push(...ev); continue; }
      const host = [...ev].sort((a, b) => homeCount[a] - homeCount[b] || (r() - 0.5))[0];
      const id = `${season.year}-t${tNo++}`;
      const name = `${host} ${TOURNEY_NAMES[hashStr(`${season.year}|${host}|${week}`) % TOURNEY_NAMES.length]}`;
      // One match a day, no doubleheaders: some events run Thursday to
      // Saturday, others Friday to Sunday.
      const days = r() < 0.5 ? ['Thu', 'Fri', 'Sat'] : ['Fri', 'Sat', 'Sun'];
      const rounds = roundRobin(ev, r);
      rounds.forEach((pairs, k) => {
        const day = days[k], half = 0;
        for (const [a, b] of pairs) if (!a || !b) { const t = a || b; if (t) byeDay[day].push(t); }
        pairs.filter(([a, b]) => a && b).forEach(([a, b], i) => {
          let home, away;
          if (a === host || b === host) { home = host; away = a === host ? b : a; } else [home, away] = orient(a, b);
          const atHost = home === host;
          add(week, home, away, { day, order: DAY_ORDER[day] + half + i * 0.01, tourney: id, label: name, ...(atHost ? {} : { neutral: true, site: host }) });
        });
      });
    }
    // A 3-team event has a team sitting out each day; teams sitting out the
    // same day (and any team left over, on Saturday) meet for a third match,
    // so everyone plays about three that weekend, one a day.
    byeDay.Sat.push(...leftovers);
    for (const [day, pool] of Object.entries(byeDay)) {
      const { pairs } = crossPairs(pool, teams, met, r);
      for (const [a, b] of pairs) { const [h, aw] = orient(a, b); add(week, h, aw, { day, order: DAY_ORDER[day] + 0.5 }); }
    }
  };

  const cap = season.settings?.maxMatches ?? DEFAULT_MAX_MATCHES;
  // Matches each team still has to play in conference, so extra matches
  // don't push a team past the cap.
  const confLeft = Object.fromEntries(names.map(n => [n, 0]));
  for (const pairs of Object.values(slotPairs)) for (const [a, b] of pairs) { confLeft[a]++; confLeft[b]++; }
  const room = n => cap - played[n] - confLeft[n];

  // "Play everyone once" non-conference schedule (the men's default): every
  // pair of teams from different conferences meets once, two rounds a week
  // (Friday and Saturday) from week 1, before conference play starts. No
  // invitationals and no extra matches on open dates.
  if (season.settings?.nonConf === 'once') {
    const confStart = Math.min(REG + 1, ...Object.keys(slotPairs).map(k => +k.split('|')[0]));
    let left = shuffle(names.flatMap((a, i) => names.slice(i + 1).filter(b => !rival(teams, a, b)).map(b => [a, b])), r);
    // One round: as many disjoint pairs as fit, teams with the most matches
    // still to place first, skipping teams already busy in that slot.
    const takeRound = busy => {
      const need = {};
      for (const [a, b] of left) { need[a] = (need[a] || 0) + 1; need[b] = (need[b] || 0) + 1; }
      left.sort((x, y) => (need[y[0]] + need[y[1]]) - (need[x[0]] + need[x[1]]));
      const used = new Set(busy), round = [];
      for (const pr of left) if (!used.has(pr[0]) && !used.has(pr[1])) { round.push(pr); used.add(pr[0]); used.add(pr[1]); }
      const gone = new Set(round);
      left = left.filter(pr => !gone.has(pr));
      return round;
    };
    const place = (w, k, round) => { const day = seriesDays('fs')[k]; for (const [a, b] of round) { const [h, aw] = orient(a, b); add(w, h, aw, { ...day, order: DAY_ORDER[day.day] + 0.5, slot: k }); } };
    // Before conference play: the rounds end the week before it starts.
    const preSlots = (confStart - 1) * PER_WEEK, rounds = [];
    while (left.length && rounds.length < preSlots) rounds.push(takeRound([]));
    const first = confStart - Math.ceil(rounds.length / PER_WEEK);
    rounds.forEach((round, i) => place(first + Math.floor(i / PER_WEEK), i % PER_WEEK, round));
    // Anything left goes in conference weeks, around the conference matches.
    for (let w = confStart; w <= REG && left.length; w++) for (let k = 0; k < PER_WEEK && left.length; k++) {
      place(w, k, takeRound((slotPairs[`${w}|${k}`] || []).flatMap(([a, b]) => [a, b])));
    }
    for (let week = 1; week <= REG; week++) for (let slot = 0; slot < PER_WEEK; slot++) for (const [a, b, conf] of slotPairs[`${week}|${slot}`] || []) {
      const days = seriesDays(season.settings?.confWeekend?.[conf]);
      add(week, a, b, { ...days[slot], confGame: true, slot });
    }
    // The season starts in week 1 and is as long as it needs to be (the
    // weeks setting is the most it may use).
    const shift = Math.min(...games.map(g => g.week)) - 1;
    if (shift > 0) for (const g of games) g.week -= shift;
    season.regWeeks = Math.max(1, ...games.map(g => g.week));
    return games;
  }

  for (let week = 1; week <= REG; week++) {
    const busy = new Set();
    for (let slot = 0; slot < PER_WEEK; slot++) for (const [a, b] of slotPairs[`${week}|${slot}`] || []) { busy.add(a); busy.add(b); }
    // Teams with no conference matches this week play two non-conference
    // matches, Friday and Sunday, while they have room under the cap.
    for (const day of ['Fri', 'Sun']) {
      const free = names.filter(n => !busy.has(n) && room(n) >= 1);
      for (const [a, b] of nearCross(free, teams, met, r, dist)) { const [h, aw] = orient(a, b); add(week, h, aw, { day, order: DAY_ORDER[day] }); }
    }
    if (!busy.size) continue;
    for (let slot = 0; slot < PER_WEEK; slot++) {
      for (const [a, b, conf] of slotPairs[`${week}|${slot}`] || []) {
        const days = seriesDays(season.settings?.confWeekend?.[conf]);
        add(week, a, b, { ...days[slot], confGame: true, slot });
        confLeft[a]--; confLeft[b]--;
      }
    }
    // A team with only one conference match this week just plays that one.
    // A team with no match at all this week (a bye in both slots, or an
    // independent left out of invitationals) is paired across conferences
    // for one non-conference match on Sunday, when it can be.
    const playing = new Set(games.filter(g => g.week === week).flatMap(g => [g.home, g.away]));
    const idle = names.filter(n => !playing.has(n) && room(n) >= 1);
    const { pairs: extra } = crossPairs(idle, teams, met, r);
    for (const [a, b] of extra) { const [h, aw] = orient(a, b); add(week, h, aw, { ...seriesDays('fsu')[1], slot: 1 }); }
  }
  return games;
}
