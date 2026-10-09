const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('assets/form-handler.js', 'utf8');
function setup() {
  const events = {}, timers = new Map(), requests = [], reports = [];
  const fields = ['fullName', 'email', 'message', 'interest', 'inquiryType'].map(name => ({
    name, required: true, value: name === 'email' ? 'test@example.invalid' : 'Original', error: '',
    setCustomValidity(message) { this.error = message; },
  }));
  fields.namedItem = name => fields.find(field => field.name === name);
  const button = { disabled: false, innerHTML: 'Send <svg></svg>', textContent: 'Send' };
  const form = { elements: fields, action: 'MOCK-NETWORK-ONLY', resets: 0, valid: true,
    querySelector: () => button,
    addEventListener: (name, fn) => { events[name] = fn; },
    setAttribute() {}, removeAttribute() {},
    reportValidity() { return this.valid && fields.every(f => !f.error); },
    reset() { this.resets++; events.reset(); fields.forEach(f => { f.value = ''; }); },
  };
  const context = { window: {}, AbortController, FormData: class { constructor() { this.values = fields.map(f => f.value); } },
    setTimeout: (fn, ms) => { assert.equal(ms, 20000); const id = {}; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: (url, options) => { assert.equal(url, 'MOCK-NETWORK-ONLY'); return new Promise((resolve, reject) => requests.push({ options, resolve, reject })); },
  };
  vm.runInNewContext(source, context);
  context.window.BDTForms.attach(form, { report: (message, error) => reports.push({ message, error }), sending: 'Sending', success: 'Sent.' });
  return { form, button, fields, requests, reports, timers,
    submit: () => events.submit({ preventDefault() {} }),
    edit(name, value) { const target = fields.namedItem(name); target.value = value; events.input({ target }); },
    expire() { for (const fn of [...timers.values()]) fn(); },
  };
}
const ok = { ok: true, status: 200 };
test('unchanged successful draft resets; button SVG is restored', async () => {
  const h = setup(), done = h.submit(); h.requests[0].resolve(ok); await done;
  assert.equal(h.form.resets, 1); assert.equal(h.button.innerHTML, 'Send <svg></svg>'); assert.equal(h.button.disabled, false); assert.equal(h.timers.size, 0);
});
test('delayed success preserves newer edits and transmitted snapshot', async () => {
  const h = setup(), done = h.submit(); h.edit('message', 'New draft'); h.requests[0].resolve(ok); await done;
  assert.equal(h.fields.namedItem('message').value, 'New draft'); assert.equal(h.requests[0].options.body.values[2], 'Original'); assert.equal(h.form.resets, 0); assert.match(h.reports.at(-1).message, /newer draft/);
});
test('Clear Form then new draft is not erased by old success', async () => {
  const h = setup(), done = h.submit(); h.form.reset(); h.edit('message', 'After reset'); h.requests[0].resolve(ok); await done;
  assert.equal(h.form.resets, 1); assert.equal(h.fields.namedItem('message').value, 'After reset');
});
test('repeated submission while pending dispatches only once', async () => {
  const h = setup(), done = h.submit(); await h.submit(); assert.equal(h.requests.length, 1); h.requests[0].resolve(ok); await done;
});
test('timeout recovers even if fetch ignores abort; late success cannot clear retry draft', async () => {
  const h = setup(), first = h.submit(); h.expire(); await first;
  assert.equal(h.button.disabled, false); assert.equal(h.requests[0].options.signal.aborted, true); assert.match(h.reports.at(-1).message, /may still have arrived/);
  h.edit('message', 'Retry draft'); const second = h.submit(); h.requests[0].resolve(ok); await Promise.resolve();
  assert.equal(h.button.disabled, true); assert.equal(h.form.resets, 0); h.requests[1].resolve(ok); await second;
});
test('timeout also covers stalled error body', async () => {
  const h = setup(), done = h.submit(); h.requests[0].resolve({ok:false,status:422,json:()=>new Promise(()=>{})}); await Promise.resolve(); h.expire(); await done; assert.equal(h.button.disabled,false);
});
test('whitespace-only name/message rejected before dispatch, then correctable', async () => {
  const h = setup(); h.edit('fullName', ' \t '); h.edit('message', '\n '); await h.submit(); assert.equal(h.requests.length, 0);
  assert.match(h.fields.namedItem('fullName').error, /name/); h.edit('fullName','Name'); h.edit('message','Message'); const done=h.submit(); h.requests[0].resolve(ok); await done;
});
test('native validity failure dispatches nothing', async () => { const h=setup();h.form.valid=false;await h.submit();assert.equal(h.requests.length,0); });
test('422 identifies known fields without exposing server text; edits clear validity', async () => {
  const h=setup(),done=h.submit();h.requests[0].resolve({ok:false,status:422,json:async()=>({errors:[{field:'email',message:'<script>unsafe</script>'}]})});await done;
  assert.equal(h.fields.namedItem('email').error,'Please check your email address.');assert.doesNotMatch(h.reports.at(-1).message,/script/);h.edit('email','corrected@example.invalid');assert.equal(h.fields.namedItem('email').error,'');assert.equal(h.form.resets,0);
});
test('stale field errors do not invalidate newly edited draft', async () => {
  const h=setup(),done=h.submit();h.edit('email','new@example.invalid');h.requests[0].resolve({ok:false,status:422,json:async()=>({errors:[{field:'email'}]})});await done;assert.equal(h.fields.namedItem('email').error,'');
});
test('network, rate limiting and malformed error bodies preserve draft and recover', async () => {
  for(const kind of ['network','rate','malformed']) {
    const h=setup(),done=h.submit(); if(kind==='network')h.requests[0].reject(new Error('offline'));else h.requests[0].resolve({ok:false,status:kind==='rate'?429:500,json:async()=>{throw Error('not JSON')}});await done;
    assert.equal(h.form.resets,0);assert.equal(h.button.disabled,false);assert.equal(h.reports.at(-1).error,true);
  }
});
test('all inquiry pages load helper before their adapters; endpoint unchanged', () => {
  for(const [page,adapter] of [['index.html','assets/site.js'],['contact.html','assets/site.js'],['connect/index.html','connect/scripts/consultation.js']]) {
    const html=readFileSync(page,'utf8');assert.ok(html.indexOf('assets/form-handler.js')<html.indexOf(adapter));assert.match(html,/action="https:\/\/formspree.io\/f\/mojykkbw"/);
    assert.match(readFileSync(adapter,'utf8'),/window\.BDTForms\.attach/);
  }
});
