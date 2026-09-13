-- =============================================================================
-- Caring Companions Core — company assets, and what depends on a fact
-- =============================================================================
-- Two additions, and they only make sense together.
--
-- 1. A DOCUMENT ROLE. Until now every source in the library was something Core
--    might learn FROM. An onboarding form is not that. It is something the
--    company HANDS OUT, and it is full of claims: a pay rate, a pay cycle, how
--    timesheets work, what training is required, EVV acknowledgements. Those
--    claims go out of date exactly like anything else.
--
--    So a document is now either:
--      reference  Core may derive verified knowledge from it   (today's rows)
--      asset      Core reads it to know what it CLAIMS, and checks those
--                 claims against verified knowledge. Never a citation.
--
--    The distinction is enforced, not documented. If the packet says $14.00 an
--    hour and the verified record says $15.00, the FORM is wrong. Letting an
--    asset become a citation would invert that and let a stale document
--    overrule the truth, so a trigger below refuses it outright.
--
-- 2. kb_dependencies. The forward index the architecture notes describe and
--    deliberately left unbuilt, because it was worthless until something
--    depended on knowledge. Onboarding paperwork depends on knowledge. Now a
--    fact changing produces a LIST of affected documents instead of somebody
--    remembering which ones to go check.
--
-- Additive only. No existing table altered destructively, no RLS weakened, no
-- policy created. Safe to re-run.
-- =============================================================================


-- ── 1. Document role ─────────────────────────────────────────────────────────
-- Publication carries the default and is NOT NULL; a document may override it
-- and is nullable. Same shape as `authority`, `program` and `source_type`, so
-- the library view keeps coalescing in one direction only.

alter table kb_publications
  add column if not exists doc_role text not null default 'reference'
    check (doc_role in ('reference','asset'));

alter table kb_source_documents
  add column if not exists doc_role text
    check (doc_role in ('reference','asset'));

comment on column kb_publications.doc_role is
  'reference = Core may learn from it. asset = a document the company issues, whose claims Core checks against verified knowledge. An asset is never a citation.';
comment on column kb_source_documents.doc_role is
  'Overrides the publication. NULL inherits it.';

-- Assets are still classified `company` authority. Role and authority answer
-- different questions: authority is how much weight a source carries, role is
-- whether it is read for truth or checked for accuracy. An approved SOP is
-- company + reference. The onboarding packet built from it is company + asset.


-- ── The guard that makes "a form is never authority" structural ──────────────
-- kb_document_knowledge is the table that says "this verified record came from
-- this document". An asset must never appear in it.

create or replace function kb_refuse_asset_citation() returns trigger
language plpgsql as $$
declare role_now text; doc_title text;
begin
  select coalesce(d.doc_role, p.doc_role, 'reference'), d.title
    into role_now, doc_title
    from kb_source_documents d
    left join kb_publications p on p.id = d.publication_id
   where d.id = new.document_id;

  if role_now = 'asset' then
    raise exception
      'Document % (%) is a company asset, not a source. Knowledge cannot be approved from it. An asset states claims that are checked against verified knowledge; it never becomes the authority for one.',
      new.document_id, coalesce(doc_title, 'untitled')
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists kb_document_knowledge_no_assets on kb_document_knowledge;
create trigger kb_document_knowledge_no_assets
  before insert or update on kb_document_knowledge
  for each row execute function kb_refuse_asset_citation();

-- The same rule in the other direction: a document that has already been cited
-- cannot be quietly reclassified as an asset, because the records citing it
-- would silently lose their provenance.
create or replace function kb_refuse_asset_reclass() returns trigger
language plpgsql as $$
declare cited int;
begin
  if coalesce(new.doc_role, 'reference') = 'asset'
     and coalesce(old.doc_role, 'reference') is distinct from 'asset' then
    select count(*) into cited from kb_document_knowledge where document_id = new.id;
    if cited > 0 then
      raise exception
        'Document % has % verified record(s) approved from it, so it cannot be reclassified as an asset. Detach those records first.',
        new.id, cited
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists kb_source_documents_role_guard on kb_source_documents;
create trigger kb_source_documents_role_guard
  before update of doc_role on kb_source_documents
  for each row execute function kb_refuse_asset_reclass();


-- ── 2. kb_dependencies — what rests on a fact ────────────────────────────────
-- One row per (fact, thing that states it). The consumer registers what it
-- uses; nothing here is ever read by retrieval or by the policy gate. This
-- table answers "what is affected", never "what may Core say".

create table if not exists kb_dependencies (
  id             bigserial primary key,
  kb_item_id     text   not null references kb_items(id) on delete cascade,

  -- Who depends on it, and what the dependent thing is.
  consumer       text   not null default 'source_library',   -- source_library, website, training, canva, hub, sop
  asset_type     text   not null default 'document',         -- onboarding_form, handbook, webpage, lesson, template, sop
  asset_ref      text   not null,                            -- portable handle: doc id, URL, file path
  document_id    bigint references kb_source_documents(id) on delete cascade,

  -- What the dependent thing actually says, and where it says it. Without
  -- this the flag is only "something here may be wrong", which sends a person
  -- back to reading the whole packet. With it, the answer is the sentence.
  claim          text,
  -- NOT NULL with an empty default, rather than nullable. It is part of the
  -- uniqueness of a claim, and a nullable column cannot carry that: in SQL two
  -- NULLs are not equal, so the same claim would insert twice, and PostgREST
  -- cannot use an expression index like coalesce(claim_location,'') as an
  -- ON CONFLICT target. Empty string means "location not recorded".
  claim_location text   not null default '',                  -- 'page 4, Pay and Timesheets'

  relationship   text not null default 'states'
                   check (relationship in ('states','contradicts','references','derived_from')),
  detected_by    text not null default 'human'
                   check (detected_by in ('human','extraction','recheck')),

  -- The version of the fact this dependency was last checked against. This,
  -- not the status flag, is the durable signal: if the item has moved on, the
  -- dependency is out of date whether or not a trigger fired.
  item_version_seen int,
  last_synced    timestamptz,

  status         text not null default 'current'
                   check (status in ('current','needs_review','resolved','dismissed')),
  flagged_reason text,
  flagged_at     timestamptz,
  reviewed_by    text,
  reviewed_at    timestamptz,
  note           text,

  created_by     text,
  created_at     timestamptz not null default now()
);

create index if not exists kb_dependencies_item_idx     on kb_dependencies (kb_item_id);
create index if not exists kb_dependencies_doc_idx      on kb_dependencies (document_id);
create index if not exists kb_dependencies_status_idx   on kb_dependencies (status);
create index if not exists kb_dependencies_consumer_idx on kb_dependencies (consumer);

-- One claim per (fact, consumer, asset, location). The same form may state the
-- same fact in two places, and both are worth tracking separately, so the
-- location is part of the identity rather than something that overwrites.
-- Plain columns only, so it can serve as an ON CONFLICT target.
create unique index if not exists kb_dependencies_unique_idx
  on kb_dependencies (kb_item_id, consumer, asset_ref, claim_location);

alter table kb_dependencies enable row level security;
-- No policies. Service role only, same as every other kb_ table.


-- ── The payoff: a fact changes, its dependents are flagged ───────────────────
-- Detection is not correction, exactly as with source rechecks. Nothing here
-- edits a document or resolves a contradiction. It produces a list.

create or replace function kb_flag_dependents() returns trigger
language plpgsql as $$
declare reason text;
begin
  if new.answer is distinct from old.answer then
    reason := 'The verified answer changed (v' || old.version || ' → v' || new.version || ').';
  elsif new.status is distinct from old.status and new.status <> 'verified' then
    reason := 'The fact is no longer verified (' || old.status || ' → ' || new.status || ').';
  elsif new.status is distinct from old.status and new.status = 'verified' then
    -- Newly verified with an unchanged answer means the documents quoting it
    -- were right all along. Worth a look only where the recorded claim already
    -- contradicts it.
    update kb_dependencies
       set status = 'needs_review',
           flagged_reason = 'This fact is now verified, and this document contradicts it.',
           flagged_at = now()
     where kb_item_id = new.id
       and relationship = 'contradicts'
       and status in ('current','resolved');
    return new;
  else
    return new;
  end if;

  update kb_dependencies
     set status = 'needs_review',
         flagged_reason = reason,
         flagged_at = now()
   where kb_item_id = new.id
     and status in ('current','resolved');

  return new;
end $$;

-- AFTER, so it never interferes with kb_version_on_change, which runs BEFORE
-- and is what sets new.version in the first place.
drop trigger if exists kb_items_flag_dependents on kb_items;
create trigger kb_items_flag_dependents after update on kb_items
  for each row execute function kb_flag_dependents();


-- ── Views ────────────────────────────────────────────────────────────────────
-- Dropped in REVERSE dependency order, all together, before any is recreated.
-- kb_asset_health and kb_fact_impact both read kb_dependency_check, and
-- Postgres refuses to drop a view another view depends on. Dropping them
-- inline, each just above its own CREATE, works on a fresh database and fails
-- on the second run of the installer, which re-applies every migration.
-- CASCADE would also work and is worse: it would silently drop anything else
-- that came to depend on these later.
drop view if exists kb_fact_impact;
drop view if exists kb_asset_health;
drop view if exists kb_dependency_check;

-- Every recorded claim beside the fact it depends on. `drifted` is computed
-- from the version rather than trusted from the flag, so a dependency written
-- before a change, or missed by a trigger, still reads as out of date.
create view kb_dependency_check as
select
  dep.id, dep.kb_item_id, dep.consumer, dep.asset_type, dep.asset_ref,
  dep.document_id, d.title as document_title,
  coalesce(d.doc_role, p.doc_role, 'reference') as doc_role,
  dep.claim, dep.claim_location, dep.relationship, dep.detected_by,
  dep.status, dep.flagged_reason, dep.flagged_at,
  dep.item_version_seen, dep.last_synced, dep.note,
  i.question      as fact_question,
  i.answer        as fact_answer,
  i.status        as fact_status,
  i.version       as fact_version,
  i.verified_on   as fact_verified_on,
  (dep.item_version_seen is null or dep.item_version_seen < i.version) as drifted,
  (dep.relationship = 'contradicts')                                   as contradicts,
  (i.status <> 'verified')                                             as fact_unverified
from kb_dependencies dep
join kb_items i on i.id = dep.kb_item_id
left join kb_source_documents d on d.id = dep.document_id
left join kb_publications p on p.id = d.publication_id;

-- One row per asset, for the screen that answers "can I trust what my company
-- is handing people". Counts are kept apart on purpose: a document that
-- contradicts a verified fact is a different problem from one that quotes a
-- fact nobody has verified yet.
create view kb_asset_health as
select
  dep.consumer, dep.asset_type, dep.asset_ref,
  dep.document_id,
  max(dep.document_title)                                              as document_title,
  count(*)                                                             as claims_tracked,
  count(*) filter (where dep.contradicts)                              as contradicting,
  count(*) filter (where dep.drifted and not dep.contradicts)          as drifted,
  count(*) filter (where dep.fact_unverified)                          as resting_on_unverified,
  count(*) filter (where dep.status = 'needs_review')                  as needs_review,
  max(dep.flagged_at)                                                  as last_flagged_at
from kb_dependency_check dep
group by dep.consumer, dep.asset_type, dep.asset_ref, dep.document_id;

-- The reverse direction, for the fact's own detail panel: change this, and
-- these are the things that state it.
create view kb_fact_impact as
select
  i.id as kb_item_id, i.question, i.answer, i.status, i.version,
  count(dep.id)                                              as dependents,
  count(dep.id) filter (where dep.status = 'needs_review')   as dependents_needing_review,
  count(dep.id) filter (where dep.contradicts)               as dependents_contradicting,
  array_agg(distinct dep.consumer)   filter (where dep.id is not null) as consumers,
  array_agg(distinct dep.asset_ref)  filter (where dep.id is not null) as assets
from kb_items i
left join kb_dependency_check dep on dep.kb_item_id = i.id
group by i.id, i.question, i.answer, i.status, i.version;


-- ── Library view: carry doc_role and the asset counts ────────────────────────
-- DROP first, for the reason recorded in 20260808d and 20260808f: the installer
-- re-runs every migration in order, and CREATE OR REPLACE VIEW cannot insert a
-- column ahead of an existing one (42P16). Each migration's definition is
-- authoritative at the moment it runs.
drop view if exists kb_source_library;

create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title, p.publisher,
  coalesce(d.program, p.program)                    as program,
  case when cardinality(d.programs) > 0 then d.programs
       else coalesce(p.programs, '{}') end          as programs,
  coalesce(d.authority, p.authority)                as authority,
  coalesce(d.doc_role, p.doc_role, 'reference')     as doc_role,
  coalesce(d.source_type, p.source_type)            as source_type,
  d.title, d.canonical_url, d.requested_url, d.format, d.status, d.parse_error,
  d.publisher_revision, d.effective_on, d.retrieved_at, d.content_hash,
  d.chunk_count, d.char_count, d.created_at, d.last_checked, d.added_by,
  (select count(*) from kb_document_knowledge k where k.document_id = d.id) as verified_count,
  (select count(*) from kb_dependencies dp where dp.document_id = d.id)     as claims_tracked,
  (select count(*) from kb_dependencies dp
     where dp.document_id = d.id and dp.status = 'needs_review')            as claims_needing_review
from kb_source_documents d
left join kb_publications p on p.id = d.publication_id;


-- ── Sequence grants ──────────────────────────────────────────────────────────
-- New objects do not inherit them here. This is the failure that cost an
-- evening in 20260808e, so it is done at creation time.
do $$
declare s record;
begin
  for s in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'S'
             and c.relname in ('kb_dependencies_id_seq')
  loop
    execute format('grant usage, select on sequence public.%I to service_role', s.relname);
  end loop;
end $$;


-- Check after running:
--   select doc_role, count(*) from kb_source_library group by 1;
--   select * from kb_fact_impact where dependents > 0;
--   select asset_ref, contradicting, drifted from kb_asset_health;
