-- =============================================================================
-- Caring Companions Core — sequence grants
-- =============================================================================
-- FIXES: "permission denied for sequence kb_source_documents_id_seq" (42501)
--
-- Cause: a `bigserial` column creates a sequence, and inserting requires USAGE
-- on that sequence as well as INSERT on the table. The kb_ tables were created
-- after this project's default privileges were set, so the new sequences were
-- never granted. The table insert was permitted; generating the id was not.
--
-- This is why kb_items always worked: its primary key is `text`, so it has no
-- sequence. Every bigserial table has been silently failing to write, including
-- kb_answer_log, which means Cara's audit log has been recording nothing. The
-- log write is fire-and-forget by design, so nothing surfaced.
--
-- SCOPE: named kb_ sequences only. No blanket grant across the schema, because
-- this project is shared by three hubs and a wildcard would touch their objects
-- too. Grants nothing on any table, changes no RLS, adds no policy.
-- Safe to re-run.
-- =============================================================================

do $$
declare s record;
begin
  for s in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S' and c.relname like 'kb\_%'
  loop
    execute format('grant usage, select on sequence public.%I to service_role', s.relname);
    raise notice 'granted on sequence %', s.relname;
  end loop;
end $$;

-- Future kb_ tables should inherit it rather than needing another migration.
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Check after running. Should list every kb_ sequence with service_role usage:
--   select c.relname,
--          has_sequence_privilege('service_role', c.oid, 'USAGE') as service_role_usage
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname='public' and c.relkind='S' and c.relname like 'kb\_%'
--   order by 1;
