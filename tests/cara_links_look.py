"""Ask Cara links open the chat (2026-11-06, her pick).
The menu, footer and page buttons used to go to the full consultation page (/cara), which never reaches the office.
Serves the site from disk at a fake host and checks:
 1. on a computer, Ask Cara links (menu, footer, page buttons, ../cara from subfolders) open the chat on the same page
 2. on a phone, the same links stay on the page and do not show the chat (they start a text to the office line)
 3. /contact#ask-cara opens the chat; pages without the chat send their links there
Run: python3 tests/cara_links_look.py  (no server needed)"""
import pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIME = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg'}
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)
def serve(route):
    u = route.request.url
    if not u.startswith('http://site.local/'): return route.abort()
    path = u.split('http://site.local/', 1)[1].split('?')[0].split('#')[0] or 'index.html'
    f = ROOT / path
    if f.is_dir(): f = f / 'index.html'
    if not f.is_file() and (ROOT / (path.rstrip('/') + '.html')).is_file(): f = ROOT / (path.rstrip('/') + '.html')
    if not f.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=f.read_bytes(), content_type=MIME.get(f.suffix, 'application/octet-stream'))

with sync_playwright() as p:
    b = p.chromium.launch()
    def open_page(path, phone=False):
        pg = b.new_page(viewport={'width': 390, 'height': 800} if phone else {'width': 1280, 'height': 900}, is_mobile=phone, has_touch=phone)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
        pg.route('**/*', serve); pg.goto('http://site.local/' + path); pg.wait_for_timeout(900)
        return pg, errs
    shown = lambda pg: pg.evaluate("getComputedStyle(document.getElementById('cara-widget-panel')).display") == 'flex'
    def click_link(pg, sel, text):
        loc = pg.locator(sel, has_text=text).first
        loc.evaluate('a => a.click()'); pg.wait_for_timeout(300)

    for path, sel, text, what in [
        ('contact', 'footer a[href$="cara"], a[href$="cara"]', 'Ask Cara', 'contact page Ask Cara link'),
        ('care-paths/dementia.html', 'a[href*="cara"]', 'Ask Cara a Follow-up', 'Ask Cara a Follow-up from a subfolder page'),
        ('counties/greene.html', 'a[href*="cara"]', 'Talk it through with Cara', 'county page Talk it through with Cara tile'),
        ('index.html', '.cc-dd-sub', 'Help with care questions', 'Resources menu Ask Cara'),
    ]:
        pg, errs = open_page(path)
        before = pg.url
        if sel == '.cc-dd-sub':
            pg.locator('a[href="/cara"]', has_text='Help with care questions').first.evaluate('a => a.click()'); pg.wait_for_timeout(300)
        else:
            click_link(pg, sel, text)
        check(shown(pg) and pg.url == before, 'computer: %s opens the chat on the same page' % what)
        check(not errs, 'computer: no page errors on %s %s' % (path, errs))
        pg.close()

    pg, errs = open_page('contact', phone=True)
    before = pg.url
    click_link(pg, 'a[href$="cara"]', 'Ask Cara')
    check(pg.url == before and not shown(pg), 'phone: Ask Cara link stays on the page (texts the office) and shows no chat')
    pg.close()

    pg, errs = open_page('contact#ask-cara')
    check(shown(pg), 'computer: /contact#ask-cara opens the chat')
    pg.close()
    for f in ['404.html', 'family.html', 'ambassadors/index.html', 'r/index.html', 'r/qr/index.html', 'refer-a-friend/index.html']:
        t = (ROOT / f).read_text()
        check('href="/cara"' not in t and 'href="/contact#ask-cara"' in t, '%s (no chat on it) sends Ask Cara to /contact#ask-cara' % f)
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
