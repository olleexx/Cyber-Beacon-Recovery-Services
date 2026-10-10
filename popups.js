/* Notification pop-ups (bottom-left). They keep appearing on a timer and cycle through the list.
   They show only TRUE messages to the public:
   - "notices": service reminders that are always accurate.
   - "activity": REAL events you add yourself (here, or in activity.json), each with its real date.
     Add an entry only when it really happened and the person agreed to be mentioned. Entries older than
     maxAgeDays are skipped, and "2 hours ago" is worked out from the date, so it can't claim anything newer.
   TEST DATA: entries in activity.json with  "mock": true  and  "minutesAgo": N  are invented examples.
     - Open any page with  ?popupdemo=1  to preview them, or
     - set  window.CB_POPUPS={showMock:true}  on a private test site to show them automatically.
     Mock entries always carry a visible "Design preview only. Not real activity." label, and are ignored
     for normal visitors unless you turn showMock on.
   Override settings from a page with:  <script>window.CB_POPUPS={gap:15000}</script>  (before popups.js) */
(() => {
  const D = {
    enabled: true,
    firstDelay: 8000,    // ms before the first pop-up
    visibleFor: 7000,    // ms each pop-up stays on screen
    gap: 20000,          // ms between one pop-up disappearing and the next appearing
    maxPerVisit: 0,      // 0 = keep going for as long as the page is open; or set a limit, e.g. 12
    snoozeMinutes: 10,   // after the visitor presses X, wait this long before showing again
    maxAgeDays: 30,
    showMock: false,     // true = also show "mock" test entries (labelled) without ?popupdemo=1
    skipPages: ['contact.html', 'privacy.html'],
    notices: [
      { title: 'Free case review', text: 'Tell us what happened and we will explain what is realistic.', link: 'contact.html', cta: 'Start your case' },
      { title: 'Talk to a real person', text: 'Our team answers your questions before you commit to anything.', link: 'contact.html', cta: 'Contact us' },
      { title: 'Protect yourself', text: 'We will never ask for your passwords, seed phrases or private keys.' },
    ],
    // Real, consented events only, e.g.  { who: 'Debra', what: 'submitted an investment fraud case', date: '2026-10-09T14:30:00Z' }
    // (You can also list them in activity.json, which needs no code editing.)
    activity: [],
  };
  const demo = new URLSearchParams(location.search).has('popupdemo');
  const C = Object.assign({}, D, window.CB_POPUPS || {}, demo ? { firstDelay: 1200, visibleFor: 5000, gap: 4000, maxPerVisit: 0 } : {});
  if (!demo && (!C.enabled || C.skipPages.some((p) => location.pathname.endsWith(p)))) return;

  let st = {};
  try { st = JSON.parse(sessionStorage.getItem('cb_popups') || '{}'); } catch (e) { /* storage unavailable */ }
  const save = () => { if (demo) return; try { sessionStorage.setItem('cb_popups', JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const limitReached = () => !demo && C.maxPerVisit > 0 && (st.shown || 0) >= C.maxPerVisit;
  if (limitReached()) return;

  const ago = (iso) => {
    const t = Date.parse(iso);
    if (isNaN(t)) return null;
    const m = (Date.now() - t) / 60000;
    if (m < 0) return null;
    if (m < 10) return 'just now';
    if (m < 60) return `${Math.round(m)} minutes ago`;
    const h = m / 60;
    if (h < 24) { const n = Math.round(h); return `${n} hour${n > 1 ? 's' : ''} ago`; }
    const d = Math.floor(h / 24);
    if (d > C.maxAgeDays) return null;
    return d < 2 ? 'yesterday' : `${d} days ago`;
  };
  const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  const DEMO = [
    { who: 'Debra', what: 'submitted an investment fraud case', minutesAgo: 120 },
    { who: 'Michael', what: 'opened a crypto scam case', minutesAgo: 300 },
    { who: 'Sarah', what: 'requested a free case review', minutesAgo: 1560 },
    { who: 'A client in Texas', what: 'uploaded evidence for a romance scam case', minutesAgo: 4320 },
  ];

  const start = (extra) => {
    const all = C.activity.concat(extra).filter((a) => a && a.who && a.what);
    const real = all.filter((a) => !a.mock);
    let mocks = all.filter((a) => a.mock);
    const useMock = demo || C.showMock;
    if (demo && !mocks.length) mocks = DEMO;
    const src = [].concat(useMock ? mocks.map((a) => ({ ...a, date: a.date || minsAgo(a.minutesAgo == null ? 60 : a.minutesAgo), demo: true })) : [], demo ? [] : real);
    const acts = src.map((a) => ({ title: `${a.who} ${a.what}`, text: ago(a.date), demo: !!a.demo })).filter((a) => a.text);
    const notes = C.notices.slice();
    const queue = [];
    while (acts.length || notes.length) {
      if (acts.length) queue.push(acts.shift());
      if (notes.length) queue.push(notes.shift());
    }
    if (!queue.length) return;

    const el = document.createElement('aside');
    el.className = 'toast';
    el.hidden = true;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="toast-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.500-3.300 7.800-8 9-4.700-1.200-8-4.500-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg></div>' +
      '<div class="toast-tx"><small class="toast-demo" hidden>Design preview only. Not real activity.</small><b></b><span></span><a hidden></a></div>' +
      '<button type="button" class="toast-x" aria-label="Dismiss notification">&times;</button>';
    document.body.appendChild(el);
    const elDemo = el.querySelector('.toast-demo'), elTitle = el.querySelector('b'), elText = el.querySelector('span'), elLink = el.querySelector('a');

    let i = demo ? 0 : st.idx || 0, hideT, nextT;
    const hide = () => {
      clearTimeout(hideT);
      el.classList.remove('in');
      setTimeout(() => { if (!el.classList.contains('in')) el.hidden = true; }, 400);
      if (!limitReached()) nextT = setTimeout(show, C.gap);
    };
    const show = () => {
      const wait = !demo && st.snoozeUntil ? st.snoozeUntil - Date.now() : 0;
      if (wait > 0) { nextT = setTimeout(show, wait + 50); return; }   // snoozed after the visitor pressed X
      if (document.hidden) { nextT = setTimeout(show, 4000); return; } // don't count time spent in another tab
      const it = queue[i % queue.length];
      elDemo.hidden = !it.demo;
      elTitle.textContent = it.title;
      elText.textContent = it.text;
      elLink.hidden = !it.link;
      if (it.link) { elLink.href = it.link; elLink.textContent = it.cta || 'Learn more'; }
      el.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      st.shown = (st.shown || 0) + 1; st.idx = ++i; save();
      hideT = setTimeout(hide, C.visibleFor);
    };
    // Pause while the visitor is reading or focused on it
    const pause = () => clearTimeout(hideT);
    const resume = () => { if (el.classList.contains('in')) hideT = setTimeout(hide, 3000); };
    el.addEventListener('mouseenter', pause); el.addEventListener('focusin', pause);
    el.addEventListener('mouseleave', resume); el.addEventListener('focusout', resume);
    el.querySelector('.toast-x').addEventListener('click', () => {
      clearTimeout(hideT); clearTimeout(nextT);
      el.classList.remove('in');
      setTimeout(() => { el.hidden = true; }, 400);
      st.snoozeUntil = Date.now() + C.snoozeMinutes * 60000; save();
      nextT = setTimeout(show, C.snoozeMinutes * 60000 + 50);
    });
    nextT = setTimeout(show, C.firstDelay);
  };

  // Real events can also live in activity.json (a plain list; no code editing needed)
  fetch('activity.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
    .then((list) => start(Array.isArray(list) ? list : []));
})();