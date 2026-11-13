# Writes the 8 "home care for X" guides (content in tools/care-guides.py) into their existing pages
# under guides/. Keeps each page's header, photo, footer and address; replaces the title, meta,
# hero words, article and "On this page" list. Also updates tools/library-guides.json cards.
# Run: python3 tools/build-care-guides.py   then   python3 tools/build-resource-library.py
import html, json, os, re, runpy
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = runpy.run_path(os.path.join(ROOT, 'tools', 'care-guides.py'))
GUIDES, SRC = DATA['GUIDES'], DATA['SRC']
E = lambda s: html.escape(s, quote=True)
BYLINE = 'Written by the Caring Companions team in Springfield &middot; Updated November 2026'
MODIFIED = '2026-11-11'

STYLE = '''<style id="cg-style">
.cg { max-width: 760px; }
.cg p, .cg li { font-size: max(16.5px, var(--fs-read, 0px)); line-height: 1.75; color: #2c3d4d; }
.cg p { margin: 0 0 16px; }
.cg .cg-intro p:first-child { font-size: max(18px, var(--fs-read, 0px)); color: #16283a; }
.cg h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: 26px; line-height: 1.25; font-weight: 600; color: #0D365F; margin: 44px 0 14px; scroll-margin-top: 90px; }
.cg ul.cg-list { margin: 0 0 16px; padding: 0 0 0 4px; list-style: none; }
.cg ul.cg-list li { position: relative; padding-left: 26px; margin: 0 0 10px; }
.cg ul.cg-list li::before { content: ""; position: absolute; left: 4px; top: 11px; width: 8px; height: 8px; border-radius: 50%; background: #1F7A8C; }
.cg-week { background: #EAF4F6; border-radius: 16px; padding: 22px 24px; margin: 8px 0 16px; }
.cg-week .cg-when { font-weight: 700; color: #0D365F; margin: 0 0 10px; }
.cg-week ol { margin: 0; padding-left: 22px; }
.cg-week li { margin: 0 0 6px; }
.cg-note { font-size: max(15px, var(--fs-read, 0px)) !important; color: #55677a !important; }
.cg-two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 8px 0 12px; }
.cg-box { background: #fff; border: 1px solid #e4e1d8; border-radius: 16px; padding: 20px 20px 10px; }
.cg-box h3 { font-size: 17px; font-weight: 700; margin: 0 0 12px; color: #0D365F; }
.cg-box ul { list-style: none; margin: 0; padding: 0; }
.cg-box li { position: relative; padding-left: 28px; margin: 0 0 10px; font-size: max(15.5px, var(--fs-read, 0px)) !important; line-height: 1.55 !important; }
.cg-yes li::before { content: ""; position: absolute; left: 3px; top: 6px; width: 11px; height: 6px; border-left: 2.5px solid #1F7A8C; border-bottom: 2.5px solid #1F7A8C; transform: rotate(-45deg); }
.cg-no li::before, .cg-no li::after { content: ""; position: absolute; left: 3px; top: 11px; width: 13px; height: 2.5px; background: #9a5a12; transform: rotate(45deg); }
.cg-no li::after { transform: rotate(-45deg); }
.cg-call { border-radius: 16px; padding: 20px 22px 8px; margin: 0 0 14px; }
.cg-call h3 { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
.cg-call ul { margin: 0 0 10px; padding-left: 20px; }
.cg-call li { margin: 0 0 6px; font-size: max(15.5px, var(--fs-read, 0px)) !important; line-height: 1.55 !important; }
.cg-doc { background: #FDF6EA; border: 1px solid #F0D9AE; }
.cg-doc h3 { color: #8a560c; }
.cg-911 { background: #FCEDEB; border: 1px solid #F1C9C3; }
.cg-911 h3 { color: #9b2c1f; }
.cg-tell { background: #fff; border: 2px dashed #9cc8d0; border-radius: 16px; padding: 20px 24px 8px; }
.cg-tell ol { padding-left: 22px; margin: 0 0 12px; }
.cg-tell li { margin: 0 0 6px; }
.cg-print { background: none; border: 1.5px solid #1F7A8C; color: #1F7A8C; border-radius: 999px; padding: 8px 16px; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; margin: 0 0 14px; }
.cg-local { background: #f6f5f0; border-radius: 16px; padding: 20px 22px 6px; }
.cg-cost { background: #fff; border-left: 4px solid #1F7A8C; border-radius: 0 12px 12px 0; padding: 14px 18px; }
.cg-cta { background: #14606F; color: #fff; border-radius: 18px; padding: 26px 26px 22px; margin: 36px 0 10px; }
.cg-cta h2 { color: #fff; margin: 0 0 8px; font-size: 25px; }
.cg-cta p { color: #E3F1F3 !important; }
.cg-cta a.nh-go { background: #F0A63A; color: #16283a; display: inline-block; margin: 4px 10px 6px 0; }
.cg-cta a.cg-light { display: inline-block; border: 2px solid #fff; color: #fff; border-radius: 999px; padding: 14px 24px; font-weight: 700; text-decoration: none; }
.cg-src p, .cg-src li { font-size: max(13.5px, var(--fs-min, 0px)) !important; color: #55677a !important; line-height: 1.6 !important; }
.cg-src ul { padding-left: 18px; margin: 0; }
.cg-src a { color: #1F7A8C; }
@media (max-width: 719px) { .cg-two { grid-template-columns: 1fr; } .cg h2 { font-size: 23px; } }
@media print { .cc-header, .cc-utility, .nh-hero, .guide-aside, footer, .cg-cta, .cg-print, .cc-breadcrumb { display: none !important; } }
</style>'''

def bullets(lines, cls='cg-list'):
    return '<ul class="%s">%s</ul>' % (cls, ''.join('<li>%s</li>' % l for l in lines))

def section_html(items):
    out, lis = [], []
    for it in items:
        kind, text = it.split(':', 1)
        if kind == 'li':
            lis.append(text); continue
        if lis: out.append(bullets(lis)); lis = []
        out.append('<p>%s</p>' % text)
    if lis: out.append(bullets(lis))
    return ''.join(out)

LOCAL = {
 'general': ('Help in Springfield besides us', '<p><b>SeniorAge</b> is the Area Agency on Aging for southwest Missouri. They can point you to meals, rides, legal help, caregiver support and respite in your county: (417) 862-0762. Our <a href="/sw-missouri-caregiver-resources">Southwest Missouri caregiver resources</a> page lists more local help.</p>'),
 'meals': ('Help in Springfield besides us', '<p><b>SeniorAge</b>, the Area Agency on Aging for southwest Missouri, runs home-delivered meals and senior-center lunches across the region, plus rides and caregiver support: (417) 862-0762. Our <a href="/sw-missouri-caregiver-resources">Southwest Missouri caregiver resources</a> page lists more local help.</p>'),
}

def article(g):
    toc, a = [], ['<article class="cg">', '<div class="cg-intro">' + ''.join('<p>%s</p>' % p for p in g['intro']) + '</div>']
    for sid, head, items in g['sections']:
        toc.append((sid, head)); a.append('<h2 id="%s">%s</h2>%s' % (sid, head, section_html(items)))
    if g.get('week'):
        w = g['week']; toc.append(('a-week', 'A week of help'))
        a.append('<h2 id="a-week">What a week of help can look like</h2>'
                 '<div class="cg-week"><p class="cg-when">For example: %s</p><ol>%s</ol></div>'
                 '<p class="cg-note">This is an example. Every plan is built with your family at the assessment visit, and it can change as needs change.</p>'
                 % (w['when'], ''.join('<li>%s</li>' % i for i in w['items'])))
    toc.append(('do-dont', 'What we do, and don’t'))
    a.append('<h2 id="do-dont">What our caregivers do, and what they don’t</h2>'
             '<div class="cg-two"><div class="cg-box cg-yes"><h3>Our caregivers can</h3><ul>%s</ul></div>'
             '<div class="cg-box cg-no"><h3>Our caregivers don’t</h3><ul>%s</ul></div></div><p class="cg-note">%s</p>'
             % (''.join('<li>%s</li>' % i for i in g['do']), ''.join('<li>%s</li>' % i for i in g['dont']), g['dont_note']))
    toc.append(('when-to-call', 'When to call'))
    calls = '<h2 id="when-to-call">When to call</h2>'
    if g.get('pre911'): calls += '<p>%s</p>' % g['pre911']
    calls += '<div class="cg-call cg-doc"><h3>%s</h3><ul>%s</ul></div>' % (g.get('doctor_title', 'Call the doctor the same day'), ''.join('<li>%s</li>' % i for i in g['doctor']))
    if g.get('nine11'):
        calls += '<div class="cg-call cg-911"><h3>Call 911</h3><ul>%s</ul>%s</div>' % (''.join('<li>%s</li>' % i for i in g['nine11']), ('<p>%s</p>' % g['post911']) if g.get('post911') else '')
    else:
        calls += '<div class="cg-call cg-911"><h3>%s</h3><p>%s</p></div>' % (g['nine11_title'], g['nine11_text'])
    calls += '<p class="cg-note">%s</p>' % g.get('call_note', 'Always follow what their own doctor told you first. If a caregiver sees an emergency during a visit, they call 911 and then our office, and we call you.')
    a.append(calls)
    toc.append(('tell-us', 'What to tell us'))
    a.append('<h2 id="tell-us">What to tell us at the assessment visit</h2><div class="cg-tell"><p>Jot these down before we come. It helps us build the right plan the first time.</p>'
             '<button type="button" class="cg-print" onclick="window.print()">Print this page</button><ol>%s</ol></div>' % ''.join('<li>%s</li>' % i for i in g['tell']))
    lh, lb = LOCAL[g['local']]
    toc.append(('local-help', 'Local help'))
    a.append('<h2 id="local-help">%s</h2><div class="cg-local">%s</div>' % (lh, lb))
    a.append('<h2>What it costs</h2><p class="cg-cost">Care is $30 to $34 an hour, depending on how much hands-on help is needed. Visits are usually 4 hours or more, at least 8 hours a week, with no deposit and no long-term contract. <a href="/pricing">See our rates</a>.</p>')
    a.append('<div class="cg-cta"><h2>Want to talk it through?</h2><p>Call us and a real person answers, day or night. We can come to the house for a free in-home assessment and build a plan with you, with no pressure to decide anything.</p>'
             '<a class="nh-go" href="tel:14172348494">Call (417) 234-8494</a><a class="cg-light" href="/free-assessment">Request a free assessment</a></div>')
    if g['srcs']:
        a.append('<div class="cg-src"><p><b>Sources</b> for the health information on this page:</p><ul>%s</ul><p>This guide is general information from our team, not medical advice. Their own doctor knows them best.</p></div>'
                 % ''.join('<li><a href="%s" rel="noopener" target="_blank">%s</a></li>' % (E(SRC[k][1]), E(SRC[k][0])) for k in g['srcs']))
    else:
        a.append('<div class="cg-src"><p>This guide is general information from our team, not medical advice. Their own doctor and pharmacist know them best.</p></div>')
    a.append('</article>')
    return ''.join(a), toc

def build(g):
    p = os.path.join(ROOT, 'guides', g['slug'] + '.html')
    s = open(p, encoding='utf-8').read()
    t, d = g['title'], g['desc']
    def sub(pat, rep, s, n=1):
        s2, k = re.subn(pat, lambda _: rep, s, count=n, flags=re.S)
        assert k == n, (g['slug'], pat)
        return s2
    s = sub(r'<title>.*?</title>', '<title>%s | Caring Companions</title>' % E(t), s)
    s = sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % E(d), s)
    s = sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="%s | Caring Companions">' % E(t), s)
    s = sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="%s">' % E(d), s)
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    ld = json.loads(m.group(1))
    for node in ld.get('@graph', [ld]):
        if node.get('@type') == 'Article':
            node['headline'], node['description'], node['dateModified'] = t, d, MODIFIED
        if node.get('@type') == 'BreadcrumbList':
            node['itemListElement'][-1]['name'] = t
    s = s[:m.start(1)] + json.dumps(ld, ensure_ascii=False, separators=(',', ':')) + s[m.end(1):]
    s = re.sub(r'<style id="cg-style">.*?</style>\n?', '', s, flags=re.S)
    s = sub(r'</head>', STYLE + '\n</head>', s)
    s = re.sub(r'(<div class="cc-breadcrumb">.*?&rsaquo; <span[^>]*>)[^<]*(</span>)', lambda mm: mm.group(1) + E(t) + mm.group(2), s, count=1, flags=re.S)
    s = sub(r'<h1>.*?</h1>', '<h1>%s</h1>' % E(t), s)
    s = sub(r'<p class="nh-meta">.*?</p>', '<p class="nh-meta">%s</p>' % BYLINE, s)
    art, toc = article(g)
    s = sub(r'<article.*?</article>', art, s)
    links = ''.join('<a href="#%s" style="display:block;font-size:max(13px, var(--fs-min, 0px));color:#2c3d4d;padding:5px 0;text-decoration:none">%s</a>' % (i, h) for i, h in toc)
    s = re.sub(r'(On this page</p>\n)(?:<a href="#[^\n]*</a>\n)+', lambda mm: mm.group(1) + links + '\n', s, count=1)
    open(p, 'w', encoding='utf-8').write(s)

def main():
    for g in GUIDES: build(g)
    lp = os.path.join(ROOT, 'tools', 'library-guides.json')
    lib = json.load(open(lp, encoding='utf-8'))
    by = {'/guides/' + g['slug']: g for g in GUIDES}
    for x in lib:
        g = by.get(x['href'])
        if g: x['title'], x['desc'], x['inside'] = g['title'], g['card'], g['inside']
    json.dump(lib, open(lp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('built %d care guides' % len(GUIDES))

if __name__ == '__main__':
    main()
