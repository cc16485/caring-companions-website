/* Caring Companions — "keep it private, or send your results" module.
   Drop-in card for the free tools. If the visitor chooses to send, their
   results + contact become a lead in the CC Hub (via window.CCForms from
   forms.js); if they don't, nothing leaves the browser. Privacy-first.

   Usage (after forms.js + this file are loaded):
     CCResultsShare.mount({
       mountId: 'ccrs-mount',
       tool: 'Cost Calculator',
       resultsSelector: '#cc-result',   // optional: element whose text = the results
       getSummary: function(){ return '...'; }  // optional: overrides resultsSelector
     });
*/
(function () {
  'use strict';

  function injectStyle() {
    if (document.getElementById('ccrs-style')) return;
    var s = document.createElement('style');
    s.id = 'ccrs-style';
    s.textContent = [
      '.ccrs-card{background:#fbf6ec;border:1px solid #e8dcc4;border-radius:14px;padding:24px;margin:22px 0}',
      '.ccrs-h{font-size:16px;font-weight:700;color:var(--brand-blue,#0D365F);margin:0 0 6px}',
      '.ccrs-sub{font-size:13.5px;line-height:1.6;color:#55677a;margin:0 0 16px}',
      '.ccrs-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:0 0 12px}',
      '.ccrs-in{width:100%;padding:11px 13px;font-size:14px;border:1.5px solid #dfe6e2;border-radius:8px;font-family:inherit;color:#16283a;background:#fff;box-sizing:border-box}',
      '.ccrs-in:focus{outline:none;border-color:var(--cta,#1F7A8C)}',
      '.ccrs-btn{background:var(--cta,#1F7A8C);color:#fff;border:none;border-radius:8px;padding:12px 22px;font-size:14.5px;font-weight:600;cursor:pointer}',
      '.ccrs-btn:hover{background:var(--cta-hover,#155A68)}',
      '.ccrs-btn:disabled{opacity:.6;cursor:default}',
      '.ccrs-err{font-size:13px;color:#8a5a2a;margin:12px 0 0}',
      '.ccrs-fine{font-size:12.5px;color:#8a978f;line-height:1.5;margin:12px 0 0}',
      '.ccrs-done .ccrs-sub a{color:var(--cta,#1F7A8C);font-weight:600;text-decoration:none}',
      '@media(max-width:560px){.ccrs-grid{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  window.CCResultsShare = {
    mount: function (opts) {
      opts = opts || {};
      var el = document.getElementById(opts.mountId);
      if (!el) return;
      injectStyle();
      var tool = opts.tool || 'Free tool';

      el.innerHTML =
        '<div class="ccrs-card" id="ccrs-form">'
        + '<p class="ccrs-h">Your results are yours.</p>'
        + '<p class="ccrs-sub">We don’t save anything you enter here. If you’d like a care coordinator to walk through what this means, with no pressure, send your results and we’ll reach out.</p>'
        + '<div class="ccrs-grid">'
        + '<input id="ccrs-name" class="ccrs-in" placeholder="Your name">'
        + '<input id="ccrs-phone" class="ccrs-in" placeholder="Phone">'
        + '<input id="ccrs-email" class="ccrs-in" type="email" placeholder="Email">'
        + '</div>'
        + '<button id="ccrs-send" class="ccrs-btn">Send my results to Caring Companions</button>'
        + '<p id="ccrs-err" class="ccrs-err" hidden></p>'
        + '<p class="ccrs-fine">Prefer to keep it private? Completely fine, nothing is sent unless you choose to.</p>'
        + '</div>'
        + '<div class="ccrs-card ccrs-done" id="ccrs-done" hidden>'
        + '<p class="ccrs-h" style="color:#0e6b5c">✓ Sent. A care coordinator will reach out soon.</p>'
        + '<p class="ccrs-sub" style="margin:0">Prefer to talk now? Call <a href="tel:14172348494">(417) 234-8494</a>.</p>'
        + '</div>';

      document.getElementById('ccrs-send').addEventListener('click', function () {
        var btn = this;
        var name = (document.getElementById('ccrs-name').value || '').trim();
        var phone = (document.getElementById('ccrs-phone').value || '').trim();
        var email = (document.getElementById('ccrs-email').value || '').trim();
        var err = document.getElementById('ccrs-err');
        if (!name || (!phone && !email)) {
          err.textContent = 'Please add your name and a phone or email so a coordinator can reach you.';
          err.hidden = false; return;
        }
        if (!window.CCForms) { err.textContent = 'Sorry, something went wrong. Please call (417) 234-8494.'; err.hidden = false; return; }
        err.hidden = true; btn.disabled = true; btn.textContent = 'Sending…';

        var summary = '';
        try {
          if (typeof opts.getSummary === 'function') summary = String(opts.getSummary() || '');
          else if (opts.resultsSelector) { var r = document.querySelector(opts.resultsSelector); summary = r ? r.innerText : ''; }
        } catch (e) {}
        summary = summary.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1500);
        var msg = tool + ' results (sent from the website).' + (summary ? '\n\n' + summary : '');

        window.CCForms.submitLead({ name: name, phone: phone, email: email, message: msg, care_for: tool })
          .then(function () {
            document.getElementById('ccrs-form').hidden = true;
            document.getElementById('ccrs-done').hidden = false;
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = 'Send my results to Caring Companions';
            err.textContent = 'Sorry, that didn’t go through. Please try again, or call (417) 234-8494.';
            err.hidden = false;
          });
      });
    }
  };
})();
