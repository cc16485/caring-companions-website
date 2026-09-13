-- =============================================================================
-- Caring Companions Core — the one-sided criterion is a judgement call
-- =============================================================================
-- CL-06 is the MO HealthNet requirement that a CDS consumer "be capable of
-- living independently with CDS in place". It appears in one authoritative
-- state manual and is absent from the other's eligibility section.
--
-- Structurally it is SUPPLEMENTS, because one source adds something the other
-- does not contain. That is the correct relationship and it is also why the
-- guards did not treat it as disputed: only CONFLICTS and DIFFERENT_SCOPE are.
-- The live concept therefore offered it as one of twelve statements approvable
-- in a single click.
--
-- It should not be. A requirement present in one manual and missing from the
-- other is exactly the kind of thing that needs a person to decide whether it
-- still applies, and batch approval is where a decision like that gets made by
-- accident. Marking it needs_research keeps it visible, keeps it out of every
-- bulk approval, and keeps it out of answers until somebody settles it.
--
-- The relationship is left alone. What changed is whether it is ready to
-- approve, not what kind of claim it is.
--
-- Guarded on the value it expects, so it applies once and stands down if
-- anyone has since decided.
-- =============================================================================

update kb_claims
   set status = 'needs_research',
       review_note = 'Present in the MO HealthNet manual and absent from the DHSS eligibility '
                  || 'section. Held out of bulk approval on purpose: someone needs to say whether '
                  || 'it is a current CDS requirement before it is treated as one.'
 where concept_id = 'C-CDS-ELIGIBILITY'
   and ref = 'CL-06'
   and status = 'proposed'
   and relationship = 'SUPPLEMENTS';

-- Check after running:
--   select ref, relationship, status from kb_claims
--    where concept_id = 'C-CDS-ELIGIBILITY' and ref = 'CL-06';
