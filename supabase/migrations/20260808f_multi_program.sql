-- =============================================================================
-- Caring Companions Core — a source can belong to several programs
-- =============================================================================
-- The DHSS HCBS manual governs IHS and CDS. The MO HealthNet Personal Care
-- manual covers both models. Forcing one program per source meant filing a
-- shared manual under whichever program came to mind first, and then not
-- finding it from the other.
--
-- Additive. The old singular `program` column is kept and backfilled from, so
-- nothing that reads it breaks. New writes populate `programs`.
-- Safe to re-run.
-- =============================================================================

alter table kb_publications      add column if not exists programs text[] not null default '{}';
alter table kb_source_documents  add column if not exists programs text[] not null default '{}';

comment on column kb_publications.programs is
  'Every program this source governs. A shared manual belongs to all of them.';
comment on column kb_source_documents.programs is
  'Overrides the publication when a single page is narrower than the manual.';

-- Backfill from the singular column so existing rows keep their meaning.
update kb_publications
   set programs = array[program]
 where program is not null and program <> '' and cardinality(programs) = 0;

update kb_source_documents
   set programs = array[program]
 where program is not null and program <> '' and cardinality(programs) = 0;

create index if not exists kb_publications_programs_idx     on kb_publications     using gin (programs);
create index if not exists kb_source_documents_programs_idx on kb_source_documents using gin (programs);

-- The library view exposes the array, and keeps a singular value for anything
-- still reading one.
--
-- DROP first, deliberately. CREATE OR REPLACE VIEW can append columns but
-- cannot reorder or rename existing ones, so inserting `programs` ahead of
-- `program` reads as renaming column 3 and fails with 42P16. Dropping is safe
-- here: the view holds no data, nothing else depends on it, and it is rebuilt
-- in the same transaction.
drop view if exists kb_source_library;

create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title, p.publisher,
  coalesce(d.program, p.program)                    as program,
  case when cardinality(d.programs) > 0 then d.programs
       else coalesce(p.programs, '{}') end          as programs,
  coalesce(d.authority, p.authority)                as authority,
  coalesce(d.source_type, p.source_type)            as source_type,
  d.title, d.canonical_url, d.requested_url, d.format, d.status, d.parse_error,
  d.publisher_revision, d.effective_on, d.retrieved_at, d.content_hash,
  d.chunk_count, d.char_count, d.created_at, d.last_checked, d.added_by,
  (select count(*) from kb_document_knowledge k where k.document_id = d.id) as verified_count
from kb_source_documents d
left join kb_publications p on p.id = d.publication_id;

-- Check after running:
-- select id, title, programs from kb_source_documents order by id;
