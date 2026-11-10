/* Pointer lighting and idle-motion housekeeping. No client data or network calls. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Pause idle decorative motion once the hero scrolls away; saves battery on phones.
  const heroSection = document.querySelector('.hero');
  if (heroSection && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(([entry]) => {
      heroSection.classList.toggle('is-offscreen', !entry.isIntersecting);
    }).observe(heroSection);
  }

  // A single scheduled paint per pointer frame, scoped to the hovered surface.
  const surfaces = [...document.querySelectorAll('[data-spotlight]'), heroSection].filter(Boolean);
  const cleanups = surfaces.map(surface => {
    let frame = null;
    const isHero = surface.classList.contains('hero');
    const xName = isHero ? '--light-x' : '--spot-x';
    const yName = isHero ? '--light-y' : '--spot-y';
    function reset() {
      window.cancelAnimationFrame(frame);
      frame = null;
      surface.style.removeProperty(xName);
      surface.style.removeProperty(yName);
    }
    surface.addEventListener('pointermove', event => {
      if (reduceMotion.matches || !finePointer.matches || event.pointerType === 'touch' || frame !== null) return;
      const { clientX, clientY } = event;
      frame = window.requestAnimationFrame(() => {
        const bounds = surface.getBoundingClientRect();
        surface.style.setProperty(xName, `${clientX - bounds.left}px`);
        surface.style.setProperty(yName, `${clientY - bounds.top}px`);
        frame = null;
      });
    }, { passive: true });
    surface.addEventListener('pointerleave', reset);
    return reset;
  });
  reduceMotion.addEventListener('change', () => cleanups.forEach(reset => reset()));
  finePointer.addEventListener('change', () => cleanups.forEach(reset => reset()));
})();
