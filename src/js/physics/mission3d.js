import { toJ2000Century, addDays, formatDate } from './epoch.js';
import { planetPosition } from './kepler.js';
import {
  solveBrachistochrone, distance3D,
  closestSolarApproach3D, findSolarDetour3D, SOLAR_EXCLUSION_AU,
} from './trajectory.js';

// 3D counterpart of mission.js. Positions, directions and the waypoint carry a
// z component, and the result includes `pathPoints` (a 3D polyline) for the
// WebGL renderer. The scalar brachistochrone solver is reused unchanged.

function z(p) { return p.z ?? 0; }

function unitVec(A, B) {
  const dx = B.x - A.x, dy = B.y - A.y, dz = z(B) - z(A);
  const d  = Math.hypot(dx, dy, dz);
  return { nx: dx / d, ny: dy / d, nz: dz / d };
}

function along(A, dir, dist) {
  return {
    x: A.x + dir.nx * dist,
    y: A.y + dir.ny * dist,
    z: z(A) + dir.nz * dist,
  };
}

export function computeMission3D(originPlanet, destPlanet, departureDate, accelG, detourMode = 'stop') {
  const T_depart       = toJ2000Century(departureDate);
  const departurePos   = planetPosition(originPlanet, T_depart);
  const currentDestPos = planetPosition(destPlanet,   T_depart);

  const { distAU: solarDist } = closestSolarApproach3D(departurePos, currentDestPos);
  const isRerouted = solarDist < SOLAR_EXCLUSION_AU;

  const args = [originPlanet, destPlanet, departureDate, accelG, T_depart, departurePos, currentDestPos];
  if (!isRerouted) return computeDirect(...args);
  if (detourMode === 'arc') return computeReroutedArc(...args);
  return computeRerouted(...args);
}

// ── Direct (straight-line) brachistochrone ───────────────────────────────────

function computeDirect(originPlanet, destPlanet, departureDate, accelG, T_depart, departurePos, currentDestPos) {
  const distEst = distance3D(departurePos, currentDestPos);
  const trajEst = solveBrachistochrone(distEst, accelG);
  const arrDateEst = addDays(departureDate, trajEst.coordTimeDays);
  const arrPosEst  = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  const distAU     = distance3D(departurePos, arrPosEst);
  const trajectory = solveBrachistochrone(distAU, accelG);

  const arrivalDate = addDays(departureDate, trajectory.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);
  const dir         = unitVec(departurePos, arrivalPos);
  const midpointPos = along(departurePos, dir, trajectory.flipDistAU);

  return {
    originPlanet, destPlanet, departureDate, accelG,
    arrivalDate, arrivalDateStr: formatDate(arrivalDate),
    T_depart, T_arrive,
    departurePos, arrivalPos, currentDestPos,
    distAU, trajectory, midpointPos, direction: dir,
    isRerouted: false, waypoint: null,
    pathPoints: [departurePos, arrivalPos],
  };
}

// ── Rerouted (two-leg) brachistochrone via solar exclusion sphere ─────────────

function computeRerouted(originPlanet, destPlanet, departureDate, accelG, T_depart, departurePos, currentDestPos) {
  const wp0 = findSolarDetour3D(departurePos, currentDestPos, SOLAR_EXCLUSION_AU);
  const t1est = solveBrachistochrone(distance3D(departurePos, wp0), accelG);
  const t2est = solveBrachistochrone(distance3D(wp0, currentDestPos), accelG);
  const arrDateEst = addDays(departureDate, t1est.coordTimeDays + t2est.coordTimeDays);
  const arrPosEst  = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  const waypoint = findSolarDetour3D(departurePos, arrPosEst, SOLAR_EXCLUSION_AU);
  const d1 = distance3D(departurePos, waypoint);
  const d2 = distance3D(waypoint, arrPosEst);
  const leg1 = solveBrachistochrone(d1, accelG);
  const leg2 = solveBrachistochrone(d2, accelG);

  const arrivalDate = addDays(departureDate, leg1.coordTimeDays + leg2.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);

  const dir1 = unitVec(departurePos, waypoint);
  const dir2 = unitVec(waypoint, arrivalPos);

  const trajectory = {
    coordTimeDays:  leg1.coordTimeDays  + leg2.coordTimeDays,
    shipTimeDays:   leg1.shipTimeDays   + leg2.shipTimeDays,
    maxSpeedC:      Math.max(leg1.maxSpeedC, leg2.maxSpeedC),
    isCapped:       leg1.isCapped || leg2.isCapped,
    deltaVKms:      leg1.deltaVKms + leg2.deltaVKms,
    flipDistAU:     leg1.flipDistAU,
    accelTimeDays:  leg1.accelTimeDays,
    cruiseTimeDays: leg1.cruiseTimeDays + leg2.cruiseTimeDays,
    accelDistAU:    leg1.accelDistAU,
  };

  return {
    originPlanet, destPlanet, departureDate, accelG,
    arrivalDate, arrivalDateStr: formatDate(arrivalDate),
    T_depart, T_arrive,
    departurePos, arrivalPos, currentDestPos,
    distAU: d1 + d2, trajectory,
    midpointPos: along(departurePos, dir1, leg1.flipDistAU),
    direction: dir1,
    isRerouted: true, isSmooth: false,
    waypoint, leg1, leg2, leg1DistAU: d1, leg2DistAU: d2,
    direction1: dir1, direction2: dir2,
    pathPoints: [departurePos, waypoint, arrivalPos],
  };
}

// ── Rerouted smooth arc — single brachistochrone over the detour path ─────────

function computeReroutedArc(originPlanet, destPlanet, departureDate, accelG, T_depart, departurePos, currentDestPos) {
  const wp0 = findSolarDetour3D(departurePos, currentDestPos, SOLAR_EXCLUSION_AU);
  const d1est = distance3D(departurePos, wp0);
  const d2est = distance3D(wp0, currentDestPos);
  const trajEst = solveBrachistochrone(d1est + d2est, accelG);
  const arrDateEst = addDays(departureDate, trajEst.coordTimeDays);
  const arrPosEst  = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  const waypoint = findSolarDetour3D(departurePos, arrPosEst, SOLAR_EXCLUSION_AU);
  const d1 = distance3D(departurePos, waypoint);
  const d2 = distance3D(waypoint, arrPosEst);
  const d_total = d1 + d2;
  const trajectory = solveBrachistochrone(d_total, accelG);

  const arrivalDate = addDays(departureDate, trajectory.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);

  const dir1 = unitVec(departurePos, waypoint);
  const dir2 = unitVec(waypoint, arrivalPos);

  // Flip point along the two-segment path A→W→B.
  const flipDist = trajectory.flipDistAU;
  let midpointPos;
  if (flipDist <= d1) {
    midpointPos = along(departurePos, dir1, flipDist);
  } else {
    midpointPos = along(waypoint, dir2, flipDist - d1);
  }

  return {
    originPlanet, destPlanet, departureDate, accelG,
    arrivalDate, arrivalDateStr: formatDate(arrivalDate),
    T_depart, T_arrive,
    departurePos, arrivalPos, currentDestPos,
    distAU: d_total, trajectory, midpointPos, direction: dir1,
    isRerouted: true, isSmooth: true,
    waypoint, leg1DistAU: d1, leg2DistAU: d2,
    direction1: dir1, direction2: dir2,
    pathPoints: [departurePos, waypoint, arrivalPos],
  };
}
