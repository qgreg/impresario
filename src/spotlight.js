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

const px = (x) => x * width;
const py = (y) => y * height;

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

/** The boards, the back wall, and a row of footlights along the front. */
function paintStage() {
  const floor = py(0.52);

  const wall = ctx.createLinearGradient(0, 0, 0, floor);
  wall.addColorStop(0, '#0B0908');
  wall.addColorStop(1, '#171210');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, floor);

  const boards = ctx.createLinearGradient(0, floor, 0, height);
  boards.addColorStop(0, '#221A15');
  boards.addColorStop(1, '#0E0B09');
  ctx.fillStyle = boards;
  ctx.fillRect(0, floor, width, height - floor);

  // Boards receding, drawn as converging lines rather than a texture — cheaper,
  // and it gives the stage a depth the performer can move within.
  ctx.strokeStyle = 'rgba(201, 151, 63, 0.05)';
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(width / 2 + i * width * 0.055, floor);
    ctx.lineTo(width / 2 + i * width * 0.24, height);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(232, 163, 61, 0.16)';
  for (let i = 0; i < 9; i++) {
    const x = ((i + 0.5) / 9) * width;
    ctx.beginPath();
    ctx.arc(x, height - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * She is drawn dark and only the beam reveals her, because that is the entire
 * feedback loop: losing her does not show a miss counter, it leaves an actor
 * working in the dark where everyone can see it happen.
 */
function paintPerformer(performer, brightness) {
  const x = px(performer.x);
  const y = py(performer.y);
  const scale = height * 0.10;

  const warm = (alpha) => `rgba(242, 228, 203, ${alpha})`;
  const body = brightness > 0.02
    ? warm(0.28 + brightness * 0.62)
    : 'rgba(58, 48, 42, 0.85)';

  ctx.save();
  ctx.translate(x, y);

  // A long skirted figure: readable as a person at a glance, and its silhouette
  // survives being reduced to almost nothing when she is unlit.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-scale * 0.20, -scale * 0.55);
  ctx.lineTo(scale * 0.20, -scale * 0.55);
  ctx.lineTo(scale * 0.42, scale * 0.62);
  ctx.lineTo(-scale * 0.42, scale * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -scale * 0.78, scale * 0.20, 0, Math.PI * 2);
  ctx.fill();

  // Her shadow on the boards only exists while there is a light to cast it.
  if (brightness > 0.05) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.30 * brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, scale * 0.68, scale * 0.5, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The beam: a haze from above, and the pool it lays on the boards. */
function paintBeam(lamp) {
  const x = px(lamp.x);
  const y = py(lamp.y);
  const radius = px(LAMP.radius) * 1.9;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const haze = ctx.createLinearGradient(x, -height * 0.1, x, y);
  haze.addColorStop(0, 'rgba(240, 200, 120, 0.16)');
  haze.addColorStop(1, 'rgba(240, 200, 120, 0.03)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.16, -height * 0.1);
  ctx.lineTo(x + radius * 0.16, -height * 0.1);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x - radius, y);
  ctx.closePath();
  ctx.fill();

  const pool = ctx.createRadialGradient(x, y, 0, x, y, radius);
  pool.addColorStop(0, 'rgba(255, 226, 168, 0.55)');
  pool.addColorStop(0.45, 'rgba(240, 195, 110, 0.22)');
  pool.addColorStop(1, 'rgba(240, 195, 110, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

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

    const distance = Math.hypot(state.lamp.x - performer.x, state.lamp.y - performer.y);
    // Brightness falls off smoothly even though the score is a hard radius —
    // a light with a hard edge looks like a bug, and the soft edge is also the
    // thing that tells the player they are drifting before they lose her.
    const brightness = Math.max(0, 1 - distance / (LAMP.radius * 2.1));

    litSoFar = state.samples.filter((s) => isLit(s.lamp, s.performer)).length / state.samples.length;

    paintStage();
    paintPerformer(performer, brightness);
    paintBeam(state.lamp);
    paintTally(litSoFar, elapsed, total);

    if (performer.done) finish();
    return;
  }

  // Idle: the stage sits dark with the lamp resting wherever it was left.
  state.lamp = stepLamp(state.lamp, state.aim.x, state.aim.y, dt);
  paintStage();
  if (state.phase === 'waiting') paintPerformer(performerAt(0), 0);
  paintBeam(state.lamp);
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
