// Caring Companions: interactive preview of the visit-booking app (sample data, nothing is booked).
// Open with any element that has [data-app-preview]. Per-site settings come from window.AP_CONFIG.
(function () {
  'use strict';
  var C = Object.assign({
    brand: 'Caring Companions',
    tagline: 'The Good Day Club',
    weekdaysOnly: true,
    startHour: 8, endHour: 18,
    minHours: 4,
    rate: 30,
    rateLabel: 'Companion care',
    joinHref: 'join.html',
    joinLabel: 'Join the opening list',
    footnote: 'Preview with sample information. The app launches when we open.',
    icons: 'assets/icons.svg',
    activities: [
      { k: 'exercise', t: 'Seated exercise', i: 'i-strength' },
      { k: 'lunch', t: 'Cook lunch together', i: 'i-bowl' },
      { k: 'meds', t: 'Medication reminder', i: 'i-clock' },
      { k: 'outing', t: 'An outing', i: 'i-car' },
      { k: 'errands', t: 'Errands and groceries', i: 'i-bag' },
      { k: 'house', t: 'Light housekeeping', i: 'i-home' },
      { k: 'chat', t: 'Cards, games and conversation', i: 'i-chat' }
    ]
  }, window.AP_CONFIG || {});

  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function ic(id) { return '<svg class="ap-ic" aria-hidden="true"><use href="' + C.icons + '#' + id + '"/></svg>'; }
  function hr(h) { var ap = h >= 12 ? 'pm' : 'am', x = h % 12 || 12; return x + ap; }

  var st, root, screen, lastFocus;
  function reset() {
    st = { step: 0, day: null, start: null, hours: C.minHours, acts: ['exercise', 'lunch', 'meds'], who: 'Mom', repeat: true };
  }
  function days() {
    var out = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (out.length < 10) {
      d.setDate(d.getDate() + 1);
      if (C.weekdaysOnly && (d.getDay() === 0 || d.getDay() === 6)) continue;
      out.push(new Date(d));
    }
    return out;
  }

  var STEPS = [welcome, pickDay, pickTime, plan, review, booked];

  function welcome() {
    return '<div class="ap-hello"><p class="ap-kicker">' + C.tagline + '</p><h3>Book a visit in a minute.</h3>' +
      '<p>Pick a day, choose what they’d like to do, and you’re set.</p>' +
      '<label class="ap-field">Who is the visit for?<select data-k="who"><option>Mom</option><option>Dad</option><option>Grandma</option><option>Grandpa</option><option>Myself</option></select></label>' +
      '<div class="ap-list-preview"><span>' + ic('i-calendar') + 'Upcoming visits</span><b>Nothing booked yet</b></div></div>' +
      foot('<button class="ap-btn" data-go="1">Book a visit</button>');
  }
  function pickDay() {
    var ds = days();
    return head('When should we come?') + '<div class="ap-days">' + ds.map(function (d, i) {
      var sel = st.day && st.day.getTime() === d.getTime();
      return '<button class="ap-day' + (sel ? ' on' : '') + '" data-day="' + i + '"><small>' + DAY[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MON[d.getMonth()] + '</small></button>';
    }).join('') + '</div>' +
    (C.weekdaysOnly ? '<p class="ap-note">Visits run Monday to Friday, ' + hr(C.startHour) + ' to ' + hr(C.endHour) + '.</p>' : '<p class="ap-note">Mornings, evenings or weekends, whatever fits.</p>') +
    '<label class="ap-check"><input type="checkbox" data-k="repeat"' + (st.repeat ? ' checked' : '') + '> Repeat every week</label>' +
    foot('<button class="ap-btn" data-go="2"' + (st.day ? '' : ' disabled') + '>Next</button>');
  }
  function pickTime() {
    var slots = [];
    for (var h = C.startHour; h + st.hours <= C.endHour; h++) slots.push(h);
    return head('What time, and how long?') +
      '<div class="ap-len">' + [4, 5, 6, 8].filter(function (n) { return n >= C.minHours && C.startHour + n <= C.endHour; }).map(function (n) {
        return '<button class="ap-pill' + (st.hours === n ? ' on' : '') + '" data-hours="' + n + '">' + n + ' hours</button>';
      }).join('') + '</div>' +
      '<div class="ap-slots">' + slots.map(function (h) {
        return '<button class="ap-slot' + (st.start === h ? ' on' : '') + '" data-start="' + h + '">' + hr(h) + ' to ' + hr(h + st.hours) + '</button>';
      }).join('') + '</div>' +
      '<p class="ap-note">Every visit is at least ' + C.minHours + ' hours, so there’s time to do things properly.</p>' +
      foot('<button class="ap-btn ap-ghost" data-go="1">Back</button><button class="ap-btn" data-go="3"' + (st.start != null ? '' : ' disabled') + '>Next</button>');
  }
  function plan() {
    return head('What would ' + esc(st.who === 'Myself' ? 'you' : st.who) + ' like to do?') +
      '<div class="ap-acts">' + C.activities.map(function (a) {
        var on = st.acts.indexOf(a.k) > -1;
        return '<button class="ap-act' + (on ? ' on' : '') + '" data-act="' + a.k + '">' + ic(a.i) + '<span>' + a.t + '</span><i></i></button>';
      }).join('') + '</div>' +
      foot('<button class="ap-btn ap-ghost" data-go="2">Back</button><button class="ap-btn" data-go="4"' + (st.acts.length ? '' : ' disabled') + '>Review</button>');
  }
  function review() {
    var cost = st.hours * C.rate;
    var acts = C.activities.filter(function (a) { return st.acts.indexOf(a.k) > -1; });
    return head('Look good?') + '<div class="ap-card">' +
      '<p class="ap-when">' + DAYL[st.day.getDay()] + ', ' + MON[st.day.getMonth()] + ' ' + st.day.getDate() + '</p>' +
      '<p class="ap-time">' + hr(st.start) + ' to ' + hr(st.start + st.hours) + (st.repeat ? ' &middot; every week' : '') + '</p>' +
      '<ul class="ap-plan">' + acts.map(function (a) { return '<li>' + ic(a.i) + a.t + '</li>'; }).join('') + '</ul>' +
      '<div class="ap-cost"><span>' + C.rateLabel + ', ' + st.hours + ' hours at $' + C.rate + '</span><b>$' + cost + '</b></div></div>' +
      '<p class="ap-note">Nothing is charged in this preview.</p>' +
      foot('<button class="ap-btn ap-ghost" data-go="3">Back</button><button class="ap-btn" data-go="5">Book this visit</button>');
  }
  function booked() {
    return '<div class="ap-done"><div class="ap-tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h3>You’re all set.</h3><p>' + esc(st.who === 'Myself' ? 'Your' : st.who + '’s') + ' visit is on the calendar. We’ll confirm your caregiver before the visit.</p>' +
      '<div class="ap-list-preview on"><span>' + ic('i-calendar') + 'Upcoming visits</span><b>' + DAY[st.day.getDay()] + ' ' + MON[st.day.getMonth()] + ' ' + st.day.getDate() + ', ' + hr(st.start) + '</b></div>' +
      '<p class="ap-small">That’s how booking will work in our app. Want to be first in line?</p></div>' +
      foot('<a class="ap-btn" href="' + C.joinHref + '">' + C.joinLabel + '</a><button class="ap-btn ap-ghost" data-restart>Try again</button>');
  }

  function head(t) { return '<div class="ap-head"><span class="ap-step">Step ' + st.step + ' of 4</span><h3>' + t + '</h3><div class="ap-bar"><i style="width:' + (st.step / 4 * 100) + '%"></i></div></div>'; }
  function foot(btns) { return '<div class="ap-foot">' + btns + '</div>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    screen.innerHTML = STEPS[st.step]();
    screen.classList.remove('ap-in'); void screen.offsetWidth; screen.classList.add('ap-in');
    var sel = screen.querySelector('select[data-k="who"]'); if (sel) sel.value = st.who;
    var h = screen.querySelector('h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function build() {
    root = document.createElement('div');
    root.className = 'ap-overlay';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Preview of the ' + C.brand + ' booking app');
    root.innerHTML = '<div class="ap-wrap"><button class="ap-close" aria-label="Close preview">&times;</button>' +
      '<div class="ap-phone"><div class="ap-notch"></div><div class="ap-status"><span>9:41</span><span class="ap-sig" aria-hidden="true"><i></i><i></i><i></i></span></div>' +
      '<div class="ap-screen" aria-live="polite"></div></div>' +
      '<p class="ap-foot-note">' + C.footnote + '</p></div>';
    document.body.appendChild(root);
    screen = root.querySelector('.ap-screen');
    root.addEventListener('click', function (e) {
      if (e.target === root || e.target.closest('.ap-close')) return close();
      var t = e.target.closest('button, input, select'); if (!t) return;
      if (t.hasAttribute('data-go')) { st.step = +t.getAttribute('data-go'); render(); return; }
      if (t.hasAttribute('data-restart')) { reset(); render(); return; }
      if (t.hasAttribute('data-day')) { st.day = days()[+t.getAttribute('data-day')]; render(); return; }
      if (t.hasAttribute('data-hours')) { st.hours = +t.getAttribute('data-hours'); if (st.start != null && st.start + st.hours > C.endHour) st.start = null; render(); return; }
      if (t.hasAttribute('data-start')) { st.start = +t.getAttribute('data-start'); render(); return; }
      if (t.hasAttribute('data-act')) { var k = t.getAttribute('data-act'), i = st.acts.indexOf(k); if (i > -1) st.acts.splice(i, 1); else st.acts.push(k); render(); return; }
    });
    root.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-k');
      if (k === 'who') st.who = e.target.value;
      if (k === 'repeat') st.repeat = e.target.checked;
    });
    document.addEventListener('keydown', function (e) {
      if (!root.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { // keep focus inside the dialog
        var f = [].slice.call(root.querySelectorAll('button:not([disabled]), a[href], select, input'));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
  }
  function open() {
    if (!root) build();
    lastFocus = document.activeElement;
    reset(); render();
    root.classList.add('open'); document.documentElement.classList.add('ap-lock');
    try { if (window.ccTrack) window.ccTrack('app_preview_open'); } catch (e) {}
  }
  function close() {
    root.classList.remove('open'); document.documentElement.classList.remove('ap-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-app-preview]');
    if (t) { e.preventDefault(); open(); }
  });
  if (location.hash === '#app-preview') window.addEventListener('load', open);
})();
