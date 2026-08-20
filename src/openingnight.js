/**
 * Opening night, live.
 *
 * The only part of the game that runs on a clock and the only part a test
 * cannot drive. Everything it decides has been pushed into night.js and
 * follow.js; this file owns a canvas, a clock, a thumb, and nothing else.
 *
 * The lamp is the same instrument as the toy — a damped spring with mass, so a
 * snatched correction overshoots where the house can see it. What is new is
 * that there are several people on the boards and the crises ask for opposite
 * things: sometimes stay with them, sometimes get the light off them now.
 */

import { LAMP, stepLamp, gradeFollow } from './follow.js';
import { buildNight, performerPosition, eventMet, tallyNight, REQUIREMENTS } from './night.js';
import { paintStage, paintPerformer, paintBeam, brightnessAt } from './stagepaint.js';

/** The lamp is driven from above the finger, so the hand never hides the stage. */
const TOUCH_LIFT = 0.11;

/**
 * Run one opening night.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} night      from buildNight
 * @param {object} hooks      { onCue(text|null), onFinish(result) }
 * @returns a handle with stop(), for when the page is left mid-performance
 */
export function runNight(canvas, night, { onCue = () => {}, onFinish = () => {} } = {}) {
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const aim = { x: 0.5, y: 0.5 };
  let lamp = { x: 0.5, y: 0.5, vx: 0, vy: 0 };

  const takeAim = (event) => {
    const lift = event.pointerType === 'touch' ? TOUCH_LIFT : 0;
    aim.x = event.clientX / width;
    aim.y = event.clientY / height - lift;
  };
  const onDown = (event) => { takeAim(event); if (!started) start(); };
  const onMove = (event) => {
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    takeAim(event);
  };
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);

  // Per-crisis tally: how many frames the subject was lit while it was running.
  const watching = new Map();
  const outcomes = {};
  const samples = [];
  let currentCue = null;

  let started = false;
  let finished = false;
  let startedAt = 0;
  let lastFrame = 0;
  let frame = 0;

  function start() {
    started = true;
    startedAt = performance.now();
    lastFrame = startedAt;
    lamp = { x: aim.x, y: aim.y, vx: 0, vy: 0 };
  }

  /**
   * Backgrounding mid-performance would score a night the player was not
   * present for, so the show simply stops and reports what it had.
   */
  const onHide = () => { if (document.hidden && started && !finished) finish(true); };
  document.addEventListener('visibilitychange', onHide);

  function stop() {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onHide);
  }

  function finish(abandoned = false) {
    if (finished) return;
    finished = true;
    stop();

    // Any crisis still open when the curtain falls is judged on what it had.
    for (const event of night.events) {
      if (outcomes[event.index]) continue;
      const tally = watching.get(event.index);
      const lit = tally && tally.frames > 0 ? tally.litFrames / tally.frames : 0;
      outcomes[event.index] = { met: abandoned ? true : eventMet(event, lit), lit };
    }

    const tally = tallyNight(night, outcomes);
    const following = gradeFollow(samples);
    onCue(null);
    onFinish({ ...tally, lit: following.lit, grace: following.grace, abandoned });
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);

    if (!started) {
      paintStage(ctx, width, height);
      for (const member of night.cast) {
        paintPerformer(ctx, width, height, performerPosition(member, 0), 0, member.name);
      }
      paintBeam(ctx, width, height, lamp, LAMP.radius);
      return;
    }

    const dt = Math.min((now - lastFrame) / 1000, 1 / 20);
    lastFrame = now;
    const elapsed = (now - startedAt) / 1000;

    lamp = stepLamp(lamp, aim.x, aim.y, dt);

    const spots = night.cast.map((member) => performerPosition(member, elapsed));

    // The crisis running right now, if any.
    const live = night.events.find((e) => elapsed >= e.at && elapsed < e.at + e.seconds);
    const cue = live ? live.cue : null;
    if (cue !== currentCue) {
      currentCue = cue;
      onCue(cue, live?.requirement ?? null);
    }

    if (live) {
      const subject = spots[live.subject] ?? spots[0];
      const rule = REQUIREMENTS[live.requirement];
      const lit = brightnessAt(lamp, subject, LAMP.radius) > 0.5;
      const tally = watching.get(live.index) ?? { frames: 0, litFrames: 0 };
      tally.frames++;
      if (lit) tally.litFrames++;
      watching.set(live.index, tally);
      void rule;
    }

    // Close out any crisis whose window has passed.
    for (const event of night.events) {
      if (outcomes[event.index] || elapsed < event.at + event.seconds) continue;
      const tally = watching.get(event.index);
      const lit = tally && tally.frames > 0 ? tally.litFrames / tally.frames : 0;
      outcomes[event.index] = { met: eventMet(event, lit), lit };
    }

    // The follow is scored against whoever the operator ought to be watching:
    // the subject of a crisis if one is running, otherwise the leading player.
    const followed = live ? (spots[live.subject] ?? spots[0]) : spots[0];
    samples.push({
      t: elapsed,
      lamp: { x: lamp.x, y: lamp.y },
      performer: { x: followed.x, y: followed.y },
    });

    paintStage(ctx, width, height);
    for (let i = 0; i < spots.length; i++) {
      paintPerformer(ctx, width, height, spots[i], brightnessAt(lamp, spots[i], LAMP.radius), night.cast[i].name);
    }
    paintBeam(ctx, width, height, lamp, LAMP.radius);
    paintProgress(ctx, width, elapsed, night.duration, live, elapsed);

    if (elapsed >= night.duration) finish();
  }

  frame = requestAnimationFrame(loop);
  return { stop, get started() { return started; }, get finished() { return finished; } };
}

/**
 * Two hairlines at the top: how far through the evening we are, and — while a
 * crisis is running — how much of its window is left. The second one is the
 * only clock the player gets, and it has to be readable without being looked at.
 */
function paintProgress(ctx, width, elapsed, duration, live) {
  ctx.fillStyle = 'rgba(154, 139, 118, 0.22)';
  ctx.fillRect(0, 0, width, 3);
  ctx.fillStyle = 'rgba(230, 188, 99, 0.85)';
  ctx.fillRect(0, 0, width * Math.min(1, elapsed / duration), 3);

  if (!live) return;
  const left = 1 - (elapsed - live.at) / live.seconds;
  ctx.fillStyle = 'rgba(154, 139, 118, 0.18)';
  ctx.fillRect(0, 5, width, 4);
  ctx.fillStyle = live.requirement === 'avert' ? 'rgba(217, 122, 90, 0.95)' : 'rgba(143, 185, 106, 0.95)';
  ctx.fillRect(0, 5, width * Math.max(0, left), 4);
}
