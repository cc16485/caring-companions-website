/* Caring Companions: "Get The Talk worksheets by email" (Samantha 2026-11-11, "Short welcome, then monthly").
   A small card placed just above the page footer on The Talk, the Family Guides, the Dementia Journey and the home page.
   First name + email go to the family-signup server, which emails the 8 worksheets and a short welcome. The card shows
   the 8 worksheet links itself right away, so nobody leaves empty-handed even if the email can't go just now.
   A sign-up is NOT a request for a call: it does not create a lead.
   Turn it off on a page with <body data-no-signup>. */
(function () {
  'use strict';
  if (document.body && document.body.hasAttribute('data-no-signup')) return;
  if (document.getElementById('ccfs')) return;
  var ENDPOINT = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/family-signup';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM';
  var PDF = '/the-talk/printables/';
  var SHEETS = [
    ["The changes I'm noticing", 'the-talk-1-the-changes-i-m-noticing.pdf'],
    ['Our family plan', 'the-talk-2-our-family-plan.pdf'],
    ['Planning your first conversation', 'the-talk-3-planning-your-first-conversation.pdf'],
    ['When Mom or Dad says no', 'the-talk-4-when-mom-or-dad-says-no.pdf'],
    ['Questions to ask any home care provider', 'the-talk-5-questions-to-ask-any-home-care-provider.pdf'],
    ['Ways to pay for care', 'the-talk-6-ways-to-pay-for-care.pdf'],
    ['Getting ready for the first visit', 'the-talk-7-getting-ready-for-the-first-visit.pdf'],
    ['Checking in every few months', 'the-talk-8-checking-in-every-few-months.pdf']
  ];

  var css = [
    '#ccfs{max-width:760px;margin:36px auto;padding:0 16px;box-sizing:border-box}',
    '#ccfs .ccfs-card{background:#fbf6ec;border:1px solid #e8dcc4;border-radius:16px;padding:26px 24px}',
    '#ccfs h2{font-family:Georgia,"Times New Roman",serif;font-size:24px;line-height:1.25;font-weight:600;color:#0D365F;margin:0 0 8px}',
    '#ccfs p{font-size:16px;line-height:1.6;color:#3d4b59;margin:0 0 16px}',
    '#ccfs form{display:grid;grid-template-columns:1fr 1.4fr auto;gap:10px;align-items:end}',
    '#ccfs label{display:block;font-size:13px;font-weight:700;color:#0D365F;margin:0 0 4px}',
    '#ccfs input{width:100%;box-sizing:border-box;font-size:16px;padding:12px 12px;border:1px solid #cfd8e1;border-radius:10px;background:#fff;color:#1f2a36}',
    '#ccfs input:focus{outline:3px solid #F0A63A;outline-offset:1px}',
    '#ccfs button{font-size:16px;font-weight:700;color:#fff;background:#0D365F;border:0;border-radius:10px;padding:13px 20px;cursor:pointer;min-height:48px}',
    '#ccfs button:hover{background:#092647}',
    '#ccfs button[disabled]{opacity:.6;cursor:default}',
    '#ccfs .ccfs-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
    '#ccfs .ccfs-fine{font-size:13px;color:#6b7785;margin:12px 0 0}',
    '#ccfs .ccfs-err{color:#a33a2a;font-size:14px;font-weight:600;margin:10px 0 0}',
    '#ccfs ul{margin:6px 0 0;padding-left:20px}',
    '#ccfs li{font-size:16px;line-height:1.7}',
    '#ccfs li a{color:#0D365F;font-weight:600}',
    '@media (max-width:640px){#ccfs form{grid-template-columns:1fr}#ccfs button{width:100%}}'
  ].join('');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function list() {
    return '<ul>' + SHEETS.map(function (s) { return '<li><a href="' + PDF + s[1] + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a></li>'; }).join('') + '</ul>';
  }
  function track(ev) { try { if (window.CCTrack) window.CCTrack(ev, {}); } catch (e) {} }

  function mount() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var box = document.createElement('section');
    box.id = 'ccfs'; box.setAttribute('aria-labelledby', 'ccfs-h');
    box.innerHTML =
      '<div class="ccfs-card">' +
        '<h2 id="ccfs-h">Get all 8 Talk worksheets in your inbox</h2>' +
        '<p>Simple printable pages to help your family notice changes, plan, and start the conversation. We\'ll also send a few notes from our team. Unsubscribe any time.</p>' +
        '<form novalidate>' +
          '<div><label for="ccfs-first">First name</label><input id="ccfs-first" name="first" autocomplete="given-name" maxlength="30"></div>' +
          '<div><label for="ccfs-email">Email</label><input id="ccfs-email" name="email" type="email" autocomplete="email" required maxlength="120"></div>' +
          '<div class="ccfs-hp" aria-hidden="true"><label for="ccfs-web">Leave this empty</label><input id="ccfs-web" name="website" tabindex="-1" autocomplete="off"></div>' +
          '<button type="submit">Send me the worksheets</button>' +
        '</form>' +
        '<p class="ccfs-err" role="alert" hidden></p>' +
        '<p class="ccfs-fine">This does not sign you up for a call. When you want to talk, call (417) 234-8494.</p>' +
      '</div>';
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(box, footer); else document.body.appendChild(box);

    var form = box.querySelector('form'), btn = box.querySelector('button'), err = box.querySelector('.ccfs-err');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      err.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { err.textContent = 'Please enter a real email address.'; err.hidden = false; form.email.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending...';
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
        body: JSON.stringify({ action: 'signup', first: form.first.value.trim(), email: email, website: form.website.value, page: location.pathname })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'error');
          track('email_signup');
          done(res.j && res.j.emailed);
        })
        .catch(function (x) {
          var msg = String(x && x.message || '');
          if (/real email|Too many/.test(msg)) { err.textContent = msg; err.hidden = false; btn.disabled = false; btn.textContent = 'Send me the worksheets'; return; }
          done(false, true);
        });
    });
    function done(emailed, failed) {
      box.querySelector('.ccfs-card').innerHTML =
        '<h2 id="ccfs-h">' + (failed ? 'Here are your worksheets' : 'Thank you. Here are your worksheets') + '</h2>' +
        '<p>' + (emailed ? 'We just emailed them to you too. ' : failed ? 'We couldn\'t email them just now, so here they are to print. ' : 'Here they are to print. ') +
        'Most families start with the first one.</p>' + list() +
        '<p class="ccfs-fine">Questions? Call (417) 234-8494. A real person in Springfield answers.</p>';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
