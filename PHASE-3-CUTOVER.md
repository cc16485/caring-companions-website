# Phase 3: Cutover Plan — mo-care.com → the new site

_Planning document, July 2026. **Nothing has been changed.** This is for your
review and approval before any cutover happens._

## The goal

Make **mo-care.com itself serve the new site**, so Caring Companions has one
website. GoHighLevel keeps running the **booking calendar and SMS/email** behind
the scenes — we are only moving the *website*.

## What the crawl found (important)

mo-care.com is **113 pages**, not ~30. Breakdown:
- **~38 "regular" pages** — services, guides, about, pricing, contact, etc.
  Almost all already have a home on the new site (see map below).
- **75 local SEO landing pages** — `home-care-in-<town>-mo` for towns across
  Southwest Missouri (Nixa, Ozark, Branson, Republic, Bolivar, Marshfield,
  Joplin, Willard, Rogersville, Rolla, and 65 more).

**Those 75 town pages are your Awareness engine** — they're built to rank when
someone Googles "home care in Ozark MO." They almost certainly bring in local
search traffic today, and they're exactly the strategy your funnel blueprint
calls for. Protecting them is the single most important part of this cutover.

## THE ONE DECISION FOR YOU: the 75 town pages

**Option A — Recreate them (recommended).** I generate all 75 town pages on the
new site at their *exact same URLs*, using a clean template (town name +
which county + services + local resources + book CTA). Because the URLs stay
identical, **there's nothing to redirect and no ranking is lost** — Google just
sees the same pages, now better. This preserves and strengthens your local SEO
moat. Effort: mine (templated/generated), ~a day.

**Option B — Redirect them to county pages.** Point every town page to its
county resource center. Simpler, but you'd likely lose the town-specific
rankings over time (a county page doesn't rank for "home care in Ozark MO" as
well as a page titled exactly that). Not recommended given the SEO value.

My recommendation: **Option A.** It's more work for me, none for you, and it's
the difference between preserving your local search traffic and gambling with it.

## Redirect map — the ~38 regular pages

Pages that moved get a permanent (301) redirect so their rankings transfer.

| Old (mo-care.com) | New |
|---|---|
| `/companionship-care` | `/services/companion-care.html` |
| `/personal-care` | `/services/personal-care.html` |
| `/hourly-caregiver-services` | `/services/hourly-care.html` |
| `/24-hour-care-services` | `/services/24-hour-care.html` |
| `/live-in-care-services` | `/services/live-in-care.html` |
| `/overnight-care` | `/services/overnight-care.html` |
| `/private-duty-nursing` | `/services/private-duty-nursing.html` |
| `/respite-care` | `/services/respite-care.html` |
| `/light-housekeeping` `/meal-preparation` `/errands-transportation` `/mobility-assistance` | matching `/services/…` |
| `/hometogether` | `/hometogether.html` |
| `/medicare-guide-program` | `/medicare-guide.html` |
| `/our-story` | `/our-story.html` |
| `/our-caregivers`, `/caregiver-matching-447924` | `/our-caregivers.html` |
| `/caregiver-matching-survey` | `/assessment.html` |
| `/pricing` | `/pricing.html` |
| `/getting-started` | `/getting-started.html` |
| `/contact-us` | `/contact.html` |
| `/schedule-consultation` | `/book.html` |
| `/careers`, `/job-openings` | `/careers.html` |
| `/explore-care-options` | `/compare-care.html` |
| `/paying-for-care` | `/care-paths/paying-for-care.html` |
| `/medicaid-funded-home-care`, `/spend-down` | `/guides/missouri-medicaid-hcbs.html` |
| `/free-care-for-veterans` | `/guides/va-benefits-for-home-care.html` |
| `/service-area` | `/counties/` |
| `/sw-missouri-senior-resources` | `/resource-library.html` |
| `/dementia-alzheimers` | `/guides/dementia-and-alzheimers.html` |
| `/after-hospital-care` | `/guides/hospital-discharge.html` |
| `/end-of-life-care` | `/guides/planning-for-end-of-life-care.html` |
| `/blog` | `/resource-library.html` |

**Three small gaps** (no exact match yet) — I'll build quick pages for these so
nothing 404s or dead-ends: `/chronic-conditions`, `/brain-injury-care`, and a
`/blog/category/long-term-care-insurance` landing (→ can point to pricing/LTCI).

## How the cutover works (the mechanics)

1. **Build everything first** (town pages + the 3 gap pages) and review the whole
   site — no DNS change yet.
2. **Lower the DNS time-to-live (TTL)** on mo-care.com a day ahead, so if we ever
   need to undo it, the reversal is near-instant.
3. **Cut over in a low-traffic window** (e.g. early morning): point mo-care.com's
   DNS (at Cloudflare) to the new site on GitHub Pages, and add mo-care.com as
   the site's domain. The 301 redirects for moved pages go in at Cloudflare (the
   redirects live at the edge, where your DNS already is).
4. **Verify** against a checklist: homepage loads, a dozen key old URLs redirect
   correctly, booking works, forms submit, analytics/pixel fire, HTTPS padlock is
   green, and mobile looks right.
5. **Resubmit** the new sitemap in Google Search Console and monitor for any
   404s over the following week.

## Safety & rollback

- Booking, leads, and SMS/email **keep working throughout** — GoHighLevel stays
  on behind the site; only the web pages move.
- **Rollback is simple and fast**: revert mo-care.com's DNS to GoHighLevel. Because
  we lowered the TTL first, it takes effect within minutes. Nothing is destroyed.
- The one honest risk of any cutover is a short SEO dip while Google re-crawls;
  keeping URLs identical (town pages) and 301-ing the rest is exactly how you
  minimize it.

## What I'll need from you to execute

1. **Your decision on the 75 town pages** (Option A recommended).
2. **Cloudflare access** — either you add me/grant access, or you make the DNS +
   redirect changes yourself with me guiding you click-by-click (your call).
3. **Confirm** booking + SMS/email stay on GoHighLevel (recommended — no change).
4. **A timing window** you're comfortable with for the switch.

## Recommended sequence

1. You approve this plan + pick Option A/B for town pages.
2. I build the town pages + 3 gap pages (safe, additive, nothing on mo-care.com
   changes).
3. We schedule the DNS cutover together, run the verification checklist, and
   monitor. Reversible the whole way.
