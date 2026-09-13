# Caring Companions Core — what is real, what is not

**Updated:** 2026-08-08. Keep this current. It is the map for turning the Core prototype into the real application.

Core is currently **one prototype file with one real section**. `Caring Companions Core.html` on the Desktop is the interface; everything behind it is either invented example data or, for Source Library, a live Supabase backend.

Every screen carries its own label in the UI, so this document and the app cannot disagree:

- **PROTOTYPE DATA** — example information for designing Core. Not connected to live company systems.
- **LIVE** — connected to the Core knowledge infrastructure.

---

## Status by section

| Section | Status | Backend | Notes |
|---|---|---|---|
| **Source Library** | **LIVE** | `source-api` + `kb_publications` / `kb_source_documents` / `kb_source_chunks` | The first real section. Everything shown is what was actually added. |
| **Company assets / claim check** | backend LIVE, **no UI yet** | `source-api` (`scan_asset`, `track_claim`, `claims`, `asset_health`, `fact_impact`) + `kb_dependencies` | A document is now a reference or an asset. Assets are checked against verified knowledge, never cited. The API works; the Source Library screen does not yet let you set the role or see the claim check. |
| Knowledge | PROTOTYPE | — | Shows 6 invented records. The **real** 6 records live in `kb_items` and are what Cara actually uses. The two are not connected, which is the single most confusing thing in Core today. |
| Relationship graph | PROTOTYPE | — | Draws invented sources, facts and experiences. |
| Review queue | PROTOTYPE | — | Invented. Real staleness lives in `kb_items.status`. |
| Proposed updates | PROTOTYPE | — | Invented. The real correction workflow is designed but not built. |
| Home / Company health | PROTOTYPE | — | Alerts and coverage percentages are computed from the invented data. |
| In your hub | PROTOTYPE | — | Mockups of the Staffing, CDS and Training hubs. |
| Decision center | PROTOTYPE | — | Invented situations. |
| Media | PROTOTYPE | — | Points at `Media OS.html`, itself a prototype. |
| AI agents | PROTOTYPE | — | Describes agents. Only **Cara** exists, and she is genuinely live. |
| Roles and access | PROTOTYPE | — | The permission model is real as a design; there is no authentication anywhere in Core. |
| How it works | Static | — | Explanatory text only. |

---

## What is genuinely live outside Core's UI

These run in production regardless of the prototype:

| Thing | Where | State |
|---|---|---|
| `kb_items`, `kb_sources`, `kb_item_versions`, `kb_answer_log` | Supabase `zngsgedlsxinbygwmxwn` | LIVE, 6 records |
| `knowledge-api` | Supabase edge function | LIVE |
| `cara-chat` | Supabase edge function | LIVE, answering families on the website |
| Retrieval policy + concept layer | `_shared/knowledge-policy.js`, `_shared/concepts.js` | LIVE, 58 tests |
| Claim scanning | `_shared/asset-claims.js` | written, 26 tests |
| Batch add (many URLs / files at once) | Core prototype, Source Library | written, 35 tests |
| Truncation is recorded, not silent | `20260808j` + `add_doc` | written. A document over 600 sections now stores `sections_found` and the library reports what was dropped. |
| Verifying a record | `3 - Verify a Knowledge Record.command`, Desktop | written, 8 dry runs. Core has no write path, so verifying is a script against the Management API, not a screen. Replaced by step 2 below. |
| `source-api` + `20260808d` | written | **not yet deployed** |
| Company assets + dependencies, `20260808i` | written | **not yet applied** |

---

## The honest gap

**Core's Knowledge screen does not show the knowledge Cara actually uses.** The prototype shows six invented records; Cara answers from six real ones in `kb_items`. They happen to be similar, which makes it worse rather than better, because the resemblance hides the disconnection.

That is the next thing to fix after Source Library is in use, and it is a small job: point the Knowledge screen at `knowledge-api` the way Source Library points at `source-api`. Same pattern, already proven.

---

## Migration order

Each step turns one prototype section real. Ordered by value over effort.

1. **Source Library** — in progress, backend pending deployment
2. **Knowledge** — point at `knowledge-api`. Small, and removes the most misleading screen in Core.
3. **Review queue** — derive from `kb_items.status` and confidence. Data already exists.
4. **Proposed updates** — needs the correction workflow tables, which are designed but not built.
5. **Company health** — compute alignment from real records rather than invented ones. Depends on 2 and 3.
6. **Relationship graph** — `kb_dependencies` now exists (`20260808i`), so this is buildable. The first real edges come from company paperwork: which onboarding forms state which facts.
7. **Home alerts** — depends on almost everything above.
8. **Authentication** — Core has none. Required before any non-owner uses it, and a hard blocker on the staff assistant.

**Number 8 is the real one.** Every permission behaviour in Core today is a display filter in a local HTML file, not a security boundary. It demonstrates the model faithfully and enforces nothing. That has been fine while Samantha is the only user and stops being fine the moment anyone else opens it.
