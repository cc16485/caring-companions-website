-- =============================================================================
-- Remove the sources Claude created during testing
-- =============================================================================
-- These were added by me while building and verifying the Source Library, not
-- by Samantha. They should not sit in her library looking like company material.
--
-- Matched by exact title rather than by id, so re-running cannot delete
-- anything she added later that happens to occupy the same id.
--
-- Chunks and knowledge links cascade automatically.
-- Deletes nothing else. Re-runnable.
-- =============================================================================

delete from kb_source_documents
 where title in (
   'Multi-program write test',              -- my write test
   'Diagnostic',                            -- my write test
   'Scanned manual (no text layer)',        -- my deliberate error-path test
   'Caring Companions Communication SOP',   -- I ingested this from her Desktop without being asked
   'CDS Policy Clarification Questions'     -- the DHSS page I added during acceptance testing
 );

-- The publication record I created alongside the DHSS page. Only removed if no
-- documents still belong to it, so nothing is orphaned by accident.
delete from kb_publications p
 where p.title = 'Missouri DHSS Home and Community Based Services Policy Manual'
   and not exists (select 1 from kb_source_documents d where d.publication_id = p.id);

-- DELIBERATELY LEFT ALONE: anything Samantha added herself, including the
-- MO Medicaid Personal Care Provider Manual that ingested badly as a .docx.
-- That one is hers to keep or remove, and deleting a source someone added
-- without being asked is exactly the behaviour this file is correcting.

-- Check after running:
-- select id, title, status, chunk_count from kb_source_documents order by id;
