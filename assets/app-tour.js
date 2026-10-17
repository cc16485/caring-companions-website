// Caring Companions: a step-by-step look at the REAL booking app (family.mo-care.com), screen by screen.
// Samantha 2026-10-17: "fix the fake screen look on our website, use real look". These are real screens from the live
// app, taken with sample information (Dorothy, Linda, Grace and Maria are not real people). Nothing is booked from here.
// Opens from any element with [data-app-tour]. Replaces the old imitation preview (app-preview.js).
(function () {
  'use strict';
  var SCREENS = [
    { img: '1-home', t: 'Your home screen', d: 'Sign in with the email we have on file. Tap Request a visit.' },
    { img: '2-day', t: 'Pick a day', d: 'Any day of the week, 7 AM to 6 PM, at least 2 hours ahead and up to 60 days out. Use it on its own, or on top of a regular schedule.' },
    { img: '3-time', t: 'Pick the time', d: 'A set time, or a flexible window when the caregiver picks the start. 2 hours or more.' },
    { img: '4-help', t: 'What would help', d: 'Pick what you’d like help with, and add a note for the caregiver.' },
    { img: '5-who', t: 'Who you’d like', d: 'Ask for a caregiver who knows your loved one first, or whoever is available.' },
    { img: '6-review', t: 'Check and send', d: 'See the estimated cost before you send. It’s a request until a caregiver accepts.' },
    { img: '7-sent', t: 'Request sent', d: 'We ask our caregivers and let you know who’s coming, or if no one is free.' }
  ];
  var BASE = '/assets/app-real/', CSS = '' +
    '.at-back{position:fixed;inset:0;background:rgba(13,54,95,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.at-box{background:#faf9f6;border-radius:22px;max-width:760px;width:100%;max-height:calc(100vh - 32px);overflow:auto;padding:22px;display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:center;position:relative;font-family:inherit}' +
    '.at-phone{width:240px;border:9px solid #0D365F;border-radius:34px;overflow:hidden;box-shadow:0 18px 40px rgba(13,54,95,.25);background:#faf9f6;line-height:0}' +
    '.at-phone img{width:100%;height:auto;display:block}' +
    '.at-k{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9C6410;margin:0 0 6px}' +
    '.at-t{font-family:"Source Serif 4",Georgia,serif;font-size:28px;color:#0D365F;margin:0 0 10px;line-height:1.15}' +
    '.at-d{font-size:17px;line-height:1.6;color:#33475b;margin:0 0 18px}' +
    '.at-dots{display:flex;gap:6px;margin:0 0 18px}.at-dots span{width:9px;height:9px;border-radius:9px;background:#d8dee4}.at-dots span.on{background:#1F7A8C;width:22px}' +
    '.at-nav{display:flex;gap:10px;flex-wrap:wrap}.at-nav button{font:inherit;font-weight:700;font-size:15px;border-radius:12px;padding:11px 20px;cursor:pointer;border:1.5px solid #1F7A8C}' +
    '.at-prev{background:#fff;color:#0D365F}.at-next{background:#1F7A8C;color:#fff}.at-nav button:disabled{opacity:.4;cursor:default}' +
    '.at-x{position:absolute;top:10px;right:12px;background:none;border:0;font-size:26px;line-height:1;color:#55677a;cursor:pointer;padding:6px}' +
    '.at-foot{font-size:13px;color:#6b7a89;margin:16px 0 0}' +
    '@media (max-width:640px){.at-box{grid-template-columns:1fr;justify-items:center;text-align:center;padding:18px}.at-phone{width:200px}.at-dots,.at-nav{justify-content:center}.at-t{font-size:23px}}';
  var styled = false, back = null, i = 0, last = null;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function show() {
    var s = SCREENS[i], box = back.querySelector('.at-box')
    box.querySelector('img').src = BASE + s.img + '.webp'
    box.querySelector('img').alt = 'The Caring Companions app: ' + s.t
    box.querySelector('.at-k').textContent = 'Step ' + (i + 1) + ' of ' + SCREENS.length
    box.querySelector('.at-t').textContent = s.t
    box.querySelector('.at-d').textContent = s.d
    box.querySelectorAll('.at-dots span').forEach(function (d, n) { d.className = n === i ? 'on' : '' })
    box.querySelector('.at-prev').disabled = i === 0
    box.querySelector('.at-next').textContent = i === SCREENS.length - 1 ? 'Done' : 'Next'
  }
  function close() { if (!back) return; back.remove(); back = null; document.removeEventListener('keydown', key); if (last) last.focus() }
  function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && i < SCREENS.length - 1) { i++; show() } else if (e.key === 'ArrowLeft' && i > 0) { i--; show() } }
  function open(e) {
    if (e) e.preventDefault()
    if (!styled) { document.head.appendChild(el('style', null, CSS)); styled = true }
    last = document.activeElement; i = 0
    back = el('div', 'at-back'); back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'How booking works in the Caring Companions app')
    back.innerHTML = '<div class="at-box"><button type="button" class="at-x" aria-label="Close">&times;</button>' +
      '<div class="at-phone"><img src="" alt=""></div><div><p class="at-k"></p><h2 class="at-t"></h2><p class="at-d"></p>' +
      '<div class="at-dots" aria-hidden="true">' + SCREENS.map(function () { return '<span></span>' }).join('') + '</div>' +
      '<div class="at-nav"><button type="button" class="at-prev">Back</button><button type="button" class="at-next">Next</button></div>' +
      '<p class="at-foot">Real screens from the Caring Companions app, shown with sample information. App visits are requests and depend on which caregivers are free.</p></div></div>'
    document.body.appendChild(back)
    back.addEventListener('click', function (ev) { if (ev.target === back) close() })
    back.querySelector('.at-x').onclick = close
    back.querySelector('.at-prev').onclick = function () { if (i > 0) { i--; show() } }
    back.querySelector('.at-next').onclick = function () { if (i < SCREENS.length - 1) { i++; show() } else close() }
    document.addEventListener('keydown', key)
    SCREENS.forEach(function (s) { var im = new Image(); im.src = BASE + s.img + '.webp' })
    show(); back.querySelector('.at-next').focus()
  }
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-app-tour]'); if (t) open(e) })
  window.CCAppTour = { open: open }
})();
