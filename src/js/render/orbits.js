import { worldToScreen } from './camera.js';

const TWO_PI = Math.PI * 2;

/**
 * Number of line segments used to approximate one orbit ellipse.
 * Higher = smoother, lower = faster. 180 is imperceptible at normal zoom.
 */
const SEGMENTS = 180;

/**
 * Compute the heliocentric XY points (AU) that trace a planet's elliptical
 * orbit. Uses the orbital elements directly (no Kepler solve needed — we
 * just walk true anomaly from 0 to 2π).
 *
 * @param {object} planet  - entry from PLANETS array
 * @param {number} T       - Julian centuries since J2000.0 (for secular drift)
 * @returns {Array<{x: number, y: number}>} SEGMENTS+1 points in AU
 */
export function orbitPoints(planet, T) {
  const a   = planet.a   + planet.aRate   * T;
  const e   = planet.e   + planet.eRate   * T;
  const lp  = planet.lp  + planet.lpRate  * T;
  const lan = planet.lan + planet.lanRate * T;
  const inc = planet.i   + planet.iRate   * T;

  const DEG = Math.PI / 180;
  const omega = (lp - lan) * DEG;
  const Omega = lan * DEG;
  const I     = inc * DEG;

  const cosOmega = Math.cos(omega), sinOmega = Math.sin(omega);
  const cosOmegaU = Math.cos(Omega), sinOmegaU = Math.sin(Omega);
  const cosI = Math.cos(I);

  const points = [];
  for (let k = 0; k <= SEGMENTS; k++) {
    const nu = (k / SEGMENTS) * TWO_PI;
    const r  = a * (1 - e * e) / (1 + e * Math.cos(nu));

    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    const x = (cosOmega * cosOmegaU - sinOmega * sinOmegaU * cosI) * xOrb
            + (-sinOmega * cosOmegaU - cosOmega * sinOmegaU * cosI) * yOrb;
    const y = (cosOmega * sinOmegaU + sinOmega * cosOmegaU * cosI) * xOrb
            + (-sinOmega * sinOmegaU + cosOmega * cosOmegaU * cosI) * yOrb;

    points.push({ x, y });
  }
  return points;
}

/**
 * Draw a single planet's orbit onto the canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam     - camera state
 * @param {object} planet  - entry from PLANETS array
 * @param {number} T       - Julian centuries since J2000.0
 * @param {object} [opts]
 * @param {number} [opts.alpha=0.35]       - stroke opacity
 * @param {number} [opts.lineWidth=1]      - stroke width in px
 */
export function drawOrbit(ctx, cam, planet, T, opts = {}) {
  const { alpha = 0.35, lineWidth = 1 } = opts;
  const points = orbitPoints(planet, T);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = planet.color;
  ctx.lineWidth   = lineWidth;
  ctx.setLineDash([]);

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const { sx, sy } = worldToScreen(cam, points[i].x, points[i].y);
    if (i === 0) ctx.moveTo(sx, sy);
    else         ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw all planet orbits.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object}   cam
 * @param {object[]} planets - PLANETS array
 * @param {number}   T
 * @param {object}   [opts]  - passed through to drawOrbit
 */
export function drawAllOrbits(ctx, cam, planets, T, opts = {}) {
  for (const planet of planets) {
    drawOrbit(ctx, cam, planet, T, opts);
  }
}
