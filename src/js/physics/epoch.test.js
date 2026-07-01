/**
 * Epoch utility tests — run in browser console:
 *   import('/src/js/physics/epoch.test.js')
 */

import {
  toJulianDate, fromJulianDate,
  toJ2000Century, fromJ2000Century,
  formatDate, parseDate,
  addDays, addMonths, addYears,
} from './epoch.js';

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

// ── Julian Date ──────────────────────────────────────────────────────────────

// J2000.0 epoch itself should be JD 2451545.0
{
  const jd = toJulianDate(new Date('2000-01-01T12:00:00Z'));
  assert('toJulianDate: J2000.0 = JD 2451545.0', approx(jd, 2451545.0, 1e-4),
    `jd=${jd}`);
}

// Round-trip: JD → Date → JD
{
  const jd = 2460000.5;
  const rt = toJulianDate(fromJulianDate(jd));
  assert('Julian Date round-trip', approx(rt, jd, 1e-6), `in=${jd} out=${rt}`);
}

// Known value: 2024-01-01 00:00 UTC ≈ JD 2460310.5
{
  const jd = toJulianDate(new Date('2024-01-01T00:00:00Z'));
  assert('toJulianDate: 2024-01-01 ≈ JD 2460310.5', approx(jd, 2460310.5, 0.01),
    `jd=${jd.toFixed(4)}`);
}

// ── J2000 Century ────────────────────────────────────────────────────────────

// At J2000.0, T = 0
{
  const T = toJ2000Century(new Date('2000-01-01T12:00:00Z'));
  assert('toJ2000Century: J2000.0 → T=0', approx(T, 0, 1e-10), `T=${T}`);
}

// One Julian century later, T = 1
{
  const oneCentury = new Date('2000-01-01T12:00:00Z').getTime() + 36525 * 86400000;
  const T = toJ2000Century(oneCentury);
  assert('toJ2000Century: +1 century → T=1', approx(T, 1, 1e-8), `T=${T}`);
}

// Round-trip: T → Date → T
{
  const T = 0.245;
  const rt = toJ2000Century(fromJ2000Century(T));
  assert('J2000 century round-trip', approx(rt, T, 1e-10), `in=${T} out=${rt}`);
}

// ── Date helpers ─────────────────────────────────────────────────────────────

// parseDate + formatDate round-trip
{
  const str = '2035-06-15';
  const rt = formatDate(parseDate(str));
  assert('parseDate/formatDate round-trip', rt === str, `in=${str} out=${rt}`);
}

// parseDate should produce noon UTC to avoid DST shifts
{
  const d = parseDate('2025-03-15');
  assert('parseDate: noon UTC', d.getUTCHours() === 12, `hours=${d.getUTCHours()}`);
}

// addDays
{
  const d = parseDate('2025-01-01');
  const d2 = addDays(d, 30);
  assert('addDays: +30 days', formatDate(d2) === '2025-01-31', formatDate(d2));
}

// addDays negative
{
  const d = parseDate('2025-03-01');
  const d2 = addDays(d, -1);
  assert('addDays: -1 day (month boundary)', formatDate(d2) === '2025-02-28', formatDate(d2));
}

// addMonths
{
  const d = parseDate('2025-01-15');
  const d2 = addMonths(d, 3);
  assert('addMonths: +3 months', formatDate(d2) === '2025-04-15', formatDate(d2));
}

// addMonths: clamp to end of month (Jan 31 + 1 month → Feb 28)
{
  const d = parseDate('2025-01-31');
  const d2 = addMonths(d, 1);
  assert('addMonths: clamp to Feb 28', formatDate(d2) === '2025-02-28', formatDate(d2));
}

// addYears
{
  const d = parseDate('2025-06-01');
  const d2 = addYears(d, 10);
  assert('addYears: +10 years', formatDate(d2) === '2035-06-01', formatDate(d2));
}

console.log('Epoch utility tests complete.');
