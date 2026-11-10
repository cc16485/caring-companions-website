# Builds the cards on /resource-library (the Aging at Home Library): every written guide plus every live
# video page, written straight into the page so Google and AI tools can read them (the old version drew
# the list with JavaScript, so search engines saw an empty page). Topic buttons and search still work.
# Guides: tools/library-guides.json. Videos: videos/data/<id>.json once they have a youtube_id.
# Run after tools/build-video-pages.py:  python3 tools/build-resource-library.py [--preview]
# --preview also shows videos that are not public yet (for checking only; never commit a preview build).
import glob, html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://mo-care.com'
PREVIEW = '--preview' in sys.argv
E = lambda s: html.escape(s or '', quote=True)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
slug = lambda s: re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", ''))).strip('-')   # same as build-video-pages.py

CATS = ['All', 'Videos', 'Choosing Care', 'Dementia & Memory', 'Chronic Conditions', 'Falls & Mobility', 'Hospital & Recovery',
        'Medication', 'Caregiver Support', 'Nutrition', 'End-of-Life', 'Payment & Benefits']
VIDEO_CAT = {'cc01': 'Choosing Care', 'cc02': 'Payment & Benefits', 'cc03': 'Payment & Benefits', 'cc04': 'Payment & Benefits',
             'cc05': 'Dementia & Memory', 'cc06': 'Dementia & Memory', 'cc07': 'Choosing Care', 'cc08': 'Choosing Care',
             'cc09': 'Falls & Mobility', 'cc10': 'Hospital & Recovery', 'cc11': 'Choosing Care', 'cc12': 'Choosing Care', 'cc13': 'Caregiver Support'}
BYLINE = 'Reviewed by a Caring Companions Care Coordinator'

def guide_card(g):
    return ('<a class="rl-card" href="%s" data-cat="%s" data-text="%s"><p class="rl-cat">%s</p><p class="rl-title">%s</p><p class="rl-desc">%s</p><p class="rl-by">%s</p></a>'
            % (E(g['href']), E(g['category']), E((g['title'] + ' ' + g['desc'] + ' ' + g['category']).lower()), E(g['category']), E(g['title']), E(g['desc']), BYLINE))

def video_card(v):
    cat = VIDEO_CAT.get(v['id'], 'Choosing Care')
    desc = v['description'] if len(v['description']) <= 150 else v['description'][:147].rsplit(' ', 1)[0] + '...'
    return ('<a class="rl-card rl-video" href="/videos/%s" data-cat="Videos|%s" data-text="%s"><span class="rl-thumb"><img src="/assets/videos/thumbs/%s.jpg" alt="" width="1280" height="720" loading="lazy">'
            '<span class="rl-play" aria-hidden="true"></span></span><p class="rl-cat">Video &middot; %s</p><p class="rl-title">%s</p><p class="rl-desc">%s</p><p class="rl-by">With Samantha Troutman, owner</p></a>'
            % (slug(v['short_title']), E(cat), E(('video ' + v['title'] + ' ' + desc + ' ' + cat).lower()), v['id'], E(cat), E(v['title']), E(desc)))

def main():
    guides = json.load(open(os.path.join(ROOT, 'tools', 'library-guides.json'), encoding='utf-8'))
    vids = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'videos', 'data', '*.json'))):
        for v in json.load(open(f, encoding='utf-8')):
            if v.get('youtube_id') or PREVIEW: vids.append(v)
    vids.sort(key=lambda v: v['publish'], reverse=True)   # newest video first
    used = {'All'} | ({'Videos'} if vids else set()) | {g['category'] for g in guides} | {VIDEO_CAT.get(v['id'], 'Choosing Care') for v in vids}
    cats = [c for c in CATS if c in used]   # only topics that have something in them
    chips = ''.join('<button type="button" class="rl-cat-chip%s" aria-pressed="%s">%s</button>' % (' selected' if c == 'All' else '', 'true' if c == 'All' else 'false', E(c)) for c in cats)
    cards = ''.join(video_card(v) for v in vids) + ''.join(guide_card(g) for g in guides)
    items = [{'@type': 'ListItem', 'position': n, 'url': SITE + '/videos/' + slug(v['short_title']), 'name': v['title']} for n, v in enumerate(vids, 1)]
    items += [{'@type': 'ListItem', 'position': len(items) + n, 'url': SITE + '/' + g['href'], 'name': g['title']} for n, g in enumerate(guides, 1)]
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'The Aging at Home Library', 'url': SITE + '/resource-library',
                     'mainEntity': {'@type': 'ItemList', 'itemListElement': items}}, ensure_ascii=False, separators=(',', ':'))
    block = ('<!-- library:start (built by tools/build-resource-library.py; edit tools/library-guides.json, not this) -->\n'
             '<section style="max-width:1240px;margin:0 auto;padding:0 24px 20px"><div class="rl-chips" id="category-chips" role="group" aria-label="Topics">%s</div></section>\n'
             '<section class="rl-grid-wrap"><div class="rl-grid" id="guide-grid">%s</div>\n'
             '<p id="no-results" hidden style="text-align:center;font-size:max(14.5px, var(--fs-read, 0px));color:#4f5b54;padding:40px 0">Nothing matches "<span id="no-results-term"></span>" yet. Try a different word, or <a href="cara">ask us</a>.</p>\n'
             '<script type="application/ld+json">%s</script>\n'
             '<script>\n(function () {\n  var chips = document.querySelectorAll(\'.rl-cat-chip\'), cards = document.querySelectorAll(\'#guide-grid .rl-card\'), q = document.getElementById(\'query\'), cat = \'All\';\n'
             '  function render() {\n    var t = (q.value || \'\').trim().toLowerCase(), shown = 0;\n'
             '    cards.forEach(function (c) { var ok = (cat === \'All\' || c.getAttribute(\'data-cat\').split(\'|\').indexOf(cat) !== -1) && (!t || c.getAttribute(\'data-text\').indexOf(t) !== -1); c.hidden = !ok; if (ok) shown++; });\n'
             '    document.getElementById(\'no-results\').hidden = shown > 0; document.getElementById(\'no-results-term\').textContent = q.value;\n  }\n'
             '  chips.forEach(function (b) { b.addEventListener(\'click\', function () { cat = b.textContent; chips.forEach(function (x) { var on = x === b; x.classList.toggle(\'selected\', on); x.setAttribute(\'aria-pressed\', on ? \'true\' : \'false\'); }); render(); }); });\n'
             '  q.addEventListener(\'input\', render);\n  var h = (location.hash || \'\').slice(1).toLowerCase(); chips.forEach(function (b) { if (h && b.textContent.toLowerCase().replace(/[^a-z]+/g, \'-\') === h) b.click(); });\n})();\n</script>\n'
             '<!-- library:end -->') % (chips, cards, ld)
    path = os.path.join(ROOT, 'resource-library.html')
    page = open(path, encoding='utf-8').read()
    page = re.sub(r'<!-- library:start.*?<!-- library:end -->', lambda _: block, page, count=1, flags=re.S)
    open(path, 'w', encoding='utf-8').write(page)
    print('library: %d videos, %d guides%s' % (len(vids), len(guides), ' (PREVIEW, do not commit)' if PREVIEW else ''))

if __name__ == '__main__':
    main()
