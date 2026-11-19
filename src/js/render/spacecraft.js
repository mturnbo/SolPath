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

/**
 * Inverse of positionFraction: given a target distance fraction (0–1) along a
 * leg, return the normalized time τ at which the ship reaches it.  Used to time
 * the follow camera against a point on the path rather than a moment in time.
 *
 * @param {object} trajectory
 * @param {number} distAU     total distance of the leg (AU)
 * @param {number} fTarget    distance fraction in [0, 1]
 * @returns {number} τ in [0, 1]
 */
export function tauAtDistanceFraction(trajectory, distAU, fTarget) {
  const T  = trajectory.coordTimeDays;
  const α  = trajectory.accelTimeDays / T;
  const fA = trajectory.accelDistAU   / distAU;
  const φ  = trajectory.isCapped
    ? trajectory.cruiseTimeDays / T
    : (trajectory.flipTimeDays || 0) / T;

  if (fTarget <= fA)      return α * Math.sqrt(fTarget / fA);          // accel
  if (fTarget <= 1 - fA)  return α + φ * (fTarget - fA) / (1 - 2 * fA); // flip/cruise
  const tDecel = 1 - Math.sqrt((1 - fTarget) / fA);                    // decel
  return α + φ + α * tDecel;
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

// ── Detailed rocket (close-up launch view) ────────────────────────────────────
// A metallic side-profile ship: large faceted front module, a long cylindrical
// mid-section with greebles, a lattice truss, and a rear engine cluster whose
// nozzles emit the exhaust plume.  Drawn nose-first along `heading`, sized so the
// full body (nose to nozzle mouth) spans `len` screen pixels.

function metalGrad(ctx, hw) {
  // Left-lit metallic cylinder: dark edge → bright highlight → mid → dark edge.
  const g = ctx.createLinearGradient(-hw, 0, hw, 0);
  g.addColorStop(0.00, '#20232b');
  g.addColorStop(0.13, '#4e545f');
  g.addColorStop(0.30, '#bcc5d1');
  g.addColorStop(0.42, '#eef2f8');
  g.addColorStop(0.55, '#a6aeba');
  g.addColorStop(0.74, '#565d68');
  g.addColorStop(1.00, '#1b1e25');
  return g;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

export function drawDetailedRocket(ctx, sx, sy, len, heading, thrusting = true) {
  const L        = len;
  const bodyR    = L * 0.12;   // mid-section half-width
  const frontHW  = L * 0.215;  // front module half-width (larger)
  const trussHW  = L * 0.095;
  const seam     = 'rgba(18, 20, 26, 0.6)';
  const lw       = Math.max(0.4, L * 0.006);

  // Body-axis y positions (local frame: nose up at -y, engines at +y).
  const yNose   = -0.50 * L;
  const yFrontB = -0.27 * L;
  const yMidT   = -0.20 * L;
  const yMidB   =  0.16 * L;
  const yTrussB =  0.30 * L;
  const yEngB   =  0.42 * L;
  const yMouth  =  0.50 * L;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(heading + Math.PI / 2);   // local nose (up) → heading
  ctx.lineJoin = 'round';

  // ── Exhaust plume (behind everything) ──
  if (thrusting) {
    const plumeLen = L * 0.5;
    const g = ctx.createLinearGradient(0, yMouth, 0, yMouth + plumeLen);
    g.addColorStop(0,    'rgba(210, 235, 255, 0.95)');
    g.addColorStop(0.18, 'rgba(150, 205, 255, 0.80)');
    g.addColorStop(0.55, 'rgba(90,  150, 255, 0.35)');
    g.addColorStop(1,    'rgba(70,  110, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.7, yMouth);
    ctx.lineTo( bodyR * 0.7, yMouth);
    ctx.lineTo(0, yMouth + plumeLen);
    ctx.closePath();
    ctx.fill();
    const cg = ctx.createLinearGradient(0, yMouth, 0, yMouth + plumeLen * 0.45);
    cg.addColorStop(0, 'rgba(255,255,255,0.95)');
    cg.addColorStop(1, 'rgba(210,235,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.3, yMouth);
    ctx.lineTo( bodyR * 0.3, yMouth);
    ctx.lineTo(0, yMouth + plumeLen * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  // ── Engine mount (connects truss to the nozzle cluster) ──
  ctx.fillStyle = metalGrad(ctx, bodyR * 1.05);
  ctx.beginPath();
  ctx.moveTo(-trussHW,       yTrussB);
  ctx.lineTo( trussHW,       yTrussB);
  ctx.lineTo( bodyR * 1.05,  yEngB);
  ctx.lineTo(-bodyR * 1.05,  yEngB);
  ctx.closePath();
  ctx.fill();

  // ── Engine cluster: three nozzles ──
  const nz = [-bodyR * 0.62, 0, bodyR * 0.62];
  for (const cx of nz) {
    const throat = bodyR * 0.28, mouth = bodyR * 0.46;
    ctx.fillStyle = metalGrad(ctx, mouth);
    ctx.save();
    ctx.translate(cx, 0);
    ctx.beginPath();
    ctx.moveTo(-throat, yEngB);
    ctx.lineTo( throat, yEngB);
    ctx.lineTo( mouth,  yMouth);
    ctx.lineTo(-mouth,  yMouth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';   // dark throat
    ctx.beginPath();
    ctx.ellipse(0, yMouth, mouth * 0.8, bodyR * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Truss section (lattice around a thin spine) ──
  ctx.fillStyle = '#2a2e37';
  roundRect(ctx, -trussHW * 0.35, yMidB, trussHW * 0.7, yTrussB - yMidB, 0);
  ctx.fill();
  ctx.strokeStyle = '#9aa3b0';
  ctx.lineWidth = lw;
  const rungs = 4, seg = (yTrussB - yMidB) / rungs;
  ctx.beginPath();
  for (let i = 0; i < rungs; i++) {
    const y0 = yMidB + i * seg, y1 = y0 + seg;
    ctx.moveTo(-trussHW, y0); ctx.lineTo(trussHW, y1);
    ctx.moveTo( trussHW, y0); ctx.lineTo(-trussHW, y1);
  }
  ctx.moveTo(-trussHW, yMidB); ctx.lineTo(-trussHW, yTrussB);
  ctx.moveTo( trussHW, yMidB); ctx.lineTo( trussHW, yTrussB);
  ctx.stroke();

  // ── Mid cylindrical section ──
  ctx.fillStyle = metalGrad(ctx, bodyR);
  roundRect(ctx, -bodyR, yMidT, bodyR * 2, yMidB - yMidT, bodyR * 0.12);
  ctx.fill();
  // ring bands + panel seams
  ctx.strokeStyle = seam;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 1; i <= 3; i++) {
    const y = yMidT + (yMidB - yMidT) * (i / 4);
    ctx.moveTo(-bodyR, y); ctx.lineTo(bodyR, y);
  }
  ctx.moveTo(-bodyR * 0.45, yMidT); ctx.lineTo(-bodyR * 0.45, yMidB);
  ctx.moveTo( bodyR * 0.45, yMidT); ctx.lineTo( bodyR * 0.45, yMidB);
  ctx.stroke();
  // greebles: a mast on the right, a module box on the left
  ctx.fillStyle = '#6b727d';
  roundRect(ctx, bodyR * 0.9, yMidT + (yMidB - yMidT) * 0.28, L * 0.02, L * 0.14, lw);
  ctx.fill();
  ctx.fillStyle = metalGrad(ctx, L * 0.05);
  ctx.save();
  ctx.translate(-bodyR - L * 0.035, yMidT + (yMidB - yMidT) * 0.55);
  roundRect(ctx, -L * 0.045, -L * 0.05, L * 0.09, L * 0.1, lw);
  ctx.fill();
  ctx.restore();

  // ── Neck / adapter to the front module ──
  ctx.fillStyle = metalGrad(ctx, frontHW);
  ctx.beginPath();
  ctx.moveTo(-bodyR, yMidT);
  ctx.lineTo( bodyR, yMidT);
  ctx.lineTo( frontHW * 0.8, yFrontB);
  ctx.lineTo(-frontHW * 0.8, yFrontB);
  ctx.closePath();
  ctx.fill();

  // ── Front module (large, faceted) ──
  const chamf = frontHW * 0.4;
  ctx.fillStyle = metalGrad(ctx, frontHW);
  ctx.beginPath();
  ctx.moveTo(-frontHW * 0.85, yFrontB);
  ctx.lineTo( frontHW * 0.85, yFrontB);
  ctx.lineTo( frontHW,        yFrontB - (yFrontB - yNose) * 0.35);
  ctx.lineTo( frontHW * 0.6,  yNose + chamf * 0.2);
  ctx.lineTo( frontHW * 0.28, yNose);
  ctx.lineTo(-frontHW * 0.28, yNose);
  ctx.lineTo(-frontHW * 0.6,  yNose + chamf * 0.2);
  ctx.lineTo(-frontHW,        yFrontB - (yFrontB - yNose) * 0.35);
  ctx.closePath();
  ctx.fill();
  // outline for crisp facets
  ctx.strokeStyle = 'rgba(15,17,22,0.7)';
  ctx.lineWidth = lw;
  ctx.stroke();
  // cockpit window band + hatch details
  const wy = yFrontB - (yFrontB - yNose) * 0.55;
  const wg = ctx.createLinearGradient(0, wy - L * 0.02, 0, wy + L * 0.02);
  wg.addColorStop(0, 'rgba(120,200,255,0.15)');
  wg.addColorStop(0.5, 'rgba(150,220,255,0.9)');
  wg.addColorStop(1, 'rgba(90,150,230,0.2)');
  ctx.fillStyle = wg;
  roundRect(ctx, -frontHW * 0.62, wy - L * 0.018, frontHW * 1.24, L * 0.036, L * 0.015);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,24,32,0.55)';
  for (const hx of [-frontHW * 0.4, frontHW * 0.05]) {
    roundRect(ctx, hx, yFrontB - L * 0.05, frontHW * 0.34, L * 0.038, lw * 1.5);
    ctx.fill();
  }

  ctx.restore();
}
