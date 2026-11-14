#!/usr/bin/env python3
"""Keeps the two client documents on mo-care.com current (Samantha 2026-11-13: "make sure the client agreement and
client handbook is always current").

The Hub publishes the real ones, the same files the office prints and signs from:
    https://cc.mo-care.com/client-folders/18-client-care-agreement.pdf
    https://cc.mo-care.com/client-folders/16-client-handbook.pdf
This reads those two and, when either has changed since the last time, rewrites the website copy:
    assets/docs/caring-companions-client-care-agreement-sample.pdf   the agreement with the yellow "sample for reading
                                                                     only" band across the top of every page
    assets/docs/caring-companions-client-handbook.pdf                the handbook, as it is
and moves the ?v= on every link to it, so nobody is shown an old copy from their browser's memory.
assets/docs/client-docs.json records which Hub file each website copy was made from.

It refuses to publish anything that is not plainly the right document (not a PDF, too few pages, wrong title), so a
broken or missing Hub file can never replace a good one on the website.

    python3 tools/build-client-docs.py           write what changed
    python3 tools/build-client-docs.py --check   say whether the website is current; change nothing (exit 1 if not)

.github/workflows/client-docs.yml runs it every morning. Needs PyMuPDF (pip install pymupdf)."""
import datetime as dt, glob, hashlib, json, os, re, sys, urllib.request
import fitz

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
HUB = os.environ.get('CLIENT_DOCS_SOURCE', 'https://cc.mo-care.com/client-folders')
MANIFEST = os.path.join(ROOT, 'assets/docs/client-docs.json')
CHECK = '--check' in sys.argv
BAND = "SAMPLE FOR READING ONLY. Please don't fill in or sign. We go through your agreement with you in person."
YELLOW, NAVY = (0.96, 0.82, 0.38), (0.051, 0.212, 0.373)
DOCS = [
    dict(key='agreement', source='18-client-care-agreement.pdf', out='assets/docs/caring-companions-client-care-agreement-sample.pdf',
         title_has='Client Care Agreement', min_pages=15, sample=True),
    dict(key='handbook', source='16-client-handbook.pdf', out='assets/docs/caring-companions-client-handbook.pdf',
         title_has='Client Handbook', min_pages=10, sample=False),
]

def fetch(name):
    src = HUB.rstrip('/') + '/' + name
    if src.startswith('http'):
        req = urllib.request.Request(src, headers={'User-Agent': 'cc-website-client-docs/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    return open(src, 'rb').read()

def looks_right(data, d):
    """the reasons this is NOT the document, or [] when it is"""
    why = []
    if not data.startswith(b'%PDF-'): return ['it is not a PDF']
    try: doc = fitz.open(stream=data, filetype='pdf')
    except Exception as e: return ['it would not open: ' + str(e)[:80]]
    if len(doc) < d['min_pages']: why.append('only %d pages' % len(doc))
    first = doc[0].get_text() if len(doc) else ''
    if d['title_has'].lower() not in first.lower(): why.append('page 1 does not say "%s"' % d['title_has'])
    return why

def sample_of(data):
    """the agreement with the sample band on every page"""
    doc = fitz.open(stream=data, filetype='pdf')
    for page in doc:
        w = page.rect.width
        page.draw_rect(fitz.Rect(0, 0, w, 20), color=None, fill=YELLOW, width=0)
        tw = fitz.get_text_length(BAND, fontname='helv', fontsize=8.5)
        page.insert_text(((w - tw) / 2, 14.14), BAND, fontname='helv', fontsize=8.5, color=NAVY)
    doc.set_metadata({'title': 'Caring Companions Client Care Agreement Sample', 'author': 'Caring Companions In-Home Senior Care'})
    out = doc.tobytes(garbage=3, deflate=True)
    back = fitz.open(stream=out, filetype='pdf')
    assert len(back) == len(doc) and all(BAND in p.get_text() for p in back), 'the sample band is not on every page'
    return out, len(back)

def bump_links(out_rel, v):
    name = re.escape(os.path.basename(out_rel)); n = 0
    for f in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True):
        t = open(f, encoding='utf-8').read()
        t2 = re.sub(name + r'(\?v=[0-9a-z]+)?(?=")', os.path.basename(out_rel) + '?v=' + v, t)
        if t2 != t: open(f, 'w', encoding='utf-8').write(t2); n += 1
    return n

def main():
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=-6))).strftime('%Y%m%d')
    stale = changed = 0
    for d in DOCS:
        try: data = fetch(d['source'])
        except Exception as e:
            print('  ✗ %s: could not read the Hub copy (%s). The website copy is left as it is.' % (d['key'], str(e)[:100])); stale += 1; continue
        why = looks_right(data, d)
        if why:
            print('  ✗ %s: the Hub file does not look right (%s). The website copy is left as it is.' % (d['key'], '; '.join(why))); stale += 1; continue
        sha = hashlib.sha256(data).hexdigest()
        have = man.get(d['key'], {})
        if have.get('source_sha256') == sha and os.path.exists(os.path.join(ROOT, d['out'])):
            print('  ✓ %s: current (%d pages)' % (d['key'], have.get('pages', 0))); continue
        if CHECK:
            print('  ✗ %s: the website copy is NOT the current one' % d['key']); stale += 1; continue
        if d['sample']: out, pages = sample_of(data)
        else: out, pages = data, len(fitz.open(stream=data, filetype='pdf'))
        open(os.path.join(ROOT, d['out']), 'wb').write(out)
        n = bump_links(d['out'], today)
        man[d['key']] = {'source': HUB.rstrip('/') + '/' + d['source'] if HUB.startswith('http') else d['source'], 'source_sha256': sha, 'pages': pages, 'updated': today, 'website_file': d['out']}
        changed += 1
        print('  ✓ %s: updated to the current one (%d pages); links refreshed on %d pages' % (d['key'], pages, n))
    if changed:
        json.dump(man, open(MANIFEST, 'w'), indent=2); open(MANIFEST, 'a').write('\n')
    return 1 if stale else 0

if __name__ == '__main__':
    sys.exit(main())
