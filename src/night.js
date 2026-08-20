/**
 * Opening Night: the scene, the crises, and what the operator made of them.
 *
 * This is where the other three phases arrive. The bill decided how long the
 * evening is; the cast decided who is on the boards and what is likely to go
 * wrong with them; the production decided which of those troubles the audience
 * will even be in a position to notice.
 *
 * The rule the whole phase rests on: **a covered trouble does not happen.** The
 * money spent on the spectacle machine buys the absence of an event, not a
 * softer version of it. If a production could only make crises milder, the
 * phase before this one would be a discount rather than a decision.
 *
 * Everything here is pure. The thumb is untestable and lives in openingnight.js;
 * the scene, the crises, and the judgement of each one are functions over plain
 * data, which is the same bargain every other phase makes.
 */

import { performerAt, BUSINESS } from './follow.js';

/** A crisis asks for one of two things, and they are opposites. */
export const REQUIREMENTS = {
  hold: {
    verb: 'hold',
    // What fraction of the window the subject must be lit for.
    threshold: 0.6,
    compare: (lit, threshold) => lit >= threshold,
  },
  avert: {
    verb: 'avert',
    // ...or must *not* be lit for. Averting is judged harder than holding,
    // because taking a light off somebody is easier than keeping it on them.
    threshold: 0.2,
    compare: (lit, threshold) => lit <= threshold,
  },
};

/**
 * What each kind of trouble does when it finally arrives, and what the operator
 * is supposed to do about it.
 *
 * Two verbs cover all four, which keeps the input to one thumb: either somebody
 * needs the light more than usual, or they need it off them this instant.
 */
// Every line here is written for a named person whose gender the game does not
// know — the roster is half women and the parts are cast freely across it. The
// first draft told the player "The Wexford Boy has frozen. Stay with her." The
// copy uses they/them throughout, and a test asserts it stays that way.
export const CRISES = {
  green: {
    requirement: 'hold',
    seconds: 4.0,
    cue: (who) => `${who} has frozen. Stay with them.`,
    failed: (who) => `${who} dried, in the dark, for four seconds.`,
  },
  drink: {
    requirement: 'hold',
    seconds: 3.5,
    cue: (who) => `${who} is not where they should be. Follow them.`,
    failed: (who) => `${who} wandered out of the light and stayed there.`,
  },
  miscast: {
    requirement: 'avert',
    seconds: 3.5,
    cue: (who) => `${who} is dying out there. Take the light off them.`,
    failed: (who) => `${who} was lit throughout, and the house watched all of it.`,
  },
  feud: {
    requirement: 'avert',
    seconds: 3.0,
    cue: (who) => `${who} is playing to the front again. Light anyone else.`,
    failed: (who) => `${who} stole the scene in full view, and will do it nightly.`,
  },
};

/** Seconds of ordinary business before the first crisis and after the last. */
const OVERTURE = 3.5;
const CURTAIN = 3.0;

/** Breathing room between crises, so the night has a rhythm and not a queue. */
const BETWEEN = 1.6;

/**
 * The most crises one evening can hold and still be playable on a phone. Past
 * this the night stops being a performance and becomes a drill.
 */
export const MOST_CRISES = 6;

/** How much volatility buys one thing actually going wrong on the night. */
export const VOLATILITY_PER_CRISIS = 2.5;

/**
 * How many things go wrong tonight.
 *
 * This exists because the readout and the night disagreed. The board promised
 * "15 things will go wrong" — volatility, an abstract risk figure — and then
 * the evening produced two crises, because crises came only from the cast's
 * named seeds. The number on the board is a promise to the player, so the night
 * has to keep it, and the board now shows this figure rather than raw
 * volatility.
 */
export function crisisCount(volatility, seedCount = 0) {
  const fromRisk = Math.round(Math.max(0, volatility) / VOLATILITY_PER_CRISIS);
  return Math.min(MOST_CRISES, Math.max(seedCount, fromRisk));
}

/**
 * Trouble that is nobody's fault in particular.
 *
 * The cast's seeds are personal and named; these are the evening's own — the
 * horse, the machinery, a missed entrance. They exist so that a reckless *bill*
 * is as dangerous as a reckless cast: without them, a spectacular production
 * with a live horse and a steady company had nothing whatever go wrong.
 */
export const MISHAPS = [
  { requirement: 'avert', cue: (who) => 'The horse has stopped dead centre. Look anywhere else.',
    failed: () => 'The horse was lit, at length, doing nothing.' },
  { requirement: 'avert', cue: () => 'A flat is swinging loose. Keep it out of the light.',
    failed: () => 'The audience watched a wall wobble for a full half minute.' },
  { requirement: 'hold', cue: (who) => `${who} has missed an entrance. Find them.`,
    failed: (who) => `${who} arrived late and unlit, and the scene never recovered.` },
  { requirement: 'avert', cue: () => 'The machinery has jammed mid-scene. Take the light off it.',
    failed: () => 'Sixty feet of hydraulics sat lit and motionless.' },
  { requirement: 'hold', cue: (who) => `${who} has gone up on a line. Stay close.`,
    failed: (who) => `${who} was left groping in the half dark.` },
  { requirement: 'avert', cue: () => 'The prompter is visible in the wings. Light away from the book.',
    failed: () => 'The prompter took a bow nobody had asked for.' },
];

/** A crisis on an exposed trouble gets less time, because everyone is watching. */
export const EXPOSED_HASTE = 0.7;

/**
 * Build the night from everything that came before it.
 *
 * @param {object} casting     the appraised cast — who is on stage
 * @param {object} production  the staged production — which troubles survived
 */
export function buildNight(casting, production, volatility = null) {
  const cast = (casting?.slots ?? []).filter((slot) => slot.performer);

  // Covered troubles are simply absent. That is what the production bought.
  const live = (production?.seeds ?? []).filter((seed) => seed.state !== 'covered');

  const events = live.map((seed, index) => {
    const crisis = CRISES[seed.kind] ?? CRISES.miscast;
    const exposed = seed.state === 'exposed';
    const subject = subjectFor(seed, cast);
    return {
      index,
      kind: seed.kind,
      state: seed.state,
      who: subject?.performer.name ?? seed.who,
      subject: subject ? cast.indexOf(subject) : 0,
      requirement: crisis.requirement,
      seconds: exposed ? crisis.seconds * EXPOSED_HASTE : crisis.seconds,
      cue: crisis.cue(subject?.performer.name ?? seed.who),
      failed: crisis.failed(subject?.performer.name ?? seed.who),
      at: 0,   // filled in below
    };
  });

  // Top the evening up to the number the board promised. Named troubles first,
  // because they are the ones the player chose; the rest are the night's own.
  const wanted = crisisCount(volatility ?? live.length * VOLATILITY_PER_CRISIS, live.length);
  for (let i = events.length; i < wanted; i++) {
    const mishap = MISHAPS[i % MISHAPS.length];
    const subject = cast.length ? i % cast.length : 0;
    const who = cast[subject]?.performer.name ?? 'Somebody';
    events.push({
      index: events.length,
      kind: 'mishap',
      state: 'open',
      who,
      subject,
      requirement: mishap.requirement,
      seconds: 3.2,
      cue: mishap.cue(who),
      failed: mishap.failed(who),
      at: 0,
    });
  }

  // Space the crises out with room to breathe between them, so the night has a
  // rhythm rather than being a queue. A performer who is merely being followed
  // is the rest the phase needs to make the crises feel like crises.
  let clock = OVERTURE;
  for (const event of events) {
    event.at = clock;
    clock += event.seconds + BETWEEN;
  }

  return {
    cast: cast.map((slot, index) => ({
      index,
      name: slot.performer.name,
      role: slot.slot.label,
      // Each performer gets their own lane, so two of them are never in the
      // same place and "light anyone else" is always a possible instruction.
      lane: cast.length === 1 ? 0.5 : 0.22 + (index / (cast.length - 1)) * 0.56,
    })),
    events,
    duration: Math.max(clock + CURTAIN, OVERTURE + CURTAIN + 4),
  };
}

/** Which cast member a seed is about. Falls back to the first on the bill. */
function subjectFor(seed, cast) {
  return cast.find((slot) => seed.who && seed.who.includes(slot.performer.name)) ?? cast[0] ?? null;
}

/**
 * Where a performer stands at time t.
 *
 * Everyone walks the same business, offset into their own lane and started at a
 * different point in the scene, so the stage is never still and never uniform.
 * Reusing the toy's scene keeps one description of what an actor does on stage.
 */
export function performerPosition(member, t) {
  const walk = performerAt(t + member.index * 5.5);
  const spread = 0.34;
  return {
    x: member.lane + (walk.x - 0.5) * spread,
    y: walk.y,
    business: walk.business,
    tell: BUSINESS[walk.business]?.tell ?? '',
  };
}

/**
 * Did the operator meet what the crisis asked?
 *
 * @param {object} event        the crisis
 * @param {number} litFraction  how much of the window the subject was lit for
 */
export function eventMet(event, litFraction) {
  const rule = REQUIREMENTS[event.requirement];
  return rule.compare(litFraction, rule.threshold);
}

/**
 * The night's tally, in the shape the settlement already takes.
 *
 * `mishaps` is the count opening night hands to `settleShow`, which until now
 * has been rolling it. Nothing else about the settlement changes: the thumb
 * simply replaces the dice.
 */
export function tallyNight(night, outcomes) {
  const missed = night.events.filter((event) => !outcomes[event.index]?.met);
  return {
    mishaps: missed.length,
    couldHaveGoneWrong: night.events.length,
    handled: night.events.length - missed.length,
    failures: missed.map((event) => event.failed),
  };
}

/** A word for how the evening was run, for the notices to borrow. */
export function gradeNight({ mishaps, couldHaveGoneWrong }, lit) {
  if (couldHaveGoneWrong === 0) return 'an evening with nothing in it to fear';
  if (mishaps === 0 && lit >= 0.85) return 'not one moment of it went wrong';
  if (mishaps === 0) return 'every crisis met, if not always gracefully';
  if (mishaps < couldHaveGoneWrong / 2) return 'most of it was caught in time';
  if (mishaps < couldHaveGoneWrong) return 'a good deal got past you';
  return 'nothing at all was caught';
}
