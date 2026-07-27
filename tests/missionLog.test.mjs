import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMissionLogCsv } from '../src/js/ui/missionLog.js';
import { computeMission } from '../src/js/physics/mission.js';
import { PLANETS } from '../src/js/data/planets.js';

const byName = n => PLANETS.find(p => p.name === n);
const EXPECTED_COLS = 't_obs_h,t_ship_h,phase,x_au,y_au,r_sun_au,dist_done_au,dist_left_au,speed_kms,speed_c,gamma,accel_g';

function parse(csv) {
  const lines = csv.trim().split('\n');
  const meta = Object.fromEntries(
    lines.filter(l => l.startsWith('#')).map(l => l.slice(1).split(':').map(s => s.trim()))
      .map(([k, ...v]) => [k, v.join(':')]),
  );
  const colLine = lines.find(l => l.startsWith('t_obs_h'));
  const dataRows = lines.slice(lines.indexOf(colLine) + 1).map(l => l.split(','));
  return { meta, colLine, dataRows };
}

test('log has header, columns, and hourly rows ending at arrival', () => {
  const m = computeMission(byName('Earth'), byName('Mars'), new Date('2035-01-01T00:00:00Z'), 1.0, 'stop');
  const { filename, csv } = buildMissionLogCsv(m);
  const { meta, colLine, dataRows } = parse(csv);

  assert.equal(colLine, EXPECTED_COLS);
  assert.equal(meta.from, 'Earth');
  assert.equal(meta.to, 'Mars');
  assert.match(filename, /^earth-mars_\d{4}-\d{2}-\d{2}_1\.00g_(stop|arc|direct)\.csv$/);

  // First row at t=0, last row at the total observer time.
  assert.equal(Number(dataRows[0][0]), 0);
  const lastT = Number(dataRows[dataRows.length - 1][0]);
  // observer_time_days in the header is rounded to 3 decimals, so allow for it.
  assert.ok(Math.abs(lastT - Number(meta.observer_time_days) * 24) < 0.02);

  // Consecutive rows step by ~1 observer hour.
  assert.ok(Math.abs(Number(dataRows[1][0]) - Number(dataRows[0][0]) - 1) < 1e-9);
});

test('progress is monotonic and ends at the destination', () => {
  const m = computeMission(byName('Earth'), byName('Jupiter'), new Date('2040-06-01T00:00:00Z'), 1.0, 'stop');
  const { csv } = buildMissionLogCsv(m);
  const { dataRows } = parse(csv);

  let prevDone = -1;
  for (const r of dataRows) {
    const done = Number(r[6]);
    assert.ok(done >= prevDone - 1e-6, 'dist_done should not decrease');
    prevDone = done;
  }
  const last = dataRows[dataRows.length - 1];
  assert.ok(Number(last[7]) < 0.01, 'dist_left ~ 0 at arrival');
});

test('integrated ship time matches the model total', () => {
  const m = computeMission(byName('Earth'), byName('Neptune'), new Date('2075-07-24T00:00:00Z'), 0.85, 'stop');
  const { csv } = buildMissionLogCsv(m);
  const { meta, dataRows } = parse(csv);
  const loggedShip = Number(dataRows[dataRows.length - 1][1]) / 24; // hours → days
  // Log integrates 1/γ from the coordinate speed; agrees with the model to ~0.1%.
  const rel = Math.abs(loggedShip - Number(meta.ship_time_days)) / Number(meta.ship_time_days);
  assert.ok(rel < 1e-3, `ship time drift ${rel}`);
});

test('detour log never crosses the exclusion zone', () => {
  // Earth → Neptune 2071-07-23 is a known rerouted case.
  const m = computeMission(byName('Earth'), byName('Neptune'), new Date('2071-07-23T00:00:00Z'), 1.0, 'stop');
  const { csv } = buildMissionLogCsv(m);
  const { dataRows } = parse(csv);
  assert.ok(m.isRerouted, 'expected a rerouted mission');
  const minRsun = Math.min(...dataRows.map(r => Number(r[5])));
  assert.ok(minRsun >= 0.35 * 0.99, `min r_sun ${minRsun} should stay outside the ring`);
});
