/**
 * The follow spot: physics, scoring, and the performer's own movement.
 *
 * This is a shooter with the intent inverted. You aim, but you must *sustain*
 * rather than hit, and the target is your own star — losing her leaves a circle
 * of light on an empty patch of boards while she acts in the dark.
 *
 * Everything here is pure, which matters more than usual. The spotlight is the
 * one phase that cannot be driven headlessly, so the parts that decide anything
 * — where the lamp goes, where the performer goes, what grade the operator
 * earns — are functions over plain numbers, and only the thumb is untestable.
 *
 * All positions are normalised to the stage: x and y in 0..1, so the maths does
 * not change when the canvas does.
 */

// ------------------------------------------------------------------ the lamp

/**
 * A real follow spot has mass. The operator does not place the beam, they push
 * a heavy instrument toward where they want it and it arrives shortly after.
 *
 * That is the whole reason the lamp is a damped spring rather than the thumb's
 * position: with a rigid lamp, smoothness would be a property of the player's
 * hand and invisible on screen. With mass, a snatched correction overshoots
 * where everyone can see it, and learning to lead the performer gently is a
 * skill the screen actually teaches.
 */
export const LAMP = {
  stiffness: 78,   // how hard it is pulled toward the thumb
  damping: 13,     // enough to settle without oscillating on a normal move
  radius: 0.085,   // the bright core, as a fraction of stage width
};

/** One step of the lamp's motion. Returns a new state; never mutates. */
export function stepLamp(lamp, targetX, targetY, dt, tuning = LAMP) {
  // Long frames (a backgrounded tab, a slow phone) would otherwise let the
  // spring explode, so the step is capped rather than trusted.
  const step = Math.min(dt, 1 / 30);
  const ax = (targetX - lamp.x) * tuning.stiffness - lamp.vx * tuning.damping;
  const ay = (targetY - lamp.y) * tuning.stiffness - lamp.vy * tuning.damping;
  const vx = lamp.vx + ax * step;
  const vy = lamp.vy + ay * step;
  return {
    x: lamp.x + vx * step,
    y: lamp.y + vy * step,
    vx,
    vy,
  };
}

// ------------------------------------------------------------- the performer

/**
 * The performer's business, as a sequence of beats.
 *
 * Difficulty comes from her, not from your fingers. She is not a target that
 * moves to be hard to hit — she is an actor doing things actors do, and every
 * beat is named for what it is. A `bolt` is a missed mark, not a spike in the
 * difficulty curve, and it should read that way on screen.
 */
export const BUSINESS = {
  hold: { ease: 'none', tell: 'holding' },
  cross: { ease: 'inOut', tell: 'crossing' },
  drift: { ease: 'linear', tell: 'drifting' },
  bolt: { ease: 'out', tell: 'missed her mark' },
  turn: { ease: 'inOut', tell: 'turning' },
};

/** A short scene. Marks are stage positions; seconds are how long to take. */
export const SCENE = [
  { business: 'hold', seconds: 2.0, x: 0.5, y: 0.62 },
  { business: 'cross', seconds: 3.0, x: 0.24, y: 0.60 },
  { business: 'hold', seconds: 1.6, x: 0.24, y: 0.60 },
  { business: 'drift', seconds: 3.4, x: 0.44, y: 0.68 },
  { business: 'bolt', seconds: 0.9, x: 0.80, y: 0.58 },
  { business: 'hold', seconds: 1.4, x: 0.80, y: 0.58 },
  { business: 'cross', seconds: 2.8, x: 0.38, y: 0.72 },
  { business: 'turn', seconds: 1.8, x: 0.46, y: 0.66 },
  { business: 'drift', seconds: 3.2, x: 0.66, y: 0.60 },
  { business: 'bolt', seconds: 0.8, x: 0.18, y: 0.64 },
  { business: 'hold', seconds: 2.2, x: 0.18, y: 0.64 },
  { business: 'cross', seconds: 2.6, x: 0.50, y: 0.58 },
  { business: 'hold', seconds: 2.0, x: 0.50, y: 0.58 },
];

export function sceneDuration(scene = SCENE) {
  return scene.reduce((total, beat) => total + beat.seconds, 0);
}

function ease(kind, t) {
  if (kind === 'none') return 1;               // already at the mark, stay put
  if (kind === 'linear') return t;
  if (kind === 'out') return 1 - Math.pow(1 - t, 3);
  if (kind === 'inOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

/**
 * Where the performer is at time `t`, and what she is doing. Pure in `t`, so a
 * test can sample the whole scene without a clock, and so the render loop can
 * be as irregular as the phone makes it without the performance changing.
 */
export function performerAt(t, scene = SCENE, start = { x: 0.5, y: 0.62 }) {
  let elapsed = 0;
  let from = start;

  for (const beat of scene) {
    if (t < elapsed + beat.seconds) {
      const local = beat.seconds > 0 ? (t - elapsed) / beat.seconds : 1;
      const eased = ease(BUSINESS[beat.business].ease, Math.max(0, Math.min(1, local)));
      return {
        x: from.x + (beat.x - from.x) * eased,
        y: from.y + (beat.y - from.y) * eased,
        business: beat.business,
        tell: BUSINESS[beat.business].tell,
        done: false,
      };
    }
    elapsed += beat.seconds;
    from = { x: beat.x, y: beat.y };
  }

  return { x: from.x, y: from.y, business: 'hold', tell: 'curtain', done: true };
}

// ----------------------------------------------------------------- the grade

/**
 * The jerk scale, measured rather than guessed.
 *
 * The first pass at this was a round number picked from theory, and it was out
 * by more than an order of magnitude: simulating operators from a metronome to
 * a panicking beginner produced mean jerk between 0.22 and 1.65, against a
 * budget of 26. Everybody scored 0.99 and the term was decoration.
 *
 * GLIDE_FLOOR is the jerk an ideal operator cannot avoid, because following a
 * performer who crosses and bolts requires the lamp to accelerate at all. It is
 * subtracted before scoring so that a perfect sweep grades as perfect, and the
 * operator is never charged for the scene's own demands.
 *
 * Both are calibrated against SCENE. A scene with more bolts in it raises the
 * floor, so these move if the business does.
 */
export const GLIDE_FLOOR = 0.22;
export const JERK_BUDGET = 1.6;

/** Is the performer inside the bright core of the beam? */
export function isLit(lamp, performer, radius = LAMP.radius) {
  return Math.hypot(lamp.x - performer.x, lamp.y - performer.y) <= radius;
}

/**
 * The grade, from a recorded path of samples.
 *
 * Two terms, and the second is the unusual one. Accuracy is time-on-target,
 * which every aiming game scores. **Grace is the absence of jerk**, and it is
 * scored because a follow spot that technically stays on target while twitching
 * still looks amateur from the stalls. The whole art form is about making
 * effort look effortless, so the lamp is asked to glide.
 *
 * A lamp that never moves is perfectly graceful, and that is correct — an
 * operator who does not need to move has nothing to apologise for.
 *
 * @param {Array<{t:number, lamp:{x,y}, performer:{x,y}}>} samples
 */
export function gradeFollow(samples, { radius = LAMP.radius } = {}) {
  if (!samples || samples.length < 3) {
    return { lit: 0, grace: 1, score: 0, grade: 'no performance', samples: samples?.length ?? 0 };
  }

  let litCount = 0;
  for (const sample of samples) {
    if (isLit(sample.lamp, sample.performer, radius)) litCount++;
  }
  const lit = litCount / samples.length;

  // Jerk is measured on the lamp's acceleration between consecutive frames.
  // Frame times vary on a phone, so every derivative is taken against the real
  // dt rather than assuming a fixed step.
  const velocities = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt <= 0) continue;
    velocities.push({
      dt,
      vx: (samples[i].lamp.x - samples[i - 1].lamp.x) / dt,
      vy: (samples[i].lamp.y - samples[i - 1].lamp.y) / dt,
    });
  }

  let jerkTotal = 0;
  let jerkCount = 0;
  for (let i = 1; i < velocities.length; i++) {
    const dt = velocities[i].dt;
    if (dt <= 0) continue;
    const ax = (velocities[i].vx - velocities[i - 1].vx) / dt;
    const ay = (velocities[i].vy - velocities[i - 1].vy) / dt;
    jerkTotal += Math.hypot(ax, ay);
    jerkCount++;
  }

  const jerk = jerkCount ? jerkTotal / jerkCount : 0;
  const beyondFloor = Math.max(0, jerk - GLIDE_FLOOR);
  const grace = Math.max(0, Math.min(1, 1 - beyondFloor / (JERK_BUDGET - GLIDE_FLOOR)));

  // Accuracy is weighted heavier than grace: leaving your star in the dark is a
  // worse failure than reaching her clumsily, and a scheme that rewarded a
  // beautiful beam pointed at nobody would be teaching the wrong lesson.
  const score = lit * 0.7 + grace * 0.3;

  return { lit, grace, score, grade: gradeFor(score), samples: samples.length };
}

export function gradeFor(score) {
  if (score >= 0.92) return 'immaculate';
  if (score >= 0.80) return 'assured';
  if (score >= 0.65) return 'workmanlike';
  if (score >= 0.45) return 'shaky';
  return 'they noticed';
}

/** The line the stage manager says afterwards. Never scolding; always specific. */
export function noteOn({ lit, grace }) {
  if (lit >= 0.9 && grace >= 0.8) return 'Nobody saw the lamp. That is the whole job.';
  if (lit >= 0.9) return 'You never lost her, though the beam worked visibly hard.';
  if (grace >= 0.85 && lit < 0.7) return 'Beautifully handled, and pointed at the scenery.';
  if (lit >= 0.7) return 'She was lit for most of it. The bolts caught you out.';
  if (lit >= 0.45) return 'A good deal of that scene happened in the dark.';
  return 'The front row was watching you, not her.';
}
