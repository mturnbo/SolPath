import { tauAtDistanceFraction } from './spacecraft.js';

// Timing and sizing for the launch close-up sequence, kept pure (no DOM/canvas)
// so the phase ordering and rocket-size ramp can be unit-tested.

/** Tau at which the follow camera finishes zooming out and holds at the far scale. */
export function holdTau(mission) {
  if (mission.isRerouted && !mission.isSmooth) {
    // Waypoint stop: detour is the end of leg 1; hold halfway through leg 2.
    const tauDetour = mission.leg1.coordTimeDays / mission.trajectory.coordTimeDays;
    return tauDetour + (1 - tauDetour) / 2;
  }
  if (mission.isRerouted && mission.isSmooth) {
    // Smooth arc: one brachistochrone over the two-segment path.
    const dTotal = mission.leg1DistAU + mission.leg2DistAU;
    const fW     = mission.leg1DistAU / dTotal;
    return tauAtDistanceFraction(mission.trajectory, dTotal, fW + (1 - fW) / 2);
  }
  const traj = mission.trajectory, T = traj.coordTimeDays;
  return traj.isCapped
    ? (traj.accelTimeDays + traj.cruiseTimeDays) / T
    : (traj.accelTimeDays + (traj.flipTimeDays || 0)) / T;
}

/**
 * Launch close-up timing (fractions of the trip): dive in → hold on the firing
 * rocket → pull out to the map.  `farTau` is where the pull-out completes.
 * Boundaries are clamped below `farTau` so the ordering holds for any trip.
 */
export function launchPhases(mission) {
  const farTau    = holdTau(mission);
  const closeEnd  = Math.min(0.14, farTau * 0.5);   // close-up hold ends
  const diveEnd   = Math.min(0.08, closeEnd * 0.6); // dive-in ends
  const detailEnd = Math.min(0.34, farTau * 0.9);   // rocket back to map sprite
  return { farTau, closeEnd, diveEnd, detailEnd };
}

/**
 * Detailed-rocket length (px) during the launch close-up, or null once it has
 * shrunk back to the small map sprite.  Peaks at ~1/8 of the view.
 */
export function launchRocketLen(tau, w, h, { diveEnd, closeEnd, detailEnd }) {
  const launchLen = Math.min(w, h) / 8;
  const lerp   = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  if (tau <= diveEnd)   return lerp(launchLen * 0.4, launchLen, smooth(tau / diveEnd));
  if (tau <= closeEnd)  return launchLen;
  if (tau <= detailEnd) return lerp(launchLen, 18, smooth((tau - closeEnd) / (detailEnd - closeEnd)));
  return null;
}
