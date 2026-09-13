-- =============================================================================
-- Caring Companions Core — proposed knowledge and knowledge gaps
-- =============================================================================
-- The staging area between a source and verified knowledge.
--
--   SOURCE → AI EXTRACTION → kb_candidates → HUMAN REVIEW → kb_items
--
-- Nothing in kb_candidates is readable by Cara or any consumer. There is no
-- code path from extraction to kb_items; promotion is a separate human act.
--
-- Additive. New tables only. No RLS weakened, no policy created. Re-runnable.
-- =============================================================================

create table if not exists kb_candidates (
  id                    bigserial primary key,
  document_id           bigint references kb_source_documents(id) on delete cascade,
  chunk_id              bigint references kb_source_chunks(id) on delete set null,
  source_id             text,

  proposed_question     text not null,
  alt_questions         text[] not null default '{}',
  proposed_answer       text not null,
  conditions            text[] not null default '{}',

  knowledge_type        text not null default 'external_rule'
                          check (knowledge_type in ('external_rule','company_procedure','company_policy','definition','case_precedent')),
  programs              text[] not null default '{}',
  audience_suggestion   text not null default 'public'
                          check (audience_suggestion in ('public','internal')),

  -- Provenance. An answer nobody can trace is not reviewable.
  section_heading       text,
  supporting_passage    text,
  extraction_confidence int not null default 0 check (extraction_confidence between 0 and 100),

  -- Review. 'proposed' until a human touches it.
  status                text not null default 'proposed'
                          check (status in ('proposed','approved','edited','rejected','needs_clarification')),
  reviewed_by           text,
  reviewed_at           timestamptz,
  review_note           text,
  promoted_item_id      text references kb_items(id) on delete set null,

  created_at            timestamptz not null default now()
);
create index if not exists kb_candidates_doc_idx    on kb_candidates (document_id);
create index if not exists kb_candidates_status_idx on kb_candidates (status);

-- Questions the sources raise but do not answer. The honest destination for
-- everything extraction could not support, and later for unanswered Cara and
-- staff questions. A gap is a work item, not a failure.
create table if not exists kb_gaps (
  id          bigserial primary key,
  question    text not null,
  why         text,
  origin      text not null default 'extraction'
                check (origin in ('extraction','cara','staff','review','manual')),
  document_id bigint references kb_source_documents(id) on delete set null,
  chunk_id    bigint references kb_source_chunks(id) on delete set null,
  programs    text[] not null default '{}',
  status      text not null default 'open'
                check (status in ('open','researching','answered','not_applicable')),
  resolved_by_item text references kb_items(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists kb_gaps_status_idx on kb_gaps (status);
create index if not exists kb_gaps_origin_idx on kb_gaps (origin);

alter table kb_candidates enable row level security;
alter table kb_gaps       enable row level security;
-- No policies. Service role only, same as every other kb_ table.

-- Sequences need explicit grants; new objects do not inherit them here.
-- This is the failure that cost an evening, so it is done at creation time.
do $$
declare s record;
begin
  for s in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind='S'
             and c.relname in ('kb_candidates_id_seq','kb_gaps_id_seq')
  loop
    execute format('grant usage, select on sequence public.%I to service_role', s.relname);
  end loop;
end $$;

-- Check after running:
-- select count(*) from kb_candidates; select count(*) from kb_gaps;
