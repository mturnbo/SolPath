import { worldToScreen } from './camera.js';

export function spacecraftPosition(tau, mission) {
  if (!mission.isRerouted) {
    const { departurePos, arrivalPos, distAU, trajectory } = mission;
    const f = positionFraction(tau, trajectory, distAU);
    return {
      x: departurePos.x + (arrivalPos.x - departurePos.x) * f,
      y: departurePos.y + (arrivalPos.y - departurePos.y) * f,
    };
  }

  if (mission.isSmooth) {
    // Single brachistochrone over the full two-segment path (no stop at waypoint)
    const { departurePos, waypoint, arrivalPos, leg1DistAU, leg2DistAU, trajectory } = mission;
    const d_total = leg1DistAU + leg2DistAU;
    const dist    = positionFraction(tau, trajectory, d_total) * d_total;
    if (dist <= leg1DistAU) {
      const f = dist / leg1DistAU;
      return {
        x: departurePos.x + f * (waypoint.x - departurePos.x),
        y: departurePos.y + f * (waypoint.y - departurePos.y),
      };
    }
    const f = (dist - leg1DistAU) / leg2DistAU;
    return {
      x: waypoint.x + f * (arrivalPos.x - waypoint.x),
      y: waypoint.y + f * (arrivalPos.y - waypoint.y),
    };
  }

  // Two-leg stop: each leg is an independent brachistochrone
  const { departurePos, waypoint, arrivalPos, leg1, leg2, leg1DistAU, leg2DistAU } = mission;
  const totalTime = leg1.coordTimeDays + leg2.coordTimeDays;
  const tau1      = leg1.coordTimeDays / totalTime;

  if (tau <= tau1) {
    const localTau = tau / tau1;
    const f = positionFraction(localTau, leg1, leg1DistAU);
    return {
      x: departurePos.x + (waypoint.x - departurePos.x) * f,
      y: departurePos.y + (waypoint.y - departurePos.y) * f,
    };
  }

  const localTau = (tau - tau1) / (1 - tau1);
  const f = positionFraction(localTau, leg2, leg2DistAU);
  return {
    x: waypoint.x + (arrivalPos.x - waypoint.x) * f,
    y: waypoint.y + (arrivalPos.y - waypoint.y) * f,
  };
}

/**
 * Map normalized time (0–1) to normalized distance (0–1) along one leg.
 */
function positionFraction(tau, trajectory, distAU) {
  if (!trajectory.isCapped) {
    if (tau < 0.5) return 2 * tau * tau;
    return 1 - 2 * (1 - tau) * (1 - tau);
  }

  const T  = trajectory.coordTimeDays;
  const α  = trajectory.accelTimeDays  / T;
  const β  = trajectory.cruiseTimeDays / T;
  const fA = trajectory.accelDistAU    / distAU;

  if (tau <= α) return fA * (tau / α) ** 2;
  if (tau <= α + β) return fA + (1 - 2 * fA) * ((tau - α) / β);
  const tDecel = (tau - α - β) / α;
  return 1 - fA * (1 - tDecel) ** 2;
}

export function drawSpacecraft(ctx, cam, pos, dir) {
  const { sx, sy } = worldToScreen(cam, pos.x, pos.y);

  ctx.save();

  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
  glow.addColorStop(0,   'rgba(255,255,255,0.6)');
  glow.addColorStop(0.4, 'rgba(160,200,255,0.3)');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(sx, sy, 3, 0, Math.PI * 2);
  ctx.fill();

  if (dir) {
    const tipLen = 9, wingLen = 4, wingBack = 5;
    const fx = dir.nx, fy = -dir.ny;
    const rx = -fy,    ry =  fx;

    ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(sx + fx * tipLen,                          sy + fy * tipLen);
    ctx.lineTo(sx + (-fx * wingBack + rx * wingLen),      sy + (-fy * wingBack + ry * wingLen));
    ctx.lineTo(sx + (-fx * wingBack - rx * wingLen),      sy + (-fy * wingBack - ry * wingLen));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
