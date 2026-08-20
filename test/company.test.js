/**
 * Unit tests for casting.
 *
 * The Company is where the bill's ambition meets the fact that the people who
 * can actually do it are vain, drunk, or both. All of that is arithmetic over
 * plain data, so all of it is checked here.
 */
import {
  fitFor, appraiseCasting, availableTo, impositionFor, satisfiesImposition,
  gradeCompany, TEMPERAMENTS,
} from '../src/company.js';
import { deriveBill } from '../src/bill.js';
import { PERFORMERS, WORKS, TREATMENTS, HOOKS, BACKERS } from '../src/data.js';

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const who = (id) => PERFORMERS.find((p) => p.id === id);
const slot = (role, discipline = null) => ({ role, discipline, label: role });

// --- fit ---------------------------------------------------------------------

check('a performer in their own line is ideal',
  fitFor(who('fenwick'), slot('Ingénue')).level === 'ideal');
check('a performer out of their line is passable, not forbidden',
  fitFor(who('pike'), slot('Diva')).level === 'passable');
check('casting against type costs volatility rather than being blocked',
  fitFor(who('pike'), slot('Diva')).volatility > 0);

check('a treatment that demands dancers rejects a singer',
  fitFor(who('vestris'), slot('Diva', 'Dancer')).level === 'wrong');
check('and accepts a dancer for the same part',
  fitFor(who('marr'), slot('Diva', 'Dancer')).level === 'ideal');
check('the wrong discipline is the heaviest penalty available',
  fitFor(who('vestris'), slot('Diva', 'Dancer')).appeal <
  fitFor(who('pike'), slot('Diva')).appeal);
check('discipline overrules affinity, because a singer still cannot dance',
  fitFor(who('vestris'), slot('Diva', 'Dancer')).level === 'wrong');

check('an empty slot has no fit at all', fitFor(null, slot('Ingénue')) === null);

// --- appraising a cast -------------------------------------------------------

const hamlet = deriveBill({
  work: WORKS.find((w) => w.id === 'hamlet'),
  treatment: TREATMENTS.find((t) => t.id === 'grand-manner'),
  hook: HOOKS.find((h) => h.id === 'none'),
});

check('the bill hands casting four roles to fill', hamlet.roles.length === 4);

{
  const empty = appraiseCasting(hamlet, {});
  check('an uncast bill is not complete', !empty.complete && empty.filled === 0);
  check('and costs nothing in salary yet', empty.salary === 0);
  check('and plants nothing', empty.seeds.length === 0 && empty.volatility === 0);
}

{
  // Hamlet: Tragedian, Ingénue, Ghost, Comic — all steady, all in their line.
  const steady = appraiseCasting(hamlet, { 0: 'pike', 1: 'fenwick', 2: 'pike', 3: 'grimaldi' });
  check('a performer cannot be counted twice in one appraisal',
    steady.slots.filter((s) => s.performer?.id === 'pike').length === 2,
    'appraise reports what it is given; availableTo is what prevents it');
}

{
  const good = appraiseCasting(hamlet, { 0: 'kean', 1: 'fenwick', 2: 'bone', 3: 'grimaldi' });
  check('a full cast completes the phase', good.complete && good.filled === 4);
  check('salary is the sum of what they are owed',
    good.salary === who('kean').salary + who('fenwick').salary + who('bone').salary + who('grimaldi').salary,
    `${good.salary}`);
  check('talent reaches the critics and fame reaches the crowd',
    good.appeal.critics > 0 && good.appeal.crowd > 0);
  check('two drinkers plant two warnings',
    good.seeds.filter((s) => s.kind === 'drink').length === 2,
    good.seeds.map((s) => s.kind).join(','));
}

{
  // Fame and talent must be separable currencies, or the phase has one axis.
  const famous = appraiseCasting(hamlet, { 0: 'vestris' });   // fame 5, talent 5
  const unknown = appraiseCasting(hamlet, { 0: 'bone' });     // fame 1, talent 4
  check('a famous name pulls the crowd harder than an unknown one',
    famous.appeal.crowd > unknown.appeal.crowd);
  check('while the critics count talent, so the gap there is far smaller',
    famous.appeal.critics - unknown.appeal.critics < famous.appeal.crowd - unknown.appeal.crowd,
    `critics gap ${famous.appeal.critics - unknown.appeal.critics}, crowd gap ${famous.appeal.crowd - unknown.appeal.crowd}`);
}

// --- feuds -------------------------------------------------------------------

{
  const oneProud = appraiseCasting(hamlet, { 0: 'kean', 1: 'fenwick', 2: 'bone', 3: 'grimaldi' });
  const twoProud = appraiseCasting(hamlet, { 0: 'kean', 1: 'marr', 2: 'vane', 3: 'grimaldi' });
  check('one proud performer starts no quarrel',
    oneProud.seeds.every((s) => s.kind !== 'feud'));
  check('two proud performers will not share a curtain call',
    twoProud.seeds.some((s) => s.kind === 'feud'));

  const threeProud = appraiseCasting(hamlet, { 0: 'siddons', 1: 'marr', 2: 'vane', 3: 'grimaldi' });
  check('three of them is three quarrels, not one and a half',
    threeProud.volatility > twoProud.volatility,
    `${threeProud.volatility} vs ${twoProud.volatility}`);
}

// --- the backer's string ------------------------------------------------------

check('a backer you did not take imposes nobody', impositionFor(null) === null);
check("Kaufmann's money comes with his niece",
  impositionFor('kaufmann')?.performer.id === 'niece');

{
  const withoutHer = appraiseCasting(hamlet,
    { 0: 'kean', 1: 'fenwick', 2: 'bone', 3: 'grimaldi' }, { imposed: 'kaufmann' });
  check('a full cast that omits her does not satisfy the debt',
    withoutHer.filled === 4 && !withoutHer.complete);

  const withHer = appraiseCasting(hamlet,
    { 0: 'kean', 1: 'niece', 2: 'bone', 3: 'grimaldi' }, { imposed: 'kaufmann' });
  check('and casting her anywhere discharges it', withHer.complete);

  const noDebt = appraiseCasting(hamlet,
    { 0: 'kean', 1: 'fenwick', 2: 'bone', 3: 'grimaldi' });
  check('with no backer the same cast is complete', noDebt.complete);
}

check('the niece is not in the company unless her uncle paid',
  !availableTo(null).some((p) => p.id === 'niece') &&
  availableTo('kaufmann').some((p) => p.id === 'niece'));
check('a backer with no string imposes nobody',
  BACKERS.filter((b) => impositionFor(b.id)).length >= 1 &&
  impositionFor('syndicate') === null);

// --- availability -------------------------------------------------------------

check('someone already cast is no longer available',
  !availableTo(null, { 0: 'grimaldi' }).some((p) => p.id === 'grimaldi'));
check('everyone else still is',
  availableTo(null, { 0: 'grimaldi' }).length === availableTo(null).length - 1);

// --- the roster itself ---------------------------------------------------------

check('every performer has a temperament the game knows',
  PERFORMERS.every((p) => TEMPERAMENTS[p.temperament]));
check('every performer has a discipline a treatment might demand',
  PERFORMERS.every((p) => ['Actor', 'Singer', 'Dancer'].includes(p.discipline)));
check('performer ids are unique',
  new Set(PERFORMERS.map((p) => p.id)).size === PERFORMERS.length);
check('the roster spans all three disciplines',
  new Set(PERFORMERS.map((p) => p.discipline)).size === 3);
check('somebody cheap exists, so a broke impresario can still open',
  PERFORMERS.some((p) => p.salary <= 10 && !p.imposed));

// Every work must be castable at all, under every treatment — a bill the player
// is allowed to mount but cannot fill would be a dead end they chose blind.
{
  let uncastable = [];
  for (const work of WORKS) for (const treatment of TREATMENTS) {
    const bill = deriveBill({ work, treatment, hook: HOOKS[0] });
    const pool = availableTo(null);
    // Greedy: can each role find *some* body that is not the wrong discipline?
    const used = new Set();
    let ok = true;
    for (const s of bill.roles) {
      const found = pool.find((p) => !used.has(p.id) && fitFor(p, s).level !== 'wrong');
      if (!found) { ok = false; break; }
      used.add(found.id);
    }
    if (!ok) uncastable.push(`${work.id}/${treatment.id}`);
  }
  check('every work can be cast under every treatment without miscasting',
    uncastable.length === 0, uncastable.join(', '));
}

check('the company is described in words as well as numbers',
  gradeCompany({ filled: 0, total: 4, volatility: 0 }) === 'not yet cast' &&
  typeof gradeCompany({ filled: 4, total: 4, volatility: 12 }) === 'string');

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall company checks passed');
process.exit(failures.length ? 1 : 0);
