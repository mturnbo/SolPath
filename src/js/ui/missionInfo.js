import { formatDuration, formatSpeedC } from '../physics/trajectory.js';
import { formatDate } from '../physics/epoch.js';

export function renderMissionInfo(mission) {
  const panel = document.getElementById('mission-info-panel');
  if (!panel) return;

  if (!mission) {
    panel.innerHTML = '<p class="info-empty">No mission computed.</p>';
    return;
  }

  const { originPlanet, destPlanet, departureDate, arrivalDateStr,
          distAU, accelG, trajectory } = mission;

  const { coordTimeDays, shipTimeDays, maxSpeedC, isCapped,
          flipDistAU, accelTimeDays, cruiseTimeDays, deltaVKms } = trajectory;

  const deltaVStr = deltaVKms >= 1000
    ? `${(deltaVKms / 1000).toFixed(2)} Mm/s`
    : `${deltaVKms.toFixed(0)} km/s`;

  const capBadge = isCapped
    ? `<span class="info-badge info-badge--warn" title="Speed limit of 10% c reached — cruise phase added">10% c cap active</span>`
    : '';

  const detourBadge = mission.isRerouted
    ? `<span class="info-badge info-badge--detour" title="Path rerouted around the solar exclusion zone (0.35 AU)">solar detour</span>`
    : '';

  const detourRows = mission.isRerouted
    ? `<div class="info-row">
         <span class="info-key">Leg 1</span>
         <span class="info-val">${mission.leg1DistAU.toFixed(3)} AU · ${formatDuration(mission.leg1.coordTimeDays)}</span>
       </div>
       <div class="info-row">
         <span class="info-key">Leg 2</span>
         <span class="info-val">${mission.leg2DistAU.toFixed(3)} AU · ${formatDuration(mission.leg2.coordTimeDays)}</span>
       </div>`
    : '';

  const comfortWarn = accelG > 1.2
    ? `<div class="info-comfort-warn">&#9888; ${accelG.toFixed(2)} g exceeds sustained human comfort (≤ 1.2 g)</div>`
    : '';

  const cruiseRow = isCapped
    ? `<div class="info-row">
         <span class="info-key">Cruise phase</span>
         <span class="info-val">${formatDuration(cruiseTimeDays)} at ${formatSpeedC(maxSpeedC)}</span>
       </div>`
    : '';

  panel.innerHTML = `
    ${comfortWarn}
    <div class="info-route">
      <span class="info-origin" style="color:${originPlanet.color}">${originPlanet.name}</span>
      <span class="info-arrow">→</span>
      <span class="info-dest" style="color:${destPlanet.color}">${destPlanet.name}</span>
      ${capBadge}${detourBadge}
    </div>

    <div class="info-divider"></div>

    <div class="info-row">
      <span class="info-key">Departure</span>
      <span class="info-val">${formatDate(departureDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Arrival</span>
      <span class="info-val info-val--accent">${arrivalDateStr}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Distance</span>
      <span class="info-val">${distAU.toFixed(3)} AU</span>
    </div>
    ${detourRows}

    <div class="info-divider"></div>

    <div class="info-row">
      <span class="info-key">Observer time</span>
      <span class="info-val">${formatDuration(coordTimeDays)}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Ship time</span>
      <span class="info-val info-val--ship">${formatDuration(shipTimeDays)}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Accel phase</span>
      <span class="info-val">${formatDuration(accelTimeDays)} × 2</span>
    </div>
    ${cruiseRow}

    <div class="info-divider"></div>

    <div class="info-row">
      <span class="info-key">Acceleration</span>
      <span class="info-val">${accelG.toFixed(2)} g</span>
    </div>
    <div class="info-row">
      <span class="info-key">Peak speed</span>
      <span class="info-val">${formatSpeedC(maxSpeedC)}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Flip point</span>
      <span class="info-val">${flipDistAU.toFixed(3)} AU from ${originPlanet.name}</span>
    </div>
    <div class="info-row">
      <span class="info-key">Total Δv</span>
      <span class="info-val">${deltaVStr}</span>
    </div>
  `;
}
