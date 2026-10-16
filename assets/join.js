// Caring Companions: opening list / early interest sign-up.
// Saves one row to the shared Supabase table public.early_interest (insert only; see ~/Claude/early-interest.sql).
// Nothing here texts or emails anyone. Staff read the list in Supabase or the Hub.
(function () {
  'use strict';
  var C = Object.assign({
    site: 'oklahoma',
    endpoint: 'https://zngsgedlsxinbygwmxwn.supabase.co/rest/v1/early_interest',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM',
    fallback: 'Please call or email us instead.'
  }, window.JOIN_CONFIG || {});

  document.querySelectorAll('form[data-join]').forEach(function (form) {
    var status = form.querySelector('.join-status');
    var kindInputs = form.querySelectorAll('input[name="kind"]');
    function syncKind() {
      var k = (form.querySelector('input[name="kind"]:checked') || {}).value || 'family';
      form.querySelectorAll('[data-for]').forEach(function (el) {
        var show = el.getAttribute('data-for').split(' ').indexOf(k) > -1;
        el.hidden = !show;
        el.querySelectorAll('input, select, textarea').forEach(function (i) { i.disabled = !show; });
      });
    }
    kindInputs.forEach(function (i) { i.addEventListener('change', syncKind); });
    var preset = new URLSearchParams(location.search).get('as');
    if (preset) { var r = form.querySelector('input[name="kind"][value="' + preset + '"]'); if (r) r.checked = true; }
    syncKind();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      if (f.get('website')) return; // honeypot
      var name = (f.get('name') || '').trim(), email = (f.get('email') || '').trim(), phone = (f.get('phone') || '').trim();
      var zip = (f.get('zip') || '').replace(/\D/g, '').slice(0, 5);
      status.className = 'join-status';
      if (!name || (!email && !phone)) { status.textContent = 'Please add your name and an email or phone number so we can reach you.'; status.classList.add('err'); return; }
      if (zip && zip.length !== 5) { status.textContent = 'Please check the ZIP code (5 digits).'; status.classList.add('err'); return; }
      var row = {
        site: C.site,
        kind: f.get('kind') || 'family',
        name: name.slice(0, 120),
        email: email ? email.slice(0, 200) : null,
        phone: phone ? phone.slice(0, 40) : null,
        zip: zip || null,
        for_whom: f.get('for_whom') || null,
        interests: f.getAll('interests').slice(0, 12),
        timing: f.get('timing') || null,
        experience: f.get('experience') || null,
        message: (f.get('message') || '').slice(0, 2000) || null,
        may_contact: !!f.get('may_contact'),
        source: (location.pathname + (document.referrer ? ' from ' + document.referrer : '')).slice(0, 300)
      };
      if (!row.interests.length) row.interests = null;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = 'Sending...';
      fetch(C.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: C.key, Authorization: 'Bearer ' + C.key, Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        form.reset(); syncKind();
        form.classList.add('join-done');
        status.classList.add('ok');
        status.textContent = row.kind === 'caregiver'
          ? 'Thank you! You’re on our list for the Mustang team.'
          : 'Thank you! You’re on our opening list.';
        try { if (window.ccTrack) window.ccTrack('join_list', { kind: row.kind, site: C.site }); } catch (e2) {}
      }).catch(function () {
        status.classList.add('err');
        status.textContent = 'Sorry, that didn’t go through. ' + C.fallback;
      }).finally(function () { btn.disabled = false; });
    });
  });
})();
