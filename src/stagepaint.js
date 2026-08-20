/**
 * Painting a stage: the boards, the people on them, and the beam.
 *
 * Shared by the follow-spot toy and by opening night itself. The toy came
 * first and owned all of this; when the real phase arrived it needed the same
 * picture with more people on it, and two copies of a stage that must look
 * identical is how they stop looking identical.
 *
 * Every position is normalised — x and y in 0..1 — so nothing here changes when
 * the canvas does. Callers pass the canvas size in.
 */

const WARM = (alpha) => `rgba(242, 228, 203, ${alpha})`;

/** The boards, the back wall, and a row of footlights along the front. */
export function paintStage(ctx, width, height) {
  const floor = height * 0.52;

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
  // and it gives the stage a depth the performers can move within.
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
    ctx.beginPath();
    ctx.arc(((i + 0.5) / 9) * width, height - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * A performer, drawn dark and revealed only by the beam.
 *
 * That is the entire feedback loop: losing somebody does not show a miss
 * counter, it leaves an actor working in the dark where everyone can see it.
 *
 * `name` is drawn under anyone who is lit, because with more than one figure on
 * stage the player has to know which of their own people they are looking at —
 * "take the light off Crewe" is not an instruction you can follow otherwise.
 */
export function paintPerformer(ctx, width, height, performer, brightness, name = '') {
  const x = performer.x * width;
  const y = performer.y * height;
  const scale = height * 0.10;

  const body = brightness > 0.02 ? WARM(0.28 + brightness * 0.62) : 'rgba(58, 48, 42, 0.85)';

  ctx.save();
  ctx.translate(x, y);

  // A long skirted figure: readable as a person at a glance, and its silhouette
  // survives being reduced to almost nothing when unlit.
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

  // A shadow only exists while there is a light to cast it.
  if (brightness > 0.05) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.30 * brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, scale * 0.68, scale * 0.5, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (name && brightness > 0.12) {
    ctx.fillStyle = WARM(Math.min(0.75, brightness));
    ctx.font = `500 ${Math.round(height * 0.017)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, scale * 0.95);
  }

  ctx.restore();
}

/** The beam: a haze from above, and the pool it lays on the boards. */
export function paintBeam(ctx, width, height, lamp, radius) {
  const x = lamp.x * width;
  const y = lamp.y * height;
  const r = radius * width * 1.9;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const haze = ctx.createLinearGradient(x, -height * 0.1, x, y);
  haze.addColorStop(0, 'rgba(240, 200, 120, 0.16)');
  haze.addColorStop(1, 'rgba(240, 200, 120, 0.03)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.16, -height * 0.1);
  ctx.lineTo(x + r * 0.16, -height * 0.1);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();

  const pool = ctx.createRadialGradient(x, y, 0, x, y, r);
  pool.addColorStop(0, 'rgba(255, 226, 168, 0.55)');
  pool.addColorStop(0.45, 'rgba(240, 195, 110, 0.22)');
  pool.addColorStop(1, 'rgba(240, 195, 110, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** How brightly the beam falls on a point. Soft-edged, though scoring is not. */
export function brightnessAt(lamp, point, radius) {
  const distance = Math.hypot(lamp.x - point.x, lamp.y - point.y);
  return Math.max(0, 1 - distance / (radius * 2.1));
}
