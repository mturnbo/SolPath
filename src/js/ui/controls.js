import { zoom, pan, fitSolarSystem, clampPan } from '../render/camera.js';

const ZOOM_WHEEL_FACTOR = 1.12;
const ZOOM_BTN_FACTOR   = 1.4;

/**
 * Attach zoom and pan interaction to the canvas.
 *
 * Supported gestures:
 *   - Mouse wheel          → zoom centred on cursor
 *   - Click + drag         → pan
 *   - Pinch (two fingers)  → zoom centred on midpoint
 *   - Single touch drag    → pan
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}            cam       - camera state (mutated in place)
 * @param {function}          onUpdate  - called after any camera change; triggers redraw
 */
export function initControls(canvas, cam, onUpdate) {

  // ── Mouse wheel zoom ──────────────────────────────────────────────────────

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const sx     = e.clientX - rect.left;
    const sy     = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
    zoom(cam, factor, sx, sy);
    clampPan(cam, canvas.clientWidth, canvas.clientHeight);
    onUpdate();
  }, { passive: false });

  // ── Click-drag pan ────────────────────────────────────────────────────────

  let dragging  = false;
  let lastX     = 0;
  let lastY     = 0;

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true;
    lastX    = e.clientX;
    lastY    = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    pan(cam, dx, dy);
    clampPan(cam, canvas.clientWidth, canvas.clientHeight);
    onUpdate();
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'crosshair';
  });

  // ── Touch: single-finger pan + two-finger pinch zoom ─────────────────────

  let lastTouchX    = 0;
  let lastTouchY    = 0;
  let lastPinchDist = 0;

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function pinchMid(touches, rect) {
    return {
      sx: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
      sy: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top,
    };
  }

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastPinchDist = pinchDist(e.touches);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouchX;
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      pan(cam, dx, dy);
      clampPan(cam, canvas.clientWidth, canvas.clientHeight);
      onUpdate();
    } else if (e.touches.length === 2) {
      const dist   = pinchDist(e.touches);
      const factor = dist / lastPinchDist;
      const mid    = pinchMid(e.touches, rect);
      zoom(cam, factor, mid.sx, mid.sy);
      clampPan(cam, canvas.clientWidth, canvas.clientHeight);
      lastPinchDist = dist;
      onUpdate();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (e.touches.length === 1) {
      lastTouchX    = e.touches[0].clientX;
      lastTouchY    = e.touches[0].clientY;
      lastPinchDist = 0;
    }
  }, { passive: false });
}

/**
 * Wire up the zoom-in, zoom-out, and fit buttons in the canvas overlay.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object}            cam
 * @param {function}          onUpdate
 */
export function initZoomButtons(canvas, cam, onUpdate) {
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoom(cam, ZOOM_BTN_FACTOR, canvas.clientWidth / 2, canvas.clientHeight / 2);
    onUpdate();
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    zoom(cam, 1 / ZOOM_BTN_FACTOR, canvas.clientWidth / 2, canvas.clientHeight / 2);
    onUpdate();
  });

  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    fitSolarSystem(cam, canvas.clientWidth, canvas.clientHeight);
    onUpdate();
  });
}
