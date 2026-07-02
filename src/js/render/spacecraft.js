import { worldToScreen } from './camera.js';

/**
 * Compute the world-space position (AU) of the spacecraft at a given
 * normalized mission time (0 = departure, 1 = arrival).
 *
 * Position follows the physical acceleration profile:
 *   - Uncapped: quadratic accel for first half, quadratic decel for second half
 *   - Capped:   quadratic accel → linear cruise → quadratic decel
 *
 * @param {number} tau     - normalized time 0–1
 * @param {object} mission - MissionState from computeMission()
 * @returns {{ x: number, y: number }} world position in AU
 */
export function spacecraftPosition(tau, mission) {
  const { departurePos, arrivalPos, distAU, trajectory } = mission;
  const f = positionFraction(tau, trajectory, distAU);

  return {
    x: departurePos.x + (arrivalPos.x - departurePos.x) * f,
    y: departurePos.y + (arrivalPos.y - departurePos.y) * f,
  };
}

/**
 * Map normalized time (0–1) to normalized distance (0–1) along the path,
 * accounting for acceleration and deceleration phases.
 */
function positionFraction(tau, trajectory, distAU) {
  if (!trajectory.isCapped) {
    // Two-phase flip-and-burn
    if (tau < 0.5) return 2 * tau * tau;
    return 1 - 2 * (1 - tau) * (1 - tau);
  }

  // Three-phase: accel → cruise → decel
  const T  = trajectory.coordTimeDays;
  const α  = trajectory.accelTimeDays  / T;   // normalized accel duration
  const β  = trajectory.cruiseTimeDays / T;   // normalized cruise duration
  const fA = trajectory.accelDistAU    / distAU; // distance fraction per thrust leg

  if (tau <= α) {
    return fA * (tau / α) ** 2;
  }
  if (tau <= α + β) {
    return fA + (1 - 2 * fA) * ((tau - α) / β);
  }
  const tDecel = (tau - α - β) / α;
  return 1 - fA * (1 - tDecel) ** 2;
}

/**
 * Draw the spacecraft dot on the canvas at the given world position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam
 * @param {{ x: number, y: number }} pos   world position (AU)
 * @param {{ nx: number, ny: number }} dir  unit direction vector
 */
export function drawSpacecraft(ctx, cam, pos, dir) {
  const { sx, sy } = worldToScreen(cam, pos.x, pos.y);

  ctx.save();

  // Outer glow
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
  glow.addColorStop(0,   'rgba(255,255,255,0.6)');
  glow.addColorStop(0.4, 'rgba(160,200,255,0.3)');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 10, 0, Math.PI * 2);
  ctx.fill();

  // Core dot
  ctx.fillStyle    = '#ffffff';
  ctx.globalAlpha  = 1;
  ctx.beginPath();
  ctx.arc(sx, sy, 3, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator — small triangle pointing forward
  if (dir) {
    const tipLen   = 9;
    const wingLen  = 4;
    const wingBack = 5;

    // forward vector
    const fx = dir.nx, fy = -dir.ny;   // flip Y for screen space
    // right perpendicular
    const rx = -fy, ry = fx;

    const tipX  = sx + fx * tipLen;
    const tipY  = sy + fy * tipLen;
    const lWingX = sx + (-fx * wingBack + rx * wingLen);
    const lWingY = sy + (-fy * wingBack + ry * wingLen);
    const rWingX = sx + (-fx * wingBack - rx * wingLen);
    const rWingY = sy + (-fy * wingBack - ry * wingLen);

    ctx.fillStyle   = 'rgba(180, 220, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(tipX,   tipY);
    ctx.lineTo(lWingX, lWingY);
    ctx.lineTo(rWingX, rWingY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
