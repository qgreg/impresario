/**
 * Unit tests for the production phase.
 *
 * This is the phase that acts on what the earlier phases produced, so most of
 * what is worth checking is the interaction: a staging must touch the specific
 * trouble a cast planted, and the player must be able to see it do so before
 * they pay.
 */
import {
  applyProduction, previewFor, stagingById, preparationById,
  gradeProduction, EXPOSURE_COST,
} from '../src/production.js';
import { appraiseCasting } from '../src/company.js';
import { deriveBill } from '../src/bill.js';
import { STAGINGS, PREPARATIONS, WORKS, TREATMENTS, HOOKS } from '../src/data.js';

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

// A cast with something wrong with it in every direction: a green performer, a
// drunk, and two proud ones who will quarrel.
const troubled = appraiseCasting(bill, { 0: 'vestris', 1: 'wexford', 2: 'bone', 3: 'vane' });
const spotless = appraiseCasting(bill, { 0: 'kean', 1: 'fenwick', 2: 'pike', 3: 'grimaldi' });

const machine = stagingById('machine');
const stark = stagingById('stark');
const built = stagingById('built');
const month = preparationById('month');
const manager = preparationById('manager');
const cold = preparationById('cold');

check('the troubled cast really has trouble of every kind',
  ['green', 'drink', 'feud'].every((kind) => troubled.seeds.some((s) => s.kind === kind)),
  troubled.seeds.map((s) => s.kind).join(','));

// --- covering ----------------------------------------------------------------

{
  const covered = applyProduction(troubled, { staging: machine, preparation: cold });
  check('a spectacle hides the performer who has never done it before',
    covered.covered.some((s) => s.kind === 'green'));
  check('but it does nothing about the two who will not speak',
    covered.seeds.find((s) => s.kind === 'feud').state === 'open');
  check('and nothing about the drinking',
    covered.seeds.find((s) => s.kind === 'drink').state === 'open');
}

{
  const managed = applyProduction(troubled, { staging: built, preparation: manager });
  check('a stage manager settles the quarrel and the drink',
    managed.covered.some((s) => s.kind === 'feud') &&
    managed.covered.some((s) => s.kind === 'drink'));
  check('and leaves the green performer to sink or swim',
    managed.seeds.find((s) => s.kind === 'green').state === 'open');
}

check('covering trouble lowers what can go wrong',
  applyProduction(troubled, { staging: built, preparation: manager }).volatility <
  applyProduction(troubled, { staging: built, preparation: cold }).volatility);

// --- exposing -----------------------------------------------------------------

{
  const bare = applyProduction(troubled, { staging: stark, preparation: cold });
  check('bare boards put the green performer in front of everyone',
    bare.exposed.some((s) => s.kind === 'green'));
  check('and exposure costs more than the trouble planted on its own',
    bare.volatility >
      applyProduction(troubled, { staging: { ...stark, exposes: [] }, preparation: cold }).volatility,
    `${bare.volatility}`);

  // On a cast with nothing to hide, the same staging is simply cheap and good.
  const clean = applyProduction(spotless, { staging: stark, preparation: cold });
  check('but a cast with nothing wrong with it is not punished for the bare stage',
    clean.exposed.length === 0);
  check('and bare boards are what the critics like best',
    clean.appeal.critics > applyProduction(spotless, { staging: machine, preparation: cold }).appeal.critics);
}

check('covering beats exposing when a player has bought both',
  applyProduction(troubled, { staging: stark, preparation: month })
    .seeds.find((s) => s.kind === 'green').state === 'covered');

// --- the preview --------------------------------------------------------------
// Compensation the player cannot see coming is not a decision, it is a die roll.

{
  const preview = previewFor(machine, troubled);
  check('the machine says which of your own troubles it will hide',
    preview.covers.some((s) => s.kind === 'green') && preview.exposes.length === 0);

  const bare = previewFor(stark, troubled);
  check('and the bare stage says what it will put on show',
    bare.exposes.some((s) => s.kind === 'green'));

  check('a staging that touches nothing you have promises nothing',
    previewFor(machine, spotless).covers.length === 0 &&
    previewFor(stark, spotless).exposes.length === 0);
}

// --- arithmetic ----------------------------------------------------------------

{
  const both = applyProduction(troubled, { staging: machine, preparation: month });
  check('cost is the staging plus the preparation',
    both.cost === machine.cost + month.cost, `${both.cost}`);
  check('appeal sums across both choices',
    both.appeal.crowd === machine.appeal.crowd + month.appeal.crowd);
  check('a full production completes the phase', both.complete);
}

check('a half-made production is not complete',
  !applyProduction(troubled, { staging: machine }).complete &&
  !applyProduction(troubled, { preparation: month }).complete);
check('an empty production costs nothing and changes nothing',
  (() => {
    const none = applyProduction(troubled, {});
    return none.cost === 0 && none.volatility === 0 && none.seeds.every((s) => s.state === 'open');
  })());
check('a production over no cast at all does not throw',
  applyProduction(null, { staging: machine, preparation: cold }).seeds.length === 0);

// --- the data itself -------------------------------------------------------------

check('every staging names a cost, an appeal and a volatility',
  STAGINGS.every((s) => typeof s.cost === 'number' && s.appeal && typeof s.volatility === 'number'));
check('every preparation does too',
  PREPARATIONS.every((p) => typeof p.cost === 'number' && p.appeal && typeof p.volatility === 'number'));
check('ids are unique on both shelves',
  new Set(STAGINGS.map((s) => s.id)).size === STAGINGS.length &&
  new Set(PREPARATIONS.map((p) => p.id)).size === PREPARATIONS.length);

// A player who has spent everything must still be able to open, or the phase is
// a wall rather than a decision.
check('there is always a staging within reach of a ruined impresario',
  Math.min(...STAGINGS.map((s) => s.cost)) <= 6, `cheapest ${Math.min(...STAGINGS.map((s) => s.cost))}g`);
check('and opening cold is free',
  preparationById('cold').cost === 0);

check('every kind of trouble a cast can plant can be covered by something',
  ['miscast', 'green', 'drink', 'feud'].every((kind) =>
    [...STAGINGS, ...PREPARATIONS].some((part) => (part.covers ?? []).includes(kind))));

check('the production is described in words as well as numbers',
  gradeProduction({ staging: null, preparation: null }, 0) === 'not yet staged' &&
  gradeProduction({ staging: stark, preparation: cold }, 2) === 'everything on the acting' &&
  typeof gradeProduction({ staging: built, preparation: month }, 0) === 'string');

check('exposure is dearer than the seed it reveals', EXPOSURE_COST >= 2);

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall production checks passed');
process.exit(failures.length ? 1 : 0);
