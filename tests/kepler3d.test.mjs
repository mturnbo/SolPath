import test from 'node:test';
import assert from 'node:assert/strict';
import { planetPosition } from '../src/js/physics/kepler.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);
const mag = p => Math.hypot(p.x, p.y, p.z);

test('planetPosition returns a finite 3D vector', () => {
  const p = planetPosition(byName('Earth'), 0);
  for (const k of ['x', 'y', 'z']) assert.ok(Number.isFinite(p[k]), `${k} finite`);
});

test('Earth sits essentially in the ecliptic (|z| ~ 0, r ~ 1 AU)', () => {
  const p = planetPosition(byName('Earth'), 0);
  assert.ok(Math.abs(p.z) < 0.02, `|z| ${p.z}`);
  assert.ok(mag(p) > 0.98 && mag(p) < 1.02, `r ${mag(p)}`);
});

test('Pluto is clearly out of the ecliptic plane', () => {
  const p = planetPosition(byName('Pluto'), 0);
  assert.ok(Math.abs(p.z) > 1, `|z| ${p.z} should be well out of plane`);
  assert.ok(mag(p) > 28 && mag(p) < 52, `r ${mag(p)}`);
});

test('3D magnitude matches heliocentric distance scale per planet', () => {
  for (const [name, lo, hi] of [['Mercury', 0.3, 0.48], ['Mars', 1.3, 1.7], ['Jupiter', 4.9, 5.5]]) {
    const r = mag(planetPosition(byName(name), 0));
    assert.ok(r > lo && r < hi, `${name} r ${r}`);
  }
});
