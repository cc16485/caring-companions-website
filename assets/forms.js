/* Caring Companions — form submissions.
   Posts to the shared hub's lead-intake Edge Function, so every website
   submission becomes a lead in the CC Hub pipeline (source "Website",
   follow-up due same day). Creates leads only — cannot read anything. */
(function () {
  'use strict';

  var LEAD_ENDPOINT =
    'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/lead-intake?token=cclead_b36832b06f2bb8d58b7d6302';

  window.CCForms = {
    // fields: { name, phone, email, message, care_for } — all optional,
    // but at least one of name/phone/email must be present.
    submitLead: function (fields) {
      return fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }).then(function (res) {
        if (!res.ok) throw new Error('lead-intake HTTP ' + res.status);
        if (window.CCTrack) CCTrack('lead_submitted');
        return res.json();
      });
    },
  };
})();
