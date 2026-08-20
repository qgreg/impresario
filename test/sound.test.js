/**
 * Unit tests for the house sound.
 *
 * Playing a note needs a browser, so what is tested is the *choosing*: which
 * reception a night earns and how warm the applause is. Those are the decisions;
 * the oscillators are just how they are expressed.
 *
 * The module itself reaches for `window`, so this stubs enough of one to import
 * it under bare Node — the same bargain as everywhere else in this project.
 */
globalThis.window = {
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
};

const { receptionFor, warmthFor, isEnabled, setEnabled } = await import('../src/sound.js');

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

// --- what the house does ------------------------------------------------------

check('a faultless night in profit gets the fanfare',
  receptionFor({ profit: 40, mishaps: 0, lit: 0.9 }) === 'fanfare');
check('a profitable night with a wobble in it gets applause',
  receptionFor({ profit: 40, mishaps: 3, lit: 0.9 }) === 'applause');
check('a loss that was at least well run gets scattered clapping',
  receptionFor({ profit: -20, mishaps: 2, lit: 0.8 }) === 'scattered');
check('and a loss badly run gets the trombone',
  receptionFor({ profit: -60, mishaps: 6, lit: 0.2 }) === 'trombone');

// The sound follows the audience rather than the accounts, because the audience
// is who is actually in the room making a noise.
check('breaking exactly even is not treated as a triumph',
  receptionFor({ profit: 0, mishaps: 0, lit: 0.9 }) !== 'fanfare');
check('there is always something for the house to do',
  [{ profit: 0, mishaps: 0, lit: 0 }, { profit: -1, mishaps: 99, lit: 1 }, { profit: 999, mishaps: 0, lit: 1 }]
    .every((night) => typeof receptionFor(night) === 'string'));

// --- how warm ------------------------------------------------------------------

check('a full house claps harder than an empty one',
  warmthFor({ crowd: 20, society: 18 }) > warmthFor({ crowd: 2, society: 1 }));
check('warmth never leaves nought to one',
  [[-40, -40], [0, 0], [12, 9], [200, 200]]
    .every(([crowd, society]) => {
      const w = warmthFor({ crowd, society });
      return w >= 0 && w <= 1;
    }));
check('an audience that hated it does not applaud in the negative',
  warmthFor({ crowd: -20, society: -20 }) === 0);

// --- the preference --------------------------------------------------------------

check('sound is on unless somebody has turned it off', isEnabled() === true);
check('and the preference can be set both ways',
  setEnabled(false) === false && isEnabled() === false &&
  setEnabled(true) === true && isEnabled() === true);

// A locked-down browser throws on localStorage access rather than returning
// null, and a silent game is a worse failure than a loud one.
check('a browser that refuses storage still gets sound',
  (() => {
    globalThis.window.localStorage = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    };
    return setEnabled(true) === true && isEnabled() === true;
  })());

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall sound checks passed');
process.exit(failures.length ? 1 : 0);
