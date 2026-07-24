import test from 'node:test';
import assert from 'node:assert/strict';
import {
  schwarzschildRadiusM, tidalAccel, solarGravity, AU_M,
} from '../src/js/physics/solar.js';

function assertClose(actual, expected, relTol = 1e-3) {
  const err = Math.abs(actual - expected) / Math.abs(expected);
  assert.ok(err < relTol, `expected ${actual} ≈ ${expected} (rel err ${err})`);
}

test('Schwarzschild radius of the Sun is ~2.95 km', () => {
  assertClose(schwarzschildRadiusM(), 2953.25);
});

test('tidal acceleration at 0.35 AU per metre of separation', () => {
  assertClose(tidalAccel(0.35), 1.849e-12, 1e-3);
});

test('tidal acceleration scales linearly with separation', () => {
  assertClose(tidalAccel(0.35, 100), tidalAccel(0.35) * 100, 1e-12);
});

test('tidal acceleration falls off as 1/r³', () => {
  assertClose(tidalAccel(0.35) / tidalAccel(0.7), 8);
});

test('solar gravity at 1 AU is ~5.93 mm/s²', () => {
  assertClose(solarGravity(1), 5.93e-3, 1e-2);
});

test('solar gravity falls off as 1/r²', () => {
  assertClose(solarGravity(0.5) / solarGravity(1), 4);
});

test('gravity and tidal at the solar surface are finite and positive', () => {
  const surfaceAU = 6.957e8 / AU_M;
  assert.ok(solarGravity(surfaceAU) > 0 && Number.isFinite(solarGravity(surfaceAU)));
  assert.ok(tidalAccel(surfaceAU) > 0 && Number.isFinite(tidalAccel(surfaceAU)));
});
