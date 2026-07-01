// ── Physical constants ────────────────────────────────────────────────────────

/** Speed of light (m/s) */
const C = 299_792_458;

/** Standard gravity (m/s²) */
const G = 9.80665;

/** Metres per astronomical unit */
const AU_M = 1.495_978_707e11;

/** Seconds per day */
const DAY_S = 86_400;

/** Maximum allowed speed as a fraction of c */
const MAX_SPEED_FRACTION = 0.1;

const C_MAX = C * MAX_SPEED_FRACTION;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Euclidean distance (AU) between two heliocentric XY positions.
 *
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {number} distance in AU
 */
export function distanceAU(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Convert an acceleration in g to m/s².
 * @param {number} accelG
 * @returns {number}
 */
export function gToMs2(accelG) {
  return accelG * G;
}

// ── Brachistochrone solver ────────────────────────────────────────────────────

/**
 * Solve a brachistochrone ("flip-and-burn") trajectory.
 *
 * The spacecraft accelerates at constant thrust for the first half of the
 * journey, flips 180°, and decelerates for the second half. If the computed
 * peak speed would exceed MAX_SPEED_FRACTION * c, a constant-velocity cruise
 * phase is inserted between the two thrust legs.
 *
 * @param {number} distAU   - total distance in AU
 * @param {number} accelG   - constant acceleration in g (0.5 – 2)
 * @returns {{
 *   coordTimeDays:  number,   total coordinate (observer) time in days
 *   shipTimeDays:   number,   proper (crew) time in days (relativistic)
 *   flipDistAU:     number,   distance from departure at which ship flips
 *   maxSpeedC:      number,   peak speed as a fraction of c
 *   isCapped:       boolean,  true when speed limit is active
 *   accelTimeDays:  number,   duration of each thrust leg in days
 *   cruiseTimeDays: number,   duration of cruise leg in days (0 if not capped)
 *   accelDistAU:    number,   distance covered during each thrust leg
 * }}
 */
export function solveBrachistochrone(distAU, accelG) {
  const a   = gToMs2(accelG);           // m/s²
  const d   = distAU * AU_M;            // m
  const d_h = d / 2;                    // half distance (m)

  // Uncapped peak speed at midpoint
  const tHalfUncapped = Math.sqrt(2 * d_h / a);  // s
  const vPeak         = a * tHalfUncapped;        // m/s

  if (vPeak <= C_MAX) {
    // ── Standard two-phase flip-and-burn ────────────────────────────────────
    const tHalf   = tHalfUncapped;
    const tCoord  = 2 * tHalf;
    const tShip   = 2 * (C / a) * Math.asinh(a * tHalf / C);
    const maxSpeedC = vPeak / C;

    return {
      coordTimeDays:  tCoord / DAY_S,
      shipTimeDays:   tShip  / DAY_S,
      flipDistAU:     distAU / 2,
      maxSpeedC,
      isCapped:       false,
      accelTimeDays:  tHalf  / DAY_S,
      cruiseTimeDays: 0,
      accelDistAU:    distAU / 2,
    };
  }

  // ── Three-phase: accelerate → cruise at C_MAX → decelerate ───────────────

  // Time and distance for each thrust leg (0 → C_MAX or C_MAX → 0)
  const tAccel = C_MAX / a;                      // s
  const dAccel = 0.5 * a * tAccel * tAccel;      // m

  const dCruise = d - 2 * dAccel;               // m
  const tCruise = dCruise / C_MAX;              // s

  const tCoord = 2 * tAccel + tCruise;

  // Relativistic ship time per thrust leg
  const tShipAccel = (C / a) * Math.asinh(a * tAccel / C);
  // Cruise leg: at v = C_MAX, γ = 1/sqrt(1-(v/c)²)
  const gamma      = 1 / Math.sqrt(1 - MAX_SPEED_FRACTION ** 2);
  const tShipCruise = tCruise / gamma;
  const tShip      = 2 * tShipAccel + tShipCruise;

  return {
    coordTimeDays:  tCoord / DAY_S,
    shipTimeDays:   tShip  / DAY_S,
    flipDistAU:     dAccel / AU_M,
    maxSpeedC:      MAX_SPEED_FRACTION,
    isCapped:       true,
    accelTimeDays:  tAccel / DAY_S,
    cruiseTimeDays: tCruise / DAY_S,
    accelDistAU:    dAccel / AU_M,
  };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Format a duration in days into a human-readable string.
 * Examples: "3h 22m", "4d 7h", "2y 38d"
 *
 * @param {number} days
 * @returns {string}
 */
export function formatDuration(days) {
  if (days < 1) {
    const h = Math.floor(days * 24);
    const m = Math.round((days * 24 - h) * 60);
    return `${h}h ${m}m`;
  }
  if (days < 365.25) {
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  }
  const years = Math.floor(days / 365.25);
  const rem   = Math.round(days % 365.25);
  return rem > 0 ? `${years}y ${rem}d` : `${years}y`;
}

/**
 * Format a speed as a percentage of c.
 * @param {number} fractionOfC
 * @returns {string}
 */
export function formatSpeedC(fractionOfC) {
  return `${(fractionOfC * 100).toFixed(2)}% c`;
}
