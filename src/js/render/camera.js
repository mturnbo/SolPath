/**
 * Camera — world-to-screen coordinate transform.
 *
 * World space: AU, origin at Sol, +X right, +Y up.
 * Screen space: pixels, origin at top-left, +X right, +Y down.
 *
 * State is a plain object so it can be passed around without a class instance.
 * All mutation goes through the exported helpers.
 */

/**
 * Create a camera with sensible defaults centred on the solar system.
 *
 * @param {number} canvasWidth  - logical canvas width (CSS pixels)
 * @param {number} canvasHeight - logical canvas height (CSS pixels)
 * @returns {Camera}
 */
export function createCamera(canvasWidth, canvasHeight) {
  return {
    // Pan offset: the screen position (px) of the world origin (Sol)
    originX: canvasWidth  / 2,
    originY: canvasHeight / 2,

    // Pixels per AU
    scale: Math.min(canvasWidth, canvasHeight) / 70,

    // Zoom bounds
    minScale: 0.5,
    maxScale: 2000,
  };
}

/**
 * Convert a world position (AU) to a screen position (px).
 *
 * @param {Camera}  cam
 * @param {number}  wx  world X (AU)
 * @param {number}  wy  world Y (AU)
 * @returns {{ sx: number, sy: number }}
 */
export function worldToScreen(cam, wx, wy) {
  return {
    sx: cam.originX + wx * cam.scale,
    sy: cam.originY - wy * cam.scale,   // Y-axis flip: world +Y is screen -Y
  };
}

/**
 * Convert a screen position (px) to a world position (AU).
 *
 * @param {Camera}  cam
 * @param {number}  sx  screen X (px)
 * @param {number}  sy  screen Y (px)
 * @returns {{ wx: number, wy: number }}
 */
export function screenToWorld(cam, sx, sy) {
  return {
    wx: (sx - cam.originX) / cam.scale,
    wy: (cam.originY - sy) / cam.scale,
  };
}

/**
 * Apply a zoom step centred on a screen point (e.g. mouse cursor position).
 * The world point under the cursor stays fixed.
 *
 * @param {Camera}  cam
 * @param {number}  factor  >1 to zoom in, <1 to zoom out
 * @param {number}  sx      screen X to zoom around (px)
 * @param {number}  sy      screen Y to zoom around (px)
 */
export function zoom(cam, factor, sx, sy) {
  const newScale = Math.min(cam.maxScale, Math.max(cam.minScale, cam.scale * factor));
  const scaleRatio = newScale / cam.scale;

  // Keep the world point under (sx, sy) fixed
  cam.originX = sx - (sx - cam.originX) * scaleRatio;
  cam.originY = sy - (sy - cam.originY) * scaleRatio;
  cam.scale   = newScale;
}

/**
 * Pan the camera by a screen-space delta (px).
 *
 * @param {Camera}  cam
 * @param {number}  dx
 * @param {number}  dy
 */
export function pan(cam, dx, dy) {
  cam.originX += dx;
  cam.originY += dy;
}

/**
 * Reset the camera to fit a circle of `radiusAU` at the centre of the canvas.
 *
 * @param {Camera}  cam
 * @param {number}  canvasWidth
 * @param {number}  canvasHeight
 * @param {number}  radiusAU     - world radius to fit (default 36 AU covers Neptune)
 * @param {number}  paddingPx    - padding inside the canvas edge
 */
export function fitSolarSystem(cam, canvasWidth, canvasHeight, radiusAU = 36, paddingPx = 24) {
  const available = Math.min(canvasWidth, canvasHeight) - paddingPx * 2;
  cam.scale   = available / (radiusAU * 2);
  cam.originX = canvasWidth  / 2;
  cam.originY = canvasHeight / 2;
}

/**
 * Clamp the camera origin so that Sol is never more than `marginAU` off-screen.
 * Prevents the user from panning completely away.
 *
 * @param {Camera}  cam
 * @param {number}  canvasWidth
 * @param {number}  canvasHeight
 * @param {number}  marginAU
 */
export function clampPan(cam, canvasWidth, canvasHeight, marginAU = 10) {
  const margin = marginAU * cam.scale;
  cam.originX = Math.min(canvasWidth  + margin, Math.max(-margin, cam.originX));
  cam.originY = Math.min(canvasHeight + margin, Math.max(-margin, cam.originY));
}
