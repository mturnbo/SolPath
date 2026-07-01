/**
 * Standalone relativistic motion helpers.
 *
 * These are the underlying equations behind the time values returned by
 * solveBrachistochrone(). Exposed here for display, explanation, and testing.
 */

const C = 299_792_458;   // m/s
const G = 9.80665;       // m/s²

/**
 * Lorentz factor γ = 1 / sqrt(1 - β²) where β = v/c.
 * @param {number} fractionOfC  velocity as a fraction of c (0 ≤ v < 1)
 * @returns {number}
 */
export function lorentzFactor(fractionOfC) {
  return 1 / Math.sqrt(1 - fractionOfC ** 2);
}

/**
 * Proper (ship) time for one leg of constant proper acceleration from rest,
 * using the hyperbolic motion equation:
 *
 *   τ = (c/a) · arcsinh(a·t/c)
 *
 * where t is coordinate (observer) time in seconds.
 *
 * @param {number} coordTimeSeconds
 * @param {number} accelG            proper acceleration in g
 * @returns {number} proper time in seconds
 */
export function properTimeAccelLeg(coordTimeSeconds, accelG) {
  const a = accelG * G;
  return (C / a) * Math.asinh((a * coordTimeSeconds) / C);
}

/**
 * Proper (ship) time for a constant-velocity cruise leg.
 *
 *   τ = t / γ
 *
 * @param {number} coordTimeSeconds
 * @param {number} fractionOfC
 * @returns {number} proper time in seconds
 */
export function properTimeCruiseLeg(coordTimeSeconds, fractionOfC) {
  return coordTimeSeconds / lorentzFactor(fractionOfC);
}

/**
 * Peak speed (as a fraction of c) reached during a constant-acceleration leg
 * starting from rest.
 *
 * Non-relativistic: v = a·t  (used here; fine for v ≤ 10% c)
 *
 * @param {number} accelG
 * @param {number} coordTimeSeconds  duration of the acceleration leg
 * @returns {number}
 */
export function peakSpeedC(accelG, coordTimeSeconds) {
  return (accelG * G * coordTimeSeconds) / C;
}

/**
 * Time dilation summary given a solved trajectory result.
 *
 * @param {{ coordTimeDays: number, shipTimeDays: number, maxSpeedC: number }} result
 * @returns {{
 *   coordTimeDays: number,
 *   shipTimeDays:  number,
 *   savedDays:     number,   time saved by relativistic dilation (always ≥ 0)
 *   dilationPct:   number,   ship time as % of coord time
 *   gamma:         number,   Lorentz factor at peak speed
 * }}
 */
export function timeDilationSummary(result) {
  const { coordTimeDays, shipTimeDays, maxSpeedC } = result;
  return {
    coordTimeDays,
    shipTimeDays,
    savedDays:  coordTimeDays - shipTimeDays,
    dilationPct: (shipTimeDays / coordTimeDays) * 100,
    gamma:       lorentzFactor(maxSpeedC),
  };
}
