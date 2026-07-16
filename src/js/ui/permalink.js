import { formatDate, parseDate } from '../physics/epoch.js';

const VALID_PLANETS = new Set([
  'Mercury', 'Venus', 'Earth', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]);
const VALID_DETOURS = new Set(['stop', 'arc']);

/**
 * Parse mission parameters from the current URL search string.
 * Unknown or out-of-range values are silently ignored so a malformed
 * link can't crash the app.
 *
 * @returns {{ from?, to?, accel?, detour?, date? }}
 */
export function readParams() {
  const p = new URLSearchParams(window.location.search);
  const result = {};

  const from = p.get('from');
  if (from && VALID_PLANETS.has(from)) result.from = from;

  const to = p.get('to');
  if (to && VALID_PLANETS.has(to)) result.to = to;

  const accel = parseFloat(p.get('accel'));
  if (Number.isFinite(accel) && accel >= 0.01 && accel <= 2) result.accel = accel;

  const detour = p.get('detour');
  if (detour && VALID_DETOURS.has(detour)) result.detour = detour;

  const dateStr = p.get('date');
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = parseDate(dateStr);
    if (!isNaN(d)) result.date = d;
  }

  return result;
}

/**
 * Rewrite the browser URL to reflect the current mission without triggering
 * a page reload. Call this whenever any mission parameter changes.
 *
 * @param {{ from: string, to: string, accel: number, detour: string, date: Date }} params
 */
export function writeParams({ from, to, accel, detour, date }) {
  const p = new URLSearchParams();
  p.set('from',   from);
  p.set('to',     to);
  p.set('accel',  accel.toFixed(2));
  p.set('detour', detour);
  p.set('date',   formatDate(date));
  history.replaceState(null, '', `${location.pathname}?${p}`);
}

// Detect Electron renderer by user-agent; avoids needing nodeIntegration.
const isElectron = /Electron/.test(navigator.userAgent);

/**
 * Copy a shareable representation of the current mission to the clipboard.
 *
 * In a browser this copies the full URL. In Electron (where the address bar
 * shows a file:// path that isn't shareable) it copies only the query-string
 * params so another user can paste them as launch args or share them as text.
 */
export function copyPermalink() {
  const text = isElectron ? location.search : location.href;
  return navigator.clipboard.writeText(text);
}

/** True when running inside the Electron desktop shell. */
export { isElectron };
