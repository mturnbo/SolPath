import { PLANETS, SUN } from './data/planets.js';
import { toJ2000Century } from './physics/epoch.js';
import { createCamera, fitSolarSystem } from './render/camera.js';
import { drawAllOrbits } from './render/orbits.js';

const canvas = document.getElementById('solar-system');
const ctx    = canvas.getContext('2d');

let cam;
const T = toJ2000Century(new Date());

function resize() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w   = container.clientWidth;
  const h   = container.clientHeight;

  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';

  ctx.scale(dpr, dpr);

  cam = createCamera(w, h);
  fitSolarSystem(cam, w, h);

  draw();
}

function drawSol() {
  const cx = cam.originX;
  const cy = cam.originY;
  const r  = Math.max(4, SUN.radiusPx);

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
  grad.addColorStop(0,   SUN.color);
  grad.addColorStop(0.4, SUN.color);
  grad.addColorStop(1,   'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  drawAllOrbits(ctx, cam, PLANETS, T);
  drawSol();
}

window.addEventListener('resize', resize);
resize();
