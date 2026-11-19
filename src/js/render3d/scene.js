import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLANETS, STAR } from '../data/planets.js';
import { planetPosition } from '../physics/kepler.js';
import { orbitPoints } from '../render/orbits.js';
import { SOLAR_EXCLUSION_AU } from '../physics/trajectory.js';
import { spacecraftPosition3D, drawDetailedRocket } from '../render/spacecraft.js';

// Exaggerated display radii (AU) so bodies are visible at solar-system scale.
const DISPLAY_RADIUS = {
  Mercury: 0.22, Venus: 0.3, Earth: 0.32, Mars: 0.26,
  Jupiter: 0.9, Saturn: 0.8, Uranus: 0.6, Neptune: 0.6, Pluto: 0.18,
};

// Map heliocentric ecliptic coords (x,y = ecliptic plane, z = out of plane) to
// scene space with Y up, so inclinations rise vertically like an orrery.
function toScene({ x, y, z }) {
  return new THREE.Vector3(x, z, y);
}

/** Soft radial-gradient texture for glow sprites (an untextured sprite is a
 * flat opaque quad, so the halo needs a real alpha map). */
function makeGlowTexture() {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Render the detailed rocket art to a canvas texture and wrap it in a
 * camera-facing sprite (nose up). The launch animation scales this up for the
 * close-up; on the map it stays hidden in favour of the cone marker.
 */
function makeRocketSprite() {
  const W = 256, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  // Draw nose-up, body spanning most of the canvas height.
  drawDetailedRocket(ctx, W / 2, H * 0.44, H * 0.82, -Math.PI / 2, true);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
  }));
  sprite.scale.set(1 * (W / H), 1, 1);  // preserve aspect; caller scales up
  return sprite;
}

/**
 * Build the 3D solar-system scene inside `container` and return a small handle.
 *
 * @param {HTMLElement} container
 * @returns {{ setDate(T:number):void, resize():void, dispose():void }}
 */
export function initScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 4000);
  camera.position.set(0, 45, 65);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2;
  controls.maxDistance = 600;
  controls.target.set(0, 0, 0);

  // ── Lighting ──
  const sunLight = new THREE.PointLight(0xffffff, 2.2, 0, 0); // no distance falloff
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x3a3f52, 0.6));

  // ── Sun ── kept smaller than the 0.35 AU exclusion zone so the zone reads as
  // a shell around it (display radii are stylised, not to scale).
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 32, 32),
    new THREE.MeshBasicMaterial({ color: STAR.color }),
  );
  scene.add(sun);

  // ── Starfield ──
  const starGeo = new THREE.BufferGeometry();
  const starCount = 2500, starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 300);
    starPos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaab4d0, size: 1.4, sizeAttenuation: false })));

  // ── Planets + orbits (rebuilt on date change) ──
  const bodies = PLANETS.map(planet => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(DISPLAY_RADIUS[planet.name] ?? 0.3, 24, 24),
      new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.75, metalness: 0.05 }),
    );
    scene.add(mesh);

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: planet.color, transparent: true, opacity: 0.35 }),
    );
    scene.add(orbit);
    return { planet, mesh, orbit };
  });

  function setDate(T) {
    for (const { planet, mesh, orbit } of bodies) {
      mesh.position.copy(toScene(planetPosition(planet, T)));
      const pts = orbitPoints(planet, T).map(toScene);
      orbit.geometry.setFromPoints(pts);
    }
  }

  // ── Solar exclusion zone (translucent sphere around Sol) ──
  const exclusion = new THREE.Mesh(
    new THREE.SphereGeometry(SOLAR_EXCLUSION_AU, 32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xff5a3c, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  scene.add(exclusion);

  // ── Mission trajectory (rebuilt whenever a mission is set) ──
  const missionGroup = new THREE.Group();
  scene.add(missionGroup);

  function disposeGroup(group) {
    for (const child of group.children) {
      child.geometry?.dispose();
      child.material?.dispose();
    }
    group.clear();
  }

  function marker(pos, color, radius = 0.28) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({ color }),
    );
    m.position.copy(toScene(pos));
    return m;
  }

  /**
   * Render a mission trajectory from a computeMission3D() result.
   * Pass null to clear the current mission.
   */
  function setMission(mission) {
    disposeGroup(missionGroup);
    if (!mission) return;

    const pts = mission.pathPoints.map(toScene);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.95 }),
    );
    missionGroup.add(line);

    missionGroup.add(marker(mission.departurePos, 0x5effa0));  // departure — green
    missionGroup.add(marker(mission.arrivalPos, 0x5ec8ff));    // arrival — cyan
    if (mission.midpointPos) missionGroup.add(marker(mission.midpointPos, 0xffffff, 0.2)); // flip
    if (mission.isRerouted && mission.waypoint) {
      missionGroup.add(marker(mission.waypoint, 0xffc24d, 0.22));  // detour waypoint — amber
    }
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function dispose() {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  // ── Spacecraft ──
  // Map view: a small cone marker pointing along the direction of travel, plus a
  // glow. Close-up: a camera-facing billboard of the detailed rocket (same art as
  // the 2D launch view), rendered once to a canvas texture.
  const ship = new THREE.Group();
  ship.visible = false;
  scene.add(ship);

  const shipCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.5, 20),
    new THREE.MeshBasicMaterial({ color: 0xeaf4ff }),
  );
  ship.add(shipCone);
  const shipGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0x9cccff,
    transparent: true, opacity: 0.6, depthWrite: false,
  }));
  shipGlow.scale.setScalar(0.9);
  ship.add(shipGlow);

  const rocketSprite = makeRocketSprite();
  rocketSprite.visible = false;
  ship.add(rocketSprite);

  const CONE_UP = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tangent = new THREE.Vector3();

  /**
   * Place the ship at normalized time tau along a mission.
   * opts.closeup renders the rocket billboard instead of the cone marker.
   */
  function setShip(tau, mission, opts = {}) {
    if (!mission) { ship.visible = false; return; }
    ship.visible = true;

    const t = Math.min(Math.max(tau, 0), 1);
    const here = spacecraftPosition3D(t, mission);
    tmpA.copy(toScene(here));
    ship.position.copy(tmpA);

    // Direction of travel from a short finite step along the path.
    const dt = 1e-3;
    const other = spacecraftPosition3D(t + dt <= 1 ? t + dt : t - dt, mission);
    tmpB.copy(toScene(other));
    tangent.subVectors(t + dt <= 1 ? tmpB : tmpA, t + dt <= 1 ? tmpA : tmpB);
    if (tangent.lengthSq() > 1e-12) {
      tangent.normalize();
      shipCone.quaternion.setFromUnitVectors(CONE_UP, tangent);
    }

    const closeup = !!opts.closeup;
    rocketSprite.visible = closeup;
    shipCone.visible = !closeup;
    shipGlow.visible = !closeup;
  }

  function clearShip() { ship.visible = false; }

  return {
    setDate, setMission, setShip, clearShip, rocketSprite,
    resize, dispose, scene, camera, controls, toScene,
  };
}
