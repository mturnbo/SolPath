import test from 'node:test';
import assert from 'node:assert/strict';
import { spacecraftPosition3D } from '../src/js/render/spacecraft.js';
import { computeMission3D } from '../src/js/physics/mission3d.js';
import { distance3D, closestSolarApproach3D, SOLAR_EXCLUSION_AU } from '../src/js/physics/trajectory.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);
const near = (a, b, eps = 1e-6) => distance3D(a, b) < eps;

test('ship starts at departure and ends at arrival (direct)', () => {
  const m = computeMission3D(byName('Earth'), byName('Mars'), new Date('2030-01-01'), 1.0);
  assert.ok(!m.isRerouted, 'this case should be direct');
  assert.ok(near(spacecraftPosition3D(0, m), m.departurePos), 'tau=0 at departure');
  assert.ok(near(spacecraftPosition3D(1, m), m.arrivalPos), 'tau=1 at arrival');
});

test('ship position advances monotonically toward the destination', () => {
  const m = computeMission3D(byName('Earth'), byName('Jupiter'), new Date('2030-01-01'), 1.0);
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const d = distance3D(m.departurePos, spacecraftPosition3D(i / 20, m));
    assert.ok(d >= prev - 1e-9, `distance from departure is non-decreasing at tau=${i / 20}`);
    prev = d;
  }
});

test('ship passes near the waypoint on a rerouted mission', () => {
  const m = computeMission3D(byName('Earth'), byName('Neptune'), new Date('2071-07-23'), 0.85);
  assert.ok(m.isRerouted, 'this case should reroute');
  // Sample the flown path; closest approach to the waypoint should be ~0.
  let minToWp = Infinity;
  for (let i = 0; i <= 200; i++) {
    minToWp = Math.min(minToWp, distance3D(spacecraftPosition3D(i / 200, m), m.waypoint));
  }
  assert.ok(minToWp < 0.05, `flown path reaches the waypoint (min ${minToWp})`);
});

test('every sampled ship position stays clear of the exclusion sphere', () => {
  const m = computeMission3D(byName('Venus'), byName('Jupiter'), new Date('2071-07-23'), 1.0);
  for (let i = 0; i < 200; i++) {
    const a = spacecraftPosition3D(i / 200, m);
    const b = spacecraftPosition3D((i + 1) / 200, m);
    assert.ok(closestSolarApproach3D(a, b).distAU >= SOLAR_EXCLUSION_AU * 0.98,
      `segment ${i} clears the Sun`);
  }
});
