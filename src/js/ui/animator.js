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
export function createAnimator(onTick, onComplete = null) {
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
      if (onComplete) onComplete();
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

  let dir = mission.direction;
  if (mission.isRerouted) {
    let tau1;
    if (mission.isSmooth) {
      // Invert the brachistochrone position function to find tau where
      // the spacecraft crosses the waypoint (at fraction f1 of total distance).
      const f1 = mission.leg1DistAU / (mission.leg1DistAU + mission.leg2DistAU);
      tau1 = f1 < 0.5 ? Math.sqrt(f1 / 2) : 1 - Math.sqrt((1 - f1) / 2);
    } else {
      tau1 = mission.leg1.coordTimeDays / mission.trajectory.coordTimeDays;
    }
    dir = tau <= tau1 ? mission.direction1 : mission.direction2;
  }

  return { pos, dir };
}
