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
  deriveBill, financing, gradeAppeal, gradeVolatility,
  AUDIENCES, AUDIENCE_LABELS,
} from './bill.js';

const STARTING_CAPITAL = 120;

const state = {
  capital: STARTING_CAPITAL,
  week: 1,
  reputation: 0,
  choice: { work: null, treatment: null, hook: null },
  backer: null,
  step: 'work',   // work → treatment → hook → mount → mounted
};

const el = {
  capital: document.getElementById('capital'),
  week: document.getElementById('week'),
  reputation: document.getElementById('reputation'),
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
    // Bars run 0–14; a negative appeal shows an empty bar and says "hostile",
    // because a bar that grows leftward reads as a bug rather than as scorn.
    const width = Math.max(0, Math.min(100, (value / 14) * 100));
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

function paintBill(bill) {
  const billed = bill.title.length > 0;
  el.posterTitle.textContent = billed ? bill.title : 'Nothing is billed';
  el.posterTitle.classList.toggle('poster__title--empty', !billed);

  el.posterRemark.hidden = !bill.remark;
  if (bill.remark) el.posterRemark.textContent = bill.remark;

  const money = financing(bill, state.capital, BACKERS);
  el.cost.textContent = bill.cost === 0 ? '—' : `${bill.cost}g`;
  el.cost.classList.toggle('readout__value--short', money.shortfall > 0);
  if (money.shortfall > 0) el.cost.textContent = `${bill.cost}g — ${money.shortfall} short`;

  paintMeters(bill.appeal);
  el.volatility.textContent = bill.volatility === 0 && !bill.work
    ? '—'
    : `${gradeVolatility(bill.volatility)} · ${bill.volatility} things will go wrong`;
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

function paintChoice() {
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
  if (state.step === 'mounted') return paintMounted();
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

/** The other three phases do not exist yet, so the run stops here honestly. */
function paintMounted() {
  const bill = currentBill();
  el.prompt.textContent = 'The bill is set';
  el.cards.appendChild(card('The company is waiting', {
    note: `${bill.roles.map((r) => r.label).join(' · ')}. Casting is not built yet — this is where phase two begins.`,
    className: 'card--quiet',
    onSelect: () => {},
  }));
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

function choose(axis, value, nextStep) {
  state.choice[axis] = value;
  state.step = nextStep;
  render();
}

function mount() {
  const bill = currentBill();
  state.capital -= bill.cost;
  if (state.backer) state.capital += state.backer.offers;
  state.step = 'mounted';
  render();
}

function reset() {
  state.choice = { work: null, treatment: null, hook: null };
  state.backer = null;
  state.step = 'work';
  state.week++;
  render();
}

function render() {
  paintStanding();
  paintBill(currentBill());
  paintChoice();
  el.cards.scrollTop = 0;
}

render();

// A window onto the running state, for the console and for tests later.
// Nothing in the game may depend on it.
window.__debug = {
  get state() { return structuredClone({ ...state, choice: { ...state.choice } }); },
  get bill() { return currentBill(); },
  pick(axis, id) {
    const table = { work: WORKS, treatment: TREATMENTS, hook: HOOKS }[axis];
    const found = table?.find((entry) => entry.id === id);
    if (!found) return null;
    const next = { work: 'treatment', treatment: 'hook', hook: 'mount' }[axis];
    choose(axis, found, next);
    return found.id;
  },
};
