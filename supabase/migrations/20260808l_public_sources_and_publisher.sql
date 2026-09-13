-- =============================================================================
-- Caring Companions Core — public sources, and a publisher on the document
-- =============================================================================
-- Two fixes, both found by the CDS eligibility dry run.
--
-- 1. SENSITIVITY. Migration 20260808k defaulted every source to `internal`,
--    which is the right default for something nobody has classified. The
--    consequence only became visible when extraction ran: the candidate guard
--    correctly refuses to let anything from a closely held source become
--    family-facing, so every answer extracted from the Missouri manuals,
--    including "you must be at least eighteen", was forced to internal. Cara
--    could never have used any of it.
--
--    A published state manual is not confidential. Reclassifying the SOURCE
--    says only that: it is public material. It does NOT make the knowledge
--    extracted from it public. Audience is still decided per record on the
--    merits of the content, and a public manual can still yield internal-only
--    operational knowledge, which is exactly what the dry run produced.
--
--    Only hosts that positively identify publicly published authoritative
--    material are listed. Application portals, sign-on pages and survey forms
--    are NOT reclassified even though they sit on state domains, because a
--    login screen is not published material. Anything without a URL is left
--    alone: it cannot be positively identified, and guessing is how a
--    confidential document ends up marked public.
--
-- 2. PUBLISHER. kb_source_documents had no publisher column at all; publisher
--    lived only on kb_publications. A document added without a publication
--    therefore showed publisher NULL forever, however carefully it was typed
--    into the add form. 59 of 60 documents are in that state.
--
-- Additive. Idempotent. Touches no kb_items.
-- =============================================================================

alter table kb_source_documents
  add column if not exists publisher text;

comment on column kb_source_documents.publisher is
  'Who published THIS document. Falls back to the publication''s publisher when null, the same way program, authority and source_type do.';


-- ── 1. Publicly published authoritative sources ─────────────────────────────
-- Listed host by host so the decision is reviewable rather than a pattern
-- match on ".gov" that would sweep in portals and forms.
update kb_source_documents
   set sensitivity = 'public'
 where sensitivity <> 'public'
   and authority = 'primary'
   and coalesce(doc_role, 'reference') = 'reference'
   and approval_state is null                    -- never a draft
   and canonical_url is not null
   and (
        canonical_url like 'https://health.mo.gov/%'      -- Missouri DHSS
     or canonical_url like 'https://mydss.mo.gov/%'       -- Missouri DSS / MO HealthNet
     or canonical_url like 'https://revisor.mo.gov/%'     -- Revised Statutes of Missouri
     or canonical_url like 'https://www.sos.mo.gov/%'     -- Code of State Regulations
     or canonical_url like 'https://mmac.mo.gov/%'        -- Medicaid Audit and Compliance
     or canonical_url like 'https://dssmanuals.mo.gov/%'  -- DSS online manuals
   );

-- Deliberately NOT reclassified, and why:
--   hcbsfusion.health.mo.gov      a sign-on page, not published material
--   modhss.entellitrak.com        an application portal
--   redcaphcbs1.azurewebsites.net a survey form on third-party hosting
--   any document with no URL       cannot be positively identified
--   any company document          covered by approval_state, never swept here


-- ── 2. Publisher, from the host that positively identifies it ───────────────
update kb_source_documents set publisher = case
    when canonical_url like 'https://health.mo.gov/%'          then 'Missouri DHSS'
    when canonical_url like 'https://hcbsfusion.health.mo.gov/%' then 'Missouri DHSS'
    when canonical_url like 'https://modhss.entellitrak.com/%' then 'Missouri DHSS'
    when canonical_url like 'https://mydss.mo.gov/%'           then 'Missouri DSS'
    when canonical_url like 'https://dssmanuals.mo.gov/%'      then 'Missouri DSS'
    when canonical_url like 'https://revisor.mo.gov/%'         then 'Missouri Revisor of Statutes'
    when canonical_url like 'https://www.sos.mo.gov/%'         then 'Missouri Secretary of State'
    when canonical_url like 'https://mmac.mo.gov/%'            then 'Missouri Medicaid Audit and Compliance'
  end
 where publisher is null
   and canonical_url is not null
   and ( canonical_url like 'https://health.mo.gov/%'
      or canonical_url like 'https://hcbsfusion.health.mo.gov/%'
      or canonical_url like 'https://modhss.entellitrak.com/%'
      or canonical_url like 'https://mydss.mo.gov/%'
      or canonical_url like 'https://dssmanuals.mo.gov/%'
      or canonical_url like 'https://revisor.mo.gov/%'
      or canonical_url like 'https://www.sos.mo.gov/%'
      or canonical_url like 'https://mmac.mo.gov/%' );

-- Company documents name themselves.
update kb_source_documents
   set publisher = 'Caring Companions'
 where publisher is null and authority = 'company';


-- ── Library view: document publisher wins, publication is the fallback ──────
drop view if exists kb_source_library;

create view kb_source_library as
select
  d.id, d.publication_id, p.title as publication_title,
  coalesce(d.publisher, p.publisher)                as publisher,
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
--   select sensitivity, count(*) from kb_source_library group by 1;
--   select publisher, count(*) from kb_source_library group by 1 order by 2 desc;
--   select id, title from kb_source_library where publisher is null;
