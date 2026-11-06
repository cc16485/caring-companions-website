"""Ask Cara call-back offer + chat id (2026-11-05).
Serves the site from disk, fakes cara-chat and lead-intake, and checks:
 1. every chat message carries the same session_id
 2. a greeting gets no offer; the first real question does, once
 3. name + 10 digit phone are required; the lead body names the chat id
 4. a failed save tells the visitor and keeps the form
 5. No thanks removes the offer and it never comes back in this chat
Run: python3 tests/cara_callback_look.py  (no server needed)"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)

with sync_playwright() as p:
    b = p.chromium.launch()
    def run(lead_status):
        pg = b.new_page(viewport={'width': 420, 'height': 900})
        chats, leads = [], []
        def chat(route):
            chats.append(json.loads(route.request.post_data))
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'reply': 'Here is an answer.'}))
        def lead(route):
            leads.append(json.loads(route.request.post_data))
            route.fulfill(status=lead_status, content_type='application/json', body=json.dumps({'status': 'lead created', 'id': 'L1'}))
        pg.route('**/functions/v1/cara-chat', chat)
        pg.route('**/functions/v1/lead-intake**', lead)
        pg.route(lambda u: not u.startswith('file:'), lambda r: r.abort() if 'functions/v1' not in r.request.url else r.fallback())
        pg.goto((ROOT / 'index.html').as_uri())
        pg.click('#cara-widget-launcher')
        return pg, chats, leads
    def say(pg, t, n):
        pg.fill('#cara-widget-input', t); pg.press('#cara-widget-input', 'Enter')
        pg.wait_for_function('document.querySelectorAll("#cara-widget-messages > div").length >= %d' % n)

    pg, chats, leads = run(200)
    say(pg, 'hi', 3)
    check(not pg.get_by_text('Yes, please call me').count(), 'a greeting gets no offer')
    say(pg, 'How much does care cost?', 5)
    check(pg.get_by_text('Yes, please call me').count() == 1, 'first real question gets the offer')
    say(pg, 'Do you cover Ozark?', 7)
    check(pg.get_by_text('Yes, please call me').count() == 1, 'offer shows once')
    ids = {c.get('session_id') for c in chats}
    check(len(ids) == 1 and list(ids)[0] and list(ids)[0].startswith('c'), 'every message carries one session_id: %s' % ids)
    sid = list(ids)[0]
    pg.click('text=Yes, please call me')
    pg.click('#cara-widget-messages button:has-text("Send")')
    check(pg.get_by_text('Please add your name.').is_visible(), 'name required')
    pg.fill('input[aria-label="Your name"]', 'Pat Lee')
    pg.fill('input[aria-label="Phone number"]', '417-555')
    pg.click('#cara-widget-messages button:has-text("Send")')
    check(pg.get_by_text('Please add a 10 digit phone number.').is_visible(), '10 digit phone required')
    check(not leads, 'nothing sent before the form is valid')
    pg.fill('input[aria-label="Phone number"]', '(417) 555-0100')
    pg.fill('input[aria-label="Best time to call"]', 'mornings')
    pg.click('#cara-widget-messages button:has-text("Send")')
    pg.wait_for_selector('text=We have your number')
    check(len(leads) == 1, 'one lead sent')
    L = leads[0] if leads else {}
    check(L.get('name') == 'Pat Lee' and L.get('phone') == '(417) 555-0100' and L.get('best_time') == 'mornings', 'lead has name, phone, best time')
    check(('Ask Cara chat ' + sid) in L.get('message', '') and 'How much does care cost?' in L.get('message', ''), 'lead note names the chat and first question')
    check(len(L.get('message', '')) <= 500, 'note fits lead-intake (500 chars)')
    check(pg.get_by_text('Thank you, Pat.').count() == 1, 'thank-you names them')
    if SHOT: pg.screenshot(path=str(SHOT))
    pg.reload(); pg.click('#cara-widget-launcher'); say(pg, 'Another question about VA benefits', 3)
    check(not pg.get_by_text('Yes, please call me').count(), 'no second offer after sending, same tab')
    pg.close()

    pg, chats, leads = run(500)
    say(pg, 'Can you help my mom after surgery?', 3)
    pg.click('text=Yes, please call me')
    pg.fill('input[aria-label="Your name"]', 'Pat'); pg.fill('input[aria-label="Phone number"]', '4175550100')
    pg.click('#cara-widget-messages button:has-text("Send")')
    pg.wait_for_selector('text=that did not go through')
    check(pg.locator('input[aria-label="Your name"]').count() == 1, 'failed save keeps the form and tells them')
    pg.close()

    pg, chats, leads = run(200)
    say(pg, 'What areas do you serve?', 3)
    pg.click('text=No thanks')
    check(not pg.get_by_text('Would you like someone').count(), 'No thanks removes the offer')
    say(pg, 'And weekends?', 5)
    check(not pg.get_by_text('Would you like someone').count(), 'declined offer never returns')
    pg.close()
    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
