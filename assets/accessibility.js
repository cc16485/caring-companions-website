/* Caring Companions / HomeTogether — Accessibility widget.
   Self-contained: a floating button opens a panel with "larger text" (page
   zoom, remembered across pages) and "read this page aloud" (browser
   text-to-speech, highlights each line as it reads). No dependencies, no
   backend. Include once per page: <script src="/assets/accessibility.js" defer></script> */
(function () {
  'use strict';
  if (window.__ccA11y) return;
  window.__ccA11y = true;

  var ZKEY = 'cc_a11y_zoom';
  var ZOOMS = [1, 1.15, 1.3, 1.5, 1.75];

  function savedZoom() { var z = parseFloat(localStorage.getItem(ZKEY) || '1'); return isNaN(z) ? 1 : z; }
  function zIndex() { var i = ZOOMS.indexOf(savedZoom()); return i < 0 ? 0 : i; }
  function applyZoom(z) { document.documentElement.style.zoom = (z === 1 ? '' : String(z)); }
  try { if (savedZoom() !== 1) applyZoom(savedZoom()); } catch (e) {}

  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2.3"/><path d="M12 7.2c-2.7 0-4.6.7-7.4 1.1a1 1 0 1 0 .3 2c1.9-.3 3.3-.6 4.6-.8v3l-1.7 6.1a1 1 0 0 0 1.9.6l1.5-5.2h1.6l1.5 5.2a1 1 0 0 0 1.9-.6L15.5 12.5v-3c1.3.2 2.7.5 4.6.8a1 1 0 1 0 .3-2C16.6 7.9 14.7 7.2 12 7.2z"/></svg>';

  function css() {
    return '.a11y-btn{position:fixed;left:18px;bottom:18px;z-index:2147483600;width:54px;height:54px;border-radius:50%;background:#1F7A8C;border:none;box-shadow:0 6px 20px rgba(16,40,58,.28);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}'
      + '.a11y-btn:hover{background:#155A68}'
      + '.a11y-btn svg{width:30px;height:30px;fill:#fff}'
      + '.a11y-panel{position:fixed;left:18px;bottom:82px;z-index:2147483600;width:262px;max-width:calc(100vw - 36px);background:#fff;border:1px solid #e4e1d8;border-radius:16px;box-shadow:0 16px 44px rgba(16,40,58,.22);padding:16px 16px 14px;font-family:Inter,Helvetica,Arial,sans-serif;display:none}'
      + '.a11y-panel.open{display:block}'
      + '.a11y-panel h3{font-size:14px;font-weight:700;color:#0D365F;margin:0 0 2px}'
      + '.a11y-panel .sub{font-size:11.5px;color:#8a978f;margin:0 0 14px}'
      + '.a11y-row{margin:0 0 14px}'
      + '.a11y-row .lbl{font-size:11px;font-weight:700;color:#55677a;text-transform:uppercase;letter-spacing:.04em;margin:0 0 7px}'
      + '.a11y-sizebtns{display:flex;gap:8px}'
      + '.a11y-sizebtns button{flex:1;border:1.5px solid #dfe6e2;background:#fff;border-radius:9px;padding:10px;font-weight:700;color:#0D365F;cursor:pointer;font-size:15px}'
      + '.a11y-sizebtns button:hover{border-color:#1F7A8C}'
      + '.a11y-zlabel{font-size:12px;color:#55677a;text-align:center;margin:8px 0 0}'
      + '.a11y-read{width:100%;border:none;border-radius:9px;padding:12px;background:#1F7A8C;color:#fff;font-weight:600;font-size:14px;cursor:pointer}'
      + '.a11y-read:hover{background:#155A68}'
      + '.a11y-read.reading{background:#C17A12}'
      + '.a11y-close{position:absolute;top:9px;right:12px;background:none;border:none;font-size:20px;color:#8a978f;cursor:pointer;line-height:1;padding:2px}'
      + '.a11y-reading-hl{background:#fff3bf!important;box-shadow:0 0 0 4px #fff3bf;border-radius:4px}';
  }

  var readBtn, panel, reading = false, queue = [], qi = 0;

  function collect() {
    var out = [], nodes = document.body.querySelectorAll('h1,h2,h3,h4,p,li,summary,blockquote,figcaption');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest('.a11y-panel,.a11y-btn,header,footer,nav,.cc-header,.cc-siteftr,.cara-widget,#cara-root,script,style,noscript')) continue;
      var t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length < 2) continue;
      if (el.offsetParent === null) continue;
      // skip a container whose text is already covered by a child we'll read
      if (el.querySelector('h1,h2,h3,h4,p,li')) continue;
      out.push(el);
    }
    return out;
  }
  function updateReadBtn() {
    if (!readBtn) return;
    readBtn.innerHTML = reading ? '&#9632;&nbsp; Stop reading' : '&#128266;&nbsp; Read this page aloud';
    readBtn.classList.toggle('reading', reading);
  }
  function speakNext() {
    if (!reading) return;
    if (qi >= queue.length) { stopRead(); return; }
    var el = queue[qi];
    el.classList.add('a11y-reading-hl');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    var u = new SpeechSynthesisUtterance((el.innerText || '').replace(/\s+/g, ' ').trim());
    u.rate = 0.95;
    u.onend = u.onerror = function () { el.classList.remove('a11y-reading-hl'); qi++; speakNext(); };
    window.speechSynthesis.speak(u);
  }
  function startRead() {
    if (!('speechSynthesis' in window)) return;
    reading = true; qi = 0; queue = collect();
    window.speechSynthesis.cancel();
    updateReadBtn(); speakNext();
  }
  function stopRead() {
    reading = false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var hls = document.querySelectorAll('.a11y-reading-hl');
    for (var i = 0; i < hls.length; i++) hls[i].classList.remove('a11y-reading-hl');
    updateReadBtn();
  }
  function zLabel() { var el = document.getElementById('a11y-zlabel'); if (el) el.textContent = 'Text size: ' + Math.round(ZOOMS[zIndex()] * 100) + '%'; }
  function bump(dir) {
    var i = Math.max(0, Math.min(ZOOMS.length - 1, zIndex() + dir)), z = ZOOMS[i];
    applyZoom(z); try { localStorage.setItem(ZKEY, String(z)); } catch (e) {}
    zLabel();
  }

  function build() {
    var st = document.createElement('style'); st.textContent = css(); document.head.appendChild(st);

    var btn = document.createElement('button');
    btn.className = 'a11y-btn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Accessibility options: larger text and read aloud');
    btn.innerHTML = ICON;
    document.body.appendChild(btn);

    var hasTTS = ('speechSynthesis' in window);
    panel = document.createElement('div');
    panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Accessibility options');
    panel.innerHTML =
      '<button class="a11y-close" type="button" aria-label="Close">&times;</button>'
      + '<h3>Accessibility</h3><p class="sub">Make this page easier to use.</p>'
      + '<div class="a11y-row"><p class="lbl">Text size</p><div class="a11y-sizebtns">'
      + '<button type="button" id="a11y-smaller" aria-label="Smaller text">A&minus;</button>'
      + '<button type="button" id="a11y-larger" aria-label="Larger text">A+</button></div>'
      + '<p class="a11y-zlabel" id="a11y-zlabel"></p></div>'
      + (hasTTS ? '<div class="a11y-row" style="margin-bottom:0"><p class="lbl">Read aloud</p><button type="button" class="a11y-read" id="a11y-read"></button></div>' : '');
    document.body.appendChild(panel);

    readBtn = document.getElementById('a11y-read');
    zLabel(); updateReadBtn();

    function toggle(open) { panel.classList.toggle('open', open); }
    btn.addEventListener('click', function () { toggle(!panel.classList.contains('open')); });
    panel.querySelector('.a11y-close').addEventListener('click', function () { toggle(false); });
    document.getElementById('a11y-larger').addEventListener('click', function () { bump(1); });
    document.getElementById('a11y-smaller').addEventListener('click', function () { bump(-1); });
    if (readBtn) readBtn.addEventListener('click', function () { reading ? stopRead() : startRead(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); if (reading) stopRead(); } });
    window.addEventListener('pagehide', function () { try { window.speechSynthesis.cancel(); } catch (e) {} });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
