-- =============================================================================
-- Caring Companions Core — concepts, claims, evidence, answers
-- =============================================================================
-- The shape Core is governed around, proved on CDS Eligibility before being
-- built:
--
--   CONCEPT           the governed unit            "CDS Eligibility"
--     CLAIMS          atomic truths underneath     "must be at least 18"
--       EVIDENCE      exact provenance per claim   publication, section, quote
--     ANSWERS         synthesis for an audience    family / staff / leadership
--     QUESTIONS       every way people ask         50 phrasings, one concept
--     GAPS            questions evidence cannot answer
--
-- THE CLAIMS ARE THE TRUTH LAYER. An answer is a presentation of approved
-- claims for one audience, never the underlying truth. Rewording an answer
-- must never be capable of changing what Core believes.
--
-- Three rules are enforced by triggers rather than convention, because each
-- one fails silently and expensively:
--
--   1. A concept cannot be VERIFIED while it holds an unresolved conflict.
--      It may be PARTIALLY VERIFIED, with its approved claims usable.
--   2. An answer may not be built from a disputed claim, or one whose evidence
--      has gone. A PUBLIC answer additionally may use only claims that are
--      public and publicly sourced. Internal claims may enrich a staff answer
--      and can never reach public Cara.
--   3. Nothing is approved by confidence. Confidence orders the queue and
--      appears in no approval path anywhere in this file.
--
-- Additive. Creates only new kb_* objects. Touches no kb_items. Re-runnable.
-- =============================================================================


-- ── Source identity: the artifact, and the publication it represents ────────
-- These are different things and Core needs both. Samantha pasted the text of
-- the MO HealthNet Personal Care Provider Manual because the .docx would not
-- read. The ARTIFACT is a local paste with no URL. The PUBLICATION is a
-- Missouri DSS manual anyone can download. Judging the rule's publicability
-- from the artifact would make a public state rule confidential because of how
-- a copy happened to arrive.

alter table kb_publications
  add column if not exists public_availability text not null default 'unknown'
    check (public_availability in ('published_public', 'restricted', 'unknown'));

alter table kb_publications
  add column if not exists official_url text;

alter table kb_publications
  add column if not exists published_on date;

comment on column kb_publications.public_availability is
  'Whether the PUBLICATION is publicly available, which is what decides if knowledge derived from it may be public. Never inferred from how a copy reached us.';

alter table kb_source_documents
  add column if not exists ingest_origin text
    check (ingest_origin in ('fetched', 'uploaded', 'pasted'));

alter table kb_source_documents
  add column if not exists provenance_note text;

comment on column kb_source_documents.ingest_origin is
  'How these bytes arrived. Records the artifact, never the authority: a pasted copy of a public manual is still a copy of a public manual.';


-- ── Concepts ────────────────────────────────────────────────────────────────
create table if not exists kb_concepts (
  id            text primary key,                 -- 'C-CDS-ELIGIBILITY'
  name          text not null,
  description   text,                             -- plain language, for a person
  question      text,                             -- the canonical question
  program       text,
  topic         text,                             -- eligibility, training, evv, ...
  status        text not null default 'proposed'
                  check (status in ('proposed','partially_verified','verified','held')),
  -- Ordering only. Never a reason to approve anything.
  priority      int  not null default 50,
  verified_by   text,
  verified_on   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists kb_concepts_topic_idx  on kb_concepts (topic);
create index if not exists kb_concepts_status_idx on kb_concepts (status);


-- ── Claims: the truth layer ─────────────────────────────────────────────────
create table if not exists kb_claims (
  id            bigserial primary key,
  concept_id    text not null references kb_concepts(id) on delete cascade,
  ref           text not null,                    -- 'CL-01', stable within a concept
  text          text not null,

  knowledge_type text not null default 'external_rule'
    check (knowledge_type in ('external_rule','company_procedure','company_policy','case_precedent','definition')),

  -- How this claim stands against the others in its concept. AI may propose
  -- these. It may never silently resolve CONFLICTS or DIFFERENT_SCOPE.
  relationship  text not null default 'SINGLE_SOURCE'
    check (relationship in ('AGREES','SUPPLEMENTS','CONFLICTS','DIFFERENT_SCOPE','SINGLE_SOURCE')),
  related_ref   text,                             -- the claim it supplements / conflicts with

  status        text not null default 'proposed'
    check (status in ('proposed','approved','rejected','needs_research','withheld','needs_reverification')),

  -- Proposed by extraction; the effective value is set by a person on approval.
  proposed_audience  text not null default 'internal'
    check (proposed_audience in ('public','internal')),
  effective_audience text
    check (effective_audience in ('public','internal')),

  -- Ordering only. There is no code path anywhere that approves on this.
  extraction_confidence int not null default 0
    check (extraction_confidence between 0 and 100),

  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),

  unique (concept_id, ref)
);
create index if not exists kb_claims_concept_idx on kb_claims (concept_id);
create index if not exists kb_claims_status_idx  on kb_claims (status);
create index if not exists kb_claims_rel_idx     on kb_claims (relationship);


-- ── Evidence: one claim may rest on several sources ─────────────────────────
-- Snapshots authority and sensitivity as they were when the evidence was
-- attached, so a later reclassification cannot silently rewrite the basis on
-- which something was approved.
create table if not exists kb_claim_evidence (
  id              bigserial primary key,
  claim_id        bigint not null references kb_claims(id) on delete cascade,
  document_id     bigint references kb_source_documents(id) on delete set null,
  chunk_id        bigint references kb_source_chunks(id) on delete set null,
  publication_id  text   references kb_publications(id) on delete set null,

  quote           text not null,                  -- the exact sentences relied on
  section_ref     text,                           -- 'Section 3, Eligibility' or a page
  source_authority   text,
  source_sensitivity text,
  publication_public text,                        -- snapshot of public_availability
  publisher_revision text,
  effective_on    date,
  last_checked    date,

  -- Set by the loader after checking the quote against the stored chunk. A
  -- citation nobody checked is the failure this system exists to prevent.
  verified_verbatim boolean not null default false,

  created_at      timestamptz not null default now()
);
create index if not exists kb_claim_evidence_claim_idx on kb_claim_evidence (claim_id);
create index if not exists kb_claim_evidence_doc_idx   on kb_claim_evidence (document_id);


-- ── Answers: presentations, never the truth ─────────────────────────────────
create table if not exists kb_answers (
  id           bigserial primary key,
  concept_id   text not null references kb_concepts(id) on delete cascade,
  audience     text not null check (audience in ('public','staff','leadership')),
  text         text not null,
  built_from   bigint[] not null default '{}',    -- kb_claims.id
  excluded     bigint[] not null default '{}',    -- deliberately left out
  exclusion_reason text,
  status       text not null default 'proposed'
                 check (status in ('proposed','approved','withheld')),
  approved_by  text,
  approved_at  timestamptz,
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  unique (concept_id, audience)
);


-- ── The question universe ───────────────────────────────────────────────────
create table if not exists kb_questions (
  id          bigserial primary key,
  concept_id  text not null references kb_concepts(id) on delete cascade,
  text        text not null,
  register    text not null default 'family'
                check (register in ('family','staff','leadership')),
  origin      text not null default 'extraction'
                check (origin in ('extraction','cara','staff','manual')),
  created_at  timestamptz not null default now(),
  unique (concept_id, text)
);
create index if not exists kb_questions_concept_idx on kb_questions (concept_id);


-- ── Gaps belong to concepts, and can be closed by later evidence ────────────
alter table kb_gaps add column if not exists concept_id text references kb_concepts(id) on delete set null;
alter table kb_gaps add column if not exists gap_state text not null default 'source_does_not_answer'
  check (gap_state in ('source_does_not_answer','partially_informed','sources_diverge',
                       'source_not_yet_indexed','closure_proposed','closed'));
alter table kb_gaps add column if not exists closed_by_evidence_id bigint references kb_claim_evidence(id) on delete set null;
alter table kb_gaps add column if not exists closure_note text;

comment on column kb_gaps.gap_state is
  'Why this is still open, and how close it is to closing. A gap is a work item with a reason, not an absence.';


-- ── Merge proposals: proposed, never silent ─────────────────────────────────
create table if not exists kb_merge_proposals (
  id           bigserial primary key,
  concept_id   text not null references kb_concepts(id) on delete cascade,
  claim_refs   text[] not null default '{}',
  kind         text not null
                 check (kind in ('AGREES','SUPPLEMENTS','CONFLICTS','DIFFERENT_SCOPE')),
  rationale    text not null,
  proposed_action text,
  status       text not null default 'proposed'
                 check (status in ('proposed','confirmed','rejected')),
  decided_by   text,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists kb_merge_concept_idx on kb_merge_proposals (concept_id);


-- ── R8. Review history: who decided what, when, and why ────────────────────
-- Approving knowledge is an accountable act. "It says 18 because Samantha
-- approved it on the 10th, citing two manuals" is a different kind of answer
-- from "it says 18". Written by trigger so nobody has to remember to.
create table if not exists kb_claim_history (
  id          bigserial primary key,
  claim_id    bigint not null references kb_claims(id) on delete cascade,
  concept_id  text,
  claim_ref   text,
  action      text not null,            -- created, status_changed, edited, reverification_required
  from_status text,
  to_status   text,
  changed     text[] not null default '{}',
  actor       text,
  note        text,
  at          timestamptz not null default now()
);
create index if not exists kb_claim_history_claim_idx on kb_claim_history (claim_id, at desc);
alter table kb_claim_history enable row level security;

create or replace function kb_claim_history_write() returns trigger
language plpgsql as $$
declare fields text[] := '{}';
begin
  if TG_OP = 'INSERT' then
    insert into kb_claim_history (claim_id, concept_id, claim_ref, action, to_status, actor, note)
    values (new.id, new.concept_id, new.ref, 'created', new.status, new.reviewed_by, new.review_note);
    return new;
  end if;
  if new.text   is distinct from old.text   then fields := fields || 'wording'; end if;
  if new.proposed_audience is distinct from old.proposed_audience
     or new.effective_audience is distinct from old.effective_audience then fields := fields || 'audience'; end if;
  if new.relationship is distinct from old.relationship then fields := fields || 'relationship'; end if;
  if new.status is distinct from old.status or cardinality(fields) > 0 then
    insert into kb_claim_history (claim_id, concept_id, claim_ref, action, from_status, to_status,
                                  changed, actor, note)
    values (new.id, new.concept_id, new.ref,
            case when new.status = 'needs_reverification' and old.status <> 'needs_reverification'
                 then 'reverification_required'
                 when new.status is distinct from old.status then 'status_changed'
                 else 'edited' end,
            old.status, new.status, fields, new.reviewed_by, new.review_note);
  end if;
  return new;
end $$;

drop trigger if exists kb_claims_history on kb_claims;
create trigger kb_claims_history after insert or update on kb_claims
  for each row execute function kb_claim_history_write();


-- ── R5. Losing evidence flags a claim, it never deletes one ────────────────
-- A source can change, move, 404, be superseded or be reclassified. None of
-- those mean the rule stopped existing, so the claim survives and is marked
-- for a person to look at. It is simultaneously blocked from every answer by
-- the guard below, so a claim resting on a vanished source cannot keep
-- speaking while nobody has noticed.
create or replace function kb_claim_evidence_lost() returns trigger
language plpgsql as $$
declare remaining int;
begin
  select count(*) into remaining
    from kb_claim_evidence e where e.claim_id = old.claim_id and e.verified_verbatim;
  if remaining = 0 then
    update kb_claims
       set status = 'needs_reverification',
           review_note = 'The evidence this rested on is no longer available. The claim has been kept and withheld from answers until someone re-checks it.'
     where id = old.claim_id and status <> 'rejected';
  end if;
  return old;
end $$;

drop trigger if exists kb_claim_evidence_lost on kb_claim_evidence;
create trigger kb_claim_evidence_lost after delete on kb_claim_evidence
  for each row execute function kb_claim_evidence_lost();

-- The same, for a source that changed underneath us rather than disappearing.
create or replace function kb_source_change_flags_claims() returns trigger
language plpgsql as $$
begin
  if new.status in ('changed','moved','gone','superseded','error')
     and old.status is distinct from new.status then
    update kb_claims c
       set status = 'needs_reverification',
           review_note = 'A source behind this claim is now marked ' || new.status
                      || '. The claim is withheld from answers until someone re-checks it.'
     where c.status in ('proposed','approved')
       and exists (select 1 from kb_claim_evidence e
                    where e.claim_id = c.id and e.document_id = new.id);
  end if;
  return new;
end $$;

drop trigger if exists kb_source_documents_flag_claims on kb_source_documents;
create trigger kb_source_documents_flag_claims after update of status on kb_source_documents
  for each row execute function kb_source_change_flags_claims();


alter table kb_concepts        enable row level security;
alter table kb_claims          enable row level security;
alter table kb_claim_evidence  enable row level security;
alter table kb_answers         enable row level security;
alter table kb_questions       enable row level security;
alter table kb_merge_proposals enable row level security;
-- No policies. Service role only, same as every other kb_ table.


-- ═══ RULE 1 ═════════════════════════════════════════════════════════════════
-- A concept cannot be fully verified while it holds an unresolved conflict.
-- Partially verified is a legitimate, useful state: the settled claims are
-- usable while the disputed one stays withheld.
create or replace function kb_concept_verify_guard() returns trigger
language plpgsql as $$
declare unresolved int;
begin
  if new.status = 'verified' then
    select count(*) into unresolved
      from kb_claims c
     where c.concept_id = new.id
       and c.relationship in ('CONFLICTS','DIFFERENT_SCOPE')
       and c.status in ('proposed','needs_research');
    if unresolved > 0 then
      raise exception
        'Concept % cannot be marked verified: % claim(s) carry an unresolved CONFLICTS or DIFFERENT_SCOPE relationship. Settle them, or use partially_verified so the approved claims stay usable while the disputed one is withheld.',
        new.id, unresolved
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists kb_concepts_verify_guard on kb_concepts;
create trigger kb_concepts_verify_guard before insert or update of status on kb_concepts
  for each row execute function kb_concept_verify_guard();


-- ═══ RULES 2, 4, 5 and 6: what an answer may be built from ═════════════════
-- An answer is a presentation of claims. These decide which claims it may
-- present, and they apply on the way in, not on the way out.
--
--   R6  A disputed claim, CONFLICTS or DIFFERENT_SCOPE and not yet settled,
--       may not appear in ANY answer. Excluding it explicitly is how a
--       partially verified concept still answers with its settled claims.
--   R5  A claim whose evidence has gone may not appear in any answer.
--   R2  A PUBLIC answer may additionally use only claims that are public and
--       whose evidence comes from a publicly published source.
create or replace function kb_answer_guard() returns trigger
language plpgsql as $$
declare bad_ref text; bad_reason text;
begin
  -- Disputed or unverifiable claims, whatever the audience.
  select c.ref,
         case when c.status = 'needs_reverification'
                then 'the evidence behind it is no longer available and it is awaiting re-check'
              when c.relationship = 'CONFLICTS'
                then 'authoritative sources disagree about it and that has not been settled'
              else 'it may apply to different circumstances and that has not been settled' end
    into bad_ref, bad_reason
    from kb_claims c
   where c.id = any(new.built_from)
     and ( c.status = 'needs_reverification'
        or (c.relationship in ('CONFLICTS','DIFFERENT_SCOPE')
            and c.status in ('proposed','needs_research')) )
   limit 1;

  if bad_ref is not null then
    raise exception
      'Answer for % cannot include claim %: %. Leave it out and the rest of the concept can still be answered.',
      new.concept_id, bad_ref, bad_reason
      using errcode = 'check_violation';
  end if;

  -- Public answers carry the extra test.
  if new.audience = 'public' then
    select c.ref,
           case when coalesce(c.effective_audience, c.proposed_audience) <> 'public'
                  then 'the claim is internal'
                else 'no evidence for it comes from a publicly published source' end
      into bad_ref, bad_reason
      from kb_claims c
     where c.id = any(new.built_from)
       and ( coalesce(c.effective_audience, c.proposed_audience) <> 'public'
          or not exists (
               select 1 from kb_claim_evidence e
                where e.claim_id = c.id
                  and coalesce(e.publication_public, 'unknown') = 'published_public') )
     limit 1;

    if bad_ref is not null then
      raise exception
        'A public answer for % cannot include claim %: %. Internal claims may enrich a staff or leadership answer and must never reach public Cara.',
        new.concept_id, bad_ref, bad_reason
        using errcode = 'check_violation';
    end if;
  end if;

  -- R4. Approving claims does not approve an answer, and an answer cannot be
  -- approved ahead of the claims it rests on. The truth layer settles first.
  if new.status = 'approved' and coalesce(old.status, 'proposed') <> 'approved' then
    select c.ref into bad_ref
      from kb_claims c
     where c.id = any(new.built_from) and c.status <> 'approved'
     limit 1;
    if bad_ref is not null then
      raise exception
        'The % answer for % cannot be approved while claim % is not approved. Claims are the truth layer and settle first; an answer is a presentation of them.',
        new.audience, new.concept_id, bad_ref
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists kb_answers_audience_guard on kb_answers;
drop trigger if exists kb_answers_guard on kb_answers;
create trigger kb_answers_guard before insert or update on kb_answers
  for each row execute function kb_answer_guard();


-- Approving a CLAIM must never approve an ANSWER. Nothing in this file
-- cascades from kb_claims to kb_answers, and this comment exists so that
-- nobody adds one. An answer built on a claim that later changes is caught
-- by the guard above the next time it is written.


-- ── A self-test for the guards, runnable any time ──────────────────────────
-- Each guard exists to prevent something that would otherwise be invisible.
-- A guard nobody has watched refuse anything is a guard nobody should trust,
-- so this attempts the three things that must fail and reports what happened.
-- Every attempt is expected to raise, so nothing is left behind except the
-- temporary internal claim, which is removed.
create or replace function kb_guard_selftest()
returns table (test text, passed boolean, detail text)
language plpgsql as $$
declare cid text; tmp bigint; msg text;
begin
  select id into cid from kb_concepts order by priority limit 1;
  if cid is null then
    return query select 'no concept to test against'::text, false, 'seed a concept first'::text;
    return;
  end if;

  -- 1. A public answer may not use an internal claim.
  insert into kb_claims (concept_id, ref, text, status, proposed_audience, relationship)
  values (cid, '__selftest', 'Temporary internal claim used only by the guard self-test.',
          'approved', 'internal', 'SINGLE_SOURCE')
  on conflict (concept_id, ref) do update set status = 'approved'
  returning id into tmp;
  begin
    insert into kb_answers (concept_id, audience, text, built_from)
    values (cid, 'public', 'self-test', array[tmp]);
    test := 'public answer refuses an internal claim'; passed := false;
    detail := 'IT WAS ACCEPTED. The audience guard is not working.';
  exception when check_violation then
    get stacked diagnostics msg = message_text;
    test := 'public answer refuses an internal claim'; passed := true; detail := msg;
  end;
  return next;
  delete from kb_claims where concept_id = cid and ref = '__selftest';

  -- 2. An answer may not use a disputed claim.
  begin
    insert into kb_answers (concept_id, audience, text, built_from)
    select cid, 'leadership', 'self-test', array[c.id]
      from kb_claims c
     where c.concept_id = cid and c.relationship in ('CONFLICTS','DIFFERENT_SCOPE')
       and c.status in ('proposed','needs_research') limit 1;
    test := 'answers refuse a disputed claim'; passed := false;
    detail := 'IT WAS ACCEPTED, or there is no disputed claim to test with.';
  exception when check_violation then
    get stacked diagnostics msg = message_text;
    test := 'answers refuse a disputed claim'; passed := true; detail := msg;
  end;
  return next;

  -- 3. A concept may not be fully verified with an open dispute.
  begin
    update kb_concepts set status = 'verified' where id = cid;
    test := 'concept refuses full verification while disputed'; passed := false;
    detail := 'IT WAS ACCEPTED. The verification guard is not working.';
  exception when check_violation then
    get stacked diagnostics msg = message_text;
    test := 'concept refuses full verification while disputed'; passed := true; detail := msg;
  end;
  return next;
end $$;


-- ── Views for the review screen ─────────────────────────────────────────────
-- Dropped in REVERSE dependency order, together, before either is recreated.
-- kb_concept_attention reads kb_concept_review, so dropping the review view on
-- its own succeeds the first time and fails on every run after with
-- "cannot drop view ... because other objects depend on it". That is the third
-- time this exact shape has bitten this project (see 20260808d, f and j), and
-- it bit here because I wrote the CREATEs in reading order and the DROPs with
-- them. The DROPs belong together, at the top, in the opposite order.
drop view if exists kb_concept_attention;
drop view if exists kb_concept_review;

create view kb_concept_review as
select
  k.id, k.name, k.description, k.question, k.program, k.topic, k.status, k.priority,
  (select count(*) from kb_claims c where c.concept_id = k.id)                            as claims,
  (select count(*) from kb_claims c where c.concept_id = k.id and c.status = 'approved')  as claims_approved,
  (select count(*) from kb_claims c where c.concept_id = k.id and c.relationship = 'CONFLICTS'
     and c.status in ('proposed','needs_research'))                                       as open_conflicts,
  (select count(*) from kb_claims c where c.concept_id = k.id and c.relationship = 'DIFFERENT_SCOPE'
     and c.status in ('proposed','needs_research'))                                       as open_scope_questions,
  (select count(*) from kb_claims c where c.concept_id = k.id and c.status = 'proposed')  as claims_awaiting,
  (select count(distinct e.document_id) from kb_claims c
     join kb_claim_evidence e on e.claim_id = c.id where c.concept_id = k.id)             as documents,
  (select count(*) from kb_claim_evidence e join kb_claims c on c.id = e.claim_id
     where c.concept_id = k.id)                                                           as evidence_quotes,
  (select count(*) from kb_claim_evidence e join kb_claims c on c.id = e.claim_id
     where c.concept_id = k.id and e.verified_verbatim)                                   as evidence_verified,
  (select count(*) from kb_questions q where q.concept_id = k.id)                         as questions,
  (select count(*) from kb_gaps g where g.concept_id = k.id and g.gap_state <> 'closed')  as gaps_open,
  (select count(*) from kb_merge_proposals m where m.concept_id = k.id and m.status = 'proposed') as merges_proposed
from kb_concepts k;

-- Why this needs your attention. Reasons, in the order they should be read.
create view kb_concept_attention as
select r.id, r.name, r.topic, r.priority, r.status, reason, rank
from kb_concept_review r
cross join lateral (
  values
    (case when r.open_conflicts > 0
          then 'Conflict: ' || r.open_conflicts || ' claim(s) where authoritative sources appear inconsistent.' end, 1),
    (case when r.open_scope_questions > 0
          then 'Scope: ' || r.open_scope_questions || ' claim(s) may apply to different circumstances rather than contradicting.' end, 2),
    (case when r.status = 'proposed' and r.claims_approved = 0
          then 'New: no verified Core knowledge exists for this concept yet.' end, 3),
    (case when r.evidence_quotes > 0 and r.evidence_verified < r.evidence_quotes
          then 'Evidence: ' || (r.evidence_quotes - r.evidence_verified) || ' quote(s) could not be matched to the stored source.' end, 4),
    (case when r.gaps_open > 0
          then 'Gaps: ' || r.gaps_open || ' question(s) the evidence does not answer.' end, 5),
    (case when r.merges_proposed > 0
          then 'Merges: ' || r.merges_proposed || ' proposed, awaiting confirmation.' end, 6)
) as t(reason, rank)
where reason is not null;

do $$
declare s record;
begin
  for s in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'S'
             and c.relname in ('kb_claims_id_seq','kb_claim_evidence_id_seq','kb_answers_id_seq',
                               'kb_questions_id_seq','kb_merge_proposals_id_seq')
  loop
    execute format('grant usage, select on sequence public.%I to service_role', s.relname);
  end loop;
end $$;

-- Check after running:
--   select * from kb_concept_review;
--   select id, reason from kb_concept_attention order by priority, rank;
