# Builds everything under the hero on /resource-library (Family Guides): "Start where you are" tiles,
# the Watch section, every written guide plus every live video page as cards, Family Care Academy and
# the talk-to-us band. All written straight into the page so Google and AI tools can read it.
# Topic buttons and search still work (small script at the end).
# Guides: tools/library-guides.json. Videos: videos/data/<id>.json once they have a youtube_id.
# Run after tools/build-video-pages.py:  python3 tools/build-resource-library.py [--preview]
# --preview also shows videos that are not public yet (for checking only; never commit a preview build).
import datetime, glob, html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://mo-care.com'
PREVIEW = '--preview' in sys.argv
E = lambda s: html.escape(s or '', quote=True)
slug = lambda s: re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", ''))).strip('-')   # same as build-video-pages.py

CATS = ['All', 'Videos', 'Choosing Care', 'Dementia & Memory', 'Chronic Conditions', 'Falls & Mobility', 'Hospital & Recovery',
        'Medication', 'Caregiver Support', 'Nutrition', 'End-of-Life', 'Payment & Benefits']
ICON = {'Dementia & Memory': 'i-heart-honey', 'Chronic Conditions': 'i-steth', 'Falls & Mobility': 'i-home', 'Hospital & Recovery': 'i-hospital',
        'Medication': 'i-pill', 'Caregiver Support': 'i-family', 'Nutrition': 'i-sprout', 'End-of-Life': 'i-doc',
        'Payment & Benefits': 'i-money', 'Choosing Care': 'i-compass', 'Videos': 'i-video'}
VIDEO_CAT = {'cc01': 'Choosing Care', 'cc02': 'Payment & Benefits', 'cc03': 'Payment & Benefits', 'cc04': 'Payment & Benefits',
             'cc05': 'Dementia & Memory', 'cc06': 'Dementia & Memory', 'cc07': 'Choosing Care', 'cc08': 'Choosing Care',
             'cc09': 'Falls & Mobility', 'cc10': 'Hospital & Recovery', 'cc11': 'Choosing Care', 'cc12': 'Choosing Care', 'cc13': 'Caregiver Support'}

# "Start where you are": the situation a family is in, then the 3 reads that help most. Links must be live pages.
SITUATIONS = [
    ('i-eye', 'Something seems off with Mom or Dad', [
        ('/guides/dementia-and-alzheimers', 'Early signs of dementia'),
        ('/guides/eating-well-as-we-age', 'Eating less, losing weight'),
        ('/guides/fall-prevention-at-home', 'Unsteady on their feet')]),
    ('i-hospital', 'Coming home from the hospital', [
        ('/guides/hospital-discharge', 'The first 72 hours home'),
        ('/guides/medication-management', 'Keeping new medicines straight'),
        ('/guides/stroke-recovery-at-home', 'Recovering after a stroke')]),
    ('i-heart-honey', 'Living with memory loss', [
        ('/guides/best-practices-for-dementia-care', 'Routines that calm the day'),
        ('/guides/dementia-and-alzheimers', 'What changes, and when to see a doctor'),
        ('/care-paths/dementia', 'Dementia care at home')]),
    ('i-home', 'Making the house safer', [
        ('/guides/home-safety-room-by-room', 'Room-by-room safety check'),
        ('/guides/fall-prevention-at-home', 'Preventing falls'),
        ('/guides/parkinsons-disease-at-home', 'Parkinson’s at home')]),
    ('i-money', 'Figuring out how to pay for care', [
        ('/pricing', 'What home care costs'),
        ('/guides/va-benefits-for-home-care', 'VA benefits for home care'),
        ('/guides/missouri-medicaid-hcbs', 'Missouri Medicaid, explained')]),
    ('i-family', 'You’re worn out', [
        ('/guides/caregiver-burnout', 'Signs of burnout, and what helps'),
        ('/services/respite-care', 'Getting a real break'),
        ('/family-academy', 'Family Care Academy')]),
]

def minutes(href):
    """Reading time from the guide page itself (about 200 words a minute)."""
    p = os.path.join(ROOT, href.strip('/') + '.html')
    try: s = open(p, encoding='utf-8').read()
    except OSError: return 0
    s = re.sub(r'<script.*?</script>|<style.*?</style>|<header.*?</header>|<footer.*?</footer>|<nav.*?</nav>', ' ', s, flags=re.S)
    m = re.search(r'<main.*?</main>', s, re.S)
    words = len(re.sub(r'<[^>]+>', ' ', m.group(0) if m else s).split())
    return max(2, round(words / 200))

def icon(name, cls='rl-ico'):
    return '<span class="%s" aria-hidden="true"><svg><use href="/assets/icons.svg#%s"/></svg></span>' % (cls, name)

def guide_card(g):
    mins = minutes(g['href'])
    inside = ''.join('<li>%s</li>' % E(i) for i in g.get('inside', []))
    return ('<a class="rl-card" href="%s" data-cat="%s" data-text="%s">'
            '<span class="rl-top">%s<span class="rl-cat">%s</span></span>'
            '<span class="rl-title">%s</span><span class="rl-desc">%s</span>%s'
            '<span class="rl-foot"><span>%s</span><span class="rl-read">Read <b aria-hidden="true">&rarr;</b></span></span></a>'
            % (E(g['href']), E(g['category']), E((g['title'] + ' ' + g['desc'] + ' ' + g['category'] + ' ' + ' '.join(g.get('inside', []))).lower()),
               icon(ICON.get(g['category'], 'i-book')), E(g['category']), E(g['title']), E(g['desc']),
               ('<ul class="rl-inside">%s</ul>' % inside) if inside else '',
               ('%d min read' % mins) if mins else 'Guide'))

def video_card(v):
    cat = VIDEO_CAT.get(v['id'], 'Choosing Care')
    desc = v['description'] if len(v['description']) <= 150 else v['description'][:147].rsplit(' ', 1)[0] + '...'
    return ('<a class="rl-card rl-video" href="/videos/%s" data-cat="Videos|%s" data-text="%s"><span class="rl-thumb"><img src="/assets/videos/thumbs/%s.jpg" alt="" width="1280" height="720" loading="lazy">'
            '<span class="rl-play" aria-hidden="true"></span></span><span class="rl-top">%s<span class="rl-cat">Video &middot; %s</span></span>'
            '<span class="rl-title">%s</span><span class="rl-desc">%s</span>'
            '<span class="rl-foot"><span>With Samantha Troutman, owner</span><span class="rl-read">Watch <b aria-hidden="true">&rarr;</b></span></span></a>'
            % (slug(v['short_title']), E(cat), E(('video ' + v['title'] + ' ' + desc + ' ' + cat).lower()), v['id'],
               icon('i-video'), E(cat), E(v['title']), E(desc)))

def nice_date(iso):
    d = datetime.datetime.strptime(iso[:10], '%Y-%m-%d')
    return d.strftime('%A, %B ') + str(d.day)

def main():
    guides = json.load(open(os.path.join(ROOT, 'tools', 'library-guides.json'), encoding='utf-8'))
    vids, upcoming = [], []
    for f in sorted(glob.glob(os.path.join(ROOT, 'videos', 'data', '*.json'))):
        for v in json.load(open(f, encoding='utf-8')):
            (vids if (v.get('youtube_id') or PREVIEW) else upcoming).append(v)
    vids.sort(key=lambda v: v['publish'], reverse=True)   # newest video first
    upcoming.sort(key=lambda v: v['publish'])
    used = {'All'} | ({'Videos'} if vids else set()) | {g['category'] for g in guides} | {VIDEO_CAT.get(v['id'], 'Choosing Care') for v in vids}
    cats = [c for c in CATS if c in used]   # only topics that have something in them
    chips = ''.join('<button type="button" class="rl-cat-chip%s" aria-pressed="%s">%s</button>' % (' selected' if c == 'All' else '', 'true' if c == 'All' else 'false', E(c)) for c in cats)
    cards = ''.join(video_card(v) for v in vids) + ''.join(guide_card(g) for g in guides)

    tiles = ''.join('<div class="rl-sit">%s<h3>%s</h3><ul>%s</ul></div>'
                    % (icon(ic, 'rl-sit-ico'), E(t), ''.join('<li><a href="%s">%s</a></li>' % (E(h), E(n)) for h, n in links))
                    for ic, t, links in SITUATIONS)

    # Watch: the newest video page once there is one, otherwise the short "how it works" video. Then what's coming next.
    if vids:
        v = vids[0]
        latest = ('<a class="rl-latest" href="/videos/%s"><span class="rl-thumb"><img src="/assets/videos/thumbs/%s.jpg" alt="" width="1280" height="720" loading="lazy"><span class="rl-play" aria-hidden="true"></span></span>'
                  '<span class="rl-latest-k">Newest video</span><span class="rl-latest-t">%s</span></a>' % (slug(v['short_title']), v['id'], E(v['title'])))
        watch_media = latest
        watch_note = 'Every video has its own page with the main points written out, so you can read along or skip ahead.'
    else:
        watch_media = ('<div class="nh-video rl-vert"><video controls preload="none" playsinline poster="/assets/video/never-a-stranger-poster.jpg">'
                       '<source src="/assets/video/never-a-stranger.mp4" type="video/mp4">'
                       '<track kind="captions" src="/assets/video/never-a-stranger.vtt" srclang="en" label="English" default>'
                       'Your browser cannot play this video. Call us at (417) 234-8494 and we will walk you through it.</video>'
                       '<p>Dramatization. People shown are not actual clients or caregivers.</p></div>')
        watch_note = 'Under a minute: how you meet your caregiver before the first visit, and how we keep you in the loop after.'
    nxt = ''
    if upcoming:
        u = upcoming[0]
        nxt = ('<div class="rl-next">%s<div><p class="rl-next-k">Next video &middot; %s</p><p class="rl-next-t">%s</p>'
               '<p class="rl-next-s">New videos with Samantha every other week. Each one answers a question families ask us.</p></div></div>'
               % (icon('i-calendar', 'rl-sit-ico'), E(nice_date(u['publish'])), E(u['title'])))
    watch = ('<section class="rl-band rl-watch" id="watch"><div class="rl-wrap rl-watch-grid">%s<div>'
             '<p class="nh-kick">Watch</p><h2 class="rl-h2">%s</h2><p class="rl-lead">%s</p>%s</div></div></section>'
             % (watch_media, 'Videos from our family to yours' if vids else 'How care starts with us', watch_note, nxt))

    items = [{'@type': 'ListItem', 'position': n, 'url': SITE + '/videos/' + slug(v['short_title']), 'name': v['title']} for n, v in enumerate(vids, 1)]
    items += [{'@type': 'ListItem', 'position': len(items) + n, 'url': SITE + g['href'], 'name': g['title']} for n, g in enumerate(guides, 1)]
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Family Guides', 'url': SITE + '/resource-library',
                     'mainEntity': {'@type': 'ItemList', 'itemListElement': items}}, ensure_ascii=False, separators=(',', ':'))

    block = ('<!-- library:start (built by tools/build-resource-library.py; edit that file or tools/library-guides.json, not this) -->\n'
             '<section class="rl-band" id="start"><div class="rl-wrap"><p class="nh-kick">Start where you are</p>'
             '<h2 class="rl-h2">What’s going on with your family right now?</h2>'
             '<p class="rl-lead">Pick the one closest to home. Each has the three reads that help most first.</p>'
             '<div class="rl-sits">' + tiles + '</div></div></section>\n'
             + watch + '\n'
             '<section class="rl-band" id="all-guides"><div class="rl-wrap"><div class="rl-head"><div><p class="nh-kick">Every guide</p>'
             '<h2 class="rl-h2">All Family Guides</h2></div>'
             '<label class="rl-search">' + icon('i-search', 'rl-search-ico') + '<input id="query" type="search" aria-label="Search the guides" placeholder="Search, like falls, Medicaid or dementia"></label></div>'
             '<div class="rl-chips" id="category-chips" role="group" aria-label="Topics">' + chips + '</div>'
             '<div class="rl-grid" id="guide-grid">' + cards + '</div>\n'
             '<p id="no-results" class="rl-none" hidden>Nothing matches “<span id="no-results-term"></span>” yet. Try a different word, or <a href="/contact">ask us</a> and a coordinator will help.</p>'
             '</div></section>\n'
             '<section class="rl-band"><div class="rl-wrap"><a class="rl-academy" href="/family-academy">' + icon('i-grad', 'rl-sit-ico') +
             '<span><b>Family Care Academy</b><span>Free short lessons for family caregivers: dementia, when Mom or Dad needs more help, and hands-on care skills.</span></span>'
             '<span class="rl-read">Start learning <b aria-hidden="true">&rarr;</b></span></a></div></section>\n'
             '<section class="rl-talk"><div class="rl-wrap rl-talk-in"><div><h2>Rather talk it through?</h2>'
             '<p>Reading only goes so far. Call and a real person answers, day or night. No pressure to decide anything.</p></div>'
             '<div class="rl-talk-btns"><a class="nh-go" href="tel:14172348494">Call (417) 234-8494</a><a class="rl-ghost-light" href="/contact">Send us a message</a></div></div></section>\n'
             '<script type="application/ld+json">' + ld + '</script>\n'
             '<script>\n(function () {\n  var chips = document.querySelectorAll(\'.rl-cat-chip\'), cards = document.querySelectorAll(\'#guide-grid .rl-card\'), q = document.getElementById(\'query\'), cat = \'All\';\n'
             '  function render() {\n    var t = (q.value || \'\').trim().toLowerCase(), shown = 0;\n'
             '    cards.forEach(function (c) { var ok = (cat === \'All\' || c.getAttribute(\'data-cat\').split(\'|\').indexOf(cat) !== -1) && (!t || c.getAttribute(\'data-text\').indexOf(t) !== -1); c.hidden = !ok; if (ok) shown++; });\n'
             '    document.getElementById(\'no-results\').hidden = shown > 0; document.getElementById(\'no-results-term\').textContent = q.value;\n  }\n'
             '  chips.forEach(function (b) { b.addEventListener(\'click\', function () { cat = b.textContent; chips.forEach(function (x) { var on = x === b; x.classList.toggle(\'selected\', on); x.setAttribute(\'aria-pressed\', on ? \'true\' : \'false\'); }); render(); }); });\n'
             '  q.addEventListener(\'input\', render);\n  var h = (location.hash || \'\').slice(1).toLowerCase(); chips.forEach(function (b) { if (h && b.textContent.toLowerCase().replace(/[^a-z]+/g, \'-\') === h) { b.click(); document.getElementById(\'all-guides\').scrollIntoView(); } });\n})();\n</script>\n'
             '<!-- library:end -->')
    path = os.path.join(ROOT, 'resource-library.html')
    page = open(path, encoding='utf-8').read()
    page = re.sub(r'<!-- library:start.*?<!-- library:end -->', lambda _: block, page, count=1, flags=re.S)
    open(path, 'w', encoding='utf-8').write(page)
    print('library: %d videos, %d guides, next video %s%s' % (len(vids), len(guides), upcoming[0]['id'] if upcoming else 'none', ' (PREVIEW, do not commit)' if PREVIEW else ''))

if __name__ == '__main__':
    main()
