#!/usr/bin/env python3
"""Builds early-support-visits.html from free-assessment.html (same header, footer, form card look).
Early Support Visits by Caring Companions (Samantha 2026-11-12): 4-hour visits once a month, every other week or
every week; $152 / $140 / $132 a visit; $99 one-time start fee; Springfield, Nixa, Ozark and Republic.
Run from the repo root: python3 tools/build-early-support-page.py"""
import re, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = open(os.path.join(ROOT, 'free-assessment.html'), encoding='utf-8').read()

TITLE = 'Early Support Visits | Caring Companions'
DESC = 'A little help around the house and good company, on a day you pick. Four-hour visits once a month, every other week or every week in Springfield, Nixa, Ozark and Republic.'
URL = 'https://mo-care.com/early-support-visits'

def sub1(pat, rep, s, flags=0):
    out, n = re.subn(pat, lambda m: rep, s, count=1, flags=flags)
    assert n == 1, pat
    return out

s = src
s = sub1(r'<title>.*?</title>', f'<title>{TITLE}</title>', s)
s = sub1(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{DESC}">', s)
s = sub1(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{URL}">', s)
s = sub1(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{TITLE}">', s)
s = sub1(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{DESC}">', s)
s = sub1(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{URL}">', s)

CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.6 2.6L16.5 9"/></svg>'

CSS = '''<style>
/* Early Support Visits page (2026-11-12). Sections under the top form reuse the page shell; .esv-* is only used here. */
.esv-name { font-family: var(--sans); font-size: 15px; font-weight: 700; letter-spacing: .04em; color: var(--muted); margin: 0 0 18px; }
.esv-sec { max-width: 1160px; margin: 0 auto; padding: 56px 24px; }
.esv-sec h2 { font-family: var(--serif); font-size: clamp(28px, 3.2vw, 36px); line-height: 1.15; color: var(--brand-blue); margin: 0 0 14px; font-weight: 600; }
.esv-sec p { font-size: max(18px, var(--fs-read, 0px)); line-height: 1.6; color: var(--ink); margin: 0 0 16px; max-width: 720px; }
.esv-band { background: #f6f5f0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.esv-two { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.esv-two img { width: 100%; height: auto; display: block; border-radius: 40px 10px 40px 10px; box-shadow: 0 18px 40px rgba(14,56,96,.16); aspect-ratio: 4 / 3; object-fit: cover; }
.esv-list { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 10px; }
.esv-list li { display: flex; gap: 12px; align-items: flex-start; font-size: max(18px, var(--fs-read, 0px)); line-height: 1.45; color: var(--ink); }
.esv-list svg { flex: 0 0 24px; width: 24px; height: 24px; color: var(--cta); margin-top: 2px; }
.esv-prices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 22px 0 18px; }
.esv-price { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 20px; text-align: center; box-shadow: 0 8px 22px rgba(14,56,96,.07); }
.esv-price .how { font-size: 16px; font-weight: 700; color: var(--brand-blue); margin: 0 0 6px; max-width: none; }
.esv-price .amt { font-family: var(--serif); font-size: 42px; line-height: 1; color: var(--brand-blue); margin: 0 0 6px; max-width: none; }
.esv-price .per { font-size: 15.5px; color: var(--muted); margin: 0; max-width: none; }
.esv-note { font-size: 16.5px !important; color: var(--muted) !important; }
.esv-story { border-left: 4px solid #FFC671; padding: 6px 0 6px 22px; }
.esv-story p { font-family: var(--serif); font-size: 21px; line-height: 1.5; color: var(--brand-blue); }
.esv-story cite { display: block; font-style: normal; font-family: var(--sans); font-size: 16px; color: var(--muted); }
.esv-fit { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 8px; }
.esv-fit > div { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.esv-fit h3 { font-family: var(--serif); font-size: 22px; color: var(--brand-blue); margin: 0 0 12px; }
.esv-q { border-bottom: 1px solid var(--border); padding: 4px 0; max-width: 820px; }
.esv-q summary { cursor: pointer; font-size: max(18px, var(--fs-read, 0px)); font-weight: 700; color: var(--brand-blue); padding: 14px 0; }
.esv-q p { margin: 0 0 16px; }
.esv-cta { text-align: center; }
.esv-cta p { margin-left: auto; margin-right: auto; }
.esv-btn { display: inline-block; background: var(--cta); color: #fff; font-weight: 700; font-size: 18px; padding: 15px 26px; border-radius: 12px; text-decoration: none; margin: 6px 6px 0; }
.esv-btn.alt { background: var(--brand-blue); }
.esv-btn:hover { color: #fff; text-decoration: none; opacity: .92; }
@media (max-width: 900px) {
  .esv-sec { padding: 40px 16px; }
  .esv-two, .esv-fit { grid-template-columns: 1fr; gap: 24px; }
  .esv-prices { grid-template-columns: 1fr; }
  .fa-wrap .fa-lead { display: block; font-size: 18px; margin-bottom: 18px; }
}
</style>

'''

MAIN = f'''<main>
<section class="fa-wrap">
<div class="fa-intro">
<p class="fa-kick">New from Caring Companions</p>
<h1>A little help around the house. A little good company.</h1>
<p class="esv-name">EARLY SUPPORT VISITS BY CARING COMPANIONS</p>
<p class="fa-lead">For people who are doing well and want to keep it that way. One of our caregivers comes for four hours on a day you pick, and you decide what would help most.</p>
<ul class="fa-facts">
<li>{CHECK}<span><b>Once a month, every other week, or every week.</b> You choose.</span></li>
<li>{CHECK}<span><b>From $132 a visit.</b> No long-term contract.</span></li>
<li>{CHECK}<span><b>A familiar face to count on.</b> We tell you who is coming.</span></li>
</ul>
<p class="fa-proof"><span><span class="st" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 4.9 on Google</span><span>Locally owned since 2017</span></p>
</div>

<div class="fa-card" id="faCard">
<form id="faForm" novalidate>
<h2>See if it&rsquo;s a fit</h2>
<p class="fa-sub">Takes about a minute. We&rsquo;ll call you.</p>
<div class="fa-row">
<label class="fa-f"><span>First name</span><input id="faFirst" autocomplete="given-name"></label>
<label class="fa-f"><span>Last name</span><input id="faLast" autocomplete="family-name"></label>
</div>
<label class="fa-f"><span>Phone</span><input id="faPhone" type="tel" autocomplete="tel" inputmode="tel"></label>
<label class="fa-f"><span>Email <span class="fa-opt">(optional)</span></span><input id="faEmail" type="email" autocomplete="email"></label>
<div class="fa-f"><span id="faWhoL">Who are the visits for?</span><div class="fa-chips" role="group" aria-labelledby="faWhoL" data-pick="who"><button type="button" aria-pressed="false">Myself</button><button type="button" aria-pressed="false">My parent</button><button type="button" aria-pressed="false">My spouse</button><button type="button" aria-pressed="false">Someone else</button></div></div>
<div class="fa-f"><span id="faTownL">Which town?</span><div class="fa-chips" role="group" aria-labelledby="faTownL" data-pick="town"><button type="button" aria-pressed="false">Springfield</button><button type="button" aria-pressed="false">Nixa</button><button type="button" aria-pressed="false">Ozark</button><button type="button" aria-pressed="false">Republic</button><button type="button" aria-pressed="false">Somewhere else</button></div></div>
<div class="fa-f"><span id="faOftenL">How often sounds right?</span><div class="fa-chips" role="group" aria-labelledby="faOftenL" data-pick="often"><button type="button" aria-pressed="false">Once a month</button><button type="button" aria-pressed="false">Every other week</button><button type="button" aria-pressed="false">Every week</button><button type="button" aria-pressed="false">Not sure yet</button></div></div>
<label class="fa-f"><span>Anything we should know? <span class="fa-opt">(optional)</span></span><textarea id="faNote"></textarea></label>
<label class="fa-consent"><input type="checkbox" id="faTexts"><span>By checking this box, I agree to receive text messages from Caring Companions In-Home Senior Care at the number above about my questions and care, including assessment reminders and care updates. Message frequency varies. Message and data rates may apply. Reply STOP to stop, HELP for help. Agreeing is not required to receive care. See our <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
<p class="fa-err" id="faErr" role="alert"></p>
<button type="submit" class="fa-go" id="faSend">Ask about Early Support Visits</button>
<p class="fa-after">We&rsquo;ll call you to answer your questions.</p>
</form>
<div class="fa-done" tabindex="-1" id="faDone">
<h2>Thank you. We&rsquo;ll call you soon.</h2>
<p>Someone from our Springfield office will call to answer your questions about Early Support Visits, usually the same business day. If you reached us after hours or on a weekend, we&rsquo;ll call the next business day.</p>
<p>Rather talk now?</p>
<a class="fa-call" href="tel:14172348494">Call (417) 234-8494</a>
</div>
</div>
</section>

<div class="esv-band">
<section class="esv-sec esv-two" id="a-visit">
<div>
<h2>What a visit looks like</h2>
<p>Fresh sheets on the bed. A pot of soup on the stove. A trip to the store. And someone good to talk to while it all gets done.</p>
<ul class="esv-list">
<li>{CHECK}<span>Dishes, the kitchen and the counters</span></li>
<li>{CHECK}<span>Sweeping, vacuuming and mopping</span></li>
<li>{CHECK}<span>Freshening up the bathroom</span></li>
<li>{CHECK}<span>Laundry and changing the bed</span></li>
<li>{CHECK}<span>Tidying and a little organizing</span></li>
<li>{CHECK}<span>Making a meal, with extra for later</span></li>
<li>{CHECK}<span>An errand or a ride</span></li>
</ul>
<p>Each visit is four hours. You pick what matters most that day.</p>
</div>
<img src="/assets/photos/scene-kitchen-coffee.webp" alt="A caregiver and an older woman sharing coffee at a kitchen table" width="1080" height="608" loading="lazy" decoding="async">
</section>
</div>

<section class="esv-sec" id="cost">
<h2>How often, and what it costs</h2>
<p>Your visit is on the same day and time each time, so you can plan on it.</p>
<div class="esv-prices">
<div class="esv-price"><p class="how">Once a month</p><p class="amt">$152</p><p class="per">each 4-hour visit</p></div>
<div class="esv-price"><p class="how">Every other week</p><p class="amt">$140</p><p class="per">each 4-hour visit</p></div>
<div class="esv-price"><p class="how">Every week</p><p class="amt">$132</p><p class="per">each 4-hour visit</p></div>
</div>
<p>A one-time $99 start fee covers your first home visit, where we get to know you and write down how you like things done.</p>
<p class="esv-note">Early Support Visits are private pay and are offered in Springfield, Nixa, Ozark and Republic.</p>
</section>

<div class="esv-band">
<section class="esv-sec" id="why">
<h2>Why we started it</h2>
<div class="esv-story">
<p>For years, people have told us the same thing: &ldquo;I don&rsquo;t need much. I&rsquo;d just like a hand now and then.&rdquo; We never had a good answer for them. Now we do.</p>
<cite>Samantha, owner of Caring Companions</cite>
</div>
</section>
</div>

<section class="esv-sec esv-two" id="good-to-know">
<div>
<h2>Good to know</h2>
<ul class="esv-list">
<li>{CHECK}<span>Need to move a visit? Give us a day&rsquo;s notice.</span></li>
<li>{CHECK}<span>We do our best to send someone you know, and we tell you who is coming.</span></li>
<li>{CHECK}<span>Every caregiver works for Caring Companions and has passed our background checks.</span></li>
<li>{CHECK}<span>We help you keep a comfortable home. For a big deep-clean, we are glad to suggest a cleaning company.</span></li>
<li>{CHECK}<span>These visits are not medical care.</span></li>
</ul>
</div>
<div>
<h2>For families</h2>
<p>If your mom or dad would like, we send you a short note after every visit: what we did, how the day went, and anything we noticed.</p>
<img src="/assets/photos/scene-daughter-text.webp" alt="A woman smiling as she reads a message on her phone" width="1080" height="608" loading="lazy" decoding="async">
</div>
</section>

<div class="esv-band">
<section class="esv-sec" id="which">
<h2>Early Support Visits or regular care?</h2>
<div class="esv-fit">
<div>
<h3>Early Support Visits</h3>
<ul class="esv-list">
<li>{CHECK}<span>You manage your own day.</span></li>
<li>{CHECK}<span>You&rsquo;d enjoy a hand with the house and some good company.</span></li>
<li>{CHECK}<span>A visit now and then is plenty.</span></li>
</ul>
</div>
<div>
<h3>Regular home care</h3>
<ul class="esv-list">
<li>{CHECK}<span>Help with bathing, dressing or getting around.</span></li>
<li>{CHECK}<span>Help most days, or 8 or more hours a week.</span></li>
<li>{CHECK}<span>Three levels of care, from $30 an hour.</span></li>
</ul>
<p><a href="/pricing" style="font-weight:600;color:#1F7A8C">See our care levels and rates &rarr;</a></p>
</div>
</div>
</section>
</div>

<section class="esv-sec" id="questions">
<h2>Questions people ask</h2>
<details class="esv-q"><summary>Do your caregivers really clean?</summary><p>Yes. Kitchens, floors, bathrooms, laundry and the bed. What we don&rsquo;t do is the once-a-year scrub, like carpets, outside windows or the garage. For that, we are glad to suggest a cleaning company.</p></details>
<details class="esv-q"><summary>Will it be the same caregiver each time?</summary><p>We do our best to send someone you know. Sometimes it will be another member of our team, and we always tell you who is coming.</p></details>
<details class="esv-q"><summary>What if I need to move or skip a visit?</summary><p>Give us a day&rsquo;s notice and we will move it at no charge. With less than 24 hours&rsquo; notice, the visit is billed at 2 hours.</p></details>
<details class="esv-q"><summary>Can I take a break?</summary><p>Yes. You can pause your visits for up to 60 days. Just let the office know.</p></details>
<details class="esv-q"><summary>Where do you offer it?</summary><p>Springfield, Nixa, Ozark and Republic.</p></details>
<details class="esv-q"><summary>What if I need more help later?</summary><p>We already know you, so adding regular home care is simple. You are also welcome to stay with Early Support Visits for as long as it fits.</p></details>
</section>

<div class="esv-band">
<section class="esv-sec esv-cta">
<h2>We&rsquo;d be glad to come say hello.</h2>
<p>Tell us a little about yourself, or give us a call.</p>
<a class="esv-btn" href="#faCard">See if it&rsquo;s a fit</a><a class="esv-btn alt" href="tel:14172348494">Call (417) 234-8494</a>
</section>
</div>
</main>
'''

SCRIPT = '''<script>
/* Early Support Visits page (2026-11-12). One short form. The lead note starts with ASKED ABOUT EARLY SUPPORT VISITS
   so the office sees it on the Leads card. No silent failures: a send error shows the office number. */
(function () {
  'use strict';
  var card = document.getElementById('faCard'), form = document.getElementById('faForm');
  var err = document.getElementById('faErr'), send = document.getElementById('faSend');
  var LABEL = 'Ask about Early Support Visits';
  var pick = { who: '', town: '', often: '' };
  form.querySelectorAll('[data-pick]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var on = b.getAttribute('aria-pressed') !== 'true';
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      pick[g.getAttribute('data-pick')] = on ? b.textContent : '';
    });
  });
  function val(id) { return document.getElementById(id).value.trim(); }
  function fail(msg, id) { err.innerHTML = msg; err.classList.add('on'); send.disabled = false; send.textContent = LABEL; if (id) document.getElementById(id).focus(); }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.classList.remove('on');
    if (!val('faFirst')) return fail('Please add your first name.', 'faFirst');
    if (!val('faLast')) return fail('Please add your last name.', 'faLast');
    if (val('faPhone').replace(/\\D/g, '').replace(/^1/, '').length !== 10) return fail('Please add a 10 digit phone number so we can call you.', 'faPhone');
    if (!pick.town) return fail('Please pick the town where the visits would be.');
    if (!window.CCForms) return fail('This did not go through. Please call us at <a href="tel:14172348494">(417) 234-8494</a>.');
    send.disabled = true; send.textContent = 'Sending...';
    var texts = document.getElementById('faTexts').checked;
    var msg = 'ASKED ABOUT EARLY SUPPORT VISITS. Asked from the Early Support Visits page. Call to answer questions.' +
      ' Visits are for: ' + (pick.who || 'not given') + '.' +
      ' Town: ' + pick.town + '.' +
      ' How often: ' + (pick.often || 'not given') + '.' +
      (val('faNote') ? ' They wrote: ' + val('faNote') : '') +
      ' Agreed to text messages: ' + (texts ? 'yes' : 'no') + '.';
    window.CCForms.submitLead({ name: val('faFirst') + ' ' + val('faLast'), phone: val('faPhone'), email: val('faEmail'), care_for: pick.who, message: msg })
      .then(function () {
        card.classList.add('sent');
        var d = document.getElementById('faDone'); d.focus({ preventScroll: true });
        var head = document.querySelector('.cc-header'), off = head ? head.getBoundingClientRect().height + 12 : 80;
        window.scrollTo({ top: Math.max(0, card.getBoundingClientRect().top + window.pageYOffset - off), behavior: 'smooth' });
      })
      .catch(function () { fail('Sorry, this did not go through. Please call us at <a href="tel:14172348494">(417) 234-8494</a>, or try again.'); });
  });
})();
</script>'''

a, b = s.index('<main>'), s.index('</main>') + len('</main>')
s = s[:a] + CSS.rstrip('\n') + '\n\n' + MAIN.rstrip('\n') + s[b:]
m = re.search(r'<script src="/assets/forms\.js"></script>\n(<script>.*?</script>)', s, flags=re.S)
assert m and 'Free Assessment page' in m.group(1)
s = s[:m.start(1)] + SCRIPT + s[m.end(1):]
assert '—' not in MAIN and '—' not in SCRIPT and 'free-assessment' not in s[s.index('<main>'):s.index('</main>')]
open(os.path.join(ROOT, 'early-support-visits.html'), 'w', encoding='utf-8').write(s)
print('wrote early-support-visits.html', len(s))
