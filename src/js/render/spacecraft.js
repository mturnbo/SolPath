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
 * Handles three phases: accel (quadratic) → flip coast (linear) → decel (quadratic).
 * For capped trajectories the flip is embedded inside the cruise window, so the
 * cruise formula is unchanged — only the rendering layer needs to know when the
 * flip occurs.
 */
function positionFraction(tau, trajectory, distAU) {
  const T  = trajectory.coordTimeDays;
  const α  = trajectory.accelTimeDays / T;
  const fA = trajectory.accelDistAU   / distAU;

  if (!trajectory.isCapped) {
    const φ = (trajectory.flipTimeDays || 0) / T;
    if (tau <= α) return fA * (tau / α) ** 2;
    if (φ > 0 && tau <= α + φ) return fA + (1 - 2 * fA) * (tau - α) / φ;
    const tDecel = (tau - α - φ) / α;
    return 1 - fA * (1 - tDecel) ** 2;
  }

  const β = trajectory.cruiseTimeDays / T;
  if (tau <= α) return fA * (tau / α) ** 2;
  if (tau <= α + β) return fA + (1 - 2 * fA) * ((tau - α) / β);
  const tDecel = (tau - α - β) / α;
  return 1 - fA * (1 - tDecel) ** 2;
}

export function drawSpacecraft(ctx, cam, pos, dir, thrustPhase = 'accel', flipProgress = 0) {
  const { sx, sy } = worldToScreen(cam, pos.x, pos.y);

  ctx.save();

  if (dir) {
    // Heading angle in screen space (y-axis inverted vs world space).
    // Accel: nose toward destination.  Decel: nose toward departure (+ π).
    // Flip: smoothly interpolate between the two.
    const baseAngle = Math.atan2(-dir.ny, dir.nx);
    const eased     = flipProgress * flipProgress * (3 - 2 * flipProgress);
    const heading   = thrustPhase === 'flip'  ? baseAngle + eased * Math.PI
                    : thrustPhase === 'decel' ? baseAngle + Math.PI
                    :                           baseAngle;

    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    const rx = -fy, ry = fx;

    // Exhaust plume — only when thrusting (not during flip or cruise coast)
    if (thrustPhase !== 'flip' && thrustPhase !== 'cruise') {
      const wingBack = 5;
      const ex = -fx, ey = -fy;
      const px = -ey, py =  ex;

      const nozzleX  = sx - fx * wingBack;
      const nozzleY  = sy - fy * wingBack;
      const plumeLen = 22;
      const tipX = nozzleX + ex * plumeLen;
      const tipY = nozzleY + ey * plumeLen;

      const grad = ctx.createLinearGradient(nozzleX, nozzleY, tipX, tipY);
      grad.addColorStop(0,    'rgba(200, 230, 255, 0.95)');
      grad.addColorStop(0.15, 'rgba(140, 200, 255, 0.80)');
      grad.addColorStop(0.5,  'rgba(80,  140, 255, 0.40)');
      grad.addColorStop(1,    'rgba(60,  100, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(nozzleX + px * 3.5, nozzleY + py * 3.5);
      ctx.lineTo(nozzleX - px * 3.5, nozzleY - py * 3.5);
      ctx.lineTo(tipX, tipY);
      ctx.closePath();
      ctx.fill();

      const coreLen  = plumeLen * 0.35;
      const coreGrad = ctx.createLinearGradient(
        nozzleX, nozzleY,
        nozzleX + ex * coreLen, nozzleY + ey * coreLen,
      );
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(1, 'rgba(200, 230, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.moveTo(nozzleX + px * 1.5, nozzleY + py * 1.5);
      ctx.lineTo(nozzleX - px * 1.5, nozzleY - py * 1.5);
      ctx.lineTo(nozzleX + ex * coreLen, nozzleY + ey * coreLen);
      ctx.closePath();
      ctx.fill();
    }

    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
    glow.addColorStop(0,   'rgba(255,255,255,0.6)');
    glow.addColorStop(0.4, 'rgba(160,200,255,0.3)');
    glow.addColorStop(1,   'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    const tipLen = 9, wingLen = 4, wingBack = 5;
    ctx.fillStyle = 'rgba(180, 220, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(sx + fx * tipLen,                      sy + fy * tipLen);
    ctx.lineTo(sx + (-fx * wingBack + rx * wingLen),  sy + (-fy * wingBack + ry * wingLen));
    ctx.lineTo(sx + (-fx * wingBack - rx * wingLen),  sy + (-fy * wingBack - ry * wingLen));
    ctx.closePath();
    ctx.fill();
  } else {
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
    glow.addColorStop(0,   'rgba(255,255,255,0.6)');
    glow.addColorStop(0.4, 'rgba(160,200,255,0.3)');
    glow.addColorStop(1,   'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
