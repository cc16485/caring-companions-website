#!/usr/bin/env python3
"""Services menu: three more services (Samantha 2026-11-13, "Yes add these three").

1. After a Hospital Stay   -> the guide she approved 11-11 (guides/hospital-discharge)
2. Care for Couples        -> new page services/care-for-couples.html
3. Care Wherever They Live -> new page services/care-wherever-they-live.html

The two new pages are built from services/respite-care.html (same header, request-a-call steps, footer).
Wording keeps to what she confirmed: we offer all three. Couples price is her word 2026-11-13 (1.5 times the rate only when both need personal care; otherwise the regular rate). No other prices, hours or promises that were not hers
(feeling, not policy). No caregiver is promised by name or as "the same" one.

Run from the repo root: python3 tools/build-three-services.py
It also adds the three lines to the Services menu on every page that has the menu, the two cards on
Our Services, and the two pages to sitemap.xml and llms.txt. Running it twice changes nothing more."""
import re, os, json, glob, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)

def sub1(pat, rep, s, flags=0):
    out, n = re.subn(pat, lambda m: rep, s, count=1, flags=flags)
    assert n == 1, pat
    return out

H2 = 'font-family:\'Source Serif 4\',Georgia,serif;font-size:22px;font-weight:600;margin:0 0 8px;color:#0D365F'
P = 'font-size:max(15.5px, var(--fs-read, 0px));line-height:1.75;color:#2c3d4d;margin:0 0 28px'
TOWNS_Q = ('Which towns near Springfield do you serve?',
           'Springfield, Nixa, Ozark, Republic, Battlefield, Willard, Strafford, Rogersville, Marshfield, Bolivar, Fair Grove, Sparta and more across Greene, Christian, Webster and Polk counties. <a href="/service-area">See every town we serve</a>.')

PAGES = [
  dict(
    file='services/care-for-couples.html', url='https://mo-care.com/services/care-for-couples',
    name='Care for Couples', page='the Care for Couples page',
    title='Home Care for Couples in Springfield, MO | Caring Companions',
    desc='Home care for couples in Springfield, MO. One caregiver helps you both in the same visit, so you stay together in the home you share.',
    kick='Care for Couples in Springfield, MO',
    h1='Help for both of you, at home together.',
    sub='When Mom and Dad both need a hand, one caregiver can help them both in the same visit, so they stay together in the home they share.',
    photo='scene-sofa-album.webp', alt='A daughter and a caregiver laughing with an older woman on the sofa', pos='50% 35%',
    intro='Many couples have looked after each other for years. Often one of them is doing more than they should to care for the other, and both could use some help. Care at home lets them stay side by side, in their own home and their own routines.',
    h2='How it helps',
    cards=[
      ('One visit for you both', 'Your caregiver helps each of you with what you need that day. That might be a shower and getting dressed for one of you, and a good lunch and company for the other.'),
      ('A rest for the one doing the caring', 'A husband or wife who has been the caregiver gets to be a spouse again, while someone else takes on the heavy part of the day.'),
      ('Care that fits each of you', 'At the free in-home assessment we sit down with you both, listen to what each of you needs, and build the care plan around that.'),
    ],
    faq_h='Questions families ask about care for couples',
    faqs=[
      ('Can one caregiver help both of my parents?', 'Yes. At the free in-home assessment we look at what each of them needs and tell you honestly what one caregiver can do in a visit.'),
      ('What if they need different kinds of help?', 'That is very common. One may only want company and a hand with meals while the other needs help bathing and getting around. The care plan covers each of them.'),
      ('What does care for two cost?', 'Often no more than care for one. When one of you needs personal care, the other still enjoys the cooking, cleaning and errands done for the household, at the regular hourly rate. If you both need personal care, such as help bathing and dressing, the rate is one and a half times the regular rate, not double. <a href="/pricing">See our rates</a>.'),
      TOWNS_Q,
    ],
    band_k='Not sure where to start?',
    band_p='Tell us a little about the two of them. A care coordinator from our Springfield office will call and talk it through with you.',
    llms='One caregiver helps both spouses or both parents in the same visit, so a couple can stay together at home.',
    card='One caregiver helping you both, so you stay together at home.',
  ),
  dict(
    file='services/care-wherever-they-live.html', url='https://mo-care.com/services/care-wherever-they-live',
    name='Care Wherever They Live', page='the Care Wherever They Live page',
    title='Extra Care in Assisted Living, Nursing Homes & Hospitals | Caring Companions',
    desc='One-on-one care from Caring Companions in assisted living, nursing homes, rehab and the hospital in Springfield, MO. Someone there just for your loved one.',
    kick='Care in Assisted Living, Nursing Homes &amp; Hospitals',
    h1='One-on-one care, wherever they are living.',
    sub='Home is not always a house. Our caregivers also come to assisted living, nursing homes, rehab and the hospital, so your loved one has someone there just for them.',
    photo='scene-puzzle.webp', alt='A caregiver smiling with an older man at a table by a window', pos='50% 35%',
    intro='The staff in a care community or a hospital look after many people at once, and they work hard. A caregiver from our team is there for one person: yours. We work alongside the staff and add time, attention and good company.',
    h2='Where we can help',
    cards=[
      ('In assisted living or a nursing home', 'Company, a hand at mealtimes, walks, help getting to activities, and a little extra personal attention during the day.'),
      ('In the hospital', 'Someone at the bedside so they are not alone, and so you can go home and rest.'),
      ('During rehab', 'Company and encouragement between therapy sessions. When it is time to go home, we can help there too. <a href="/guides/hospital-discharge">See Coming Home After a Hospital Stay</a>.'),
    ],
    after_cards='<p style="' + P + '">Our caregivers do not give medical care. The nurses and staff still do that. We are there for comfort, company and everyday help.</p>',
    faq_h='Questions families ask about care in a facility',
    faqs=[
      ('Will the facility allow an outside caregiver?', 'Most welcome it. It is a good idea to let the staff know, and our caregivers follow each place\'s rules for visitors and outside caregivers.'),
      ('Is this medical care?', 'No. Our caregivers give non-medical care: company, help with meals, everyday personal help and a watchful, friendly presence. Nurses and facility staff keep doing the medical care.'),
      ('What does it cost?', 'We go over the cost with you before anything starts. <a href="/pricing">See our rates</a>, or call (417) 234-8494 and we will talk it through.'),
      TOWNS_Q,
    ],
    band_k='Worried they are spending too much time alone?',
    band_p='Tell us where they are staying and what would help. A care coordinator from our Springfield office will call and talk it through with you.',
    llms='One-on-one, non-medical care in assisted living, nursing homes, rehab and the hospital, alongside the facility staff.',
    card='One-on-one care in assisted living, a nursing home, rehab or the hospital.',
  ),
]

def strip_tags(t): return html.unescape(re.sub(r'<[^>]+>', '', t))

def build_page(src, pg):
    s = src
    s = sub1(r'<title>.*?</title>', f"<title>{pg['title']}</title>", s)
    s = sub1(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{pg["desc"]}">', s)
    s = sub1(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{pg["url"]}">', s)
    s = sub1(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{pg["title"]}">', s)
    s = sub1(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{pg["desc"]}">', s)
    s = sub1(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{pg["url"]}">', s)
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}} for q, a in pg['faqs']]}
    s = sub1(r'<script type="application/ld\+json">.*?</script>',
             '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', s, flags=re.S)
    s = sub1(r'&rsaquo; <span style="color:#45566a">Respite Care</span>', f'&rsaquo; <span style="color:#45566a">{pg["name"]}</span>', s)
    s = sub1(r'<h1 class="nh-kick">.*?</h1>', f'<h1 class="nh-kick">{pg["kick"]}</h1>', s)
    s = sub1(r'<p class="nh-h1">.*?</p>', f'<p class="nh-h1">{pg["h1"]}</p>', s)
    s = sub1(r'<p class="nh-sub">.*?</p>', f'<p class="nh-sub">{pg["sub"]}</p>', s)
    s = sub1(r'data-page="the Respite Care page"', f'data-page="{pg["page"]}"', s)
    s = sub1(r'<figure class="nh-photo">.*?</figure>',
             f'<figure class="nh-photo"><img style="object-position:{pg["pos"]}" src="/assets/photos/{pg["photo"]}" alt="{pg["alt"]}" width="1080" height="608" fetchpriority="high" decoding="async"></figure>', s, flags=re.S)

    cards = ''.join(
        '<div style="background:#ffffff;border:1px solid #e4e1d8;border-radius:14px;padding:22px 24px">\n'
        f'<p style="font-size:max(15px, var(--fs-head, 0px));font-weight:600;color:#122236;margin:0 0 6px">{t}</p>\n'
        f'<p style="font-size:max(14px, var(--fs-read, 0px));line-height:1.7;color:#45566a;margin:0">{b}</p>\n</div>\n' for t, b in pg['cards'])
    faqs = ''.join(
        '<details style="border-bottom:1px solid #e4e1d8;padding:4px 0"><summary style="cursor:pointer;font-weight:600;color:#16283a;font-size:max(16px, var(--fs-read, 0px));padding:12px 0;list-style-position:outside">'
        f'{q}</summary><p style="font-size:max(14.5px, var(--fs-read, 0px));line-height:1.75;color:#2c3d4d;margin:0 0 14px">{a}</p></details>' for q, a in pg['faqs'])
    body = f'''<section style="max-width:880px;margin:0 auto;padding:10px 24px 50px">
<p style="{P}">{pg['intro']}</p>

<h2 style="{H2}">{pg['h2']}</h2>
<div style="display:flex;flex-direction:column;gap:14px;margin:16px 0 {'20px' if pg.get('after_cards') else '40px'}">
{cards}</div>
{pg.get('after_cards', '')}
<h2 style="{H2.replace('margin:0 0 8px', 'margin:32px 0 8px')}">{pg['faq_h']}</h2>
<div style="margin:0 0 8px">{faqs}</div>
<div style="background:#14606F;border-radius:14px;padding:24px;margin-top:28px">
<p style="font-size:max(11.5px, var(--fs-min, 0px));font-weight:700;color:#F5D061;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px">{pg['band_k']}</p>
<p style="font-size:max(14px, var(--fs-read, 0px));line-height:1.7;color:#c3cdd6;margin:0 0 16px">{pg['band_p']}</p>
<div style="display:flex;flex-wrap:wrap;gap:10px">
<a href="#who-needs-care" style="display:inline-block;background:#fbfaf7;color:#14606F;border-radius:8px;padding:11px 18px;font-size:max(13.5px, var(--fs-min, 0px));font-weight:600;text-decoration:none">Request a call</a>
<a href="tel:14172348494" style="display:inline-block;background:transparent;color:#fbfaf7;border:1px solid #fbfaf7;border-radius:8px;padding:11px 18px;font-size:max(13.5px, var(--fs-min, 0px));font-weight:600;text-decoration:none">Call (417) 234-8494</a>
</div>
</div>
</section>
'''
    a = s.index('<section style="max-width:880px;margin:0 auto;padding:10px 24px 50px">')
    b = s.index('<footer', a)
    tail = s[a:b]
    end = tail.rindex('</section>') + len('</section>')
    s = s[:a] + body.rstrip('\n') + tail[end:] + s[b:]
    assert '—' not in body and 'Respite' not in body, pg['file']
    return s

src = rd('services/respite-care.html')
for pg in PAGES:
    wr(pg['file'], build_page(src, pg))
    print('built', pg['file'])

# ---- Services menu on every page that has it ----
OLD_EOL = '<a href="/guides/planning-for-end-of-life-care">End-of-Life Care<span class="cc-dd-sub">Comfort and company in the last months</span></a>\n'
DEM = '<a href="/care-paths/dementia">Dementia &amp; Memory Care<span class="cc-dd-sub">Patient help with memory loss</span></a>\n'
HOSP = '<a href="/guides/hospital-discharge">After a Hospital Stay<span class="cc-dd-sub">Settling back in after surgery or rehab</span></a>\n'
TWO = ('<a href="/services/care-for-couples">Care for Couples<span class="cc-dd-sub">One caregiver helping you both</span></a>\n'
       '<a href="/services/care-wherever-they-live">Care Wherever They Live<span class="cc-dd-sub">Assisted living, nursing home or hospital</span></a>\n')
n = 0
for f in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True):
    t = open(f, encoding='utf-8').read()
    if DEM + OLD_EOL not in t:
        continue
    t2 = t.replace(DEM + OLD_EOL, DEM + HOSP + OLD_EOL + TWO)
    open(f, 'w', encoding='utf-8').write(t2); n += 1
print('menu updated on', n, 'pages')

# ---- Our Services cards ----
t = rd('our-services.html')
if 'care-for-couples"><h3>' not in t:
    anchor = '<a class="os-card" href="/services/respite-care"><h3>Respite Care</h3><p>Scheduled or emergency relief so family caregivers can rest.</p></a>\n'
    assert anchor in t
    add = ('<a class="os-card" href="/guides/hospital-discharge"><h3>After a Hospital Stay</h3><p>Help settling back in at home after surgery, a hospital stay or rehab.</p></a>\n'
           + ''.join(f'<a class="os-card" href="/{pg["file"][:-5]}"><h3>{pg["name"]}</h3><p>{pg["card"]}</p></a>\n' for pg in PAGES))
    wr('our-services.html', t.replace(anchor, anchor + add))

# ---- sitemap + llms ----
t = rd('sitemap.xml')
for pg in PAGES:
    if pg['url'] not in t:
        line = '  <url><loc>https://mo-care.com/services/respite-care</loc>'
        i = t.index(line); j = t.index('\n', i) + 1
        t = t[:j] + f'  <url><loc>{pg["url"]}</loc><lastmod>2026-11-13</lastmod></url>\n' + t[j:]
wr('sitemap.xml', t)
t = rd('llms.txt')
for pg in PAGES:
    if pg['url'] not in t:
        i = t.index('- [Respite Care](https://mo-care.com/services/respite-care)'); j = t.index('\n', i) + 1
        t = t[:j] + f'- [{pg["name"]}]({pg["url"]}): {pg["llms"]}\n' + t[j:]
wr('llms.txt', t)
print('done')
