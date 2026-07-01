/**
 * J2000.0 epoch: 2000-Jan-1 12:00:00 TT expressed as a Unix timestamp (ms).
 * TT ≈ UTC + 64.184 s at J2000; the difference is negligible for visualization.
 */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** Julian days per century */
const JD_PER_CENTURY = 36525;

/** Milliseconds per day */
const MS_PER_DAY = 86400000;

/**
 * Convert a JavaScript Date (or timestamp in ms) to a Julian Date.
 *
 * @param {Date|number} date
 * @returns {number} Julian Date (JD)
 */
export function toJulianDate(date) {
  const ms = date instanceof Date ? date.getTime() : date;
  return 2451545.0 + (ms - J2000_MS) / MS_PER_DAY;
}

/**
 * Convert a Julian Date to a JavaScript Date.
 *
 * @param {number} jd
 * @returns {Date}
 */
export function fromJulianDate(jd) {
  return new Date(J2000_MS + (jd - 2451545.0) * MS_PER_DAY);
}

/**
 * Compute Julian centuries since J2000.0 from a JavaScript Date.
 * This is the T value consumed by planetPosition() in kepler.js.
 *
 * @param {Date|number} date
 * @returns {number} T — Julian centuries since J2000.0
 */
export function toJ2000Century(date) {
  const ms = date instanceof Date ? date.getTime() : date;
  return (ms - J2000_MS) / (MS_PER_DAY * JD_PER_CENTURY);
}

/**
 * Convert Julian centuries since J2000.0 back to a JavaScript Date.
 *
 * @param {number} T
 * @returns {Date}
 */
export function fromJ2000Century(T) {
  return new Date(J2000_MS + T * JD_PER_CENTURY * MS_PER_DAY);
}

/**
 * Format a Date as an ISO calendar string "YYYY-MM-DD".
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse an ISO "YYYY-MM-DD" string into a Date at noon UTC (avoids
 * timezone-boundary issues that shift the calendar day).
 *
 * @param {string} str
 * @returns {Date}
 */
export function parseDate(str) {
  return new Date(str + 'T12:00:00Z');
}

/**
 * Step a Date by a given number of days (positive or negative).
 *
 * @param {Date}   date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Step a Date by a given number of months, keeping the day clamped to the
 * last day of the resulting month if necessary.
 *
 * @param {Date}   date
 * @param {number} months
 * @returns {Date}
 */
export function addMonths(date, months) {
  const d = new Date(date);
  const targetMonth = d.getUTCMonth() + months;
  d.setUTCMonth(targetMonth);
  // If the day overflowed (e.g. Jan 31 + 1 month → Mar 2 on some engines),
  // step back to the last day of the intended month.
  const expected = ((targetMonth % 12) + 12) % 12;
  while (d.getUTCMonth() !== expected) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

/**
 * Step a Date by a given number of years.
 *
 * @param {Date}   date
 * @param {number} years
 * @returns {Date}
 */
export function addYears(date, years) {
  return addMonths(date, years * 12);
}
