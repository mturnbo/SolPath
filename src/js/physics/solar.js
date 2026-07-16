// Physical constants for the Sun and general relativity trivia shown at the
// solar exclusion ring.

export const GM_SUN = 1.32712440018e20; // standard gravitational parameter, m³/s²
export const C_M_S  = 299792458;        // speed of light, m/s
export const AU_M   = 1.495978707e11;   // one astronomical unit, m

/**
 * Schwarzschild radius of the Sun in metres: r_s = 2GM/c² (≈ 2.95 km).
 */
export function schwarzschildRadiusM() {
  return (2 * GM_SUN) / (C_M_S * C_M_S);
}

/**
 * Tidal acceleration gradient at a distance from the Sun — the differential
 * acceleration between two points separated radially by `separationM` metres:
 * Δa = 2GM·s / r³.
 *
 * @param {number} rAU          distance from the Sun in AU
 * @param {number} separationM  radial separation in metres (default 1 m)
 * @returns {number} m/s²
 */
export function tidalAccel(rAU, separationM = 1) {
  const r = rAU * AU_M;
  return (2 * GM_SUN * separationM) / (r * r * r);
}

/**
 * Solar gravitational acceleration at a distance: g = GM/r².
 *
 * @param {number} rAU distance from the Sun in AU
 * @returns {number} m/s²
 */
export function solarGravity(rAU) {
  const r = rAU * AU_M;
  return GM_SUN / (r * r);
}
