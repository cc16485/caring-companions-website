// Caring Companions: interactive preview of the visit-booking app (sample data, nothing is booked).
// Open with any element that has [data-app-preview]. Per-site settings come from window.AP_CONFIG.
(function () {
  'use strict';
  var C = Object.assign({
    brand: 'Caring Companions',
    tagline: 'The Good Day Club',
    weekdaysOnly: true,
    startHour: 8, endHour: 18,   // visits must start and end inside these hours
    minHours: 2,                 // app-booked visits: 2 hours or more, by half hours
    daysAhead: 60,
    rate: 30,
    rateLabel: 'Companion care',
    shortExtra: 0, shortUnder: 4, // e.g. Missouri: $5 more an hour for visits under 4 hours
    perk: '',                     // a line on the review screen, e.g. what app booking saves
    checkLabel: 'Fingerprint background check',
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
    ],
    // Sample caregivers for the preview only (not real people).
    caregivers: [
      { k: 'linda', n: 'Linda', ini: 'LM', c: '#1F7A8C', yrs: '6 years caring for older adults', town: 'Mustang',
        hi: 'Retired school secretary. I love a good card game, my garden and cooking Sunday-style lunches on a Tuesday.',
        likes: ['Gardening', 'Card games', 'Home cooking'], drives: true },
      { k: 'marcus', n: 'Marcus', ini: 'MT', c: '#0D365F', yrs: '3 years as a companion', town: 'Yukon',
        hi: 'I play guitar, follow the Thunder and never mind a long drive to an appointment. Patient and easy to talk to.',
        likes: ['Music', 'Sports', 'Walks'], drives: true },
      { k: 'rosa', n: 'Rosa', ini: 'RG', c: '#C17A12', yrs: '4 years caring for older adults', town: 'Tuttle',
        hi: 'Baker, walker and talker. I speak English and Spanish and I love hearing the old stories.',
        likes: ['Baking', 'Crafts', 'Old movies'], drives: false }
    ]
  }, window.AP_CONFIG || {});

  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var OPEN = C.startHour * 60, CLOSE = C.endHour * 60, MIN = C.minHours * 60;

  function ic(id) { return '<svg class="ap-ic" aria-hidden="true"><use href="' + C.icons + '#' + id + '"/></svg>'; }
  // minutes since midnight -> "9am", "9:30am"
  function tm(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am', x = h % 12 || 12; return x + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ap; }
  function hrs(n) { return (n % 1 ? n.toFixed(1) : String(n)) + (n === 1 ? ' hour' : ' hours'); }
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  var st, root, screen, lastFocus;
  function reset() {
    var first = firstDay();
    st = { step: 0, day: null, month: new Date(first.getFullYear(), first.getMonth(), 1), repeat: true,
      mode: 'set', from: Math.max(OPEN, 9 * 60), to: Math.min(CLOSE, Math.max(OPEN, 9 * 60) + 4 * 60),
      wFrom: Math.max(OPEN, 9 * 60), wTo: Math.min(CLOSE, 15 * 60), len: 3,
      acts: C.activities.slice(0, 3).map(function (a) { return a.k; }), who: 'Mom', cgs: [], any: false, view: null };
    fixTimes();
  }
  function bookable(d) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((d - t) / 864e5);
    if (diff < 1 || diff > C.daysAhead) return false;
    return !(C.weekdaysOnly && (d.getDay() === 0 || d.getDay() === 6));
  }
  function firstDay() { var d = new Date(); d.setHours(0, 0, 0, 0); do { d.setDate(d.getDate() + 1); } while (!bookable(d)); return d; }
  // keep times inside the open hours and at least the minimum length
  function fixTimes() {
    st.from = Math.min(Math.max(st.from, OPEN), CLOSE - MIN);
    if (st.to < st.from + MIN) st.to = st.from + MIN;
    if (st.to > CLOSE) st.to = CLOSE;
    st.wFrom = Math.min(Math.max(st.wFrom, OPEN), CLOSE - MIN);
    if (st.wTo < st.wFrom + MIN) st.wTo = st.wFrom + MIN;
    if (st.wTo > CLOSE) st.wTo = CLOSE;
    st.len = Math.max(C.minHours, Math.min(st.len, (st.wTo - st.wFrom) / 60));
  }
  function hours() { return st.mode === 'set' ? (st.to - st.from) / 60 : st.len; }
  function times(lo, hi) { var o = []; for (var m = lo; m <= hi; m += 30) o.push(m); return o; }
  function sel(k, lo, hi, v, label) {
    return '<label class="ap-tsel"><span>' + label + '</span><select data-k="' + k + '">' + times(lo, hi).map(function (m) {
      return '<option value="' + m + '"' + (m === v ? ' selected' : '') + '>' + tm(m) + '</option>';
    }).join('') + '</select></label>';
  }
  function whenLine() {
    return st.mode === 'set' ? tm(st.from) + ' to ' + tm(st.to) : 'Anytime between ' + tm(st.wFrom) + ' and ' + tm(st.wTo) + ', ' + hrs(st.len);
  }

  var STEPS = [welcome, pickDay, pickTime, plan, pickCaregiver, review, booked];
  var TOTAL = 5;
  function cgBy(k) { return C.caregivers.filter(function (c) { return c.k === k; })[0]; }
  function av(c, big) {
    if (c.photo) return '<img class="ap-av ap-av-img' + (big ? ' big' : '') + '" src="' + c.photo + '" alt="" width="76" height="76">';
    return '<span class="ap-av' + (big ? ' big' : '') + '" style="background:' + c.c + '" aria-hidden="true">' + c.ini + '</span>';
  }
  function names(ks) {
    var n = ks.map(function (k) { return cgBy(k).n; });
    return n.length < 3 ? n.join(' and ') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  }

  function welcome() {
    return '<div class="ap-hello"><p class="ap-kicker">' + C.tagline + '</p><h3>Book a visit in a minute.</h3>' +
      '<p>Pick a date and a time that suits you, choose what they’d like to do, and you’re set.</p>' +
      '<label class="ap-field">Who is the visit for?<select data-k="who"><option>Mom</option><option>Dad</option><option>Grandma</option><option>Grandpa</option><option>Myself</option></select></label>' +
      '<div class="ap-list-preview"><span>' + ic('i-calendar') + 'Upcoming visits</span><b>Nothing booked yet</b></div></div>' +
      foot('<button class="ap-btn" data-go="1">Book a visit</button>');
  }
  function pickDay() {
    var m = st.month, y = m.getFullYear(), mo = m.getMonth();
    var first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate();
    var lastOk = new Date(); lastOk.setHours(0, 0, 0, 0); lastOk.setDate(lastOk.getDate() + C.daysAhead);
    var canPrev = new Date(y, mo, 1) > firstDay(), canNext = new Date(y, mo + 1, 1) <= lastOk;
    var cells = '';
    for (var i = 0; i < first.getDay(); i++) cells += '<span></span>';
    for (var d = 1; d <= n; d++) {
      var dt = new Date(y, mo, d), ok = bookable(dt), on = sameDay(dt, st.day);
      cells += '<button class="ap-cal-d' + (on ? ' on' : '') + '" data-date="' + d + '"' + (ok ? '' : ' disabled') +
        ' aria-label="' + DAYL[dt.getDay()] + ', ' + MONL[mo] + ' ' + d + (ok ? '' : ', not available') + '"' + (on ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
    }
    return head('When should we come?') +
      '<div class="ap-cal"><div class="ap-cal-top"><button class="ap-cal-nav" data-month="-1" aria-label="Previous month"' + (canPrev ? '' : ' disabled') + '>‹</button>' +
      '<b>' + MONL[mo] + ' ' + y + '</b><button class="ap-cal-nav" data-month="1" aria-label="Next month"' + (canNext ? '' : ' disabled') + '>›</button></div>' +
      '<div class="ap-cal-g">' + DAY.map(function (x) { return '<small>' + x.charAt(0) + '</small>'; }).join('') + cells + '</div></div>' +
      '<p class="ap-note">' + (C.weekdaysOnly ? 'Monday to Friday, ' : 'Any day of the week, ') + tm(OPEN) + ' to ' + tm(CLOSE) + '.</p>' +
      '<label class="ap-check"><input type="checkbox" data-k="repeat"' + (st.repeat ? ' checked' : '') + '> Repeat every week</label>' +
      foot('<button class="ap-btn ap-ghost" data-go="0">Back</button><button class="ap-btn" data-go="2"' + (st.day ? '' : ' disabled') + '>Next</button>');
  }
  function pickTime() {
    var set = st.mode === 'set', maxLen = (st.wTo - st.wFrom) / 60;
    var body = set
      ? '<div class="ap-trow">' + sel('from', OPEN, CLOSE - MIN, st.from, 'From') + sel('to', st.from + MIN, CLOSE, st.to, 'To') + '</div>' +
        '<p class="ap-len-read">' + hrs(hours()) + '</p>'
      : '<p class="ap-q">Anytime between</p><div class="ap-trow">' + sel('wFrom', OPEN, CLOSE - MIN, st.wFrom, 'Earliest') + sel('wTo', st.wFrom + MIN, CLOSE, st.wTo, 'Latest') + '</div>' +
        '<div class="ap-stepper"><span><b>How long?</b><small>At least ' + hrs(C.minHours) + '</small></span><span class="ap-ctl">' +
        '<button class="ap-round" data-len="-0.5" aria-label="Less time"' + (st.len <= C.minHours ? ' disabled' : '') + '>−</button><b>' + hrs(st.len) + '</b>' +
        '<button class="ap-round" data-len="0.5" aria-label="More time"' + (st.len >= maxLen ? ' disabled' : '') + '>+</button></span></div>' +
        '<p class="ap-note">Your caregiver picks the exact start inside your window. Flexible visits give you more caregivers to choose from.</p>';
    return head('What time works?') +
      '<div class="ap-seg" role="group" aria-label="Time choice"><button data-mode="set" aria-pressed="' + set + '"' + (set ? ' class="on"' : '') + '>A set time</button>' +
      '<button data-mode="flex" aria-pressed="' + !set + '"' + (set ? '' : ' class="on"') + '>I’m flexible</button></div>' + body +
      (set ? '<p class="ap-note">Anywhere from ' + tm(OPEN) + ' to ' + tm(CLOSE) + ', ' + hrs(C.minHours) + ' or more, by the half hour.</p>' : '') +
      foot('<button class="ap-btn ap-ghost" data-go="1">Back</button><button class="ap-btn" data-go="3">Next</button>');
  }
  function plan() {
    return head('What would ' + esc(st.who === 'Myself' ? 'you' : st.who) + ' like to do?') +
      '<div class="ap-acts">' + C.activities.map(function (a) {
        var on = st.acts.indexOf(a.k) > -1;
        return '<button class="ap-act' + (on ? ' on' : '') + '" data-act="' + a.k + '" aria-pressed="' + on + '">' + ic(a.i) + '<span>' + a.t + '</span><i></i></button>';
      }).join('') + '</div>' +
      foot('<button class="ap-btn ap-ghost" data-go="2">Back</button><button class="ap-btn" data-go="4"' + (st.acts.length ? '' : ' disabled') + '>Next</button>');
  }
  function pickCaregiver() {
    if (st.view) return profile(cgBy(st.view));
    return head('Who would you like to come?') +
      '<p class="ap-note ap-tight">Pick one or more. We ask them first, and the first one who says yes is yours.</p>' +
      '<div class="ap-cgs">' + C.caregivers.map(function (c) {
        var on = st.cgs.indexOf(c.k) > -1;
        return '<div class="ap-cg' + (on ? ' on' : '') + '">' + av(c) +
          '<button class="ap-cg-pick" data-cg="' + c.k + '" aria-pressed="' + on + '"><b>' + c.n + '</b><small>' + c.yrs + '</small></button>' +
          '<button class="ap-link" data-view="' + c.k + '">Profile</button><i class="ap-tickbox" aria-hidden="true"></i></div>';
      }).join('') +
      '<button class="ap-cg ap-cg-any' + (st.any ? ' on' : '') + '" data-cg="any" aria-pressed="' + st.any + '"><span class="ap-av" style="background:#8a96a3" aria-hidden="true">?</span><span><b>Whoever is available</b><small>The quickest way to get a yes</small></span></button></div>' +
      '<p class="ap-note">If none of your picks can make it, we offer the visit to other caregivers on our team so it still happens. Sample caregivers for this preview.</p>' +
      foot('<button class="ap-btn ap-ghost" data-go="3">Back</button><button class="ap-btn" data-go="5"' + (st.cgs.length || st.any ? '' : ' disabled') + '>Review</button>');
  }
  // Same three parts as a real Caring Companions caregiver profile: about, experience caring for others, why they enjoy it.
  function profile(c) {
    var on = st.cgs.indexOf(c.k) > -1;
    function part(t, x, q) { return x ? '<div class="ap-part"><p class="ap-lbl">' + t + '</p><p' + (q ? ' class="ap-quote"' : '') + '>' + x + '</p></div>' : ''; }
    return '<div class="ap-prof">' + av(c, true) + '<h3>' + (c.full || c.n) + '</h3><p class="ap-sub">' + c.yrs + ' &middot; lives near ' + c.town + '</p>' +
      (c.about ? part('About ' + c.n, c.about) + part('Experience caring for others', c.exp) + part('Why ' + c.n + ' enjoys caregiving', c.why, true)
        : '<p class="ap-quote">“' + c.hi + '”</p><p class="ap-lbl">Likes</p><div class="ap-tags">' + c.likes.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div>') +
      '<ul class="ap-plan">' +
        '<li>' + ic('i-shield') + C.checkLabel + '</li>' +
        '<li>' + ic('i-check') + C.brand + ' orientation</li>' +
        (c.drives ? '<li>' + ic('i-car') + 'Can drive to outings and appointments</li>' : '') +
      '</ul><p class="ap-note">Sample profile for this preview.</p></div>' +
      foot('<button class="ap-btn ap-ghost" data-unview>Back</button><button class="ap-btn" data-cg="' + c.k + '" data-pickback>' + (on ? 'Remove ' : 'Add ') + c.n + '</button>');
  }
  function review() {
    var h = hours(), extra = C.shortExtra && h < C.shortUnder ? C.shortExtra : 0, r = C.rate + extra;
    var acts = C.activities.filter(function (a) { return st.acts.indexOf(a.k) > -1; });
    var who = st.cgs.length
      ? '<div class="ap-cg-line"><span class="ap-avs">' + st.cgs.map(function (k) { return av(cgBy(k)); }).join('') + '</span><span><b>Asking ' + names(st.cgs) + ' first</b><small>' + (st.any ? 'then anyone available' : 'then others on our team if needed') + '</small></span></div>'
      : '<div class="ap-cg-line"><span class="ap-av" style="background:#8a96a3" aria-hidden="true">?</span><span><b>Whoever is available</b><small>you’ll see their profile once they say yes</small></span></div>';
    return head('Look good?') + '<div class="ap-card">' + who +
      '<p class="ap-when">' + DAYL[st.day.getDay()] + ', ' + MON[st.day.getMonth()] + ' ' + st.day.getDate() + '</p>' +
      '<p class="ap-time">' + whenLine() + (st.repeat ? ' &middot; every week' : '') + '</p>' +
      '<ul class="ap-plan">' + acts.map(function (a) { return '<li>' + ic(a.i) + a.t + '</li>'; }).join('') + '</ul>' +
      '<div class="ap-cost"><span>Estimate: ' + C.rateLabel + ', ' + hrs(h) + ' at $' + r + '</span><b>$' + (h * r) + '</b></div></div>' +
      (extra ? '<p class="ap-note">Visits under ' + hrs(C.shortUnder) + ' are $' + extra + ' more an hour, to cover drive time between visits.</p>' : '') +
      (C.perk ? '<p class="ap-perk">' + ic('i-check') + '<span>' + C.perk + '</span></p>' : '') +
      '<p class="ap-note">Nothing is charged in this preview.</p>' +
      foot('<button class="ap-btn ap-ghost" data-go="4">Back</button><button class="ap-btn" data-go="6">Book this visit</button>');
  }
  function booked() {
    var whose = esc(st.who === 'Myself' ? 'Your' : st.who + '’s');
    var next = st.cgs.length ? 'We’re asking ' + names(st.cgs) + ' first. You’ll see who’s coming, with their profile, as soon as one says yes.'
      : 'You’ll see who’s coming, with their profile, as soon as a caregiver says yes.';
    if (st.mode === 'flex') next += ' They’ll pick the exact time inside your window.';
    return '<div class="ap-done"><div class="ap-tick" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h3>You’re all set.</h3><p>' + whose + ' visit is on the calendar. ' + next + '</p>' +
      '<div class="ap-list-preview on"><span>' + ic('i-calendar') + 'Upcoming visits</span><b>' + DAY[st.day.getDay()] + ' ' + MON[st.day.getMonth()] + ' ' + st.day.getDate() + ', ' +
        (st.mode === 'set' ? tm(st.from) : tm(st.wFrom) + ' to ' + tm(st.wTo)) + '</b></div>' +
      '<p class="ap-small">That’s how booking will work in our app. Want to be first in line?</p></div>' +
      foot('<a class="ap-btn" href="' + C.joinHref + '">' + C.joinLabel + '</a><button class="ap-btn ap-ghost" data-restart>Try again</button>');
  }

  function head(t) { return '<div class="ap-head"><span class="ap-step">Step ' + st.step + ' of ' + TOTAL + '</span><h3>' + t + '</h3><div class="ap-bar"><i style="width:' + (st.step / TOTAL * 100) + '%"></i></div></div>'; }
  function foot(btns) { return '<div class="ap-foot">' + btns + '</div>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(keepFocus) {
    screen.innerHTML = STEPS[st.step]();
    if (!keepFocus) { screen.classList.remove('ap-in'); void screen.offsetWidth; screen.classList.add('ap-in'); }
    var s = screen.querySelector('select[data-k="who"]'); if (s) s.value = st.who;
    if (keepFocus) { var f = screen.querySelector(keepFocus); if (f) f.focus({ preventScroll: true }); return; }
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
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-month')) { st.month = new Date(st.month.getFullYear(), st.month.getMonth() + +t.getAttribute('data-month'), 1); render('[data-month="' + t.getAttribute('data-month') + '"]'); return; }
      if (t.hasAttribute('data-date')) { st.day = new Date(st.month.getFullYear(), st.month.getMonth(), +t.getAttribute('data-date')); render('[data-date="' + t.getAttribute('data-date') + '"]'); return; }
      if (t.hasAttribute('data-mode')) { st.mode = t.getAttribute('data-mode'); render('[data-mode="' + st.mode + '"]'); return; }
      if (t.hasAttribute('data-len')) { st.len += +t.getAttribute('data-len'); fixTimes(); render('[data-len="' + t.getAttribute('data-len') + '"]'); return; }
      if (t.hasAttribute('data-view')) { st.view = t.getAttribute('data-view'); render(); return; }
      if (t.hasAttribute('data-unview')) { st.view = null; render(); return; }
      if (t.hasAttribute('data-cg')) {
        var k = t.getAttribute('data-cg');
        if (k === 'any') { st.any = !st.any; if (st.any) st.cgs = []; }
        else { var i = st.cgs.indexOf(k); if (i > -1) st.cgs.splice(i, 1); else { st.cgs.push(k); st.any = false; } }
        if (t.hasAttribute('data-pickback')) { st.view = null; render(); return; }
        render('[data-cg="' + k + '"]'); return;
      }
      if (t.hasAttribute('data-go')) { st.view = null; st.step = +t.getAttribute('data-go'); render(); return; }
      if (t.hasAttribute('data-restart')) { reset(); render(); return; }
      if (t.hasAttribute('data-act')) { var a = t.getAttribute('data-act'), j = st.acts.indexOf(a); if (j > -1) st.acts.splice(j, 1); else st.acts.push(a); render('[data-act="' + a + '"]'); return; }
    });
    root.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-k');
      if (k === 'who') st.who = e.target.value;
      if (k === 'repeat') st.repeat = e.target.checked;
      if (k === 'from' || k === 'to' || k === 'wFrom' || k === 'wTo') {
        var v = +e.target.value, len = st.to - st.from;
        if (k === 'from') { st.from = v; st.to = Math.min(CLOSE, Math.max(v + MIN, v + len)); } // keep the length when the start moves
        else st[k] = v;
        fixTimes(); render('select[data-k="' + k + '"]');
      }
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
