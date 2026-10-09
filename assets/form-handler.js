/* Shared inquiry handling. Native POST remains available without JavaScript. */
window.BDTForms = {
  attach(form, { report, sending, success }) {
    const button = form.querySelector('[type="submit"]');
    let pending = false;
    let revision = 0;
    const controls = () => Array.from(form.elements).filter(field => typeof field.setCustomValidity === 'function');
    const clearErrors = () => controls().forEach(field => field.setCustomValidity(''));
    for (const eventName of ['input', 'change']) {
      form.addEventListener(eventName, event => {
        revision += 1;
        event.target.setCustomValidity?.('');
      });
    }
    form.addEventListener('reset', () => {
      revision += 1;
      clearErrors();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending) return;
      clearErrors();
      for (const name of ['fullName', 'message']) {
        const field = form.elements.namedItem(name);
        if (field?.required && !field.value.trim()) {
          field.setCustomValidity(name === 'fullName' ? 'Please enter your name.' : 'Please describe your inquiry.');
        }
      }
      if (!form.reportValidity()) return;
      const submittedRevision = revision;
      const body = new FormData(form);
      const originalButton = button.innerHTML;
      const controller = new AbortController();
      let timer;
      let timedOut = false;
      pending = true;
      button.disabled = true;
      button.textContent = sending;
      form.setAttribute('aria-busy', 'true');
      report(sending, false);
      try {
        const request = (async () => {
          const response = await fetch(form.action, {
            method: 'POST', body, headers: { Accept: 'application/json' }, signal: controller.signal,
          });
          const data = response.ok ? null : await response.json().catch(() => ({}));
          return { response, data };
        })();
        const deadline = new Promise((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error('Submission timed out'));
            controller.abort();
          }, 20000);
        });
        const { response, data } = await Promise.race([request, deadline]);
        const changed = revision !== submittedRevision;
        if (response.ok) {
          if (!changed) form.reset();
          report(success + (changed ? ' Your newer draft has been kept.' : ''), false);
        } else {
          const messages = [];
          const labels = { fullName: 'name', email: 'email address', message: 'inquiry', interest: 'help topic', inquiryType: 'inquiry type' };
          if (response.status === 422 && Array.isArray(data?.errors)) {
            for (const error of data.errors) {
              const name = error?.field;
              if (!Object.hasOwn(labels, name)) continue;
              const message = `Please check your ${labels[name]}.`;
              if (!messages.includes(message)) messages.push(message);
              if (!changed) form.elements.namedItem(name)?.setCustomValidity(message);
            }
          }
          const fallback = response.status === 429
            ? 'Too many attempts. Please wait a few minutes before trying again.'
            : response.status === 422
              ? 'Please check the required fields and email address, then try again.'
              : 'We could not send your inquiry. Please try again in a few minutes.';
          report((messages.join(' ') || fallback) + ' Your current draft has been kept.', true);
          if (!changed && messages.length) form.reportValidity();
        }
      } catch {
        report((timedOut
          ? 'The request timed out; delivery could not be confirmed.'
          : 'Connection interrupted; delivery could not be confirmed.') + ' Your current draft has been kept. Check your connection before trying again; the earlier request may still have arrived.', true);
      } finally {
        clearTimeout(timer);
        pending = false;
        button.disabled = false;
        button.innerHTML = originalButton;
        form.removeAttribute('aria-busy');
      }
    });
  },
};
