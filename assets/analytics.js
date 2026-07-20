/* Caring Companions — analytics. Paste your GA4 Measurement ID below to
   turn on tracking site-wide. Dormant (does nothing) until you do. */
(function () {
  var GA4_ID = 'G-XXXXXXXXXX'; // <-- replace with your GA4 ID (e.g. G-ABC123XYZ)
  if (!GA4_ID || GA4_ID.indexOf('XXXX') !== -1) return; // not configured yet
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA4_ID);
})();
