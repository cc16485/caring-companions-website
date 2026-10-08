"""The "Refer a client" form on mo-care.com/referral-partners (2026-10-08): what it sends. The real page, served locally,
with the lead-intake call caught in the browser (nothing reaches the server). python3 tests/referral_form_look.py [port]"""
import json, sys, threading, http.server, functools, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
threading.Thread(target=H.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{H.server_address[1]}/referral-partners.html"
R = []; ok = lambda n, c, d="": R.append(("PASS" if c else "FAIL", n, "" if c else str(d)[:600]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); posted = []; errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    def catch(route):
        if "lead-intake" in route.request.url: posted.append(json.loads(route.request.post_data or "{}")); route.fulfill(status=200, body='{"status":"referral received"}', content_type="application/json")
        elif "127.0.0.1" in route.request.url: route.continue_()
        else: route.abort()
    pg.route("**/*", catch); pg.goto(URL); pg.wait_for_timeout(600)
    pg.click("#r-submit"); pg.wait_for_timeout(200)
    ok("an empty form asks for your name and a phone or email; nothing is sent", pg.is_visible("#r-error") and not posted)
    pg.locator(".rp-partner-chip", has_text="Skilled Nursing Facility").first.click()
    pg.fill("#r-name", "Kim Lee"); pg.fill("#r-org", "St. Johns Rehab"); pg.fill("#r-initials", "R.A."); pg.fill("#r-phone", "417-555-0111")
    pg.fill("#r-situation", "Going home Friday, lives alone"); pg.locator("#urgency-chips .chip", has_text="Urgent").click()
    pg.click("#r-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("sent as a professional referral: you, your organization, your type, your number, the initials, the urgency, the situation",
       p.get("kind") == "professional_referral" and p.get("referrer_name") == "Kim Lee" and p.get("referrer_org") == "St. Johns Rehab" and p.get("referrer_type") == "snf"
       and p.get("referrer_contact") == "417-555-0111" and p.get("client_initials") == "R.A." and p.get("urgency") == "Urgent" and p.get("situation") == "Going home Friday, lives alone", p)
    ok("the referrer is NOT sent as the person needing care (no name, phone or email at the top level)", not any(k in p for k in ("name", "phone", "email")), p)
    ok("the thank-you shows", pg.is_visible("#referral-thanks"))
    ok("no page errors", not errs, errs); b.close()
H.shutdown()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
