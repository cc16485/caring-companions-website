# Caring Companions Core — architecture notes

**Purpose:** Core is the single governed knowledge layer for many future consumers. Cara is the first one, not the only one. This file records where today's code is already consumer-neutral, where it quietly assumes Cara, and what to change when a second consumer arrives.

**Written:** 2026-08-08, during the Cara retrieval work. Nothing here is built. It exists so the next person does not have to rediscover it.

---

## Intended consumers (none built yet)

public Cara · office/staff assistant · caregiver assistant · Content Studio · training · website audit · operations · leadership / company health · client workflows joined with AxisCare.

---

## Already consumer-neutral

| Thing | Why it holds up |
|---|---|
| `knowledge-api` as the only entry point | Nothing reads `kb_*` directly. A new consumer calls the same contract; it does not learn the storage. |
| `kb_answer_log.channel` | Exists, defaults `'cara'`, accepts anything. Per-consumer audit works today with no change. |
| `audience` on every record | The mechanism for "same brain, different access" is already in the data, not in the caller. |
| Retrieval / policy split | `concepts.js` finds, `knowledge-policy.js` decides. A consumer with different retrieval needs can change finding without touching the gate. |
| Record vs retrieval confidence | Kept separate. A staff assistant will need a different retrieval threshold than public Cara; the record's own trust is unaffected by that. |
| `kb_item_versions` + trigger | Versioning is automatic. Any consumer citing `id + version` stays auditable. |
| RLS on, zero policies | Only the service role reads. Adding a consumer does not widen exposure by accident. |

---

## Where it currently assumes Cara

These are not bugs today. They are the places that will cost the most to change later, listed so the cost is a decision rather than a surprise.

### 1. `audience` is binary, and the fix is NOT a hierarchy

`knowledge-api/index.ts`:
```js
const audience = body.audience === 'internal' ? 'internal' : 'public'
```
`knowledge-policy.js`:
```js
const publicOk = audience !== 'public' || r.audience === 'public'
```

Two values, and `internal` means "sees everything".

**An earlier draft of this file proposed a ladder** (`public < caregiver < office < clinical < leadership`). That was wrong and is corrected here. Access is not one-dimensional. Marketing needs public and marketing-approved material but has no business in HR records. A clinical lead needs clinical procedure but not leadership financials. A ladder grants everything below your rung, which is precisely the wrong default for a company holding HR, clinical, billing and payer information in one place.

**Model it as orthogonal scopes, not a rank.** A record carries:

| Dimension | Values | What it answers |
|---|---|---|
| `audience` | public, internal | Can this leave the building? |
| `roles[]` | caregiver, coordinator, clinical, billing, hr, marketing, leadership | Whose job touches this? |
| `program` | IHS, CDS, GUIDE, VA, LTCI, private_pay | Which payer's rules govern it? |
| `knowledge_type` | external_rule, company_procedure, company_policy, case_precedent | What KIND of true is it? |
| `sensitivity` | public, internal, confidential, restricted | How closely held is THIS record? |

Access becomes a predicate, not a comparison:
```
visible = audience_ok(caller, record)
       && record.roles ∩ caller.roles ≠ ∅
       && (caller.programs is empty OR record.program ∈ caller.programs)
```
No inheritance, no accidental grants. Leadership gets broad access because it is granted every role, not because it sits at the top of a ladder.

**`sensitivity` is a separate dimension from `knowledge_type`, on purpose.** It is tempting to let the type imply the confidentiality, and that is wrong. Two records can share a type and have nothing in common in how closely they must be held:

| Record | knowledge_type | sensitivity |
|---|---|---|
| How we onboard a new caregiver | company_procedure | internal |
| How we handle an employee investigation | company_procedure | restricted |
| What CDS pays | company_policy | internal |
| Owner compensation decisions | company_policy | restricted |

Type answers *what kind of true is this*. Sensitivity answers *who may see it at all*. Collapsing them means the first restricted record forces a type to be invented for it, and the taxonomy starts describing confidentiality instead of truth.

Suggested values: `public` (may leave the building) · `internal` (any employee whose role matches) · `confidential` (named roles only, e.g. HR, billing, clinical) · `restricted` (leadership, or explicitly named individuals). Access is still a predicate, with sensitivity as one more term in it, not a rank that overrides the others.

**`knowledge_type` still does double duty and that is also deliberate.** It is a retrieval and presentation dimension *and* the thing that must never be blurred when an answer is presented:

- **external_rule** — Medicaid, DHSS, CMS, VA or a carrier requires this
- **company_procedure** — how Caring Companions operationally complies
- **company_policy** — our own decision, and must never be represented as a government requirement
- **case_precedent** — how we handled a specific situation once, anonymised

That distinction is a compliance exposure, not a presentation preference. A coordinator who cannot tell the difference will describe a company preference to a family, or to an auditor, as a state requirement.

**Current state, and the luck in it:** `audience` has no CHECK constraint, so its values can widen without a schema migration. `roles`, `program`, `knowledge_type` and `sensitivity` do not exist yet and would be additive columns with safe defaults (`roles = all internal roles`, `program = null` meaning cross-program, `knowledge_type = company_procedure`, `sensitivity = internal`). Defaulting sensitivity to `internal` rather than `public` matters: a record that nobody has classified must not be publishable by omission. Nothing needs backfilling by hand as long as they are added **before** a second consumer starts writing records.

### 2. `status` is a flat enum with no time dimension

`verified | unverified | stale | held`. Nothing expires. `stale` is set by a human noticing.

**Room needed for expiration / reverification:** a nullable `review_by date` and a `review_interval` per record, with a scheduled job that flips `verified` to `stale` on its own. The policy gate needs no change at all, because it already refuses anything not `verified`. Expiry is a way of *setting* status, not a new gate.

Different facts want different clocks: a phone number yearly, a price quarterly, Medicaid eligibility every 90 to 180 days, a seasonal promotion on a fixed end date.

### 3. Impact analysis has the data but no reverse index — **BUILT, 2026-08-09**

`kb_answer_log` records which records answered which questions, so "what has Cara said using N002" is already answerable. What was missing was the **forward** direction: which website pages, Canva templates, training lessons and SOPs depend on a fact.

This was left unbuilt on the stated grounds that it is worthless until something depends on knowledge. **Company paperwork is that something**, and the reasoning that had ruled it out was wrong in an instructive way: onboarding forms were being thought of as blank documents with no knowledge in them. A form is not empty of claims. The packet states a pay rate, a pay cycle, how timesheets work, what training is required, EVV acknowledgements. Every one of those is a fact, and every one can go out of date.

Built in `20260808i_company_assets.sql`:

- **`kb_dependencies`** — `(kb_item_id, consumer, asset_type, asset_ref, document_id, claim, claim_location, relationship, item_version_seen, status)`. One row per fact-stated-somewhere.
- **`item_version_seen`**, not just a status flag. A dependency records the version of the fact it was last checked against, so `drifted` is computed rather than trusted. A row written before a change, or missed by a trigger, still reads as out of date.
- **A trigger on `kb_items`** that flags dependents when the answer changes or the record stops being verified. Detection is not correction, the same rule that governs source rechecks: it produces a list, it never edits a document.
- **`kb_dependency_check` / `kb_asset_health` / `kb_fact_impact`** — the claim beside the fact, one row per asset, and the reverse direction for a fact's own detail panel.

**Nothing in this table is read by retrieval or by the policy gate.** It answers "what is affected", never "what may Core say".

### 3b. A document is either a reference or an asset — **BUILT, 2026-08-09**

The distinction the dependency work forced, and the one that keeps it safe.

| | Reference | Asset |
|---|---|---|
| What it is | something Core may learn from | something the company hands out |
| Examples | HCBS manual, 19 CSR 15-8, approved SOP | onboarding packet, training manual, handbook, offer letter |
| Core's use | derive verified knowledge, cite it | read what it CLAIMS, check those claims |
| May be a citation | yes | **never** |

**An asset is never authority.** If the packet says $14.00 an hour and the verified record says $15.00, the *form* is wrong, not the record. Ingesting paperwork as a primary source would invert that and let a stale document overrule the truth.

That is enforced rather than documented. A trigger refuses any insert into `kb_document_knowledge` for a document whose role resolves to `asset`, and a second trigger refuses to reclassify a document as an asset once records have been approved from it.

`doc_role` sits alongside `authority` rather than inside it, because they answer different questions. Authority is how much weight a source carries. Role is whether it is read for truth or checked for accuracy. An approved SOP is `company` + `reference`; the onboarding packet built from that SOP is `company` + `asset`.

### 4. `decide()` returns a family-shaped refusal

`buildRefusal()` writes in Cara's voice and offers the public phone number. A staff assistant should say "this is unverified, here is who owns it", not "please call us".

**When a second consumer arrives:** `decide()` already returns a structured `decision`, `reason`, `withheld` and `candidates`. Move `buildRefusal` out of the shared module and into each consumer. The decision is shared; the wording is not.

### 5. One retrieval tuning for everyone

`CANDIDATE_MIN`, `ANSWER_MIN`, `AMBIGUITY_GAP` are module constants. A caregiver asking about their own handbook can tolerate a looser threshold than a stranger on the website asking about Medicaid eligibility.

**When needed:** pass thresholds in through the `decide()` options object, defaulting to today's values. Small change, but only worth making when a second consumer actually wants different numbers.

---

## Rules to hold to

1. **No consumer talks to `kb_*` directly.** Ever. The API is the contract.
2. **The gate lives in one place.** Retrieval may get smarter in any way at all; `verified + audience` stays the only thing that decides what may be said.
3. **Every answer is logged with its channel.** An unattributable answer is an unauditable one.
4. **A consumer never writes knowledge.** It proposes. Verification stays a human act by one role.
5. **Adding a consumer must not require changing what a record means.** If it does, the record model is wrong.

---

## Deliberately not built

Expiration jobs · role, program and sensitivity scopes on `kb_items` · per-consumer thresholds · per-consumer refusal wording · any second *answering* consumer.

Each is cheap to add against this shape and expensive to retrofit against a shape that assumed one caller. That is the entire point of writing this down instead of building it.

**The dependency graph came off this list on 2026-08-09.** Worth recording why, because the reasoning generalises: it was not built because nothing depended on knowledge, and that stayed true for every *answering* consumer. It stopped being true the moment company paperwork was recognised as a consumer — not one that asks Core questions, but one that makes claims Core can check. A thing does not have to read the knowledge API to depend on a fact.
