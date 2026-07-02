import { COMPARISON_COLORS } from '../render/comparison.js';

const PRESET_ACCELS = [0.5, 1.0, 1.5, 2.0];

/**
 * Initialise the comparison mode section.
 *
 * When the toggle is on, multiple acceleration values can be checked.
 * Calls `onChange({ enabled, activeAccels })` whenever state changes.
 *
 * @param {function} onChange
 * @returns {{ isEnabled: function, getActiveAccels: function }}
 */
export function initComparisonPanel(onChange) {
  const toggleBtn  = document.getElementById('btn-compare-toggle');
  const optionsEl  = document.getElementById('compare-options');
  const checkboxes = [];

  // Build checkboxes for each preset
  for (const g of PRESET_ACCELS) {
    const color = COMPARISON_COLORS[g] ?? '#ffffff';
    const id    = `cmp-${String(g).replace('.', '-')}`;

    const label = document.createElement('label');
    label.className = 'compare-label';
    label.htmlFor   = id;

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.id      = id;
    cb.value   = g;
    cb.checked = true;
    cb.addEventListener('change', emit);

    const swatch = document.createElement('span');
    swatch.className = 'compare-swatch';
    swatch.style.background = color;

    const text = document.createElement('span');
    text.textContent = `${g.toFixed(1)} g`;

    label.appendChild(cb);
    label.appendChild(swatch);
    label.appendChild(text);
    optionsEl.appendChild(label);
    checkboxes.push(cb);
  }

  let enabled = false;

  function getActiveAccels() {
    return checkboxes
      .filter(cb => cb.checked)
      .map(cb => parseFloat(cb.value));
  }

  function emit() {
    onChange({ enabled, activeAccels: getActiveAccels() });
  }

  toggleBtn.addEventListener('click', () => {
    enabled = !enabled;
    toggleBtn.textContent = enabled ? 'Disable' : 'Enable';
    toggleBtn.classList.toggle('btn-ghost--active', enabled);
    optionsEl.style.display = enabled ? 'flex' : 'none';
    emit();
  });

  // Start collapsed
  optionsEl.style.display = 'none';

  return {
    isEnabled:      () => enabled,
    getActiveAccels,
  };
}
