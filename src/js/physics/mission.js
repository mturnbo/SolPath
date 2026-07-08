import { toJ2000Century, addDays, formatDate } from './epoch.js';
import { planetPosition } from './kepler.js';
import {
  solveBrachistochrone, distanceAU,
  closestSolarApproach, findSolarDetour, SOLAR_EXCLUSION_AU,
} from './trajectory.js';

function unitVec(A, B) {
  const dx = B.x - A.x, dy = B.y - A.y;
  const d  = Math.hypot(dx, dy);
  return { nx: dx / d, ny: dy / d };
}

export function computeMission(originPlanet, destPlanet, departureDate, accelG, detourMode = 'stop') {
  const T_depart       = toJ2000Century(departureDate);
  const departurePos   = planetPosition(originPlanet, T_depart);
  const currentDestPos = planetPosition(destPlanet,   T_depart);

  // ── Check whether the direct path enters the solar exclusion zone ─────────
  const { distAU: solarDist } = closestSolarApproach(departurePos, currentDestPos);
  const isRerouted = solarDist < SOLAR_EXCLUSION_AU;

  if (!isRerouted) {
    return computeDirect(
      originPlanet, destPlanet, departureDate, accelG,
      T_depart, departurePos, currentDestPos,
    );
  }

  if (detourMode === 'arc') {
    return computeReroutedArc(
      originPlanet, destPlanet, departureDate, accelG,
      T_depart, departurePos, currentDestPos,
    );
  }

  return computeRerouted(
    originPlanet, destPlanet, departureDate, accelG,
    T_depart, departurePos, currentDestPos,
  );
}

// ── Direct (straight-line) brachistochrone ───────────────────────────────────

function computeDirect(
  originPlanet, destPlanet, departureDate, accelG,
  T_depart, departurePos, currentDestPos,
) {
  // First-pass estimate
  const distEst  = distanceAU(departurePos, currentDestPos);
  const trajEst  = solveBrachistochrone(distEst, accelG);

  // Refine with destination at estimated arrival
  const arrDateEst  = addDays(departureDate, trajEst.coordTimeDays);
  const arrPosEst   = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  // Final trajectory
  const distAU    = distanceAU(departurePos, arrPosEst);
  const trajectory = solveBrachistochrone(distAU, accelG);

  const arrivalDate = addDays(departureDate, trajectory.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);
  const dir         = unitVec(departurePos, arrivalPos);

  return {
    originPlanet, destPlanet, departureDate, accelG,
    arrivalDate, arrivalDateStr: formatDate(arrivalDate),
    T_depart, T_arrive,
    departurePos, arrivalPos, currentDestPos,
    distAU, trajectory,
    midpointPos: {
      x: departurePos.x + dir.nx * trajectory.flipDistAU,
      y: departurePos.y + dir.ny * trajectory.flipDistAU,
    },
    direction: dir,
    isRerouted: false,
    waypoint: null,
  };
}

// ── Rerouted (two-leg) brachistochrone via solar exclusion tangent ────────────

function computeRerouted(
  originPlanet, destPlanet, departureDate, accelG,
  T_depart, departurePos, currentDestPos,
) {
  // Waypoint W on the exclusion circle (fixed in space, independent of planets)
  const waypoint = findSolarDetour(departurePos, currentDestPos, SOLAR_EXCLUSION_AU);

  // Leg-1 distance (departure → W) is fixed; estimate total time for refinement
  const d1 = distanceAU(departurePos, waypoint);
  const t1est = solveBrachistochrone(d1, accelG);

  const d2est   = distanceAU(waypoint, currentDestPos);
  const t2est   = solveBrachistochrone(d2est, accelG);
  const totalEst = t1est.coordTimeDays + t2est.coordTimeDays;

  // Refine leg-2 destination with planet position at estimated arrival
  const arrDateEst = addDays(departureDate, totalEst);
  const arrPosEst  = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  const d2   = distanceAU(waypoint, arrPosEst);
  const leg1 = solveBrachistochrone(d1, accelG);
  const leg2 = solveBrachistochrone(d2, accelG);

  const arrivalDate = addDays(departureDate, leg1.coordTimeDays + leg2.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);

  const dir1 = unitVec(departurePos, waypoint);
  const dir2 = unitVec(waypoint, arrivalPos);

  // Combined trajectory summary (compatible with existing UI consumers)
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
    distAU: d1 + d2,
    trajectory,
    // For drawDepartureMarker / drawArrivalOverlay (leg-1 flip)
    midpointPos: {
      x: departurePos.x + dir1.nx * leg1.flipDistAU,
      y: departurePos.y + dir1.ny * leg1.flipDistAU,
    },
    direction: dir1,
    // Reroute fields
    isRerouted: true,
    isSmooth: false,
    waypoint,
    leg1, leg2,
    leg1DistAU: d1,
    leg2DistAU: d2,
    direction1: dir1,
    direction2: dir2,
  };
}

// ── Rerouted smooth arc — single brachistochrone over the detour path ─────────

function computeReroutedArc(
  originPlanet, destPlanet, departureDate, accelG,
  T_depart, departurePos, currentDestPos,
) {
  const waypoint = findSolarDetour(departurePos, currentDestPos, SOLAR_EXCLUSION_AU);
  const d1 = distanceAU(departurePos, waypoint);

  // Estimate total path length for destination refinement
  const d2est    = distanceAU(waypoint, currentDestPos);
  const trajEst  = solveBrachistochrone(d1 + d2est, accelG);
  const arrDateEst = addDays(departureDate, trajEst.coordTimeDays);
  const arrPosEst  = planetPosition(destPlanet, toJ2000Century(arrDateEst));

  const d2         = distanceAU(waypoint, arrPosEst);
  const d_total    = d1 + d2;
  const trajectory = solveBrachistochrone(d_total, accelG);

  const arrivalDate = addDays(departureDate, trajectory.coordTimeDays);
  const T_arrive    = toJ2000Century(arrivalDate);
  const arrivalPos  = planetPosition(destPlanet, T_arrive);

  const dir1 = unitVec(departurePos, waypoint);
  const dir2 = unitVec(waypoint, arrivalPos);

  // Flip point position along the two-segment path (A→W→B)
  const flipDist = trajectory.flipDistAU;
  let midpointPos;
  if (flipDist <= d1) {
    const f = flipDist / d1;
    midpointPos = {
      x: departurePos.x + f * (waypoint.x - departurePos.x),
      y: departurePos.y + f * (waypoint.y - departurePos.y),
    };
  } else {
    const f = (flipDist - d1) / d2;
    midpointPos = {
      x: waypoint.x + f * (arrivalPos.x - waypoint.x),
      y: waypoint.y + f * (arrivalPos.y - waypoint.y),
    };
  }

  return {
    originPlanet, destPlanet, departureDate, accelG,
    arrivalDate, arrivalDateStr: formatDate(arrivalDate),
    T_depart, T_arrive,
    departurePos, arrivalPos, currentDestPos,
    distAU: d_total,
    trajectory,
    midpointPos,
    direction: dir1,
    isRerouted: true,
    isSmooth: true,
    waypoint,
    leg1DistAU: d1,
    leg2DistAU: d2,
    direction1: dir1,
    direction2: dir2,
  };
}
