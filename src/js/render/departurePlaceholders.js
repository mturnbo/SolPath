import { worldToScreen } from './camera.js';

export function drawDeparturePlaceholders(ctx, cam, mission, tau) {
  if (!mission || tau <= 0) return;

  const { originPlanet, destPlanet, departurePos, currentDestPos } = mission;
  drawGhost(ctx, cam, departurePos,    originPlanet, 'departure');
  drawGhost(ctx, cam, currentDestPos,  destPlanet,   'at departure');
}

function drawGhost(ctx, cam, pos, planet, label) {
  const { sx, sy } = worldToScreen(cam, pos.x, pos.y);
  const r = Math.max(3, planet.radiusPx);

  ctx.save();

  // Dimmed fill dot
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = planet.color;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();

  // Dashed ring
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = planet.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = planet.color;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${planet.name} (${label})`, sx, sy + r + 6);

  ctx.restore();
}
