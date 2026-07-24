import { spacecraftPosition } from '../render/spacecraft.js';
import { formatDate } from '../physics/epoch.js';

const C_KMS  = 299792.458;      // speed of light, km/s
const AU_KM  = 1.495978707e8;   // one AU in km

// ── Phase of a single leg at local normalized time t (mirrors main.js) ─────────
function legPhase(t, traj) {
  const T  = traj.coordTimeDays;
  const α  = traj.accelTimeDays / T;
  const φ  = (traj.flipTimeDays || 0) / T;
  if (!traj.isCapped) {
    if (t <= α)     return 'accel';
    if (t <= α + φ) return 'flip';
    return 'decel';
  }
  const β = traj.cruiseTimeDays / T;
  if (t <= α)          return 'accel';
  if (t <= α + β - φ)  return 'cruise';
  if (t <= α + β)      return 'flip';
  return 'decel';
}

function phaseAt(tau, mission) {
  if (mission.isRerouted && !mission.isSmooth) {
    const tau1 = mission.leg1.coordTimeDays / mission.trajectory.coordTimeDays;
    return tau <= tau1
      ? 'leg1_' + legPhase(tau / tau1, mission.leg1)
      : 'leg2_' + legPhase((tau - tau1) / (1 - tau1), mission.leg2);
  }
  return legPhase(tau, mission.trajectory);
}

// Distance travelled along the path (both detour legs are straight segments).
function distDone(pos, mission) {
  const dep = mission.departurePos;
  if (!mission.isRerouted) return Math.hypot(pos.x - dep.x, pos.y - dep.y);
  const wp   = mission.waypoint;
  const dDep = Math.hypot(pos.x - dep.x, pos.y - dep.y);
  const dWp  = Math.hypot(pos.x - wp.x,  pos.y - wp.y);
  // On leg 1 the point is colinear between departure and waypoint.
  const onLeg1 = Math.abs(dDep + dWp - mission.leg1DistAU) < 1e-4;
  return onLeg1 ? dDep : mission.leg1DistAU + dWp;
}

function detourLabel(mission) {
  if (!mission.isRerouted) return 'direct';
  return mission.isSmooth ? 'arc' : 'stop';
}

/**
 * Build a mission-progress log as CSV text sampled at a fixed observer-time step.
 *
 * Position and coordinate speed use the app's Newtonian kinematics (matching the
 * animation); ship time is integrated from the relativistic time dilation of the
 * coordinate speed. Pure — no DOM — so it can be unit-tested.
 *
 * @param {object} mission   result of computeMission()
 * @param {{ stepHours?: number }} [opts]
 * @returns {{ filename: string, csv: string, rowCount: number }}
 */
export function buildMissionLogCsv(mission, { stepHours = 1 } = {}) {
  const traj       = mission.trajectory;
  const T          = traj.coordTimeDays;          // total observer time (days)
  const totalHours = T * 24;
  const totalDist  = mission.distAU;

  // finite-difference window (~60 s) for coordinate speed
  const dTau = 60 / (T * 86400);
  const speedKms = (tau) => {
    const a = Math.max(0, tau - dTau), b = Math.min(1, tau + dTau);
    const pa = spacecraftPosition(a, mission), pb = spacecraftPosition(b, mission);
    const dAU  = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const dt_s = (b - a) * T * 86400;
    return dt_s > 0 ? (dAU * AU_KM) / dt_s : 0;
  };

  // Sample times (hours): 0, step, 2·step, …, then an exact final row at arrival.
  const times = [];
  for (let h = 0; h < totalHours; h += stepHours) times.push(h);
  times.push(totalHours);

  const rows = [];
  let shipHours = 0;
  let prevInvGamma = 1;

  times.forEach((h, i) => {
    const tau   = Math.min(1, (h / 24) / T);
    const pos   = spacecraftPosition(tau, mission);
    const rSun  = Math.hypot(pos.x, pos.y);
    const done  = Math.min(totalDist, distDone(pos, mission));
    const vKms  = speedKms(tau);
    const vC    = vKms / C_KMS;
    const gamma = 1 / Math.sqrt(1 - Math.min(vC * vC, 0.999999));
    const invG  = 1 / gamma;

    if (i > 0) shipHours += (h - times[i - 1]) * (invG + prevInvGamma) / 2;
    prevInvGamma = invG;

    const phase   = phaseAt(tau, mission);
    const accSign = phase.includes('accel') ? mission.accelG
                  : phase.includes('decel') ? -mission.accelG : 0;

    rows.push([
      (Math.round(h * 1000) / 1000),
      shipHours.toFixed(3),
      phase,
      pos.x.toFixed(4), pos.y.toFixed(4),
      rSun.toFixed(4),
      done.toFixed(4), Math.max(0, totalDist - done).toFixed(4),
      vKms.toFixed(2),
      vC.toFixed(6),
      gamma.toFixed(6),
      accSign.toFixed(2),
    ].join(','));
  });

  const from = mission.originPlanet.name;
  const to   = mission.destPlanet.name;
  const mode = detourLabel(mission);
  const dep  = formatDate(mission.departureDate);

  const header = [
    `# from: ${from}`,
    `# to: ${to}`,
    `# departure: ${dep}`,
    `# arrival: ${mission.arrivalDateStr}`,
    `# accel_g: ${mission.accelG.toFixed(2)}`,
    `# detour: ${mode}`,
    `# distance_au: ${totalDist.toFixed(3)}`,
    `# observer_time_days: ${T.toFixed(3)}`,
    `# ship_time_days: ${traj.shipTimeDays.toFixed(3)}`,
    `# peak_speed_c: ${traj.maxSpeedC.toFixed(5)}`,
    `# delta_v_kms: ${traj.deltaVKms.toFixed(1)}`,
    `# step_hours: ${stepHours}`,
    `# rows: ${rows.length}`,
  ].join('\n');

  const cols = 't_obs_h,t_ship_h,phase,x_au,y_au,r_sun_au,dist_done_au,dist_left_au,speed_kms,speed_c,gamma,accel_g';
  const csv  = `${header}\n${cols}\n${rows.join('\n')}\n`;
  const filename = `${from}-${to}_${dep}_${mission.accelG.toFixed(2)}g_${mode}.csv`.toLowerCase();

  return { filename, csv, rowCount: rows.length };
}

/**
 * Generate the current mission's log and download it into a "logs" folder.
 *
 * The download filename is prefixed with `logs/` so Chromium-based browsers
 * (and the Electron build) save it under Downloads/logs; browsers that flatten
 * subpaths fall back to a plain filename.
 *
 * @param {object} mission
 * @returns {string} the download filename used
 */
export function downloadMissionLog(mission) {
  const { filename, csv } = buildMissionLogCsv(mission);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `logs/${filename}`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Release the object URL after the download has been kicked off.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
