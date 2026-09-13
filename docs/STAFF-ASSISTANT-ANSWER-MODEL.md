# Staff assistant — the answer contract

**Status:** design only. No code. Written 2026-08-09 from Samantha's specification.
**Consumer:** office staff, inside the hubs. Not Cara, not the Samantha Agent.
**Depends on:** `knowledge-api`, role scopes on `kb_items` (not yet built), `kb_gaps` (live).

---

## The point

A state manual says **what must happen**. An SOP says **how Caring Companions does it**. Neither document alone answers a coordinator's actual question, and merging them answers it wrongly, because the answer then cannot say which half is law and which half is ours.

So the assistant returns a **structured answer with the halves kept apart**. This is not presentation. It is the compliance boundary, rendered.

---

## The shape of every answer

```
EXTERNAL RULE
  What the state, federal or payer source requires.
  Cites: source, section, last verified.

CARING COMPANIONS PROCEDURE
  How our approved SOP tells staff to handle it. Numbered steps.
  Cites: which SOP, and whether that SOP is approved or draft.

COMPANY POLICY
  Any separate Caring Companions decision that applies.
  Never presented as a government requirement.

WHAT TO DO NOW
  The practical step by step, including the hub screen and the button,
  drawn from the hub map.

ESCALATE IF
  The conditions that make this someone else's decision.

SOURCE + LAST VERIFIED
  Per section, not per answer. Sections age at different rates.
```

Any section with nothing behind it is **omitted or marked absent**. It is never filled with something plausible.

---

## The rule that makes it safe

**An external rule never implies a procedure.**

When the manuals establish a requirement and no verified Caring Companions procedure exists for it, the answer says exactly that:

> **External requirement found.** Missouri requires X.
> **Caring Companions does not yet have a verified procedure for handling this situation.**

and the question becomes a **Knowledge Gap** (`kb_gaps`, `origin: 'staff'`), carrying the question in the words the coordinator used.

The assistant must not compose a procedure from the rule. A rule states an obligation; a procedure states who does what, in which system, by when, and what happens if they cannot. Those facts are not in the manual. Inventing them produces something that reads like company policy and was written by a model, which is the single worst output this system could produce.

"We do not have an approved answer for that yet, and it has gone to Samantha" is a **successful** answer, not a failure.

---

## Draft material

A draft SOP may be **read** and may be **cited as a draft**. Nothing extracted from it becomes verified procedure without review.

When an answer rests on a draft:

> This comes from the Onboarding & Compliance SOP, which is **a draft and not approved**. Treat it as how we intend to work, not as settled procedure.

---

## What the answer may draw on, and how each is labelled

| Source class | May a coordinator act on it | Label shown |
|---|---|---|
| Verified external rule | yes | the citation and last verified date |
| Verified company procedure | yes | which SOP |
| Company policy | yes | "our decision, not a state requirement" |
| Draft company material | with care | "draft, not approved" |
| Raw source research | no | "found in the manual, not verified knowledge" |
| Stale record | no | "this has not been reconfirmed since <date>" |
| Nothing found | n/a | "no approved answer, this is now a gap" |

Six of those seven states already exist in `kb_items.status` and `audience`. The seventh is the gap queue, which exists as a table and has no producer yet.

---

## Prerequisites, in order

1. **Role scopes on `kb_items`** (`roles[]`, `program`, `sensitivity`). Until these exist, `audience: internal` means "sees everything", and a coordinator's question could retrieve HR or owner material. This is the hard blocker and it is cheapest to add before a second consumer writes anything.
2. **Server-verified identity.** The hubs already sign in with Supabase and carry a role in `staff_users`. The role must be read from the verified token, never accepted from the page.
3. **A staff-shaped refusal.** `buildRefusal()` currently speaks in Cara's voice and offers the public phone number. Move it out of the shared policy module, per the architecture notes.
4. **Something worth asking.** Six verified records is not a corpus. Extraction runs first, or the assistant refuses nearly everything and gets abandoned permanently.

---

## Deliberately not decided here

Answer rendering in each hub, the gap queue interface, generated video walkthroughs, and whether the assistant is one widget across hubs or embedded per hub. All of those follow from the contract above and none of them change it.
