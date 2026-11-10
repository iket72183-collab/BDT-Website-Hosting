const toggle = document.querySelector('.menu-toggle');
const toggleLabel = toggle?.querySelector('.menu-label') || toggle;
const navigation = document.querySelector('#connect-nav');
function closeMenu() {
  navigation?.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggleLabel) toggleLabel.textContent = 'Menu';
}
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggleLabel.textContent = open ? 'Close' : 'Menu';
  navigation.classList.toggle('is-open', open);
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    toggle.focus();
  }
});

const form = document.querySelector('.inquiry-form');
if (form) {
  window.BDTForms.attach(form, {
    report(message) {
      const status = form.querySelector('.form-status');
      status.hidden = false;
      status.textContent = message;
    },
    sending: 'Sending your consultation request…',
    success: 'Your request has been sent. BDT Talent Group will follow up by email to discuss your workflow and next steps.',
  });
}

// Animate only when a section enters; content remains visible without JavaScript.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!motionPreference.matches && typeof IntersectionObserver !== 'undefined') {
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      // Animate only what was held back; content already on screen stays put.
      const wasHeld = entry.target.classList.contains('pre-arrive');
      entry.target.classList.remove('pre-arrive');
      if (wasHeld && !motionPreference.matches) entry.target.classList.add('arriving');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  const revealTargets = document.querySelectorAll('.section-head, .services .card, .workflow-card, .process-list > li, .faq-list details, .contact-panel > div, .inquiry-form');
  revealTargets.forEach(element => {
    // Hold back only what is still below the fold, so nothing visible ever blinks out.
    if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('pre-arrive');
    revealObserver.observe(element);
  });
  // If the visitor turns motion off mid-visit, show everything immediately.
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) revealTargets.forEach(element => element.classList.remove('pre-arrive'));
  });
}
