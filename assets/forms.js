/* Caring Companions: form submissions.
   Posts to the shared hub's lead-intake Edge Function, so every website
   submission becomes a lead in the CC Hub pipeline (source "Website",
   follow-up due same day). Creates leads only, cannot read anything.
   A partner's link code, if this device has one, goes with every form (see CCPartnerRef). */
(function () {
  'use strict';

  var LEAD_ENDPOINT =
    'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/lead-intake?token=cclead_b36832b06f2bb8d58b7d6302';

  /* Partner links (Referral Partner Program, step 3, 2026-10-26). mo-care.com/r/?p=JANE-K7 remembers the code on
     this device for 90 days, and the FIRST link wins (a second partner's link never replaces it). Every form below
     then sends it, and the Hub decides what it may do (a link never changes a known family's referral source).
     Only the code and the date are kept, in this browser, never anything about the family. */
  var REF_KEY = 'cc_partner_ref', REF_DAYS = 90;
  function refCode(c) { c = String(c == null ? '' : c).trim().toUpperCase(); return /^[A-Z0-9-]{3,20}$/.test(c) ? c : ''; }
  function refRead() {
    try {
      var v = JSON.parse(localStorage.getItem(REF_KEY) || 'null');
      var t = v && Date.parse(v.first_at);
      if (!v || !refCode(v.code) || isNaN(t) || Date.now() - t > REF_DAYS * 864e5 || t > Date.now() + 864e5) { localStorage.removeItem(REF_KEY); return null; }
      return { code: refCode(v.code), first_at: v.first_at };
    } catch (e) { return null; }
  }
  function refRemember(code) {
    code = refCode(code);
    var cur = refRead();
    if (cur || !code) return cur;
    var v = { code: code, first_at: new Date().toISOString() };
    try { localStorage.setItem(REF_KEY, JSON.stringify(v)); } catch (e) { return null; }
    return v;
  }
  window.CCPartnerRef = { read: refRead, remember: refRemember, code: refCode, KEY: REF_KEY, DAYS: REF_DAYS };

  window.CCForms = {
    // fields: { name, phone, email, message, care_for }, all optional,
    // but at least one of name/phone/email must be present.
    submitLead: function (fields) {
      var ref = refRead(), body = Object.assign({}, fields);
      if (ref && !body.partner_code) body.partner_code = ref.code;
      return fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (res) {
        if (!res.ok) throw new Error('lead-intake HTTP ' + res.status);
        if (window.CCTrack) CCTrack('lead_submitted');
        return res.json();
      });
    },
    // Community Ambassador application (2026-10-26): the same door, but never a lead. Not counted as a lead submission.
    submitApplication: function (fields) {
      var ref = refRead(), body = Object.assign({ kind: 'ambassador_application' }, fields);
      if (ref && !body.partner_code) body.partner_code = ref.code;
      return fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok) { var e = new Error((j && j.error) || ('lead-intake HTTP ' + res.status)); e.status = res.status; throw e; }
          if (window.CCTrack) CCTrack('ambassador_applied');
          return j;
        });
      });
    },
  };
})();
