import { PLANETS } from './data/planets.js';
import { toJ2000Century } from './physics/epoch.js';
import { computeMission3D } from './physics/mission3d.js';
import { spacecraftPosition3D } from './render/spacecraft.js';
import { launchPhases } from './render/launch.js';
import { initScene } from './render3d/scene.js';
import { initDatePicker } from './ui/datepicker.js';
import { initMissionPanel } from './ui/panel.js';
import { renderRelativity } from './ui/relativity.js';
import { renderMissionInfo } from './ui/missionInfo.js';
import { createAnimator } from './ui/animator.js';
import { readParams, writeParams, copyPermalink } from './ui/permalink.js';
import { initAboutModal } from './ui/about.js';
import { initTutorial } from './ui/tutorial.js';
import { downloadMissionLog } from './ui/missionLog.js';

const container = document.getElementById('view-3d');
const scene = initScene(container);
scene.frameOverview();

let currentDate = new Date();
let T           = toJ2000Century(currentDate);
let mission     = null;

let missionParams = {
  originPlanet: PLANETS.find(p => p.name === 'Earth'),
  destPlanet:   PLANETS.find(p => p.name === 'Mars'),
  accelG:       1.0,
  detourMode:   'stop',
};

const lerp   = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const clamp01 = t => Math.min(1, Math.max(0, t));

// ── Follow / launch camera ────────────────────────────────────────────────────

let launchView = null;   // { dir: Vector3, startDist: number } captured at launch
let controlsLocked = false;

/** On-screen fraction of view height the rocket billboard should span. */
function rocketFraction(tau, ph) {
  if (tau <= ph.diveEnd)  return lerp(0.05, 0.125, smooth(tau / ph.diveEnd));
  if (tau <= ph.closeEnd) return 0.125;
  if (tau <= ph.detailEnd) return lerp(0.125, 0.03, smooth((tau - ph.closeEnd) / (ph.detailEnd - ph.closeEnd)));
  return 0.03;
}

function followCamera(tau) {
  const ph = launchPhases(mission);
  const shipScene = scene.toScene(spacecraftPosition3D(clamp01(tau), mission));

  if (!launchView) {
    const dir = scene.camera.position.clone().sub(scene.controls.target);
    launchView = { startDist: Math.max(dir.length(), 2.5), dir: dir.normalize() };
  }

  const closeDist = 2.5;
  const farDist   = Math.min(Math.max(mission.distAU * 1.1, 6), 140);

  let dist;
  if (tau <= ph.diveEnd)        dist = lerp(launchView.startDist, closeDist, smooth(tau / ph.diveEnd));
  else if (tau <= ph.closeEnd)  dist = closeDist;
  else if (tau <= ph.farTau)    dist = lerp(closeDist, farDist, smooth((tau - ph.closeEnd) / (ph.farTau - ph.closeEnd)));
  else                          dist = farDist;

  scene.controls.target.copy(shipScene);
  scene.camera.position.copy(shipScene).addScaledVector(launchView.dir, dist);
  scene.controls.update();

  const closeup = tau <= ph.detailEnd;
  scene.setShip(tau, mission, { closeup });
  if (closeup) {
    const fov = scene.camera.fov * Math.PI / 180;
    const h = 2 * dist * Math.tan(fov / 2) * rocketFraction(tau, ph);
    scene.rocketSprite.scale.set(h * (256 / 512), h, 1);
  }
}

// ── Draw (animator tick) ──────────────────────────────────────────────────────

function draw(tau = 0) {
  if (!mission) { scene.setDate(T); scene.clearShip(); return; }

  const T_anim = tau > 0 ? mission.T_depart + (mission.T_arrive - mission.T_depart) * tau : T;
  scene.setDate(T_anim);

  if (tau > 0 && tau < 1) {
    scene.controls.enabled = !controlsLocked;
    scene.showLabels(tau > launchPhases(mission).detailEnd);  // hide during the close-up
    followCamera(tau);
  } else {
    scene.controls.enabled = true;
    scene.showLabels(true);
    scene.clearShip();
  }
}

// ── Animator ──────────────────────────────────────────────────────────────────

const animator = createAnimator(
  tau => draw(tau),
  ()  => { controlsLocked = false; scene.controls.enabled = true; },   // complete
  ()  => { controlsLocked = true; launchView = null; },                // play from start
  ()  => { controlsLocked = false; scene.controls.enabled = true; launchView = null; }, // reset
);

// Releasing the scrub or pausing hands camera control back to the user.
document.getElementById('btn-anim-pause')?.addEventListener('click', () => {
  controlsLocked = false; scene.controls.enabled = true;
});
document.getElementById('anim-scrub')?.addEventListener('pointerup', () => {
  controlsLocked = false; scene.controls.enabled = true;
});

// ── Mission computation ───────────────────────────────────────────────────────

function updateMission() {
  const { originPlanet, destPlanet, accelG, detourMode } = missionParams;
  mission = computeMission3D(originPlanet, destPlanet, currentDate, accelG, detourMode);
  scene.setMission(mission);
  animator.setMission(mission);           // resets tau → calls draw(0)
  renderMissionInfo(mission);
  renderRelativity(mission.trajectory, `${originPlanet.name} → ${destPlanet.name}`, accelG);
}

// ── Permalink ─────────────────────────────────────────────────────────────────

function updatePermalink() {
  writeParams({
    from:   missionParams.originPlanet.name,
    to:     missionParams.destPlanet.name,
    accel:  missionParams.accelG,
    detour: missionParams.detourMode,
    date:   currentDate,
  });
}

const missionPanel = initMissionPanel(params => {
  missionParams = params;
  updateMission();
  updatePermalink();
});

const datePicker = initDatePicker(date => {
  currentDate = date;
  T           = toJ2000Century(date);
  updateMission();
  updatePermalink();
});

// ── Zoom buttons (repurposed for the 3D camera) ───────────────────────────────

document.getElementById('btn-zoom-in') ?.addEventListener('click', () => scene.zoomBy(0.8));
document.getElementById('btn-zoom-out')?.addEventListener('click', () => scene.zoomBy(1.25));
document.getElementById('btn-zoom-fit')?.addEventListener('click', () => scene.frameOverview());

// ── Share + Export Log ────────────────────────────────────────────────────────

document.getElementById('btn-share')?.addEventListener('click', async function () {
  await copyPermalink();
  const orig = this.textContent;
  this.textContent = 'Copied!';
  setTimeout(() => { this.textContent = orig; }, 1500);
});

document.getElementById('btn-export-log')?.addEventListener('click', function () {
  if (!mission) return;
  downloadMissionLog(mission);
  const orig = this.textContent;
  this.textContent = 'Saved!';
  setTimeout(() => { this.textContent = orig; }, 1500);
});

initAboutModal();
initTutorial();

// ── Hover picking (raycast planets) ───────────────────────────────────────────

container.addEventListener('pointermove', e => {
  const rect = container.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  const hit = scene.pick(nx, ny);
  scene.setHovered(hit);
  container.style.cursor = hit ? 'pointer' : 'grab';
});
container.addEventListener('pointerleave', () => scene.setHovered(null));

// ── Apply URL params on first load ────────────────────────────────────────────

(function applyUrlParams() {
  const p = readParams();
  let changed = false;
  if (p.from)   { document.getElementById('select-origin').value = p.from; changed = true; }
  if (p.to)     { document.getElementById('select-dest').value   = p.to;   changed = true; }
  if (p.accel)  {
    const sl = document.getElementById('slider-accel');
    sl.value = p.accel;
    sl.dispatchEvent(new Event('input'));
    changed = true;
  }
  if (p.detour) { document.getElementById('select-detour-mode').value = p.detour; changed = true; }
  if (changed) {
    missionParams = missionPanel.getState();
    updateMission();
  }
  if (p.date) datePicker.setDate(p.date);
  else if (changed) updatePermalink();
})();

updateMission();
updatePermalink();
