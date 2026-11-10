/* Caring Companions: "Who needs care?" request-a-call steps (11-10). Needs assets/forms.js first.
   Sends a website lead to the Hub (lead-intake) with every answer in the note; shows a clear
   error with the office number if sending fails (no silent failures). */
(function () {
  'use strict';
  var hero = document.getElementById('who-needs-care');
  var ask = document.getElementById('nhAsk');
  var steps = ask.querySelectorAll('.nh-step');
  var quotes = hero.querySelectorAll('.nh-quote');
  var bar = document.getElementById('nhBar'), stepNo = document.getElementById('nhStepNo'), back = document.getElementById('nhBack');
  var data = { who: '', help: [], when: '', where: '', time: '' };
  var trail = [1];

  function cur() { return trail[trail.length - 1]; }

  function show(n) {
    var key = String(n), done = key === 'done';
    steps.forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-step') === key); });
    quotes.forEach(function (q) { q.classList.toggle('on', q.getAttribute('data-for').split(' ').indexOf(key) > -1); });
    hero.classList.toggle('nh-focus', key !== '1');
    bar.style.width = done ? '100%' : (Number(n) * 20) + '%';
    stepNo.textContent = done ? 'All done' : 'Step ' + n + ' of 5';
    back.hidden = key === '1' || done;
    if (key === '1') return;
    // Each step opens at the top of the screen, just under the menu bar.
    var head = document.querySelector('.cc-header');
    var off = head ? head.getBoundingClientRect().height + 12 : 80;
    var top = ask.getBoundingClientRect().top + window.pageYOffset - off;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    var focusEl = done ? document.getElementById('nhDone') : ask.querySelector('.nh-step.on h2');
    if (focusEl) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
  }
  function go(n) { trail.push(n); show(n); }

  back.addEventListener('click', function () { if (trail.length > 1) trail.pop(); show(cur()); });

  ask.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-who')) { data.who = b.getAttribute('data-who'); go(2); return; }
    if (b.hasAttribute('data-help')) {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      data.help = Array.prototype.map.call(ask.querySelectorAll('[data-help][aria-pressed="true"]'), function (x) { return x.getAttribute('data-help'); });
      return;
    }
    if (b.hasAttribute('data-when')) { data.when = b.getAttribute('data-when'); go(4); return; }
    if (b.hasAttribute('data-time')) {
      ask.querySelectorAll('[data-time]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      data.time = b.getAttribute('data-time'); return;
    }
    if (b.hasAttribute('data-go')) { go(Number(b.getAttribute('data-go'))); return; }
  });

  var where = document.getElementById('nhWhere'), err4 = document.getElementById('nhErr4');
  function toFive() {
    data.where = where.value.trim();
    if (!data.where) { err4.textContent = 'Please add a ZIP code or town.'; err4.classList.add('on'); where.focus(); return; }
    err4.classList.remove('on'); go(5);
  }
  document.getElementById('nhGo5').addEventListener('click', toFive);
  where.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); toFive(); } });

  var err = document.getElementById('nhErr'), send = document.getElementById('nhSend');
  function fail(msg, el) { err.innerHTML = msg; err.classList.add('on'); send.disabled = false; send.textContent = 'Request my call'; if (el) el.focus(); }

  send.addEventListener('click', function () {
    err.classList.remove('on');
    var first = document.getElementById('nhFirst'), last = document.getElementById('nhLast'), phone = document.getElementById('nhPhone');
    var email = document.getElementById('nhEmail').value.trim();
    var texts = document.getElementById('nhTexts').checked;
    if (!first.value.trim()) return fail('Please add your first name.', first);
    if (!last.value.trim()) return fail('Please add your last name.', last);
    if (phone.value.replace(/\D/g, '').replace(/^1/, '').length !== 10) return fail('Please add a 10 digit phone number so we can call you.', phone);
    if (!window.CCForms) return fail('This did not go through. Please call us at <a href="tel:14172348494">(417) 234-8494</a>.');
    send.disabled = true; send.textContent = 'Sending...';
    var page = ask.getAttribute('data-page') || 'the website';
    var msg = 'Asked for a call from ' + page + '.' +
      ' Care is for: ' + (data.who || 'not given') + '.' +
      ' Help wanted: ' + (data.help.length ? data.help.join(', ') : 'not given') + '.' +
      ' Start: ' + (data.when || 'not given') + '.' +
      ' Where: ' + (data.where || 'not given') + '.' +
      ' Best time to call: ' + (data.time || 'any time') + '.' +
      ' Agreed to text messages: ' + (texts ? 'yes' : 'no') + '.';
    window.CCForms.submitLead({ name: first.value.trim() + ' ' + last.value.trim(), phone: phone.value.trim(), email: email, care_for: data.who, message: msg })
      .then(function () { go('done'); })
      .catch(function () { fail('Sorry, this did not go through. Please call us at <a href="tel:14172348494">(417) 234-8494</a>, or try again.'); });
  });
})();
