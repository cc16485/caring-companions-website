/* Caring Companions / HomeTogether: Accessibility widget.
   Larger text (page zoom, remembered across pages) + "read this page aloud."
   Read-aloud uses Samantha's ElevenLabs voice via the elevenlabs-tts function
   (cached server-side); if that's unavailable it silently falls back to the
   browser's own voice so it never goes quiet. No dependencies, no picker. */
(function () {
  'use strict';
  if (window.__ccA11y) return;
  window.__ccA11y = true;

  var ZKEY = 'cc_a11y_zoom';
  var ZOOMS = [1, 1.15, 1.3, 1.5, 1.75];
  var TTS_ENDPOINT = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/elevenlabs-tts';
  var UNLOCK = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  var PREF = ['google us english', 'samantha', 'ava', 'allison', 'aria', 'jenny', 'zira', 'microsoft', 'daniel', 'karen', 'moira', 'alex'];

  function savedZoom() { var z = parseFloat(localStorage.getItem(ZKEY) || '1'); return isNaN(z) ? 1 : z; }
  function zIndex() { var i = ZOOMS.indexOf(savedZoom()); return i < 0 ? 0 : i; }
  function applyZoom(z) { document.documentElement.style.zoom = (z === 1 ? '' : String(z)); }
  try { if (savedZoom() !== 1) applyZoom(savedZoom()); } catch (e) {}

  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2.3"/><path d="M12 7.2c-2.7 0-4.6.7-7.4 1.1a1 1 0 1 0 .3 2c1.9-.3 3.3-.6 4.6-.8v3l-1.7 6.1a1 1 0 0 0 1.9.6l1.5-5.2h1.6l1.5 5.2a1 1 0 0 0 1.9-.6L15.5 12.5v-3c1.3.2 2.7.5 4.6.8a1 1 0 1 0 .3-2C16.6 7.9 14.7 7.2 12 7.2z"/></svg>';

  function css() {
    return '.a11y-btn{position:fixed;left:18px;bottom:18px;z-index:2147483600;width:54px;height:54px;border-radius:50%;background:#1F7A8C;border:none;box-shadow:0 6px 20px rgba(16,40,58,.28);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      + '.a11y-btn:hover{background:#155A68}.a11y-btn svg{width:30px;height:30px;fill:#fff}'
      + '.a11y-panel{position:fixed;left:18px;bottom:82px;z-index:2147483600;width:250px;max-width:calc(100vw - 36px);background:#fff;border:1px solid #e4e1d8;border-radius:16px;box-shadow:0 16px 44px rgba(16,40,58,.22);padding:16px 16px 14px;font-family:Inter,Helvetica,Arial,sans-serif;display:none}'
      + '.a11y-panel.open{display:block}'
      + '.a11y-panel h3{font-size:14px;font-weight:700;color:#0D365F;margin:0 0 2px}'
      + '.a11y-panel .sub{font-size:11.5px;color:#8a978f;margin:0 0 14px}'
      + '.a11y-row{margin:0 0 14px}.a11y-row:last-child{margin-bottom:0}'
      + '.a11y-row .lbl{font-size:11px;font-weight:700;color:#55677a;text-transform:uppercase;letter-spacing:.04em;margin:0 0 7px}'
      + '.a11y-sizebtns{display:flex;gap:8px}'
      + '.a11y-sizebtns button{flex:1;border:1.5px solid #dfe6e2;background:#fff;border-radius:9px;padding:10px;font-weight:700;color:#0D365F;cursor:pointer;font-size:15px}'
      + '.a11y-sizebtns button:hover{border-color:#1F7A8C}'
      + '.a11y-zlabel{font-size:12px;color:#55677a;text-align:center;margin:8px 0 0}'
      + '.a11y-read{width:100%;border:none;border-radius:9px;padding:12px;background:#1F7A8C;color:#fff;font-weight:600;font-size:14px;cursor:pointer}'
      + '.a11y-read:hover{background:#155A68}.a11y-read.reading{background:#A88400}'
      + '.a11y-close{position:absolute;top:9px;right:12px;background:none;border:none;font-size:20px;color:#8a978f;cursor:pointer;line-height:1;padding:2px}'
      + '.a11y-reading-hl{background:#fff3bf!important;box-shadow:0 0 0 4px #fff3bf;border-radius:4px}'
      // Phone action bar: Call + Book pinned to the bottom, replacing the floating circles
      + '.cc-bar{display:none}'
      + '@media (max-width:719px){'
      + 'body.cc-has-bar{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))}'
      + '.cc-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483500;display:flex;gap:8px;align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#0D365F;box-shadow:0 -4px 18px rgba(16,40,58,.22)}'
      + '.cc-bar a{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;min-height:50px;border-radius:10px;font:700 15.5px/1.2 Inter,Helvetica,Arial,sans-serif;text-decoration:none;text-align:center}'
      + '.cc-bar a svg{width:18px;height:18px;fill:currentColor;flex-shrink:0}'
      + '.cc-bar-call{background:#1F7A8C;color:#fff}.cc-bar-book{background:#fff;color:#0D365F}'
      + '.cc-bar-a11y{flex:0 0 50px;height:50px;border-radius:10px;border:1.5px solid rgba(255,255,255,.4);background:transparent;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}'
      + '.cc-bar-a11y svg{width:28px;height:28px;fill:#fff}'
      + '.cc-bar a:focus-visible,.cc-bar-a11y:focus-visible{outline:3px solid #E7C27D;outline-offset:2px}'
      + 'body.cc-has-bar .a11y-btn{display:none}'
      + 'body.cc-has-bar .a11y-panel{left:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px))}'
      + 'body.cc-has-bar #cara-widget-launcher{display:none!important}'
      + '}';
  }

  var readBtn, panel, reading = false, queue = [], qi = 0, keepTimer = null;
  var browserVoice = null, elevenOK = true, audioEl = null;

  function ensureAudio() { if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto'; } return audioEl; }
  function unlockAudio() { // must run inside the click gesture so playback is allowed later
    var a = ensureAudio();
    try { a.src = UNLOCK; var p = a.play(); if (p && p.then) p.then(function () { a.pause(); a.currentTime = 0; }).catch(function () {}); } catch (e) {}
  }
  function pickBrowserVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices(), en = vs.filter(function (v) { return /^en/i.test(v.lang); }), list = en.length ? en : vs;
    for (var p = 0; p < PREF.length && !browserVoice; p++) {
      var m = list.filter(function (v) { return v.name.toLowerCase().indexOf(PREF[p]) !== -1; });
      browserVoice = m.filter(function (v) { return v.localService; })[0] || m[0] || null;
    }
    if (!browserVoice) browserVoice = list.filter(function (v) { return v.localService && /en[-_]US/i.test(v.lang); })[0] || list[0] || null;
  }
  function keepAlive(on) {
    if (on) { if (keepTimer) clearInterval(keepTimer); keepTimer = setInterval(function () { if (!reading) { clearInterval(keepTimer); keepTimer = null; return; } try { if (window.speechSynthesis && speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {} }, 5000); }
    else if (keepTimer) { clearInterval(keepTimer); keepTimer = null; }
  }
  function collect() {
    var out = [], nodes = document.body.querySelectorAll('h1,h2,h3,h4,p,li,summary,blockquote,figcaption');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.a11y-panel,.a11y-btn,header,footer,nav,.cc-header,.cc-siteftr,.cara-widget,#cara-root,script,style,noscript')) continue;
      var t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length < 2 || el.offsetParent === null) continue;
      if (el.querySelector('h1,h2,h3,h4,p,li')) continue;
      out.push(el);
    }
    return out;
  }
  function updateReadBtn() { if (readBtn) { readBtn.innerHTML = reading ? '&#9632;&nbsp; Stop reading' : '&#128266;&nbsp; Read this page aloud'; readBtn.classList.toggle('reading', reading); } }

  function elevenSpeak(text, done) {
    fetch(TTS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        if (!d || !d.url) throw 0;
        var a = ensureAudio();
        a.src = d.url;
        a.onended = function () { if (reading) done(); };
        a.onerror = function () { stopRead(); };
        var p = a.play();
        if (p && p.catch) p.catch(function () { stopRead(); });
      })
      .catch(function () { stopRead(); }); // her voice or silence, never the browser voice
  }
  function speakNext() {
    if (!reading) return;
    if (qi >= queue.length) { stopRead(); return; }
    var el = queue[qi];
    el.classList.add('a11y-reading-hl');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    var text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    var done = function () { el.classList.remove('a11y-reading-hl'); qi++; speakNext(); };
    elevenSpeak(text, done);
  }
  function startRead() {
    queue = collect();
    if (!queue.length) return;
    reading = true; qi = 0;
    updateReadBtn();
    unlockAudio();       // inside the click gesture
    keepAlive(true);
    speakNext();
  }
  function stopRead() {
    reading = false;
    keepAlive(false);
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    if (audioEl) { try { audioEl.pause(); } catch (e) {} }
    var hls = document.querySelectorAll('.a11y-reading-hl');
    for (var i = 0; i < hls.length; i++) hls[i].classList.remove('a11y-reading-hl');
    updateReadBtn();
  }

  function zLabel() { var el = document.getElementById('a11y-zlabel'); if (el) el.textContent = 'Text size: ' + Math.round(ZOOMS[zIndex()] * 100) + '%'; }
  function bump(dir) { var i = Math.max(0, Math.min(ZOOMS.length - 1, zIndex() + dir)), z = ZOOMS[i]; applyZoom(z); try { localStorage.setItem(ZKEY, String(z)); } catch (e) {} zLabel(); }

  // Caring Companions family pages only (they carry the phone utility bar).
  // Applicant pages and the full-screen Cara and questionnaire pages keep the floating button.
  var PHONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.2 2.2z"/></svg>';
  function buildBar(onA11y) {
    if (!document.querySelector('.cc-utility-tel')) return;
    if (/^\/(careers|jobs\/|apply|cara|assessment)/.test(location.pathname)) return;
    // Town pages outside our home counties (.tw-tier) ask for a call or the
    // waitlist first, so the bar offers Call only, the same as on /book.
    var onBook = /^\/book(\.html)?\/?$/.test(location.pathname) || !!document.querySelector('.tw-tier');
    var bar = document.createElement('div');
    bar.className = 'cc-bar';
    bar.innerHTML = '<a class="cc-bar-call" href="tel:14172348494">' + PHONE_SVG + 'Call us</a>'
      + (onBook ? '' : '<a class="cc-bar-book" href="/book">Book a free visit</a>')
      + '<button type="button" class="cc-bar-a11y" aria-label="Accessibility options: larger text and read aloud">' + ICON + '</button>';
    document.body.appendChild(bar);
    document.body.classList.add('cc-has-bar');
    bar.querySelector('.cc-bar-a11y').addEventListener('click', onA11y);
  }

  function build() {
    var st = document.createElement('style'); st.textContent = css(); document.head.appendChild(st);

    var btn = document.createElement('button');
    btn.className = 'a11y-btn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Accessibility options: larger text and read aloud');
    btn.innerHTML = ICON;
    document.body.appendChild(btn);

    var hasTTS = ('speechSynthesis' in window) || true; // ElevenLabs path always available; browser is fallback
    panel = document.createElement('div');
    panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Accessibility options');
    panel.innerHTML =
      '<button class="a11y-close" type="button" aria-label="Close">&times;</button>'
      + '<h3>Accessibility</h3><p class="sub">Make this page easier to use.</p>'
      + '<div class="a11y-row"><p class="lbl">Text size</p><div class="a11y-sizebtns">'
      + '<button type="button" id="a11y-smaller" aria-label="Smaller text">A&minus;</button>'
      + '<button type="button" id="a11y-larger" aria-label="Larger text">A+</button></div>'
      + '<p class="a11y-zlabel" id="a11y-zlabel"></p></div>'
      + '<div class="a11y-row"><p class="lbl">Read aloud</p><button type="button" class="a11y-read" id="a11y-read"></button></div>';
    document.body.appendChild(panel);

    readBtn = document.getElementById('a11y-read');
    zLabel(); updateReadBtn();

    pickBrowserVoice();
    if (('speechSynthesis' in window) && speechSynthesis.getVoices().length === 0) speechSynthesis.addEventListener('voiceschanged', pickBrowserVoice);

    function toggle(open) { panel.classList.toggle('open', open); }
    btn.addEventListener('click', function () { toggle(!panel.classList.contains('open')); });
    buildBar(function () { toggle(!panel.classList.contains('open')); });
    panel.querySelector('.a11y-close').addEventListener('click', function () { toggle(false); });
    document.getElementById('a11y-larger').addEventListener('click', function () { bump(1); });
    document.getElementById('a11y-smaller').addEventListener('click', function () { bump(-1); });
    readBtn.addEventListener('click', function () { reading ? stopRead() : startRead(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); if (reading) stopRead(); } });
    window.addEventListener('pagehide', function () { stopRead(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

/* Header menus (Services, Ways to Pay, Resources, About Us) open on click
   instead of hover, so moving the mouse across the menu bar no longer drops
   a panel over the page. Enter or Space opens, Esc or a click elsewhere
   closes. Phones are untouched: below 861px the menus are already listed
   in full under the burger, and the top links go to their pages. */
(function () {
  'use strict';
  if (window.__ccMenus) return;
  window.__ccMenus = true;
  var desk = window.matchMedia('(min-width: 861px)');

  function init() {
    var groups = [].slice.call(document.querySelectorAll('.cc-nav .cc-nav-group'));
    if (!groups.length) return;
    document.documentElement.classList.add('cc-menus-click');

    function close(g, focus) {
      g.classList.remove('cc-open');
      var top = g.querySelector('.cc-nav-top');
      if (top) { top.setAttribute('aria-expanded', 'false'); if (focus) top.focus(); }
    }
    function closeAll(except) {
      groups.forEach(function (g) { if (g !== except && g.classList.contains('cc-open')) close(g); });
    }

    groups.forEach(function (g, i) {
      var top = g.querySelector('.cc-nav-top');
      var panel = g.querySelector('.cc-dropdown');
      if (!top || !panel) return;
      if (!panel.id) panel.id = 'cc-menu-' + i;
      top.setAttribute('aria-haspopup', 'true');
      top.setAttribute('aria-expanded', 'false');
      top.setAttribute('aria-controls', panel.id);
      top.addEventListener('click', function (e) {
        if (!desk.matches) return;
        e.preventDefault();
        var open = !g.classList.contains('cc-open');
        closeAll(g);
        g.classList.toggle('cc-open', open);
        top.setAttribute('aria-expanded', String(open));
      });
      top.addEventListener('keydown', function (e) {
        if ((e.key === ' ' || e.key === 'Spacebar') && desk.matches) { e.preventDefault(); top.click(); }
      });
      g.addEventListener('focusout', function (e) {
        if (desk.matches && g.classList.contains('cc-open') && e.relatedTarget && !g.contains(e.relatedTarget)) close(g);
      });
    });

    document.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('.cc-nav-group'))) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      groups.forEach(function (g) { if (g.classList.contains('cc-open')) close(g, true); });
    });
    var onChange = function () { closeAll(); };
    if (desk.addEventListener) desk.addEventListener('change', onChange); else if (desk.addListener) desk.addListener(onChange);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
