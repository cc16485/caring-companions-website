/* Caring Companions — first-party, anonymous analytics.
   Tracks the Funnel Blueprint KPIs (page views, tool completions, lead
   submissions, call clicks) into the shared Supabase `website_events` table.
   No cookies, no personal information: a random per-tab session id, the page
   path, referrer, and event name only. Insert-only — the public key cannot
   read anything back. */
(function () {
  'use strict';

  var isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);

  // ---- Google Analytics 4 (gtag) — loads only on the live site ----
  // Property: Caring Companions Website. One place to change the ID.
  if (!isLocal) {
    var GA_ID = 'G-C42SDJGV29';
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  var ENDPOINT = 'https://zngsgedlsxinbygwmxwn.supabase.co/rest/v1/website_events';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ3NnZWRsc3hpbmJ5Z3dteHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDIzNDQsImV4cCI6MjA5ODExODM0NH0.L_31_UKdccyRH9n7p1GaBlZTqcJipB008H-GIvxwLxM';

  function sessionId() {
    try {
      var id = sessionStorage.getItem('cc-session');
      if (!id) {
        id = 's-' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('cc-session', id);
      }
      return id;
    } catch (e) { return 's-anon'; }
  }

  function track(event, props) {
    try {
      // Skip localhost so testing doesn't pollute the numbers.
      if (/^(localhost|127\.)/.test(location.hostname)) return;
      var payload = JSON.stringify({
        session_id: sessionId(),
        event: String(event).slice(0, 64),
        path: location.pathname.slice(0, 300),
        referrer: (document.referrer || '').slice(0, 300),
        props: props || {},
      });
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY },
        body: payload,
      }).catch(function () {});
    } catch (e) { /* analytics must never break the page */ }
  }

  window.CCTrack = track;

  // Page view
  track('page_view');

  // Call clicks — the blueprint's most direct conversion signal
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (a) track('call_click');
  });
})();
