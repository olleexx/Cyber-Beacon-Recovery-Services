// Case form: validates, then sends to the email-forwarding service set in <form data-endpoint="..."> (no backend needed).
// Runs in the capture phase so it replaces the older mailto handler in site.js.
(() => {
  const form = document.getElementById('form');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const ok = $('ok'), fail = $('fail'), btn = $('send');
  const endpoint = form.dataset.endpoint || '';
  const val = (id) => $(id).value.trim();
  const picked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  const recoveryYes = () => (form.querySelector('input[name="recovery"]:checked') || {}).value === 'Yes';
  const now = new Date();
  const today = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('doi').max = $('dlc').max = today;

  const updEvidence = () => {
    const n = picked('evidence').length;
    $('evidence-count').textContent = n ? `${n} selected` : 'Select the evidence you have';
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'evidence') updEvidence(); });
  const syncRecovery = () => { $('l-recovery-detail').hidden = !recoveryYes(); };

  // ---- File uploads (FormSubmit: multipart post, 10 MB total; we cap at 9 MB) ----
  const MAX_FILES = 5, MAX_BYTES = 9 * 1024 * 1024;
  const OK_EXT = /\.(jpe?g|png|gif|webp|heic|pdf|docx?|xlsx?|csv|txt)$/i;
  const filesBox = $('files'), addBtn = $('add-file'), totalEl = $('file-total');
  const ACCEPT = filesBox.querySelector('input').accept;
  let slotNo = 1;
  const fileInputs = () => [...form.querySelectorAll('input[type="file"]')];
  const chosen = () => fileInputs().flatMap((i) => [...i.files]);
  const syncFiles = () => {
    const fs = chosen(), bytes = fs.reduce((s, f) => s + f.size, 0);
    totalEl.textContent = fs.length ? `${fs.length} file${fs.length > 1 ? 's' : ''} selected (${(bytes / 1048576).toFixed(1)} MB of 9 MB)` : '';
    addBtn.hidden = filesBox.children.length >= MAX_FILES;
  };
  const filesOk = () => {
    const fs = chosen(), err = $('file-err');
    if (fs.some((f) => !OK_EXT.test(f.name))) { err.textContent = 'Unsupported file type. Please use images, PDF, Word, Excel, CSV or text files.'; return false; }
    if (fs.reduce((s, f) => s + f.size, 0) > MAX_BYTES) { err.textContent = 'The files are too large. Please keep the total under 9 MB.'; return false; }
    return true;
  };
  addBtn.addEventListener('click', () => {
    if (filesBox.children.length >= MAX_FILES) return;
    slotNo++;
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `<input type="file" name="attachment${slotNo}" aria-label="Supporting file ${slotNo}" accept="${ACCEPT}"><button type="button" class="rm" aria-label="Remove file ${slotNo}">&times;</button>`;
    filesBox.appendChild(row);
    syncFiles();
    row.querySelector('input').focus();
  });
  filesBox.addEventListener('click', (e) => {
    const rm = e.target.closest('.rm');
    if (rm) { rm.parentElement.remove(); syncFiles(); }
  });
  form.addEventListener('change', (e) => { if (e.target.type === 'file') syncFiles(); });
  // Going "back" after an upload can restore a half-finished page; start clean instead
  addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
  form.addEventListener('change', (e) => { if (e.target.name === 'recovery') syncRecovery(); });
  form.addEventListener('reset', () => setTimeout(() => { [...filesBox.children].slice(1).forEach((r) => r.remove()); slotNo = 1; syncFiles(); syncRecovery(); updEvidence(); $('evidence-pick').open = false; }));
  // Clear an error as soon as the person fixes the field
  const clearBad = (e) => { const b = e.target.closest && e.target.closest('.bad'); if (b) b.classList.remove('bad'); };
  form.addEventListener('input', clearBad);
  form.addEventListener('change', clearBad);

  // [wrapper id, test, selector to focus when invalid]
  const checks = [
    ['l-name', () => val('name').length > 1, '#name'],
    ['l-email', () => /^\S+@\S+\.\S+$/.test(val('email')), '#email'],
    ['l-phone', () => val('phone').replace(/\D/g, '').length >= 7, '#phone'],
    ['l-country', () => val('country').length > 1, '#country'],
    ['l-incident', () => !!val('incident'), '#incident'],
    ['l-doi', () => !!val('doi') && val('doi') <= today, '#doi'],
    ['l-dlc', () => !val('dlc') || (val('dlc') <= today && (!val('doi') || val('dlc') >= val('doi'))), '#dlc'],
    ['l-how', () => val('how').length > 2, '#how'],
    ['l-desc', () => val('desc').length >= 20, '#desc'],
    ['l-asset', () => !!val('asset'), '#asset'],
    ['l-amount', () => Number(val('amount')) > 0, '#amount'],
    ['g-recovery', () => !!form.querySelector('input[name="recovery"]:checked'), 'input[name="recovery"]'],
    ['l-recovery-detail', () => !recoveryYes() || val('recovery-text').length > 4, '#recovery-text'],
    ['g-files', filesOk, 'input[type="file"]'],
    ['g-ack', () => picked('ack').length === 3, 'input[name="ack"]'],
  ];

  const mailtoFor = (p) => {
    const lines = Object.entries(p).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${String(v).slice(0, 1200)}`);
    return 'mailto:cyberbeaconrecoveryservices@gmail.com?subject=' + encodeURIComponent('New case: ' + p['Incident type']) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  };
  // Standard (non-background) post, built from the same fields as the background send
  const postStandard = (fields) => {
    const f = document.createElement('form');
    f.method = 'post'; f.action = form.getAttribute('action'); f.style.display = 'none';
    for (const [k, v] of Object.entries(fields)) {
      const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
    }
    document.body.appendChild(f);
    HTMLFormElement.prototype.submit.call(f);
  };

  document.addEventListener('submit', async (e) => {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopPropagation();
    ok.style.display = fail.style.display = 'none';

    let firstBad = null;
    for (const [id, test, sel] of checks) {
      const good = test();
      $(id).classList.toggle('bad', !good);
      if (!good && !firstBad) firstBad = form.querySelector(sel);
    }
    if (firstBad) { firstBad.focus(); return; }

    // Honeypot: bots fill the hidden field. Pretend success, send nothing.
    if (form.elements._honey.value) { ok.style.display = 'block'; form.reset(); return; }

    const amount = `${val('amount')} ${$('currency').value}`;
    const payload = {
      'Full legal name': val('name'),
      email: val('email'),
      'Phone number': val('phone'),
      'Country of residence': val('country'),
      'Incident type': val('incident'),
      'Date of incident': val('doi'),
      'Date last contacted suspected party': val('dlc') || 'Not provided',
      'Website, app or platform': val('site') || 'Not provided',
      'How contact began': val('how'),
      'Description of events': val('desc'),
      'Type of asset involved': val('asset'),
      'Estimated amount lost': amount,
      'Evidence available': picked('evidence').join(', ') || 'None selected',
      'Contacted another recovery company': recoveryYes() ? 'Yes: ' + val('recovery-text') : 'No',
      'Uploaded files': chosen().map((f) => f.name).join(', ') || 'None',
      'Acknowledgements': 'All three accepted (accuracy, privacy policy consent, no guarantee of recovery)',
      _subject: 'New case enquiry: ' + val('incident'),
      _template: 'table',
      _captcha: 'false',
      _honey: '',
    };
    // With files: standard multipart post (the only upload method FormSubmit documents). It returns here with ?sent=1.
    if (chosen().length) {
      btn.disabled = true; btn.textContent = 'Uploading, please wait...';
      const f = document.createElement('form');
      f.method = 'post'; f.enctype = 'multipart/form-data'; f.action = form.getAttribute('action'); f.style.display = 'none';
      for (const [k, v] of Object.entries({ ...payload, _next: location.href.split(/[?#]/)[0] + '?sent=1' })) {
        const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
      }
      fileInputs().filter((i) => i.files.length).forEach((i) => f.appendChild(i)); // moves the real file inputs, keeping their files
      document.body.appendChild(f);
      HTMLFormElement.prototype.submit.call(f);
      return;
    }
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Submitting...';
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
      ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error('Case form: direct send failed, trying standard form post.', err);
      try {
        postStandard({ ...payload, _next: location.href.split(/[?#]/)[0] + '?sent=1' });
        return;
      } catch (err2) { console.error('Case form: standard post failed too.', err2); }
      $('fail-mail').href = mailtoFor(payload);
      fail.style.display = 'block';
      fail.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }, true);

  // Shown after the standard-post route redirects back here
  if (new URLSearchParams(location.search).get('sent') === '1') {
    ok.style.display = 'block';
    ok.scrollIntoView({ block: 'center' });
  }
})();