"""11-11: add the 'veteran can choose their caregiver' box to every live town page and county guide.
Safe to re-run: skips pages that already have it. Usage: python3 tools/add-va-box.py"""
import glob, re, html
MARK = '<!-- cc-va-box -->'
def box(place, tag):
    p = html.escape(place)
    return f'''{MARK}
<section class="cc-va-box" aria-labelledby="cc-va-h">
<div class="cc-va-in">
<p class="cc-va-kick">For veterans in {p}</p>
<h2 id="cc-va-h">Caring for a veteran? They can choose their caregiver.</h2>
<p>Many veterans would rather not have a stranger in their home. Through VA Community Care, Caring Companions can hire the family member or friend a veteran already trusts as their paid caregiver, or match them with one of ours.</p>
<ul class="cc-va-list">
<li><b>Starts with</b>A referral from their VA doctor to Caring Companions</li>
<li><b>We help</b>With the VA paperwork, from start to finish</li>
<li><b>Paid weekly</b>The family member or friend works for us and is paid every week</li>
</ul>
<div class="cc-va-btns">
<a class="cc-va-go" href="/veterans?from={tag}">See how it works</a>
<a class="cc-va-call" href="tel:+14172348494">Call (417) 234-8494</a>
</div>
<p class="cc-va-fine">Care must be authorized by the VA. Background checks and orientation are required for every caregiver.</p>
</div>
</section>
'''
done = 0
for f in sorted(glob.glob('home-care-in-*.html')):
    s = open(f).read()
    if 'http-equiv="refresh"' in s or MARK in s: continue
    town = html.unescape(re.search(r'<p class="nh-kick">Home Care in (.+?), Missouri</p>', s).group(1))
    slug = f[len('home-care-in-'):-len('-mo.html')]
    anchor = '<section style="max-width:940px;margin:0 auto;padding:30px 24px">'
    assert s.count(anchor) == 1, f
    s = s.replace(anchor, box(town, 'town-' + slug) + '\n' + anchor)
    open(f, 'w').write(s); done += 1
for f in sorted(glob.glob('counties/*.html')):
    s = open(f).read()
    if MARK in s or '<section class="cty-body">' not in s: continue
    name = f.split('/')[-1][:-5]
    county = name.capitalize() + ' County'
    s = s.replace('<section class="cty-body">', box(county, 'county-' + name) + '\n<section class="cty-body">', 1)
    open(f, 'w').write(s); done += 1
print('pages changed:', done)
