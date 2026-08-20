/**
 * Unit tests for the follow spot.
 *
 * The spotlight is the one phase that cannot be driven headlessly — no test can
 * squeeze a thumb across a phone. So everything the thumb does *not* decide is
 * proven here: the lamp's motion, the performer's business, and above all the
 * grade, which is a pure function from a recorded path to a verdict.
 *
 * Same hand-rolled shape as the bill tests. No framework.
 */
import {
  stepLamp, LAMP, performerAt, sceneDuration, SCENE, BUSINESS,
  gradeFollow, gradeFor, isLit, noteOn, JERK_BUDGET,
} from '../src/follow.js';

const failures = [];
function check(label, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

const at = (x, y) => ({ x, y, vx: 0, vy: 0 });

// --- the lamp has mass -------------------------------------------------------

{
  // One step must not teleport the lamp onto the thumb: the whole feel of the
  // instrument depends on it arriving late.
  const moved = stepLamp(at(0.5, 0.5), 0.9, 0.5, 1 / 60);
  check('the lamp lags the thumb rather than snapping to it',
    moved.x > 0.5 && moved.x < 0.58, `x=${moved.x.toFixed(4)}`);
  check('and starts moving in the right direction', moved.vx > 0);
  check('an axis with no demand on it stays put', Math.abs(moved.y - 0.5) < 1e-9);
}

{
  // Held long enough, it must settle *on* the mark and stop — a lamp that hunts
  // around the target forever would make grace unachievable by construction.
  let lamp = at(0.2, 0.5);
  for (let i = 0; i < 400; i++) lamp = stepLamp(lamp, 0.8, 0.3, 1 / 60);
  check('the lamp settles exactly where it was sent',
    Math.hypot(lamp.x - 0.8, lamp.y - 0.3) < 0.001, `off by ${Math.hypot(lamp.x - 0.8, lamp.y - 0.3).toFixed(5)}`);
  check('and comes to rest', Math.hypot(lamp.vx, lamp.vy) < 0.01);
}

{
  // Overshoot is the point: a snatched correction must be visible on screen.
  let lamp = at(0.5, 0.5);
  let maximum = 0.5;
  for (let i = 0; i < 90; i++) {
    lamp = stepLamp(lamp, 0.9, 0.5, 1 / 60);
    maximum = Math.max(maximum, lamp.x);
  }
  check('a hard move overshoots, so clumsiness is seen rather than merely scored',
    maximum > 0.9, `peak ${maximum.toFixed(4)}`);
}

{
  // A backgrounded tab hands back an enormous dt. The spring must not explode.
  const lurched = stepLamp(at(0.5, 0.5), 0.9, 0.5, 12.0);
  check('a huge frame gap cannot fling the lamp off the stage',
    Number.isFinite(lurched.x) && lurched.x > 0 && lurched.x < 1.2, `x=${lurched.x}`);
}

check('stepping the lamp never mutates what it was given',
  (() => { const before = at(0.4, 0.4); stepLamp(before, 1, 1, 1 / 60); return before.x === 0.4 && before.vx === 0; })());

// --- the performer -----------------------------------------------------------

check('the scene is a sensible length for one sitting',
  sceneDuration() > 20 && sceneDuration() < 40, `${sceneDuration()}s`);
check('every beat names business the renderer knows how to read',
  SCENE.every((beat) => BUSINESS[beat.business]));
check('every beat stays on the stage',
  SCENE.every((b) => b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1));

{
  const opening = performerAt(0);
  check('she starts at her opening mark', Math.abs(opening.x - 0.5) < 0.01 && !opening.done);
  const after = performerAt(sceneDuration() + 5);
  check('and the scene ends rather than looping', after.done && after.tell === 'curtain');
}

{
  // Sampling the whole scene finely: she must never leave the stage, and must
  // never jump — a discontinuity would read as a rendering fault, not acting.
  let offstage = 0;
  let biggestJump = 0;
  let previous = performerAt(0);
  for (let t = 0; t <= sceneDuration(); t += 1 / 120) {
    const now = performerAt(t);
    if (now.x < 0 || now.x > 1 || now.y < 0 || now.y > 1) offstage++;
    biggestJump = Math.max(biggestJump, Math.hypot(now.x - previous.x, now.y - previous.y));
    previous = now;
  }
  check('she never walks off the stage', offstage === 0, `${offstage} samples off`);
  check('and never teleports between frames', biggestJump < 0.02, `largest step ${biggestJump.toFixed(4)}`);
}

check('a bolt moves further per second than a drift does',
  (() => {
    const speedOf = (business) => {
      const beat = SCENE.find((b) => b.business === business);
      const index = SCENE.indexOf(beat);
      const from = index === 0 ? { x: 0.5, y: 0.62 } : SCENE[index - 1];
      return Math.hypot(beat.x - from.x, beat.y - from.y) / beat.seconds;
    };
    return speedOf('bolt') > speedOf('drift');
  })());

// --- being lit ---------------------------------------------------------------

check('the performer is lit when the beam is on her',
  isLit({ x: 0.5, y: 0.5 }, { x: 0.52, y: 0.5 }));
check('and dark when it is not',
  !isLit({ x: 0.5, y: 0.5 }, { x: 0.7, y: 0.5 }));
check('the edge of the core counts as lit',
  isLit({ x: 0.5, y: 0.5 }, { x: 0.5 + LAMP.radius - 1e-9, y: 0.5 }));

// --- the grade ---------------------------------------------------------------

/** Build a recorded path: the lamp follows `path(t)`, she follows `her(t)`. */
function record(seconds, path, her, step = 1 / 60) {
  const samples = [];
  for (let t = 0; t <= seconds; t += step) {
    samples.push({ t, lamp: path(t), performer: her(t) });
  }
  return samples;
}

{
  const still = (t) => ({ x: 0.5, y: 0.5 });
  const perfect = gradeFollow(record(5, still, still));
  check('a lamp resting on a still performer is immaculate',
    perfect.lit === 1 && perfect.grace === 1 && perfect.grade === 'immaculate');
}

{
  // A lamp that never moves is perfectly graceful even when it is useless. That
  // is deliberate, and the note has to say the awkward thing out loud.
  const parked = gradeFollow(record(5, () => ({ x: 0.1, y: 0.1 }), () => ({ x: 0.9, y: 0.9 })));
  check('a beautiful beam pointed at nobody scores badly overall',
    parked.grace === 1 && parked.lit === 0 && parked.score < 0.45);
  check('and the note names it rather than praising the beam',
    noteOn(parked).includes('scenery'));
}

{
  // A smooth glide across the stage, exactly tracking her.
  const glide = (t) => ({ x: 0.2 + 0.06 * t, y: 0.5 });
  const smooth = gradeFollow(record(6, glide, glide));
  check('a smooth sweep that stays with her is graceful',
    smooth.lit === 1 && smooth.grace > 0.95, `grace ${smooth.grace.toFixed(3)}`);
}

{
  // The same accuracy, achieved by twitching. Accuracy identical, grade worse:
  // this is the whole reason grace is scored at all.
  const her = (t) => ({ x: 0.5, y: 0.5 });
  const jitter = (t) => ({ x: 0.5 + 0.02 * Math.sin(t * 90), y: 0.5 + 0.02 * Math.cos(t * 90) });
  const twitchy = gradeFollow(record(6, jitter, her));
  const calm = gradeFollow(record(6, her, her));
  check('a jittery lamp is on target just as often', twitchy.lit === calm.lit && twitchy.lit === 1);
  check('but grades lower, because the stalls can see the lamp working',
    twitchy.grace < calm.grace && twitchy.score < calm.score,
    `grace ${twitchy.grace.toFixed(3)} vs ${calm.grace.toFixed(3)}`);
  check('and its note mentions the visible effort', noteOn(twitchy).includes('visibly'));
}

check('accuracy outweighs grace, so a dark stage can never grade well',
  gradeFollow(record(5, () => ({ x: 0, y: 0 }), () => ({ x: 1, y: 1 }))).score <= 0.3);

check('too short a recording is not graded as a triumph',
  gradeFollow([]).score === 0 && gradeFollow([]).grade === 'no performance');
check('duplicate timestamps do not produce a NaN grade',
  (() => {
    const g = gradeFollow([
      { t: 0, lamp: { x: 0.5, y: 0.5 }, performer: { x: 0.5, y: 0.5 } },
      { t: 0, lamp: { x: 0.5, y: 0.5 }, performer: { x: 0.5, y: 0.5 } },
      { t: 0, lamp: { x: 0.5, y: 0.5 }, performer: { x: 0.5, y: 0.5 } },
      { t: 1, lamp: { x: 0.5, y: 0.5 }, performer: { x: 0.5, y: 0.5 } },
    ]);
    return Number.isFinite(g.score) && Number.isFinite(g.grace);
  })());

check('every grade band returns a phrase',
  [0, 0.3, 0.5, 0.7, 0.85, 0.95, 1].every((s) => typeof gradeFor(s) === 'string'));
check('there is always a note to read out',
  [{ lit: 1, grace: 1 }, { lit: 0, grace: 0 }, { lit: 0.5, grace: 0.5 }, { lit: 0.75, grace: 0.2 }]
    .every((r) => typeof noteOn(r) === 'string' && noteOn(r).length > 0));

// --- the tuning is reachable by a human --------------------------------------
// A lamp driven by a plausible thumb — following her with a little lag and a
// little wobble — must be able to land in the middle of the scale. If the only
// achievable grade were 'they noticed', the scoring would be decoration.
{
  let lamp = { x: 0.5, y: 0.62, vx: 0, vy: 0 };
  const samples = [];
  const dt = 1 / 60;
  for (let t = 0; t <= sceneDuration(); t += dt) {
    const her = performerAt(t);
    // A human aims roughly at her, a beat late, with a slight tremor.
    const late = performerAt(Math.max(0, t - 0.12));
    lamp = stepLamp(lamp, late.x + Math.sin(t * 7) * 0.006, late.y + Math.cos(t * 5) * 0.004, dt);
    samples.push({ t, lamp: { x: lamp.x, y: lamp.y }, performer: { x: her.x, y: her.y } });
  }
  const human = gradeFollow(samples);
  check('a plausible human performance lands mid-scale, not at the floor',
    human.score > 0.5 && human.score < 0.98,
    `lit ${human.lit.toFixed(2)} grace ${human.grace.toFixed(2)} score ${human.score.toFixed(2)} — ${human.grade}`);
  check('and the bolts cost them something, so the scene has teeth',
    human.lit < 1, `lit ${human.lit.toFixed(3)}`);
}

// --- the scale has to discriminate -------------------------------------------
// The first calibration of grace was out by an order of magnitude and every
// operator scored 0.99, which made the term decoration. This is the property
// that catches that class of mistake: operators of visibly different quality
// must not all come out the same.
{
  /** An operator with a given tremor, reaction lag, and habit of snatching. */
  function operate({ tremor, lag, snatch }) {
    let lamp = { x: 0.5, y: 0.62, vx: 0, vy: 0 };
    const samples = [];
    const dt = 1 / 60;
    for (let t = 0; t <= sceneDuration(); t += dt) {
      const her = performerAt(t);
      const late = performerAt(Math.max(0, t - lag));
      const jab = snatch && Math.floor(t * 2) !== Math.floor((t - dt) * 2) ? snatch : 0;
      lamp = stepLamp(lamp, late.x + Math.sin(t * 7) * tremor + jab, late.y + Math.cos(t * 5) * tremor, dt);
      samples.push({ t, lamp: { x: lamp.x, y: lamp.y }, performer: { x: her.x, y: her.y } });
    }
    return gradeFollow(samples);
  }

  const assured = operate({ tremor: 0.004, lag: 0.12, snatch: 0 });
  const ordinary = operate({ tremor: 0.012, lag: 0.16, snatch: 0 });
  const jabber = operate({ tremor: 0.012, lag: 0.16, snatch: 0.05 });
  const panicking = operate({ tremor: 0.045, lag: 0.26, snatch: 0.09 });

  check('grace falls as the thumb gets worse',
    assured.grace > ordinary.grace && ordinary.grace > panicking.grace,
    `${assured.grace.toFixed(2)} > ${ordinary.grace.toFixed(2)} > ${panicking.grace.toFixed(2)}`);
  check('snatching at her costs grace even at the same accuracy',
    jabber.grace < ordinary.grace,
    `jabber ${jabber.grace.toFixed(2)} vs ordinary ${ordinary.grace.toFixed(2)}`);
  check('the four operators do not all receive the same verdict',
    new Set([assured.grade, ordinary.grade, jabber.grade, panicking.grade]).size >= 3,
    [assured, ordinary, jabber, panicking].map((r) => `${r.grade} ${r.score.toFixed(2)}`).join(' | '));
  check('and a panicking operator is nowhere near the top of the scale',
    panicking.score < 0.8, `${panicking.score.toFixed(2)}`);
}

console.log(failures.length ? `\n${failures.length} failing check(s)` : '\nall follow checks passed');
process.exit(failures.length ? 1 : 0);
