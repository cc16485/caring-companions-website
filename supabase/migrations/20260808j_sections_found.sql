-- =============================================================================
-- Caring Companions Core — record when a document was larger than we stored
-- =============================================================================
-- `add_doc` keeps at most 600 sections per document. That limit is fine and
-- should stay, but until now it was invisible: a manual that split into 900
-- sections was saved with chunk_count = 600 and status 'indexed', which reads
-- as "Core has all of this" and is not true.
--
-- A silent cap is the worst kind of gap, because the screen showing it looks
-- like coverage. So the true count is recorded next to the stored count, and
-- the library can say when they differ.
--
-- Additive. One nullable column and a view rebuild. Safe to re-run.
-- =============================================================================

alter table kb_source_documents
  add column if not exists sections_found int;

comment on column kb_source_documents.sections_found is
  'How many sections the document actually split into. chunk_count is how many were stored. When sections_found is larger, the document was truncated and the library must say so. NULL means it predates this column, not that nothing was dropped.';

-- Backfill the honest default: for everything already indexed, the count we
-- stored is the only count we know. This does NOT claim nothing was dropped,
-- it records that we cannot tell for rows written before the column existed.
-- Left NULL on purpose rather than copied from chunk_count, which would assert
-- something we did not measure.

-- ── Library view: expose it, and the derived "was anything dropped" ──────────
-- Dropped in reverse dependency order first. Nothing reads kb_source_library,
-- but the same 42P16 rule from 20260808d/f applies: the installer re-runs every
-- migration, and a view definition cannot gain a column in the middle.
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
  d.chunk_count, d.char_count, d.sections_found,
  (d.sections_found is not null and d.sections_found > d.chunk_count) as truncated,
  coalesce(d.sections_found - d.chunk_count, 0)     as sections_dropped,
  d.created_at, d.last_checked, d.added_by,
  (select count(*) from kb_document_knowledge k where k.document_id = d.id) as verified_count,
  (select count(*) from kb_dependencies dp where dp.document_id = d.id)     as claims_tracked,
  (select count(*) from kb_dependencies dp
     where dp.document_id = d.id and dp.status = 'needs_review')            as claims_needing_review
from kb_source_documents d
left join kb_publications p on p.id = d.publication_id;

-- Check after running:
--   select id, title, chunk_count, sections_found, truncated from kb_source_library
--    where truncated order by sections_dropped desc;
