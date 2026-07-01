/**
 * Camera coordinate system tests — run in browser console:
 *   import('/src/js/render/camera.test.js')
 */

import {
  createCamera, worldToScreen, screenToWorld,
  zoom, pan, fitSolarSystem,
} from './camera.js';

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

const W = 800, H = 600;

// ── worldToScreen ────────────────────────────────────────────────────────────

// World origin (Sol) maps to canvas centre
{
  const cam = createCamera(W, H);
  const { sx, sy } = worldToScreen(cam, 0, 0);
  assert('worldToScreen: origin → canvas centre', approx(sx, W / 2) && approx(sy, H / 2),
    `sx=${sx} sy=${sy}`);
}

// +Y world is -Y screen (Y-axis flip)
{
  const cam = createCamera(W, H);
  const { sy: sy0 } = worldToScreen(cam, 0, 0);
  const { sy: sy1 } = worldToScreen(cam, 0, 1);
  assert('worldToScreen: +Y world → smaller screen Y', sy1 < sy0,
    `sy(0)=${sy0} sy(1AU)=${sy1}`);
}

// +X world is +X screen
{
  const cam = createCamera(W, H);
  const { sx: sx0 } = worldToScreen(cam, 0, 0);
  const { sx: sx1 } = worldToScreen(cam, 1, 0);
  assert('worldToScreen: +X world → larger screen X', sx1 > sx0,
    `sx(0)=${sx0} sx(1AU)=${sx1}`);
}

// ── screenToWorld ────────────────────────────────────────────────────────────

// Canvas centre maps to world origin
{
  const cam = createCamera(W, H);
  const { wx, wy } = screenToWorld(cam, W / 2, H / 2);
  assert('screenToWorld: canvas centre → world origin', approx(wx, 0) && approx(wy, 0),
    `wx=${wx} wy=${wy}`);
}

// Round-trip: world → screen → world
{
  const cam = createCamera(W, H);
  const wx0 = 3.5, wy0 = -1.2;
  const { sx, sy } = worldToScreen(cam, wx0, wy0);
  const { wx, wy } = screenToWorld(cam, sx, sy);
  assert('Round-trip world→screen→world', approx(wx, wx0) && approx(wy, wy0),
    `in=(${wx0},${wy0}) out=(${wx.toFixed(6)},${wy.toFixed(6)})`);
}

// ── zoom ─────────────────────────────────────────────────────────────────────

// Zooming in increases scale
{
  const cam = createCamera(W, H);
  const before = cam.scale;
  zoom(cam, 2, W / 2, H / 2);
  assert('zoom: factor>1 increases scale', cam.scale > before,
    `before=${before.toFixed(4)} after=${cam.scale.toFixed(4)}`);
}

// Zoom centred on Sol: Sol stays at canvas centre
{
  const cam = createCamera(W, H);
  zoom(cam, 3, W / 2, H / 2);
  const { sx, sy } = worldToScreen(cam, 0, 0);
  assert('zoom: Sol stays at centre when zooming from centre',
    approx(sx, W / 2, 0.01) && approx(sy, H / 2, 0.01),
    `sx=${sx.toFixed(2)} sy=${sy.toFixed(2)}`);
}

// Zoom respects maxScale
{
  const cam = createCamera(W, H);
  zoom(cam, 1e9, W / 2, H / 2);
  assert('zoom: clamps at maxScale', cam.scale <= cam.maxScale,
    `scale=${cam.scale}`);
}

// Zoom respects minScale
{
  const cam = createCamera(W, H);
  zoom(cam, 1e-9, W / 2, H / 2);
  assert('zoom: clamps at minScale', cam.scale >= cam.minScale,
    `scale=${cam.scale}`);
}

// ── pan ──────────────────────────────────────────────────────────────────────

{
  const cam = createCamera(W, H);
  const ox = cam.originX, oy = cam.originY;
  pan(cam, 50, -30);
  assert('pan: shifts origin correctly',
    approx(cam.originX, ox + 50) && approx(cam.originY, oy - 30),
    `origin=(${cam.originX},${cam.originY})`);
}

// ── fitSolarSystem ────────────────────────────────────────────────────────────

{
  const cam = createCamera(W, H);
  fitSolarSystem(cam, W, H, 36, 24);
  const { sx: sx0, sy: sy0 } = worldToScreen(cam, 0, 0);
  assert('fitSolarSystem: Sol at canvas centre',
    approx(sx0, W / 2, 0.01) && approx(sy0, H / 2, 0.01),
    `sx=${sx0} sy=${sy0}`);
}

console.log('Camera tests complete.');
