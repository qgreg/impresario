/**
 * The follow spot, as a standalone toy.
 *
 * This exists on its own page and depends on no other phase, because it is the
 * riskiest idea in the design and the only one that cannot be settled by
 * argument: either scoring grace as well as accuracy feels good under a thumb
 * or it does not, and nothing but a thumb can say.
 *
 * All the decisions live in follow.js as pure functions. This file owns a
 * canvas, a clock, and a pointer, and nothing else.
 */

import {
  LAMP, stepLamp, performerAt, sceneDuration, gradeFollow, noteOn, isLit,
} from './follow.js';
import { paintStage, paintPerformer, paintBeam, brightnessAt } from './stagepaint.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const veil = document.getElementById('veil');

/**
 * On a phone the thumb sits on top of the thing it is aiming at. The lamp is
 * therefore driven from a point above the finger — far enough that she is never
 * hidden by the hand that is lighting her. A mouse has no such problem and gets
 * no offset, which also keeps the desktop path honest for testing.
 */
const TOUCH_LIFT = 0.11;

const state = {
  phase: 'waiting',      // waiting → running → done
  startedAt: 0,
  lamp: { x: 0.5, y: 0.45, vx: 0, vy: 0 },
  aim: { x: 0.5, y: 0.45 },
  samples: [],
  lastFrame: 0,
  result: null,
};

// ------------------------------------------------------------------- canvas

let width = 0;
let height = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();


// -------------------------------------------------------------------- input

function aimAt(event) {
  const lift = event.pointerType === 'touch' ? TOUCH_LIFT : 0;
  state.aim.x = event.clientX / width;
  state.aim.y = event.clientY / height - lift;
}

// Listening on the window rather than the canvas: the lamp must keep taking
// aim while the finger is anywhere at all, including over the veil and past the
// edges of the stage.
window.addEventListener('pointerdown', (event) => {
  aimAt(event);
  if (state.phase === 'waiting' || state.phase === 'done') begin();
});

window.addEventListener('pointermove', (event) => {
  // A mouse aims by hovering; a finger has to be down. Both end up in the same
  // place, so the flat screen can be used to test the feel without a phone.
  if (event.pointerType === 'touch' && event.buttons === 0) return;
  aimAt(event);
});

/**
 * A phone call, a notification, a switch to another app — any of these hand
 * back an enormous frame gap and would ruin a run the player was not even
 * present for. The show simply stops and offers itself again.
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'running') abandon();
});

// ------------------------------------------------------------------ the run

function begin() {
  state.phase = 'running';
  state.startedAt = performance.now();
  state.lastFrame = state.startedAt;
  state.samples = [];
  state.result = null;
  state.lamp = { x: state.aim.x, y: state.aim.y, vx: 0, vy: 0 };
  veil.hidden = true;
}

function abandon() {
  state.phase = 'waiting';
  veil.hidden = false;
  veil.innerHTML = `
    <h1>Held</h1>
    <p>The curtain came down while you were away. Nothing counts against you.</p>
    <small>Touch to go again</small>`;
}

function finish() {
  state.phase = 'done';
  state.result = gradeFollow(state.samples);
  const { lit, grace, grade } = state.result;
  veil.hidden = false;
  veil.innerHTML = `
    <h1>The notices</h1>
    <p class="grade">${grade}</p>
    <div class="figures">
      <span class="figure"><b>${Math.round(lit * 100)}%</b><span>lit</span></span>
      <span class="figure"><b>${Math.round(grace * 100)}%</b><span>grace</span></span>
    </div>
    <p class="note">${noteOn(state.result)}</p>
    <small>Touch to go again</small>`;
}

// ----------------------------------------------------------------- painting

// The stage, the figures and the beam are painted by stagepaint.js, which both
// this toy and opening night share. Two copies of a stage that must look
// identical is how they stop looking identical.

/**
 * The only thing on screen that is not the stage: a thin bar showing how much
 * of the scene she has been lit for. It is here because this is a toy for
 * judging feel, and knowing the score is moving helps that judgement.
 */
function paintTally(lit, elapsed, total) {
  const done = Math.min(1, elapsed / total);

  ctx.fillStyle = 'rgba(154, 139, 118, 0.22)';
  ctx.fillRect(0, 0, width, 3);
  ctx.fillStyle = 'rgba(230, 188, 99, 0.85)';
  ctx.fillRect(0, 0, width * done, 3);

  ctx.fillStyle = 'rgba(154, 139, 118, 0.18)';
  ctx.fillRect(0, 5, width, 3);
  ctx.fillStyle = lit > 0.85 ? 'rgba(143, 185, 106, 0.9)' : 'rgba(232, 163, 61, 0.9)';
  ctx.fillRect(0, 5, width * lit, 3);
}

// -------------------------------------------------------------- the loop

let litSoFar = 0;

function frame(now) {
  requestAnimationFrame(frame);

  const dt = Math.min((now - state.lastFrame) / 1000, 1 / 20);
  state.lastFrame = now;

  if (state.phase === 'running') {
    const elapsed = (now - state.startedAt) / 1000;
    const total = sceneDuration();
    const performer = performerAt(elapsed);

    state.lamp = stepLamp(state.lamp, state.aim.x, state.aim.y, dt);
    state.samples.push({
      t: elapsed,
      lamp: { x: state.lamp.x, y: state.lamp.y },
      performer: { x: performer.x, y: performer.y },
    });

    // Brightness falls off smoothly even though the score is a hard radius — a
    // light with a hard edge looks like a bug, and the soft edge is what tells
    // the player they are drifting before they actually lose her.
    const brightness = brightnessAt(state.lamp, performer, LAMP.radius);

    litSoFar = state.samples.filter((s) => isLit(s.lamp, s.performer)).length / state.samples.length;

    paintStage(ctx, width, height);
    paintPerformer(ctx, width, height, performer, brightness);
    paintBeam(ctx, width, height, state.lamp, LAMP.radius);
    paintTally(litSoFar, elapsed, total);

    if (performer.done) finish();
    return;
  }

  // Idle: the stage sits dark with the lamp resting wherever it was left.
  state.lamp = stepLamp(state.lamp, state.aim.x, state.aim.y, dt);
  paintStage(ctx, width, height);
  if (state.phase === 'waiting') paintPerformer(ctx, width, height, performerAt(0), 0);
  paintBeam(ctx, width, height, state.lamp, LAMP.radius);
}

requestAnimationFrame(frame);

// A window onto the run, for the console and for a smoke test later.
window.__spot = {
  get phase() { return state.phase; },
  get result() { return state.result; },
  get samples() { return state.samples.length; },
  aim(x, y) { state.aim.x = x; state.aim.y = y; },
  begin,
};
