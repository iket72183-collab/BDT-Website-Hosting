/* Optional illustration controls and pointer lighting. No client data or network calls. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const illustration = document.querySelector('.workflow-art');
  const controls = illustration?.querySelector('.workflow-controls');
  if (!controls) return;
  const stages = [...controls.querySelectorAll('[data-step]')];
  const cards = [...illustration.querySelectorAll('.workflow-card')];
  const play = controls.querySelector('.workflow-play');
  const playLabel = play.querySelector('span');
  let timer = null;
  let playing = false;

  function selectStage(index) {
    cards.forEach((card, position) => {
      card.classList.toggle('is-current', position === index);
      card.classList.toggle('is-complete', position < index);
    });
    stages.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
  }
  function stop() {
    window.clearTimeout(timer);
    timer = null;
    playing = false;
    illustration.classList.remove('demo-playing');
    playLabel.textContent = 'Replay';
    play.setAttribute('aria-label', 'Replay illustrative workflow');
  }
  stages.forEach((button, index) => button.addEventListener('click', () => {
    stop();
    selectStage(index);
  }));
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (reduceMotion.matches) return;
    playing = true;
    playLabel.textContent = 'Stop';
    play.setAttribute('aria-label', 'Stop illustrative workflow');
    illustration.classList.add('demo-playing');
    let index = 0;
    selectStage(index);
    const advance = () => {
      index += 1;
      if (index === cards.length) { stop(); return; }
      selectStage(index);
      timer = window.setTimeout(advance, 1400);
    };
    timer = window.setTimeout(advance, 1400);
  });
  selectStage(0);
  controls.hidden = false;
  play.hidden = reduceMotion.matches;
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);

  // A single scheduled paint per pointer frame, scoped to the hovered surface.
  const surfaces = [...document.querySelectorAll('[data-spotlight]'), document.querySelector('.hero')].filter(Boolean);
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
  reduceMotion.addEventListener('change', () => {
    stop();
    play.hidden = reduceMotion.matches;
    cleanups.forEach(reset => reset());
  });
  finePointer.addEventListener('change', () => cleanups.forEach(reset => reset()));
})();
