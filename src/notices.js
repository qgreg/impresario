/**
 * The Notices: what the night actually did to you.
 *
 * This is the epilogue rather than a phase — there is no decision in it — but
 * it is the piece that makes the game a game. Without it money only ever leaves
 * the account, and an impresario who mounts one show is broke forever with no
 * way back. A loop that cannot be re-entered is not a loop.
 *
 * Opening night is not built yet, so the mishaps are rolled here. When it is,
 * the spotlight decides them instead and this module keeps its shape: it takes
 * a count of what actually went wrong and turns it into money and reputation.
 * The roll is injected rather than reached for, so every case is testable.
 */

import { AUDIENCES } from './bill.js';
import { FATES } from './data.js';

/** What each audience is worth at the box office. Critics pay nothing, ever. */
export const WORTH = { crowd: 4, society: 5, critics: 0 };

/** How likely each thing that could go wrong actually does. */
export const MISHAP_CHANCE = 0.35;

/** What one mishap costs, as a fraction of the night's takings. */
export const MISHAP_DAMAGE = 0.06;

/**
 * The notice a competent production is simply expected to receive. Beat it and
 * your standing rises; fall short and it slides. Reputation is comparative.
 */
export const CRITIC_EXPECTATION = 14;

/** How much better than expected one step of standing costs. */
export const STANDING_STEP = 6;

/**
 * How many of the things that could go wrong did.
 *
 * Rolled per item rather than scaled, so a reckless production is genuinely a
 * gamble rather than a fixed tax: sixteen things that might go wrong can, on a
 * kind night, produce three.
 */
export function rollMishaps(volatility, rng = Math.random) {
  let mishaps = 0;
  for (let i = 0; i < Math.max(0, volatility); i++) {
    if (rng() < MISHAP_CHANCE) mishaps++;
  }
  return mishaps;
}

/**
 * Settle the night.
 *
 * @param {object} show  { appeal, volatility, outlay }
 * @param {object} opts  { rng, mishaps } — pass `mishaps` to skip the roll,
 *                       which is how opening night will hand in its own answer
 */
export function settleShow({ appeal, volatility, outlay }, { rng = Math.random, mishaps = null } = {}) {
  // Volatility can end up below zero — a calm bill, a steady cast and a month of
  // rehearsal genuinely can leave nothing to go wrong. That must floor at "the
  // night passed without incident", never at a bonus: unclamped, a negative
  // mishap count turned the damage into a multiplier and paid out above the
  // gross, which is money invented from carefulness.
  const wentWrong = Math.max(0, mishaps ?? rollMishaps(volatility, rng));

  // An audience that is hostile does not pay you to insult them, but it cannot
  // take money out of the till either — the floor is an empty house, not a debt.
  const gross = AUDIENCES.reduce((sum, a) => sum + Math.max(0, appeal[a]) * WORTH[a], 0);
  const damage = Math.max(0, Math.min(0.85, wentWrong * MISHAP_DAMAGE));
  const takings = Math.round(gross * (1 - damage));

  // Reputation is the critics' business and nobody else's. A show can make
  // money and lose you standing, which is the whole tension of the three
  // audiences and the thing that should make a season interesting.
  //
  // It moves on whether you *beat expectations*, not on absolute approval. The
  // first version scaled straight off the critics' appeal and made a competent
  // impresario the toast of London by week two, which emptied the word of any
  // meaning. A merely respectable notice now moves nothing at all.
  const standing = Math.round(
    (receivedAppeal(appeal, wentWrong).critics - CRITIC_EXPECTATION) / STANDING_STEP);

  return {
    mishaps: wentWrong,
    couldHaveGoneWrong: volatility,
    gross,
    takings,
    outlay,
    profit: takings - outlay,
    standing,
    notices: noticesFor(appeal, wentWrong),
    received: receivedAppeal(appeal, wentWrong),
  };
}

/**
 * How much of a night's appeal actually survives contact with the audience.
 *
 * The notices used to be looked up from the appeal alone, which produced a show
 * that lost ninety guineas amid nine separate disasters and was still called
 * the finest thing of the season. What a house came *hoping* for and what it
 * saw are different quantities, and the reviews have to describe the second.
 *
 * The three audiences forgive at different rates. The gallery came for a night
 * out and will take a shambles in good part; the boxes are embarrassed to be
 * seen at one; the critics are paid to notice and never forget.
 */
export const FORGIVENESS = { crowd: 1.5, society: 2, critics: 2.5 };

export function receivedAppeal(appeal, mishaps) {
  const received = {};
  for (const audience of AUDIENCES) {
    received[audience] = appeal[audience] - mishaps * FORGIVENESS[audience];
  }
  return received;
}

const CROWD_NOTICES = [
  [18, 'The gallery would not go home.'],
  [10, 'A good house, and a loud one.'],
  [4, 'They came, and they were content enough.'],
  [0, 'Thin, and quiet with it.'],
  [-99, 'The pit was largely empty and entirely honest about why.'],
];

const SOCIETY_NOTICES = [
  [18, 'Every box taken, and two duchesses fighting over one of them.'],
  [10, 'The boxes were full and stayed to the end.'],
  [4, 'A respectable showing upstairs.'],
  [0, 'Society stayed away, politely.'],
  [-99, 'You will not be forgiven for this in Belgravia.'],
];

const CRITIC_NOTICES = [
  [18, 'The Times calls it the finest thing this season.'],
  [10, 'Warmly noticed, and at length.'],
  [4, 'Respectful, with reservations.'],
  [0, 'Briefly mentioned, on an inside page.'],
  [-99, 'One review simply lists what went wrong, in order.'],
];

function pick(table, value) {
  return table.find(([floor]) => value >= floor)[1];
}

export function noticesFor(appeal, mishaps) {
  // Reviews describe the night that happened, not the night that was planned.
  const seen = receivedAppeal(appeal, mishaps);
  const notices = [
    { audience: 'crowd', text: pick(CROWD_NOTICES, seen.crowd) },
    { audience: 'society', text: pick(SOCIETY_NOTICES, seen.society) },
    { audience: 'critics', text: pick(CRITIC_NOTICES, seen.critics) },
  ];
  if (mishaps > 4) {
    notices.push({ audience: 'critics', text: `${mishaps} separate disasters were counted from the stalls.` });
  }
  return notices;
}

/** Standing in words. The number is never shown on its own. */
export function gradeStanding(standing) {
  if (standing >= 14) return 'the toast of London';
  if (standing >= 9) return 'celebrated';
  if (standing >= 5) return 'talked about';
  if (standing >= 2) return 'promising';
  if (standing >= 0) return 'unknown';
  if (standing >= -3) return 'shaky';
  return 'notorious';
}

/**
 * The least a complete production can possibly cost.
 *
 * Computed rather than guessed, because guessing it wrong is the whole bug. The
 * first version of the ruin test compared the purse to the cheapest *work* on
 * the shelf — eighteen guineas — but a work is not a production. It needs a cast
 * and something to stand in front of, and the true floor turns out to be well
 * over that. An impresario with twenty-five guineas was told they were fine,
 * mounted a bill they could afford, and then could not pay anybody: not ruined,
 * not playing, just stuck.
 *
 * The search is exhaustive because the shelf is small, and it re-derives itself
 * from the data — so adding a cheaper play or a dearer floor cannot leave this
 * quietly out of date.
 *
 * @param {object} tables { works, treatments, hooks, performers, stagings, preparations }
 * @param {Function} rolesOf  from bill.js — how a treatment reshapes the cast list
 * @param {Function} costOf   from bill.js — what a bill costs
 */
export function cheapestProduction(tables, rolesOf, costOf) {
  const { works, treatments, hooks, performers, stagings, preparations } = tables;
  const freeHook = hooks.reduce((cheapest, hook) => (hook.cost < cheapest.cost ? hook : cheapest));
  const set = Math.min(...stagings.map((s) => s.cost));
  const rehearsal = Math.min(...preparations.map((p) => p.cost));

  // Anyone a backer imposes is not somebody the impresario can choose to hire.
  const hireable = performers.filter((p) => !p.imposed).map((p) => p.salary).sort((a, b) => a - b);

  let floor = Infinity;
  for (const work of works) {
    for (const treatment of treatments) {
      const roles = rolesOf(work, treatment).length;
      if (roles > hireable.length) continue;
      const wages = hireable.slice(0, roles).reduce((sum, salary) => sum + salary, 0);
      floor = Math.min(floor, costOf(work, treatment, freeHook) + wages + set + rehearsal);
    }
  }
  return Number.isFinite(floor) ? floor : 0;
}

/**
 * Whether another show is possible at all.
 *
 * A season has to be able to end, or a broke impresario simply taps through
 * bills they cannot afford forever — which is not a loss, it is a hang. Ruin is
 * the real losing condition and it is worth naming.
 *
 * `floor` must be the cost of a whole production, not of a bill.
 */
export function isRuined(capital, floor) {
  return capital < floor;
}

/**
 * How the season ended.
 *
 * Ruin used to be one card saying the same sentence every time, which made
 * losing read as a wall rather than as an ending. A fate is chosen by *how* the
 * season went wherever the circumstances say anything — a celebrated pauper and
 * a notorious one deserve different obituaries — and drawn from the general pool
 * otherwise.
 *
 * The specific fates are listed first in FATES and the first match wins, so
 * ordering that table is how the priority is expressed.
 *
 * @param {object} season { impresario, weeks, standing, capital, backersSpent }
 * @param {Function} rng  injected, so a test can pin the general pool
 */
export function fateFor(season, rng = Math.random) {
  const context = {
    impresario: season.impresario ?? null,
    weeks: season.weeks ?? 0,
    standing: season.standing ?? 0,
    capital: season.capital ?? 0,
    backersSpent: season.backersSpent ?? [],
  };

  const earned = FATES.find((fate) => fate.when && fate.when(context));
  if (earned) return earned;

  // Everything without a condition is the general pool.
  const pool = FATES.filter((fate) => !fate.when);
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
