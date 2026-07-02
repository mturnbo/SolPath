import { worldToScreen } from './camera.js';
import { planetPosition } from '../physics/kepler.js';
import { toJ2000Century } from '../physics/epoch.js';
import { addDays } from '../physics/epoch.js';

/** Segments used to trace the planet's orbital arc during the mission */
const ARC_SEGMENTS = 120;

/** Pulsing flash animation state */
let flashStartTs = null;
const FLASH_DURATION_MS = 2000;

/**
 * Trigger the arrival flash animation.
 * Called by main.js when the animator reaches τ = 1.
 */
export function triggerArrivalFlash() {
  flashStartTs = performance.now();
}

/**
 * Returns true while the flash animation is still running.
 */
export function isFlashing() {
  return flashStartTs !== null && (performance.now() - flashStartTs) < FLASH_DURATION_MS;
}

/**
 * Draw the arrival overlay — the arc showing how far the destination planet
 * moves between departure and arrival, and a flash highlight at arrival.
 *
 * Always visible when a mission is active; the flash only plays when triggered.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam
 * @param {object} mission   - MissionState from computeMission()
 * @param {number} tau       - current animation progress (0–1)
 */
export function drawArrivalOverlay(ctx, cam, mission) {
  if (!mission) return;

  drawPlanetArc(ctx, cam, mission);
  drawArcLabels(ctx, cam, mission);
  drawFlash(ctx, cam, mission);
}

/**
 * Trace the destination planet's orbital path between departure date and
 * arrival date as a highlighted arc.
 */
function drawPlanetArc(ctx, cam, mission) {
  const { destPlanet, departureDate, trajectory } = mission;
  const totalDays = trajectory.coordTimeDays;

  const points = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const date = addDays(departureDate, t * totalDays);
    const T    = toJ2000Century(date);
    const pos  = planetPosition(destPlanet, T);
    points.push(worldToScreen(cam, pos.x, pos.y));
  }

  ctx.save();
  ctx.strokeStyle  = destPlanet.color;
  ctx.lineWidth    = 2;
  ctx.globalAlpha  = 0.5;
  ctx.setLineDash([4, 4]);
  ctx.lineCap      = 'round';

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const { sx, sy } = points[i];
    if (i === 0) ctx.moveTo(sx, sy);
    else         ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Label the start and end of the planet's arc with "now" and "arrival" markers.
 */
function drawArcLabels(ctx, cam, mission) {
  const { destPlanet, currentDestPos, arrivalPos } = mission;

  const now = worldToScreen(cam, currentDestPos.x, currentDestPos.y);
  const arr = worldToScreen(cam, arrivalPos.x,     arrivalPos.y);

  ctx.save();
  ctx.font         = '10px var(--font-sans, system-ui)';
  ctx.textBaseline = 'middle';

  // "Now" marker — small tick on the arc start
  ctx.fillStyle   = destPlanet.color;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(now.sx, now.sy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha  = 0.55;
  ctx.fillStyle    = destPlanet.color;
  ctx.textAlign    = 'right';
  ctx.fillText('now', now.sx - 6, now.sy);

  // Angular distance label mid-arc
  const midDate = addDays(mission.departureDate, mission.trajectory.coordTimeDays / 2);
  const midPos  = planetPosition(destPlanet, toJ2000Century(midDate));
  const mid     = worldToScreen(cam, midPos.x, midPos.y);

  const angDeg = orbitalAngleDeg(mission);
  if (angDeg > 1) {
    ctx.globalAlpha  = 0.5;
    ctx.fillStyle    = destPlanet.color;
    ctx.textAlign    = 'center';
    ctx.fillText(`${angDeg.toFixed(1)}°`, mid.sx, mid.sy - 10);
  }

  ctx.restore();
}

/**
 * Estimate the angle (degrees) the planet sweeps during the mission.
 * Uses the start and end heliocentric position vectors.
 */
function orbitalAngleDeg(mission) {
  const { currentDestPos, arrivalPos } = mission;
  const r1 = Math.hypot(currentDestPos.x, currentDestPos.y);
  const r2 = Math.hypot(arrivalPos.x,     arrivalPos.y);
  const dot = (currentDestPos.x * arrivalPos.x + currentDestPos.y * arrivalPos.y) / (r1 * r2);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
}

/**
 * Draw a radiating glow at the arrival position when triggered.
 * Fades out over FLASH_DURATION_MS milliseconds.
 */
function drawFlash(ctx, cam, mission) {
  if (flashStartTs === null) return;

  const elapsed = performance.now() - flashStartTs;
  if (elapsed > FLASH_DURATION_MS) {
    flashStartTs = null;
    return;
  }

  const alpha = 1 - elapsed / FLASH_DURATION_MS;
  const { arrivalPos, destPlanet } = mission;
  const { sx, sy } = worldToScreen(cam, arrivalPos.x, arrivalPos.y);

  // Expanding ring
  const maxR  = 30 + 20 * (elapsed / FLASH_DURATION_MS);
  const ringR = 8  + 22 * (elapsed / FLASH_DURATION_MS);

  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = destPlanet.color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, maxR);
  glow.addColorStop(0,   destPlanet.color + 'aa');
  glow.addColorStop(0.5, destPlanet.color + '44');
  glow.addColorStop(1,   'transparent');
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle   = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, maxR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

}
