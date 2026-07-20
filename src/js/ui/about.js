import { drawStarfield } from '../render/starfield.js';

// How far the starfield origin shifts per pixel of modal scroll. The layer
// parallax factors are small (0.02–0.13), so amplify scroll to make the
// depth effect visible.
const SCROLL_FACTOR = 6;

export function initAboutModal() {
  const overlay  = document.getElementById('about-modal');
  const openBtn  = document.getElementById('btn-about');
  const closeBtn = document.getElementById('about-close');
  const body     = document.getElementById('about-body');
  const canvas   = document.getElementById('about-starfield');
  const ctx      = canvas.getContext('2d');

  const cam = { originX: 0, originY: 0 };
  let framePending = false;

  function drawBackground() {
    framePending = false;
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.clientWidth;
    const h   = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawStarfield(ctx, cam, w, h);
  }

  function requestDraw() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(drawBackground);
  }

  function open() {
    overlay.hidden = false;
    body.scrollTop = 0;
    cam.originY    = 0;
    drawBackground();
  }

  function close() {
    overlay.hidden = true;
  }

  body.addEventListener('scroll', () => {
    cam.originY = -body.scrollTop * SCROLL_FACTOR;
    requestDraw();
  });

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
  window.addEventListener('resize', () => { if (!overlay.hidden) requestDraw(); });
}
