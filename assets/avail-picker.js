/* Caring Companions: "When are you usually free?" on the job pages (11-18).
   Put <div class="avp-mount" data-from="prn" data-note="..."></div> on a page with /assets/avail-picker.css.
   The picks ride along on every /apply link on the page as ?days=mon,tue&times=evening, and apply.html
   ticks the same chips (PRN) or fills "When can you work?" (other roles). Keys match apply.html. */
(function () {
  'use strict';
  var DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
  var TIMES = [['morning', 'Morning'], ['daytime', 'Daytime'], ['evening', 'Evening'], ['overnight', 'Overnight']];
  var mounts = document.querySelectorAll('.avp-mount');
  if (!mounts.length) return;
  var pick = { days: [], times: [] }, used = false;

  function chips(k, list) {
    return '<div class="avp-chips" role="group" aria-labelledby="avp-' + k + '">' + list.map(function (x) {
      return '<button type="button" aria-pressed="false" data-k="' + k + '" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function order(k, list) { return list.map(function (x) { return x[0]; }).filter(function (v) { return pick[k].indexOf(v) >= 0; }); }
  function relink() {
    var links = document.querySelectorAll('a[href^="/apply"]');
    Array.prototype.forEach.call(links, function (a) {
      var u = new URL(a.getAttribute('href'), location.origin);
      var d = order('days', DAYS), t = order('times', TIMES);
      if (d.length) u.searchParams.set('days', d.join(',')); else u.searchParams.delete('days');
      if (t.length) u.searchParams.set('times', t.join(',')); else u.searchParams.delete('times');
      a.setAttribute('href', u.pathname + u.search);
    });
  }
  function sync() {
    Array.prototype.forEach.call(document.querySelectorAll('.avp button'), function (b) {
      b.setAttribute('aria-pressed', pick[b.getAttribute('data-k')].indexOf(b.getAttribute('data-v')) >= 0 ? 'true' : 'false');
    });
    var any = pick.days.length || pick.times.length;
    Array.prototype.forEach.call(document.querySelectorAll('.avp-done'), function (p) { p.hidden = !any; });
    relink();
  }
  Array.prototype.forEach.call(mounts, function (m) {
    var from = m.getAttribute('data-from') || '';
    m.innerHTML = '<div class="avp"><p class="avp-h">When are you usually free?</p>' +
      '<p class="avp-sub">' + (m.getAttribute('data-note') || 'Tap what usually works. It carries into your application.') + '</p>' +
      '<p class="avp-l" id="avp-days">Days</p>' + chips('days', DAYS) +
      '<p class="avp-l" id="avp-times">Times of day</p>' + chips('times', TIMES) +
      '<p class="avp-done" hidden aria-live="polite">Got it. These will already be filled in when you apply.</p></div>';
    m.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-k]') : null;
      if (!b) return;
      var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'), i = pick[k].indexOf(v);
      if (i >= 0) pick[k].splice(i, 1); else pick[k].push(v);
      sync();
      if (!used && window.CCTrack) { used = true; window.CCTrack('availpicker_used', { tool: 'avail-picker', from: from }); }
    });
  });
})();
