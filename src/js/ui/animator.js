import { formatDuration } from '../physics/trajectory.js';
import { spacecraftPosition } from '../render/spacecraft.js';

/** Wall-clock seconds for a complete mission animation */
const ANIMATION_DURATION_S = 10;

/**
 * Create and return an animator instance.
 *
 * The animator drives a requestAnimationFrame loop that advances `tau` (0–1)
 * over ANIMATION_DURATION_S seconds. On each tick it calls `onTick(tau)`
 * so the caller can redraw.
 *
 * @param {function} onTick  - called with current tau (0–1) on each frame
 * @returns {Animator}
 */
export function createAnimator(onTick) {
  let playing    = false;
  let tau        = 0;
  let lastTs     = null;
  let rafId      = null;
  let mission    = null;

  function tick(ts) {
    if (!playing) return;
    if (lastTs !== null) {
      const dt = (ts - lastTs) / 1000;               // seconds elapsed
      tau = Math.min(1, tau + dt / ANIMATION_DURATION_S);
    }
    lastTs = ts;
    onTick(tau);
    updateElapsed(tau, mission);

    if (tau < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      playing = false;
      updateButtons();
    }
  }

  function play() {
    if (tau >= 1) tau = 0;
    playing = true;
    lastTs  = null;
    rafId   = requestAnimationFrame(tick);
    updateButtons();
  }

  function pause() {
    playing = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    updateButtons();
  }

  function reset() {
    pause();
    tau = 0;
    onTick(tau);
    updateElapsed(tau, mission);
    updateButtons();
  }

  function setMission(m) {
    mission = m;
    reset();
  }

  function updateButtons() {
    const playBtn  = document.getElementById('btn-anim-play');
    const pauseBtn = document.getElementById('btn-anim-pause');
    if (!playBtn || !pauseBtn) return;
    playBtn.disabled  = playing;
    pauseBtn.disabled = !playing;
  }

  function updateElapsed(t, m) {
    const el = document.getElementById('anim-elapsed');
    if (!el || !m) return;
    const elapsedDays = t * m.trajectory.coordTimeDays;
    el.textContent = t === 0
      ? 'T + 0'
      : `T + ${formatDuration(elapsedDays)}`;
  }

  // Wire up buttons
  document.getElementById('btn-anim-play') ?.addEventListener('click', play);
  document.getElementById('btn-anim-pause')?.addEventListener('click', pause);
  document.getElementById('btn-anim-reset')?.addEventListener('click', reset);

  updateButtons();

  return { play, pause, reset, setMission, getTau: () => tau };
}

/**
 * Get the current spacecraft world position and direction for drawing.
 *
 * @param {number} tau
 * @param {object} mission
 * @returns {{ pos: {x,y}, dir: {nx,ny} } | null}
 */
export function getSpacecraftState(tau, mission) {
  if (!mission || tau <= 0 || tau >= 1) return null;
  const pos = spacecraftPosition(tau, mission);
  return { pos, dir: mission.direction };
}
