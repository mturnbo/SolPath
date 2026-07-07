import { worldToScreen } from './camera.js';
import { SOLAR_EXCLUSION_AU } from '../physics/trajectory.js';

const ACCEL_COLOR   = '#4a90e2';
const FLIP_COLOR    = '#ffffff';
const ARRIVAL_COLOR = '#a0e8b0';
const DETOUR_COLOR  = '#ff9040';

// ── Solar exclusion ring ──────────────────────────────────────────────────────

/**
 * Draw the solar exclusion boundary — a dashed ring at SOLAR_EXCLUSION_AU.
 * Only drawn when the trajectory was rerouted.
 */
export function drawExclusionRing(ctx, cam) {
  const { sx: cx, sy: cy } = worldToScreen(cam, 0, 0);
  const r = SOLAR_EXCLUSION_AU * cam.scale;

  ctx.save();
  ctx.strokeStyle = DETOUR_COLOR;
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Trajectory path ───────────────────────────────────────────────────────────

export function drawTrajectory(ctx, cam, mission) {
  if (mission.isRerouted) {
    drawReroutedTrajectory(ctx, cam, mission);
  } else {
    drawDirectTrajectory(ctx, cam, mission);
  }
}

function drawDirectTrajectory(ctx, cam, mission) {
  const { departurePos, arrivalPos, midpointPos, destPlanet } = mission;

  const dep  = worldToScreen(cam, departurePos.x, departurePos.y);
  const flip = worldToScreen(cam, midpointPos.x,  midpointPos.y);
  const arr  = worldToScreen(cam, arrivalPos.x,   arrivalPos.y);

  ctx.save();
  drawLeg(ctx, dep, flip, arr);
  drawFlipMarker(ctx, flip);
  drawArrivalMarker(ctx, cam, arr, arrivalPos, destPlanet);
  ctx.restore();
}

function drawReroutedTrajectory(ctx, cam, mission) {
  const { departurePos, waypoint, arrivalPos, midpointPos, destPlanet, leg1, leg2,
          leg1DistAU, leg2DistAU, direction1, direction2 } = mission;

  const dep  = worldToScreen(cam, departurePos.x, departurePos.y);
  const wp   = worldToScreen(cam, waypoint.x,     waypoint.y);
  const arr  = worldToScreen(cam, arrivalPos.x,   arrivalPos.y);

  // Flip point on leg 1
  const flip1 = worldToScreen(
    cam,
    departurePos.x + direction1.nx * leg1.flipDistAU,
    departurePos.y + direction1.ny * leg1.flipDistAU,
  );

  // Flip point on leg 2
  const flip2 = worldToScreen(
    cam,
    waypoint.x + direction2.nx * leg2.flipDistAU,
    waypoint.y + direction2.ny * leg2.flipDistAU,
  );

  ctx.save();

  // Leg 1: departure → waypoint
  drawLeg(ctx, dep, flip1, wp);
  drawFlipMarker(ctx, flip1);

  // Leg 2: waypoint → arrival
  drawLeg(ctx, wp, flip2, arr);
  drawFlipMarker(ctx, flip2);

  // Waypoint marker
  drawWaypointMarker(ctx, wp);

  // Arrival marker
  drawArrivalMarker(ctx, cam, arr, arrivalPos, destPlanet);

  ctx.restore();
}

// ── Shared drawing primitives ─────────────────────────────────────────────────

function drawLeg(ctx, dep, flip, end) {
  // Accel segment (solid)
  ctx.beginPath();
  ctx.moveTo(dep.sx,  dep.sy);
  ctx.lineTo(flip.sx, flip.sy);
  ctx.strokeStyle = ACCEL_COLOR;
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.85;
  ctx.setLineDash([]);
  ctx.stroke();

  // Decel segment (dashed)
  ctx.beginPath();
  ctx.moveTo(flip.sx, flip.sy);
  ctx.lineTo(end.sx,  end.sy);
  ctx.strokeStyle = ACCEL_COLOR;
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFlipMarker(ctx, flip) {
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
}

function drawWaypointMarker(ctx, wp) {
  // Amber ring
  ctx.globalAlpha = 1;
  ctx.strokeStyle = DETOUR_COLOR;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(wp.sx, wp.sy, 5, 0, Math.PI * 2);
  ctx.stroke();

  // Amber dot
  ctx.fillStyle   = DETOUR_COLOR;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(wp.sx, wp.sy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.font         = '10px var(--font-sans, system-ui)';
  ctx.fillStyle    = DETOUR_COLOR;
  ctx.globalAlpha  = 0.8;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('detour', wp.sx + 8, wp.sy);
}

function drawArrivalMarker(ctx, cam, arr, arrivalPos, destPlanet) {
  const r = Math.max(3, destPlanet.radiusPx);

  ctx.globalAlpha = 0.5;
  const glow = ctx.createRadialGradient(arr.sx, arr.sy, 0, arr.sx, arr.sy, r * 3);
  glow.addColorStop(0,   ARRIVAL_COLOR);
  glow.addColorStop(0.5, ARRIVAL_COLOR + '55');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(arr.sx, arr.sy, r * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = ARRIVAL_COLOR;
  ctx.lineWidth   = 1.5;
  ctx.fillStyle   = 'transparent';
  ctx.beginPath();
  ctx.arc(arr.sx, arr.sy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font         = '10px var(--font-sans, system-ui)';
  ctx.fillStyle    = ARRIVAL_COLOR;
  ctx.globalAlpha  = 0.85;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${destPlanet.name} (arrival)`, arr.sx + r + 6, arr.sy);
}

// ── Departure ring ────────────────────────────────────────────────────────────

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
