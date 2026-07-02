/**
 * Mobile UX enhancements:
 * - Collapsible panel sections (tap heading to expand/collapse)
 * - Applied only on narrow viewports via matchMedia
 */

const MOBILE_BREAKPOINT = 640;

/**
 * Initialise collapsible panel sections.
 * Each .panel-section with a .panel-heading gets a toggle on mobile.
 * The first section (Mission Planner) starts open; others start collapsed.
 */
export function initMobileCollapse() {
  const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  function applyCollapse(isMobile) {
    const sections = document.querySelectorAll('.panel-section');

    sections.forEach((section, index) => {
      const heading = section.querySelector('.panel-heading');
      if (!heading) return;

      if (isMobile) {
        heading.classList.add('panel-heading--collapsible');
        const isOpen = index === 0;  // first section open by default
        section.classList.toggle('panel-section--collapsed', !isOpen);
        updateIcon(heading, isOpen);

        if (!heading._collapseListener) {
          heading._collapseListener = () => {
            const collapsed = section.classList.toggle('panel-section--collapsed');
            updateIcon(heading, !collapsed);
          };
          heading.addEventListener('click', heading._collapseListener);
        }
      } else {
        heading.classList.remove('panel-heading--collapsible');
        section.classList.remove('panel-section--collapsed');
        removeIcon(heading);

        if (heading._collapseListener) {
          heading.removeEventListener('click', heading._collapseListener);
          heading._collapseListener = null;
        }
      }
    });
  }

  function updateIcon(heading, isOpen) {
    let icon = heading.querySelector('.collapse-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'collapse-icon';
      heading.appendChild(icon);
    }
    icon.textContent = isOpen ? '▴' : '▾';
  }

  function removeIcon(heading) {
    heading.querySelector('.collapse-icon')?.remove();
  }

  mq.addEventListener('change', e => applyCollapse(e.matches));
  applyCollapse(mq.matches);
}
