import { worldToScreen, screenToWorld } from './camera.js';
import { planetPosition } from '../physics/kepler.js';

/** Minimum dot radius in px regardless of zoom */
const MIN_RADIUS = 3;

/** Pixels between the dot edge and the label baseline */
const LABEL_OFFSET = 7;

/** Hit-test radius in px — slightly larger than the dot for easier hover */
const HIT_RADIUS = 10;

/**
 * Draw a single planet dot with a radial glow and label.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} cam
 * @param {object} planet   - entry from PLANETS array
 * @param {number} T        - Julian centuries since J2000.0
 * @param {boolean} hovered - draw highlight ring when true
 */
export function drawPlanet(ctx, cam, planet, T, hovered = false) {
  const pos = planetPosition(planet, T);
  const { sx, sy } = worldToScreen(cam, pos.x, pos.y);
  const r = Math.max(MIN_RADIUS, planet.radiusPx);

  ctx.save();

  // Glow
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
  glow.addColorStop(0,   planet.color);
  glow.addColorStop(0.5, planet.color + '66');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Solid dot
  ctx.fillStyle = planet.color;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();

  // Hover ring
  if (hovered) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label
  const fontSize = 11;
  ctx.font        = `${fontSize}px var(--font-sans, system-ui)`;
  ctx.fillStyle   = hovered ? '#ffffff' : planet.color;
  ctx.globalAlpha = hovered ? 1 : 0.75;
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(planet.name, sx + r + LABEL_OFFSET, sy);

  ctx.restore();
}

/**
 * Draw all planets.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object}   cam
 * @param {object[]} planets
 * @param {number}   T
 * @param {string|null} hoveredName - name of the planet currently hovered
 */
export function drawAllPlanets(ctx, cam, planets, T, hoveredName = null) {
  for (const planet of planets) {
    drawPlanet(ctx, cam, planet, T, planet.name === hoveredName);
  }
}

/**
 * Return the name of the planet whose dot is closest to screen point (sx, sy),
 * or null if none is within HIT_RADIUS pixels.
 *
 * @param {object}   cam
 * @param {object[]} planets
 * @param {number}   T
 * @param {number}   sx  - screen X (px)
 * @param {number}   sy  - screen Y (px)
 * @returns {string|null}
 */
export function hitTestPlanet(cam, planets, T, sx, sy) {
  let closest = null;
  let minDist  = HIT_RADIUS;

  for (const planet of planets) {
    const pos = planetPosition(planet, T);
    const screen = worldToScreen(cam, pos.x, pos.y);
    const dist = Math.hypot(screen.sx - sx, screen.sy - sy);
    if (dist < minDist) {
      minDist = dist;
      closest = planet.name;
    }
  }

  return closest;
}
