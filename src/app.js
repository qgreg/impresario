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

import { WORKS, TREATMENTS, HOOKS, BACKERS } from './data.js';
import {
  appraiseCasting, availableTo, fitFor, gradeCompany, impositionFor,
} from './company.js';
import {
  deriveBill, financing, gradeAppeal, gradeVolatility,
  AUDIENCES, AUDIENCE_LABELS, APPEAL_CEILING,
} from './bill.js';

const STARTING_CAPITAL = 120;

const state = {
  capital: STARTING_CAPITAL,
  week: 1,
  reputation: 0,
  choice: { work: null, treatment: null, hook: null },
  backer: null,
  assigned: {},   // roleIndex -> performerId
  step: 'work',   // work → treatment → hook → mount → casting → ready → open
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
  el.capital.textContent = `${state.capital}g`;
  el.week.textContent = `Week ${state.week}`;
  el.reputation.textContent = state.reputation === 0 ? 'unknown' : `${state.reputation > 0 ? '+' : ''}${state.reputation}`;
}

function paintBill(bill, casting) {
  const billed = bill.title.length > 0;
  el.posterTitle.textContent = billed ? bill.title : 'Nothing is billed';
  el.posterTitle.classList.toggle('poster__title--empty', !billed);

  el.posterRemark.hidden = !bill.remark;
  if (bill.remark) el.posterRemark.textContent = bill.remark;

  // Salaries join the readout the moment casting begins, because a cast is not
  // a separate budget — it is the same money, and the player is entitled to see
  // the whole promise in one number.
  const casting_ = casting || { salary: 0, appeal: { crowd: 0, society: 0, critics: 0 }, volatility: 0 };
  const outlay = bill.cost + casting_.salary;
  const shortfall = Math.max(0, outlay - funds());

  el.cost.textContent = outlay === 0 ? '—' : `${outlay}g`;
  el.cost.classList.toggle('readout__value--short', shortfall > 0);
  if (shortfall > 0) el.cost.textContent = `${outlay}g — ${shortfall} short`;

  const appeal = {};
  for (const audience of AUDIENCES) appeal[audience] = bill.appeal[audience] + casting_.appeal[audience];
  paintMeters(appeal);

  const volatility = bill.volatility + casting_.volatility;
  const things = volatility === 1 ? 'one thing will go wrong' : `${volatility} things will go wrong`;
  el.volatility.textContent = volatility === 0 && !bill.work
    ? '—'
    : `${gradeVolatility(volatility)} · ${volatility === 0 ? 'nothing will go wrong' : things}`;
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

function paintChoice(bill, casting) {
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

  if (state.step === 'mount') return paintMount();
  if (state.step === 'casting') return paintCasting(casting);
  if (state.step === 'ready') return paintReady(bill, casting);
  if (state.step === 'open') return paintOpen(bill, casting);
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
    for (const backer of money.offers) {
      el.cards.appendChild(card(backer.name, {
        cost: `${backer.offers}g`,
        note: backer.string,
        className: 'card--backer',
        onSelect: () => { state.backer = backer; mount(); },
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
    state.step = 'ready';
    return paintReady(currentBill(), casting);
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

function paintReady(bill, casting) {
  const outlay = bill.cost + casting.salary;
  const shortfall = Math.max(0, outlay - funds());

  el.prompt.textContent = gradeCompany(casting);

  if (shortfall > 0) {
    el.cards.appendChild(card('You cannot pay them', {
      note: `${outlay}g promised and ${funds()}g in hand. Give somebody up, or find a cheaper bill.`,
      className: 'card--quiet',
      onSelect: () => {},
    }));
  } else {
    el.cards.appendChild(card('Open the house', {
      note: `${outlay}g in all — ${bill.cost}g on the bill and ${casting.salary}g in salaries.`,
      className: 'card--mount',
      onSelect: open_,
    }));
  }

  appendSeeds(casting);

  el.cards.appendChild(card('Start the bill again', {
    className: 'card--quiet',
    onSelect: reset,
  }));
}

/** The last two phases do not exist yet, so the run stops here honestly. */
function paintOpen(bill, casting) {
  el.prompt.textContent = 'The house is open';
  el.cards.appendChild(card('The curtain is about to go up', {
    note: `${casting.volatility + bill.volatility} things will go wrong tonight. The production phase and opening night are not built yet — try the follow spot at /spotlight.html to see where this is going.`,
    className: 'card--quiet',
    onSelect: () => {},
  }));
  appendSeeds(casting);
  if (state.backer) {
    el.cards.appendChild(card(`${state.backer.name} has your note of hand`, {
      note: state.backer.string,
      className: 'card--quiet',
      onSelect: () => {},
    }));
  }
  el.cards.appendChild(card('Mount another', {
    className: 'card--mount',
    onSelect: reset,
  }));
}

// ------------------------------------------------------------------ state

function currentBill() {
  return deriveBill(state.choice);
}

function currentCasting() {
  return appraiseCasting(currentBill(), state.assigned, { imposed: state.backer?.id ?? null });
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
  if (state.step === 'ready') state.step = 'casting';
  render();
}

/** The house opens, and the whole promise finally leaves the account. */
function open_() {
  const bill = currentBill();
  const casting = currentCasting();
  state.capital = funds() - bill.cost - casting.salary;
  state.step = 'open';
  render();
}

function reset() {
  state.choice = { work: null, treatment: null, hook: null };
  state.backer = null;
  state.assigned = {};
  state.step = 'work';
  state.week++;
  render();
}

function render() {
  const bill = currentBill();
  const casting = currentCasting();
  paintStanding();
  paintBill(bill, casting);
  paintSlots(casting);
  paintChoice(bill, casting);
}

render();

// A window onto the running state, for the console and for tests later.
// Nothing in the game may depend on it.
window.__debug = {
  get state() { return structuredClone({ ...state, choice: { ...state.choice } }); },
  get bill() { return currentBill(); },
  get casting() { return currentCasting(); },
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
