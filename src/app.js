/**
 * Impresario — phase one: The Bill.
 *
 * The player makes three taps and watches the consequences assemble. Nothing
 * here is real-time and nothing here is a menu: each tap is a commitment that
 * narrows what the rest of the season can be.
 *
 * Everything that decides anything lives in bill.js as a pure function. This
 * module owns the state and paints the screen, and that is all it does.
 */

import { WORKS, TREATMENTS, HOOKS, BACKERS, STAGINGS, PREPARATIONS, PERFORMERS, IMPRESARIOS } from './data.js';
import {
  appraiseCasting, availableTo, fitFor, gradeCompany, impositionFor,
} from './company.js';
import {
  applyProduction, previewFor, gradeProduction,
} from './production.js';
import { settleShow, gradeStanding, isRuined, cheapestProduction, fateFor } from './notices.js';
import { buildNight, gradeNight, crisisCount } from './night.js';
import { runNight } from './openingnight.js';
import {
  sfx, call, stopTalking, wake, isEnabled, setEnabled, receptionFor, warmthFor,
} from './sound.js';
import {
  deriveBill, financing, gradeAppeal, gradeVolatility, rolesOf, costOf,
  AUDIENCES, AUDIENCE_LABELS, APPEAL_CEILING,
} from './bill.js';

const STARTING_CAPITAL = 120;

/**
 * The least a whole production can cost, derived from the shelf rather than
 * guessed at. Below this an impresario cannot open anything, whatever they
 * choose, so it is the line ruin is measured against.
 */
const RUIN_FLOOR = cheapestProduction(
  { works: WORKS, treatments: TREATMENTS, hooks: HOOKS, performers: PERFORMERS, stagings: STAGINGS, preparations: PREPARATIONS },
  rolesOf,
  costOf,
);

/**
 * Money is finite, and so is patience.
 *
 * There are three people in London who will advance an impresario anything, and
 * each of them will do it once. Without that, ruin was unreachable: the deepest
 * pocket in town is a hundred guineas against a floor of thirty, so a bottomless
 * backer meant a bottomless season and no losing condition at all.
 *
 * Spending them one at a time is also the truthful version. Nobody funds the
 * same man's third failure.
 */
function backersLeft() {
  const allowed = state.impresario?.backers;
  return BACKERS
    .filter((backer) => !allowed || allowed.includes(backer.id))
    .filter((backer) => !state.spentBackers.includes(backer.id));
}

function deepestPocket() {
  return Math.max(0, ...backersLeft().map((backer) => backer.offers));
}

/** Take the money, and use up the goodwill along with it. */
function takeBacker(backer) {
  state.backer = backer;
  if (!state.spentBackers.includes(backer.id)) state.spentBackers.push(backer.id);
}

const state = {
  impresario: null,   // chosen before anything else; sets the purse and the problem
  fate: null,         // how the season ended, once it has
  capital: STARTING_CAPITAL,
  week: 1,
  reputation: 0,
  spentBackers: [],   // each of them will do it once, and once only
  choice: { work: null, treatment: null, hook: null },
  backer: null,
  assigned: {},   // roleIndex -> performerId
  production: { staging: null, preparation: null },
  night: null,
  running: null,      // the live performance, while the curtain is up
  performance: null,  // what the operator made of it
  result: null,   // the settled night, once the house has opened
  // impresario → work → treatment → hook → mount → casting → staging →
  // preparation → ready → open
  step: 'impresario',
};

/**
 * Money is not taken at any point in the middle. The player commits to a bill
 * and then to a cast, and the whole outlay leaves the account when the house
 * opens — so the running total on screen is always the real size of what they
 * have promised, rather than a balance that has already been quietly reduced.
 */
function funds() {
  return state.capital + (state.backer ? state.backer.offers : 0);
}

const el = {
  capital: document.getElementById('capital'),
  week: document.getElementById('week'),
  reputation: document.getElementById('reputation'),
  slots: document.getElementById('slots'),
  posterTitle: document.getElementById('poster-title'),
  posterRemark: document.getElementById('poster-remark'),
  cost: document.getElementById('cost'),
  meters: document.getElementById('meters'),
  volatility: document.getElementById('volatility'),
  prompt: document.getElementById('prompt'),
  cards: document.getElementById('cards'),
  poster: document.getElementById('poster'),
  readout: document.getElementById('readout'),
  curtain: document.getElementById('curtain'),
  begin: document.getElementById('begin'),
  sound: document.getElementById('sound'),
  soundLabel: document.getElementById('sound-label'),
  mute: document.getElementById('mute'),
  muteLabel: document.getElementById('mute-label'),
  night: document.getElementById('night'),
  nightStage: document.getElementById('night-stage'),
  nightCue: document.getElementById('night-cue'),
  nightHint: document.getElementById('night-hint'),
};

// --------------------------------------------------------------- painting

/**
 * Appeal is drawn as a bar and stated in words beside it. The bar is the thing
 * you glance at; the word is the thing that still works if the colours do not
 * reach you, or if the phone is in bright sun with the brightness turned down.
 */
function paintMeters(appeal) {
  el.meters.replaceChildren();
  for (const audience of AUDIENCES) {
    const value = appeal[audience];
    const { name, glyph } = AUDIENCE_LABELS[audience];
    const grade = gradeAppeal(value);

    const row = document.createElement('li');
    row.className = `meter meter--${audience}${value < 0 ? ' meter--hostile' : ''}`;
    row.innerHTML = `
      <span class="meter__glyph" aria-hidden="true">${glyph}</span>
      <span class="meter__who"></span>
      <span class="meter__bar"><span class="meter__fill"></span></span>
      <span class="meter__grade">${grade}</span>`;
    row.querySelector('.meter__who').textContent = name;
    // The bar runs to a whole production's worth of appeal, so a bill on its own
    // sits low and filling the cast visibly fills it. A negative appeal shows an
    // empty bar and says "hostile": a bar that grows leftward reads as a bug
    // rather than as scorn.
    const width = Math.max(0, Math.min(100, (value / APPEAL_CEILING) * 100));
    row.querySelector('.meter__fill').style.width = `${width}%`;
    row.setAttribute('aria-label', `${name}: ${grade}`);
    el.meters.appendChild(row);
  }
}

function paintStanding() {
  el.capital.textContent = state.impresario ? `${state.capital}g` : '—';
  // Before anybody has been chosen there is no season to be in the first week of.
  el.week.textContent = state.impresario ? `Week ${state.week}` : 'not yet begun';
  // Standing is shown in words and never as a bare number. It used to print the
  // raw figure, which told the player nothing about whether +3 was good.
  el.reputation.textContent = gradeStanding(state.reputation);
}

function paintBill(bill, casting, production) {
  const billed = bill.title.length > 0;
  el.posterTitle.textContent = billed ? bill.title : 'Nothing is billed';
  el.posterTitle.classList.toggle('poster__title--empty', !billed);

  el.posterRemark.hidden = !bill.remark;
  if (bill.remark) el.posterRemark.textContent = bill.remark;

  // Salaries join the readout the moment casting begins, because a cast is not
  // a separate budget — it is the same money, and the player is entitled to see
  // the whole promise in one number.
  const casting_ = casting || { salary: 0, appeal: { crowd: 0, society: 0, critics: 0 }, volatility: 0 };
  const production_ = production || { cost: 0, appeal: { crowd: 0, society: 0, critics: 0 }, volatility: 0 };
  const outlay = bill.cost + casting_.salary + production_.cost;

  // Once the house is open the money has gone, so the line reports what was
  // spent. Comparing the same outlay against the reduced capital reported the
  // player as short of a sum they had already paid.
  const settled = state.step === 'open';
  const shortfall = settled ? 0 : Math.max(0, outlay - funds());

  el.cost.classList.toggle('readout__value--short', shortfall > 0);
  el.cost.textContent = outlay === 0 ? '—'
    : settled ? `${outlay}g spent`
    : shortfall > 0 ? `${outlay}g — ${shortfall} short`
    : `${outlay}g`;

  const appeal = {};
  for (const audience of AUDIENCES) {
    appeal[audience] = bill.appeal[audience] + casting_.appeal[audience] + production_.appeal[audience];
  }

  // Once the night has happened the meters show what the house actually thought,
  // not what it was hoping for. Leaving them on the hoped-for figures had the
  // critics reading "clamouring" directly above a review counting the disasters.
  paintMeters(settled && state.result ? state.result.received : appeal);

  const volatility = bill.volatility + casting_.volatility + production_.volatility;

  // The board shows what the evening will actually contain, not the raw risk
  // figure behind it. It promised "15 things will go wrong" and then opening
  // night produced two, because volatility and crises were different
  // quantities. A number on the board is a promise the night has to keep.
  const coming = crisisCount(volatility, (production_.seeds ?? []).filter((s) => s.state !== 'covered').length);
  const things = coming === 1 ? 'one thing will go wrong' : `${coming} things will go wrong`;

  if (settled && state.result) {
    // The performance knows how many crises the evening actually held; the
    // settlement only knows the risk figure behind them. Report the night that
    // was played, or the board reads "4 of 15 went wrong" after six crises.
    const { mishaps } = state.result;
    const atRisk = Math.max(0, state.performance?.couldHaveGoneWrong ?? state.result.couldHaveGoneWrong);
    el.volatility.textContent = mishaps === 0
      ? atRisk === 0 ? 'nothing could go wrong, and nothing did' : `none of the ${atRisk} went wrong`
      : `${mishaps} of ${atRisk} went wrong`;
    el.volatility.classList.toggle('readout__value--short', mishaps > 0);
    return;
  }

  el.volatility.classList.remove('readout__value--short');
  el.volatility.textContent = !bill.work
    ? '—'
    : `${gradeVolatility(volatility)} · ${coming === 0 ? 'nothing will go wrong' : things}`;
}

/** One tappable option. Everything the player needs to decide is on the face. */
function card(text, { cost, note, tags = [], className = '', onSelect }) {
  const button = document.createElement('button');
  button.className = `card ${className}`.trim();
  button.type = 'button';

  const top = document.createElement('div');
  top.className = 'card__top';
  top.innerHTML = `<span class="card__name"></span>`;
  top.querySelector('.card__name').textContent = text;
  if (cost != null) {
    const price = document.createElement('span');
    price.className = 'card__cost';
    price.textContent = cost;
    top.appendChild(price);
  }
  button.appendChild(top);

  if (note) {
    const p = document.createElement('p');
    p.className = 'card__note';
    p.textContent = note;
    button.appendChild(p);
  }

  if (tags.length) {
    const row = document.createElement('div');
    row.className = 'card__tags';
    for (const tag of tags) {
      const span = document.createElement('span');
      span.className = `tag tag--${tag.kind}`;
      span.textContent = tag.text;
      row.appendChild(span);
    }
    button.appendChild(row);
  }

  button.addEventListener('click', onSelect);
  return button;
}

/**
 * An option's effect on the three audiences, shown on the card itself. Hiding
 * this behind a tap would make the phase guesswork; the interesting decision is
 * the trade, not whether you can remember what a farce does to the boxes.
 */
function appealTags(part) {
  const tags = [];
  for (const audience of AUDIENCES) {
    const value = part.appeal[audience];
    if (!value) continue;
    tags.push({
      kind: audience,
      text: `${AUDIENCE_LABELS[audience].glyph} ${value > 0 ? '+' : ''}${value}`,
    });
  }
  if (part.volatility) tags.push({ kind: 'risk', text: `risk +${part.volatility}` });
  return tags;
}

// ------------------------------------------------------------------ steps

function paintChoice(bill, casting, production) {
  el.cards.replaceChildren();

  if (state.step === 'work') {
    el.prompt.textContent = 'Choose the work';
    for (const work of WORKS) {
      el.cards.appendChild(card(work.title, {
        cost: `${work.cost}g`,
        note: work.note,
        tags: appealTags(work),
        onSelect: () => choose('work', work, 'treatment'),
      }));
    }
    return;
  }

  if (state.step === 'treatment') {
    el.prompt.textContent = 'And how shall we do it?';
    for (const treatment of TREATMENTS) {
      el.cards.appendChild(card(treatment.name, {
        cost: `×${treatment.costMult.toFixed(1)}`,
        note: treatment.note,
        tags: appealTags(treatment),
        onSelect: () => choose('treatment', treatment, 'hook'),
      }));
    }
    return;
  }

  if (state.step === 'hook') {
    el.prompt.textContent = 'What will sell the ticket?';
    for (const hook of HOOKS) {
      el.cards.appendChild(card(hook.name, {
        cost: hook.cost ? `${hook.cost}g` : 'free',
        note: hook.note,
        tags: appealTags(hook),
        className: hook.id === 'none' ? 'card--quiet' : '',
        onSelect: () => choose('hook', hook, 'mount'),
      }));
    }
    return;
  }

  if (state.step === 'impresario') return paintImpresarios();
  if (state.step === 'ruined') return paintRuined();
  if (state.step === 'mount') return paintMount();
  if (state.step === 'casting') return paintCasting(casting);
  if (state.step === 'staging') return paintStaging(casting);
  if (state.step === 'preparation') return paintPreparation(casting);
  if (state.step === 'ready') return paintReady(bill, casting, production);
  if (state.step === 'open') return paintOpen(bill, casting, production);
}

/**
 * The commitment. Being short of money never blocks the player — it opens the
 * drawer of people who will cover it for a price, and taking one of them is the
 * push-your-luck of the whole phase.
 */
function paintMount() {
  const bill = currentBill();
  const money = financing(bill, state.capital, BACKERS);

  if (money.affordable) {
    el.prompt.textContent = 'Mount it?';
    el.cards.appendChild(card('Mount the production', {
      note: `${bill.cost}g of your own money, and ${bill.roles.length} roles to fill.`,
      className: 'card--mount',
      onSelect: mount,
    }));
  } else {
    el.prompt.textContent = `You are ${money.shortfall}g short. Somebody will lend it.`;
    for (const backer of money.offers.filter((b) => !state.spentBackers.includes(b.id))) {
      el.cards.appendChild(card(backer.name, {
        cost: `${backer.offers}g`,
        note: backer.string,
        className: 'card--backer',
        onSelect: () => { takeBacker(backer); mount(); },
      }));
    }
    if (!money.offers.length) {
      el.cards.appendChild(card('Nobody will touch it', {
        note: 'Not at that price. Something on the bill has to go.',
        className: 'card--quiet',
        onSelect: () => {},
      }));
    }
  }

  el.cards.appendChild(card('Start the bill again', {
    className: 'card--quiet',
    onSelect: reset,
  }));
}

/**
 * The roles, as a strip that stays visible while one of them is being filled.
 * Casting blind to what you have already done would hide the feuds and the
 * mismatches until they were too expensive to trade away.
 */
function paintSlots(casting) {
  const showing = state.step === 'casting' || state.step === 'ready' || state.step === 'open';
  el.slots.hidden = !showing;
  if (!showing) return;

  el.slots.replaceChildren();
  const active = activeSlot(casting);
  const imposition = impositionFor(state.backer?.id ?? null);

  for (const entry of casting.slots) {
    const button = document.createElement('button');
    button.type = 'button';
    const wrong = entry.fit?.level === 'wrong';
    const imposed = entry.performer && imposition && entry.performer.id === imposition.performer.id;
    button.className = [
      'slot',
      entry === active && state.step === 'casting' ? 'slot--active' : '',
      wrong ? 'slot--wrong' : '',
      imposed ? 'slot--imposed' : '',
    ].filter(Boolean).join(' ');

    const role = document.createElement('span');
    role.className = 'slot__role';
    role.textContent = entry.slot.label;
    const who = document.createElement('span');
    who.className = `slot__who${entry.performer ? '' : ' slot__who--empty'}`;
    who.textContent = entry.performer ? entry.performer.name : 'nobody yet';
    button.append(role, who);

    // Only during casting can a part be taken back; once the house is open the
    // strip is a record rather than a control.
    if (entry.performer && state.step !== 'open') {
      button.addEventListener('click', () => release(entry.index));
    }
    el.slots.appendChild(button);
  }
}

/** Everything the cast has planted for opening night, said plainly. */
function appendSeeds(casting) {
  if (!casting.seeds.length) return;
  const list = document.createElement('ul');
  list.className = 'seeds';
  for (const seed of casting.seeds) {
    const item = document.createElement('li');
    item.className = 'seed';
    item.textContent = seed.text;
    list.appendChild(item);
  }
  el.cards.appendChild(list);
}

/**
 * The same list once a production has been chosen, but now each line says what
 * became of it. A trouble that has been covered is not gone — it is handled,
 * and the player paid for that, so they should be able to see what they bought.
 */
function appendProductionSeeds(production) {
  if (!production.seeds.length) return;
  const list = document.createElement('ul');
  list.className = 'seeds';
  for (const seed of production.seeds) {
    const item = document.createElement('li');
    item.className = `seed seed--${seed.state}`;
    item.textContent = seed.state === 'covered'
      ? `${seed.text} — covered`
      : seed.state === 'exposed'
        ? `${seed.text} — and everyone will see it`
        : seed.text;
    list.appendChild(item);
  }
  el.cards.appendChild(list);
}

/**
 * One role at a time, in order. The same single verb as the bill: read three
 * cards, tap one. What changes is that every card is now judged against the
 * part in front of it rather than in the abstract.
 */
function paintCasting(casting) {
  const active = activeSlot(casting);

  if (!active) {
    // Every part filled — but a backer's string may still be outstanding.
    if (!casting.complete && casting.imposition) {
      el.prompt.textContent = 'Your backer is still owed';
      el.cards.appendChild(card(casting.imposition.performer.name, {
        note: `${state.backer.string} She is not in the company. Give up a part for her.`,
        className: 'card--quiet',
        onSelect: () => {},
      }));
      appendSeeds(casting);
      return;
    }
    state.step = 'staging';
    return paintStaging(casting);
  }

  el.prompt.textContent = `Who plays the ${active.slot.role}?`;

  // Ordered by suitability. Casting against type stays legal and stays visible,
  // but it belongs at the bottom of the list — making the player scroll past
  // eight people who physically cannot do the part is a tax, not a decision.
  const FIT_ORDER = { ideal: 0, passable: 1, wrong: 2 };
  const offered = availableTo(state.backer?.id ?? null, state.assigned)
    .map((performer) => ({ performer, fit: fitFor(performer, active.slot) }))
    .sort((a, b) =>
      FIT_ORDER[a.fit.level] - FIT_ORDER[b.fit.level] ||
      b.performer.talent - a.performer.talent ||
      a.performer.salary - b.performer.salary);

  for (const { performer, fit } of offered) {
    const tags = [
      { kind: 'critics', text: `talent ${performer.talent}` },
      { kind: 'crowd', text: `fame ${performer.fame}` },
      { kind: 'quiet', text: performer.line.toLowerCase() },
    ];
    if (fit.level === 'ideal') tags.push({ kind: 'society', text: 'in their line' });
    if (fit.level === 'wrong') tags.push({ kind: 'risk', text: 'out of their line' });
    if (performer.temperament !== 'steady') {
      tags.push({ kind: 'risk', text: TEMPERAMENT_WORDS[performer.temperament] });
    }

    el.cards.appendChild(card(performer.name, {
      cost: performer.salary === 0 ? 'free' : `${performer.salary}g`,
      note: fit.level === 'wrong' ? `${fit.why} ${performer.note}` : performer.note,
      tags,
      className: fit.level === 'wrong' ? 'card--quiet' : '',
      onSelect: () => assign(active.index, performer.id),
    }));
  }

  appendSeeds(casting);
}

/** The words shown on a performer's card for what they are likely to do to you. */
const TEMPERAMENT_WORDS = {
  vain: 'vain',
  temperamental: 'temperamental',
  drunk: 'unreliable',
  green: 'never done it',
  steady: 'steady',
};

/**
 * A card for a staging or a preparation, with the thing that makes this phase
 * different attached: what it would do to the trouble *this* cast has planted.
 * Compensation the player cannot see coming is not a decision, it is a die roll.
 */
function productionCard(part, casting, onSelect) {
  const preview = previewFor(part, casting);
  const tags = [];

  for (const audience of AUDIENCES) {
    const value = part.appeal?.[audience] ?? 0;
    if (value !== 0) {
      // Glyph as well as colour, matching the readout — the tag must still say
      // which audience it means when the colour cannot be told apart.
      const { glyph, name } = AUDIENCE_LABELS[audience];
      tags.push({ kind: audience, text: `${glyph} ${name} ${value > 0 ? '+' : ''}${value}` });
    }
  }
  if (part.volatility !== 0) {
    tags.push({
      kind: part.volatility > 0 ? 'risk' : 'quiet',
      text: part.volatility > 0 ? `riskier by ${part.volatility}` : `calmer by ${-part.volatility}`,
    });
  }

  const node = card(part.name, {
    cost: part.cost === 0 ? 'free' : `${part.cost}g`,
    note: part.note,
    tags,
    onSelect,
  });

  // Named, not summarised: "hides Kaufmann's Niece has never done this before"
  // is the sentence that makes the choice legible.
  for (const seed of preview.covers) {
    const line = document.createElement('p');
    line.className = 'cover cover--hides';
    line.textContent = `Hides: ${seed.text}`;
    node.appendChild(line);
  }
  for (const seed of preview.exposes) {
    const line = document.createElement('p');
    line.className = 'cover cover--shows';
    line.textContent = `Puts on show: ${seed.text}`;
    node.appendChild(line);
  }

  return node;
}

/** What the audience will actually be looking at. */
function paintStaging(casting) {
  el.prompt.textContent = 'What are they looking at?';
  for (const staging of STAGINGS) {
    el.cards.appendChild(productionCard(staging, casting, () => chooseStaging(staging)));
  }
}

/** How ready the thing is. Rehearsal works on people; scenery does not. */
function paintPreparation(casting) {
  el.prompt.textContent = 'How ready are they?';
  for (const preparation of PREPARATIONS) {
    el.cards.appendChild(productionCard(preparation, casting, () => choosePreparation(preparation)));
  }
}

function paintReady(bill, casting, production) {
  const outlay = bill.cost + casting.salary + production.cost;
  const shortfall = Math.max(0, outlay - funds());

  el.prompt.textContent = gradeProduction(state.production, production.exposed.length);

  if (shortfall > 0) {
    el.cards.appendChild(card('You cannot pay for all this', {
      note: `${outlay}g promised and ${funds()}g in hand. Give somebody up, or stage it more cheaply.`,
      className: 'card--quiet',
      onSelect: () => {},
    }));

    // Money could only be borrowed against the *bill*, but the bill is the
    // small half of the outlay — the shortfall that actually strands a player
    // appears once the cast is hired, three screens later, and there was no way
    // back to a backer from here. An impresario short at the last minute goes
    // looking for money; that is most of the job.
    if (!state.backer) {
      const willing = backersLeft().filter((backer) => backer.offers >= shortfall);
      for (const backer of willing) {
        el.cards.appendChild(card(backer.name, {
          cost: `${backer.offers}g`,
          note: `${backer.string} It would cover the ${shortfall}g.`,
          className: 'card--backer',
          onSelect: () => { takeBacker(backer); render(); },
        }));
      }
      if (!willing.length) {
        el.cards.appendChild(card('Nobody will advance it', {
          note: 'Not at this hour and not at that price. Something has to go.',
          className: 'card--quiet',
          onSelect: () => {},
        }));
      }
    }
  } else {
    el.cards.appendChild(card('Open the house', {
      note: `${outlay}g in all — ${bill.cost}g on the bill, ${casting.salary}g in salaries, ${production.cost}g on the production.`,
      className: 'card--mount',
      onSelect: open_,
    }));
  }

  appendProductionSeeds(production);
  el.cards.appendChild(card('Stage it differently', {
    className: 'card--quiet',
    onSelect: () => { state.production = { staging: null, preparation: null }; state.step = 'staging'; render(); },
  }));

  el.cards.appendChild(card('Start the bill again', {
    className: 'card--quiet',
    onSelect: reset,
  }));
}

/** The last two phases do not exist yet, so the run stops here honestly. */
/** The night, settled. No decision in it — this is the epilogue. */
function paintOpen(bill, casting, production) {
  const result = state.result;
  if (!result) return;

  el.prompt.textContent = 'The notices';

  // What the house does. It follows the *audience* rather than the accounts,
  // because the audience is who is actually in the room making a noise — and a
  // vulgar hit that pays while shaming you should still sound like a hit.
  const reception = receptionFor({
    profit: result.profit,
    mishaps: result.mishaps,
    lit: state.performance?.lit ?? 1,
  });
  if (reception === 'applause') sfx.applause(warmthFor(result.received));
  else if (sfx[reception]) sfx[reception]();

  // Careful play can drive volatility below zero, and "0 of the -2 things that
  // could go wrong did" is nonsense. Below one, there was simply nothing to fear.
  const atRisk = Math.max(0, result.couldHaveGoneWrong);
  const performance = state.performance;
  const wentWrong = performance
    ? `${gradeNight(performance, performance.lit)}.`
    : atRisk === 0
      ? 'There was never anything to go wrong.'
      : result.mishaps === 0
        ? `Nothing went wrong, of the ${atRisk} that might have.`
        : result.mishaps === 1
          ? `One of the ${atRisk} things that could go wrong did.`
          : `${result.mishaps} of the ${atRisk} things that could go wrong did.`;

  el.cards.appendChild(card(
    result.profit >= 0 ? `You are ${result.profit}g up` : `You are ${-result.profit}g down`,
    {
      cost: `${result.takings}g taken`,
      note: `${wentWrong} ${result.outlay}g went out, ${result.takings}g came back.`,
      className: result.profit >= 0 ? 'card--mount' : 'card--quiet',
      tags: [{
        kind: result.standing >= 0 ? 'quiet' : 'risk',
        text: result.standing === 0 ? 'your standing is unchanged'
          : result.standing > 0 ? `your standing rises to ${gradeStanding(state.reputation)}`
          : `your standing falls to ${gradeStanding(state.reputation)}`,
      }],
      onSelect: () => {},
    },
  ));

  // What actually got past, named. The abstract count is in the card above;
  // this is the part a player will remember and retell.
  if (state.performance?.failures?.length) {
    const missed = document.createElement('ul');
    missed.className = 'seeds';
    for (const failure of state.performance.failures) {
      const item = document.createElement('li');
      item.className = 'seed seed--exposed';
      item.textContent = failure;
      missed.appendChild(item);
    }
    el.cards.appendChild(missed);
  }

  const list = document.createElement('ul');
  list.className = 'notices';
  for (const notice of result.notices) {
    const item = document.createElement('li');
    item.className = `notice notice--${notice.audience}`;
    item.textContent = notice.text;
    list.appendChild(item);
  }
  el.cards.appendChild(list);

  appendProductionSeeds(production);

  if (state.backer) {
    el.cards.appendChild(card(`${state.backer.name} has your note of hand`, {
      note: state.backer.string,
      className: 'card--quiet',
      onSelect: () => {},
    }));
  }

  // A season has to be able to end. Without this a broke impresario taps
  // through bills they can never afford for ever, which is not a loss — it is
  // a hang, and it is what being "stuck" actually looked like.
  if (isRuined(state.capital + deepestPocket(), RUIN_FLOOR)) {
    ruin();
    appendRuin();
    return;
  }

  el.cards.appendChild(card('Mount another', {
    className: 'card--mount',
    onSelect: reset,
  }));
}

/**
 * Who you are. The first choice of all, and the only one that cannot be undone.
 *
 * A difficulty selector that does not announce itself as one — each is a
 * different purse and a different problem, and the problem is the interesting
 * half. The heir has money and no standing; the actor-manager has standing and
 * no money; the absconder has neither and one friend left in London.
 */
function paintImpresarios() {
  el.prompt.textContent = 'Who are you?';
  for (const person of IMPRESARIOS) {
    const tags = [
      { kind: 'quiet', text: `${person.capital}g` },
      {
        kind: person.reputation >= 0 ? 'society' : 'risk',
        text: `known as ${gradeStanding(person.reputation)}`,
      },
    ];
    if (person.backers) {
      tags.push({ kind: 'risk', text: 'one backer left in town' });
    }
    el.cards.appendChild(card(person.name, {
      cost: person.epithet,
      note: person.blurb,
      tags,
      onSelect: () => { sfx.tap(); chooseImpresario(person); },
    }));
  }
}

function chooseImpresario(person) {
  state.impresario = person;
  state.capital = person.capital;
  state.reputation = person.reputation;
  state.spentBackers = [];
  state.week = 1;
  state.step = 'work';
  render();
}

/**
 * Fix how the season ended, once, at the moment it ends.
 *
 * Drawn here rather than while painting because the general pool is random: a
 * fate chosen during render would reshuffle itself on every repaint, and the
 * player would watch their own obituary change its mind.
 */
function ruin() {
  if (state.step !== 'ruined') {
    state.fate = fateFor({
      impresario: state.impresario?.id ?? null,
      weeks: state.week,
      standing: state.reputation,
      capital: state.capital,
      backersSpent: state.spentBackers,
    });
    state.step = 'ruined';
    // Played from here rather than from the painting, for the same reason the
    // fate is drawn here: a repaint must not sound the trombone again.
    stopTalking();
    sfx.trombone();
  }
}

/**
 * The end of a season.
 *
 * The cheapest possible evening is RUIN_FLOOR guineas, and everybody who would
 * have advanced the difference has already done it once. Below that, nothing on
 * the shelf can be opened by any combination of choices.
 */
function appendRuin() {
  const fate = state.fate ?? { headline: 'You are ruined', text: '' };

  el.cards.appendChild(card(fate.headline, {
    note: fate.text,
    className: 'card--quiet',
    onSelect: () => {},
  }));

  el.cards.appendChild(card('The books', {
    cost: `${state.capital}g left`,
    note: `The cheapest evening in London runs to ${RUIN_FLOOR}g. You lasted ${state.week} week${state.week === 1 ? '' : 's'} as ${state.impresario?.name ?? 'an impresario'}, and finished ${gradeStanding(state.reputation)}.`,
    className: 'card--quiet',
    onSelect: () => {},
  }));

  el.cards.appendChild(card('Begin again', {
    className: 'card--mount',
    onSelect: beginSeason,
  }));
}

/** Reached when a week begins that cannot possibly be finished. */
function paintRuined() {
  el.prompt.textContent = 'The end of it';
  appendRuin();
}

/** A fresh season, and a fresh chance to be somebody else entirely. */
function beginSeason() {
  state.impresario = null;
  state.fate = null;
  state.capital = STARTING_CAPITAL;
  state.reputation = 0;
  state.week = 1;
  state.backer = null;
  state.spentBackers = [];
  state.choice = { work: null, treatment: null, hook: null };
  state.assigned = {};
  state.production = { staging: null, preparation: null };
  state.result = null;
  state.night = null;
  state.performance = null;
  state.step = 'impresario';
  render();
}

// ------------------------------------------------------------------ state

function currentBill() {
  return deriveBill(state.choice);
}

function currentCasting() {
  return appraiseCasting(currentBill(), state.assigned, { imposed: state.backer?.id ?? null });
}

function currentProduction(casting) {
  return applyProduction(casting ?? currentCasting(), state.production);
}

/** The first role still empty — the one the player is being asked to fill. */
function activeSlot(casting) {
  return casting.slots.find((s) => !s.performer) ?? null;
}

function choose(axis, value, nextStep) {
  state.choice[axis] = value;
  state.step = nextStep;
  render();
}

function mount() {
  state.step = 'casting';
  render();
}

function assign(index, performerId) {
  state.assigned[index] = performerId;
  render();
}

function release(index) {
  delete state.assigned[index];
  // Taking a part back reopens everything downstream of it: a production was
  // chosen to cover this particular cast, and it is no longer that cast.
  if (state.step !== 'open') {
    state.step = 'casting';
    state.production = { staging: null, preparation: null };
  }
  render();
}

function chooseStaging(staging) {
  state.production.staging = staging;
  state.step = 'preparation';
  render();
}

function choosePreparation(preparation) {
  state.production.preparation = preparation;
  state.step = 'ready';
  render();
}

/** The house opens, and the whole promise finally leaves the account. */
function open_() {
  const bill = currentBill();
  const casting = currentCasting();
  const production = currentProduction(casting);

  const outlay = bill.cost + casting.salary + production.cost;
  // The button that calls this is only offered when the money is there, but the
  // debug seam can reach it directly and an impresario who opens on credit would
  // end the night with a capital nobody can explain.
  if (outlay > funds()) return;
  const appeal = {};
  for (const audience of AUDIENCES) {
    appeal[audience] = bill.appeal[audience] + casting.appeal[audience] + production.appeal[audience];
  }
  const volatility = bill.volatility + casting.volatility + production.volatility;

  // The curtain goes up before anything is settled. Opening night hands back a
  // count of what actually went wrong, and only then does the money move — the
  // settlement has not changed at all, the thumb has simply replaced the dice.
  const night = buildNight(casting, production, volatility);
  state.night = night;

  playNight(night, (result) => {
    state.performance = result;
    state.result = settleShow({ appeal, volatility, outlay }, { mishaps: result.mishaps });
    state.capital = funds() - outlay + state.result.takings;
    state.reputation += state.result.standing;
    state.step = 'open';
    render();
  });
}

/** Put the stage up, run the evening, and take it down again. */
function playNight(night, done) {
  el.night.hidden = false;
  el.nightCue.textContent = '';
  el.nightCue.className = 'night__cue';
  el.nightHint.hidden = false;

  state.running = runNight(el.nightStage, night, {
    onCue(text, requirement) {
      // The hint is only for the first touch; once the evening is under way the
      // screen belongs to the performance.
      el.nightHint.hidden = true;
      el.nightCue.textContent = text ?? '';
      el.nightCue.className = text
        ? `night__cue night__cue--on night__cue--${requirement}`
        : 'night__cue';

      // The cue light rings, and then the stage manager says what is wrong. The
      // line is already on the screen — this is the same information arriving
      // by a second route, for a player whose eyes are on the performer.
      if (text) {
        sfx.cue();
        call(text);
      } else {
        stopTalking();
      }
    },
    onFinish(result) {
      stopTalking();
      el.night.hidden = true;
      state.running = null;
      done(result);
    },
  });
}

function reset() {
  state.choice = { work: null, treatment: null, hook: null };
  state.backer = null;
  state.assigned = {};
  state.production = { staging: null, preparation: null };
  state.result = null;
  state.night = null;
  state.performance = null;
  state.step = 'work';
  state.week++;
  render();
}

function render() {
  // Checked before a week starts, not only after a night. Ruin discovered at
  // the notices is a verdict; ruin discovered three screens into a bill you
  // cannot pay for is a dead end the player walked into on our invitation.
  if (state.step === 'work' && isRuined(state.capital + deepestPocket(), RUIN_FLOOR)) {
    ruin();
  }

  // Before a season exists and after one has ended, an empty poster and three
  // indifferent meters are furniture rather than information. The board belongs
  // to a production, so it appears when there is one.
  const framing = state.step === 'impresario' || state.step === 'ruined';
  el.poster.hidden = framing;
  el.readout.hidden = framing;

  const bill = currentBill();
  const casting = currentCasting();
  const production = currentProduction(casting);
  paintStanding();
  paintBill(bill, casting, production);
  paintSlots(casting);
  paintChoice(bill, casting, production);
}

/**
 * The house opens on a closed curtain.
 *
 * The game was rendered and immediately playable, which meant a stranger's
 * first sight of it was a budget and a list of plays with no notion of what any
 * of it was for. The velvet parts on one button, and the board is already
 * behind it — nothing loads, nothing waits.
 */
/** Both controls say the same thing and set the same preference. */
function paintSound() {
  const on = isEnabled();
  el.sound.setAttribute('aria-pressed', String(on));
  el.soundLabel.textContent = `Sound and the stage manager: ${on ? 'on' : 'off'}`;
  el.mute.setAttribute('aria-pressed', String(on));
  el.muteLabel.textContent = on ? 'on' : 'off';
}

function toggleSound() {
  setEnabled(!isEnabled());
  paintSound();
  // A confirmation you can hear is the only honest way to test a sound control.
  if (isEnabled()) sfx.cue();
}

el.sound.addEventListener('click', toggleSound);
el.mute.addEventListener('click', toggleSound);
paintSound();

function raiseTheCurtain() {
  // The button press is the gesture browsers demand before any audio at all,
  // so the context is built here and nowhere else.
  wake();
  sfx.curtain();
  el.curtain.classList.add('curtain--open');
  el.begin.disabled = true;
  // Taken out of the layout once it has finished parting, so nothing invisible
  // is left lying over the board catching taps.
  const done = () => { el.curtain.hidden = true; };
  el.curtain.addEventListener('transitionend', done, { once: true });
  // A transition that never fires — a backgrounded tab, reduced motion on some
  // browsers — must not leave the curtain permanently across the screen.
  setTimeout(done, 1800);
}

el.begin.addEventListener('click', raiseTheCurtain);

render();


// A window onto the running state, for the console and for tests later.
// Nothing in the game may depend on it.
window.__debug = {
  get state() { return structuredClone({ ...state, choice: { ...state.choice } }); },
  get bill() { return currentBill(); },
  get casting() { return currentCasting(); },
  get production() { return currentProduction(); },
  get result() { return state.result; },
  get standing() { return state.reputation; },
  get capital() { return state.capital; },
  get floor() { return RUIN_FLOOR; },
  get fate() { return state.fate; },
  get impresario() { return state.impresario?.id ?? null; },
  become(id) { const p = IMPRESARIOS.find((i) => i.id === id); if (p) chooseImpresario(p); return p?.id ?? null; },
  get backersLeft() { return backersLeft().map((b) => b.id); },
  // Test seam only: drops the purse to a chosen figure so the end of a season
  // can be reached without playing six losing weeks to get there.
  setCapital(guineas) { state.capital = guineas; render(); },
  // Test seam only: uses up the town's goodwill, so the end of a season can be
  // reached without losing three separate productions to get there.
  spendBackers() { state.spentBackers = BACKERS.map((b) => b.id); render(); },
  open() { open_(); },
  get night() { return state.night; },
  get performance() { return state.performance; },
  stage(id) { chooseStaging(STAGINGS.find((s) => s.id === id)); },
  prepare(id) { choosePreparation(PREPARATIONS.find((p) => p.id === id)); },
  cast(index, performerId) { assign(index, performerId); },
  pick(axis, id) {
    const table = { work: WORKS, treatment: TREATMENTS, hook: HOOKS }[axis];
    const found = table?.find((entry) => entry.id === id);
    if (!found) return null;
    const next = { work: 'treatment', treatment: 'hook', hook: 'mount' }[axis];
    choose(axis, found, next);
    return found.id;
  },
};
