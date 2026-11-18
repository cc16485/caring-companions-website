/* Caring Companions: "Who could help pay?" finder (11-18).
   Put <div class="pf-mount" data-from="pricing"></div> on a page, then load
   /assets/pay-finder.css and this file. Answers stay in the browser: only the
   first use is counted (estimate of interest), never the answers themselves. */
(function () {
  'use strict';
  var QS = [
    { k: 'vet', q: 'Did they serve in the U.S. military?' },
    { k: 'dem', q: 'Do they have a dementia or memory loss diagnosis?' },
    { k: 'med', q: 'Do they have regular Medicare?', s: 'Not a Medicare Advantage plan like Humana, Aetna or UnitedHealthcare' },
    { k: 'ltc', q: 'Do they have a long-term care insurance policy?' },
    { k: 'mcd', q: 'Do they have MO HealthNet (Medicaid) now?' }
  ];
  var CHECK = '<span class="pf-check">Not sure? Call us and we will check it with you.</span>';
  var WAYS = {
    vet: { t: 'VA Community Care', p: 'The VA may pay for help at home for veterans enrolled in VA health care. It starts with a referral from their VA doctor, and your veteran chooses who cares for them, even a family member or friend we hire.', a: '/veterans', l: 'How it works for veterans' },
    guide: { t: 'Medicare GUIDE respite visits', p: 'Medicare may pay for a trained caregiver to stay with your loved one, up to 19 four-hour visits a year, billed to Medicare and not to you. It is for people living at home or in independent living.', a: '/medicare-guide', l: 'See if you qualify' },
    ltc: { t: 'Long-term care insurance', p: 'A policy may cover most or all of the cost of care at home. We verify your benefits and can bill the insurer directly.', a: '/long-term-care-insurance', l: 'How we help with your policy' },
    mcd: { t: 'MO HealthNet, through our sister company', p: 'Caring Companions CDS can help through Missouri’s Consumer Directed Services program, where you choose your caregiver: someone you already know, or someone we help you find.', a: 'https://caringcds.com', l: 'Visit caringcds.com', x: ' or call <a href="tel:+14172182888">(417) 218-2888</a>' }
  };
  var PRIVATE = { t: 'Paying privately', p: 'Our published rates are $30 to $34 an hour. Many families mix this with the options above.', a: '/pricing#estimate', l: 'Estimate your weekly cost', x: ' or see <a href="/care-paths/paying-for-care">more ways families pay</a>' };

  function card(w, unsure, isNew) {
    return '<div class="pf-card' + (isNew ? ' pf-new' : '') + '"><b>' + w.t + '</b><p>' + w.p + '</p><p><a href="' + w.a + '">' + w.l + ' &rarr;</a>' + (w.x || '') + '</p>' + (unsure ? CHECK : '') + '</div>';
  }

  function build(mount, n) {
    var from = mount.getAttribute('data-from') || '';
    var ans = {}, shown = {}, used = false;
    var h = '<section class="pf" id="who-can-pay" aria-labelledby="pfH' + n + '"><h2 id="pfH' + n + '">Who could help pay for care?</h2>' +
      '<p class="pf-intro">Answer what you know. You will see the ways that could help, right here.</p>';
    QS.forEach(function (q, i) {
      var id = 'pfQ' + n + '_' + i;
      h += '<div class="pf-q"><p id="' + id + '">' + q.q + (q.s ? '<small>' + q.s + '</small>' : '') + '</p>' +
        '<div class="pf-opts" role="group" aria-labelledby="' + id + '" data-k="' + q.k + '">' +
        '<button type="button" data-v="y" aria-pressed="false">Yes</button><button type="button" data-v="n" aria-pressed="false">No</button><button type="button" data-v="u" aria-pressed="false">Not sure</button></div></div>';
    });
    h += '<div class="pf-res" aria-live="polite"><h3>Ways that could help</h3><div class="pf-list"></div></div>' +
      '<div class="pf-foot"><p>We are happy to walk through it with you, no obligation.</p><div class="btns"><a href="/free-assessment" class="btn-primary">Request a Free Assessment</a> <a href="tel:+14172348494" class="btn-outline">Call (417) 234-8494</a></div></div></section>';
    mount.innerHTML = h;
    var list = mount.querySelector('.pf-list');

    function draw() {
      var out = [], any = false, now = {};
      function add(key, w, unsure) { now[key] = 1; out.push(card(w, unsure, !shown[key])); }
      QS.forEach(function (q) { if (ans[q.k]) any = true; });
      if (ans.vet === 'y' || ans.vet === 'u') add('vet', WAYS.vet, ans.vet === 'u');
      if ((ans.dem === 'y' || ans.dem === 'u') && ans.med !== 'n') add('guide', WAYS.guide, ans.dem === 'u' || ans.med !== 'y');
      if (ans.ltc === 'y' || ans.ltc === 'u') add('ltc', WAYS.ltc, ans.ltc === 'u');
      if (ans.mcd === 'y' || ans.mcd === 'u') add('mcd', WAYS.mcd, ans.mcd === 'u');
      add('priv', PRIVATE, false);
      list.innerHTML = (any ? '' : '<p class="pf-hint">Answer a question above to see what may fit.</p>') + out.join('');
      shown = now;
    }
    Array.prototype.forEach.call(mount.querySelectorAll('.pf-opts'), function (g) {
      var k = g.getAttribute('data-k'), bs = g.querySelectorAll('button');
      Array.prototype.forEach.call(bs, function (b) {
        b.addEventListener('click', function () {
          var on = b.getAttribute('aria-pressed') !== 'true';
          Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', x === b && on ? 'true' : 'false'); });
          if (on) ans[k] = b.getAttribute('data-v'); else delete ans[k];
          draw();
          if (!used && window.CCTrack) { used = true; window.CCTrack('payfinder_used', { tool: 'pay-finder', from: from }); }
        });
      });
    });
    draw();
  }
  var ms = document.querySelectorAll('.pf-mount');
  for (var i = 0; i < ms.length; i++) build(ms[i], i);
})();
