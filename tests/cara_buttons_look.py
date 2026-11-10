"""Ask Cara buttons, tappable links and call back (2026-11-06; call back since 2026-11-05).
Serves the site from disk, fakes cara-chat and lead-intake, and checks:
 1. topic buttons on open; a topic asks Cara its approved question, shows the label, then goes away
 2. after each answer, the next steps that fit what Cara answered from (care, Medicaid/CDS, jobs)
 3. our own links and phone numbers in Cara's answer can be tapped; other sites stay text
 4. every message carries one chat id; only one row of buttons at a time; a greeting gets none
 5. Have the office call me: name + 10 digit phone required, lead note names the chat, failure keeps the form,
    No thanks closes it, and after sending it is not offered again
Run: python3 tests/cara_buttons_look.py [screenshot folder]  (no server needed)"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
fails = []
def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)

ANSWERS = {
    'How much does home care cost?': ('Our published rates are Wellness Care $30 an hour, Personal Care $32 an hour, and Advanced Care $34 an hour. Call (417) 234-8494 for an exact cost.', ['K102']),
    'Do you accept Medicaid?': ('Caring Companions does not take Medicaid. Please reach our sister company at (417) 218-2888 or caringcds.com.', ['K104']),
    'How do I apply for a job?': ('We would love to hear from you. You can apply at mo-care.com/apply, it takes about 2 minutes. Also see example.com.', ['K116']),
    'getting up many times in the night': ('We do offer overnight care, usually an 8 to 12 hour shift.', ['K112']),
}

with sync_playwright() as p:
    b = p.chromium.launch()
    def run(lead_status=200, chat_status=200):
        pg = b.new_page(viewport={'width': 420, 'height': 900})
        chats, leads = [], []
        def chat(route):
            body = json.loads(route.request.post_data); chats.append(body)
            q = body['messages'][-1]['content']
            reply, ids = ANSWERS.get(q, ('Here is an answer.', []))
            route.fulfill(status=chat_status, content_type='application/json', body=json.dumps({'reply': reply, 'knowledge': {'ids': ids}}))
        def lead(route):
            leads.append(json.loads(route.request.post_data))
            route.fulfill(status=lead_status, content_type='application/json', body=json.dumps({'status': 'lead created', 'id': 'L1'}))
        pg.route('**/functions/v1/cara-chat', chat)
        pg.route('**/functions/v1/lead-intake**', lead)
        pg.route(lambda u: not u.startswith('file:'), lambda r: r.abort() if 'functions/v1' not in r.request.url else r.fallback())
        pg.goto((ROOT / 'index.html').as_uri())
        pg.click('#cara-widget-launcher')
        return pg, chats, leads
    def done(pg):
        pg.wait_for_timeout(50); pg.wait_for_function('!document.body.innerText.includes("Finding an answer")')
    def say(pg, t):
        pg.fill('#cara-widget-input', t); pg.press('#cara-widget-input', 'Enter'); done(pg)
    def tap(pg, label):
        pg.click('#cara-widget-messages .cara-buttons >> text="%s"' % label); done(pg)
    def buttons(pg):
        return pg.eval_on_selector_all('#cara-widget-messages .cara-buttons a, #cara-widget-messages .cara-buttons button', 'els => els.map(e => e.textContent)')
    def rows(pg):
        return pg.locator('#cara-widget-messages .cara-buttons').count()
    def shot(pg, name):
        if SHOTS: pg.locator('#cara-widget-panel').screenshot(path=str(SHOTS / name))

    pg, chats, leads = run()
    check(pg.inner_text('#cara-widget-launcher').strip() == 'Have a Question?', 'the chat button says Have a Question?')
    check(pg.evaluate("[...document.querySelectorAll('#cara-widget-launcher img, #cara-widget-panel p img')].every(i => i.complete && i.naturalWidth > 0)"), 'our logo badge shows on the button and the heading')
    check(pg.locator('#cara-widget-panel p', has_text='Have a Question?').count() == 1, 'the chat heading says Have a Question?')
    check(buttons(pg) == ['Care for a loved one', 'What care costs', 'Ways to pay', 'Medicaid or CDS', 'Working for us'], 'five topic buttons on open: %s' % buttons(pg))
    shot(pg, '1-topics.png')
    check(pg.get_by_text('Reach our office. A Care Coordinator answers.').count() == 1 and pg.get_by_text('To reach our office, use the buttons below.').count() == 1, 'the chat says which buttons reach the office')
    check(pg.locator('#cara-widget-panel', has_text='Full Consultation').count() == 0, 'no Start a Full Consultation button (her call 11-06)')
    check(pg.locator('#cara-widget-panel a', has_text='Call the office').get_attribute('href') == 'tel:14172348494', 'Call the office calls the office')
    check(pg.locator('#cara-widget-panel a', has_text='Text the office').get_attribute('href') == 'sms:+14172348494' and pg.locator('#cara-widget-panel', has_text='Message Us').count() == 0, 'Text the office texts the office line, in place of Message Us')
    tap(pg, 'What care costs')
    check(chats and chats[-1]['messages'][-1]['content'] == 'How much does home care cost?', 'a topic asks Cara its approved question')
    check(pg.locator('#cara-widget-messages > div', has_text='What care costs').count() == 1, 'the visitor sees the topic name in their bubble')
    check('Care for a loved one' not in buttons(pg), 'topic buttons go away once a question is asked')
    check(buttons(pg) == ['Have the office call me', 'Book a free in-home assessment', 'See rates and ways to pay'], 'cost answer: call me, book, rates page: %s' % buttons(pg))
    a = pg.locator('#cara-widget-messages a', has_text='(417) 234-8494')
    check(a.count() == 1 and a.get_attribute('href') == 'tel:14172348494', 'office phone in the answer can be tapped')
    href = pg.locator('#cara-widget-messages .cara-buttons a', has_text='Book a free').get_attribute('href')
    check(href.endswith('/book.html'), 'book goes to the assessment page: ' + href)
    shot(pg, '2-cost.png')
    say(pg, 'Do you accept Medicaid?')
    check(buttons(pg) == ['Visit caringcds.com', 'Call CDS at (417) 218-2888'], 'Medicaid answer: CDS buttons only: %s' % buttons(pg))
    check(rows(pg) == 1, 'only one row of buttons at a time')
    cds = pg.locator('#cara-widget-messages > div:not(.cara-buttons) a', has_text='caringcds.com')
    check(cds.count() == 1 and cds.get_attribute('href') == 'https://caringcds.com' and cds.get_attribute('target') == '_blank', 'caringcds.com in the answer opens in a new tab')
    shot(pg, '3-medicaid.png')
    say(pg, 'How do I apply for a job?')
    check(buttons(pg) == ['Apply now', 'See open jobs'], 'jobs answer: Apply now and See open jobs, no call back: %s' % buttons(pg))
    ap = pg.locator('#cara-widget-messages > div:not(.cara-buttons) a', has_text='mo-care.com/apply')
    check(ap.count() == 1 and ap.get_attribute('href') == 'https://mo-care.com/apply' and ap.text_content() == 'mo-care.com/apply', 'mo-care.com/apply can be tapped, comma left off')
    check(pg.locator('#cara-widget-messages a', has_text='example.com').count() == 0, 'other sites stay plain text')
    shot(pg, '4-jobs.png')
    say(pg, 'hi')
    check(rows(pg) == 0, 'a greeting gets no buttons')
    ids = {c.get('session_id') for c in chats}
    check(len(ids) == 1 and list(ids)[0].startswith('c'), 'every message carries one chat id: %s' % ids)
    sid = list(ids)[0]
    say(pg, 'getting up many times in the night')
    check(buttons(pg) == ['Have the office call me', 'Book a free in-home assessment', 'Read about overnight care'], 'night answer: overnight page: %s' % buttons(pg))
    tap(pg, 'Have the office call me')
    check(pg.get_by_text('Would you like someone from our office to call you?').count() == 1, 'the call-back card opens')
    pg.click('text=Yes, please call me')
    pg.click('#cara-widget-messages button:has-text("Send")')
    check(pg.get_by_text('Please add your name.').is_visible(), 'name required')
    pg.fill('input[aria-label="Your name"]', 'Pat Lee'); pg.fill('input[aria-label="Phone number"]', '417-555')
    pg.click('#cara-widget-messages button:has-text("Send")')
    check(pg.get_by_text('Please add a 10 digit phone number.').is_visible(), '10 digit phone required')
    check(not leads, 'nothing sent before the form is valid')
    pg.fill('input[aria-label="Phone number"]', '(417) 555-0100'); pg.fill('input[aria-label="Best time to call"]', 'mornings')
    shot(pg, '5-call-me.png')
    pg.click('#cara-widget-messages button:has-text("Send")')
    pg.wait_for_selector('text=We have your number')
    L = leads[0] if leads else {}
    check(len(leads) == 1 and L.get('name') == 'Pat Lee' and L.get('best_time') == 'mornings', 'one lead with name, phone, best time')
    check(('Ask Cara chat ' + sid) in L.get('message', '') and 'How much does home care cost?' in L.get('message', '') and len(L.get('message', '')) <= 500, 'lead note names the chat and first question')
    say(pg, 'Do you cover Ozark?')
    check('Have the office call me' not in buttons(pg) and 'Book a free in-home assessment' in buttons(pg), 'after sending, no second call back offer')
    pg.close()

    pg, chats, leads = run(lead_status=500)
    say(pg, 'Can you help my mom after surgery?'); tap(pg, 'Have the office call me'); pg.click('text=Yes, please call me')
    pg.fill('input[aria-label="Your name"]', 'Pat'); pg.fill('input[aria-label="Phone number"]', '4175550100')
    pg.click('#cara-widget-messages button:has-text("Send")'); pg.wait_for_selector('text=that did not go through')
    check(pg.locator('input[aria-label="Your name"]').count() == 1, 'failed save keeps the form and tells them')
    pg.close()

    pg, chats, leads = run()
    say(pg, 'What areas do you serve?'); tap(pg, 'Have the office call me'); pg.click('text=No thanks')
    check(not pg.get_by_text('Would you like someone').count(), 'No thanks closes the card')
    say(pg, 'And weekends?')
    check('Have the office call me' in buttons(pg), 'Have the office call me is still there on the next answer')
    pg.close()

    pg, chats, leads = run(chat_status=500)
    tap(pg, 'Care for a loved one')
    check(pg.get_by_text('having trouble responding').count() == 1 and 'Have the office call me' in buttons(pg), 'when Cara cannot answer, the visitor can still ask for a call')
    pg.close()
    # 2026-11-10: a job question with no matched answer still gets the job buttons, and a family question does not
    pg, chats, leads = run()
    say(pg, 'Trying to get an application for a job there')
    check(buttons(pg) == ['Apply now', 'See open jobs'], 'unmatched job question still shows job buttons: %s' % buttons(pg))
    say(pg, 'Can I hire a caregiver for weekends')
    check('Apply now' not in buttons(pg), 'a family saying hire does not get job buttons: %s' % buttons(pg))
    pg.close()

    b.close()

print('\n%d failed' % len(fails) if fails else '\nall passed')
sys.exit(1 if fails else 0)
