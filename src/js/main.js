import { PLANETS, STAR } from './data/planets.js';
import { toJ2000Century } from './physics/epoch.js';
import { computeMission } from './physics/mission.js';
import { createCamera, fitSolarSystem } from './render/camera.js';
import { drawAllOrbits } from './render/orbits.js';
import { drawAllPlanets, hitTestPlanet } from './render/planets.js';
import { drawTrajectory, drawDepartureMarker, drawExclusionRing } from './render/trajectory.js';
import { drawSpacecraft, spacecraftPosition } from './render/spacecraft.js';
import { drawComparisonTrajectories, drawComparisonLegend } from './render/comparison.js';
import { drawArrivalOverlay, triggerArrivalFlash, isFlashing } from './render/arrivalOverlay.js';
import { drawDeparturePlaceholders } from './render/departurePlaceholders.js';
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
let savedCam         = null;
let currentDate      = new Date();
let T                = toJ2000Century(currentDate);
let mission          = null;
let comparisonMissions = [];
let compareEnabled   = false;

let missionParams = {
  originPlanet: PLANETS.find(p => p.name === 'Earth'),
  destPlanet:   PLANETS.find(p => p.name === 'Mars'),
  accelG:       1.0,
  detourMode:   'stop',
};

// ── Follow camera ─────────────────────────────────────────────────────────────

function followCamera(tau, w, h) {
  const pos = spacecraftPosition(tau, mission);

  // Use the leg-1/leg-2 boundary as the zoom-out target for stop-mode detours;
  // for everything else the brachistochrone flip at tau=0.5 is close enough.
  let flipTau = 0.5;
  if (mission.isRerouted && !mission.isSmooth) {
    flipTau = mission.leg1.coordTimeDays / mission.trajectory.coordTimeDays;
  } else if (mission.trajectory.isCapped) {
    flipTau = mission.trajectory.accelTimeDays / mission.trajectory.coordTimeDays;
  }

  // Near view: 0.5 AU minimum radius around the ship, scaled up for long trips.
  const displayRadius = Math.max(0.5, mission.distAU * 0.15);
  const scaleNear     = Math.min(w / (2 * displayRadius), 300);

  // Far view: show the mission extent; never exceeds near scale.
  const contextRadius = Math.max(displayRadius, mission.distAU * 0.7);
  const scaleFar      = Math.max(8, Math.min(w / (2 * contextRadius), scaleNear));

  // Intro phase: first 20% of time-to-flip (capped at 15% of total animation).
  const introTau = Math.max(0.02, Math.min(flipTau * 0.2, 0.15));

  function lerp(a, b, t)   { return a + (b - a) * t; }
  function smooth(t)        { return t * t * (3 - 2 * t); }  // smoothstep
  function shipOX(s)        { return w / 2 - pos.x * s; }
  function shipOY(s)        { return h / 2 + pos.y * s; }

  let targetScale, targetOX, targetOY;

  if (tau <= introTau) {
    // Phase 0: zoom in from overview and pan to center the ship.
    const t = smooth(tau / introTau);
    const startScale = savedCam ? savedCam.scale   : cam.scale;
    const startOX    = savedCam ? savedCam.originX : cam.originX;
    const startOY    = savedCam ? savedCam.originY : cam.originY;
    targetScale = lerp(startScale, scaleNear, t);
    targetOX    = lerp(startOX,    shipOX(scaleNear), t);
    targetOY    = lerp(startOY,    shipOY(scaleNear), t);
  } else if (tau <= flipTau) {
    // Phase 1: ship centered, smoothly zoom out toward the flip point.
    const t = smooth((tau - introTau) / (flipTau - introTau));
    targetScale = lerp(scaleNear, scaleFar, t);
    targetOX    = shipOX(targetScale);
    targetOY    = shipOY(targetScale);
  } else {
    // Phase 2: post-flip, ship centered at the far scale.
    targetScale = scaleFar;
    targetOX    = shipOX(targetScale);
    targetOY    = shipOY(targetScale);
  }

  cam.scale   = targetScale;
  cam.originX = targetOX;
  cam.originY = targetOY;
}

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
  ()  => { savedCam = { scale: cam.scale, originX: cam.originX, originY: cam.originY }; },
  ()  => {
    if (savedCam) {
      cam.scale   = savedCam.scale;
      cam.originX = savedCam.originX;
      cam.originY = savedCam.originY;
      savedCam    = null;
    }
  },
);

// ── Mission computation ───────────────────────────────────────────────────────

function updateMission() {
  const { originPlanet, destPlanet, accelG, detourMode } = missionParams;
  mission = computeMission(originPlanet, destPlanet, currentDate, accelG, detourMode);
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

  if (tau > 0 && tau < 1 && mission && !compareEnabled) {
    followCamera(tau, w, h);
  }

  // Animate planet positions during spacecraft animation: interpolate T between
  // departure and arrival as tau goes 0→1.
  const T_anim = (mission && tau > 0)
    ? mission.T_depart + (mission.T_arrive - mission.T_depart) * tau
    : T;

  drawAllOrbits(ctx, cam, PLANETS, T);
  drawStar();
  drawAllPlanets(ctx, cam, PLANETS, T_anim, hoveredPlanet);

  if (compareEnabled && comparisonMissions.length > 0) {
    drawComparisonTrajectories(ctx, cam, comparisonMissions);
    drawComparisonLegend(ctx, w, comparisonMissions);
  } else if (mission) {
    if (mission.isRerouted) drawExclusionRing(ctx, cam);
    drawDeparturePlaceholders(ctx, cam, mission, tau);
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
