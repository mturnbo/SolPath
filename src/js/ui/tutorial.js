// First-load tutorial: a short spotlight walkthrough of the main controls.
// Auto-runs once on a clean first visit; replayable anytime from the Help button
// or the About popup.

const SEEN_KEY = 'solpath.tutorialSeen';

// Each step spotlights a real element (target = CSS selector) with a short blurb.
// A null target shows a centered card (welcome / finish).
const TUTORIAL_STEPS = [
  {
    target: null,
    title: 'Welcome to SolPath',
    text: 'Plan a constant-thrust trip between the planets. Here’s a 30-second tour of the controls.',
  },
  {
    target: '#section-mission',
    title: 'Mission Planner',
    text: 'Pick an origin and destination, set the acceleration, and choose how to handle paths that skim the Sun.',
  },
  {
    target: '#section-date',
    title: 'Departure Date',
    text: 'Set when you leave. The planets move, so the geometry and travel time change with the date.',
  },
  {
    target: '#section-animation',
    title: 'Fly the Mission',
    text: 'Play the flip-and-burn animation, change the speed, or drag the scrub bar to seek anywhere in the trip.',
  },
  {
    target: '#canvas-container',
    title: 'The Map',
    text: 'Drag to pan and scroll to zoom. The ship follows the trajectory, flipping at the midpoint to decelerate.',
  },
  {
    target: '#section-info',
    title: 'Results & Logs',
    text: 'Read travel time, speed, and Δv here — and use Export Log to download an hourly CSV of the trip. Replay this tour anytime from the ‽ Help button.',
  },
];

/** Pure predicate (exported for tests): auto-run only on a clean first visit. */
export function shouldAutoStart({ seen, hasParams }) {
  return !seen && !hasParams;
}

function readSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode — ignore */ }
}

export function initTutorial() {
  // ── Build the overlay once ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'tut-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="tut-highlight"></div>
    <div class="tut-card" role="dialog" aria-modal="true" aria-labelledby="tut-title">
      <h3 class="tut-title" id="tut-title"></h3>
      <p class="tut-text"></p>
      <div class="tut-footer">
        <span class="tut-count"></span>
        <div class="tut-btns">
          <button type="button" class="tut-skip">Skip</button>
          <button type="button" class="tut-back">Back</button>
          <button type="button" class="tut-next">Next</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const highlight = overlay.querySelector('.tut-highlight');
  const card      = overlay.querySelector('.tut-card');
  const titleEl   = overlay.querySelector('.tut-title');
  const textEl    = overlay.querySelector('.tut-text');
  const countEl   = overlay.querySelector('.tut-count');
  const backBtn   = overlay.querySelector('.tut-back');
  const nextBtn   = overlay.querySelector('.tut-next');
  const skipBtn   = overlay.querySelector('.tut-skip');

  let index = 0;
  let active = false;

  function positionFor(step) {
    const el = step.target && document.querySelector(step.target);
    if (!el) {
      overlay.classList.add('tut-overlay--dim');
      highlight.hidden = true;
      card.style.left = `${(window.innerWidth  - card.offsetWidth)  / 2}px`;
      card.style.top  = `${(window.innerHeight - card.offsetHeight) / 2}px`;
      return;
    }
    overlay.classList.remove('tut-overlay--dim');
    highlight.hidden = false;

    const r   = el.getBoundingClientRect();
    const pad = 6;
    highlight.style.left   = `${r.left - pad}px`;
    highlight.style.top    = `${r.top - pad}px`;
    highlight.style.width  = `${r.width + pad * 2}px`;
    highlight.style.height = `${r.height + pad * 2}px`;

    // Place the card beside the target: prefer right, then left, else centered.
    const gap = 16, m = 12;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let left = r.right + gap;
    if (left + cw > window.innerWidth - m) left = r.left - gap - cw;
    if (left < m) left = Math.max(m, (window.innerWidth - cw) / 2);
    let top = r.top + r.height / 2 - ch / 2;
    top = Math.min(Math.max(top, m), window.innerHeight - ch - m);
    card.style.left = `${left}px`;
    card.style.top  = `${top}px`;
  }

  function render() {
    const step = TUTORIAL_STEPS[index];
    titleEl.textContent = step.title;
    textEl.textContent  = step.text;
    countEl.textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
    backBtn.disabled = index === 0;
    nextBtn.textContent = index === TUTORIAL_STEPS.length - 1 ? 'Done' : 'Next';

    const el = step.target && document.querySelector(step.target);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    // Measure after any scroll/layout settles.
    requestAnimationFrame(() => positionFor(step));
  }

  function start() {
    index = 0;
    active = true;
    overlay.hidden = false;
    render();
    nextBtn.focus();
  }

  function finish() {
    active = false;
    overlay.hidden = true;
    markSeen();
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0) return;
    if (next >= TUTORIAL_STEPS.length) { finish(); return; }
    index = next;
    render();
  }

  nextBtn.addEventListener('click', () => go(1));
  backBtn.addEventListener('click', () => go(-1));
  skipBtn.addEventListener('click', finish);
  overlay.addEventListener('click', e => { if (e.target === overlay) finish(); });
  window.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape')      { e.preventDefault(); finish(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  const reposition = () => { if (active) positionFor(TUTORIAL_STEPS[index]); };
  window.addEventListener('resize', reposition);
  document.getElementById('control-panel')?.addEventListener('scroll', reposition);

  // ── Entry points ─────────────────────────────────────────────────────────
  document.getElementById('btn-help')?.addEventListener('click', start);
  document.querySelector('[data-action="replay-tutorial"]')?.addEventListener('click', e => {
    e.preventDefault();
    const about = document.getElementById('about-modal');
    if (about) about.hidden = true;
    start();
  });

  // Auto-run on a clean first visit (no shared-permalink params).
  if (shouldAutoStart({ seen: readSeen(), hasParams: window.location.search.length > 1 })) {
    requestAnimationFrame(start);
  }

  return { start };
}
