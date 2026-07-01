import { toJ2000Century, addDays, formatDate } from './epoch.js';
import { planetPosition } from './kepler.js';
import { solveBrachistochrone, distanceAU } from './trajectory.js';

/**
 * Compute all state needed to describe a one-way mission between two planets.
 *
 * The trajectory is a brachistochrone (flip-and-burn) path. Planet positions
 * are evaluated at the departure date for the origin and at the computed
 * arrival date for the destination — i.e. we aim at where the target planet
 * will be, not where it is now.
 *
 * @param {object} originPlanet      - entry from PLANETS array
 * @param {object} destPlanet        - entry from PLANETS array
 * @param {Date}   departureDate
 * @param {number} accelG            - constant acceleration in g (0.5 – 2)
 * @returns {MissionState}
 *
 * @typedef {object} MissionState
 * @property {object} originPlanet
 * @property {object} destPlanet
 * @property {Date}   departureDate
 * @property {Date}   arrivalDate
 * @property {string} arrivalDateStr  - ISO "YYYY-MM-DD"
 * @property {number} accelG
 * @property {number} T_depart        - J2000 centuries at departure
 * @property {number} T_arrive        - J2000 centuries at arrival
 * @property {{ x: number, y: number }} departurePos  - origin at departure (AU)
 * @property {{ x: number, y: number }} arrivalPos    - destination at arrival (AU)
 * @property {{ x: number, y: number }} currentDestPos - destination right now (AU)
 * @property {number} distAU          - straight-line departure→arrival distance
 * @property {object} trajectory      - result from solveBrachistochrone
 * @property {{ x: number, y: number }} midpointPos   - flip point in world space
 * @property {{ nx: number, ny: number }} direction   - unit vector departure→arrival
 */
export function computeMission(originPlanet, destPlanet, departureDate, accelG) {
  const T_depart = toJ2000Century(departureDate);

  const departurePos    = planetPosition(originPlanet, T_depart);
  const currentDestPos  = planetPosition(destPlanet,   T_depart);

  // First-pass: estimate distance using current positions to get flight time
  const distEstimate = distanceAU(departurePos, currentDestPos);
  const trajEstimate = solveBrachistochrone(distEstimate, accelG);

  // Refine: compute destination position at the estimated arrival date
  const arrivalDateEst = addDays(departureDate, trajEstimate.coordTimeDays);
  const T_arriveEst    = toJ2000Century(arrivalDateEst);
  const arrivalPosEst  = planetPosition(destPlanet, T_arriveEst);

  // Second-pass: use the refined distance for the final trajectory
  const distAU    = distanceAU(departurePos, arrivalPosEst);
  const trajectory = solveBrachistochrone(distAU, accelG);

  const arrivalDate    = addDays(departureDate, trajectory.coordTimeDays);
  const T_arrive       = toJ2000Century(arrivalDate);
  const arrivalPos     = planetPosition(destPlanet, T_arrive);

  // Direction unit vector from departure to arrival
  const dx   = arrivalPos.x - departurePos.x;
  const dy   = arrivalPos.y - departurePos.y;
  const dist = Math.hypot(dx, dy);
  const nx   = dx / dist;
  const ny   = dy / dist;

  // Flip point: departure + accelDistAU along the direction vector
  const midpointPos = {
    x: departurePos.x + nx * trajectory.flipDistAU,
    y: departurePos.y + ny * trajectory.flipDistAU,
  };

  return {
    originPlanet,
    destPlanet,
    departureDate,
    arrivalDate,
    arrivalDateStr: formatDate(arrivalDate),
    accelG,
    T_depart,
    T_arrive,
    departurePos,
    arrivalPos,
    currentDestPos,
    distAU,
    trajectory,
    midpointPos,
    direction: { nx, ny },
  };
}
