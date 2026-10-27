"""Community Ambassadors closed (2026-10-26, her decision 5): the public application is gone and no page links to it,
while referral links and QR codes keep working. The real pages, served locally; nothing reaches any server.
python3 tests/ambassador_closed_look.py"""
import json, threading, http.server, functools, os, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=H.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{H.server_address[1]}"
R = []; ok = lambda n, c, d="": R.append(("PASS" if c else "FAIL", n, "" if c else str(d)[:600]))
linking = [f for f in glob.glob(os.path.join(ROOT, "**/*.html"), recursive=True)
           if 'href="/ambassadors' in open(f).read() and "/ambassadors/" not in f.replace(ROOT, "")]
ok("no page on the site links to /ambassadors (menus and footers)", not linking, linking[:5])
ok("the sitemap no longer lists the page", "/ambassadors" not in open(os.path.join(ROOT, "sitemap.xml")).read())
forms = open(os.path.join(ROOT, "assets/forms.js")).read()
ok("forms.js no longer has the application sender", "submitApplication" not in forms and "ambassador_application" not in forms)
ok("...and still remembers a referral code for every form", "CCPartnerRef" in forms and "partner_code" in forms)
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []; posted = []
    def page():
        pg = b.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        def catch(route):
            if "lead-intake" in route.request.url: posted.append(route.request.post_data); route.fulfill(status=200, body="{}")
            elif "127.0.0.1" in route.request.url: route.continue_()
            else: route.abort()
        pg.route("**/*", catch); return pg
    pg = page(); pg.goto(BASE + "/ambassadors/"); pg.wait_for_timeout(400)
    ok("an old link lands on a short page saying the program has closed", "has closed" in pg.inner_text("h1"))
    ok("...with our phone number and the contact page for anyone who needs care", "(417) 234-8494" in pg.inner_text("#amb-closed") and pg.locator('#amb-closed a[href="/contact"]').count() == 1)
    ok("...no application form, no fields at all", pg.locator("#amb-closed input, form, #am-submit").count() == 0)
    ok("...kept out of search engines", pg.locator('meta[name="robots"][content="noindex"]').count() == 1)
    ok("...and the menu has no Community Ambassadors link", "Community Ambassadors" not in pg.inner_text("header") and "Community Ambassadors" not in pg.inner_text("footer"))
    pg.goto(BASE + "/r/?p=BARB-K7"); pg.wait_for_timeout(400)
    ok("a referral link still keeps its code for the family's forms", (pg.evaluate("()=>JSON.parse(localStorage.getItem('cc_partner_ref')||'{}')") or {}).get("code") == "BARB-K7")
    pg.goto(BASE + "/contact"); pg.wait_for_timeout(300)
    ok("...and the contact page still loads with the code kept", (pg.evaluate("()=>JSON.parse(localStorage.getItem('cc_partner_ref')||'{}')") or {}).get("code") == "BARB-K7")
    pg.goto(BASE + "/r/qr/?p=BARB-K7"); pg.wait_for_timeout(500)
    ok("the QR code page still draws the code, without ambassador wording", pg.evaluate("()=>document.getElementById('qr-canvas').width>100") and "Ambassador" not in pg.content())
    ok("nothing was sent anywhere, and no page errors", not posted and not errs, (posted, errs)); b.close()
H.shutdown()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
