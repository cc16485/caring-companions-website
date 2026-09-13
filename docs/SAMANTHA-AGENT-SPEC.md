# Samantha Agent — specification

**Status:** specification only. No code. Do not implement until the Cara ↔ Core integration has run in production for roughly one week.
**Written:** 2026-08-08
**Depends on:** Caring Companions Core (`kb_*` tables, `knowledge-api`), currently built and tested but not yet deployed.

---

## 0. The one-sentence version

Cara answers strangers with what the company has verified. The Samantha Agent answers Samantha with what the company knows *and* what she has been thinking, and it never confuses the two.

### 0.1 What this actually is

Not a knowledge base. An **organisational reasoning graph**.

| Layer | Object | Answers |
|---|---|---|
| Why we cared | **Goal** | What were we trying to move? |
| What we believed | **Assumption** | What did we think was true, and what would disprove it? |
| What convinced us | **Evidence** | Why did we believe it? |
| What we chose | **Decision** | What did we commit to, and what did we reject? |
| What is true | **Knowledge** (Core) | What do we tell people? |
| What we made | **Experience** (Core) | Where does that show up? |
| Whether it worked | **Outcome** | Did the number move? |

Read downward, it explains what was built. Read upward, it answers the question no documentation system normally can: **why did we build this?**

Core already holds the bottom half. This spec adds the top.

---

## 1. Product requirements

### 1.1 What it is

A private, owner-only assistant that holds three separate kinds of context and keeps them separate:

| | What it is | Who owns the truth | Can it change? |
|---|---|---|---|
| **Company Truth** | Policies, pricing, procedures, Medicaid rules, service facts, approved strategy | Core, verified by the Knowledge Administrator | Only through the Core correction workflow |
| **Episodic Memory** | Decisions, rationale, rejected options, open questions, project history, commitments | Samantha | Freely, it is a record of her thinking |
| **Live Business Data** | Calendar, email, CRM, AxisCare, financials, staffing, marketing performance | The source system | Read-only, never cached as truth |

These are never merged into one undifferentiated store. The whole value of the system is that it can tell you which of the three a sentence came from.

### 1.2 Who it is for

Samantha. Later, possibly a second leadership user (Zach, a future marketing director) at the **leadership** tier, which sees less than owner.

Explicitly not for: caregivers, office staff, families, or Cara.

### 1.3 Requirements

**R1. Provenance on every claim.** For each statement it makes, the agent internally knows the source class: `core_verified`, `core_internal`, `memory`, `live_data`, or `inference`. It surfaces this whenever the distinction would change what Samantha does.

**R2. Recall without confabulation.** If she never decided something, the agent says so. "You never decided that" must be an easy and common answer, not a failure state.

**R3. Three-stage memory.** Thought → Proposed decision → Confirmed decision. Only a Confirmed decision may influence company policy or trigger a proposed Core update.

**R4. Never auto-promote.** Casual conversation never becomes company knowledge without an explicit act by Samantha.

**R5. Owner isolation.** Owner-tier memory and knowledge must be unreachable by Cara or any staff agent, even though they share infrastructure. Isolation is enforced at the data layer, not by prompt instruction.

**R6. Contradiction surfacing.** When memory and Core disagree, the agent says so rather than picking one. This will happen on day one (see §7.4).

**R7. Auditability.** Any consequential recommendation can be expanded to show exactly which records and memories produced it.

**R8. Not every decision touches company truth.** A confirmed decision is classified before it goes anywhere near Core. Operational decisions ("hire another scheduler", "wait until October") stay in owner memory. Only decisions that change what the company *tells people* become draft Core updates.

**R9. Assumptions must be falsifiable to be stored.** An assumption without a statement of what would disprove it is a slogan. The agent asks for that at capture time or stores it as a thought instead.

**R10. Success is defined before the outcome is known.** A decision that gets an outcome review must carry its success criteria from the day it was confirmed. Deciding afterward what counted as success turns the review into self-congratulation.

**R11. Surface, do not decide.** The agent surfaces contradictions, missing evidence and likely consequences. Making the business decision stays with Samantha. This is a permanent constraint, not a phase.

### 1.4 Non-goals

- Not a chatbot for anyone but the owner.
- Not a task manager. It can remember commitments; it does not replace a to-do system.
- Not an autonomous actor. It proposes; it does not send, publish, pay, or change Core.
- **Never an autonomous decision-maker.** Not in a later phase, not once it has been right enough times. The moment it decides rather than informs, every failure mode in §6 becomes unreviewable, because there is no longer a human in the loop who could have caught it. It stays a thinking partner.
- Not a replacement for her own judgment, and it should be built to resist becoming one (see §6.1).

---

## 2. Architecture

```
                    ┌─────────────────────────────┐
                    │  Caring Companions Core     │
                    │  durable company truth      │
                    │  kb_items, kb_sources       │
                    └──────────────┬──────────────┘
                                   │
                          knowledge-api
                    (audience-scoped, existing)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   audience:public         audience:internal          audience:owner
        │                          │                          │
     ┌──▼───┐                 ┌────▼─────┐              ┌─────▼──────┐
     │ Cara │                 │  Staff   │              │  Samantha  │
     │public│                 │  agents  │              │   Agent    │
     └──────┘                 └──────────┘              └─────┬──────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                            │                 │                 │
                                    ┌───────▼──────┐  ┌───────▼──────┐  ┌──────▼───────┐
                                    │  memory-api  │  │  live-data   │  │  provenance  │
                                    │  sm_* tables │  │  connectors  │  │   assembler  │
                                    └──────────────┘  └──────────────┘  └──────────────┘
```

### 2.1 Key architectural decisions

**A separate edge function, not a mode of `cara-chat`.** Different endpoint, different auth, different data reach. A leak from Cara to owner data should require two independent failures, not one bad conditional.

**Reuses `knowledge-api` unchanged.** The contract already takes an `audience`. The Samantha Agent passes `owner`. No fork of the knowledge layer.

**A new `memory-api`, parallel to `knowledge-api`.** Same shape, same discipline. Episodic memory gets its own service because it has different rules: it is not verified, it is not shared, and it is allowed to contain half-formed things.

**A provenance assembler.** The piece that composes an answer from up to three sources and tags every claim with where it came from. This is the part that makes the product different from "chat with your notes," and it should be built first, not last.

**Live data is always fetched, never stored.** A cached AxisCare number becomes a lie within a day. Live data is read at question time and labelled with its read time.

---

## 3. Data model

Illustrative, not a migration. Prefix `sm_` (Samantha memory), parallel to Core's `kb_`.

### 3.1 `sm_memories` — the episodic store

```
id                uuid
kind              'thought' | 'decision' | 'question' | 'commitment' | 'context'
status            'thought' | 'proposed' | 'confirmed' | 'superseded' | 'abandoned'
title             text            -- one line, how she would refer to it
body              text            -- what she actually said or wrote
rationale         text            -- why. Required to reach 'confirmed'.
alternatives      text[]          -- what was considered and rejected
area              text            -- 'HomeTogether Hire', 'CDS', 'GUIDE', 'Hiring'
affects           text[]          -- 'caregivers', 'families', 'Katlin', 'payroll'
supersedes_id     uuid            -- the decision this replaces
decided_on        date
captured_at       timestamptz
source            'conversation' | 'explicit' | 'imported'
confidence        int             -- how sure she was at the time
core_proposal_id  bigint          -- link if this triggered a Core correction
tier              'owner' | 'leadership'
```

**Notes on the fields that matter:**

- `rationale` is required to reach `confirmed`. A decision without a reason cannot be revisited intelligently in six months, which is the entire point of storing it.
- `alternatives` is what makes the store worth more than a diary. "Why did I decide not to do X" is only answerable if X was written down when it was rejected.
- `supersedes_id` forms a chain. The agent must always read the *head* of a chain and can show the history on request.
- `tier` exists from day one even though only owner is used at first. Retrofitting a permission column onto a populated table is how leaks happen.

### 3.1a `sm_goals` — what any of this was for

The object above assumptions. Without it the graph can tell you what you decided and never why you cared.

Two kinds, because two different things get called a goal and they behave differently.

**Strategic goals** are the 3 to 7 things that define a quarter. Reviewed on a cadence, rarely change mid-quarter, and every one has an owner and a number.

**Operational goals** are created whenever something meaningful happens. "Rewrite Orientation Module 3" does not wait for a quarter boundary. Each one rolls up to a strategic goal, which is how you can tell whether a busy week actually moved anything.

```
id            uuid
kind          'strategic' | 'operational'
parent_id     uuid        -- operational goals roll up to a strategic one
name          text        -- "Increase CDS referrals"
why           text        -- why this matters now
owner         text        -- required on strategic, often Samantha
measure       text        -- required on strategic. what number moves.
target        text        -- required on strategic
quarter       text        -- strategic only, e.g. 'Q3 2026'
opened_on     date        -- operational only
status        'active' | 'blocked' | 'achieved' | 'abandoned' | 'superseded'
area          text
tier          'owner' | 'leadership'
```

An operational goal with no parent is allowed but flagged. Work that rolls up to nothing is either a missing strategic goal or work that should not be happening, and both are worth seeing.

Assumptions link up to goals; decisions link to both. That completes the chain:

```
GOAL          Increase CDS referrals
  ↓
ASSUMPTION    Families don't know Missouri Medicaid may pay
  ↓
DECISION      Build a CDS education campaign
  ↓
KNOWLEDGE     Eligibility rules (kb_items)
  ↓
EXPERIENCE    Facebook posts, landing page, Cara answers
  ↓
OUTCOME       CDS consultations +41%
```

With both goal kinds, the full chain is:

```
STRATEGIC GOAL    Increase CDS referrals            (quarterly, has a number)
  ↓
OPERATIONAL GOAL  Teach families Medicaid may pay   (opened whenever)
  ↓
ASSUMPTION        Families don't know it exists
  ↓
DECISION          Teach eligibility, don't advertise
  ↓
KNOWLEDGE         CDS eligibility rules
  ↓
EXPERIENCE        Facebook post, landing page, Cara
  ↓
OUTCOME           14 consultation requests
```

Read downward it explains what was built. Read upward it answers the question no documentation system can normally answer: **why did we build this?**

**This is surfaced as a "Why?" affordance on anything published.** Not a screen, a button. Click it on a Facebook post and you get the seven lines above, ending in whether it worked. Built in the prototype; see §8.

An abandoned goal is kept, not deleted. "We stopped caring about that in March" is exactly the context a future decision needs.

### 3.1b `sm_assumptions` — beliefs the business runs on

An assumption is not a thought and not a decision. It is a claim about the world that decisions get built on, and that can later turn out to be wrong.

```
id                uuid
claim             text        -- "Families don't know GUIDE exists"
area              text
status            'untested' | 'supported' | 'contradicted' | 'abandoned'
would_disprove    text        -- REQUIRED. "If >30% of GUIDE screener starts
                              --  came from families who named it unprompted"
confidence        int         -- how strongly held when captured
captured_at       timestamptz
last_tested_at    timestamptz
tier              'owner' | 'leadership'
```

`would_disprove` is required, and it is the field that makes this object worth having. Without it you get a graveyard of vague statements nobody can ever resolve, which is worse than not storing them, because it looks like rigour.

```
sm_assumption_evidence
  assumption_id, direction ('supports'|'contradicts'), note,
  source ('live_data'|'outcome'|'core'|'observation'), source_ref, added_at
```

### 3.1c `sm_decision_assumptions` — what a decision rests on

```
decision_id, assumption_id
```

This is the same shape as Core's knowledge → experience relationship, and it buys the same thing. When an assumption flips to `contradicted`, every decision resting on it is automatically flagged for re-review.

That turns "which assumptions turned out wrong?" into something far more useful: **"which assumptions turned out wrong, and what did we build on them?"**

### 3.1d `sm_outcomes` — whether it actually worked

```
id                uuid
decision_id       uuid
review_on         date        -- set at confirmation, not at review
criteria          jsonb       -- REQUIRED at confirmation: what success looks like
                              -- [{metric:'applications', direction:'up', target:'15%'}]
result            jsonb       -- filled at review from live data
verdict           'worked' | 'mixed' | 'did_not_work' | 'too_early' | 'unmeasurable'
notes             text
reviewed_at       timestamptz
```

`criteria` is captured at confirmation and is immutable afterward. `result` is filled in at review. Keeping them in separate columns written at separate times is the mechanism that stops hindsight editing.

### 3.2 `sm_memory_links` — how memory relates to company truth

```
memory_id     uuid
kb_item_id    text        -- a Core record this memory concerns
relation      'about' | 'contradicts' | 'proposes_change_to' | 'supports'
```

This is what lets the agent answer "what have I decided that touches CDS pay?" and what lets it notice that a confirmed decision contradicts a Core record.

### 3.3 `sm_briefs` — the daily executive brief

```
id, generated_at, for_date
sections      jsonb     -- decisions_needed, blocked_by_you, changes, deadlines, risks, opportunities
sources       jsonb     -- every record, memory and live query used
opened_at     timestamptz    -- did she actually read it
```

Logging whether briefs get opened is deliberate. An unread brief is a feature that should be killed, and there will be no other way to find out.

### 3.4 `sm_answer_log` — the audit trail

Mirrors `kb_answer_log`:

```
id, asked_at, question, answer
core_ids[], core_versions[]
memory_ids[]
live_queries jsonb        -- {system, query, read_at}
inference_notes text      -- what the agent concluded that no source stated
tier_used
```

`inference_notes` is the important column. It records what the agent asserted that came from neither Core nor memory nor live data. When a recommendation turns out wrong, that field usually explains why.

---

## 4. Permission model

Four tiers. Defined here independently of Cara's, and enforced in the data layer.

| Tier | Who | Core access | Memory access | Live data |
|---|---|---|---|---|
| `public` | Families, website, Cara | Verified + public only | None | None |
| `staff` | Caregivers, coordinators | Verified, public + internal | None | Scoped to their own work |
| `leadership` | Future marketing director, Zach | All internal, plus strategy | Leadership-tier memories only | Marketing and ops dashboards |
| `owner` | Samantha | Everything | Everything | Everything including financials |

### 4.1 Enforcement rules

1. **`audience` on Core gains a third and fourth value.** Today the check constraint allows `public` and `internal`. It must be extended to `('public','internal','leadership','owner')` as a deliberate migration.
2. **Tier is resolved server-side from an authenticated session.** Never from a request parameter. A client that can ask for `audience: 'owner'` is not a permission model.
3. **`memory-api` refuses any request below `leadership`.** There is no read path from a staff agent to owner memory, so a prompt-injection in a family message cannot reach it.
4. **Cara's function has no credentials for `sm_*` tables.** Separation by capability, not by conditional.
5. **The Samantha Agent is behind its own auth.** Not a public endpoint with a password check.

### 4.2 The rule that matters most

> Sensitive owner information must never be reachable through a public or staff agent, even though they share infrastructure.

The test for this is not "did we write the filter correctly." It is "if the filter were deleted, would anything leak?" If the answer is yes, the isolation is in the wrong layer.

---

## 5. Memory model

The heart of the spec.

### 5.1 The three stages

```
   THOUGHT                PROPOSED DECISION           CONFIRMED DECISION
   "maybe we should  →    "I think we're going   →    "We are changing
    change pay to $16"     to change pay to $16"       pay to $16"

   captured freely        needs a rationale           needs rationale +
   never influences       still does not influence    explicit confirmation
   anything               company policy              MAY propose a Core update
```

**Thought.** Captured liberally, including automatically from conversation. Costs nothing, influences nothing. The agent may recall thoughts ("you were mulling this in June") but must label them as thinking, never as decided.

**Proposed decision.** Samantha has landed somewhere but has not committed. Requires a rationale. The agent may reference it when reasoning about related questions, always labelled as not final.

**Confirmed decision.** Explicit act by Samantha. Requires rationale, and prompts for alternatives considered and who it affects. This is the only stage that may:
- be stated by the agent as company direction
- trigger a **proposed** Core update (never a direct edit; it enters the existing correction queue in §Core)
- supersede a previous decision

**Superseded / Abandoned** are terminal states. Nothing is deleted, because "we tried that in March and it didn't work" is often the most valuable thing in the store.

### 5.1b The full loop

The three stages sit inside a larger cycle. This is what separates an executive second brain from a searchable diary.

```
   ASSUMPTION ──────────────────────────────────┐
   "families don't know GUIDE exists"           │
   would_disprove: stated up front              │
        │                                       │
        │ decisions cite the assumptions        │ outcome becomes
        │ they rest on                          │ evidence for or
        ▼                                       │ against it
   THOUGHT ──► PROPOSED ──► CONFIRMED           │
                                │               │
                                ▼               │
                    ┌───────────────────────┐   │
                    │ Does this change what │   │
                    │ we TELL people?       │   │
                    └───────┬───────────┬───┘   │
                        no  │           │  yes  │
                            ▼           ▼       │
                     owner memory   DRAFT CORE  │
                     only           UPDATE      │
                                        │       │
                                        ▼       │
                                   classify     │
                                        │       │
                                        ▼       │
                                 correction     │
                                 queue (Core)   │
                                        │       │
                                        ▼       │
                                   Core updates │
                                                │
   OUTCOME REVIEW ──────────────────────────────┘
   set at confirmation, run on review_on
```

When an assumption flips to `contradicted`, every decision citing it is flagged. When an outcome comes in, it becomes evidence on the assumptions that decision rested on. That is the compounding part.

### 5.1c The classification gate

Most business decisions do not change company truth. Sending them all to Core would clutter the one store whose value depends on being clean.

**Stays in owner memory only:**
- "Wait until October to launch HomeTogether TV"
- "Hire another scheduler"
- "Call James next week"
- "Pause this campaign"

**Becomes a draft Core update:**
- Caregiver pay rates
- GUIDE eligibility
- Pricing
- CDS policy
- Employee handbook revisions
- Training procedures
- Public website facts

The test is not "is this important." It is **"does this change something we tell someone?"** A hiring decision is important and tells no one anything. A pay rate is repeated in eleven places.

**Who classifies.** The agent proposes the classification; Samantha confirms it in one click. The agent is wrong sometimes, and the two errors are not equal:

| Error | Consequence | Recoverable? |
|---|---|---|
| Wrongly says "no Core impact" | A pay change never reaches Core. Eleven places keep saying the old number. Cara keeps quoting it. | Only by accident |
| Wrongly says "Core impact" | An operational decision clutters the correction queue. Administrator rejects it in ten seconds. | Trivially |

Because the risk is asymmetric, **the agent defaults to "yes, draft it" whenever it is unsure.** A slightly noisy queue is the correct price for never silently losing a policy change.

**Draft is a real state.** A draft Core update exists in the owner's space and has not entered the correction queue. It carries a classification of what changed (a price, a rule, an eligibility criterion, a procedure) and which `kb_items` it likely affects. Only on submission does it become a proposed update in the queue built in Core, where the Knowledge Administrator verifies it exactly like a staff-submitted correction.

### 5.1d Outcome review

Not every decision gets one. At confirmation the agent asks whether this is a decision worth reviewing, and if so, when.

- **Measurable** ("raise pay to $16") → set `review_on` and success criteria now.
- **Not measurable** ("call James") → no review, and the agent should not pretend otherwise.

The criteria must be written **before** the outcome is known. This is the whole discipline. Ninety days later, a decision reviewed against criteria you invented that morning will always look like it worked.

At review, the agent pulls the actual numbers from live data, compares to the stored criteria, and asks for a verdict. `did_not_work` and `mixed` are ordinary answers, and the agent should never soften them. A second brain that cannot tell you something failed is worse than no record at all, because it launders bad decisions into precedent.

The verdict then flows back as evidence on every assumption that decision cited.

### 5.1e Contradiction triage

When an assumption is contradicted, the question is not whether to tell her. It is when, and how loudly.

Interrupting on every contradiction produces alert fatigue, and the first thing anyone does with alert fatigue is stop reading. An unread critical alert is worse than no alerting, because it creates the belief that you would have been told.

So every contradiction is scored before it is routed:

```
Contradiction detected
        ↓
  How many confirmed decisions depend on it?
  How many active knowledge records?
  How many public assets?
  Does it touch compliance, safety, pricing or legal risk?
  Has it already reached customers?
        ↓
     impact score
        ↓
  Critical  /  Important  /  Informational
```

| Tier | Routing | Examples |
|---|---|---|
| **Critical** | Interrupt immediately. Owner notification, out of band. | Medicaid eligibility changed. Pricing is wrong. CDS policy changed. A safety procedure is incorrect. Cara is currently answering something incorrectly. |
| **Important** | Next daily brief. Never interrupts. | A marketing assumption looks wrong. A content strategy assumption is weakening. A recruiting assumption is contradicted. |
| **Informational** | Weekly review. Never appears mid-day. | Low-risk assumptions affecting only future planning. |

**The two hard rules:**

1. **"Has it already reached customers" outranks volume.** One wrong price on a live page beats four decisions resting on a soft marketing assumption. Reach, not count, drives the tier.
2. **Critical must stay rare enough to mean something.** If more than roughly one thing a week is Critical, the scoring is wrong and gets retuned. That threshold is a design constraint, not an observation.

The tier is stored on the contradiction so the routing itself can be reviewed later. If something turned out to matter and was filed Informational, that is a scoring bug worth finding.

### 5.1e2 Where a Critical actually lands

The triage tier decides urgency. This decides the channel. They are separate questions and conflating them is how a good priority system still fails to reach anyone.

**The primary surface is Core itself.** Not email, not text, not another dashboard. Core is opened every morning for about five minutes, and it answers one question: *where is my judgment uniquely required today?* Everything else, calendar and inbox and hub notifications, answers "what happened," which is activity rather than judgment.

| Level | Channel | Volume | Examples |
|---|---|---|---|
| **1** | Core home screen only. No notification. | Unbounded | Marketing assumptions, strategy contradictions, coverage weakness, SEO |
| **2** | Email | A few a month | Knowledge waiting over 48 hours. Several Important contradictions at once. Something that should happen today. |
| **3** | Text message | **Target 6 to 10 a year. Never more than one every 4 to 6 weeks.** | Cara is answering incorrectly. A public pricing error. A Medicaid rule changed. A safety policy conflict. Regulated information wrong on the website. |

**The budget is a hard design constraint, not an aspiration.** Two texts in a month means the system is broken. The response is to retune the scoring, never to raise the threshold. The budget is displayed on the Core home screen so the discipline stays visible: *"2 of about 10 texts used this year."*

Level 3 exists to be almost never used. Its value comes entirely from its rarity, and the first month it is over-used is the month it stops working.

### 5.1e3 What an alert must contain

Every alert answers three questions and nothing else. "Something happened" is not an alert, it is an interruption.

```
WHAT happened?
WHY does it matter?
WHAT should I do?   (+ how long it will take)
```

The estimate matters more than it looks. "Review N002" is a task of unknown size and gets deferred. "Review N002, about 6 minutes" gets done between two other things.

**One alert per problem.** If a staff member has already proposed the fix, that folds into the existing alert as the recommended action rather than raising a second one. Two alerts about one record teaches skimming, and skimming is exactly how the one that mattered gets missed.

### 5.1f The capture bar

The failure mode of a second brain is not forgetting. It is remembering everything, until the signal drowns.

Before capturing anything durable, the agent applies one test:

> **Would this matter six months from now?**

If probably not, it stays transient conversation and disappears. Nothing is stored "just in case."

Applied to each object:

- **Thought:** would you want to be reminded you were thinking this? Most passing remarks fail this and should.
- **Assumption:** can you say what would disprove it? If not, it is not an assumption.
- **Decision:** would someone need to know this was decided, and why, to avoid re-deciding it?
- **Goal:** is this something you would measure, or is it a direction? Directions are context, not goals.

The agent proposes; she confirms. And the agent should be willing to say **"I don't think this is worth keeping"** about something she just said. A capture assistant that never declines is a hoarder.

### 5.2 Promotion rules

- Promotion is always **explicit and one step at a time**. No jumping from thought to confirmed.
- The agent may **propose** a promotion ("that sounds like a decision, want to save it?") but never performs one.
- Promotion to `confirmed` requires a rationale. If she declines to give one, it stays `proposed`. This will be annoying occasionally and is worth it.
- A confirmed decision that contradicts a Core record does **not** change Core. It creates a proposed update in the existing Core correction queue, where the Knowledge Administrator verifies it. The owner can be both people; the two acts stay separate.

### 5.3 Capture discipline

**Automatic capture:** thoughts only, and only when the agent is fairly confident something durable was said. Over-capture kills signal; under-capture kills the habit. Start conservative and tune from real use.

**Never auto-captured:** anything that reads as venting, speculation about a person, or a number said in passing. A specification cannot fully define this, so the MVP should log what it *would* have captured for a week before capturing anything automatically.

---

## 6. Failure modes

The section most likely to prevent a bad outcome.

### 6.1 Confabulated recall
**The failure:** she asks "what did we decide about live-in care?" and the agent produces a plausible decision she never made.
**Why it is severe:** it corrupts her own memory of events. Unlike a wrong fact, she has no external way to check it.
**Mitigation:** recall answers must cite a `memory_id` and date. No citation, no claim. "I have nothing on that" is a first-class answer, and the system prompt should make it the default under uncertainty.

### 6.2 Thought laundering
**The failure:** a passing "maybe $16" resurfaces three weeks later as "you decided $16."
**Mitigation:** the three-stage model, plus a hard prompt rule that status is stated whenever a memory is recalled. Status is never dropped in summarisation.

### 6.3 Provenance collapse
**The failure:** the agent produces one fluent paragraph blending a verified Core fact, a memory, and its own inference. All three end up sounding equally authoritative.
**Why it is severe:** this is the default behaviour of a language model, so it happens unless actively prevented.
**Mitigation:** the provenance assembler composes claims with source tags before generation, and the UI renders them differently. Inference must be visually distinct from recall.

### 6.4 Sycophantic reinforcement
**The failure:** she asks "should I go ahead with X?" and the agent, having stored her enthusiasm for X, agrees.
**Mitigation:** for decision-support queries the agent must surface disconfirming memories and contradicting data if any exist, before its recommendation. If none exist, it says that too, because "nothing contradicts this" is different from "this is right."

### 6.5 Stale decision drift
**The failure:** a March decision is still being cited in November although the conditions changed.
**Mitigation:** decisions carry `decided_on`. Anything older than a set age surfaces with its age attached. Periodic prompt: "you decided this in March, does it still hold?"

### 6.6 Owner leakage
**The failure:** owner-tier content reaches a family through shared infrastructure.
**Mitigation:** §4.1. Capability separation, not conditionals. This should also be an explicit adversarial test before launch: attempt to reach `sm_*` from Cara's credentials and confirm it fails at the database, not the application.

### 6.7 Over-reliance
**The failure:** she stops keeping her own notes, then the agent is wrong once and she cannot tell.
**Mitigation:** the agent should be honest about coverage. If it holds three memories about HomeTogether Hire and the project has run for six months, it should say the record is thin rather than answering as if complete.

### 6.8 Hindsight rationalisation
**The failure:** the outcome review decides, after seeing the numbers, what success was supposed to be. Every decision then looks good, and the review is theatre.
**Why it is severe:** it is invisible. The record looks rigorous and is worthless.
**Mitigation:** `criteria` is written at confirmation and immutable. `result` is a separate column written at review. If a decision has no stored criteria, the review is marked `unmeasurable` rather than being judged retrospectively.

### 6.8b Alert fatigue
**The failure:** contradictions interrupt often enough that she stops reading them, and the one that mattered goes past unseen.
**Why it is severe:** it is worse than having no alerts, because it creates a false belief that she would have been told.
**Mitigation:** §5.1e triage, plus the standing constraint that Critical stays under roughly one a week. If it exceeds that, the scoring is retuned rather than the threshold raised.

### 6.8c Capture bloat
**The failure:** everything gets remembered, recall returns forty half-thoughts, and she stops asking.
**Mitigation:** the six-month test in §5.1f, and an agent willing to decline. Reviewed by sampling: if recall regularly surfaces things she does not care about, the bar is too low.

### 6.9 The assumption graveyard
**The failure:** assumptions accumulate, none is ever resolved, and the list becomes decoration.
**Mitigation:** `would_disprove` is required at capture. Untested assumptions older than a set age surface in the brief. An assumption that cannot be given a disproof condition is stored as a thought instead, which is honest about what it is.

### 6.10 Silent misclassification
**The failure:** a pay change is classified as operational, never becomes a draft Core update, and eleven places keep saying the old number. Nothing looks broken.
**Mitigation:** the asymmetric default in §5.1c, plus a monthly reconciliation: confirmed decisions in areas that map to Core topics but produced no draft update get listed for a second look. Catching this a month late is much better than never.

### 6.11 Capture friction
**The failure:** saving a decision is enough work that she stops, and the store slowly becomes useless.
**Mitigation:** one-click confirm from a proposal. The agent drafts the rationale from what she just said and lets her correct it. Never a blank form.

---

## 7. Example conversations

Provenance rendering shown in brackets. Final UI treatment to be designed.

### 7.1 Recall

> **Samantha:** Why did I decide not to run ads for GUIDE?
>
> **Agent:** You didn't decide against it. In June you flagged it as a maybe and parked it because the landing page wasn't finished. `[memory · thought · 12 Jun 2026]`
> The page went live on 2 July `[live · site]`, so the reason you parked it is gone.
> One thing worth knowing: GUIDE has no verified public knowledge behind it yet. The only record is the Medicare Advantage disqualifier, and it is waiting on your wording. `[core · unverified · N004]`

Note what it did not do: it did not invent a decision, and it noticed the blocker had cleared.

### 7.2 Contradiction between memory and Core

> **Samantha:** What are we paying CDS attendants?
>
> **Agent:** Two different answers, and they disagree.
> Core says $14.00 an hour, last verified in February, currently marked stale. `[core · stale · N002 v1]`
> But you told me in July that payroll moved it to $15.00. `[memory · confirmed decision · 14 Jul 2026]`
> Cara is currently refusing to answer this question for families because of the stale record. Six other places still say $14, including the orientation module. Want me to raise the $15 as a proposed Core update so it goes to verification?

This is the single most valuable interaction in the whole spec, and it is available on day one because the situation is already real.

### 7.3 Memory capture

> **Samantha:** I think we're done with the Base44 prototype, the hub already does more than it does.
>
> **Agent:** Want me to save that as a decision? I'd write it as:
> *Stop work on the Base44 prototype. Rationale: the CDS hub already exceeds its functionality. Area: CDS Hub. Supersedes: the June decision to evaluate both in parallel.*
> I don't have an alternatives note. Was anything else considered?

### 7.4 Decision support with disconfirming evidence

> **Samantha:** Should I put the fall push behind HomeTogether Hire?
>
> **Agent:** Before the recommendation, two things that cut against it.
> You decided in May to hold Hire until the matching process was manual-proof, and I have nothing marking that as resolved. `[memory · confirmed · 3 May 2026]`
> Hire has one knowledge record behind it. Content built on it would be running mostly on unverified claims. `[core · coverage]`
> Against that: it is the only line with a paid acquisition path already built. `[memory · context]`
> My read is that CDS is the better fall push and Hire is the better winter one, but the May condition is yours to judge and I can't tell whether it's been met. `[inference]`

### 7.5 The classification gate, both ways

> **Samantha:** We're going to hold the HomeTogether TV launch until October.
>
> **Agent:** Saved as a confirmed decision. `[memory · confirmed · 8 Aug 2026]`
> That one is operational, so it stays with me and doesn't touch Core. Nothing we tell families changes.

> **Samantha:** Payroll moved CDS attendants to $15.
>
> **Agent:** Saved. That one does change what we tell people, so I've drafted a Core update. `[draft · not yet submitted]`
> *Changes: a rate. Likely affects N002, and through it 6 published items across 3 departments.*
> Want me to send it to the correction queue for verification? I can't change Core myself, and I shouldn't.

### 7.6 An assumption being tested

> **Samantha:** I think families just don't know GUIDE exists.
>
> **Agent:** Want me to store that as an assumption rather than a decision? If so, what would tell you it was wrong?
>
> **Samantha:** If people were asking for it by name without us bringing it up.
>
> **Agent:** Saved. `[assumption · untested · 8 Aug 2026]`
> *Claim: families don't know GUIDE exists. Disproved if: families name GUIDE unprompted.*
> Worth knowing: Cara has logged 14 questions mentioning GUIDE in three weeks, 11 of them unprompted. `[live · kb_answer_log]` That is evidence against it already. Do you want to mark it contradicted, or wait for more?

This is the interaction that would be genuinely hard to get any other way, and it is available from Cara's logs alone.

### 7.7 An outcome review, coming back negative

> **Agent:** Ninety days ago you raised caregiver pay to $16. You said at the time this would work if applications rose 15% and 90-day retention improved. `[memory · confirmed · 10 May 2026]`
>
> Actual: applications up 28%, retention down 3%. `[live · AxisCare]`
>
> One of two hit. The hiring problem improved and the retention problem did not, which is the opposite of what you expected. That is evidence against the assumption you cited at the time, that pay was the main driver of turnover. `[assumption · now contradicted]`
>
> Two other decisions rest on that assumption. Want to look at them?

### 7.8 Daily brief

> **Good morning. Three things need you.**
>
> 1. The CDS pay rate. Six months stale, cited in 6 places, and it is blocking one knowledge product and Cara's ability to answer a common family question. `[core]`
> 2. GUIDE wording. Legal review outstanding, blocking the whole GUIDE campaign. `[core]`
> 3. Katlin has been waiting since Tuesday on the Canva template list. `[memory · commitment]`
>
> **Changed since yesterday:** Cara withheld 9 answers, 7 of them the pay rate. `[live · kb_answer_log]`
>
> **Nothing else needs you today.**

---

## 8. Phase 1 MVP

Deliberately small. Two capabilities only.

**In scope:**
1. **Recall + capture.** Ask questions of memory and Core together, with provenance. Capture thoughts, promote to proposed and confirmed.
2. **The classification gate and draft Core updates.** Confirmed decisions get classified; the ones that change company truth become drafts she can submit to the correction queue.
3. **The contradiction check.** Surface disagreements between confirmed memory and Core records.
4. **Assumption and outcome capture, without the review machinery.** Assumptions get stored with their disproof condition. Decisions get `review_on` and `criteria` recorded at confirmation.

**Why 4 is in the MVP even though it pays off later.** Outcome review is worthless for ninety days. But criteria cannot be added retroactively without destroying the point, so the *capture* has to exist from day one or the first quarter of decisions is permanently unreviewable. Build the recording now, build the reviewing UI later. This is the one place where deferring costs more than building.

**Explicitly out of the MVP:** the review interface, the assumption dashboard, the flag-on-contradiction cascade. Those read data the MVP is quietly accumulating.

**Success criteria after four weeks:**
- She uses recall without being reminded to.
- At least one contradiction is caught that would otherwise have gone out wrong.
- Zero confabulated recalls, measured by spot-checking `sm_answer_log` against `memory_ids`.
- Capture does not feel like homework, measured by whether proposals get confirmed or ignored.

---

## 9. What explicitly waits

| Deferred | Why |
|---|---|
| Live data connectors (AxisCare, GHL, calendar, email, financials) | Each is its own integration with its own auth and failure modes. Doing them alongside memory means neither gets proven. |
| Daily executive brief | Needs live data to say anything a glance at the hub wouldn't. Premature briefs go unread and then get ignored permanently. |
| Automatic thought capture | Log what it *would* capture for a week first. Tuning this blind will either flood or starve the store. |
| Leadership tier | Build the tier column now, populate it later. No second user yet. |
| Revenue-weighted prioritisation | Requires attribution data Core does not have. |
| Voice / mobile | Interface question, not an architecture question. Defer without cost. |
| Any write access to outside systems | The agent proposes. It does not act. Revisit only after a long clean run. |

---

## 10. What the Cara week should tell us

Specific things to read before writing a line of this. Each one changes a decision above.

**From `kb_answer_log`:**

1. **Outcome distribution.** Count of `answered` / `withheld` / `none` / `conflict`.
   → If `none` dominates, retrieval is too strict and the same matcher will frustrate Samantha. If `answered` dominates suspiciously, it is too loose and the provenance work matters more.

2. **Every `none` question, read individually.** These are the gaps in company knowledge.
   → Directly seeds what Samantha memory needs to cover, and tells us what she will ask about.

3. **Did `conflict` ever fire?** If it never fires in a week, the conflict path is untested in reality and the memory-vs-Core check in §7.2 needs its own testing rather than inheriting confidence.

4. **Spot-check 20 `answered` rows by hand.** Was the cited record actually the right one? This is the only real measure of retrieval precision, and the same matcher is reused for memory search.

5. **Withheld rate on the pay rate specifically.** If families ask constantly and get refused, that is a business cost, and it argues for prioritising the contradiction check even harder.

**From Core:**

6. **Did anyone submit a proposed correction?** If staff never use the correction workflow in a week, the memory promotion flow, which is the same shape, will not be used either. That changes the capture design.

7. **`knowledge-api` latency.** The Samantha Agent queries Core *and* memory *and* eventually live data in one turn. If Core alone is slow, the composition needs to be parallel from the start.

**Operationally:**

8. **Did anything leak?** Confirm no internal-audience record ever appeared in a public answer. If the audience filter held under real traffic, the same pattern can be trusted for owner tier. If not, §4 needs redesign before anything owner-level is built.

**Two more that shape the memory design specifically:**

9. **Which records were retrieved most often?** The heavily-used records are the ones where a wrong memory-versus-Core contradiction would do the most damage. They become the test set for §7.2.

10. **Which questions produced retrieval ambiguity?** Cases where two records scored close together. The same matcher searches memory, where near-ties are far more common because thoughts on one subject accumulate. If ambiguity is already frequent in Core with a dozen records, memory search needs a different approach before it has hundreds.

**A free result available immediately:** Cara's `none` questions are raw material for §7.6. Every repeated unanswered question is either a knowledge gap or evidence about an assumption. Reading them will produce several real assumptions to seed the store with, before the agent exists.

---

## Version 1: honest status

Core V1 is complete when it can reliably answer five questions. Where each one actually stands:

| # | Question | Answered by | Prototype | Deployed code |
|---|---|---|---|---|
| 1 | What is true? | Knowledge records | ✅ | ✅ `kb_items` |
| 2 | Why do we believe it? | Sources, verification date, confidence, review tracks | ✅ | ✅ `kb_sources`, `kb_item_versions` |
| 3 | Why did we decide this? | Goals, assumptions, decisions | ✅ | ❌ **spec only** |
| 4 | Where is this used? | Source graph, impact analysis | ✅ | ⚠️ relationships exist, no graph UI |
| 5 | Did it work? | Outcomes | ✅ | ❌ **spec only** |

**So: 2 of 5 are live, 1 is partial, 2 exist only as design.** The prototype answers all five, which is what makes it a good specification, and it is not the same as having them.

That gap is the correct state to be in right now. Questions 3 and 5 are the Samantha Agent, and building them before Cara has run would mean designing the reasoning layer around guesses about how knowledge actually gets used.

**Next action is deployment, not design.** Run the SQL, deploy `knowledge-api` and `cara-chat`, and let it take real questions for a week. Section 10 lists what to read from that week.

## Decisions made

**Q: Should a confirmed decision automatically raise a Core update?**
**A: Middle ground, adopted.** A confirmed decision is classified first. If it changes what the company tells people, it becomes a *draft* Core update in the owner's space. It enters the correction queue only when submitted. Operational decisions never touch Core. See §5.1c.

**Q: Should goals be quarterly or continuous?**
**A: Both, and they are different objects.** Strategic goals are 3 to 7 a quarter with an owner, a metric and a target. Operational goals are opened whenever something happens and roll up to a strategic one. An operational goal with no parent is allowed but flagged, because work that rolls up to nothing is worth seeing. See §3.1a. **Built into the prototype.**

**Q: How should a Critical reach her out of band?**
**A: Core is the primary surface; out of band is a three-level ladder.** Level 1 is the Core home screen with no notification, Level 2 is email, Level 3 is a text with a hard budget of 6 to 10 a year. Core is designed to be opened every morning for five minutes and to answer one question: where is my judgment uniquely required. See §5.1e2. **Built into the prototype.**

**Q: When an assumption is contradicted, interrupt immediately?**
**A: No. Triage by impact.** Three tiers, scored on dependent decisions, affected knowledge records, public reach, risk category, and whether it has already reached customers. Critical interrupts, Important goes to the daily brief, Informational waits for the weekly review. Critical stays under roughly one a week by design. See §5.1e.

**Adopted additions:** assumptions with a required disproof condition (§3.1b), outcome review with criteria fixed at decision time (§3.1d, §5.1d), goals as the object above assumptions (§3.1a), the six-month capture bar (§5.1f), and a permanent non-goal of autonomous decision-making (§1.4).

## Open questions for Samantha

1. Should Zach get a `leadership` tier at launch, or is owner-only correct for now?
2. How long should a decision sit before the agent asks whether it still holds? Three months? Six?
3. Is there any category of thing you want it to never remember, even as a thought?
4. Default review window for a measurable decision. Ninety days matches your pay-raise example, but hiring and marketing decisions may want different clocks.
5. Core is now designed to be the first thing opened each morning. Is a bookmark enough to start, or does it need to actually launch?

**None of these block deployment.** They are answerable from a week of real use, which is the point.
