const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#connect-nav');
function closeMenu() {
  navigation?.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) toggle.textContent = 'Menu';
}
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'Close' : 'Menu';
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
const mobileCta = document.querySelector('.mobile-cta');
// Once visitors reach the inquiry, give its fields and submit button the screen.
if (form && mobileCta && typeof IntersectionObserver !== 'undefined') {
  const inquiryObserver = new IntersectionObserver(([entry]) => {
    mobileCta.hidden = entry.isIntersecting;
  });
  inquiryObserver.observe(form);
}
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Sending your request…';
  status.hidden = false;
  status.textContent = 'Sending your consultation request.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(form.action, {
      method: 'POST', body: new FormData(form),
      headers: { Accept: 'application/json' }, signal: controller.signal,
    });
    if (!response.ok) throw new Error('Request not accepted');
    status.textContent = 'Your request has been sent. BDT Talent Group will follow up by email to discuss your workflow and next steps.';
    form.reset();
  } catch {
    status.textContent = 'We could not confirm delivery. Your details are still here. Please try again in a few minutes.';
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = 'Request a consultation';
  }
});
