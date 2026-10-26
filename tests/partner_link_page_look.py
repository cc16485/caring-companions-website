"""Partner links, step 3 (2026-10-26): mo-care.com/r/?p=CODE and the 90-day code memory every form uses. The real pages,
served locally, with the lead-intake call caught in the browser (nothing reaches the server).
python3 tests/partner_link_page_look.py"""
import json, threading, http.server, functools, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=H.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{H.server_address[1]}"
R = []; ok = lambda n, c, d="": R.append(("PASS" if c else "FAIL", n, "" if c else str(d)[:600]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    def page(ctx):
        pg = ctx.new_page(); posted = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        def catch(route):
            if "lead-intake" in route.request.url: posted.append(json.loads(route.request.post_data or "{}")); route.fulfill(status=200, body='{"status":"lead created"}', content_type="application/json")
            elif "127.0.0.1" in route.request.url: route.continue_()
            else: route.abort()
        pg.route("**/*", catch); return pg, posted
    stored = lambda pg: pg.evaluate("()=>JSON.parse(localStorage.getItem('cc_partner_ref')||'null')")

    ctx = b.new_context(); pg, posted = page(ctx)
    pg.goto(BASE + "/r/?p=jane-k7"); pg.wait_for_timeout(500)
    s = stored(pg)
    ok("the link page opens: 'Someone you know shared Caring Companions with you', a call button and a short form", "Someone you know shared Caring Companions with you" in pg.inner_text("h1") and pg.is_visible("a[href='tel:14172348494'].btn-primary") and pg.is_visible("#ry-submit"))
    ok("it isn't listed in search engines (noindex)", pg.locator("meta[name=robots][content=noindex]").count() == 1)
    ok("the partner's name is never shown or fetched (only the code is kept)", "JANE" not in pg.inner_text("body").upper())
    ok("the code is kept on this device, tidied (JANE-K7), with the date", s and s.get("code") == "JANE-K7" and s.get("first_at"), s)
    pg.click("#ry-submit"); pg.wait_for_timeout(200)
    ok("an empty form asks for a name; nothing is sent", pg.is_visible("#ry-error") and not posted)
    pg.fill("#ry-name", "Gary Miller"); pg.click("#ry-submit"); pg.wait_for_timeout(200)
    ok("a name with no phone or email asks for one; nothing is sent", "phone number or an email" in pg.inner_text("#ry-error") and not posted)
    pg.fill("#ry-phone", "417-555-0142"); pg.fill("#ry-message", "Help for my mom"); pg.click("#ry-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("sent to the Hub with the code: name, phone, message, partner_code JANE-K7", p.get("name") == "Gary Miller" and p.get("phone") == "417-555-0142" and p.get("message") == "Help for my mom" and p.get("partner_code") == "JANE-K7", p)
    ok("the thank-you shows", pg.is_visible("#ry-thanks") and "Thank you, Gary" in pg.inner_text("#ry-thanks"))

    pg.goto(BASE + "/r/?p=BOB-22"); pg.wait_for_timeout(400)
    ok("first link wins: a second partner's link doesn't replace JANE-K7", stored(pg).get("code") == "JANE-K7", stored(pg))

    posted.clear(); pg.goto(BASE + "/contact.html"); pg.wait_for_timeout(600)
    pg.fill("#f-name", "Gary Miller"); pg.fill("#f-phone", "4175550142"); pg.click("#f-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("any other form later on (Contact) sends the same code, with everything it sent before", p.get("partner_code") == "JANE-K7" and p.get("name") == "Gary Miller" and "heard_from" in p, p)

    posted.clear(); pg.goto(BASE + "/referral-partners.html"); pg.wait_for_timeout(500)
    pg.locator(".rp-partner-chip", has_text="Skilled Nursing Facility").first.click()
    pg.fill("#r-name", "Kim Lee"); pg.fill("#r-org", "St. Johns Rehab"); pg.fill("#r-initials", "R.A."); pg.fill("#r-phone", "417-555-0111"); pg.click("#r-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("the partner referral form carries it too, still a professional referral", p.get("kind") == "professional_referral" and p.get("partner_code") == "JANE-K7", p)

    pg.evaluate("()=>localStorage.setItem('cc_partner_ref', JSON.stringify({code:'JANE-K7', first_at:new Date(Date.now()-91*864e5).toISOString()}))")
    posted.clear(); pg.goto(BASE + "/contact.html"); pg.wait_for_timeout(500)
    pg.fill("#f-name", "Ann Lee"); pg.fill("#f-email", "ann@example.com"); pg.click("#f-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("after 90 days the code is forgotten: not sent, and removed from the device", p.get("name") == "Ann Lee" and "partner_code" not in p and stored(pg) is None, [p, stored(pg)])
    pg.evaluate("()=>localStorage.setItem('cc_partner_ref', JSON.stringify({code:'JANE-K7', first_at:new Date(Date.now()+30*864e5).toISOString()}))")
    ok("a date in the future is never trusted", pg.evaluate("()=>CCPartnerRef.read()") is None)
    pg.goto(BASE + "/r/?p=NEW-99"); pg.wait_for_timeout(400)
    ok("...and once it's gone, a new link is kept", stored(pg).get("code") == "NEW-99")
    ctx.close()

    ctx = b.new_context(); pg, posted = page(ctx)
    pg.goto(BASE + "/r/?p=%3Cscript%3E"); pg.wait_for_timeout(400)
    ok("not a code (<script>): nothing kept, the page still works", stored(pg) is None and pg.is_visible("#ry-submit"))
    pg.goto(BASE + "/r/"); pg.wait_for_timeout(300)
    ok("no code at all: nothing kept", stored(pg) is None)
    pg.goto(BASE + "/contact.html"); pg.wait_for_timeout(500)
    pg.fill("#f-name", "Pat Doe"); pg.fill("#f-phone", "4175550111"); pg.click("#f-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("a visitor who never opened a link: the Contact form sends exactly what it did before (no partner_code)", p.get("name") == "Pat Doe" and "partner_code" not in p, p)
    ctx.close()

    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg, posted = page(ctx)
    pg.goto(BASE + "/r/?p=JANE-K7"); pg.wait_for_timeout(500)
    w = pg.evaluate("()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth})")
    ok("on a phone (390 wide): no sideways scroll", w["sw"] <= w["cw"] + 1, w)
    pg.screenshot(path="/tmp/r_phone.png", full_page=True); ctx.close()
    ok("no page errors", not errs, errs); b.close()
H.shutdown()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
