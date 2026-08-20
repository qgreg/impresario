/**
 * Unit tests for opening night.
 *
 * The thumb cannot be tested, so everything the thumb does not decide is: which
 * crises exist, when they arrive, what each one asks, and whether a given
 * performance met it. The runtime records a lit fraction per crisis; from there
 * on the judgement is arithmetic.
 */
import {
  buildNight, eventMet, tallyNight, performerPosition, gradeNight,
  CRISES, REQUIREMENTS, EXPOSED_HASTE, crisisCount, MOST_CRISES, MISHAPS,
} from '../src/night.js';
import { appraiseCasting } from '../src/company.js';
import { applyProduction } from '../src/production.js';
import { deriveBill } from '../src/bill.js';
import { WORKS, TREATMENTS, HOOKS, STAGINGS, PREPARATIONS } from '../src/data.js';

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const bill = deriveBill({
  work: WORKS.find((w) => w.id === 'hamlet'),
  treatment: TREATMENTS.find((t) => t.id === 'grand-manner'),
  hook: HOOKS.find((h) => h.id === 'none'),
});
// Vestris is vain, Wexford green, Bone drunk, Vane vain — trouble of every kind.
const casting = appraiseCasting(bill, { 0: 'vestris', 1: 'wexford', 2: 'bone', 3: 'vane' });

const staging = (id) => STAGINGS.find((s) => s.id === id);
const prep = (id) => PREPARATIONS.find((p) => p.id === id);

const bare = applyProduction(casting, { staging: staging('store'), preparation: prep('cold') });
const hidden = applyProduction(casting, { staging: staging('machine'), preparation: prep('manager') });
const exposed = applyProduction(casting, { staging: staging('stark'), preparation: prep('cold') });

// --- what the production bought ------------------------------------------------
// The rule the phase rests on. A covered trouble does not happen at all: the
// money bought the absence of an event, not a gentler one. If production could
// only soften a crisis, the phase before this would be a discount, not a choice.

{
  const rough = buildNight(casting, bare, 0);
  const managed = buildNight(casting, hidden, 0);
  check('a cast with trouble in it produces crises', rough.events.length > 0);
  check('and everything the production covered simply does not happen',
    managed.events.length === 0,
    `${managed.events.length} left of ${rough.events.length}`);
  check('a night with nothing to fear is still a night',
    managed.duration > 0 && Number.isFinite(managed.duration));
}

{
  const rough = buildNight(casting, bare, 0);
  const bared = buildNight(casting, exposed, 0);
  const roughGreen = rough.events.find((e) => e.kind === 'green');
  const baredGreen = bared.events.find((e) => e.kind === 'green');
  check('an exposed trouble gives the operator less time to catch it',
    baredGreen.seconds < roughGreen.seconds,
    `${baredGreen.seconds}s against ${roughGreen.seconds}s`);
  check('and the haste is a real squeeze, not a rounding', EXPOSED_HASTE <= 0.8);
}

// --- the board's promise ----------------------------------------------------------
// The readout and the night used to disagree: the board said "15 things will go
// wrong" and the evening produced two, because crises came only from the cast's
// named seeds while the board showed raw volatility. A number on the board is a
// promise, so the same function now decides both.

check('a calm evening promises nothing and delivers nothing',
  crisisCount(0, 0) === 0);
check('risk alone can fill an evening, so a reckless bill is dangerous too',
  crisisCount(12, 0) > 0, `${crisisCount(12, 0)}`);
check('named trouble is never dropped, however calm the rest looks',
  crisisCount(0, 3) === 3);
check('and no evening is longer than a phone will sit through',
  crisisCount(100, 0) === MOST_CRISES && crisisCount(100, 99) === MOST_CRISES);
check('more risk means more goes wrong',
  crisisCount(15, 0) > crisisCount(5, 0));

{
  // A spectacular bill with a steady company: no seeds at all, and it must
  // still be a dangerous evening, or a live horse costs nothing to run.
  const steady = appraiseCasting(bill, { 0: 'kean', 1: 'fenwick', 2: 'pike', 3: 'grimaldi' });
  const clean = applyProduction(steady, { staging: staging('machine'), preparation: prep('manager') });
  const night = buildNight(steady, clean, 14);
  check('a reckless bill with a faultless cast is still a dangerous night',
    night.events.length > 0, `${night.events.length} crises`);
  check('and its troubles are the evening\u2019s own rather than anybody\u2019s fault',
    night.events.every((e) => e.kind === 'mishap'));
  check('the board\u2019s number and the night\u2019s contents agree',
    night.events.length === crisisCount(14, 0));
}

check('every one of the evening\u2019s own troubles asks for one of the two verbs',
  MISHAPS.every((m) => REQUIREMENTS[m.requirement]));

// --- the two verbs ---------------------------------------------------------------

check('every kind of trouble asks for one of exactly two things',
  Object.values(CRISES).every((c) => REQUIREMENTS[c.requirement]));
check('a performer in difficulty needs the light kept on them',
  CRISES.green.requirement === 'hold' && CRISES.drink.requirement === 'hold');
check('and one who is dying needs it taken off',
  CRISES.miscast.requirement === 'avert' && CRISES.feud.requirement === 'avert');

{
  const hold = { requirement: 'hold' };
  const avert = { requirement: 'avert' };
  check('holding is met by staying with them', eventMet(hold, 0.95));
  check('and failed by losing them', !eventMet(hold, 0.3));
  check('averting is met by keeping the light away', eventMet(avert, 0.05));
  check('and failed by leaving it on them', !eventMet(avert, 0.9));
  check('the two verbs are genuinely opposite',
    eventMet(hold, 0.95) && !eventMet(avert, 0.95) &&
    eventMet(avert, 0.05) && !eventMet(hold, 0.05));

  // Averting is judged harder than holding, because taking a light off somebody
  // is easier than keeping it on them.
  check('averting is the stricter of the two',
    REQUIREMENTS.avert.threshold < 1 - REQUIREMENTS.hold.threshold + 0.25);
}

// --- the scene ---------------------------------------------------------------------

{
  const night = buildNight(casting, bare, 0);
  check('every crisis is about somebody actually in the cast',
    night.events.every((e) => night.cast.some((c) => c.name === e.who)),
    night.events.map((e) => e.who).join(', '));
  check('every crisis carries a cue and a line for when it is missed',
    night.events.every((e) => e.cue.length > 0 && e.failed.length > 0));

  check('crises do not overlap, so the player is asked one thing at a time',
    night.events.every((e, i) =>
      i === 0 || e.at >= night.events[i - 1].at + night.events[i - 1].seconds));
  check('the night is long enough to contain all of them',
    night.duration >= Math.max(...night.events.map((e) => e.at + e.seconds)));
  check('and it opens with a moment of ordinary business first',
    night.events[0].at > 2, `first crisis at ${night.events[0].at}s`);

  check('every performer gets a lane of their own',
    new Set(night.cast.map((c) => c.lane)).size === night.cast.length);
  check('and every lane is on the stage',
    night.cast.every((c) => c.lane > 0.1 && c.lane < 0.9));
}

{
  // "Light anyone else" has to be a possible instruction, which means no two
  // performers may ever occupy the same spot.
  const night = buildNight(casting, bare, 0);
  let closest = 1;
  for (let t = 0; t < night.duration; t += 0.25) {
    const spots = night.cast.map((c) => performerPosition(c, t));
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        closest = Math.min(closest, Math.abs(spots[i].x - spots[j].x));
      }
    }
  }
  check('two performers never stand in the same place', closest > 0.02, `closest ${closest.toFixed(3)}`);

  let offstage = 0;
  for (let t = 0; t < night.duration; t += 0.25) {
    for (const member of night.cast) {
      const spot = performerPosition(member, t);
      if (spot.x < 0 || spot.x > 1 || spot.y < 0 || spot.y > 1) offstage++;
    }
  }
  check('and nobody walks off the stage', offstage === 0, `${offstage} samples off`);
}

// --- the tally --------------------------------------------------------------------
// This is the number the settlement has been rolling. The thumb replaces the
// dice and nothing else about the settlement changes.

{
  const night = buildNight(casting, bare, 0);
  const allMet = Object.fromEntries(night.events.map((e) => [e.index, { met: true }]));
  const noneMet = Object.fromEntries(night.events.map((e) => [e.index, { met: false }]));

  check('a night where everything was caught has no mishaps',
    tallyNight(night, allMet).mishaps === 0);
  check('a night where nothing was caught has one per crisis',
    tallyNight(night, noneMet).mishaps === night.events.length);
  check('an unanswered crisis counts as missed rather than being skipped',
    tallyNight(night, {}).mishaps === night.events.length);
  check('the tally reports what could have gone wrong as well as what did',
    tallyNight(night, allMet).couldHaveGoneWrong === night.events.length);
  check('and names each failure, so the notices can say what happened',
    tallyNight(night, noneMet).failures.length === night.events.length &&
    tallyNight(night, noneMet).failures.every((f) => typeof f === 'string' && f.length > 0));
}

check('a covered night hands the settlement nothing to punish',
  tallyNight(buildNight(casting, hidden, 0), {}).mishaps === 0);

// --- words ---------------------------------------------------------------------------

check('the evening is always described in words',
  [[0, 4], [2, 4], [4, 4], [0, 0]].every(([mishaps, couldHaveGoneWrong]) =>
    typeof gradeNight({ mishaps, couldHaveGoneWrong }, 0.8) === 'string'));
check('a flawless night is named as one',
  gradeNight({ mishaps: 0, couldHaveGoneWrong: 4 }, 0.95) === 'not one moment of it went wrong');
check('and a night with nothing to fear is not mistaken for a triumph',
  gradeNight({ mishaps: 0, couldHaveGoneWrong: 0 }, 0.95) !== 'not one moment of it went wrong');

// --- the copy assumes nothing about anybody -------------------------------------
// The roster is half women and parts are cast freely across it, so no line may
// guess. The first draft of the cues told the player "The Wexford Boy has
// frozen. Stay with her."
{
  const gendered = /\b(he|him|his|she|her|hers|himself|herself)\b/i;
  const lines = [
    ...Object.values(CRISES).flatMap((c) => [c.cue('Somebody'), c.failed('Somebody')]),
    ...MISHAPS.flatMap((m) => [m.cue('Somebody'), m.failed('Somebody')]),
  ];
  const guessing = lines.filter((line) => gendered.test(line));
  check('no cue or failure line guesses at anybody\u2019s gender',
    guessing.length === 0, guessing.join(' | '));
}

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall night checks passed');
process.exit(failures.length ? 1 : 0);
