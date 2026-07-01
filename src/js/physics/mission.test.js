/**
 * Mission state tests — run in browser console:
 *   import('/src/js/physics/mission.test.js')
 */

import { PLANETS } from '../data/planets.js';
import { parseDate } from './epoch.js';
import { computeMission } from './mission.js';

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

const earth   = PLANETS.find(p => p.name === 'Earth');
const mars    = PLANETS.find(p => p.name === 'Mars');
const jupiter = PLANETS.find(p => p.name === 'Jupiter');
const neptune = PLANETS.find(p => p.name === 'Neptune');

const departure = parseDate('2026-01-01');

// ── Basic Earth → Mars mission ────────────────────────────────────────────────

const em = computeMission(earth, mars, departure, 1);

assert('computeMission: returns object', typeof em === 'object');

assert('E→M: departurePos is ~1 AU from Sol',
  approx(Math.hypot(em.departurePos.x, em.departurePos.y), 1, 0.05),
  `r=${Math.hypot(em.departurePos.x, em.departurePos.y).toFixed(3)} AU`);

assert('E→M: arrivalPos is ~1.5 AU from Sol',
  Math.hypot(em.arrivalPos.x, em.arrivalPos.y) > 1.3 &&
  Math.hypot(em.arrivalPos.x, em.arrivalPos.y) < 1.7,
  `r=${Math.hypot(em.arrivalPos.x, em.arrivalPos.y).toFixed(3)} AU`);

assert('E→M: distAU > 0', em.distAU > 0, `distAU=${em.distAU.toFixed(3)}`);

assert('E→M: distAU within Mars orbital range (0.38–2.68 AU)',
  em.distAU >= 0.38 && em.distAU <= 2.68,
  `distAU=${em.distAU.toFixed(3)}`);

assert('E→M: arrivalDate after departureDate',
  em.arrivalDate > em.departureDate,
  `depart=${em.departureDate.toISOString().slice(0,10)} arrive=${em.arrivalDateStr}`);

assert('E→M: trajectory present', em.trajectory && em.trajectory.coordTimeDays > 0,
  `coordTimeDays=${em.trajectory.coordTimeDays.toFixed(1)}`);

assert('E→M: T_arrive > T_depart', em.T_arrive > em.T_depart,
  `T_depart=${em.T_depart.toFixed(4)} T_arrive=${em.T_arrive.toFixed(4)}`);

assert('E→M: direction is unit vector',
  approx(Math.hypot(em.direction.nx, em.direction.ny), 1, 1e-10),
  `|n|=${Math.hypot(em.direction.nx, em.direction.ny)}`);

assert('E→M: midpointPos between departure and arrival',
  Math.hypot(em.midpointPos.x - em.departurePos.x, em.midpointPos.y - em.departurePos.y)
    < em.distAU,
  `flipDist=${em.trajectory.flipDistAU.toFixed(3)} AU`);

console.log(`  Earth→Mars 1g: ${em.trajectory.coordTimeDays.toFixed(1)}d ` +
            `(${em.trajectory.shipTimeDays.toFixed(1)}d ship), ` +
            `dist=${em.distAU.toFixed(3)} AU, arrive=${em.arrivalDateStr}`);

// ── Higher acceleration → shorter trip ────────────────────────────────────────

{
  const slow = computeMission(earth, mars, departure, 0.5);
  const fast = computeMission(earth, mars, departure, 2);
  assert('Higher accel → earlier arrival',
    fast.arrivalDate < slow.arrivalDate,
    `0.5g=${slow.arrivalDateStr} 2g=${fast.arrivalDateStr}`);
}

// ── Long-haul: Earth → Neptune (should trigger speed cap) ─────────────────────

{
  const en = computeMission(earth, neptune, departure, 1);
  assert('E→Neptune 1g: speed capped', en.trajectory.isCapped,
    `maxSpeedC=${en.trajectory.maxSpeedC}`);
  assert('E→Neptune 1g: distAU > 25 AU', en.distAU > 25,
    `distAU=${en.distAU.toFixed(1)}`);
  assert('E→Neptune 1g: arrival is years away', en.trajectory.coordTimeDays > 365,
    `coordTimeDays=${en.trajectory.coordTimeDays.toFixed(0)}`);
  console.log(`  Earth→Neptune 1g: ${(en.trajectory.coordTimeDays/365.25).toFixed(2)}y ` +
              `coord, arrive=${en.arrivalDateStr}`);
}

// ── Earth → Jupiter ───────────────────────────────────────────────────────────

{
  const ej = computeMission(earth, jupiter, departure, 1);
  assert('E→Jupiter: arrivalPos ~5 AU from Sol',
    Math.hypot(ej.arrivalPos.x, ej.arrivalPos.y) > 4.9 &&
    Math.hypot(ej.arrivalPos.x, ej.arrivalPos.y) < 5.5,
    `r=${Math.hypot(ej.arrivalPos.x, ej.arrivalPos.y).toFixed(2)} AU`);
  console.log(`  Earth→Jupiter 1g: ${ej.trajectory.coordTimeDays.toFixed(1)}d, ` +
              `dist=${ej.distAU.toFixed(2)} AU`);
}

console.log('Mission state tests complete.');
