#!/usr/bin/env python3
"""Builds early-support-visits.html from free-assessment.html (same header, footer, form card look).
Early Support Visits by Caring Companions (Samantha 2026-11-12): 4-hour visits in Springfield only (her decision 2026-11-12 late; it was four towns earlier that day).
$152 once a month, $140 every other week; $99 one-time assessment and setup fee.
Her review of 2026-11-12 (second pass): hero "Doing fine at home? A little help can still make a big difference." (her wording, replacing "Peace of mind starts before there's a problem", which she dropped), a why-start-early section,
family updates near the top, scheduling "we'll work together", housekeeping expectations, the $99 fee is the assessment
and not a visit, no veterans bar, no "free assessment" wording on this page, the story is not signed as her quote.
WEEKLY: she is deciding whether an every-week option ($132) launches. False = two options (my recommendation).
Run from the repo root: python3 tools/build-early-support-page.py"""
import re, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = open(os.path.join(ROOT, 'free-assessment.html'), encoding='utf-8').read()

WEEKLY = False   # her decision pending (2026-11-12)

TITLE = 'Early Support Visits | Caring Companions'
OFTEN = 'once a month, every other week or every week' if WEEKLY else 'once a month or every other week'
DESC = f'Doing fine at home? A little help can still make a big difference. Help around the house and good company, {OFTEN}, in Springfield, Missouri.'
URL = 'https://mo-care.com/early-support-visits'
FROM = '$132' if WEEKLY else '$140'

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
# Top bar: nothing about veterans or the free assessment here; one plain line about this program (her point 9).
s = sub1(r'<div class="cc-utility-inner">.*?</div>', '<div class="cc-utility-inner esv-util"><span>Early Support Visits: now in Springfield</span></div>', s, flags=re.S)
# Footer button: this program has a paid assessment, so it must not say "free assessment" (her point 9).
s = sub1(r'<a class="book" href="#faCard">Request a Free Assessment</a>', '<a class="book" href="#faCard">Ask about Early Support Visits</a>', s)

CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.6 2.6L16.5 9"/></svg>'

CSS = '''<style>
/* Early Support Visits page (2026-11-12). Sections under the top form reuse the page shell; .esv-* is only used here. */
.esv-util { justify-content: center; }
.esv-util span { color: #fff; font-size: 14px; font-weight: 600; padding: 2px 0; }
.esv-prog { font-family: var(--serif); font-size: clamp(24px, 2.6vw, 30px); font-weight: 600; color: var(--cta); margin: 0 0 14px; line-height: 1.15; }
.esv-prog small { display: block; font-family: var(--sans); font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
.esv-tag { font-family: var(--serif); font-size: clamp(20px, 2.1vw, 24px); line-height: 1.4; color: var(--brand-blue); margin: 0 0 16px; }
.esv-sec { max-width: 1160px; margin: 0 auto; padding: 56px 24px; }
.esv-sec h2 { font-family: var(--serif); font-size: clamp(28px, 3.2vw, 36px); line-height: 1.15; color: var(--brand-blue); margin: 0 0 14px; font-weight: 600; }
.esv-sec h3 { font-family: var(--serif); font-size: 22px; color: var(--brand-blue); margin: 26px 0 10px; }
.esv-sec p { font-size: max(18px, var(--fs-read, 0px)); line-height: 1.6; color: var(--ink); margin: 0 0 16px; max-width: 720px; }
.esv-band { background: #f6f5f0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.esv-blue { background: #E4F4F3; border-top: 1px solid #cfe6e4; border-bottom: 1px solid #cfe6e4; }
.esv-two { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.esv-two img { width: 100%; height: auto; display: block; border-radius: 40px 10px 40px 10px; box-shadow: 0 18px 40px rgba(14,56,96,.16); aspect-ratio: 4 / 3; object-fit: cover; }
.esv-list { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 10px; }
.esv-list li { display: flex; gap: 12px; align-items: flex-start; font-size: max(18px, var(--fs-read, 0px)); line-height: 1.45; color: var(--ink); }
.esv-list svg { flex: 0 0 24px; width: 24px; height: 24px; color: var(--cta); margin-top: 2px; }
.esv-heart p.big { font-family: var(--serif); font-size: clamp(20px, 2.2vw, 24px); line-height: 1.5; color: var(--brand-blue); }
.esv-msg { background: #fff; border: 1px solid var(--border); border-radius: 18px 18px 18px 4px; padding: 18px 20px; box-shadow: 0 12px 30px rgba(14,56,96,.12); max-width: 460px; }
.esv-msg .from { font-size: 14px !important; font-weight: 700; color: var(--cta) !important; margin: 0 0 6px !important; }
.esv-msg p { font-size: 17px !important; line-height: 1.5 !important; margin: 0 !important; }
.esv-msg-note { font-size: 14.5px !important; color: var(--muted) !important; margin: 10px 0 0 !important; }
.esv-prices { display: grid; grid-template-columns: repeat(var(--n, 2), minmax(0, 300px)); gap: 16px; margin: 22px 0 18px; }
.esv-price { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 20px; text-align: center; box-shadow: 0 8px 22px rgba(14,56,96,.07); }
.esv-price .how { font-size: 16px; font-weight: 700; color: var(--brand-blue); margin: 0 0 6px; max-width: none; }
.esv-price .amt { font-family: var(--serif); font-size: 42px; line-height: 1; color: var(--brand-blue); margin: 0 0 6px; max-width: none; }
.esv-price .per { font-size: 15.5px; color: var(--muted); margin: 0; max-width: none; }
.esv-box { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; max-width: 760px; margin: 0 0 18px; }
.esv-box h3 { margin-top: 0; }
.esv-box p:last-child { margin-bottom: 0; }
.esv-note { font-size: 16.5px !important; color: var(--muted) !important; }
.esv-story { border-left: 4px solid #FFC671; padding: 6px 0 6px 22px; }
.esv-story p { font-family: var(--serif); font-size: 21px; line-height: 1.5; color: var(--brand-blue); margin-bottom: 0; }
.esv-fit { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 8px; }
.esv-fit > div { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
.esv-fit h3 { margin-top: 0; }
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

often_fact = 'Once a month, every other week, or every week.' if WEEKLY else 'Once a month or every other week.'
often_chips = ['Once a month', 'Every other week'] + (['Every week'] if WEEKLY else []) + ['Not sure yet']
chips = ''.join(f'<button type="button" aria-pressed="false">{c}</button>' for c in often_chips)
cards = [('Once a month', '$152'), ('Every other week', '$140')] + ([('Every week', '$132')] if WEEKLY else [])
price_cards = ''.join(f'<div class="esv-price"><p class="how">{h}</p><p class="amt">{a}</p><p class="per">each 4-hour visit</p></div>' for h, a in cards)

MAIN = f'''<main>
<section class="fa-wrap">
<div class="fa-intro">
<p class="esv-prog">Early Support Visits<small>by Caring Companions</small></p>
<h1>Doing fine at home? A little help can still make a big difference.</h1>
<p class="esv-tag">A helping hand around the house. Good company. A familiar face to count on.</p>
<p class="fa-lead">For older adults who are doing well at home, and for the families who love them.</p>
<ul class="fa-facts">
<li>{CHECK}<span><b>Help and good company, without weekly home care.</b> {often_fact}</span></li>
<li>{CHECK}<span><b>Someone who gets to know them.</b> Their routines, their home, how they like things done.</span></li>
<li>{CHECK}<span><b>You hear how the visit went.</b> A short update after each visit, with their permission.</span></li>
</ul>
<p class="fa-proof"><span><span class="st" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 4.9 on Google</span><span>Locally owned since 2017</span></p>
</div>

<div class="fa-card" id="faCard">
<form id="faForm" novalidate>
<h2>Talk with us first</h2>
<p class="fa-sub">A free phone conversation. No obligation.</p>
<div class="fa-row">
<label class="fa-f"><span>First name</span><input id="faFirst" autocomplete="given-name"></label>
<label class="fa-f"><span>Last name</span><input id="faLast" autocomplete="family-name"></label>
</div>
<label class="fa-f"><span>Phone</span><input id="faPhone" type="tel" autocomplete="tel" inputmode="tel"></label>
<label class="fa-f"><span>Email <span class="fa-opt">(optional)</span></span><input id="faEmail" type="email" autocomplete="email"></label>
<div class="fa-f"><span id="faWhoL">Who are the visits for?</span><div class="fa-chips" role="group" aria-labelledby="faWhoL" data-pick="who"><button type="button" aria-pressed="false">My parent</button><button type="button" aria-pressed="false">My spouse</button><button type="button" aria-pressed="false">Myself</button><button type="button" aria-pressed="false">Someone else</button></div></div>
<div class="fa-f"><span id="faTownL">Where is the home?</span><div class="fa-chips" role="group" aria-labelledby="faTownL" data-pick="town"><button type="button" aria-pressed="false">Springfield</button><button type="button" aria-pressed="false">Somewhere else</button></div></div>
<div class="fa-f"><span id="faOftenL">How often sounds right?</span><div class="fa-chips" role="group" aria-labelledby="faOftenL" data-pick="often">{chips}</div></div>
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
<section class="esv-sec esv-two esv-heart" id="why-early">
<div>
<h2>You don&rsquo;t have to wait until more help is needed.</h2>
<p class="big">Mom is doing well at home. Dad still manages his day. But you wish someone could stop by regularly, lend a hand, and spend a little time with them.</p>
<p>That&rsquo;s why we created Early Support Visits.</p>
<p>A caregiver from our team helps with everyday things while getting to know your loved one. With their permission, we&rsquo;ll let you know how each visit went.</p>
<p>And from the first visit, your family is established with Caring Companions. You know us, we know your loved one, and there is a whole team of wonderful caregivers behind every visit. So when an extra visit would help, or more help is needed someday, you can simply ask.</p>
</div>
<img src="/assets/photos/scene-kitchen-coffee.webp" alt="A caregiver and an older woman laughing over coffee at the kitchen table" width="1080" height="608" loading="lazy" decoding="async">
</section>
</div>

<div class="esv-blue">
<section class="esv-sec esv-two" id="families">
<div>
<h2>For families: you&rsquo;ll hear how the visit went</h2>
<p>If your mom or dad would like, our office sends you a short update after each visit:</p>
<ul class="esv-list">
<li>{CHECK}<span>What we helped with</span></li>
<li>{CHECK}<span>How the visit went</span></li>
<li>{CHECK}<span>Anything we noticed that seemed worth mentioning</span></li>
</ul>
<p>Over time, our caregivers get to know your loved one: what makes them laugh, how they take their coffee, what a usual day looks like.</p>
<p class="esv-note">Updates are a caregiver&rsquo;s everyday observations. They are not a medical check, and they can&rsquo;t promise to catch every change.</p>
</div>
<div>
<div class="esv-msg" aria-label="An example of a visit update">
<p class="from">Caring Companions</p>
<p>Hi Karen. We changed the bed, made chicken soup and ran to the pharmacy today. Your mom was in great spirits and showed us her new quilt. See you in two weeks.</p>
</div>
<p class="esv-msg-note">An example of a visit update.</p>
</div>
</section>
</div>

<section class="esv-sec esv-two" id="a-visit">
<div>
<h2>What a visit looks like</h2>
<p>Fresh sheets on the bed. A pot of soup on the stove. A trip to the store. And someone good to talk to while it all gets done.</p>
<p>Yes, our caregivers really clean. A visit can include:</p>
<ul class="esv-list">
<li>{CHECK}<span>Dishes, the kitchen and the counters</span></li>
<li>{CHECK}<span>Sweeping, vacuuming and mopping</span></li>
<li>{CHECK}<span>Cleaning the bathroom</span></li>
<li>{CHECK}<span>Laundry and changing the bed</span></li>
<li>{CHECK}<span>Tidying and a little organizing</span></li>
<li>{CHECK}<span>Making a meal, with extra for later</span></li>
<li>{CHECK}<span>An errand or a ride</span></li>
</ul>
</div>
<div>
<img src="/assets/photos/scene-door-wave.webp" alt="A caregiver waving as an older woman opens the front door" width="1080" height="608" loading="lazy" decoding="async">
<h3>What fits in a visit</h3>
<p>Each visit is four hours. You and your caregiver decide together what matters most that day, and the good company happens right alongside the work.</p>
<p>These visits keep a home comfortable from one visit to the next. They aren&rsquo;t meant for a top-to-bottom deep clean or a big cleaning project. If the house needs that first, we&rsquo;re glad to suggest a cleaning company.</p>
</div>
</section>

<div class="esv-band">
<section class="esv-sec" id="cost">
<h2>How often, and what it costs</h2>
<div class="esv-prices" style="--n:{len(cards)}">{price_cards}</div>
<p>We&rsquo;ll work together to find a regular visit day and time that fits your schedule and our caregiver availability. After that, your visit is on the same day and time each time, so you can plan on it.</p>
<div class="esv-box">
<h3>Before the first visit: a one-time $99 assessment and setup</h3>
<p>Before visits begin, someone from our office comes to the home to get to know your loved one, their home, how they like things done, anything to keep in mind for safety, and what they would like help with. From that we write a personal care plan for the caregiver.</p>
<p>The $99 is for that assessment and setup. It is separate from the four-hour visits, and it is billed with your first visit, so there is nothing to pay at the assessment.</p>
</div>
<p class="esv-note">Early Support Visits are private pay, with no long-term contract. Each visit is billed on that week&rsquo;s invoice. Offered in Springfield.</p>
</section>
</div>

<section class="esv-sec" id="why">
<h2>Why we started it</h2>
<div class="esv-story">
<p>For years, people have told us the same thing: &ldquo;I don&rsquo;t need much. I&rsquo;d just like a hand now and then.&rdquo; We never had a good answer for them. Now we do.</p>
</div>
</section>

<div class="esv-band">
<section class="esv-sec" id="good-to-know">
<h2>Good to know</h2>
<ul class="esv-list">
<li>{CHECK}<span>Need to move a visit? Give us at least 24 hours&rsquo; notice and there is no charge.</span></li>
<li>{CHECK}<span>We do our best to send someone your loved one knows, and we tell them who is coming. Sometimes it will be another member of our team.</span></li>
<li>{CHECK}<span>Every caregiver works for Caring Companions and has passed our background checks.</span></li>
<li>{CHECK}<span>Someone is home during the visit, and the home&rsquo;s own cleaning products are used.</span></li>
<li>{CHECK}<span>These visits are not medical care.</span></li>
</ul>
</section>
</div>

<section class="esv-sec" id="which">
<h2>Early Support Visits or regular home care?</h2>
<p>Early Support Visits are for people who manage their own day. They are not a replacement for regular care when someone needs more.</p>
<div class="esv-fit">
<div>
<h3>Early Support Visits</h3>
<ul class="esv-list">
<li>{CHECK}<span>Doing well at home and managing their own day.</span></li>
<li>{CHECK}<span>Would enjoy a hand with the house and some good company.</span></li>
<li>{CHECK}<span>A visit {'now and then' if not WEEKLY else 'each week or less'} is plenty.</span></li>
</ul>
</div>
<div>
<h3>Regular home care</h3>
<ul class="esv-list">
<li>{CHECK}<span>Help with bathing, dressing or getting around.</span></li>
<li>{CHECK}<span>Help every week, 8 or more hours.</span></li>
<li>{CHECK}<span>Three levels of care, from $30 an hour.</span></li>
</ul>
<p><a href="/pricing" style="font-weight:600;color:#1F7A8C">See our care levels and rates &rarr;</a></p>
</div>
</div>
</section>

<div class="esv-band">
<section class="esv-sec" id="questions">
<h2>Questions people ask</h2>
<details class="esv-q" open><summary>Why start visits if my parent doesn&rsquo;t need home care yet?</summary><p>Because this is the easy time to start. Your parent is well enough to enjoy the visits, to say how they like things done, and to get comfortable with someone new at their own pace.</p><p>They get a hand with the things that are getting a little harder, and some good company. You get to know that someone who knows them is stopping by, and you hear how it went.</p><p>And if they ever do need more help, nobody is starting from scratch with strangers.</p></details>
<details class="esv-q"><summary>Do your caregivers really clean?</summary><p>Yes. Kitchens, floors, bathrooms, laundry and the bed. What a visit isn&rsquo;t meant for is the big once-a-year jobs, like carpets, outside windows or the garage. For those, we&rsquo;re glad to suggest a cleaning company.</p></details>
<details class="esv-q"><summary>Will it be the same caregiver each time?</summary><p>We do our best to send someone your loved one knows. Sometimes it will be another member of our team, and we always tell them who is coming.</p></details>
<details class="esv-q"><summary>How do we pick the day?</summary><p>We&rsquo;ll work together to find a regular visit day and time that fits your schedule and our caregiver availability.</p></details>
<details class="esv-q"><summary>What if we need to move or skip a visit?</summary><p>With at least 24 hours&rsquo; notice, we&rsquo;ll move it at no charge. With less than 24 hours&rsquo; notice, the visit is billed at 2 hours.</p></details>
<details class="esv-q"><summary>Can we take a break?</summary><p>Yes. Visits can be paused for up to 60 days. Just let the office know.</p></details>
<details class="esv-q"><summary>What is the $99 for?</summary><p>It is a one-time assessment and setup fee. Before visits begin, we come to the home, get to know your loved one, and write a personal care plan for the caregiver. It is separate from the four-hour visits and is billed with the first visit. Your first phone conversation with us is free.</p></details>
<details class="esv-q"><summary>Where do you offer it?</summary><p>In Springfield for now. If the home is somewhere else nearby, tell us on the form and we will let you know what we can offer.</p></details>
<details class="esv-q"><summary>Can we add an extra visit?</summary><p>Yes, just ask. Because your loved one is already a Caring Companions client, we know them and their home, and we will do our best to arrange an extra visit with a caregiver from our team. Extra visits depend on caregiver availability and cost the same as your usual visit.</p></details>
<details class="esv-q"><summary>What if they need more help later?</summary><p>Then we talk about it together. If your loved one starts to need help more often, or hands-on help with things like bathing or dressing, regular home care is the right fit, and we can move them over without starting from the beginning. Early Support Visits aren&rsquo;t a substitute for that kind of care. Plenty of people will never need more, and they are welcome to stay with Early Support Visits for as long as it fits.</p></details>
</section>
</div>

<section class="esv-sec esv-cta">
<h2>Something you can do for them now.</h2>
<p>Start with a free phone conversation. We&rsquo;ll answer your questions and tell you honestly whether this is the right fit.</p>
<a class="esv-btn" href="#faCard">Talk with us first</a><a class="esv-btn alt" href="tel:14172348494">Call (417) 234-8494</a>
</section>
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
    if (!pick.town) return fail('Please tell us where the home is.');
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
body = s[s.index('<main>'):s.index('</main>')]
assert '—' not in MAIN and '—' not in SCRIPT
assert 'ree assessment' not in body.lower().replace('free phone', '') and 'Veterans: get paid' not in s
if not WEEKLY: assert '$132' not in s and 'very week' not in body.replace('every other week', '').replace('Help every week, 8', '')
open(os.path.join(ROOT, 'early-support-visits.html'), 'w', encoding='utf-8').write(s)
print('wrote early-support-visits.html', len(s), 'weekly option:', WEEKLY)
