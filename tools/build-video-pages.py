# Builds a web page for each long YouTube video: the video, a written version, chapters and the
# full transcript. Data: videos/data/<id>.json (exported from youtube/long/export_for_site.py, plus
# "youtube_id" once the video is public). A page is only built once its video has a youtube_id,
# unless --preview. Usage: python3 tools/build-video-pages.py [--preview]
import json, os, re, sys, glob, html, datetime as D
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://mo-care.com'
PREVIEW = '--preview' in sys.argv
TEMPLATE = open(os.path.join(ROOT, 'guides', 'fall-prevention-at-home.html'), encoding='utf-8').read()
E = lambda s: html.escape(s or '', quote=True)
P = lambda s: '<p style="font-size:max(15.5px, var(--fs-read, 0px));line-height:1.75;color:#2c3d4d;margin:0 0 16px">%s</p>' % E(s)
H2 = lambda s, i: '<h2 id="%s" style="font-family:\'Source Serif 4\',Georgia,serif;font-size:22px;font-weight:600;margin:40px 0 16px;color:#0D365F">%s</h2>' % (i, E(s))
RELATED = {'cc01': [('../getting-started', 'Getting started with home care'), ('../services/companion-care', 'Wellness Care'), ('../before-your-assessment', 'Questions families ask')]}
def slug(s): return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')
def drop_self_intro(t): return re.sub(r"\s*I'm Samantha with Caring Companions[^.]*\.", '', t).strip()
def body_of(part):
    t = drop_self_intro(part['text'])
    first, _, rest = t.partition('. ')
    if rest and part.get('head') and part['head'].lower().rstrip('.') in first.lower(): t = rest  # "Number one: the kitchen." under its own heading
    return t
def build(v):
    when = D.datetime.fromisoformat(v['publish'].replace('Z', '+00:00')).astimezone(D.timezone(D.timedelta(hours=-6)))
    datestr = when.strftime('%B %-d, %Y'); iso = when.date().isoformat()
    s = slug(v['short_title']); url = '%s/videos/%s' % (SITE, s)
    parts = [p for p in v['parts'] if p.get('chip')]
    lead = drop_self_intro(parts[0]['text'])
    sections = []; heads = []
    for i, p in enumerate(parts[1:], 1):
        head = (p['chip'] + ': ' + p['head']) if re.match(r'(Sign|Step|Tip) \d+ of \d+', p['chip'] or '') else p['head']
        if p['chip'] == 'One more' and p['head'] == 'You': head = 'One more sign: you'
        sections.append(H2(head, 's%d' % i) + P(body_of(p)))
        heads.append((i, head))
    transcript = ' '.join(drop_self_intro(p['text']) if i else p['text'] for i, p in enumerate(v['parts']))
    yt = v.get('youtube_id')
    if yt:
        media = ('<div style="position:relative;padding-top:56.25%%;border-radius:14px;overflow:hidden;background:#0D365F">'
                 '<iframe src="https://www.youtube-nocookie.com/embed/%s" title="%s" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen '
                 'style="position:absolute;inset:0;width:100%%;height:100%%;border:0"></iframe></div>') % (E(yt), E(v['title']))
    else:
        media = ('<figure style="margin:0"><img src="/assets/videos/thumbs/%s.jpg" alt="%s" width="1280" height="720" style="width:100%%;height:auto;border-radius:14px;display:block">'
                 '<figcaption style="font-size:13px;color:#4f5b54;margin-top:8px">Preview only: the video goes live on YouTube on %s.</figcaption></figure>') % (v['id'], E(v['title']), datestr)
    chapters = ''.join('<li><strong>%s</strong> %s</li>' % (E(t), E(n)) for t, n in v['chapters'])
    main = ('<div class="cc-breadcrumb"><p style="font-size:max(13px, var(--fs-read, 0px));color:#4f5b54;margin:0"><a href="/videos" style="text-decoration:none">Videos</a> &rsaquo; <span style="color:#45566a">%s</span></p></div>\n'
            '<section class="guide-hero"><p style="font-size:max(13px, var(--fs-min, 0px));font-weight:600;color:#876B00;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 14px">Video</p>'
            '<h1 class="guide-h1">%s</h1>'
            '<p style="font-size:max(13.5px, var(--fs-read, 0px));color:#4f5b54;margin:0">By Samantha Troutman, owner of Caring Companions &middot; %s</p></section>\n'
            '<section class="guide-body"><article style="max-width:840px">%s\n<div style="height:24px"></div>\n%s\n%s\n'
            '<div style="background:#fbf6ec;border:1px solid #e8dcc4;border-radius:12px;padding:20px;margin:36px 0"><p style="font-family:\'Source Serif 4\',Georgia,serif;font-size:20px;font-weight:600;color:#0D365F;margin:0 0 8px">%s</p>'
            '<p style="font-size:max(15px, var(--fs-read, 0px));line-height:1.7;color:#2c3d4d;margin:0 0 14px">Call <a href="tel:14172348494" style="font-weight:600">(417) 234-8494</a>. We serve families in Springfield and across southwest Missouri.</p>'
            '<a href="/book" style="display:inline-block;background:#14606F;color:#fff;border-radius:8px;padding:11px 18px;font-weight:600;text-decoration:none">Book a free in-home assessment</a></div>\n'
            '<details style="border:1px solid #e4e1d8;border-radius:12px;padding:16px 18px;margin:0 0 14px"><summary style="cursor:pointer;font-weight:600;color:#0D365F">Chapters</summary><ul style="margin:12px 0 0;padding-left:18px;line-height:1.8;color:#2c3d4d">%s</ul></details>\n'
            '<details style="border:1px solid #e4e1d8;border-radius:12px;padding:16px 18px"><summary style="cursor:pointer;font-weight:600;color:#0D365F">Read the full transcript</summary><p style="font-size:max(15px, var(--fs-read, 0px));line-height:1.75;color:#2c3d4d;margin:12px 0 0">%s</p></details>\n'
            '</article>') % (E(v['short_title'].capitalize()), E(v['title']), datestr, media, P(lead), '\n'.join(sections), E(v.get('end') or ''), chapters, E(transcript))
    aside = TEMPLATE[TEMPLATE.index('<aside'):TEMPLATE.index('</aside>') + 8]
    rel = ''.join('<a href="%s" style="display:block;font-size:max(13.5px, var(--fs-min, 0px));color:#2c3d4d;padding:6px 0;border-bottom:1px solid #ede9e0;text-decoration:none">%s</a>' % (h, E(t)) for h, t in RELATED.get(v['id'], []))
    aside = re.sub(r'(<p[^>]*>Related</p>\n?)(.*?)(\n?</div>)', lambda m: m.group(1) + rel + m.group(3), aside, count=1, flags=re.S)
    toc = ''.join('<a href="#s%d" style="display:block;font-size:max(13px, var(--fs-min, 0px));color:#2c3d4d;padding:5px 0;text-decoration:none">%s</a>' % (i, E(h)) for i, h in heads)
    aside = re.sub(r'(<p[^>]*>On this page</p>\n?)(.*?)(\n?</div>)', lambda m: m.group(1) + toc + m.group(3), aside, count=1, flags=re.S)
    page = TEMPLATE[:TEMPLATE.index('<div class="cc-breadcrumb">')] + main + '\n' + aside + TEMPLATE[TEMPLATE.index('</aside>') + 8:]
    page = page.replace('../', '/')
    desc = v['description'][:155].rsplit(' ', 1)[0] if len(v['description']) > 158 else v['description']
    head_sub = [(r'<title>.*?</title>', '<title>%s | Caring Companions</title>' % E(v['short_title'].capitalize())),
                (r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % url),
                (r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % E(desc)),
                (r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="%s">' % E(v['title'])),
                (r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="%s">' % E(desc)),
                (r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="%s">' % url),
                (r'<meta property="og:image" content="[^"]*">', '<meta property="og:image" content="%s/assets/videos/thumbs/%s.jpg">' % (SITE, v['id']))]
    for a, b in head_sub: page = re.sub(a, lambda m: b, page, count=1)
    page = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', '', page, flags=re.S)
    graph = [{'@type': 'Article', 'headline': v['title'][:110], 'datePublished': iso, 'image': '%s/assets/videos/thumbs/%s.jpg' % (SITE, v['id']),
              'author': {'@type': 'Person', 'name': 'Samantha Troutman', 'jobTitle': 'Owner'}, 'publisher': {'@type': 'Organization', 'name': 'Caring Companions In-Home Senior Care', 'url': SITE + '/'}, 'mainEntityOfPage': url}]
    if yt: graph.append({'@type': 'VideoObject', 'name': v['title'], 'description': v['description'], 'uploadDate': iso, 'thumbnailUrl': '%s/assets/videos/thumbs/%s.jpg' % (SITE, v['id']),
                         'embedUrl': 'https://www.youtube.com/embed/' + yt, 'contentUrl': 'https://www.youtube.com/watch?v=' + yt})
    page = page.replace('</head>', '<script type="application/ld+json">%s</script>\n</head>' % json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')), 1)
    out = os.path.join(ROOT, 'videos', s + '.html'); open(out, 'w', encoding='utf-8').write(page); return out
for f in sorted(glob.glob(os.path.join(ROOT, 'videos', 'data', '*.json'))):
    for v in json.load(open(f, encoding='utf-8')) if f.endswith('.json') else []:
        if v.get('youtube_id') or PREVIEW: print('built', build(v))
        else: print('waiting for video', v['id'], v['publish'])
