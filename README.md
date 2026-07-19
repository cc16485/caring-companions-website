# Caring Companions Website

The public website + family decision platform for Caring Companions In-Home Senior Care,
built from the July 2026 design handoff ("Caring Companions website overview.zip").

**LIVE at https://guide.mo-care.com/** (GitHub Pages, repo
`cc16485/caring-companions-website`). 55 pages, plain HTML/CSS/JavaScript — no build
step. Push to `main` to deploy. To move to a custom domain later (e.g. a subdomain of
mo-care.com), add a CNAME in Pages settings and re-run the SEO canonicals for the new URL.

**SEO:** every page has canonical URLs, meta descriptions, Open Graph tags, and favicons;
service pages carry FAQ structured data, the homepage/contact carry LocalBusiness data;
`sitemap.xml` + `robots.txt` are published. Still to do (needs Samantha's Google account):
verify the site in Google Search Console, submit the sitemap, and link it from the
Google Business Profile.

**Analytics:** first-party and anonymous (`assets/site-events.js` → `website_events`
table on the shared Supabase). Tracks page views, tool completions (with recommended
level), lead submissions, Cara chat use, and phone-number clicks — the Funnel
Blueprint's KPIs. No cookies, no personal data; localhost visits are ignored. The
public key can only insert; hub logins can read. Ask Claude for a report anytime, or
to add a dashboard page to the CC Hub.

## What's here

| Area | Files |
|---|---|
| Homepage | `index.html` |
| Cara AI Care Advisor (guided consultation) | `cara.html` |
| Digital Care Assessment (8-step, printable report) | `assessment.html` |
| Home Care Decision Center (guided journeys) | `decision-center.html` |
| County Resource Centers (searchable directories) | `counties/` — Greene, Christian, Douglas, Phelps, Taney, Webster |
| Guides (16 articles) | `guides/` |
| Care paths (question funnels) | `care-paths/` — dementia, falls, hospital discharge, etc. |
| Services (7 pages) | `services/` |
| Planning tools | `cost-calculator.html`, `compare-care.html`, `home-safety-check.html`, `family-meeting-planner.html` |
| Family Workspace (progress saved in the browser) | `family-workspace.html`, `family-checklist.html`, `decision-journal.html`, `facility-comparison.html`, `agency-interview-notes.html` |
| Other | `contact.html`, `resource-library.html`, `family-academy.html`, `referral-partners.html`, `how-we-decide.html` |
| Shared assets | `assets/` — styles, logo, site JS, Cara widget |

## Ask Cara chat (LIVE)

The floating "Ask Cara" widget and the acknowledgment step in `cara.html` are wired to
the deployed `cara-chat` Edge Function on the shared hub Supabase project
(`https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/cara-chat`). Its system prompt
includes the exact published rate card so Cara never invents prices, declines medical
and legal questions, and points people to (417) 234-8494. If the endpoint is ever
unreachable, both fall back gracefully to canned responses. Source lives in
`supabase/functions/cara-chat/` — redeploy after edits with
`supabase functions deploy cara-chat --project-ref zngsgedlsxinbygwmxwn --no-verify-jwt`.

## Before launch — important

- **Directory verification:** `internal/directory-call-sheet.html` (printable) and
  `internal/directory-call-sheet.csv` (trackable) list all 270 directory organizations,
  with the 129 flagged "verify first" sorted to the top and a 30-second call script.
  The `internal/` folder is not linked from the site; delete it before deploying if
  you'd rather it not be public (it contains only public directory info).
- **Forms are live.** Contact, referral, and both "email me this report" boxes now post
  to the shared hub's `lead-intake` Edge Function — every submission becomes a lead in
  the CC Hub pipeline (source "Website") with follow-up due the same day. Report-email
  requests arrive as leads containing the visitor's results, for a coordinator to send.
- **Photography:** filled with photos reused from the mo-care.com media library
  (`assets/photos/`), and the contact page shows a real OpenStreetMap embed of the
  office. Optional upgrade later: authentic photos of the actual team. The handoff's
  art direction for a reshoot — hero: "daughter helping her mother make tea, morning
  light — warm, quiet, unposed"; guide covers: one dementia/companionship moment, one
  hospital-return moment, one paperwork/planning moment.
- **Not built (internal strategy documents, not public pages):** Business Operating
  System, Ecosystem Vision, Flywheel & Platform Strategy, Funnel Blueprint, Platform
  PRDs, Leadership Dashboard, The HomeFirst Constitution.

## Local preview

Any static server works, e.g. `python3 -m http.server 4173 --directory .`
(there's also a `cc-website` entry in `~/Claude/.claude/launch.json`).
