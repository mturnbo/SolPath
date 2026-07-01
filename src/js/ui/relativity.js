import { timeDilationSummary } from '../physics/relativity.js';
import { formatDuration, formatSpeedC } from '../physics/trajectory.js';

/**
 * Render relativistic time comparison into #relativity-panel.
 * Called whenever the trajectory result changes.
 *
 * @param {object|null} result  - return value of solveBrachistochrone, or null to show empty state
 * @param {string}      label   - e.g. "Earth → Mars"
 * @param {number}      accelG
 */
export function renderRelativity(result, label, accelG) {
  const panel = document.getElementById('relativity-panel');
  if (!panel) return;

  if (!result) {
    panel.innerHTML = '<p class="info-empty">Select a destination to see time dilation.</p>';
    return;
  }

  const s = timeDilationSummary(result);

  const barWidth = Math.max(2, s.dilationPct);

  panel.innerHTML = `
    <div class="rel-label">${label} · ${accelG}g</div>

    <div class="rel-row">
      <span class="rel-key">Observer time</span>
      <span class="rel-val">${formatDuration(s.coordTimeDays)}</span>
    </div>
    <div class="rel-row">
      <span class="rel-key">Ship time</span>
      <span class="rel-val rel-val--ship">${formatDuration(s.shipTimeDays)}</span>
    </div>

    <div class="rel-bar-wrap" title="Ship time as % of observer time">
      <div class="rel-bar" style="width:${barWidth}%"></div>
      <div class="rel-bar-bg"></div>
    </div>
    <div class="rel-bar-labels">
      <span class="rel-bar-label-left">0</span>
      <span class="rel-bar-label-pct">${s.dilationPct.toFixed(3)}%</span>
      <span class="rel-bar-label-right">100%</span>
    </div>

    <div class="rel-row rel-row--dim">
      <span class="rel-key">Time saved</span>
      <span class="rel-val">${formatDuration(s.savedDays)}</span>
    </div>
    <div class="rel-row rel-row--dim">
      <span class="rel-key">Peak speed</span>
      <span class="rel-val">${formatSpeedC(result.maxSpeedC)}${result.isCapped ? ' ⚠ capped' : ''}</span>
    </div>
    <div class="rel-row rel-row--dim">
      <span class="rel-key">Lorentz γ</span>
      <span class="rel-val">${s.gamma.toFixed(6)}</span>
    </div>
  `;
}
