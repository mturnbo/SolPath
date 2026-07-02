import { PLANETS } from '../data/planets.js';

const DEFAULT_ORIGIN = 'Earth';
const DEFAULT_DEST   = 'Mars';
const DEFAULT_ACCEL  = 1.0;
const ACCEL_MIN      = 0.5;
const ACCEL_MAX      = 2.0;
const ACCEL_STEP     = 0.1;

/**
 * Populate both planet <select> elements with options from PLANETS.
 */
function populatePlanetSelects(originEl, destEl) {
  for (const planet of PLANETS) {
    const opt1 = new Option(planet.name, planet.name);
    const opt2 = new Option(planet.name, planet.name);
    originEl.appendChild(opt1);
    destEl.appendChild(opt2);
  }
  originEl.value = DEFAULT_ORIGIN;
  destEl.value   = DEFAULT_DEST;
}

/**
 * Initialise the Mission Planner panel section.
 *
 * Wires up origin/destination selectors and the acceleration slider.
 * Calls `onChange({ originPlanet, destPlanet, accelG })` whenever any value
 * changes. Prevents selecting the same planet as both origin and destination.
 *
 * @param {function} onChange
 * @returns {{ getState: function }} - returns current { originPlanet, destPlanet, accelG }
 */
export function initMissionPanel(onChange) {
  const originEl  = document.getElementById('select-origin');
  const destEl    = document.getElementById('select-dest');
  const accelEl   = document.getElementById('slider-accel');
  const accelLbl  = document.getElementById('label-accel');

  populatePlanetSelects(originEl, destEl);

  accelEl.min   = ACCEL_MIN;
  accelEl.max   = ACCEL_MAX;
  accelEl.step  = ACCEL_STEP;
  accelEl.value = DEFAULT_ACCEL;
  accelLbl.textContent = `${DEFAULT_ACCEL.toFixed(1)} g`;

  function getState() {
    return {
      originPlanet: PLANETS.find(p => p.name === originEl.value),
      destPlanet:   PLANETS.find(p => p.name === destEl.value),
      accelG:       parseFloat(accelEl.value),
    };
  }

  function emit() {
    const state = getState();
    if (state.originPlanet === state.destPlanet) return;
    onChange(state);
  }

  originEl.addEventListener('change', () => {
    // If origin now matches dest, bump dest to the next planet
    if (originEl.value === destEl.value) {
      const idx = PLANETS.findIndex(p => p.name === destEl.value);
      const next = PLANETS[(idx + 1) % PLANETS.length];
      destEl.value = next.name;
    }
    emit();
  });

  destEl.addEventListener('change', () => {
    if (destEl.value === originEl.value) {
      const idx = PLANETS.findIndex(p => p.name === originEl.value);
      const next = PLANETS[(idx + 1) % PLANETS.length];
      originEl.value = next.name;
    }
    emit();
  });

  accelEl.addEventListener('input', () => {
    accelLbl.textContent = `${parseFloat(accelEl.value).toFixed(1)} g`;
    emit();
  });

  return { getState };
}
