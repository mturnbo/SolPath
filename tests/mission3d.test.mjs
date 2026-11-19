import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distance3D, closestSolarApproach3D, findSolarDetour3D,
  findSolarDetour, SOLAR_EXCLUSION_AU,
} from '../src/js/physics/trajectory.js';
import { computeMission3D } from '../src/js/physics/mission3d.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);
const R = SOLAR_EXCLUSION_AU;

test('distance3D accounts for the out-of-plane component', () => {
  const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 });
  assert.equal(d, 5);
});

test('closestSolarApproach3D measures the nearest point to Sol in 3D', () => {
  // Segment passing above the Sun by 0.5 AU at its closest.
  const { distAU } = closestSolarApproach3D({ x: -1, y: 0, z: 0.5 }, { x: 1, y: 0, z: 0.5 });
  assert.ok(Math.abs(distAU - 0.5) < 1e-9, `dist ${distAU}`);
});

test('findSolarDetour3D reduces to the 2D solver for a planar case', () => {
  const A = { x: 1, y: 0, z: 0 };
  const B = { x: -1, y: 0.05, z: 0 };
  const W3 = findSolarDetour3D(A, B, R);
  const W2 = findSolarDetour(A, B, R);
  assert.ok(Math.abs(W3.z) < 1e-9, `z should stay ~0, got ${W3.z}`);
  assert.ok(Math.hypot(W3.x - W2.x, W3.y - W2.y) < 1e-9, 'xy should match 2D solver');
});

test('findSolarDetour3D keeps both legs clear of the exclusion sphere (tilted plane)', () => {
  const A = { x: 1, y: 0, z: 0.2 };
  const B = { x: -1, y: 0.1, z: -0.25 };   // direct line skims the Sun
  assert.ok(closestSolarApproach3D(A, B).distAU < R, 'direct line should be unsafe');

  const W = findSolarDetour3D(A, B, R);
  assert.ok(Math.hypot(W.x, W.y, W.z) >= R * 0.999, 'waypoint sits on/outside the sphere');
  const clr = Math.min(
    closestSolarApproach3D(A, W).distAU,
    closestSolarApproach3D(W, B).distAU,
  );
  assert.ok(clr >= R * 0.99, `both legs clear the sphere (clr ${clr})`);
});

test('computeMission3D: every path segment clears the exclusion sphere', () => {
  for (const [from, to] of [['Earth', 'Neptune'], ['Earth', 'Mars'], ['Venus', 'Jupiter'], ['Earth', 'Pluto']]) {
    const m = computeMission3D(byName(from), byName(to), new Date('2071-07-23'), 1.0);
    for (let i = 0; i < m.pathPoints.length - 1; i++) {
      const clr = closestSolarApproach3D(m.pathPoints[i], m.pathPoints[i + 1]).distAU;
      assert.ok(clr >= R * 0.98, `${from}->${to} segment ${i} clears Sol (clr ${clr})`);
    }
    assert.ok(m.arrivalDate > m.departureDate, `${from}->${to} arrives after departure`);
    assert.equal(m.pathPoints[0], m.departurePos);
    assert.equal(m.pathPoints.at(-1), m.arrivalPos);
  }
});

test('computeMission3D arc mode yields a continuous forward path', () => {
  const m = computeMission3D(byName('Earth'), byName('Neptune'), new Date('2071-07-23'), 0.85, 'arc');
  assert.ok(m.isSmooth, 'arc mode flagged smooth');
  // Flip point lies on the path and between the endpoints in distance.
  const total = m.distAU;
  const toFlip = distance3D(m.departurePos, m.midpointPos);
  assert.ok(toFlip > 0 && toFlip < total, `flip within path (${toFlip}/${total})`);
});
