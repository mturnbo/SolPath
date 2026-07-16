// Deterministic LCG so stars are stable across redraws
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// Three parallax layers: far (barely moves), mid, near.
const LAYERS = [
  { count: 100, rMin: 0.3, rMax: 0.8,  aMin: 0.20, aMax: 0.50, parallax: 0.02 },
  { count:  60, rMin: 0.5, rMax: 1.1,  aMin: 0.30, aMax: 0.65, parallax: 0.06 },
  { count:  25, rMin: 0.7, rMax: 1.4,  aMin: 0.45, aMax: 0.80, parallax: 0.13 },
];

// Virtual tile size — stars placed in [0, TILE) then tiled by canvas dimensions
const TILE = 4096;

const STARS = (() => {
  const rand = lcg(0xdeadbeef);
  return LAYERS.flatMap((layer, li) =>
    Array.from({ length: layer.count }, () => ({
      vx:       rand() * TILE,
      vy:       rand() * TILE,
      r:        layer.rMin + rand() * (layer.rMax - layer.rMin),
      a:        layer.aMin + rand() * (layer.aMax - layer.aMin),
      parallax: layer.parallax,
      // Subtle colour tint: most white, occasional warm/cool
      hue:      rand() < 0.15 ? (rand() < 0.5 ? 210 : 45) : 0,
    })),
  );
})();

/**
 * Draw the starfield background with parallax.
 *
 * Stars in deeper layers shift less with camera pan, creating depth.
 * Each star's screen position is: (vx + originX * parallax) mod canvasW,
 * so the field tiles seamlessly as you pan.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ originX: number, originY: number }} cam
 * @param {number} w  canvas width  (CSS pixels)
 * @param {number} h  canvas height (CSS pixels)
 */
export function drawStarfield(ctx, cam, w, h) {
  ctx.save();

  for (const star of STARS) {
    const sx = ((star.vx + cam.originX * star.parallax) % w + w) % w;
    const sy = ((star.vy + cam.originY * star.parallax) % h + h) % h;

    ctx.globalAlpha = star.a;
    ctx.fillStyle   = star.hue === 0 ? '#ffffff' : `hsl(${star.hue},60%,90%)`;
    ctx.beginPath();
    ctx.arc(sx, sy, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
