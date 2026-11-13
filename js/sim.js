// Field hockey match simulator. Plays the match minute by minute from the
// teams' ratings: ATT (attack, stored as `off`), MID (midfield, `pit`) and
// DEF (defense and goalkeeping, `def`). College rules (NCAA Division I, 2026):
// - four 15-minute quarters;
// - a match level after 60 minutes, in the regular season or the postseason,
//   goes to one 15-minute sudden-victory overtime (the first goal wins);
// - still level, a shootout: five one-on-one attempts each, then more rounds
//   of five until one team is ahead after a round. The shootout winner gets
//   the win; field hockey matches never end in a tie.
//
// The result keeps the field names the rest of the app uses for every game:
// homeLine / awayLine are goals per period (four quarters, then any
// overtime), R is goals, H is shots, E is penalty corners, `innings` is the
// number of periods played and `pk` the shootout goals ({ home, away }).
// A simulation is only a suggestion — the commissioner reviews and saves it.

import { rng as makeRng } from './util.js?v=20261112225216';

export const OVR_WEIGHTS = { off: 0.4, pit: 0.3, def: 0.3 };
const ovrExact = t => t.off * OVR_WEIGHTS.off + t.pit * OVR_WEIGHTS.pit + t.def * OVR_WEIGHTS.def;
export function ovr(t) { return Math.round(ovrExact(t)); }

export const QUARTER = 15, QUARTERS = 4, OT = 15, OT_PERIODS = 1;
export const REG_MINUTES = QUARTER * QUARTERS;
const GOALS = 2.3;       // goals per team per 60 minutes between equal teams
const SHOTS = 11;        // shots per team per 60 minutes between equal teams
const CORNERS = 6;       // penalty corners per team per 60 minutes
const TALENT = 26;       // rating points per unit of log goal rate (lower = fewer upsets)
const HOME = 0.08;       // home field, on the log goal rate

// Goals a team expects per 60 minutes against this opponent.
function goalRate(att, opp, home, vol) {
  const x = ((att.off - opp.def) * 0.6 + (att.pit - opp.pit) * 0.4) / TALENT / vol + (home ? HOME : -HOME / 2);
  return GOALS * Math.exp(x);
}

// Whether a level match goes to overtime and a shootout: every match in field
// hockey (there are no ties).
export const isKnockout = () => true;

// Play `minutes` minutes. With `golden`, stop at the first goal. Shots (H)
// and penalty corners (E) are counted as they happen.
function playPeriod(minutes, rate, shotRate, r, stats, golden) {
  const goals = { home: 0, away: 0 };
  for (let m = 0; m < minutes; m++) {
    for (const side of ['home', 'away']) {
      if (r() < shotRate[side].corner / REG_MINUTES) stats[side].E++;
      if (r() >= shotRate[side].shot / REG_MINUTES) continue;
      stats[side].H++;
      // Chance a shot goes in, so goals average `rate`.
      if (r() < Math.min(0.9, rate[side] / shotRate[side].shot)) goals[side]++;
      if (golden && goals.home !== goals.away) return goals; // sudden victory
    }
  }
  return goals;
}

// Shootout: five one-on-one attempts each (eight seconds from the 25-yard
// line); if level, another round of five, until one team is ahead after a
// round. A better attack scores a little more often, a better goalkeeper (DEF)
// saves a little more.
function shootout(home, away, r) {
  const p = (shooter, keeper) => Math.max(0.35, Math.min(0.75, 0.55 + (shooter.off - keeper.def) / 400));
  const ph = p(home, away), pa = p(away, home);
  let h = 0, a = 0;
  for (let round = 0; round < 20; round++) {
    for (let k = 1; k <= 5; k++) {
      if (r() < ph) h++;
      if (h > a + (5 - k + 1) || a > h + (5 - k)) break; // decided before the round ends
      if (r() < pa) a++;
      if (h > a + (5 - k) || a > h + (5 - k)) break;
    }
    if (h !== a) break;
  }
  if (h === a) h++; // never happens; a guard
  return { home: h, away: a };
}

export function simulateGame(homeTeam, awayTeam, game = {}, { seed, volatility = 1 } = {}) {
  const r = makeRng(seed);
  const neutral = !!game.neutral;
  const rate = { home: goalRate(homeTeam, awayTeam, !neutral, volatility), away: goalRate(awayTeam, homeTeam, false, volatility) };
  if (neutral) rate.away = goalRate(awayTeam, homeTeam, false, volatility) * Math.exp(HOME / 2), rate.home = goalRate(homeTeam, awayTeam, false, volatility) * Math.exp(HOME / 2);
  // Better teams take more shots and earn more corners.
  const lean = side => Math.sqrt(rate[side] / GOALS);
  const shotRate = { home: { shot: SHOTS * lean('home'), corner: CORNERS * lean('home') }, away: { shot: SHOTS * lean('away'), corner: CORNERS * lean('away') } };
  const stats = { home: { H: 0, E: 0 }, away: { H: 0, E: 0 } };
  const homeLine = [], awayLine = [];
  for (let q = 0; q < QUARTERS; q++) {
    const g = playPeriod(QUARTER, rate, shotRate, r, stats, false);
    homeLine.push(g.home); awayLine.push(g.away);
  }
  const total = l => l.reduce((a, b) => a + b, 0);
  let pk = null;
  if (isKnockout(game) && total(homeLine) === total(awayLine)) {
    for (let p = 0; p < OT_PERIODS && total(homeLine) === total(awayLine); p++) {
      const g = playPeriod(OT, rate, shotRate, r, stats, true);
      homeLine.push(g.home); awayLine.push(g.away);
    }
    if (total(homeLine) === total(awayLine)) pk = shootout(homeTeam, awayTeam, r);
  }
  return {
    homeLine, awayLine,
    home: { R: total(homeLine), H: stats.home.H, E: stats.home.E },
    away: { R: total(awayLine), H: stats.away.H, E: stats.away.E },
    innings: homeLine.length, runRule: false, pk,
  };
}

// Shots and penalty corners for a score entered by hand, from the goals and
// both teams' ratings: about eight shots in a scoreless match plus three a
// goal, a little more for the stronger team; corners about half the shots.
// Shots are never fewer than the goals.
export function estimateHitsErrors(homeTeam, awayTeam, game, homeLine, awayLine, { seed } = {}) {
  const r = makeRng(seed ?? 1);
  const goals = l => l.reduce((a, b) => a + (Number(b) || 0), 0);
  const minutes = REG_MINUTES + Math.max(0, homeLine.length - QUARTERS) * OT;
  const one = (g, me, opp) => {
    const lean = Math.exp(((me.off - opp.def) * 0.6 + (me.pit - opp.pit) * 0.4) / TALENT / 2);
    const H = Math.max(g, Math.round((7 * lean + g * 2 + r() * 4 - 2) * minutes / REG_MINUTES));
    const E = Math.max(0, Math.round(H * (0.5 + (r() - 0.5) * 0.3)));
    return { H, E };
  };
  return { home: one(goals(homeLine), homeTeam, awayTeam), away: one(goals(awayLine), awayTeam, homeTeam) };
}

// Home team's chances: win, level and loss over 60 minutes, from a Poisson
// model of the two goal rates (a close fit to the simulator).
export function matchOdds(homeTeam, awayTeam, game = {}, { volatility = 1 } = {}) {
  const neutral = !!game.neutral;
  const lh = goalRate(homeTeam, awayTeam, !neutral, volatility) * (neutral ? Math.exp(HOME / 2) : 1);
  const la = goalRate(awayTeam, homeTeam, false, volatility) * (neutral ? Math.exp(HOME / 2) : 1);
  const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
  let win = 0, tie = 0, loss = 0;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
    const p = pois(lh, i) * pois(la, j);
    if (i > j) win += p; else if (i === j) tie += p; else loss += p;
  }
  const n = win + tie + loss;
  return { win: win / n, tie: tie / n, loss: loss / n };
}

// Home team's chance to win. A match level after 60 minutes goes to overtime
// and a shootout, so that share is split about evenly (a little toward the
// better team).
export function winProbability(homeTeam, awayTeam, game = {}, opts = {}) {
  const o = matchOdds(homeTeam, awayTeam, game, opts);
  return o.win + o.tie * (o.win / (o.win + o.loss || 1) * 0.3 + 0.35);
}

// Slower check of the formula above by simulating the matchup.
export function simulatedWinRate(homeTeam, awayTeam, game = {}, opts = {}, n = 2000) {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const res = simulateGame(homeTeam, awayTeam, game, { ...opts, seed: i * 7919 + 1 });
    if (res.home.R > res.away.R || (res.pk && res.pk.home > res.pk.away)) wins++;
    else if (res.home.R === res.away.R && !res.pk) wins += 0.5;
  }
  return wins / n;
}
