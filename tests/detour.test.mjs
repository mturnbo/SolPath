import test from 'node:test';
import assert from 'node:assert/strict';
import { findSolarDetour, closestSolarApproach, SOLAR_EXCLUSION_AU as R }
  from '../src/js/physics/trajectory.js';
import { computeMission } from '../src/js/physics/mission.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);

// Projection of W onto the A→B axis, as a fraction of |AB|. In [0,1] ⇒ forward.
function forwardRatio(A, W, B) {
  const dx = B.x - A.x, dy = B.y - A.y;
  return ((W.x - A.x) * dx + (W.y - A.y) * dy) / (dx * dx + dy * dy);
}

test('reported case: Earth→Neptune 2071-07-23 does not backtrack', () => {
  // Positions for that date that reproduce the reported reversing path: the
  // direct line clips the zone just past Earth.
  const A = { x: 0.497422111548317, y: -0.885912661046041 };
  const B = { x: -6.293912459523158, y: 29.255894515809004 };
  const W = findSolarDetour(A, B, R);
  const f = forwardRatio(A, W, B);
  assert.ok(f >= 0 && f <= 1, `waypoint should be forward, got ratio ${f}`);
  assert.ok(closestSolarApproach(A, W).distAU >= R * 0.99, 'leg 1 must clear the zone');
  assert.ok(closestSolarApproach(W, B).distAU >= R * 0.99, 'leg 2 must clear the zone');
});

test('waypoint is never inside the exclusion ring', () => {
  const A = { x: 0.9, y: 0.3 };
  const B = { x: -1.3, y: -0.8 };
  const W = findSolarDetour(A, B, R);
  assert.ok(Math.hypot(W.x, W.y) >= R * 0.99, 'waypoint must be at or outside the ring');
});

// Integration: for planet pairs whose endpoints both orbit outside the exclusion
// zone, every rerouted mission must go forward and keep both legs clear of Sol.
// (Mercury is excluded — its perihelion lies inside the zone, so trips to/from it
// can be geometrically unsolvable.)
test('rerouted planet missions are forward and clear the zone', () => {
  const outer = ['Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  let checked = 0;
  for (const from of outer) {
    for (const to of outer) {
      if (from === to) continue;
      for (let year = 2025; year <= 2100; year += 3) {
        for (const md of ['01-15', '07-15']) {
          for (const mode of ['stop', 'arc']) {
            const m = computeMission(byName(from), byName(to),
              new Date(`${year}-${md}T00:00:00Z`), 1.0, mode);
            if (!m.isRerouted) continue;
            checked++;
            const f = forwardRatio(m.departurePos, m.waypoint, m.arrivalPos);
            assert.ok(f >= -0.02, `${from}→${to} ${year}-${md} ${mode}: backtracks (fwd ${f.toFixed(3)})`);
            const leg1 = closestSolarApproach(m.departurePos, m.waypoint).distAU;
            const leg2 = closestSolarApproach(m.waypoint, m.arrivalPos).distAU;
            // Allow a small graze from destination motion during flight.
            assert.ok(Math.min(leg1, leg2) >= R * 0.95,
              `${from}→${to} ${year}-${md} ${mode}: leg clips zone (${Math.min(leg1, leg2).toFixed(3)})`);
          }
        }
      }
    }
  }
  assert.ok(checked > 50, `expected many rerouted cases, got ${checked}`);
});
