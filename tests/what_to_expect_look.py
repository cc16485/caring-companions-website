"""What to Expect page (Samantha 2026-10-28: "giving them our client handbook, our care agreement, all of it so there is nothing
unknown", "make that the banner thing", "make it interactive and custom"). The weekly estimator uses only published rates and fees,
the tap list answers from the Client Handbook, the PDFs are served, and the top banner links here. Chromium + WebKit, desktop and
phone. python3 tests/what_to_expect_look.py [screenshot dir]"""
import sys, os, threading, http.server, functools
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
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        for w, h in ((1280, 900), (390, 844)):
            tag = f'{eng} {w}'
            pg = br.new_page(viewport={'width': w, 'height': h}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/what-to-expect'); pg.wait_for_load_state('networkidle')
            t = lambda: pg.inner_text('#c-total')
            ck(f'{tag} default week is 3 x 4h at $30', t() == '$360', t())
            ck(f'{tag} optional lines hidden until ticked', not pg.is_visible('#c-hol-r') and not pg.is_visible('#c-cc-r'))
            pg.click('.wte-seg button[data-v="34"]'); pg.click('[data-k="hours"] button:last-child')
            ck(f'{tag} Advanced Care 3 x 5h', t() == '$510', t())
            pg.check('#c-hol'); ck(f'{tag} holiday adds half of one visit', t() == '$595', t())
            pg.check('#c-mi'); pg.check('#c-cc'); ck(f'{tag} mileage + 3% card fee', t() == '$627', t())
            for _ in range(2): pg.click('[data-k="visits"] button:first-child')
            pg.click('[data-k="hours"] button:first-child')
            ck(f'{tag} under 8 hours a week shows the minimum note', pg.is_visible('#c-warn'))
            pg.click('#ask button:nth-child(2)')
            ck(f'{tag} tap list answers', 'pill organizer' in pg.inner_text('#ans'), pg.inner_text('#ans'))
            ck(f'{tag} no horizontal scroll', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            ck(f'{tag} no page errors', not errs, errs)
            pg.goto(B + '/what-to-expect'); pg.wait_for_load_state('networkidle')
            pg.screenshot(path=f'{OUT}/wte-{eng}-{w}.png', full_page=True)
            pg.goto(B + '/'); ck(f'{tag} home banner links here', pg.get_attribute('.cc-utility-book', 'href') == '/what-to-expect')
            pg.close()
        br.close()
    import urllib.request
    for f in ('client-handbook', 'client-care-agreement-sample', 'va-community-care-addendum-sample', 'medicare-guide-addendum-sample'):
        r = urllib.request.urlopen(B + f'/assets/docs/caring-companions-{f}.pdf'); ck(f'pdf {f} served', r.status == 200 and r.read(5) == b'%PDF-')
for r in R: print(*r)
print(sum(r[0] == 'PASS' for r in R), '/', len(R), 'passed'); sys.exit(any(r[0] == 'FAIL' for r in R))
