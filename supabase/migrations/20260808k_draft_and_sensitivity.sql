-- =============================================================================
-- Caring Companions Core — draft status and sensitivity on a source
-- =============================================================================
-- A company SOP is not a state manual, and the difference is not only who wrote
-- it. The Onboarding SOP on the Desktop says "Draft prepared July 11 2026,
-- review, edit". It is real, it is worth Core reading, and it is NOT approved
-- company procedure. The library had nowhere to say that, so the three SOPs
-- were added with "(Draft, not approved)" in the title as a stopgap.
--
-- This makes it a field, and converts the stopgap in the same step.
--
-- Two columns only. Nothing else changes.
--
--   approval_state  is this settled, or is it someone's draft?
--   sensitivity     how closely held is it?
--
-- Both were called for in the architecture notes. `sensitivity` is deliberately
-- separate from authority and from doc_role: two documents can share a type and
-- have nothing in common in how closely they must be held.
--
-- Additive. Safe to re-run.
-- =============================================================================

alter table kb_source_documents
  add column if not exists approval_state text
    check (approval_state in ('draft','approved','superseded'));

alter table kb_source_documents
  add column if not exists sensitivity text not null default 'internal'
    check (sensitivity in ('public','internal','confidential','restricted'));

alter table kb_publications
  add column if not exists approval_state text
    check (approval_state in ('draft','approved','superseded'));

comment on column kb_source_documents.approval_state is
  'draft = written but not approved, so nothing may be promoted from it without review. approved = settled company material. NULL = not applicable, which is the correct value for an external publication: Missouri does not publish drafts to us.';
comment on column kb_source_documents.sensitivity is
  'How closely held THIS document is, independent of what kind of source it is. Defaults to internal on purpose: a document nobody has classified must not become publishable by omission.';

-- ── Convert the stopgap ──────────────────────────────────────────────────────
-- Matches on the marker rather than on hard-coded ids, so it is idempotent and
-- does not depend on what id anything happened to get.
update kb_source_documents
   set approval_state = 'draft',
       sensitivity    = 'internal',
       title          = btrim(replace(title, '(Draft, not approved)', ''))
 where title like '%(Draft, not approved)%';

-- Anything company-authored that nobody has classified is a draft until a
-- person says otherwise. Assuming the reverse is how an unreviewed document
-- becomes procedure by accident.
update kb_source_documents
   set approval_state = 'draft'
 where approval_state is null
   and coalesce(authority, '') = 'company';

-- ── Library view ─────────────────────────────────────────────────────────────
-- DROP first, for the reason recorded in 20260808d, f and j: the installer
-- re-runs every migration and a view cannot gain a column in the middle.
drop view if exists kb_source_library;

create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title, p.publisher,
  coalesce(d.program, p.program)                    as program,
  case when cardinality(d.programs) > 0 then d.programs
       else coalesce(p.programs, '{}') end          as programs,
  coalesce(d.authority, p.authority)                as authority,
  coalesce(d.doc_role, p.doc_role, 'reference')     as doc_role,
  coalesce(d.approval_state, p.approval_state)      as approval_state,
  d.sensitivity,
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
--   select id, approval_state, sensitivity, title from kb_source_library
--    where authority = 'company' order by id;
