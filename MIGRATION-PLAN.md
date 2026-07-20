# One-Site Plan: Merging mo-care.com into the new platform

_Prepared July 2026. This is a planning document — nothing has been changed on
mo-care.com. Read this before we start executing._

## The goal, stated plainly

Today you have **two websites**: `mo-care.com` (your brand site, built inside
GoHighLevel) and `mo-care.com` (the new 55-page platform, built in code).
Two sites that overlap is bad — it splits your Google ranking and confuses
families. The goal is **one website** that families and Google see as the single
home of Caring Companions.

## The key reframe (this is the important part)

**"One site" does not have to mean "rip out GoHighLevel."**

GoHighLevel does two very different jobs today:

1. **It hosts your website** (the ~30 marketing pages). — This is the part worth
   moving into the new code site. It's where the new platform is far stronger.
2. **It runs your back office** — the booking calendar, and the SMS/email that
   your lead nurture sends. — This part GoHighLevel does *well*, and it should
   stay, working quietly behind the new site.

So the smart version of "full merge" is: **make the new code site your single
website, and keep GoHighLevel as the booking + messaging engine behind it.**
That gets you the one-site goal without the risk of tearing out booking and
communication. Fully leaving GoHighLevel is a *separate, optional* step for
later (see Phase 4) — not required to reach one site.

## What's on mo-care.com today, and where it lands

| mo-care.com page | Status in new site |
|---|---|
| Service pages (companion, personal, live-in, overnight, 24-hour, hourly, private-duty) | ✅ Already built |
| paying-for-care, medicaid, spend-down, veterans, explore-care-options | ✅ Already built (guides / compare / care-paths) |
| contact-us, schedule-consultation | ✅ Already built (contact, book) |
| service-area, sw-missouri-senior-resources | ✅ Covered (county centers + resource library) |
| **our-story (About)** | ⬜ To build |
| **our-caregivers** | ⬜ To build |
| **pricing** | ⬜ To build |
| **getting-started** | ⬜ To build |
| **HomeTogether™** | ⬜ To build |
| **respite-care** | ⬜ To build |
| **medicare-guide-program** | ⬜ To build |
| **caregiver-matching** (survey/flow) | ⬜ To build |
| light-housekeeping, meal-prep, errands, mobility (task pages) | ⬜ To build (or fold into service pages) |
| **Careers** | ⬜ To build |
| **Blog** | ⬜ Needs a decision (see below) |

Roughly **10–12 new pages** to reach parity, all of which I build in code (safe,
fast, on-brand). None of this touches mo-care.com.

## The three decisions that are yours to make

1. **Booking calendar** — Recommendation: **keep the GoHighLevel calendar**,
   embedded directly in the new site's `book.html` (you paste me the embed code
   once; ~1 minute). Keeps availability sync, reminders, and CRM. Don't rebuild it.
2. **SMS/email + nurture** — Recommendation: **keep GoHighLevel** for now. Your
   lead-nurture already sends through it and works. Revisit only in Phase 4.
3. **Blog** — Do you actively use the mo-care.com blog? If yes, I'll add a
   lightweight blog to the new site (no monthly cost). If it's dormant, we skip it.

## The phases (each one safe; the risky step is last and deliberate)

**Phase 1 — Build the missing pages (zero risk, start anytime).**
I build the ~10–12 pages above in the new site. mo-care.com keeps running
untouched. At the end, `mo-care.com` is a *complete* standalone site.

**Phase 2 — Wire in the back office + tracking (low risk).**
Embed the GoHighLevel calendar in-page. Re-add Google Analytics + Facebook
pixel. Re-add the reviews widget. Decide the blog. Still no change to mo-care.com.

**Phase 3 — The cutover (the one real-risk step; done once, carefully).**
Point `mo-care.com` itself at the new site, and 301-redirect every old URL to
its new equivalent so your Google rankings carry over (I prepare the full
redirect map in advance). GoHighLevel keeps running the calendar + messaging
behind the scenes. We do this only after everything is built and you've reviewed
the whole site. It's reversible.

**Phase 4 — (Optional, later) Leave GoHighLevel entirely.**
Only if you ever want to. Would mean replacing the calendar (e.g. Cal.com or
Acuity) and SMS/email (e.g. Twilio/SendGrid). A separate decision with its own
cost/benefit — **not needed to have one site.**

## Honest cost & risk summary

- **Phases 1–2**: my time only, no new monthly cost, no risk to the live business.
- **Phase 3**: the sensitive step — but de-risked by building everything first,
  preparing redirects, and being reversible. Your booking and lead flow keep
  working throughout because GoHighLevel stays on behind the site.
- **What you'd be giving up by moving the website off GoHighLevel**: the GHL
  visual page editor for those pages (future edits go through code/me instead of
  drag-and-drop). Worth weighing if your team edits the site often.

## Recommended next step

Start **Phase 1** now — it's safe, additive, and needed no matter what. While I
build the missing pages, you decide the blog question and grab the calendar
embed code. Nothing on mo-care.com changes until you approve Phase 3.
