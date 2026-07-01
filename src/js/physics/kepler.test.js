/**
 * Kepler solver smoke tests — run in the browser console:
 *
 *   import('/src/js/physics/kepler.test.js')
 *
 * or open index.html with ?test in the URL (wired up in main.js later).
 * Each test logs PASS / FAIL with expected vs actual values.
 */

import { solveKepler, eccentricToTrue, planetPosition } from './kepler.js';
import { PLANETS } from '../data/planets.js';

const APPROX_DEG = 1.5;  // acceptable error in degrees for position checks

function approx(a, b, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`%cPASS%c ${label}`, 'color:green;font-weight:bold', '', detail);
  } else {
    console.error(`FAIL ${label}`, detail);
  }
}

// ── solveKepler ─────────────────────────────────────────────────────────────

// Circular orbit: E should equal M
{
  const M = Math.PI / 3;
  const E = solveKepler(M, 0);
  assert('solveKepler: circular orbit E = M', approx(E, M, 1e-8),
    `E=${E.toFixed(8)} M=${M.toFixed(8)}`);
}

// Known solution: M=0 → E=0 for any e
{
  const E = solveKepler(0, 0.5);
  assert('solveKepler: M=0 → E=0', approx(E, 0, 1e-10), `E=${E}`);
}

// Verify M = E - e*sin(E) holds for Earth's eccentricity
{
  const e = 0.01671;
  const M = 1.2;
  const E = solveKepler(M, e);
  const check = E - e * Math.sin(E);
  assert('solveKepler: Kepler equation satisfied', approx(check, M, 1e-9),
    `M=${M} E-e*sin(E)=${check}`);
}

// ── eccentricToTrue ──────────────────────────────────────────────────────────

// At perihelion E=0 → ν=0
{
  const nu = eccentricToTrue(0, 0.2);
  assert('eccentricToTrue: E=0 → ν=0', approx(nu, 0, 1e-10), `ν=${nu}`);
}

// At aphelion E=π → ν=π
{
  const nu = eccentricToTrue(Math.PI, 0.2);
  assert('eccentricToTrue: E=π → ν=π', approx(nu, Math.PI, 1e-10), `ν=${nu}`);
}

// ── planetPosition ───────────────────────────────────────────────────────────

// Earth at J2000.0 (T=0) should be ~1 AU from Sol
{
  const earth = PLANETS.find(p => p.name === 'Earth');
  const pos = planetPosition(earth, 0);
  const r = Math.sqrt(pos.x ** 2 + pos.y ** 2);
  assert('planetPosition: Earth distance at J2000 ≈ 1 AU',
    Math.abs(r - 1) < 0.03,
    `r=${r.toFixed(4)} AU`);
}

// Jupiter at J2000.0 should be ~5.2 AU from Sol
{
  const jupiter = PLANETS.find(p => p.name === 'Jupiter');
  const pos = planetPosition(jupiter, 0);
  const r = Math.sqrt(pos.x ** 2 + pos.y ** 2);
  assert('planetPosition: Jupiter distance at J2000 ≈ 5.2 AU',
    Math.abs(r - 5.2) < 0.1,
    `r=${r.toFixed(4)} AU`);
}

// Mars at J2000.0 should be between 1.38 and 1.67 AU (perihelion–aphelion range)
{
  const mars = PLANETS.find(p => p.name === 'Mars');
  const pos = planetPosition(mars, 0);
  const r = Math.sqrt(pos.x ** 2 + pos.y ** 2);
  assert('planetPosition: Mars distance at J2000 within orbital range',
    r >= 1.38 && r <= 1.67,
    `r=${r.toFixed(4)} AU`);
}

// Neptune should be ~30 AU
{
  const neptune = PLANETS.find(p => p.name === 'Neptune');
  const pos = planetPosition(neptune, 0);
  const r = Math.sqrt(pos.x ** 2 + pos.y ** 2);
  assert('planetPosition: Neptune distance at J2000 ≈ 30 AU',
    Math.abs(r - 30) < 1,
    `r=${r.toFixed(4)} AU`);
}

console.log('Kepler solver tests complete.');
