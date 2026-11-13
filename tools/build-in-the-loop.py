#!/usr/bin/env python3
"""Builds staying-in-the-loop.html from our-story.html's header and footer."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "our-story.html").read_text()
head_nav = src[: src.index('<section class="nh-hero"')]
footer = src[src.index('<footer class="cc-siteftr">'):]

TITLE = "Staying in the Loop | Caring Companions"
DESC = "See the care calendar, visit notes, care plan and every invoice, and know how and when our Springfield office will be in touch. Here is how we keep families in the loop."
URL = "https://mo-care.com/staying-in-the-loop"
head_nav = re.sub(r"<title>.*?</title>", f"<title>{TITLE}</title>", head_nav)
head_nav = re.sub(r'(<meta name="description" content=")[^"]*', r"\g<1>" + DESC, head_nav)
head_nav = re.sub(r'(<meta property="og:title" content=")[^"]*', r"\g<1>" + TITLE, head_nav)
head_nav = re.sub(r'(<meta property="og:description" content=")[^"]*', r"\g<1>" + DESC, head_nav)
head_nav = head_nav.replace("https://mo-care.com/our-story", URL)
head_nav = head_nav.replace("https://mo-care.com/assets/photos/hero-caregiver.jpg", "https://mo-care.com/assets/photos/scene-daughter-text.webp")

CSS = """
.sl-wrap { max-width: 1100px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
.sl-sec { padding: 54px 0 0; }
.sl-kick { font-size: max(13px, var(--fs-min, 0px)); font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
.sl-sec h2 { font-family: var(--serif); font-size: 30px; font-weight: 600; color: var(--brand-blue); letter-spacing: -0.01em; margin: 0 0 12px; text-wrap: balance; }
.sl-lede { font-size: max(17px, var(--fs-read, 0px)); line-height: 1.7; color: var(--body-text); max-width: 68ch; margin: 0 0 28px; }
.sl-see { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.sl-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; }
.sl-card h3 { font-family: var(--serif); font-size: 21px; font-weight: 600; color: var(--brand-blue); margin: 0 0 6px; display: flex; align-items: center; gap: 10px; }
.sl-card h3 svg { width: 26px; height: 26px; flex: none; }
.sl-card > p { font-size: max(16px, var(--fs-read, 0px)); line-height: 1.65; color: var(--body-text); margin: 0 0 18px; }
.sl-ex { margin-top: auto; background: #EAF4F6; border-radius: 12px; padding: 14px 16px 16px; }
.sl-ex-tag { font-size: max(12px, var(--fs-min, 0px)); font-weight: 700; color: #155A68; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 10px; }
.sl-row { background: #fff; border-radius: 9px; padding: 10px 12px; margin: 0 0 6px; display: flex; justify-content: space-between; gap: 12px; font-size: max(14.5px, var(--fs-min, 0px)); line-height: 1.45; color: #16283a; }
.sl-row:last-child { margin: 0; }
.sl-row b { color: var(--brand-blue); }
.sl-row span:last-child { color: var(--muted); text-align: right; white-space: nowrap; }
.sl-note { background: #fff; border-radius: 9px; padding: 12px 14px; font-size: max(14.5px, var(--fs-min, 0px)); line-height: 1.6; color: #16283a; margin: 0; }
.sl-note b { display: block; color: var(--brand-blue); margin: 0 0 4px; }
.sl-fine { font-size: max(15px, var(--fs-read, 0px)); line-height: 1.65; color: var(--muted); margin: 18px 0 0; max-width: 72ch; }
.sl-hear { display: grid; gap: 12px; }
.sl-when { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 18px 22px; display: grid; grid-template-columns: 230px 1fr; gap: 20px; align-items: baseline; }
.sl-when h3 { font-size: max(16px, var(--fs-read, 0px)); font-weight: 700; color: var(--brand-blue); margin: 0; }
.sl-when p { font-size: max(16px, var(--fs-read, 0px)); line-height: 1.65; color: var(--body-text); margin: 0; }
.sl-when a { color: var(--cta); font-weight: 600; }
.sl-two { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.sl-panel { background: var(--navy-panel); border-radius: 16px; padding: 30px 28px; color: #fff; }
.sl-panel h3 { font-family: var(--serif); font-size: 22px; font-weight: 600; margin: 0 0 10px; color: #fff; }
.sl-panel p { font-size: max(16px, var(--fs-read, 0px)); line-height: 1.7; color: #dbe7ec; margin: 0; }
.sl-panel .k { font-size: max(12px, var(--fs-min, 0px)); font-weight: 700; color: #F5D061; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
.sl-cta { text-align: center; padding: 54px 0 80px; }
.sl-cta h2 { font-family: var(--serif); font-size: 26px; font-weight: 600; color: var(--brand-blue); margin: 0 0 18px; }
@media (max-width: 820px) { .sl-see, .sl-two { grid-template-columns: 1fr; } .sl-when { grid-template-columns: 1fr; gap: 6px; } }
@media (max-width: 639px) { .sl-wrap { padding: 0 20px; } .sl-sec { padding-top: 40px; } .sl-sec h2 { font-size: 25px; } .sl-card { padding: 20px; } .sl-row { flex-direction: column; gap: 2px; } .sl-row span:last-child { text-align: left; white-space: normal; } }
"""
head_nav = re.sub(r"<style>.*?</style>", "<style>" + CSS + "</style>", head_nav, flags=re.S)

MENU = '<a href="/staying-in-the-loop">Staying in the Loop<span class="cc-dd-sub">What you can see, and how we keep in touch</span></a>\n'
anchor = '<a href="/service-area">Where We Serve'
if MENU.strip() not in head_nav:  # our-story.html carries the link once the page is live
    head_nav = head_nav.replace(anchor, MENU + anchor)
foot_anchor = '<a href="/share-your-story">Share Your Story</a>'
if '<a href="/staying-in-the-loop">Staying in the Loop</a>' not in footer:
    footer = footer.replace(foot_anchor, '<a href="/staying-in-the-loop">Staying in the Loop</a>\n' + foot_anchor)
footer = footer.replace('<script src="/assets/forms.js"></script>\n', '').replace('<script src="/assets/ask.js"></script>\n', '')

def ic(name): return f'<svg aria-hidden="true"><use href="/assets/icons.svg#{name}"/></svg>'

BODY = f"""<section class="nh-hero nh-short">
<figure class="nh-photo"><img style="object-position:60% 30%" src="/assets/photos/scene-daughter-text.webp" alt="A daughter smiling as she reads an update on her phone" width="1080" height="608" fetchpriority="high" decoding="async"></figure>
<div class="nh-hero-copy">
<p class="nh-kick">Staying in the loop</p>
<h1>You shouldn't have to wonder how the visit went.</h1>
<p class="nh-sub">When you can't be there, you still want to know who came, what the day was like and what it cost. Here is what you can see for yourself, and how you'll hear from us.</p>
<div class="nh-btns"><a href="#see" class="nh-go">What you can see</a><a href="#hear" class="nh-ghost">How you'll hear from us</a></div>
</div>
</section>

<div class="sl-wrap">

<section class="sl-sec" id="see">
<p class="sl-kick">Open any time</p>
<h2>What you can see for yourself</h2>
<p class="sl-lede">The family members you choose each get their own sign-in to AxisCare, our care and billing system. It works on a phone or a computer, whenever you want to look.</p>
<div class="sl-see">

<div class="sl-card">
<h3>{ic('i-calendar')}The care calendar</h3>
<p>Every visit on the schedule, with the day, the time and who's coming.</p>
<div class="sl-ex"><p class="sl-ex-tag">Example</p>
<div class="sl-row"><span><b>Tuesday</b> &middot; Ashley</span><span>9:00 AM to 1:00 PM</span></div>
<div class="sl-row"><span><b>Thursday</b> &middot; Ashley</span><span>9:00 AM to 1:00 PM</span></div>
<div class="sl-row"><span><b>Saturday</b> &middot; Rosa</span><span>10:00 AM to 2:00 PM</span></div>
</div>
</div>

<div class="sl-card">
<h3>{ic('i-clipboard')}Care notes from each visit</h3>
<p>Your caregiver writes a note after every visit, so you can read how the day went in their own words.</p>
<div class="sl-ex"><p class="sl-ex-tag">Example</p>
<p class="sl-note"><b>Tuesday, 9:00 AM to 1:00 PM</b>Dorothy was in good spirits today. We made vegetable soup together and she ate a full bowl. Took a short walk to the mailbox with her walker. She asked me to remind you about her hair appointment on Friday.</p>
</div>
</div>

<div class="sl-card">
<h3>{ic('i-heart')}The care plan</h3>
<p>The plan we build with you at the assessment: the routines, the preferences and the help your loved one wants. We review it together at least every 90 days.</p>
<div class="sl-ex"><p class="sl-ex-tag">Example</p>
<div class="sl-row"><span><b>Mornings</b></span><span>Coffee first, then breakfast</span></div>
<div class="sl-row"><span><b>Walking</b></span><span>Walker, stay close on steps</span></div>
<div class="sl-row"><span><b>Loves</b></span><span>Crosswords, gospel music</span></div>
</div>
</div>

<div class="sl-card">
<h3>{ic('i-doc')}Detailed invoices</h3>
<p>One invoice a week that lists every visit, billed from your caregiver's actual clock-in and clock-out times. You can see your payments too.</p>
<div class="sl-ex"><p class="sl-ex-tag">Example</p>
<div class="sl-row"><span><b>Tue</b> &middot; 9:02 AM to 1:01 PM</span><span>4 hours</span></div>
<div class="sl-row"><span><b>Thu</b> &middot; 8:58 AM to 1:00 PM</span><span>4 hours</span></div>
<div class="sl-row"><span><b>Sat</b> &middot; 10:00 AM to 2:03 PM</span><span>4 hours</span></div>
</div>
</div>

</div>
<p class="sl-fine">The examples above are made up to show the kind of thing you'll see. They aren't a real client, and your screen will look a little different.</p>
</section>

<section class="sl-sec" id="hear">
<p class="sl-kick">From our Springfield office</p>
<h2>How you'll hear from us</h2>
<p class="sl-lede">A screen is handy, but it isn't the same as a person. These are the times you can expect a call, a text or an email from our team.</p>
<div class="sl-hear">
<div class="sl-when"><h3>Before the first visit</h3><p>We call to confirm the day, the time and who's coming, and we send your caregiver's profile with a friendly photo.</p></div>
<div class="sl-when"><h3>A few days after care starts</h3><p>We call to ask how it's going. You don't have to wait for that call. If something isn't right, tell us any time.</p></div>
<div class="sl-when"><h3>If a caregiver is running late</h3><p>The contacts you choose can get a text, so nobody is left watching the driveway.</p></div>
<div class="sl-when"><h3>If someone different is coming</h3><p>If your caregiver is sick, we let you know right away. The contacts you choose can get a text with the new caregiver's profile, so you're never surprised by who's at the door.</p></div>
<div class="sl-when"><h3>When a note needs attention</h3><p>If a caregiver notices a change or a concern, we work with the caregiver and your family to sort it out.</p></div>
<div class="sl-when"><h3>Each week</h3><p>Your invoice comes by email, showing every visit from the week before.</p></div>
<div class="sl-when"><h3>When you need us</h3><p>A real person answers our office line, day or night: <a href="tel:14172348494">(417) 234-8494</a>.</p></div>
</div>
</section>

<section class="sl-sec">
<div class="sl-two">
<div class="sl-panel"><p class="k">Behind the scenes</p><h3>Someone here is paying attention too.</h3><p>Our office reads every care note. And if a caregiver hasn't clocked in a few minutes after a visit should start, we're alerted right away and we follow up.</p></div>
<div class="sl-panel"><p class="k">Your Family Circle</p><h3>You choose who's in the loop.</h3><p>A daughter across town, a son in another state, a trusted neighbor. We only share care updates with the people you've approved in writing, and you can add or remove someone at any time.</p></div>
</div>
</section>

<section class="sl-sec">
<p class="sl-kick">From families</p>
<h2>What families say</h2>
<div class="cc-famrev" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
<figure class="cc-famrev-card"><p class="cc-famrev-stars" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</p><blockquote>&ldquo;Have been very impressed with the compassionate care my parents have received in their home. The administration has also been very flexible to work with us and very responsive.&rdquo;</blockquote><figcaption>Judy B. &middot; Google review</figcaption></figure>
<figure class="cc-famrev-card"><p class="cc-famrev-stars" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</p><blockquote>&ldquo;Excellent coordination and fulfillment of care for Mom. Very happy and satisfied with Caring Companions!&rdquo;</blockquote><figcaption>Robert G. &middot; Google review</figcaption></figure>
</div>
</section>

<section class="sl-cta">
<h2>Have a question about how this works for your family?</h2>
<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
<a href="/free-assessment" class="btn-primary">Request a Free Assessment</a>
<a href="/before-your-assessment" class="btn-outline">What to Expect</a>
</div>
</section>

</div>

"""
out = head_nav + BODY + footer
assert "—" not in BODY and "–" not in BODY
(root / "staying-in-the-loop.html").write_text(out)
print("wrote", len(out))
