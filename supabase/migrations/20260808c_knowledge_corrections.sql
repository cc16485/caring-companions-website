-- =============================================================================
-- Caring Companions Core — two safety corrections from live verification
-- =============================================================================
-- Both found by running the 31-case set against production on 2026-08-08.
-- Additive/corrective only. No schema change, no RLS change, no new records.
-- Safe to run more than once.
-- =============================================================================

-- ── FIX 1 ────────────────────────────────────────────────────────────────────
-- N001 answers "who can be PAID as an attendant". It does not answer
-- "who QUALIFIES for CDS". I had added `eligibility` and `missouri` to its
-- topics to widen retrieval, and it worked: "Who is eligible for CDS in
-- Missouri?" retrieved N001 at 0.67 and the policy gate returned ok. Only the
-- model's prompt discipline caught that the approved answer did not cover the
-- question and refused.
--
-- That is the wrong shape of safety. A deterministic refusal cannot be talked
-- out of; a model-based one can. Stretching a neighbouring record to cover a
-- question it does not answer is the thing to stop doing. The real fix is a
-- source-backed CDS eligibility record, which is not created here.
--
-- Removing `eligibility` and `missouri` only. Everything else stays.
-- Guarded on the two states this correction was ever written for, and no other:
--   1. a fresh database, where the seed above has just written the short list
--   2. the production row as it stood on 2026-08-08, carrying `eligibility`
--
-- Both priors are named explicitly because they genuinely differ: `eligibility`
-- and `missouri` were added by hand in production and never existed in the
-- seed. Guarding only on `eligibility` would leave a fresh install with the
-- short list and quietly diverge from production forever.
--
-- Once anyone curates these topics deliberately, this matches neither and
-- stands down, which is the entire point.
update kb_items set
  topics = array['cds','medicaid','mo healthnet','attendant','caregiver','family caregiver',
                 'daughter','son','relative','paid','consumer directed','self directed','home care']
where id = 'N001'
  and ( topics = array['cds','medicaid','attendant','family','daughter','caregiver']
     or 'eligibility' = any(topics) );

-- ── FIX 2 ────────────────────────────────────────────────────────────────────
-- On one live run Cara said "Missouri's Community Developmental Services
-- program". CDS is Consumer Directed Services. The record said only "Missouri
-- CDS" and never expanded it, so the model supplied an expansion from its own
-- knowledge and got it wrong. It did not recur in three retries, which makes it
-- intermittent rather than systematic, and no less a fabricated fact reaching a
-- family.
--
-- The model may phrase approved knowledge. It may not supply a definition the
-- approved knowledge omits. So the expansion is stored in the answer text
-- itself, which is the only part of a record that reaches the prompt. Aliases
-- and topics serve retrieval; they are never shown to the model.
--
-- Wording only. No meaning changes. The version trigger records each edit in
-- kb_item_versions automatically.
--
-- EACH UPDATE NAMES THE PRIOR VALUE IT EXPECTS TO FIND, and matches on it with
-- `=`, not on `<>` its own result. The original form re-fired on every
-- installer run and would revert any human edit made since. Matching the prior
-- value means this applies exactly once, to a record nobody has touched, and
-- stands down forever after.

update kb_items set
  answer = 'Sometimes. Missouri Consumer Directed Services, usually called CDS, can pay a family '
        || 'member as the attendant when the consumer is eligible for the program and directs their '
        || 'own care. A spouse cannot be paid as the attendant. Whether a particular daughter '
        || 'qualifies depends on the consumer''s eligibility, so it is worth a short call to check.'
where id = 'N001'
  and answer = 'Sometimes. Missouri Consumer Directed Services can pay a family '
        || 'member as the attendant when the consumer is eligible for the program and directs their '
        || 'own care. A spouse cannot be paid as the attendant. Whether a particular daughter '
        || 'qualifies depends on the consumer''s eligibility, so it is worth a short call to check.';

update kb_items set
  answer = 'The consumer does. Under Missouri Consumer Directed Services, usually called CDS, the '
        || 'consumer hires, schedules, trains and dismisses their own attendant. The vendor handles '
        || 'payroll and compliance, not supervision.'
where id = 'N003'
  and answer = 'The consumer does. They hire, schedule, train and dismiss their own attendant. '
        || 'The vendor handles payroll and compliance, not supervision.';

update kb_items set
  answer = 'No. Under Missouri Consumer Directed Services, usually called CDS, a spouse cannot be '
        || 'paid as the attendant. Other family members may be able to.'
where id = 'N004'
  and answer = 'No. Under Missouri CDS a spouse cannot be paid as the attendant. '
        || 'Other family members may be able to.';

-- N002 is left alone on purpose. It is stale, its answer never mentions CDS,
-- and editing a record that is withheld from families adds risk for no benefit.

-- Check after running:
-- select id, version, left(answer, 70) from kb_items where id in ('N001','N003','N004') order by id;
-- select item_id, version, changed_at from kb_item_versions order by changed_at desc limit 5;
