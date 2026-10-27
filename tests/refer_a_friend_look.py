"""Refer a Friend page (Friends & Family Referral Program, step 4, Samantha 2026-10-27): mo-care.com/refer-a-friend/?p=CODE.
The real page, served locally, with the ff-card-request call caught in the browser (nothing reaches the server). Their link and
QR code from the code alone (no name fetched), Copy, how it works, the approved small print, and "Mail me printed cards".
python3 tests/refer_a_friend_look.py   (SHOTS=<folder> for screenshots)"""
import json, threading, http.server, functools, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SHOTS = os.environ.get("SHOTS", "")
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=H.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{H.server_address[1]}"
R = []; ok = lambda n, c, d="": R.append(("PASS" if c else "FAIL", n, "" if c else str(d)[:600]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    def page(ctx, answer=(200, {"ok": True, "message": "Thank you! Your cards are on the way."})):
        pg = ctx.new_page(); posted = []; outside = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        def catch(route):
            u = route.request.url
            if "ff-card-request" in u: posted.append(json.loads(route.request.post_data or "{}")); route.fulfill(status=answer[0], body=json.dumps(answer[1]), content_type="application/json")
            elif "127.0.0.1" in u: route.continue_()
            else: outside.append(u); route.abort()
        pg.route("**/*", catch); return pg, posted, outside
    ctx = b.new_context(permissions=["clipboard-read", "clipboard-write"]); pg, posted, outside = page(ctx)
    pg.goto(BASE + "/refer-a-friend/?p=dana-k7"); pg.wait_for_timeout(600)
    body = pg.inner_text("body")
    ok("the page opens: 'Thank you for sharing Caring Companions'", "Thank you for sharing Caring Companions" in pg.inner_text("h1"))
    ok("it isn't listed in search engines (noindex)", pg.locator("meta[name=robots][content=noindex]").count() == 1)
    ok("their link, tidied, and a QR code drawn on this device", pg.inner_text("#rf-link") == "mo-care.com/r/?p=DANA-K7" and pg.evaluate("()=>document.getElementById('qr-canvas').width>100") and pg.get_attribute("#qr-save", "download") == "caring-companions-DANA-K7-qr.png")
    ok("no name is shown or fetched (only the code), nothing sent by opening it", "Dana" not in body and not posted and not [u for u in outside if "supabase" in u], outside)
    pg.click("#rf-copybtn"); pg.wait_for_timeout(200)
    ok("Copy link copies the full link and says so", pg.evaluate("()=>navigator.clipboard.readText()") == "https://mo-care.com/r/?p=DANA-K7" and pg.is_visible("#rf-copied"))
    ok("how it works: share, they reach us, $100 after 20 hours of private-pay care with payment received", "Share your link or QR code" in body and "complete 20 hours, and payment for those hours is received, you get $100" in body)
    for line in ["The person you refer must be new to Caring Companions, start private-pay care, and complete 20 hours of care, with payment for those hours received.",
                 "One reward per new client. If two people refer the same family, the first link they used counts.",
                 "Family members: the $100 goes on the invoice of the client you're connected to. Caregivers: a $100 bonus on your paycheck, taxed like other pay.",
                 "Credits can't be exchanged for cash.", "We never share anything about the person you refer or their care with you."]:
        ok("small print: " + line[:60] + "...", line in body)
    ok("no em dashes and no 'plain language' on the page", "—" not in body and "plain language" not in body.lower())
    pg.click("#rf-send"); pg.wait_for_timeout(200)
    ok("an empty card request asks for the name and address; nothing is sent", pg.is_visible("#rf-err") and "mailing address" in pg.inner_text("#rf-err") and not posted)
    pg.fill("#rf-name", "Dana Ridge"); pg.fill("#rf-address", "12 Elm St\nNixa MO 65714"); pg.select_option("#rf-count", "25"); pg.fill("#rf-note", "For my church group")
    pg.click("#rf-send"); pg.wait_for_timeout(500)
    p = posted[0] if posted else {}
    ok("sent to the card door with the code, name, address, how many and the note (the bot field empty)", p == {"code": "DANA-K7", "mail_to": "Dana Ridge", "address": "12 Elm St\nNixa MO 65714", "how_many": 25, "note": "For my church group", "website": ""}, p)
    ok("the thank-you replaces the form", pg.is_visible("#rf-thanks") and "on the way" in pg.inner_text("#rf-thanks") and not pg.is_visible("#rf-form"))
    if SHOTS: pg.goto(BASE + "/refer-a-friend/?p=dana-k7"); pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(SHOTS, "6-refer-a-friend-page-desktop.png"), full_page=True)
    pg2, posted2, _ = page(b.new_context(), (502, {"error": "Sorry, your request didn't go through. Please call us at (417) 234-8494 and we will mail them."}))
    pg2.goto(BASE + "/refer-a-friend/?p=DANA-K7"); pg2.wait_for_timeout(400)
    pg2.fill("#rf-name", "Dana Ridge"); pg2.fill("#rf-address", "12 Elm St, Nixa MO 65714"); pg2.click("#rf-send"); pg2.wait_for_timeout(500)
    ok("if the request can't go, the page says so and gives the phone number (the form stays)", pg2.is_visible("#rf-err") and "(417) 234-8494" in pg2.inner_text("#rf-err") and pg2.is_visible("#rf-form"))
    pg3, _, _ = page(b.new_context()); pg3.goto(BASE + "/refer-a-friend/"); pg3.wait_for_timeout(400)
    ok("no code in the link: says so with the phone number, no QR and no card form", pg3.is_visible("#qr-bad") and not pg3.is_visible("#rf-share") and not pg3.is_visible("#rf-cards"))
    ph = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True).new_page()
    ph.on("pageerror", lambda e: errs.append("phone: " + str(e)[:200]))
    ph.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    ph.goto(BASE + "/refer-a-friend/?p=DANA-K7"); ph.wait_for_timeout(500)
    w = ph.evaluate("()=>({ page:document.documentElement.scrollWidth, vw:window.innerWidth })")
    ok("phone width: never scrolls sideways", w["page"] <= w["vw"] + 1, w)
    if SHOTS: ph.screenshot(path=os.path.join(SHOTS, "7-refer-a-friend-page-phone.png"), full_page=True)
    sm = open(os.path.join(ROOT, "sitemap.xml")).read() if os.path.exists(os.path.join(ROOT, "sitemap.xml")) else ""
    ok("not in the sitemap (a personal page)", "refer-a-friend" not in sm)
    ok("no page errors", not errs, errs[:3]); b.close()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
