-- =============================================================================
-- Caring Companions Core — show provenance in the library view
-- =============================================================================
-- 20260808m added `ingest_origin` and `provenance_note` to kb_source_documents
-- and never added them to kb_source_library. The columns were being written and
-- were invisible to every caller, which read exactly like they were not being
-- written at all.
--
-- That matters more here than a missing column usually would. The whole point
-- of the provenance work is that a person can see the difference between the
-- official publication and the artifact Core actually holds. A view that hides
-- `ingest_origin` hides precisely the thing the work was for.
--
-- Additive. View rebuild only. Touches no data.
-- =============================================================================

drop view if exists kb_source_library;

create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title,
  coalesce(d.publisher, p.publisher)                as publisher,
  p.official_url                                    as publication_url,
  p.published_on                                    as publication_date,
  p.public_availability,
  coalesce(d.program, p.program)                    as program,
  case when cardinality(d.programs) > 0 then d.programs
       else coalesce(p.programs, '{}') end          as programs,
  coalesce(d.authority, p.authority)                as authority,
  coalesce(d.doc_role, p.doc_role, 'reference')     as doc_role,
  coalesce(d.approval_state, p.approval_state)      as approval_state,
  d.sensitivity,
  -- The two that were missing.
  d.ingest_origin,
  d.provenance_note,
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

-- PostgREST keeps a schema cache. Without this, the rebuilt view is correct in
-- the database and the API keeps returning the old column list, which looks
-- exactly like the migration never ran.
notify pgrst, 'reload schema';

-- Check after running:
--   select id, ingest_origin, publication_date, left(provenance_note,60)
--     from kb_source_library where id = 9;
