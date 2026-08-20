/**
 * The Bill: deriving a show from the three things the player chose.
 *
 * Everything in here is a pure function over plain data. That is deliberate and
 * it is the same bargain the rest of the game makes — the phases that decide
 * whether a season is won or lost must be testable outside a browser, because
 * the one phase that cannot be (the spotlight) is coming later and will need
 * every guarantee it can borrow from the phases around it.
 */

import { REMARKS } from './data.js';

export const AUDIENCES = ['crowd', 'society', 'critics'];

/** What each audience is called on the board, and the shape that marks it. */
export const AUDIENCE_LABELS = {
  crowd: { name: 'The Crowd', glyph: '●', blurb: 'fills the seats' },
  society: { name: 'Society', glyph: '◆', blurb: 'pays for the boxes' },
  critics: { name: 'The Critics', glyph: '▲', blurb: 'decide your reputation' },
};

/** Costs are guineas and always whole ones — a fractional guinea reads as a bug. */
export function costOf(work, treatment, hook) {
  const base = work ? work.cost : 0;
  const multiplied = treatment ? base * treatment.costMult : base;
  return Math.round(multiplied) + (hook ? hook.cost : 0);
}

/**
 * Appeal sums across the three choices and is never clamped. A bill can be
 * genuinely repellent to an audience, and a negative number is more honest —
 * and more useful to look at — than a floor at zero.
 */
export function appealOf(work, treatment, hook) {
  const total = { crowd: 0, society: 0, critics: 0 };
  for (const part of [work, treatment, hook]) {
    if (!part) continue;
    for (const audience of AUDIENCES) total[audience] += part.appeal[audience] ?? 0;
  }
  return total;
}

/** Volatility is the count of things that will go wrong once it is running. */
export function volatilityOf(work, treatment, hook) {
  return [work, treatment, hook].reduce((sum, part) => sum + (part?.volatility ?? 0), 0);
}

/**
 * A treatment can change what kind of performer a role needs — a ballet wants
 * dancers whoever wrote the play. The role's dramatic function is kept and its
 * discipline is replaced, so casting still knows it is filling the lead.
 */
export function rolesOf(work, treatment) {
  if (!work) return [];
  return work.roles.map((role) => ({
    role,
    discipline: treatment?.discipline ?? null,
    label: treatment?.discipline ? `${role} (${treatment.discipline})` : role,
  }));
}

/**
 * The line on the poster. This is the sentence the player repeats to somebody
 * afterwards, so it is assembled to read as billing matter rather than as a
 * list of the three things they tapped.
 */
export function titleOf(work, treatment, hook) {
  if (!work) return '';
  const parts = [work.title];
  if (treatment?.billing) parts.push(treatment.billing);
  if (hook?.billing) parts.push(hook.billing);
  if (parts.length === 1) return parts[0];
  return `${parts[0]}, ${parts.slice(1).join(', ')}`;
}

/** The house's opinion of a notable pairing, if it has one. */
export function remarkOn(work, treatment, hook) {
  const found = REMARKS.find((r) =>
    (!r.work || r.work === work?.id) &&
    (!r.treatment || r.treatment === treatment?.id) &&
    (!r.hook || r.hook === hook?.id));
  return found ? found.text : null;
}

/**
 * Everything the later phases need, derived in one place. Partial bills are
 * legal on purpose: the screen updates as each of the three choices lands, so
 * the player watches the cost climb while they are still choosing.
 */
export function deriveBill({ work = null, treatment = null, hook = null } = {}) {
  return {
    work,
    treatment,
    hook,
    complete: !!(work && treatment && hook),
    title: titleOf(work, treatment, hook),
    cost: costOf(work, treatment, hook),
    appeal: appealOf(work, treatment, hook),
    volatility: volatilityOf(work, treatment, hook),
    roles: rolesOf(work, treatment),
    remark: remarkOn(work, treatment, hook),
  };
}

/**
 * Can this be mounted, and if not, who will lend?
 *
 * Being short of money never blocks the player — it opens the drawer of people
 * who will cover the difference for a price. Only a backer who covers the whole
 * shortfall is offered, because a partial rescue leaves the player stuck with
 * the string and still unable to open.
 */
export function financing(bill, capital, backers) {
  const shortfall = Math.max(0, bill.cost - capital);
  return {
    shortfall,
    affordable: shortfall === 0,
    offers: shortfall === 0 ? [] : backers.filter((b) => b.offers >= shortfall),
  };
}

/**
 * Grades exist so the board can say something in words as well as in numbers —
 * nothing here is ever signalled by colour alone.
 */
export function gradeAppeal(value) {
  if (value >= 8) return 'clamouring';
  if (value >= 5) return 'keen';
  if (value >= 2) return 'curious';
  if (value >= 0) return 'indifferent';
  if (value >= -3) return 'cool';
  return 'hostile';
}

export function gradeVolatility(value) {
  if (value <= 2) return 'orderly';
  if (value <= 4) return 'lively';
  if (value <= 6) return 'precarious';
  if (value <= 8) return 'reckless';
  return 'suicidal';
}
