# Core Source Library — proposal

**Status:** proposal only. Nothing built. Written 2026-08-08 after the retrieval deployment and live verification.

**Problem it solves:** Samantha should not have to personally read, remember and hand-enter every rule from six program manuals. Core should ingest the manuals, help structure the rules, and let humans approve what becomes truth.

---

## The rule this is built on

```
SOURCE → PARSE/INDEX → EXTRACT PROPOSED KNOWLEDGE → REVIEW/APPROVE → VERIFIED CORE RECORD
```

Never `upload PDF → treated as truth`. Ingestion produces **candidates**, never verified records. The approval step already exists in Core's correction queue and is reused, not reinvented.

---

## 1. Data model

### `kb_sources` (exists, needs extending)

Today it holds `id, name, note, kind`. Add:

```
authority       'primary' | 'company' | 'secondary'
program         IHS | CDS | GUIDE | VA | LTCI | private_pay | null (cross-program)
jurisdiction    'MO' | 'federal' | 'carrier:<name>' | 'internal'
publisher       'MO DHSS' | 'MO HealthNet' | 'CMS' | 'VA' | carrier | 'Caring Companions'
url             text
file_ref        storage path if uploaded
version_label   'Rev 2026-03' etc, as the publisher names it
published_on    date
effective_on    date
superseded_on   date            -- set when a newer version arrives
superseded_by   source id
review_owner    who is responsible for re-checking it
last_checked    date
```

**Authority levels, and the rule that governs them:**

| Level | What | Examples |
|---|---|---|
| `primary` | Statute, regulation, state or federal manual, payer contract | 19 CSR 15-8, MO HealthNet provider manual, CMS GUIDE guidance, VA CCN manual, an LTCI carrier's provider guide |
| `company` | Approved Caring Companions policy or SOP | Employee handbook, call-off SOP |
| `secondary` | Explanatory or training material | Webinar transcript, vendor training deck, a summary article |

**Lower authority never silently overrides higher.** If a `secondary` source contradicts a `primary` one, that is a conflict raised for a human, not a value that wins. A webinar transcript is `secondary` even when the presenter is authoritative, unless the underlying document is also ingested.

### Publication vs document — two levels, not one

A manual is one logical thing published by one agency, and also forty pages that each move, change and get revised independently. Flattening those into one row loses page-level provenance; splitting them loses the fact that it is one manual with one authority and one owner.

**`kb_publications` (new)** — the thing you would name in conversation.

```
id, title            'Home and Community Based Services Policy Manual'
publisher            'Missouri DHSS'
authority            primary | company | secondary
program              CDS | IHS | GUIDE | VA | LTCI | private_pay | null
jurisdiction         'MO' | 'federal' | 'carrier:<name>' | 'internal'
home_url             the manual's index page
review_owner, last_checked, status
```

**`kb_source_documents` (new)** — each page or section under it, carrying its own provenance.

```
id, publication_id
title                'CDS Policy Clarification Questions'
canonical_url
format               html | pdf | docx | transcript
publisher_revision   nullable. NULL means the publisher did not state one.
effective_on         nullable, same rule
retrieved_at         when Core actually fetched it
content_hash         sha256 of the extracted text Core indexed
last_checked
status               indexed | changed | moved | gone | superseded | error
chunk_count, page_count
```

The Source Library shows one HCBS Manual. Opening it lists its documents, each with its own URL, retrieval date and status.

### Never invent a version

If the publisher states no revision date, Core records the absence rather than filling it:

```
Publisher version:  not provided
Retrieved and verified from the official source: 8 August 2026
```

An invented `effective_on` is worse than a missing one, because everything downstream, expiry included, would compute against a fiction. `publisher_revision` and `effective_on` are nullable on purpose, and `retrieved_at` is not.

### Change detection is the point, not a nicety

`content_hash` exists so Core can answer a question nobody can reliably answer by memory: **did the official source change since we last looked?**

The stale URLs found while scoping this pilot are the argument. Every `health.mo.gov/seniors/hcbs/…` address, including the manual index and its section PDFs, now 404s. Search engines still list them as current. Nobody was notified. A knowledge base that had ingested those a year ago would still be citing them, confidently, at addresses that no longer exist.

So each document is periodically re-fetched and compared:

| Signal | Meaning | Status |
|---|---|---|
| hash matches | unchanged since last verification | `indexed` |
| hash differs | content edited, no revision announced | `changed` |
| 301/302 to a new URL | reorganised | `moved` |
| 404 | withdrawn or restructured | `gone` |
| newer `publisher_revision` | formally superseded | `superseded` |

Which then produces the thing that actually removes work from a person's head:

```
3 authoritative sources changed since last verification.
7 Core rules may require review.

  DHSS CDS Policy Clarification   content changed 2 days ago    → 4 rules
  MO HealthNet Personal Care 2.12 new revision 04/26            → 2 rules
  MMAC CDS enrollment page        moved, now 404 at old URL     → 1 rule
```

That reverses the burden. Instead of remembering to check Missouri's websites, you are told when they change, and told which of your own rules are implicated. `kb_dependencies` supplies the "which rules" half; the hash supplies the "changed" half. Neither works alone.

Detection is not correction. A changed source flags affected records for review. It never edits or invalidates them on its own.

### `kb_source_chunks` (new)

```
id, document_id, ordinal, page, section, heading, text, embedding
```

Parsed passages with their location preserved, so every approved rule can cite page and section rather than "somewhere in the manual".

### `kb_candidates` (new)

```
id, source_id, chunk_ids[], proposed_question, proposed_answer,
knowledge_type, program, topics[], effective_on,
extraction_confidence, conflicts_with (kb_item id), status
status: 'proposed' | 'approved' | 'edited' | 'rejected' | 'needs_clarification'
reviewed_by, reviewed_at, review_note
```

The staging area. Nothing here is readable by any consumer. On approval a candidate becomes a `kb_items` record carrying `source_id`, `page`, `section`, `effective_on`.

### `kb_items` additions

`source_page`, `source_section`, `effective_on`, `superseded_on`, plus the dimensions already agreed in the architecture notes: `roles[]`, `program`, `knowledge_type`, `sensitivity`.

---

## 2. Ingestion flow

1. **Add a source.** Upload a PDF, paste an official URL, or point at a file. Capture title, publisher, program, authority, version, published and effective dates. Nothing is extracted yet.
2. **Parse and index.** Split into passages with page and section retained. Embed each for semantic search.
3. **Extract candidates.** For a defined topic list per program (eligibility, authorization, EVV, documentation, incidents, reassessment, billing, training), propose `question + answer + citation + effective date`. Every candidate is checked against existing `kb_items` and flagged if it contradicts one.
4. **Review.** Approve, edit, reject or mark needs-clarification. Approval is the only path into Core, and it stays a human act by one accountable role.
5. **Promote.** The approved candidate becomes a verified record with full provenance.

Extraction never writes to `kb_items`. That boundary is the whole design.

---

## 3. Two retrieval modes, deliberately unequal

| | Verified Core Answer | Source Research |
|---|---|---|
| Reads | approved `kb_items` only | `kb_source_chunks` |
| Who | everyone, including public Cara | leadership, and later office staff |
| Presented as | the company's answer | *"Found in the Missouri CDS manual, page 44. This has not been promoted to verified Core knowledge."* |
| May be quoted to a family | yes | **no** |

**Public Cara never gets Source Research.** She answers from approved structured knowledge or she refuses, exactly as she does today. Nothing in this proposal loosens that.

Source Research exists so Samantha can get an answer at 9pm from a 300-page manual nobody has finished structuring, while it stays visibly distinct from settled truth. The label is not decoration; it is the difference between "we know this" and "I found this."

---

## 4. What I would build first

**Phase A, the smallest useful thing:** one source, one program. Ingest the Missouri CDS manual. Parse, index, and enable Source Research for leadership only. No extraction, no candidates, no approval UI.

That alone answers "what does the manual actually say about X" without any promise that it is settled, and it proves parsing and citation before anything harder is built.

**Phase B:** candidate extraction into a review queue, reusing the correction workflow already designed.

**Phase C:** the remaining programs, and expiry driven by `effective_on` / `superseded_on`.

---

## 4b. The Source Library (human-facing inventory)

Ingestion must never be invisible. The Source Library is the screen that answers "what has Core been given, and what has it actually learned from it".

### List view

Columns: **source name · program · authority · type · status · effective date · added · last checked · version · added by**, plus the four numbers that matter most:

| Extracted | Verified | Awaiting review | Depended on by |
|---|---|---|---|
| how much Core pulled out | approved records from it | candidates nobody has judged | downstream answers, procedures, pages, lessons |

Status is a real lifecycle: `Uploaded · Processing · Indexed · Needs Review · Active · Superseded · Archived · Error`. `Error` is a first-class state, not a silent failure.

Filters: **All · IHS · CDS · GUIDE · VA · LTC Insurance · Company Policies · Training**, crossed with **Needs Attention · Current · Needs Review · Expiring · Superseded**.

Natural-language search over source metadata, not source contents: *"everything we have from Missouri about CDS"*, *"which GUIDE documents have not been reviewed recently"*. This searches the shelf, not the books. Searching inside the books is Source Research (§3) and is a separate, labelled thing.

### Source detail

1. **Original** — view or download the file, or open the official URL. Always reachable.
2. **What Core found** — sections and topics detected.
3. **Verified knowledge** — every approved record derived from it.
4. **Needs review** — extracted candidates nobody has judged.
5. **Questions this source can answer** — worked examples of current understanding.
6. **Dependencies** — Cara answers, staff procedures, playbooks, website claims, training, marketing that rest on it.
7. **History** — added, reviewed, replaced, reverified, superseded.

### The distinction that must never blur

**Source coverage is not knowledge coverage.** Uploading a 300-page manual does not mean Core knows it. The UI shows both, always, adjacent:

```
Missouri CDS Manual
Source:  Indexed ✓   184 pages · 47 topics detected
Knowledge: 31 proposed · 18 verified · 13 awaiting review
```

Showing "Indexed ✓" alone would imply Core has learned the manual. It has read it. Those are different, and conflating them recreates the exact problem this system exists to prevent.

---

## 4c. Program Knowledge (coverage view)

Open **Medicaid CDS** and see, per operational topic, whether current verified knowledge exists:

```
Medicaid CDS — 72% operational coverage
  Getting started            ✓ strong
  Eligibility                ⚠ no verified rule
  Attendant eligibility      ✓ strong
  Family caregivers          ✓ strong
  EVV                        ✓ strong
  Authorizations             ⚠ partial
  Hospitalization            ✗ no procedure
  Incidents                  ✗ no procedure
  Reassessment               ⚠ partial
  Discharge / termination    ✗ no procedure

  Sources 7 · Verified rules 48 · Company procedures 31
  Gaps 9 · Need reverification 3 · Conflicts 1
```

### The requirement that makes this honest

**Coverage is never computed from document count.** A percentage derived from "we uploaded 7 PDFs" is a number that feels like information and is not.

Coverage is measured against an **authored operational topic list per program**: the things a coordinator actually has to handle. Getting started, eligibility, authorizations, EVV, documentation, monitoring, hospitalization, change in condition, incidents, reassessment, billing, discharge, audits.

That list is itself a knowledge artifact. Someone has to decide what a complete understanding of CDS means before any percentage is meaningful, and that list should be sourced and approved like anything else. **Without it there is no denominator, and any number shown is invented.**

This has a useful consequence: **a knowledge gap is just an unchecked box on that list.** Program Knowledge and Knowledge Gaps are the same data viewed two ways, so they cannot drift apart.

A topic counts as covered only when its knowledge is `verified`, within its review window, and free of unresolved conflicts. Stale knowledge shows as a gap, because operationally it is one.

---

## 4d. How the pieces fit

```
                    SOURCE LIBRARY
              (what we have been given)
                          │
                    parse · index
                          │
                   candidates ──────► REVIEW QUEUE ──► VERIFIED KNOWLEDGE
                                            ▲                  │
                                            │                  ▼
   KNOWLEDGE GAPS ──────────────────────────┘          PROGRAM PLAYBOOKS
   (unanswered questions +                             (situation → procedure,
    unchecked topics)                                   assembled from records)
            ▲                                                  │
            │                                                  ▼
            └────────────── SAMANTHA / STAFF ASSISTANT ◄────────┘
                       (verified answer, or source research,
                        or "no approved procedure, decision needed")
```

- **Knowledge Gaps** is fed from two directions: questions Cara and staff could not answer, and topics with no verified knowledge. Same queue, two inlets.
- **Program Playbooks** are assembled from verified records, never authored separately. A playbook with a missing step is a visible gap rather than a quiet blank.
- **The assistants** read verified knowledge first. Leadership may fall back to Source Research, clearly labelled. When neither exists, the honest answer is *"no approved procedure, this needs a decision"*, and that resolution becomes a new candidate.

Every arrow into verified knowledge passes through human review. There is no path around it.

---

## 5. What this proposal does not solve

**Retrieval intent versus domain.** Live testing found that "Who qualifies for CDS?" retrieves the *who directs care* record at 0.55, because `cds` matches as a subject while `eligibility` matches nothing. Every CDS record covers the domain; none covers the intent.

Two possible fixes: weight intent concepts above domain concepts in scoring, or create a real CDS eligibility record. **The second is the right one**, and it is the argument for this whole proposal. Tuning retrieval to make a neighbouring record answer a question it does not answer is the failure mode we already hit once.

That is exactly what a Source Library produces: a source-backed eligibility record with age, Medicaid, functional and self-direction requirements, citing the manual section it came from.
