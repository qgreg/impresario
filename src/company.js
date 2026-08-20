/**
 * The Company: filling the roles the bill demanded.
 *
 * The question this phase asks is not "who is best" — it is "who can carry
 * *this*", and the bill has already made that hard. A melodrama wants a villain
 * to hiss whoever wrote the play; a backer who covered your shortfall wants his
 * niece in a part she cannot play; and the two finest performers in England will
 * not share a curtain call.
 *
 * Pure functions over plain data, like the bill. Nothing here needs a browser.
 */

import { PERFORMERS, ROLE_LINES, ADJACENT } from './data.js';

/**
 * How well a performer suits a part, by line of business.
 *
 * A company engaged an actor in a line, and an actor asked to play outside it
 * would refuse — not because they could not, but because it was beneath the
 * terms they had agreed to. So casting out of line is never blocked here
 * either; it is priced, and the price is resentment as much as money.
 *
 * Adjacent lines stretch to cover one another as a professional courtesy. A
 * heavy will take a lead at a push. Nobody in the leading line will play low
 * comedy, and asking is the insult the phase is built around.
 */
export function fitFor(performer, slot) {
  if (!performer || !slot) return null;

  const wanted = slot.line ?? ROLE_LINES[slot.role] ?? 'Utility';

  if (performer.line === wanted) {
    return { level: 'ideal', why: 'Squarely in their line.', appeal: 2, volatility: 0 };
  }
  if ((ADJACENT[performer.line] ?? []).includes(wanted)) {
    return {
      level: 'passable',
      why: 'A stretch, but they will not disgrace it.',
      appeal: 0,
      volatility: 1,
    };
  }
  return {
    level: 'wrong',
    why: `A ${performer.line.toLowerCase()} will not thank you for a ${wanted.toLowerCase()} part.`,
    appeal: -3,
    volatility: 3,
  };
}

/**
 * What a temperament plants for opening night. There is no failure state here
 * either — a drunk is not a mistake, he is a bargain with a known price, and
 * the price is paid two phases later.
 */
export const TEMPERAMENTS = {
  steady: { seeds: 0, tell: 'steady' },
  vain: { seeds: 1, tell: 'vain' },
  temperamental: { seeds: 1, tell: 'temperamental' },
  drunk: { seeds: 2, tell: 'unreliable' },
  green: { seeds: 1, tell: 'green' },
};

/** Two proud performers on one bill will find something to be proud about. */
const PROUD = new Set(['vain', 'temperamental']);

/**
 * Appraise a cast.
 *
 * @param {object} bill      the derived bill, for its roles
 * @param {object} assigned  { [roleIndex]: performerId }
 * @param {object} options   { imposed: backerId|null }
 */
export function appraiseCasting(bill, assigned = {}, { imposed = null } = {}) {
  const slots = bill.roles.map((slot, index) => {
    const performer = PERFORMERS.find((p) => p.id === assigned[index]) || null;
    return { index, slot, performer, fit: fitFor(performer, slot) };
  });

  const cast = slots.filter((s) => s.performer);
  const filled = cast.length;
  const salary = cast.reduce((sum, s) => sum + s.performer.salary, 0);

  const appeal = { crowd: 0, society: 0, critics: 0 };
  let volatility = 0;
  const seeds = [];

  for (const { performer, fit, slot } of cast) {
    // Fame sells tickets to people who have not read a review; talent is what
    // the critics are actually counting. They are deliberately different
    // currencies, so a famous mediocrity and an unknown genius pull apart.
    appeal.crowd += performer.fame;
    appeal.society += Math.round(performer.fame * 0.6 + performer.talent * 0.4);
    appeal.critics += performer.talent;

    appeal.critics += fit.appeal;
    appeal.society += Math.round(fit.appeal / 2);
    volatility += fit.volatility;

    if (fit.level === 'wrong') {
      seeds.push({
        kind: 'miscast',
        who: performer.name,
        text: `${performer.name} is out of their line as ${slot.role}.`,
      });
    }

    const temperament = TEMPERAMENTS[performer.temperament];
    volatility += temperament.seeds;
    if (performer.temperament === 'drunk') {
      seeds.push({ kind: 'drink', who: performer.name, text: `${performer.name} may not be fit to go on.` });
    }
    if (performer.temperament === 'green') {
      seeds.push({ kind: 'green', who: performer.name, text: `${performer.name} has never done this before.` });
    }
  }

  // Feuds are counted per pair, not per person: three proud performers is three
  // quarrels waiting, which is worse than one and a half.
  const proud = cast.filter((s) => PROUD.has(s.performer.temperament));
  const feuds = (proud.length * (proud.length - 1)) / 2;
  volatility += feuds;
  if (feuds > 0) {
    seeds.push({
      kind: 'feud',
      who: proud.map((s) => s.performer.name).join(' and '),
      text: feuds === 1
        ? `${proud[0].performer.name} and ${proud[1].performer.name} will not share a curtain call.`
        : `${proud.length} of them believe themselves the reason people came.`,
    });
  }

  return {
    slots,
    filled,
    total: bill.roles.length,
    complete: filled === bill.roles.length && satisfiesImposition(slots, imposed),
    salary,
    appeal,
    volatility,
    seeds,
    imposition: impositionFor(imposed),
  };
}

/** A backer's string, expressed as a performer who must appear somewhere. */
export function impositionFor(backerId) {
  if (!backerId) return null;
  const performer = PERFORMERS.find((p) => p.imposed === backerId);
  return performer ? { performer, text: performer.note } : null;
}

export function satisfiesImposition(slots, backerId) {
  const imposition = impositionFor(backerId);
  if (!imposition) return true;
  return slots.some((s) => s.performer?.id === imposition.performer.id);
}

/**
 * Who is available. A performer imposed by a backer you did not take is not in
 * the company at all — she exists only as somebody's condition.
 */
export function availableTo(backerId, assigned = {}) {
  const taken = new Set(Object.values(assigned));
  return PERFORMERS
    .filter((p) => !p.imposed || p.imposed === backerId)
    .filter((p) => !taken.has(p.id));
}

/** Words for the company as a whole, so nothing is signalled by number alone. */
export function gradeCompany({ filled, total, volatility }) {
  if (filled < total) return 'not yet cast';
  if (volatility <= 3) return 'a company that will behave';
  if (volatility <= 6) return 'a company with opinions';
  if (volatility <= 10) return 'a company to keep an eye on';
  return 'a company that will make history or a scene';
}
