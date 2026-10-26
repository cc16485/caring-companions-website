"""Community Ambassadors (2026-10-26): mo-care.com/ambassadors and its application. The real page, served locally, with
the lead-intake call caught in the browser (nothing reaches the server). python3 tests/ambassador_page_look.py"""
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
    def page(ctx, answer=None):
        pg = ctx.new_page(); posted = []; tracked = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        def catch(route):
            if "lead-intake" in route.request.url:
                posted.append(json.loads(route.request.post_data or "{}"))
                a = answer or (200, {"status": "application received"})
                route.fulfill(status=a[0], body=json.dumps(a[1]), content_type="application/json")
            elif "127.0.0.1" in route.request.url: route.continue_()
            else: route.abort()
        pg.route("**/*", catch)
        pg.add_init_script("window.CCTrack=function(e){ (window.__tr=window.__tr||[]).push(e); };")
        return pg, posted
    ctx = b.new_context(); pg, posted = page(ctx)
    pg.goto(BASE + "/ambassadors/"); pg.wait_for_timeout(500)
    hero = pg.inner_text(".am-hero")
    ok("the page opens with a welcoming headline: 'Be the neighbor who knows who to call.'", "Be the neighbor who knows who to call." in pg.inner_text("h1"))
    ok("the hero talks about helping families, not about pay or volunteering", not any(w in hero.lower() for w in ("unpaid", "volunteer", "employment", "pay", "income", "$")), hero)
    body = pg.inner_text("body")
    ok("voluntary, unpaid and not employment is clearly said (the agreement box and the FAQ)", "voluntary and unpaid" in pg.inner_text(".am-agree") and "isn't employment" in body and "Is this a job?" in body)
    ok("no money anywhere on the page (no rewards, commissions or dollar amounts)", not any(w in body.lower() for w in ("reward", "commission", "earn", "$")), [w for w in ("reward", "commission", "earn", "$") if w in body.lower()])
    ok("the page can be found by search engines (no noindex) and has a description", pg.locator("meta[name=robots][content=noindex]").count() == 0 and pg.locator("meta[name=description]").count() == 1)
    ok("the application asks no mailing address", pg.locator("#am-formbox input[autocomplete*=street], #am-formbox input[placeholder*=ddress]").count() == 0 and "address" not in pg.inner_text("#am-formbox").lower())
    pg.click("#am-submit"); pg.wait_for_timeout(150)
    ok("an empty form asks for a name; nothing is sent", pg.is_visible("#am-error") and "first and last name" in pg.inner_text("#am-error") and not posted)
    pg.fill("#am-first", "Linda"); pg.fill("#am-last", "Ortiz"); pg.click("#am-submit"); pg.wait_for_timeout(100)
    ok("...then an email or phone", "email or a mobile" in pg.inner_text("#am-error") and not posted)
    pg.fill("#am-email", "linda@example"); pg.click("#am-submit"); pg.wait_for_timeout(100)
    ok("...a broken email is caught", "doesn't look right" in pg.inner_text("#am-error") and not posted)
    pg.fill("#am-email", "linda@example.com"); pg.click("#am-submit"); pg.wait_for_timeout(100)
    ok("...then the town", "your town" in pg.inner_text("#am-error") and not posted)
    pg.fill("#am-town", "Nixa"); pg.click("#am-submit"); pg.wait_for_timeout(100)
    ok("...and the agreement box", "check the box" in pg.inner_text("#am-error") and not posted)
    ok("'Where do you work?' only shows after answering Yes to healthcare", not pg.is_visible("#am-hc-where"))
    pg.check("input[name=am-hc][value=yes]"); pg.wait_for_timeout(100)
    ok("...Yes shows it, with a friendly note that they're still welcome", pg.is_visible("#am-hc-where") and "still welcome" in pg.inner_text("#am-hc-note"))
    pg.fill("#am-hc-where", "Nurse at Mercy")
    pg.locator("#am-share label", has_text="Church or community group").click(); pg.locator("#am-share label", has_text="Neighbors").click()
    pg.evaluate("()=>{ window.__tr=[]; window.CCTrack=function(e){ window.__tr.push(e); }; }")
    pg.check("#am-agree"); pg.click("#am-submit"); pg.wait_for_timeout(600)
    p = posted[0] if posted else {}
    ok("sent as an ambassador application (never a family inquiry): name, email, town, choices, healthcare answer, agreement",
       p.get("kind") == "ambassador_application" and p.get("first_name") == "Linda" and p.get("last_name") == "Ortiz" and p.get("email") == "linda@example.com" and p.get("town") == "Nixa"
       and sorted(p.get("share") or []) == ["community", "neighbors"] and p.get("works_in_healthcare") == "yes" and p.get("healthcare_where") == "Nurse at Mercy" and p.get("works_for_us") == "no"
       and all((p.get("agree") or {}).get(k) for k in ("adult", "guidelines", "volunteer", "privacy")), p)
    ok("...no message, no 'care for' and no family fields that could make it look like a lead", not any(k in p for k in ("message", "care_for", "name")), p)
    ok("...the thank-you shows with their first name", pg.is_visible("#am-thanks") and "Thank you, Linda" in pg.inner_text("#am-thanks"))
    ok("...counted as an application, never as a lead submission", pg.evaluate("()=>window.__tr||[]") == ["ambassador_applied"], pg.evaluate("()=>window.__tr||[]"))
    ctx.close()

    ctx = b.new_context(); pg, posted = page(ctx, (400, {"error": "Please check each box to agree."}))
    pg.goto(BASE + "/r/?p=JANE-K7"); pg.wait_for_timeout(300)
    pg.goto(BASE + "/ambassadors/"); pg.wait_for_timeout(400)
    for f, v in (("#am-first", "Ray"), ("#am-last", "Cole"), ("#am-phone", "417-555-0101"), ("#am-town", "Ozark")): pg.fill(f, v)
    pg.check("#am-agree"); pg.click("#am-submit"); pg.wait_for_timeout(500)
    p = posted[0] if posted else {}
    ok("someone who came through an ambassador's link: the code goes along (the server only notes it)", p.get("partner_code") == "JANE-K7", p)
    ok("the server refusing shows its reason, and the form stays", "check each box" in pg.inner_text("#am-error") and pg.is_visible("#am-formbox"))
    ctx.close()

    ctx = b.new_context(); pg, posted = page(ctx)
    pg.goto(BASE + "/"); pg.wait_for_timeout(400)
    ok("the site menu (About Us) and the footer link to Community Ambassadors", pg.locator("nav a[href='/ambassadors']").count() >= 1 and pg.locator("footer a[href='/ambassadors']").count() == 1)
    ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}); pg, posted = page(ctx)
    pg.goto(BASE + "/ambassadors/"); pg.wait_for_timeout(500)
    w = pg.evaluate("()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, cols:getComputedStyle(document.querySelector('.am-grid')).gridTemplateColumns.split(' ').length})")
    ok("on a phone (390 wide): no sideways scroll, and the form is one column", w["sw"] <= w["cw"] + 1 and w["cols"] == 1, w)
    pg.screenshot(path="/tmp/amb_phone.png", full_page=True); ctx.close()
    ctx = b.new_context(viewport={"width": 1280, "height": 900}); pg, posted = page(ctx)
    pg.goto(BASE + "/ambassadors/"); pg.wait_for_timeout(500); pg.screenshot(path="/tmp/amb_desk.png", full_page=True); ctx.close()
    ok("no page errors", not errs, errs); b.close()
H.shutdown()
for r in R: print(r[0], "·", r[1], ("→ " + r[2]) if r[2] else "")
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == "PASS" for r in R) else 1)
