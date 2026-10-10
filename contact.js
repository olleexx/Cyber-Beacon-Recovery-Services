// Contact form: validates, then POSTs JSON to the email-forwarding service set in <form data-endpoint="..."> (no backend needed).
// Runs in the capture phase so it replaces the older mailto handler in site.js.
(() => {
  const form = document.getElementById('form');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const ok = $('ok'), fail = $('fail'), btn = $('send');
  const endpoint = form.dataset.endpoint || '';
  const checks = {
    'l-name': () => $('name').value.trim().length > 1,
    'l-email': () => /^\S+@\S+\.\S+$/.test($('email').value.trim()),
    'l-type': () => !!$('type').value,
    'l-msg': () => $('msg').value.trim().length > 9,
  };
  const mailtoFor = (d) =>
    'mailto:cyberbeaconrecoveryservices@gmail.com?subject=' + encodeURIComponent('New case: ' + d.type) +
    '&body=' + encodeURIComponent(`Name: ${d.name}\nEmail: ${d.email}\nCountry: ${d.country}\nIncident: ${d.type}\n\n${d.message}`);

  document.addEventListener('submit', async (e) => {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopPropagation();
    ok.style.display = fail.style.display = 'none';

    let valid = true, firstBad = null;
    for (const [id, test] of Object.entries(checks)) {
      const good = test();
      $(id).classList.toggle('bad', !good);
      if (!good && valid) { valid = false; firstBad = $(id).querySelector('input,select,textarea'); }
    }
    if (!valid) { firstBad.focus(); return; }

    // Honeypot: bots fill the hidden field. Pretend success, send nothing.
    if (form.elements.website.value) { ok.style.display = 'block'; form.reset(); return; }

    const data = {
      name: $('name').value.trim(), email: $('email').value.trim(), country: $('country').value.trim(),
      type: $('type').value, message: $('msg').value.trim(), website: '',
    };
    // Extra fields understood by the email-forwarding service (FormSubmit)
    const payload = { ...data, _subject: 'New case enquiry: ' + data.type, _template: 'table', _captcha: 'false', _honey: '' };
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      if (!endpoint) throw new Error('No endpoint configured');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false || result.success === 'false') throw new Error(result.message || 'HTTP ' + res.status);
      form.reset();
      ok.style.display = 'block';
      ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      $('fail-mail').href = mailtoFor(data);
      fail.style.display = 'block';
      fail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }, true);
})();