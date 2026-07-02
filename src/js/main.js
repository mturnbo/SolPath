import { PLANETS, STAR } from './data/planets.js';
import { toJ2000Century } from './physics/epoch.js';
import { computeMission } from './physics/mission.js';
import { createCamera, fitSolarSystem } from './render/camera.js';
import { drawAllOrbits } from './render/orbits.js';
import { drawAllPlanets, hitTestPlanet } from './render/planets.js';
import { drawTrajectory, drawDepartureMarker } from './render/trajectory.js';
import { drawSpacecraft } from './render/spacecraft.js';
import { drawComparisonTrajectories, drawComparisonLegend } from './render/comparison.js';
import { drawArrivalOverlay, triggerArrivalFlash, isFlashing } from './render/arrivalOverlay.js';
import { initDatePicker } from './ui/datepicker.js';
import { initControls, initZoomButtons } from './ui/controls.js';
import { initMissionPanel } from './ui/panel.js';
import { initComparisonPanel } from './ui/comparison.js';
import { renderRelativity } from './ui/relativity.js';
import { renderMissionInfo } from './ui/missionInfo.js';
import { createAnimator, getSpacecraftState } from './ui/animator.js';

const canvas = document.getElementById('solar-system');
const ctx    = canvas.getContext('2d');

const cam = createCamera(canvas.clientWidth || 800, canvas.clientHeight || 600);

let hoveredPlanet    = null;
let currentDate      = new Date();
let T                = toJ2000Century(currentDate);
let mission          = null;
let comparisonMissions = [];
let compareEnabled   = false;

let missionParams = {
  originPlanet: PLANETS.find(p => p.name === 'Earth'),
  destPlanet:   PLANETS.find(p => p.name === 'Mars'),
  accelG:       1.0,
};

// ── Animator ──────────────────────────────────────────────────────────────────

function startFlashLoop() {
  triggerArrivalFlash();
  function flashFrame() {
    draw(1);
    if (isFlashing()) requestAnimationFrame(flashFrame);
  }
  requestAnimationFrame(flashFrame);
}

const animator = createAnimator(
  tau => draw(tau),
  ()  => startFlashLoop(),
);

// ── Mission computation ───────────────────────────────────────────────────────

function updateMission() {
  const { originPlanet, destPlanet, accelG } = missionParams;
  mission = computeMission(originPlanet, destPlanet, currentDate, accelG);
  animator.setMission(mission);
  renderMissionInfo(mission);
  renderRelativity(mission.trajectory, `${originPlanet.name} → ${destPlanet.name}`, accelG);
}

function updateComparisons(activeAccels) {
  const { originPlanet, destPlanet } = missionParams;
  comparisonMissions = activeAccels.map(g =>
    computeMission(originPlanet, destPlanet, currentDate, g)
  );
}

// ── Rendering ─────────────────────────────────────────────────────────────────

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
  fitSolarSystem(cam, w, h);
  draw(animator.getTau());
}

function drawStar() {
  const cx = cam.originX;
  const cy = cam.originY;
  const r  = Math.max(4, STAR.radiusPx);

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
  grad.addColorStop(0,   STAR.color);
  grad.addColorStop(0.4, STAR.color);
  grad.addColorStop(1,   'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw(tau = 0) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  drawAllOrbits(ctx, cam, PLANETS, T);
  drawStar();
  drawAllPlanets(ctx, cam, PLANETS, T, hoveredPlanet);

  if (compareEnabled && comparisonMissions.length > 0) {
    drawComparisonTrajectories(ctx, cam, comparisonMissions);
    drawComparisonLegend(ctx, w, comparisonMissions);
  } else if (mission) {
    drawArrivalOverlay(ctx, cam, mission);
    drawTrajectory(ctx, cam, mission);
    drawDepartureMarker(ctx, cam, mission);

    const sc = getSpacecraftState(tau, mission);
    if (sc) drawSpacecraft(ctx, cam, sc.pos, sc.dir);
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────

initControls(canvas, cam, () => draw(animator.getTau()));
initZoomButtons(canvas, cam, () => draw(animator.getTau()));

initMissionPanel(params => {
  missionParams = params;
  updateMission();
  if (compareEnabled) updateComparisons(comparison.getActiveAccels());
  draw(0);
});

const comparison = initComparisonPanel(({ enabled, activeAccels }) => {
  compareEnabled = enabled;
  if (enabled) updateComparisons(activeAccels);
  draw(animator.getTau());
});

initDatePicker(date => {
  currentDate = date;
  T           = toJ2000Century(date);
  updateMission();
  if (compareEnabled) updateComparisons(comparison.getActiveAccels());
  draw(0);
});

// ── Hover ─────────────────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const hit = hitTestPlanet(cam, PLANETS, T, sx, sy);

  if (hit !== hoveredPlanet) {
    hoveredPlanet = hit;
    canvas.style.cursor = hit ? 'pointer' : 'crosshair';
    draw(animator.getTau());
  }
});

canvas.addEventListener('mouseleave', () => {
  if (hoveredPlanet !== null) {
    hoveredPlanet = null;
    draw(animator.getTau());
  }
});

window.addEventListener('resize', resize);
resize();
updateMission();
