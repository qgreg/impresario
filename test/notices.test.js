/**
 * Unit tests for the settlement.
 *
 * This is the piece that closes the loop, so the property that matters most is
 * not any single number — it is that a season can actually be played. Money has
 * to be able to come back, and when it cannot, the season has to end rather
 * than leaving the player tapping through bills they can never afford.
 */
import {
  settleShow, rollMishaps, noticesFor, gradeStanding, isRuined, cheapestProduction,
  WORTH, MISHAP_CHANCE, MISHAP_DAMAGE, CRITIC_EXPECTATION, STANDING_STEP,
} from '../src/notices.js';
import { deriveBill } from '../src/bill.js';
import { appraiseCasting } from '../src/company.js';
import { applyProduction } from '../src/production.js';
import { rolesOf, costOf } from '../src/bill.js';
import { WORKS, TREATMENTS, HOOKS, STAGINGS, PREPARATIONS, PERFORMERS, BACKERS } from '../src/data.js';

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const never = () => 1;    // no roll ever succeeds
const always = () => 0;   // every roll succeeds

// --- the mishap roll ---------------------------------------------------------

check('a calm night can go entirely to plan', rollMishaps(10, never) === 0);
check('a cursed night goes wrong in every way it could', rollMishaps(10, always) === 10);
check('nothing that could go wrong means nothing does', rollMishaps(0, always) === 0);
check('negative volatility cannot produce negative mishaps', rollMishaps(-5, always) === 0);

{
  // Rolled per item rather than scaled, so recklessness is a gamble and not a
  // fixed tax. Over many nights the average should sit near the stated chance.
  let total = 0;
  const runs = 2000;
  let seed = 12345;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < runs; i++) total += rollMishaps(10, rng);
  const rate = total / (runs * 10);
  check('mishaps land near the stated chance over many nights',
    Math.abs(rate - MISHAP_CHANCE) < 0.05, `${rate.toFixed(3)} vs ${MISHAP_CHANCE}`);
}

// --- takings ------------------------------------------------------------------

const appeal = { crowd: 12, society: 10, critics: 8 };

{
  const perfect = settleShow({ appeal, volatility: 8, outlay: 100 }, { mishaps: 0 });
  check('a night with nothing going wrong takes the full gross',
    perfect.takings === perfect.gross);
  check('gross counts the crowd and the boxes',
    perfect.gross === 12 * WORTH.crowd + 10 * WORTH.society, `${perfect.gross}`);
  check('and the critics never pay for a ticket', WORTH.critics === 0);

  const cursed = settleShow({ appeal, volatility: 8, outlay: 100 }, { mishaps: 8 });
  check('every mishap takes a bite out of the takings', cursed.takings < perfect.takings);
  check('but a disaster is never a debt at the box office', cursed.takings >= 0);
}

check('a show nobody wants takes nothing rather than owing money',
  settleShow({ appeal: { crowd: -8, society: -8, critics: -8 }, volatility: 0, outlay: 50 },
    { mishaps: 0 }).takings === 0);

check('profit is what came in less what went out',
  settleShow({ appeal, volatility: 0, outlay: 60 }, { mishaps: 0 }).profit ===
  settleShow({ appeal, volatility: 0, outlay: 60 }, { mishaps: 0 }).takings - 60);

check('the damage from mishaps is capped, so a ruinous night is not a total wipe',
  settleShow({ appeal, volatility: 40, outlay: 10 }, { mishaps: 40 }).takings > 0);

// --- standing -----------------------------------------------------------------

{
  const praised = settleShow({ appeal: { crowd: 0, society: 0, critics: 18 }, volatility: 0, outlay: 0 }, { mishaps: 0 });
  const panned = settleShow({ appeal: { crowd: 0, society: 0, critics: -9 }, volatility: 0, outlay: 0 }, { mishaps: 0 });
  check('the critics move your standing', praised.standing > panned.standing);

  // A show can make money and lose you standing. That tension is the reason
  // there are three audiences rather than one score.
  const vulgarHit = settleShow({ appeal: { crowd: 24, society: 6, critics: -6 }, volatility: 0, outlay: 40 }, { mishaps: 0 });
  check('a vulgar hit pays well and costs you your reputation',
    vulgarHit.profit > 0 && vulgarHit.standing < 0,
    `profit ${vulgarHit.profit}, standing ${vulgarHit.standing}`);

  const succèsDEstime = settleShow({ appeal: { crowd: -4, society: 2, critics: 18 }, volatility: 0, outlay: 90 }, { mishaps: 0 });
  check('and a critical triumph can still ruin you',
    succèsDEstime.profit < 0 && succèsDEstime.standing > 0,
    `profit ${succèsDEstime.profit}, standing ${succèsDEstime.standing}`);
}

// Standing is comparative, not absolute. Scaled straight off critical approval
// it made a competent impresario the toast of London by week two, which emptied
// the word of meaning — six weeks of ordinary competence must not do that.
{
  const respectable = { crowd: 8, society: 8, critics: CRITIC_EXPECTATION };
  check('a merely respectable notice leaves your standing where it was',
    settleShow({ appeal: respectable, volatility: 0, outlay: 0 }, { mishaps: 0 }).standing === 0);

  const good = settleShow(
    { appeal: { crowd: 8, society: 8, critics: CRITIC_EXPECTATION + STANDING_STEP * 2 }, volatility: 0, outlay: 0 },
    { mishaps: 0 });
  check('a genuinely fine notice moves it by a step or two',
    good.standing >= 1 && good.standing <= 3, `${good.standing}`);

  let reputation = 0;
  for (let week = 0; week < 6; week++) {
    reputation += settleShow({ appeal: respectable, volatility: 0, outlay: 0 }, { mishaps: 0 }).standing;
  }
  check('and six weeks of competence does not make you the toast of London',
    gradeStanding(reputation) !== 'the toast of London', gradeStanding(reputation));

  check('a night of disasters costs standing on top of the notice',
    settleShow({ appeal: respectable, volatility: 9, outlay: 0 }, { mishaps: 9 }).standing <
    settleShow({ appeal: respectable, volatility: 9, outlay: 0 }, { mishaps: 0 }).standing);
}

check('standing is always described in words', 
  [-9, -3, 0, 3, 6, 10, 20].every((s) => typeof gradeStanding(s) === 'string'));
check('an unknown impresario starts unknown', gradeStanding(0) === 'unknown');

// --- the notices ----------------------------------------------------------------

// Reviews describe the night that happened, not the night that was planned. A
// show that lost ninety guineas amid nine disasters was being called the finest
// thing of the season, because the lookup read appeal and ignored the wreckage.
{
  const hoped = { crowd: 24, society: 24, critics: 25 };
  const calm = settleShow({ appeal: hoped, volatility: 0, outlay: 100 }, { mishaps: 0 });
  const wreck = settleShow({ appeal: hoped, volatility: 19, outlay: 100 }, { mishaps: 9 });

  check('a disastrous night does not receive the notices it hoped for',
    wreck.notices.map((n) => n.text).join() !== calm.notices.map((n) => n.text).join(),
    wreck.notices.map((n) => n.text).join(' | '));
  check('and it does not take the critics\u2019 highest praise',
    !/finest thing/.test(wreck.notices.find((n) => n.audience === 'critics').text));
  check('nor does it raise your standing',
    wreck.standing < calm.standing && wreck.standing <= 0,
    `${wreck.standing} against ${calm.standing}`);

  // The gallery came for a night out; the boxes are embarrassed to be seen at
  // a shambles; the critics are paid to notice and never forget.
  check('the gallery forgives a shambles more readily than the critics do',
    wreck.received.crowd > wreck.received.critics);
}

check('there is a notice from every audience, every time',
  noticesFor(appeal, 0).length === 3 &&
  noticesFor({ crowd: -20, society: -20, critics: -20 }, 0).length === 3);
check('a night of disasters gets a line of its own',
  noticesFor(appeal, 7).some((n) => /disasters/.test(n.text)));
check('a tidy night does not', noticesFor(appeal, 1).every((n) => !/disasters/.test(n.text)));

// --- the loop must be re-enterable -----------------------------------------------
// This is the property the whole module exists for. Building three phases that
// only spend money left the game unplayable after one production: with no income
// there was no week two, which reads to a player as being stuck.

// The ruin line has to be the cost of a whole *production*. Measured against
// the cheapest work instead, an impresario with twenty-five guineas was told
// they were solvent, mounted a bill they could afford, and then could not pay
// anybody — not ruined, not playing, just stuck.
{
  const tables = {
    works: WORKS, treatments: TREATMENTS, hooks: HOOKS,
    performers: PERFORMERS, stagings: STAGINGS, preparations: PREPARATIONS,
  };
  const floor = cheapestProduction(tables, rolesOf, costOf);

  check('the floor is a real figure derived from the shelf',
    Number.isFinite(floor) && floor > 0, `${floor}g`);
  check('and it is a whole production, not just a play off the shelf',
    floor > Math.min(...WORKS.map((w) => w.cost)),
    `${floor}g against a ${Math.min(...WORKS.map((w) => w.cost))}g work`);

  // The floor must actually be reachable: some real combination has to cost it,
  // or the game declares ruin above a price nobody could ever have paid.
  let cheapestReal = Infinity;
  const freeHook = HOOKS.reduce((a, h) => (h.cost < a.cost ? h : a));
  const wages = PERFORMERS.filter((p) => !p.imposed).map((p) => p.salary).sort((a, b) => a - b);
  for (const work of WORKS) for (const treatment of TREATMENTS) {
    const roles = rolesOf(work, treatment).length;
    const cast = wages.slice(0, roles).reduce((sum, w) => sum + w, 0);
    cheapestReal = Math.min(cheapestReal, costOf(work, treatment, freeHook) + cast
      + Math.min(...STAGINGS.map((s) => s.cost)) + Math.min(...PREPARATIONS.map((p) => p.cost)));
  }
  check('some real production actually costs exactly the floor',
    floor === cheapestReal, `${floor}g against ${cheapestReal}g`);

  check('ruin is recognised rather than left as an unplayable screen',
    isRuined(floor - 1, floor) && !isRuined(floor, floor));

  // Starting capital must comfortably clear it, or week one is a coin toss.
  check('an impresario begins the season able to open something',
    !isRuined(120, floor), `120g against a ${floor}g floor`);

  // And the deepest pocket in town has to matter, or borrowing is decorative.
  const deepest = Math.max(0, ...BACKERS.map((b) => b.offers));
  check('a backer can keep a nearly-broke impresario in business',
    deepest > 0 && isRuined(floor - 1, floor) && !isRuined(floor - 1 + deepest, floor),
    `deepest pocket ${deepest}g`);
}

{
  // A sensible, affordable production, played straight: it has to be capable of
  // washing its own face, or no strategy can sustain a season.
  const bill = deriveBill({
    work: WORKS.find((w) => w.id === 'rivals'),
    treatment: TREATMENTS.find((t) => t.id === 'grand-manner'),
    hook: HOOKS.find((h) => h.id === 'none'),
  });
  const casting = appraiseCasting(bill, { 0: 'grimaldi', 1: 'fenwick', 2: 'marsh', 3: 'enderby' });
  const production = applyProduction(casting, {
    staging: STAGINGS.find((s) => s.id === 'built'),
    preparation: PREPARATIONS.find((p) => p.id === 'week'),
  });

  const appeal = {};
  for (const a of ['crowd', 'society', 'critics']) {
    appeal[a] = bill.appeal[a] + casting.appeal[a] + production.appeal[a];
  }
  const outlay = bill.cost + casting.salary + production.cost;
  const volatility = bill.volatility + casting.volatility + production.volatility;

  const typical = settleShow({ appeal, volatility, outlay },
    { mishaps: Math.round(Math.max(0, volatility) * MISHAP_CHANCE) });
  check('a sensible production can turn a profit on an ordinary night',
    typical.profit > 0,
    `outlay ${outlay}g, took ${typical.takings}g, profit ${typical.profit}g on ${typical.mishaps} mishaps`);

  // Careful play really can drive volatility below zero. That has to mean "the
  // night passed without incident" and nothing more — carefulness must not mint
  // money, which is what an unclamped negative mishap count did.
  check('a calm production cannot go better than perfectly',
    settleShow({ appeal, volatility: -4, outlay }, { mishaps: -4 }).takings ===
    settleShow({ appeal, volatility: 0, outlay }, { mishaps: 0 }).takings);

  const reckless = settleShow({ appeal, volatility: 12, outlay }, { mishaps: 12 });
  check('and a night where everything goes wrong loses money',
    reckless.profit < 0 && reckless.profit < typical.profit,
    `${reckless.profit}g against ${typical.profit}g`);
}

check('mishap damage is a real bite, not a rounding error', MISHAP_DAMAGE >= 0.04);

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall notices checks passed');
process.exit(failures.length ? 1 : 0);
