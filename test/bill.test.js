/**
 * Unit tests for deriving a bill.
 *
 * The Bill is where a season is won or lost, and none of it needs a browser —
 * so all of it is checked here, against fixed data rather than the real content
 * tables, so that tuning a work's cost never breaks a test about arithmetic.
 *
 * Hand-rolled on purpose: a local check() that prints ok/FAIL, collects
 * failures and exits non-zero. No test framework.
 */
import {
  costOf, appealOf, volatilityOf, rolesOf, titleOf,
  deriveBill, financing, gradeAppeal, gradeVolatility, AUDIENCES,
  FEWEST_ROLES,
} from '../src/bill.js';
import { WORKS, TREATMENTS, HOOKS, BACKERS } from '../src/data.js';

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const work = {
  id: 'w', title: 'Hamlet', cost: 40, volatility: 1,
  appeal: { crowd: 2, society: 4, critics: 5 },
  roles: ['Tragedian', 'Ingénue'],
};
const treatment = {
  id: 't', name: 'As a Melodrama', billing: 'as a Melodrama', costMult: 1.6, volatility: 2,
  appeal: { crowd: 1, society: 4, critics: 2 }, adds: 'Villain',
};
const hook = {
  id: 'h', name: 'A Live Horse', billing: 'with a Live Horse', cost: 15, volatility: 3,
  appeal: { crowd: 5, society: 0, critics: -2 },
};

// --- cost -------------------------------------------------------------------

check('the treatment multiplies the work and the hook is added after',
  costOf(work, treatment, hook) === 79, `got ${costOf(work, treatment, hook)}`);
check('a partial bill costs what has been chosen so far',
  costOf(work, null, null) === 40);
check('an empty bill costs nothing', costOf(null, null, null) === 0);
check('cost is always a whole guinea',
  Number.isInteger(costOf(work, { ...treatment, costMult: 1.333 }, hook)));

// --- appeal -----------------------------------------------------------------

{
  const appeal = appealOf(work, treatment, hook);
  check('appeal sums across all three choices',
    appeal.crowd === 8 && appeal.society === 8 && appeal.critics === 5,
    JSON.stringify(appeal));
}
check('appeal is not clamped, so a bill can repel an audience',
  appealOf(work, { ...treatment, appeal: { crowd: -9, society: 0, critics: 0 } }, null).crowd === -7);
check('every audience is accounted for on an empty bill',
  AUDIENCES.every((a) => appealOf(null, null, null)[a] === 0));

// --- volatility -------------------------------------------------------------

check('volatility adds up across the bill', volatilityOf(work, treatment, hook) === 6);
check('the sensible bill is the calm one', volatilityOf(work, null, null) === 1);

// --- roles ------------------------------------------------------------------

{
  const plain = rolesOf(work, null);
  check('a work on its own hands over exactly its own parts',
    plain.length === 2 && plain[0].role === 'Tragedian');
  check('and every part knows which line of business it belongs to',
    plain[0].line === 'Leading' && plain[1].line === 'Juvenile');
}

{
  // A treatment reshapes the cast list, not only the tone: a melodrama needs a
  // villain to hiss whoever wrote the play.
  const added = rolesOf(work, treatment);
  check('a treatment that adds a part lengthens the cast list',
    added.length === 3 && added[2].role === 'Villain');
  check('and the added part carries its line like any other',
    added[2].line === 'Heavy');
}

{
  const cut = rolesOf({ ...work, roles: ['Tragedian', 'Ingénue', 'Comic', 'Ghost'] }, { cuts: 1 });
  check('cutting to ninety minutes loses somebody entirely', cut.length === 3);

  // The floor matters: a treatment must never cut a bill down to a monologue,
  // which is a different art form and not one this game knows how to cast.
  const floored = rolesOf({ ...work, roles: ['Tragedian', 'Ingénue'] }, { cuts: 3 });
  check('but a cut can never leave fewer parts than the game can cast',
    floored.length === FEWEST_ROLES, `${floored.length}`);
}

{
  // A treatment can add a part the work already had. Identical labels in the
  // cast strip are unreadable, so the repeat is numbered.
  const doubled = rolesOf({ ...work, roles: ['Tragedian', 'Villain'] }, { adds: 'Villain' });
  check('a repeated part is numbered rather than duplicated',
    doubled[1].label === 'Villain' && doubled[2].label === 'Second Villain',
    doubled.map((r) => r.label).join(' | '));
  check('and both still know they are the same kind of part',
    doubled[1].role === 'Villain' && doubled[2].role === 'Villain' &&
    doubled[1].line === doubled[2].line);
}

check('an unknown part still gets a line rather than crashing',
  rolesOf({ ...work, roles: ['Sword Swallower'] }, null)[0].line === 'Utility');
check('no work means no roles to fill', rolesOf(null, treatment).length === 0);

// --- billing ----------------------------------------------------------------

check('the poster reads as billing matter',
  titleOf(work, treatment, hook) === 'Hamlet, as a Melodrama, with a Live Horse',
  titleOf(work, treatment, hook));
check('a hook that is no hook adds nothing to the billing',
  titleOf(work, treatment, { ...hook, billing: null }) === 'Hamlet, as a Melodrama');
check('the work alone is billed without punctuation', titleOf(work, null, null) === 'Hamlet');

// --- the derived bill -------------------------------------------------------

{
  const bill = deriveBill({ work, treatment, hook });
  check('a bill with all three parts is complete', bill.complete);
  check('and carries everything the later phases need',
    bill.cost === 79 && bill.volatility === 6 && bill.roles.length === 3,
    `${bill.cost}g, volatility ${bill.volatility}, ${bill.roles.length} parts`);
}
check('a bill missing its hook is not yet complete',
  !deriveBill({ work, treatment }).complete);
check('an empty bill derives without throwing', deriveBill().complete === false);

// --- financing --------------------------------------------------------------

{
  const bill = deriveBill({ work, treatment, hook }); // 79
  const flush = financing(bill, 120, BACKERS);
  check('a bill within your means needs no backer',
    flush.affordable && flush.offers.length === 0);

  const short = financing(bill, 50, BACKERS);  // 29 short
  check('being short is reported rather than blocking', short.shortfall === 29 && !short.affordable);
  check('and every backer who can cover it is offered',
    short.offers.length === BACKERS.filter((b) => b.offers >= 29).length && short.offers.length > 0);

  const desperate = financing(bill, 0, BACKERS); // 79 short
  check('a backer who cannot cover the whole shortfall is not offered',
    desperate.offers.every((b) => b.offers >= 79),
    desperate.offers.map((b) => b.id).join(','));
}

// --- words, not just numbers ------------------------------------------------

check('appeal is graded in words as well as numbers',
  gradeAppeal(24) === 'clamouring' && gradeAppeal(0) === 'indifferent' && gradeAppeal(-8) === 'hostile');
// The scale must span a whole production. Calibrated against the bill alone it
// pegged at 'clamouring' the moment a cast was attached, and said nothing after.
check('a bill with nobody in it cannot already be clamouring',
  gradeAppeal(11) !== 'clamouring', gradeAppeal(11));
check('and a full production can reach the top of the scale',
  gradeAppeal(26) === 'clamouring');
check('volatility is graded in words too',
  gradeVolatility(0) === 'orderly' && gradeVolatility(10) === 'suicidal');
check('every grade boundary returns something',
  [-20, -9, -3, 0, 2, 8, 15, 22, 40].every((v) => typeof gradeAppeal(v) === 'string') &&
  [0, 2, 4, 6, 8, 20].every((v) => typeof gradeVolatility(v) === 'string'));

// --- the content tables themselves ------------------------------------------

check('every work has appeal for all three audiences',
  WORKS.every((w) => AUDIENCES.every((a) => typeof w.appeal[a] === 'number')));
check('every work offers at least three roles',
  WORKS.every((w) => w.roles.length >= 3));
check('every treatment and hook scores all three audiences',
  [...TREATMENTS, ...HOOKS].every((t) => AUDIENCES.every((a) => typeof t.appeal[a] === 'number')));
check('exactly one hook is free, so being sensible is always allowed',
  HOOKS.filter((h) => h.cost === 0).length === 1);
check('ids are unique within each axis',
  new Set(WORKS.map((w) => w.id)).size === WORKS.length &&
  new Set(TREATMENTS.map((t) => t.id)).size === TREATMENTS.length &&
  new Set(HOOKS.map((h) => h.id)).size === HOOKS.length);

// Free multiplication means every pairing must survive derivation. Nothing here
// asserts a combination is *good* — only that none of them can crash the game.
{
  let derived = 0;
  for (const w of WORKS) for (const t of TREATMENTS) for (const h of HOOKS) {
    const bill = deriveBill({ work: w, treatment: t, hook: h });
    if (bill.complete && Number.isInteger(bill.cost) && bill.title.length > 0) derived++;
  }
  const total = WORKS.length * TREATMENTS.length * HOOKS.length;
  check('every legal combination derives cleanly', derived === total, `${derived} of ${total}`);
}

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall bill checks passed');
process.exit(failures.length ? 1 : 0);
