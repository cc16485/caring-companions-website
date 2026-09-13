-- =============================================================================
-- Caring Companions Core — Source Library
-- =============================================================================
-- Additive only. New kb_* tables. No existing table touched, no RLS weakened,
-- no policies created. Safe to re-run.
--
-- Two levels, because a manual is one publication AND many pages that move,
-- change and get revised independently:
--   kb_publications      the thing you would name out loud
--   kb_source_documents  each page/file under it, with its own provenance
--   kb_source_chunks     what Core actually indexed, with citations
--
-- INDEXED IS NOT VERIFIED. Nothing here is readable by Cara or any consumer.
-- The only path to a family-facing answer remains kb_items + human approval.
-- =============================================================================

create table if not exists kb_publications (
  id           text primary key,
  title        text not null,
  publisher    text not null,                     -- DHSS, MO HealthNet, MMAC, CMS, VA, carrier, Caring Companions
  authority    text not null default 'primary'
                 check (authority in ('primary','company','secondary')),
  program      text,                              -- IHS, CDS, GUIDE, VA, LTCI, private_pay, null = company-wide
  jurisdiction text,
  home_url     text,
  source_type  text not null default 'manual'
                 check (source_type in ('manual','regulation','statute','contract','policy','bulletin','webpage','training','other')),
  review_owner text,
  last_checked date,
  status       text not null default 'active'
                 check (status in ('active','superseded','archived')),
  added_by     text,
  created_at   timestamptz not null default now()
);

create table if not exists kb_source_documents (
  id                 bigserial primary key,
  publication_id     text references kb_publications(id) on delete cascade,
  title              text not null,
  canonical_url      text,                        -- where it actually resolved to, after redirects
  requested_url      text,                        -- what was pasted, kept when they differ
  format             text not null default 'html'
                       check (format in ('html','pdf','docx','txt','transcript','other')),
  file_ref           text,                        -- storage path for uploads
  -- Honest metadata. NULL means the publisher did not state one. Never invented.
  publisher_revision text,
  effective_on       date,
  retrieved_at       timestamptz,
  content_hash       text,                        -- sha256 of exactly what was indexed
  status             text not null default 'added'
                       check (status in ('added','processing','indexed','changed','moved','gone','superseded','error')),
  parse_error        text,
  chunk_count        int not null default 0,
  char_count         int not null default 0,
  -- Classification can be overridden per document; otherwise inherits the publication.
  program            text,
  authority          text,
  source_type        text,
  added_by           text,
  last_checked       date,
  created_at         timestamptz not null default now()
);
create index if not exists kb_source_documents_pub_idx on kb_source_documents (publication_id);
create index if not exists kb_source_documents_status_idx on kb_source_documents (status);

create table if not exists kb_source_chunks (
  id          bigserial primary key,
  document_id bigint not null references kb_source_documents(id) on delete cascade,
  ordinal     int not null,
  heading     text,                               -- the citation handle: section title or question
  page        int,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists kb_source_chunks_doc_idx on kb_source_chunks (document_id, ordinal);

-- Which verified records came from which document. Empty on day one, and that
-- is the honest state: indexing a manual approves nothing.
create table if not exists kb_document_knowledge (
  document_id bigint not null references kb_source_documents(id) on delete cascade,
  kb_item_id  text   not null references kb_items(id) on delete cascade,
  chunk_id    bigint references kb_source_chunks(id) on delete set null,
  approved_by text,
  approved_at timestamptz not null default now(),
  primary key (document_id, kb_item_id)
);

alter table kb_publications       enable row level security;
alter table kb_source_documents   enable row level security;
alter table kb_source_chunks      enable row level security;
alter table kb_document_knowledge enable row level security;
-- No policies, deliberately. Service role only. The browser cannot reach these.

-- Convenience view for the library list: the two counts that must never merge.
--
-- DROP first. A later migration adds a `programs` column to this view, and the
-- installer re-runs every migration each time, so this file would otherwise try
-- to recreate the view without that column and fail with 42P16 "cannot drop
-- columns from view". Dropping makes each migration's view definition
-- authoritative at the moment it runs, rather than fighting the one after it.
drop view if exists kb_source_library;
create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title, p.publisher,
  coalesce(d.program, p.program)         as program,
  coalesce(d.authority, p.authority)     as authority,
  coalesce(d.source_type, p.source_type) as source_type,
  d.title, d.canonical_url, d.requested_url, d.format, d.status, d.parse_error,
  d.publisher_revision, d.effective_on, d.retrieved_at, d.content_hash,
  d.chunk_count, d.char_count, d.created_at, d.last_checked, d.added_by,
  (select count(*) from kb_document_knowledge k where k.document_id = d.id) as verified_count
from kb_source_documents d
left join kb_publications p on p.id = d.publication_id;

-- Check after running:
-- select count(*) from kb_publications; select count(*) from kb_source_documents;
