"""Privacy Policy page (2026-11-05: mo-care.com had no privacy page, though it texts families and caregivers; carriers want one
with the texting terms). The page carries the carrier lines, has no em dashes, and every page links to it from its footer.
Chromium + WebKit, desktop and phone. python3 tests/privacy_look.py [screenshot dir]"""
import sys, os, re, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):
        p = super().translate_path(path)
        return p + '.html' if not os.path.exists(p) and os.path.exists(p + '.html') else p
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}'

# Every real page links to /privacy. Redirect stubs are left alone; internal/ is not part of the site.
missing = []
for root, _, fs in os.walk(ROOT):
    rel = os.path.relpath(root, ROOT)
    if rel.split(os.sep)[0] in ('internal', 'supabase', 'node_modules', '.git', 'tests', 'tools', 'email-assets', 'docs'): continue
    for f in fs:
        if not f.endswith('.html'): continue
        s = open(os.path.join(root, f)).read()
        if 'http-equiv="refresh"' in s.lower(): continue
        if 'href="/privacy"' not in s: missing.append(os.path.join(rel, f))
ck('every page links to /privacy', not missing, missing)
ck('sitemap lists /privacy', '<loc>https://mo-care.com/privacy</loc>' in open(os.path.join(ROOT, 'sitemap.xml')).read())

CARRIER = ['message frequency varies', 'message and data rates may apply', 'reply STOP', 'reply HELP',
           'not a condition of receiving services',
           'No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.']
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        for w, h in ((1280, 900), (390, 844)):
            tag = f'{eng} {w}'
            pg = br.new_page(viewport={'width': w, 'height': h}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/privacy'); pg.wait_for_load_state('networkidle')
            txt = pg.inner_text('body')
            for line in CARRIER: ck(f'{tag} carrier line: {line[:40]}', line.lower() in txt.lower())
            ck(f'{tag} office address and line', '1331 N Stewart Ave Ste B' in txt and '(417) 234-8494' in txt)
            ck(f'{tag} names the trackers actually on the site', 'Google Analytics' in txt and 'Meta (Facebook) Pixel' in txt)
            ck(f'{tag} no em or en dashes', not re.search('[—–]', txt))
            ck(f'{tag} never says AI', not re.search(r'\bAI\b', txt))
            ck(f'{tag} no sideways scroll', pg.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            ck(f'{tag} footer links back here', pg.locator('footer a[href="/privacy"]').count() == 1)
            ck(f'{tag} no script errors', not errs, errs)
            pg.screenshot(path=f'{OUT}/privacy-{eng}-{w}.png', full_page=True)
            for path in ('/', '/home-care-in-nixa-mo', '/cara', '/dementia-journey/module-1', '/tv', '/axiscare-setup'):
                pg.goto(B + path); pg.wait_for_load_state('domcontentloaded')
                a = pg.locator('a[href="/privacy"]').first
                ck(f'{tag} {path} footer link is visible', a.count() == 1 and (a.scroll_into_view_if_needed() or a.is_visible()))
            pg.close()
        br.close()
srv.shutdown()
for r in R: print(*r)
print(f"{sum(r[0] == 'PASS' for r in R)} pass, {sum(r[0] == 'FAIL' for r in R)} fail")
sys.exit(any(r[0] == 'FAIL' for r in R))
