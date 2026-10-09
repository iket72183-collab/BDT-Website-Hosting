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
      if (!motionPreference.matches) entry.target.classList.add('arriving');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.section-head, .services .card, .process-list, .contact-panel').forEach(element => revealObserver.observe(element));
}
