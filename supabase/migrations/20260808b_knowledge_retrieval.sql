-- =============================================================================
-- Caring Companions Core — retrieval fields
-- =============================================================================
-- Additive only. Adds three columns to kb_items and fills them for the six
-- seeded records. Creates nothing else, drops nothing, changes no RLS, adds
-- no policies. Safe to run more than once.
--
-- WHY: a flat `topics` array only matches our own vocabulary. Families do not
-- say "attendant" or "consumer directed". These columns hold how people
-- actually ask, so retrieval can find the right record without anyone having
-- to learn our internal terms.
--
-- These columns affect what can be FOUND. They have no bearing on what may be
-- SAID. status + audience remain the only gate on that.
--
-- EVERY UPDATE BELOW IS GUARDED ON THE NEW COLUMNS STILL BEING EMPTY, so this
-- is a one-time backfill rather than a rewrite on every installer run.
--
-- Unguarded, these also reset `topics`, and since 20260808c then removed
-- 'eligibility' from N001, the two migrations overwrote each other on every
-- run. That, together with the seed's ON CONFLICT DO UPDATE, is what drove
-- N001, N003 and N004 to version 26 with 25 junk history rows apiece.
-- =============================================================================

alter table kb_items add column if not exists aliases       text[] not null default '{}';
alter table kb_items add column if not exists alt_questions text[] not null default '{}';
alter table kb_items add column if not exists phrases       text[] not null default '{}';

comment on column kb_items.aliases is
  'Short alternate names, abbreviations and common misspellings. Retrieval only.';
comment on column kb_items.alt_questions is
  'Other real ways a family asks this same question. Retrieval only.';
comment on column kb_items.phrases is
  'Family-language fragments that indicate this topic. Retrieval only.';

-- ── N001  family member paid as attendant ───────────────────────────────────
update kb_items set
  topics = array['cds','medicaid','mo healthnet','attendant','caregiver','family caregiver',
                 'daughter','son','relative','paid','eligibility','missouri',
                 'consumer directed','self directed','home care'],
  aliases = array['CDS','consumer directed services','self-directed care','MO HealthNet',
                  'medicad','medicaide','consumer direction'],
  alt_questions = array[
    'Can Medicaid pay my daughter to care for me?',
    'Can my family member get paid to help me?',
    'Can a relative be paid as my caregiver?',
    'Can my son get paid to take care of me?',
    'Does Medicaid pay family members to provide care at home?',
    'Can I hire my own daughter as my caregiver?',
    'Who can be paid as a CDS attendant?'],
  phrases = array['family member get paid','daughter get paid','son get paid',
                  'pay my daughter','pay a relative','paid to care for me',
                  'paid to take care of','family caregiver paid','relative as caregiver']
where id = 'N001'
  and aliases = '{}' and alt_questions = '{}';

-- ── N002  pay rate (STALE, stays stale) ─────────────────────────────────────
update kb_items set
  topics = array['cds','pay','rate','wage','attendant','caregiver','hourly','how much'],
  aliases = array['CDS','attendant pay','caregiver wage','hourly rate'],
  alt_questions = array[
    'How much does a CDS caregiver make?',
    'What is the hourly rate for a CDS attendant?',
    'How much would my daughter get paid?',
    'What does the caregiver earn?'],
  phrases = array['how much does it pay','what is the pay','hourly rate','per hour',
                  'how much would I make','what do you pay']
where id = 'N002'
  and aliases = '{}' and alt_questions = '{}';

-- ── N003  who directs care ──────────────────────────────────────────────────
update kb_items set
  topics = array['cds','medicaid','consumer','directs','supervision','choose caregiver',
                 'self directed','consumer directed','hire','control','manage'],
  aliases = array['CDS','consumer directed services','self-directed care','consumer direction'],
  alt_questions = array[
    'Can I choose my own caregiver?',
    'Who is in charge of the caregiver under CDS?',
    'Can I pick who takes care of me?',
    'Do I get to hire and manage my own attendant?',
    'Who supervises the caregiver in CDS?'],
  phrases = array['choose my own caregiver','pick my own caregiver','hire my own',
                  'who is in charge','who manages the caregiver','decide who takes care of me',
                  'control who comes']
where id = 'N003'
  and aliases = '{}' and alt_questions = '{}';

-- ── N004  spouse ────────────────────────────────────────────────────────────
update kb_items set
  topics = array['cds','medicaid','spouse','husband','wife','married','attendant',
                 'caregiver','paid','eligibility'],
  aliases = array['CDS','consumer directed services','spousal caregiver','MO HealthNet'],
  alt_questions = array[
    'Can my spouse be my caregiver?',
    'Can my husband get paid to take care of me?',
    'Can my wife be paid as my attendant?',
    'Is a married partner allowed to be the paid caregiver?'],
  phrases = array['my spouse','my husband','my wife','married to','spouse be paid',
                  'husband be my caregiver','wife be my caregiver']
where id = 'N004'
  and aliases = '{}' and alt_questions = '{}';

-- ── N005  call-off procedure (INTERNAL, stays internal) ─────────────────────
update kb_items set
  topics = array['calloff','call off','coverage','staffing','shift','scheduling',
                 'no show','caregiver','coordinator'],
  aliases = array['call-off','no-show','shift coverage'],
  alt_questions = array[
    'What do we do when a caregiver calls out?',
    'What is the coverage procedure for a missed shift?',
    'Who do we call when a caregiver does not show up?'],
  phrases = array['calls off','called off','call out','does not show','no show','missed shift']
where id = 'N005'
  and aliases = '{}' and alt_questions = '{}';

-- ── N006  HomeTogether TV price ─────────────────────────────────────────────
update kb_items set
  topics = array['hometogether','tv','price','cost','device','monthly','subscription',
                 'how much','video calling'],
  aliases = array['HomeTogether','HomeTogether TV','HT TV','home together','the device'],
  alt_questions = array[
    'How much is HomeTogether?',
    'What does the TV device cost per month?',
    'Is there a contract for HomeTogether TV?',
    'How much does the video calling device cost?'],
  phrases = array['how much is hometogether','what does hometogether cost','monthly cost',
                  'per month','is there a contract','cost of the device']
where id = 'N006'
  and aliases = '{}' and alt_questions = '{}';

-- Check after running:
-- select id, array_length(alt_questions,1) as alts, array_length(phrases,1) as phrases
-- from kb_items order by id;
