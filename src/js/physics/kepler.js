const DEG = Math.PI / 180;

/**
 * Solve Kepler's equation  M = E - e*sin(E)  for eccentric anomaly E.
 * Uses Newton-Raphson iteration; converges in < 10 steps for e < 0.9.
 *
 * @param {number} M - mean anomaly (radians)
 * @param {number} e - eccentricity (0 ≤ e < 1)
 * @returns {number} eccentric anomaly E (radians)
 */
export function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/**
 * Convert eccentric anomaly to true anomaly.
 *
 * @param {number} E - eccentric anomaly (radians)
 * @param {number} e - eccentricity
 * @returns {number} true anomaly ν (radians)
 */
export function eccentricToTrue(E, e) {
  const sinV = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
  const cosV = (Math.cos(E) - e) / (1 - e * Math.cos(E));
  return Math.atan2(sinV, cosV);
}

/**
 * Compute heliocentric ecliptic XY position (AU) for a planet given its
 * Keplerian orbital elements evaluated at a specific Julian century T.
 *
 * The elements are the J2000 values plus T * rate for each parameter.
 * This uses the simplified planar approximation — inclination is applied
 * but the result is projected onto the ecliptic plane for 2-D rendering.
 *
 * @param {object} planet - entry from PLANETS array (planets.js)
 * @param {number} T      - Julian centuries since J2000.0
 * @returns {{ x: number, y: number }} heliocentric position in AU
 */
export function planetPosition(planet, T) {
  const a   = planet.a   + planet.aRate   * T;
  const e   = planet.e   + planet.eRate   * T;
  const L   = planet.L   + planet.LRate   * T;   // degrees
  const lp  = planet.lp  + planet.lpRate  * T;   // longitude of perihelion
  const lan = planet.lan + planet.lanRate * T;   // longitude of ascending node
  const inc = planet.i   + planet.iRate   * T;

  // Mean anomaly (degrees → radians)
  const M = ((L - lp) % 360) * DEG;

  // Argument of perihelion ω = ω̃ - Ω
  const omega = (lp - lan) * DEG;
  const Omega = lan * DEG;
  const I     = inc * DEG;

  const E = solveKepler(M, e);
  const nu = eccentricToTrue(E, e);

  // Heliocentric distance
  const r = a * (1 - e * Math.cos(E));

  // Position in orbital plane
  const xOrbit = r * Math.cos(nu);
  const yOrbit = r * Math.sin(nu);

  // Rotate into ecliptic plane (full 3-D → project to XY)
  const x = (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(I)) * xOrbit
          + (-Math.sin(omega) * Math.cos(Omega) - Math.cos(omega) * Math.sin(Omega) * Math.cos(I)) * yOrbit;

  const y = (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(I)) * xOrbit
          + (-Math.sin(omega) * Math.sin(Omega) + Math.cos(omega) * Math.cos(Omega) * Math.cos(I)) * yOrbit;

  return { x, y };
}

/**
 * Compute heliocentric positions for all planets at Julian century T.
 *
 * @param {object[]} planets - PLANETS array
 * @param {number}   T       - Julian centuries since J2000.0
 * @returns {Array<{ name: string, x: number, y: number }>}
 */
export function allPlanetPositions(planets, T) {
  return planets.map(p => ({ name: p.name, ...planetPosition(p, T) }));
}
