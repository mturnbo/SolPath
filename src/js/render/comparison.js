import { worldToScreen } from './camera.js';

/**
 * Color assigned to each comparison acceleration value.
 * These are chosen to be distinct from each other and from planet colors.
 */
export const COMPARISON_COLORS = {
  0.5: '#f0a030',   // amber
  1.0: '#4a90e2',   // blue (matches default trajectory)
  1.5: '#c060e0',   // purple
  2.0: '#30d0a0',   // teal
};

/**
 * Draw all comparison trajectories onto the canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object}   cam
 * @param {object[]} missions  - array of MissionState (one per accel value)
 */
export function drawComparisonTrajectories(ctx, cam, missions) {
  for (const mission of missions) {
    drawComparisonPath(ctx, cam, mission);
  }
}

function drawComparisonPath(ctx, cam, mission) {
  const { departurePos, arrivalPos, midpointPos, accelG } = mission;
  const color = COMPARISON_COLORS[accelG] ?? '#ffffff';

  const dep  = worldToScreen(cam, departurePos.x, departurePos.y);
  const flip = worldToScreen(cam, midpointPos.x,  midpointPos.y);
  const arr  = worldToScreen(cam, arrivalPos.x,   arrivalPos.y);

  ctx.save();

  // Accel leg — solid
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.75;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(dep.sx,  dep.sy);
  ctx.lineTo(flip.sx, flip.sy);
  ctx.stroke();

  // Decel leg — dashed
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(flip.sx, flip.sy);
  ctx.lineTo(arr.sx,  arr.sy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrival dot
  ctx.globalAlpha  = 0.9;
  ctx.strokeStyle  = color;
  ctx.lineWidth    = 1.5;
  ctx.fillStyle    = 'transparent';
  ctx.beginPath();
  ctx.arc(arr.sx, arr.sy, Math.max(3, mission.destPlanet.radiusPx), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a legend in the top-left corner of the canvas listing each accel
 * value, its trajectory color, and the computed flight time.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number}   canvasW
 * @param {object[]} missions  - array of MissionState (same order as colors)
 */
export function drawComparisonLegend(ctx, canvasW, missions) {
  if (missions.length === 0) return;

  const PAD    = 14;
  const LINE_H = 20;
  const SWATCH = 24;
  const W      = 190;
  const H      = PAD + missions.length * LINE_H + PAD;
  const X      = 16;
  const Y      = 16;

  ctx.save();

  // Background
  ctx.fillStyle   = 'rgba(10, 10, 18, 0.78)';
  ctx.strokeStyle = '#1e1e36';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.roundRect(X, Y, W, H, 6);
  ctx.fill();
  ctx.stroke();

  // Rows
  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];
    const { accelG, trajectory } = mission;
    const color   = COMPARISON_COLORS[accelG] ?? '#ffffff';
    const rowY    = Y + PAD + i * LINE_H;

    // Swatch line
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(X + 8,          rowY + LINE_H / 2);
    ctx.lineTo(X + 8 + SWATCH, rowY + LINE_H / 2);
    ctx.stroke();

    // Label: "1.0 g — 75d 12h"
    const days = trajectory.coordTimeDays;
    const timeStr = formatLegendTime(days);
    const label   = `${accelG.toFixed(1)} g — ${timeStr}`;

    ctx.font        = '11px var(--font-mono, monospace)';
    ctx.fillStyle   = color;
    ctx.globalAlpha = 0.9;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, X + 8 + SWATCH + 6, rowY + LINE_H / 2);
  }

  ctx.restore();
}

function formatLegendTime(days) {
  if (days < 1) {
    const h = Math.round(days * 24);
    return `${h}h`;
  }
  if (days < 365.25) {
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  const y = Math.floor(days / 365.25);
  const d = Math.round(days % 365.25);
  return d > 0 ? `${y}y ${d}d` : `${y}y`;
}
