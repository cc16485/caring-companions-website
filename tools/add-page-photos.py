#!/usr/bin/env python3
"""Puts one scene photo under the top section of each page that has none.

Photos are in assets/photos/scene-*.webp (made for the October 2026 marketing
videos). They are dramatizations, so they are used as scenes only: never with a
name and never presented as our actual caregivers or clients.

Run from the repo root:  python3 tools/add-page-photos.py
Safe to run again: a page that already has a pg-photo is skipped.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

ALT = {
    'arrive-porch': 'A caregiver arriving at the front door, greeted by a smiling older woman',
    'kitchen-coffee': 'A caregiver and an older woman laughing over coffee at the kitchen table',
    'door-handshake': 'A caregiver greeting an older woman at her front door',
    'mom-waiting': 'An older woman sitting by the window at home',
    'daughter-text': 'A daughter smiling as she reads a text about her mother\'s care',
    'door-wave': 'A caregiver waving as an older woman opens the front door',
    'early-morning': 'A daughter checking her phone early in the morning',
    'sofa-album': 'A daughter, her mother and a caregiver looking at a photo album on the sofa',
    'hands': 'A caregiver holding an older woman\'s hands',
    'family-door': 'A daughter and her mother at the front door',
    'apply': 'A caregiver applying for a job on her laptop',
    'interview': 'A caregiver in a job interview',
    'references': 'A woman making a phone call at her desk',
    'profile-photo': 'A caregiver having her profile photo taken',
    'welcome-porch': 'A caregiver welcomed with a hug on the porch by a daughter and her mother',
    'garden-visit': 'A caregiver and an older woman walking in the garden',
    'training': 'A caregiver completing her training at home',
    'evening-pills': 'A daughter sorting her parent\'s pills late in the evening',
    'album-dad': 'A daughter and her father looking through a photo album',
    'evening-call': 'A daughter on the phone in the evening',
    'puzzle': 'A caregiver and an older man working on a puzzle together',
    'cafe-outing': 'Two women laughing together at a cafe',
    'home-hug': 'A daughter hugging her father as a caregiver arrives',
    'dressing': 'A daughter helping her mother get ready for the day',
    'garden-walker': 'An older woman with a walker on a garden path with her daughter',
    'kitchen-walker': 'A daughter steadying her mother with a walker in the kitchen',
    'planning-talk': 'A mother and daughter talking through plans at home',
    'phone-together': 'A daughter and her mother looking at a phone together',
    'tired': 'A tired family caregiver resting her head in her hand',
}

PAGES = {
    # services
    'services/companion-care.html': 'puzzle',
    'services/24-hour-care.html': 'sofa-album',
    'services/errands-transportation.html': 'cafe-outing',
    'services/hourly-care.html': 'arrive-porch',
    'services/light-housekeeping.html': 'kitchen-coffee',
    'services/meal-preparation.html': 'kitchen-walker',
    'services/mobility-assistance.html': 'garden-walker',
    'services/overnight-care.html': 'early-morning',
    'services/personal-care.html': 'dressing',
    'services/respite-care.html': 'home-hug',
    # guides
    'guides/best-practices-for-dementia-care.html': 'sofa-album',
    'guides/caregiver-burnout.html': 'tired',
    'guides/dementia-and-alzheimers.html': 'album-dad',
    'guides/diabetes-care-for-seniors.html': 'kitchen-coffee',
    'guides/eating-well-as-we-age.html': 'kitchen-walker',
    'guides/fall-prevention-at-home.html': 'garden-walker',
    'guides/home-safety-room-by-room.html': 'family-door',
    'guides/hospital-discharge.html': 'door-wave',
    'guides/living-well-with-heart-failure.html': 'garden-visit',
    'guides/managing-copd-at-home.html': 'puzzle',
    'guides/medication-management.html': 'evening-pills',
    'guides/missouri-medicaid-hcbs.html': 'planning-talk',
    'guides/parkinsons-disease-at-home.html': 'dressing',
    'guides/planning-for-end-of-life-care.html': 'hands',
    'guides/stroke-recovery-at-home.html': 'door-handshake',
    'guides/va-benefits-for-home-care.html': 'home-hug',
    # care paths
    'care-paths/dementia.html': 'album-dad',
    'care-paths/falls-and-mobility.html': 'garden-walker',
    'care-paths/hospital-discharge.html': 'door-wave',
    'care-paths/overnight-care.html': 'early-morning',
    'care-paths/parkinsons.html': 'dressing',
    'care-paths/paying-for-care.html': 'phone-together',
    'care-paths/planning-ahead.html': 'planning-talk',
    'care-paths/stroke-recovery.html': 'kitchen-walker',
    # counties
    'counties/index.html': 'welcome-porch',
    'counties/greene.html': 'arrive-porch',
    'counties/christian.html': 'door-handshake',
    'counties/webster.html': 'garden-visit',
    'counties/polk.html': 'door-wave',
    'counties/taney.html': 'cafe-outing',
    'counties/phelps.html': 'kitchen-coffee',
    'counties/douglas.html': 'puzzle',
    # main pages
    'our-services.html': 'welcome-porch',
    'pricing.html': 'door-handshake',
    'book.html': 'arrive-porch',
    'contact.html': 'door-handshake',
    'care-journey.html': 'door-wave',
    'getting-started.html': 'daughter-text',
    'how-we-decide.html': 'planning-talk',
    'compare-care.html': 'phone-together',
    'decision-center.html': 'planning-talk',
    'facility-comparison.html': 'home-hug',
    'brain-injury-care.html': 'kitchen-walker',
    'chronic-conditions.html': 'evening-pills',
    'family-academy.html': 'sofa-album',
    'family-meeting-planner.html': 'evening-call',
    'long-term-care-insurance.html': 'phone-together',
    'medicare-guide.html': 'home-hug',
    'outings.html': 'cafe-outing',
    'referral-partners.html': 'welcome-porch',
    'refer.html': 'welcome-porch',
    'refer-a-friend/index.html': 'door-wave',
    'resource-library.html': 'daughter-text',
    'service-area.html': 'arrive-porch',
    'share-your-story.html': 'sofa-album',
    'sw-missouri-caregiver-resources.html': 'tired',
}

# Town pages take turns through the warm "a caregiver comes to the house" scenes.
TOWN_SCENES = ['arrive-porch', 'door-handshake', 'kitchen-coffee', 'garden-visit', 'puzzle',
               'door-wave', 'welcome-porch', 'sofa-album', 'cafe-outing', 'home-hug']
for i, p in enumerate(sorted(ROOT.glob('home-care-in-*-mo.html'))):
    PAGES.setdefault(p.name, 'welcome-porch' if p.name == 'home-care-in-springfield-mo.html'
                     else TOWN_SCENES[i % len(TOWN_SCENES)])


def figure(scene):
    return ('\n<figure class="pg-photo"><img src="/assets/photos/scene-%s.webp" alt="%s" '
            'width="1080" height="608" decoding="async"></figure>\n' % (scene, ALT[scene]))


def main():
    done, skipped = 0, []
    for rel, scene in PAGES.items():
        f = ROOT / rel
        t = f.read_text()
        if 'class="pg-photo"' in t:
            continue
        h1 = re.search(r'<h1[\s>]', t)
        end = t.find('</section>', h1.start()) if h1 else -1
        if end < 0:
            skipped.append(rel)
            continue
        end += len('</section>')
        f.write_text(t[:end] + figure(scene) + t[end:])
        done += 1
    print('added', done)
    if skipped:
        print('no top section, skipped:', ', '.join(skipped))


if __name__ == '__main__':
    main()
