"""The app page and the home page show REAL screens from the live booking app (Samantha 2026-10-17: "fix the fake screen
look on our website, use real look"), and "See how booking works" steps through the 7 real screens. Chromium + WebKit,
desktop and phone. python3 tests/app_real_look.py [screenshot dir]"""
import sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def translate_path(self, path):   # clean URLs like the live site: /app -> app.html
        p = super().translate_path(path)
        return p + '.html' if not os.path.exists(p) and os.path.exists(p + '.html') else p
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}'
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        for w, h in ((1280, 900), (390, 844)):
            for page_url, img, btn in (('/app', '.real-phone img', '[data-app-tour]'), ('/', '.app-band-phone img', '[data-app-tour]')):
                name = f'{eng}-{w}{page_url.replace("/", "-") or "-home"}'
                pg = br.new_page(viewport={'width': w, 'height': h}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                bad = []; pg.on('response', lambda r: bad.append(r.url) if r.status >= 400 and '/assets/' in r.url else None)
                pg.goto(B + page_url); pg.wait_for_load_state('networkidle')
                vis = pg.locator(img).is_visible()
                if vis:
                    pg.locator(img).scroll_into_view_if_needed(); pg.wait_for_timeout(300)
                    ck(f'{name}: the phone shows a real app screen (loaded)', pg.evaluate(f"document.querySelector('{img}').naturalWidth") == 585)
                else:
                    ck(f'{name}: the phone picture is hidden on a small screen (as before)', page_url == '/' and w < 640)
                ck(f'{name}: no fake phone, no "Book this visit"', 'Book this visit' not in pg.content() and pg.locator('.peek-phone, .peek-row').count() == 0)
                pg.locator(btn).first.scroll_into_view_if_needed(); pg.locator(btn).first.click(); pg.wait_for_selector('.at-box')
                seen = []
                for k in range(7):
                    pg.wait_for_timeout(250)
                    seen.append((pg.inner_text('.at-t'), pg.evaluate("document.querySelector('.at-phone img').naturalWidth")))
                    if k == 5: pg.screenshot(path=os.path.join(OUT, f'tour-{name}.png'))
                    if k < 6: pg.click('.at-next')
                ck(f'{name}: the tour shows all 7 real screens in order', [t for t, _ in seen] == ['Your home screen', 'Pick a day', 'Pick the time', 'What would help', 'Who you’d like', 'Check and send', 'Request sent'] and all(n == 585 for _, n in seen), seen)
                ck(f'{name}: says they are real screens with sample information, and requests depend on who is free', 'Real screens from the Caring Companions app' in pg.inner_text('.at-foot') and 'requests' in pg.inner_text('.at-foot'))
                pg.click('.at-prev'); ck(f'{name}: Back works', pg.inner_text('.at-t') == 'Check and send')
                pg.keyboard.press('Escape'); ck(f'{name}: Escape closes it', pg.locator('.at-box').count() == 0)
                ck(f'{name}: nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
                ck(f'{name}: no page errors and no missing files', not errs and not bad, (errs, bad))
                if w == 1280: pg.screenshot(path=os.path.join(OUT, f'page-{name}.png'))
                pg.close()
        br.close()
for f in ('app.html', 'index.html', 'assets/app-tour.js'):
    t = open(os.path.join(ROOT, f)).read(); ck(f'{f}: no em dash added in the app parts', '—' not in t[t.find('app-band') if f == 'index.html' else 0:][:4000] if f == 'index.html' else '—' not in t)
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)
