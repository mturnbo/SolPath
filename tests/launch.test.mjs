import test from 'node:test';
import assert from 'node:assert/strict';
import { holdTau, launchPhases, launchRocketLen } from '../src/js/render/launch.js';
import { computeMission } from '../src/js/physics/mission.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);

test('holdTau lands inside the trip for a direct mission', () => {
  const m = computeMission(byName('Earth'), byName('Jupiter'), new Date('2035-06-01T00:00:00Z'), 1.0, 'stop');
  const t = holdTau(m);
  assert.ok(t > 0 && t < 1, `holdTau ${t}`);
});

test('launch phases are ordered and clamped', () => {
  const m = computeMission(byName('Earth'), byName('Mars'), new Date('2035-01-01T00:00:00Z'), 1.0, 'stop');
  const { diveEnd, closeEnd, detailEnd, farTau } = launchPhases(m);
  assert.ok(0 < diveEnd && diveEnd < closeEnd && closeEnd < detailEnd && detailEnd < farTau,
    `ordering ${diveEnd} ${closeEnd} ${detailEnd} ${farTau}`);
  assert.ok(diveEnd <= 0.08 && closeEnd <= 0.14 && detailEnd <= 0.34);
});

test('phase ordering holds even when the hold point is very early', () => {
  const fake = { isRerouted: false, trajectory: { isCapped: false, coordTimeDays: 10, accelTimeDays: 1, flipTimeDays: 0 } };
  const p = launchPhases(fake);
  assert.equal(p.farTau, 0.1);
  assert.ok(p.diveEnd < p.closeEnd && p.closeEnd < p.detailEnd && p.detailEnd < p.farTau);
});

test('rocket length peaks at ~1/8 of the view during the close-up', () => {
  const w = 800, h = 600, p = { diveEnd: 0.08, closeEnd: 0.14, detailEnd: 0.34 };
  const launchLen = Math.min(w, h) / 8;                 // 75
  assert.equal(launchRocketLen(0.11, w, h, p), launchLen);    // hold
  assert.equal(launchRocketLen(0.08, w, h, p), launchLen);    // dive end
  assert.ok(Math.abs(launchRocketLen(0, w, h, p) - launchLen * 0.4) < 1e-9); // starts smaller
});

test('rocket shrinks to the sprite and then hands off', () => {
  const w = 800, h = 600, p = { diveEnd: 0.08, closeEnd: 0.14, detailEnd: 0.34 };
  assert.ok(Math.abs(launchRocketLen(0.34, w, h, p) - 18) < 1e-6); // shrunk to sprite size
  assert.equal(launchRocketLen(0.35, w, h, p), null);             // hand off to map sprite
  assert.equal(launchRocketLen(0.9, w, h, p), null);
});

test('rocket length never increases after the close-up hold', () => {
  const w = 800, h = 600, p = { diveEnd: 0.08, closeEnd: 0.14, detailEnd: 0.34 };
  let prev = Infinity;
  for (let tau = 0.14; tau <= 0.34; tau += 0.02) {
    const len = launchRocketLen(tau, w, h, p);
    assert.ok(len <= prev + 1e-9, `len rose at tau=${tau}`);
    prev = len;
  }
});
