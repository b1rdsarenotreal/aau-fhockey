// Logic tests: run with `node tests/logic.test.mjs`
import assert from 'node:assert/strict';
import { ALIGNMENT, newLeague, currentSeason, simGames, startNextSeason, beginOffseason, draftWarnings, applyResult, clearResult, estimateHE, migrateLeague, addConference, rebuildSchedule, weekName } from '../js/league.js';
import { simulateGame, winProbability, simulatedWinRate, matchOdds, ovr, QUARTERS } from '../js/sim.js';
import { confRounds, confSeriesCounts, confTarget, DEFAULT_REG_WEEKS, DEFAULT_MAX_MATCHES } from '../js/schedule.js';
import { records, confStandings, rpi, isFinal, isTie, winnerOf, resultFor, INDEPENDENT } from '../js/standings.js';
import { gameVenue, postseasonFinish, postseasonRecord, wsTeams, ncaaProblems, fieldSize, DEFAULT_NCAA, postWeeks, ncaaConfig, aqConferences, autoBids } from '../js/postseason.js';
import { recordBook } from '../js/records.js';
import { readAauLogos, applyAauLogos } from '../js/logo-import.js';
import { seedTeams, splitOvr, COACHES, CONFERENCES, conferencesFor, SIDES } from '../js/data.js';
import { existsSync } from 'node:fs';
import { rng } from '../js/util.js';

const t0 = Date.now();
let n = 0;
const check = (name, fn) => {
  try { fn(); } catch (e) { console.error(`✗ ${name}`); throw e; }
  n++;
};
const reg = s => s.games.filter(g => g.type === 'regular');
const count = (games, pick = () => true) => { const c = {}; for (const g of games) for (const t of [g.home, g.away]) if (pick(g, t)) c[t] = (c[t] || 0) + 1; return c; };

check('every AAU field hockey program in the commissioner\'s conferences', () => {
  const T = seedTeams();
  assert.equal(Object.keys(T).length, 29);
  assert.ok(!T.WashU, 'WashU plays club field hockey, not varsity');
  const sizes = {};
  for (const t of Object.values(T)) sizes[t.conference] = (sizes[t.conference] || 0) + 1;
  assert.deepEqual(sizes, { 'Big Ten': 7, 'Coastal Atlantic Conference': 4, 'Ivy League': 8, 'Metro Conference': 3, 'Pacific-10 Conference': 2, 'UC Athletic Association': 1, 'University Athletic Association': 4 });
  assert.equal(T.Maryland.conference, 'Coastal Atlantic Conference');
  assert.equal(T.Rutgers.conference, 'Metro Conference');
  assert.ok(!conferencesFor()['Southwest Conference']);
  assert.ok(Object.values(T).every(t => t.stadium && t.city && t.color && t.mascot && t.coach), 'fields, cities, colors, mascots and coaches');
  assert.equal(new Set(Object.values(COACHES)).size, 29, 'every coach is a different person');
  assert.equal(T.Northwestern.coach, 'Tracey Fuchs');
  assert.equal(T['Boston University'].coach, 'Sarah Shute');
  for (const t of Object.values(T)) assert.ok(Math.abs(ovr(t) - (t.off * 0.4 + t.pit * 0.3 + t.def * 0.3)) < 1);
  assert.ok(ovr(T.Northwestern) > ovr(T.Tufts) + 30, 'Division I above Division III');
  for (const c of Object.keys(CONFERENCES)) assert.ok((/^https:\/\//.test(CONFERENCES[c].logo) || existsSync(new URL(`../${CONFERENCES[c].logo}`, import.meta.url))), `${c} logo`);
  const s = splitOvr('Duke', 80);
  assert.ok(Math.abs(0.4 * s.off + 0.3 * s.pit + 0.3 * s.def - 80) <= 0.5);
  assert.deepEqual(Object.keys(SIDES), ['women'], 'one dynasty');
});

check('matches: four quarters, a sudden-victory overtime, then a shootout; never a tie', () => {
  const T = seedTeams(), A = T.Princeton, B = T.Harvard;
  let level = 0, ots = 0, sos = 0, goals = 0, shots = 0, pcs = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const r = simulateGame(A, B, { type: 'regular' }, { seed: i + 1 });
    assert.ok(r.homeLine.length === QUARTERS || r.homeLine.length === QUARTERS + 1);
    assert.equal(r.home.R, r.homeLine.reduce((a, b) => a + b, 0));
    assert.ok(r.home.H >= r.home.R, 'shots ≥ goals');
    const q4 = l => l.slice(0, 4).reduce((a, b) => a + b, 0);
    if (q4(r.homeLine) === q4(r.awayLine)) level++;
    if (r.homeLine.length > QUARTERS) { ots++; assert.ok(r.homeLine[4] + r.awayLine[4] <= 1, 'sudden victory'); }
    if (r.home.R === r.away.R) { assert.ok(r.pk && r.pk.home !== r.pk.away, 'a shootout decides a level match'); sos++; } else assert.ok(!r.pk);
    goals += r.home.R + r.away.R; shots += r.home.H + r.away.H; pcs += r.home.E + r.away.E;
  }
  console.log(`  ${(100 * level / N).toFixed(1)}% level after 60, ${(100 * sos / N).toFixed(1)}% shootouts, ${(goals / N / 2).toFixed(2)} goals, ${(shots / N / 2).toFixed(1)} shots, ${(pcs / N / 2).toFixed(1)} corners per team`);
  assert.ok(level / N > 0.1 && level / N < 0.3);
  assert.equal(ots, level);
  assert.ok(sos > 0 && sos < level);
  assert.ok(goals / N / 2 > 1.8 && goals / N / 2 < 3.2, 'about 2.3 goals per team');
  const o = matchOdds(T.Northwestern, T.MIT, {});
  assert.ok(Math.abs(o.win + o.tie + o.loss - 1) < 1e-9 && o.win > 0.9);
  const est = winProbability(T.Iowa, T.Michigan, {}), simd = simulatedWinRate(T.Iowa, T.Michigan, {}, {}, 1500);
  assert.ok(Math.abs(est - simd) < 0.07, `win chance ${est.toFixed(2)} vs simulated ${simd.toFixed(2)}`);
});

check('a shootout win is a win; hand-entered scores get shots and corners', () => {
  const g = { type: 'regular', home: 'A', away: 'B', homeR: 2, awayR: 2, pk: { home: 2, away: 3 }, final: true, homeLine: [1, 1, 0, 0, 0], awayLine: [0, 2, 0, 0, 0] };
  assert.equal(winnerOf(g), 'B');
  assert.equal(resultFor(g, 'B'), 'W');
  assert.equal(resultFor(g, 'A'), 'L');
  assert.ok(!isTie(g));
  const L = newLeague(), s = currentSeason(L), x = reg(s)[0];
  const e = estimateHE(s, x, [1, 0, 1, 0], [0, 0, 0, 0]);
  assert.ok(e.home.H >= 2 && e.home.E >= 0 && e.away.H >= 0);
});

check('schedule: two matches a week, Friday and Sunday; a single round robin in conference', () => {
  const L = newLeague(), s = currentSeason(L), g = reg(s);
  assert.equal(s.regWeeks, DEFAULT_REG_WEEKS);
  assert.ok(g.every(x => ['Fri', 'Sun'].includes(x.day)));
  const day = new Set();
  for (const x of g) for (const t of [x.home, x.away]) { const k = `${t}|${x.week}|${x.day}`; assert.ok(!day.has(k), k); day.add(k); }
  const totals = Object.values(count(g));
  console.log(`  ${Math.min(...totals)}–${Math.max(...totals)} matches per team`);
  assert.ok(Math.min(...totals) >= 13 && Math.max(...totals) <= DEFAULT_MAX_MATCHES);
  const conf = count(g.filter(x => x.confGame));
  const sizes = {};
  for (const t of Object.values(s.teams)) sizes[t.conference] = (sizes[t.conference] || 0) + 1;
  for (const t of Object.values(s.teams)) assert.equal(conf[t.school] || 0, confTarget(sizes[t.conference]), `${t.school}: everyone once (twice in a conference of 6 or fewer)`);
  const meets = {};
  for (const x of g.filter(x => x.confGame)) (meets[[x.home, x.away].sort().join('|')] ||= []).push(x.home);
  for (const [k, homes] of Object.entries(meets)) {
    const size = sizes[s.teams[k.split('|')[0]].conference];
    if (size <= 6) assert.ok(homes.length === 2 && homes[0] !== homes[1], `${k}: home and away`);
    else assert.equal(homes.length, 1, `${k}: once`);
  }
  assert.equal(confTarget(4), 6); assert.equal(confTarget(7), 6); assert.equal(confTarget(8), 7);
  assert.ok(g.every(x => x.confGame || s.teams[x.home].conference !== s.teams[x.away].conference));
  const confWeek = new Set(g.filter(x => x.confGame).flatMap(x => [`${x.home}|${x.week}`, `${x.away}|${x.week}`]));
  assert.equal(g.filter(x => !x.confGame && (confWeek.has(`${x.home}|${x.week}`) || confWeek.has(`${x.away}|${x.week}`))).length, 0);
});

check('conference round robins are fair at every size', () => {
  const r = rng(7);
  for (let k = 2; k <= 12; k++) {
    const list = Array.from({ length: k }, (_, i) => `T${i}`);
    const c = confSeriesCounts(confRounds(list, 22, r), list);
    assert.equal(new Set(Object.values(c)).size, 1, `${k} teams`);
  }
  assert.equal(confTarget(8), 7);
});

check('automatic bids only for conferences with 4 or more teams', () => {
  const L = newLeague(), s = currentSeason(L);
  assert.deepEqual(aqConferences(s).sort(), ['Big Ten', 'Coastal Atlantic Conference', 'Ivy League', 'University Athletic Association']);
  s.settings.aqMin = 1;
  assert.equal(aqConferences(s).length, 7);
  delete s.settings.aqMin;
});

check('a match is at the home team\'s field; week names; format checks', () => {
  const L = newLeague(), s = currentSeason(L);
  const g = reg(s).find(x => !x.neutral);
  assert.equal(gameVenue(s, g).stadium, s.teams[g.home].stadium);
  assert.deepEqual(postWeeks(s), { conf: 11, regional: 12, mcws: 13 });
  assert.equal(weekName(12, s), 'First Round & Quarterfinals');
  assert.equal(weekName(13, s), 'Final Four');
  assert.equal(fieldSize(DEFAULT_NCAA), 12);
  assert.deepEqual(ncaaProblems(DEFAULT_NCAA, 29), []);
  assert.ok(ncaaProblems({ regionals: 4, perRegional: 8, wsSize: 4 }, 29).length, '32 teams is more than the league');
});

const league = newLeague();
const s = currentSeason(league);
simGames(s, undefined, { autoLock: true, max: 6000 });

check('a season: conference tournaments, 12 teams in four regions of three, the Final Four', () => {
  assert.equal(s.phase, 'complete');
  const R = reg(s);
  assert.ok(R.every(isFinal) && !R.some(isTie), 'no ties');
  assert.ok(R.some(g => g.pk), 'regular-season shootouts happen');
  // Conference tournaments: top 4, only for the bigger conferences.
  assert.deepEqual(Object.keys(s.post.confT).sort(), ['Big Ten', 'Coastal Atlantic Conference', 'Ivy League', 'University Athletic Association']);
  for (const ev of Object.values(s.post.confT)) {
    assert.equal(ev.size, 4);
    const gs = s.games.filter(g => g.event === ev.id);
    assert.deepEqual([...new Set(gs.map(g => g.day))].sort(), ['Fri', 'Sun']);
  }
  const auto = Object.values(autoBids(s));
  assert.equal(auto.length, 4);
  assert.ok(auto.every(t => s.post.field.some(f => f.team === t)), 'the automatic qualifiers are in');
  assert.equal(s.post.field.length, 12);
  const W = postWeeks(s);
  for (const ev of s.post.regionals) {
    assert.equal(ev.seeds.length, 3);
    const gs = s.games.filter(g => g.event === ev.id);
    assert.equal(gs.length, 2);
    const first = gs.find(g => g.day === 'Fri'), qf = gs.find(g => g.day === 'Sun');
    assert.ok(![first.home, first.away].includes(ev.seeds[0]), 'the top seed waits a round');
    assert.equal(qf.home, ev.seeds[0], 'the top seed hosts the quarterfinal');
    assert.ok(gs.every(g => !g.neutral && g.week === W.regional));
  }
  const ff = s.games.filter(g => g.type === 'mcws');
  assert.equal(ff.length, 3);
  assert.ok(ff.every(g => g.neutral && gameVenue(s, g).stadium === 'Trager Stadium'));
  assert.deepEqual(ff.map(g => g.day).sort(), ['Fri', 'Fri', 'Sun']);
  assert.equal(postseasonFinish(s, s.post.champion), 'National champion');
  assert.equal(wsTeams(s).length, 4);
  const pr = postseasonRecord(s, s.post.champion);
  assert.equal(pr.ncaa.w, 4 - (s.post.field.find(f => f.team === s.post.champion).seed <= 4 ? 1 : 0), 'a top-4 seed plays three national matches, the rest four');
  assert.ok(s.polls.final);
});

check('clearing a result removes the shootout', () => {
  const g = s.games.find(x => x.pk);
  const copy = { ...g };
  clearResult(copy);
  assert.ok(!copy.pk && !copy.final);
});

check('logos from the AAU Dynasty', () => {
  const L = newLeague();
  const backup = { schools: [{ id: 'x', name: 'Duke University', short: 'Duke', logo: 'data:image/png;base64,AAAA' }], conferences: { c1: { name: 'Ivy League', logo: 'https://e.com/ivy.png' } } };
  const got = applyAauLogos(L, readAauLogos(backup));
  assert.deepEqual(got, { teams: ['Duke'], conferences: ['Ivy League'] });
  assert.throws(() => readAauLogos({ seasons: {} }));
});

check('an unstarted saved dynasty picks up the commissioner\'s conferences', () => {
  const L = newLeague(), s0 = currentSeason(L);
  delete L.alignment;
  s0.teams.Stanford.conference = 'Big Ten';
  migrateLeague(L);
  assert.equal(L.alignment, ALIGNMENT);
  assert.equal(s0.teams.Stanford.conference, 'Pacific-10 Conference');
});

check('record book', () => {
  const B = recordBook(league);
  assert.ok(B.games.length > 250);
  assert.ok(B.games.some(g => g.pk));
  assert.ok(B.programs.some(x => x.titles === 1));
});

check('offseason and the next season', () => {
  beginOffseason(league);
  assert.ok(Array.isArray(draftWarnings(league)));
  addConference(league, 'West Coast', { abbr: 'WC', color: '#123456' });
  for (const t of ['California', 'Stanford', 'UC Davis']) league.draft.teams[t].conference = 'West Coast';
  const s2 = startNextSeason(league);
  assert.equal(s2.year, 2031);
  const conf = count(reg(s2).filter(g => g.confGame && s2.teams[g.home].conference === 'West Coast'));
  assert.deepEqual(Object.values(conf), [4, 4, 4], 'a 3-team conference plays everyone twice');
  rebuildSchedule(s2, s);
  assert.ok(reg(s2).length > 0);
});

check('a saved league loads again', () => {
  const copy = JSON.parse(JSON.stringify(league));
  migrateLeague(copy);
  assert.equal(copy.currentYear, 2031);
});

console.log(`${n} checks ok in ${Date.now() - t0} ms`);

// ---- NPI ----
{
  const { npi, rating, records: recsOf } = await import('../js/standings.js');
  const { NPI_BY_SIDE } = await import('../js/league.js');
  for (const side of ['women']) {
    const lg = newLeague({ side }), s = currentSeason(lg);
    assert.equal(s.settings.index, 'npi', 'new leagues use the NPI');
    assert.deepEqual(s.settings.npi, NPI_BY_SIDE[side], `${side} has its own NPI dials`);
    simGames(s, g => g.type === 'regular', { max: 12000 });
    const n = npi(s), r = rating(s), recs = recsOf(s);
    const vals = Object.values(n).filter(x => x.games).map(x => x.npi);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    assert.ok(Math.abs(mean - 50) < 4, `NPI averages near 50 (${mean.toFixed(2)})`);
    for (const [t, x] of Object.entries(n)) {
      if (!x.games) continue;
      assert.equal(r[t].rpi, x.npi, 'rating() is the NPI');
      assert.ok(x.adj.w >= Math.min(Math.ceil(s.settings.npi.minWins), recs[t].w), `${t} keeps its minimum wins`);
      assert.ok(x.adj.l <= recs[t].l && x.adj.l + x.adj.t + x.adj.w + x.dropped === x.games, 'only wins are dropped');
    }
    const old = JSON.parse(JSON.stringify(lg)); delete old.indexVersion; Object.assign(currentSeason(old).settings, { index: undefined, npi: undefined });
    migrateLeague(old);
    assert.equal(currentSeason(old).settings.index, 'npi');
    assert.deepEqual(currentSeason(old).settings.npi, NPI_BY_SIDE[side]);
  }
  console.log('NPI ok');
}
