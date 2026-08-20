/**
 * The Production: covering for what you have actually got.
 *
 * This is the third phase and the first one the player enters with real
 * information. The bill was committed to blind; the cast is whoever would take
 * the parts. By now the niece cannot act, the Ghost is a drunk who may be
 * extraordinary, and two of them are not speaking.
 *
 * So the question here is different from the two before it. The Bill asked what
 * we dare do and The Company asked who can carry it; this asks *how do I hide
 * what went wrong* — or, if the player is feeling brave, how do I take the
 * covers away and let it all show.
 *
 * The whole phase is a pure function over the cast's seeds. A staging does not
 * add a vague quality score: it names the kinds of trouble it hides and the
 * kinds it makes worse, and the player can see which of their own problems it
 * touches before they pay for it.
 */

import { STAGINGS, PREPARATIONS } from './data.js';
import { AUDIENCES } from './bill.js';

/** Exposure is deliberately dearer than the volatility a seed planted. */
export const EXPOSURE_COST = 2;

/**
 * Fold the staging and the preparation into the cast's trouble.
 *
 * @param {object} casting   the appraised cast, for its seeds and volatility
 * @param {object} choice    { staging, preparation } — either may be null
 * @returns cost, appeal, volatility delta, and what happened to each seed
 */
export function applyProduction(casting, { staging = null, preparation = null } = {}) {
  const chosen = [staging, preparation].filter(Boolean);

  const covers = new Set();
  const exposes = new Set();
  for (const part of chosen) {
    for (const kind of part.covers ?? []) covers.add(kind);
    for (const kind of part.exposes ?? []) exposes.add(kind);
  }

  // Covering wins over exposing. A spectacle machine exposes nothing, but if a
  // player somehow buys both a cover and an exposure for the same trouble, the
  // kind reading is that the cover is what the audience sees.
  const seeds = (casting?.seeds ?? []).map((seed) => {
    if (covers.has(seed.kind)) return { ...seed, state: 'covered' };
    if (exposes.has(seed.kind)) return { ...seed, state: 'exposed' };
    return { ...seed, state: 'open' };
  });

  const cost = chosen.reduce((sum, part) => sum + part.cost, 0);

  const appeal = {};
  for (const audience of AUDIENCES) {
    appeal[audience] = chosen.reduce((sum, part) => sum + (part.appeal?.[audience] ?? 0), 0);
  }

  // Volatility moves three ways: what the staging and rehearsal are worth in
  // themselves, minus the trouble they cover, plus a surcharge on anything they
  // have chosen to put in front of the audience instead.
  const base = chosen.reduce((sum, part) => sum + part.volatility, 0);
  const relieved = seeds.filter((s) => s.state === 'covered').length;
  const aggravated = seeds.filter((s) => s.state === 'exposed').length;
  const volatility = base - relieved + aggravated * EXPOSURE_COST;

  return {
    staging,
    preparation,
    complete: !!staging && !!preparation,
    cost,
    appeal,
    volatility,
    seeds,
    covered: seeds.filter((s) => s.state === 'covered'),
    exposed: seeds.filter((s) => s.state === 'exposed'),
  };
}

/**
 * What this staging would do to the trouble already planted, said before the
 * player pays for it. Compensation the player cannot see coming is not a
 * decision, it is a die roll.
 */
export function previewFor(part, casting) {
  const seeds = casting?.seeds ?? [];
  const covers = (part.covers ?? []).length
    ? seeds.filter((s) => part.covers.includes(s.kind))
    : [];
  const exposes = (part.exposes ?? []).length
    ? seeds.filter((s) => part.exposes.includes(s.kind))
    : [];
  return { covers, exposes };
}

export function stagingById(id) {
  return STAGINGS.find((s) => s.id === id) ?? null;
}

export function preparationById(id) {
  return PREPARATIONS.find((p) => p.id === id) ?? null;
}

/** Words for the production as a whole. */
export function gradeProduction({ staging, preparation }, exposedCount) {
  if (!staging || !preparation) return 'not yet staged';
  if (exposedCount > 0) return 'everything on the acting';
  if (staging.id === 'machine') return 'a great deal to look at';
  if (staging.id === 'painter') return 'the handsomest thing in town';
  if (preparation.id === 'cold') return 'ready enough, probably';
  return 'a production that will hold together';
}
