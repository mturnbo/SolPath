import { worldToScreen } from './camera.js';

const ACCEL_COLOR   = '#4a90e2';
const DECEL_COLOR   = '#4a90e2';
const FLIP_COLOR    = '#ffffff';
const ARRIVAL_COLOR = '#a0e8b0';

/**
 * Draw the trajectory path for a computed mission.
 *
 * Visual breakdown:
 *   – Solid line:  departure → flip point (acceleration leg)
 *   – Dashed line: flip point → arrival   (deceleration leg)
 *   – Flip marker: small white circle at the midpoint
 *   – Arrival marker: outlined planet dot at destination's future position
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam
 * @param {object} mission  - MissionState from computeMission()
 */
export function drawTrajectory(ctx, cam, mission) {
  const { departurePos, arrivalPos, midpointPos, destPlanet } = mission;

  const dep  = worldToScreen(cam, departurePos.x,  departurePos.y);
  const flip = worldToScreen(cam, midpointPos.x,   midpointPos.y);
  const arr  = worldToScreen(cam, arrivalPos.x,    arrivalPos.y);

  ctx.save();

  // ── Acceleration leg (solid) ──────────────────────────────────────────────

  ctx.beginPath();
  ctx.moveTo(dep.sx,  dep.sy);
  ctx.lineTo(flip.sx, flip.sy);
  ctx.strokeStyle  = ACCEL_COLOR;
  ctx.lineWidth    = 1.5;
  ctx.globalAlpha  = 0.85;
  ctx.setLineDash([]);
  ctx.stroke();

  // ── Deceleration leg (dashed) ─────────────────────────────────────────────

  ctx.beginPath();
  ctx.moveTo(flip.sx, flip.sy);
  ctx.lineTo(arr.sx,  arr.sy);
  ctx.strokeStyle  = DECEL_COLOR;
  ctx.lineWidth    = 1.5;
  ctx.globalAlpha  = 0.55;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Flip point marker ─────────────────────────────────────────────────────

  ctx.globalAlpha = 1;
  ctx.fillStyle   = FLIP_COLOR;
  ctx.beginPath();
  ctx.arc(flip.sx, flip.sy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = FLIP_COLOR;
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(flip.sx, flip.sy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // ── Arrival planet marker (future position) ───────────────────────────────

  const r = Math.max(3, destPlanet.radiusPx);

  // Glow
  ctx.globalAlpha = 0.5;
  const glow = ctx.createRadialGradient(arr.sx, arr.sy, 0, arr.sx, arr.sy, r * 3);
  glow.addColorStop(0,   ARRIVAL_COLOR);
  glow.addColorStop(0.5, ARRIVAL_COLOR + '55');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(arr.sx, arr.sy, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Outlined dot
  ctx.globalAlpha  = 1;
  ctx.strokeStyle  = ARRIVAL_COLOR;
  ctx.lineWidth    = 1.5;
  ctx.fillStyle    = 'transparent';
  ctx.beginPath();
  ctx.arc(arr.sx, arr.sy, r, 0, Math.PI * 2);
  ctx.stroke();

  // "Arrive" label
  ctx.font         = '10px var(--font-sans, system-ui)';
  ctx.fillStyle    = ARRIVAL_COLOR;
  ctx.globalAlpha  = 0.85;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${destPlanet.name} (arrival)`, arr.sx + r + 6, arr.sy);

  ctx.restore();
}

/**
 * Draw a "departure" marker — a small ring around the origin planet's dot.
 * Layered on top of the normal planet dot drawn by drawAllPlanets().
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam
 * @param {object} mission
 */
export function drawDepartureMarker(ctx, cam, mission) {
  const { departurePos, originPlanet } = mission;
  const { sx, sy } = worldToScreen(cam, departurePos.x, departurePos.y);
  const r = Math.max(3, originPlanet.radiusPx);

  ctx.save();
  ctx.strokeStyle = originPlanet.color;
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
