/**
 * Brachistochrone solver tests — run in browser console:
 *   import('/src/js/physics/trajectory.test.js')
 */

import {
  solveBrachistochrone, distanceAU, gToMs2, formatDuration, formatSpeedC,
} from './trajectory.js';

function approx(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`%cPASS%c ${label}`, 'color:green;font-weight:bold', '', detail);
  } else {
    console.error(`FAIL ${label}`, detail);
  }
}

// ── distanceAU ───────────────────────────────────────────────────────────────

{
  const d = distanceAU({ x: 0, y: 0 }, { x: 1, y: 0 });
  assert('distanceAU: 1 AU along X', approx(d, 1, 1e-10), `d=${d}`);
}

{
  const d = distanceAU({ x: 1, y: 0 }, { x: 1 + 3, y: 4 });
  assert('distanceAU: 3-4-5 triangle = 5 AU', approx(d, 5, 1e-10), `d=${d}`);
}

// ── gToMs2 ───────────────────────────────────────────────────────────────────

{
  const a = gToMs2(1);
  assert('gToMs2: 1g = 9.80665 m/s²', approx(a, 9.80665, 1e-5), `a=${a}`);
}

// ── solveBrachistochrone — uncapped (short distances / low accel) ─────────────

// Earth to Mars opposition (~0.52 AU) at 1g — should not be capped
{
  const r = solveBrachistochrone(0.52, 1);
  assert('Earth-Mars 1g: not capped', !r.isCapped, `maxSpeedC=${r.maxSpeedC.toFixed(4)}`);
  assert('Earth-Mars 1g: coord time > 0', r.coordTimeDays > 0, `days=${r.coordTimeDays.toFixed(2)}`);
  assert('Earth-Mars 1g: ship time ≤ coord time', r.shipTimeDays <= r.coordTimeDays,
    `ship=${r.shipTimeDays.toFixed(2)} coord=${r.coordTimeDays.toFixed(2)}`);
  assert('Earth-Mars 1g: flip at halfway', approx(r.flipDistAU, 0.52 / 2, 1e-6),
    `flip=${r.flipDistAU.toFixed(4)}`);
  assert('Earth-Mars 1g: no cruise phase', r.cruiseTimeDays === 0);
  console.log(`  Earth-Mars 1g: ${r.coordTimeDays.toFixed(1)}d coord / ${r.shipTimeDays.toFixed(1)}d ship, peak ${formatSpeedC(r.maxSpeedC)}`);
}

// At 2g, Earth to Mars should still be uncapped
{
  const r = solveBrachistochrone(0.52, 2);
  assert('Earth-Mars 2g: not capped', !r.isCapped, `maxSpeedC=${r.maxSpeedC.toFixed(4)}`);
  assert('Earth-Mars 2g: faster than 1g', r.coordTimeDays < solveBrachistochrone(0.52, 1).coordTimeDays,
    `${r.coordTimeDays.toFixed(2)}d vs ${solveBrachistochrone(0.52, 1).coordTimeDays.toFixed(2)}d`);
}

// ── solveBrachistochrone — capped (long distances / high accel) ───────────────

// Earth to Neptune (~29 AU) at 1g — peak speed would exceed 10% c
{
  const r = solveBrachistochrone(29, 1);
  assert('Earth-Neptune 1g: capped at 10% c', r.isCapped, `maxSpeedC=${r.maxSpeedC}`);
  assert('Earth-Neptune 1g: maxSpeedC = 0.1', approx(r.maxSpeedC, 0.1, 1e-10));
  assert('Earth-Neptune 1g: cruise time > 0', r.cruiseTimeDays > 0,
    `cruise=${r.cruiseTimeDays.toFixed(1)}d`);
  assert('Earth-Neptune 1g: ship time < coord time', r.shipTimeDays < r.coordTimeDays,
    `ship=${r.shipTimeDays.toFixed(1)}d coord=${r.coordTimeDays.toFixed(1)}d`);
  console.log(`  Earth-Neptune 1g: ${r.coordTimeDays.toFixed(1)}d coord / ${r.shipTimeDays.toFixed(1)}d ship`);
}

// ── Symmetry: doubling distance at same accel should double time (uncapped) ──

{
  const r1 = solveBrachistochrone(0.3, 1);
  const r2 = solveBrachistochrone(0.6, 1);
  // sqrt(2*d/a): doubling d → time multiplied by sqrt(2)
  const ratio = r2.coordTimeDays / r1.coordTimeDays;
  assert('Double distance → sqrt(2) × time (uncapped)',
    approx(ratio, Math.SQRT2, 0.001),
    `ratio=${ratio.toFixed(4)} expected=${Math.SQRT2.toFixed(4)}`);
}

// ── Sanity: higher acceleration → shorter time ────────────────────────────────

{
  const r05 = solveBrachistochrone(1.5, 0.5);
  const r2  = solveBrachistochrone(1.5, 2);
  assert('Higher accel → shorter trip', r2.coordTimeDays < r05.coordTimeDays,
    `0.5g=${r05.coordTimeDays.toFixed(1)}d 2g=${r2.coordTimeDays.toFixed(1)}d`);
}

// ── formatDuration ────────────────────────────────────────────────────────────

assert('formatDuration: sub-day',    formatDuration(0.25)   === '6h 0m',   formatDuration(0.25));
assert('formatDuration: days+hours', formatDuration(2.5)    === '2d 12h',  formatDuration(2.5));
assert('formatDuration: whole days', formatDuration(5)      === '5d',      formatDuration(5));
assert('formatDuration: years+days', formatDuration(400)    === '1y 35d',  formatDuration(400));

// ── formatSpeedC ──────────────────────────────────────────────────────────────

assert('formatSpeedC: 10%', formatSpeedC(0.1) === '10.00% c', formatSpeedC(0.1));
assert('formatSpeedC: 3.5%', formatSpeedC(0.035) === '3.50% c', formatSpeedC(0.035));

console.log('Trajectory solver tests complete.');
