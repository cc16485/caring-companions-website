// Caring Companions: the mo-care.com/app sign-up. Samantha 2026-10-16: "send mo-care.com/app sign-ups into the Leads Intake
// Desk tagged 'wants the app'". Posts to the Hub's lead-intake (the same door as every care form, via CCForms.submitLead),
// which makes a care lead tagged "wants the app": app-only clients still get intake and a free home visit first.
(function () {
  'use strict';
  document.querySelectorAll('form[data-app-lead]').forEach(function (form) {
    var status = form.querySelector('.join-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      if (f.get('website')) return; // honeypot
      var name = (f.get('name') || '').trim(), email = (f.get('email') || '').trim(), phone = (f.get('phone') || '').trim();
      var zip = (f.get('zip') || '').replace(/\D/g, '').slice(0, 5);
      status.className = 'join-status';
      if (!name || (!email && !phone)) { status.textContent = 'Please add your name and an email or phone number so we can reach you.'; status.classList.add('err'); return; }
      if (zip && zip.length !== 5) { status.textContent = 'Please check the ZIP code (5 digits).'; status.classList.add('err'); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = 'Sending...';
      window.CCForms.submitLead({
        kind: 'app_interest', name: name.slice(0, 120), email: email.slice(0, 200), phone: phone.slice(0, 40), zip: zip,
        for_whom: f.get('for_whom') || '', message: (f.get('message') || '').slice(0, 2000), may_contact: !!f.get('may_contact')
      }).then(function () {
        form.reset(); form.classList.add('join-done'); status.classList.add('ok');
        status.textContent = 'Thank you! A Care Coordinator will call you soon to set up your free living room meeting, the first step to using the app.';
        try { if (window.ccTrack) window.ccTrack('app_signup'); } catch (e2) {}
      }).catch(function () {
        status.classList.add('err');
        status.textContent = 'Sorry, that didn’t go through. Please call us at (417) 234-8494.';
      }).finally(function () { btn.disabled = false; });
    });
  });
})();
