/* Caring Companions: first-party, anonymous analytics.
   Tracks the Funnel Blueprint KPIs (page views, tool completions, lead
   submissions, call clicks) into the shared Supabase `website_events` table.
   No cookies, no personal information: a random per-tab session id, the page
   path, referrer, and event name only. Insert-only, the public key cannot
   read anything back. */
(function () {
  'use strict';

  var isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);

  // ---- Google Analytics 4 (gtag), loads only on the live site ----
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

    // ---- Meta (Facebook) Pixel ----
    var FB_ID = '1376533839963615';
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', FB_ID);
    window.fbq('track', 'PageView');
  }

  // Map our funnel events to Meta standard conversion events (for ad targeting).
  var FB_EVENTS = {
    lead_submitted: 'Lead',
    book_click: 'Schedule',
    apply_click: 'SubmitApplication',
    call_click: 'Contact',
    tool_completed: 'CompleteRegistration',
    cara_chat_used: 'Contact',
    email_signup: 'CompleteRegistration',
  };

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

  // Which channel brought this visit (2026-11-09, her monthly content scorecard). A channel name only, never a
  // person: a tagged link (?from=youtube or ?utm_source=facebook) wins, else the site they came from. Kept for this
  // tab only (sessionStorage), so a form filled in three pages later still counts for the channel that brought them.
  function channelOf(host) {
    host = String(host || '').toLowerCase();
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube';
    if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(host)) return 'facebook';
    if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google';
    if (/(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host)) return 'other_search';
    if (/(^|\.)nextdoor\.com$/.test(host)) return 'nextdoor';
    return host ? 'other_site' : '';
  }
  function cameFrom() {
    try {
      var have = sessionStorage.getItem('cc-from');
      if (have) return have;
      var q = new URLSearchParams(location.search);
      var tag = String(q.get('from') || q.get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
      var ref = '';
      try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      if (ref && ref.replace(/^www\./, '') === location.hostname.replace(/^www\./, '')) ref = '';
      var from = tag || channelOf(ref) || 'direct';
      sessionStorage.setItem('cc-from', from);
      return from;
    } catch (e) { return ''; }
  }

  function track(event, props) {
    try {
      // Skip localhost so testing doesn't pollute the numbers.
      if (/^(localhost|127\.)/.test(location.hostname)) return;
      var all = {};
      for (var k in (props || {})) all[k] = props[k];
      var from = cameFrom();
      if (from && !all.from) all.from = from;
      var payload = JSON.stringify({
        session_id: sessionId(),
        event: String(event).slice(0, 64),
        path: location.pathname.slice(0, 300),
        referrer: (document.referrer || '').slice(0, 300),
        props: all,
      });
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY },
        body: payload,
      }).catch(function () {});

      // Mirror key actions to Google Analytics and the Meta Pixel as conversions.
      // 2026-11-09 (her OK): Google gets only which tool and which channel, never answers about a person (care level,
      // urgent, home safety score). Our own counter above keeps the full details; Meta gets the event name only.
      var safe = {};
      if (props && props.tool) safe.tool = String(props.tool).slice(0, 40);
      if (all.from) safe.from = all.from;
      if (window.gtag) gtag('event', event, safe);
      if (window.fbq && FB_EVENTS[event]) fbq('track', FB_EVENTS[event]);
    } catch (e) { /* analytics must never break the page */ }
  }

  window.CCTrack = track;

  // Page view
  track('page_view');

  // Call clicks, the blueprint's most direct conversion signal
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (a) track('call_click');
    // Clicks that send a family to our sister site, caringcds.com (2026-11-10, her OK on the SEO roadmap).
    var c = e.target && e.target.closest ? e.target.closest('a[href*="caringcds.com"]') : null;
    if (c) track('cds_click');
  });
})();
