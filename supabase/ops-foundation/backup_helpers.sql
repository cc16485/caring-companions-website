-- =============================================================================
-- BACKUP HELPERS — applied by "Fix the Backup System.command"
-- =============================================================================
-- NOT part of the operating foundation. Kept beside it because it is the thing
-- that makes the foundation recoverable, and because a helper nobody can find
-- is a helper nobody maintains.
--
-- Both functions are service-role only. Neither writes to a production table.
--
-- The drops below are not tidiness. `create or replace function` refuses to
-- change a function's return type, so adding order_col to backup_table_list
-- fails with 42P13 against an already-installed version. Dropping first makes
-- this file re-runnable no matter which version is already there, which is the
-- property the whole installer depends on. Nothing in the database depends on
-- these functions; they are called at run time by an edge function.
-- =============================================================================

drop function if exists public.backup_table_list();
drop function if exists public.backup_row_counts();
drop function if exists public.backup_restore_candidates();
drop function if exists public.backup_restore_test(text, jsonb);


-- ── What tables exist, asked at run time ────────────────────────────────────
-- The backup used to carry a hardcoded list of three tables out of fifty-one.
-- A list somebody has to remember to update is a list that goes stale silently,
-- which is exactly what happened to Core knowledge and the recruiting tables.
-- order_col matters more than it looks. Paging through a table with no ORDER BY
-- lets the server return rows in any order it likes on each request, so pages
-- can overlap or miss rows and the backup ends up quietly wrong. Ordering by
-- the primary key (or the first column when there is none) makes the paging
-- deterministic.
create or replace function public.backup_table_list()
returns table (table_name text, est_rows bigint, order_col text)
language sql stable security definer set search_path = pg_catalog, public as $fn$
  select c.relname::text, c.reltuples::bigint,
         coalesce(
           (select a.attname::text
              from pg_index i
              join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
             where i.indrelid = c.oid and i.indisprimary
             order by a.attnum limit 1),
           (select a2.attname::text
              from pg_attribute a2
             where a2.attrelid = c.oid and a2.attnum > 0 and not a2.attisdropped
             order by a2.attnum limit 1))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
   order by c.relname;
$fn$;
revoke all on function public.backup_table_list() from public;
grant execute on function public.backup_table_list() to service_role;


-- ── Exact row counts, for the completeness audit ────────────────────────────
-- reltuples is an estimate and will happily agree with a truncated backup.
-- This is count(*), which will not.
create or replace function public.backup_row_counts()
returns table (table_name text, n bigint)
language plpgsql stable security definer set search_path = pg_catalog, public as $fn$
declare r record; c bigint;
begin
  for r in select cl.relname from pg_class cl
             join pg_namespace ns on ns.oid = cl.relnamespace
            where ns.nspname = 'public' and cl.relkind = 'r' order by cl.relname
  loop
    execute format('select count(*) from public.%I', r.relname) into c;
    table_name := r.relname; n := c; return next;
  end loop;
end $fn$;
revoke all on function public.backup_row_counts() from public;
grant execute on function public.backup_row_counts() to service_role;


-- ── Restore proof ───────────────────────────────────────────────────────────
-- Rebuilds a backup file into a TEMP table and compares it against the live
-- table. Proves the file is a restore point rather than merely a file.
--
-- WHY TEMP AND NOT A SCRATCH SCHEMA: `on commit drop` means Postgres removes it
-- when the transaction ends, whatever happens. There is no cleanup step that
-- can be skipped, and nothing is left behind if this dies halfway. It also
-- makes it structurally impossible for this to touch a production row: a temp
-- table cannot shadow public.<table> when every reference is schema-qualified.
--
-- The content hash is order-independent (per-row hashes, sorted, then hashed)
-- so it does not depend on knowing a primary key, and works for any table.
create or replace function public.backup_restore_test(p_table text, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare
  live_n bigint;  rest_n bigint;
  live_h text;    rest_h text;
  col    record;
  lh     text;    rh     text;
  diffs  text[] := '{}';
begin
  if to_regclass('public.' || quote_ident(p_table)) is null then
    return jsonb_build_object('table', p_table, 'error', 'no such table');
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('table', p_table, 'error', 'backup file is not a JSON array');
  end if;

  execute 'drop table if exists pg_temp._restore_probe';
  execute format(
    'create temp table _restore_probe on commit drop as
       select * from jsonb_populate_recordset(null::public.%I, $1)', p_table)
    using p_rows;

  execute format(
    'select count(*), md5(coalesce(string_agg(h, '''' order by h), ''''))
       from (select md5(to_jsonb(t)::text) as h from public.%I t) s', p_table)
    into live_n, live_h;

  execute
    'select count(*), md5(coalesce(string_agg(h, '''' order by h), ''''))
       from (select md5(to_jsonb(t)::text) as h from pg_temp._restore_probe t) s'
    into rest_n, rest_h;

  -- Only when they differ. "The hash did not match" is not something anyone
  -- can act on; the name of the column that drifted is.
  if live_h is distinct from rest_h then
    for col in
      select column_name from information_schema.columns
       where table_schema = 'public' and table_name = p_table
       order by ordinal_position
    loop
      execute format(
        'select md5(coalesce(string_agg(v, '''' order by v), '''')) from
           (select md5(coalesce(%I::text, ''<null>'')) as v from public.%I) s',
        col.column_name, p_table) into lh;
      execute format(
        'select md5(coalesce(string_agg(v, '''' order by v), '''')) from
           (select md5(coalesce(%I::text, ''<null>'')) as v from pg_temp._restore_probe) s',
        col.column_name) into rh;
      if lh is distinct from rh then diffs := diffs || col.column_name; end if;
    end loop;
  end if;

  return jsonb_build_object(
    'table',               p_table,
    'live_rows',           live_n,
    'restored_rows',       rest_n,
    'rows_match',          live_n = rest_n,
    'live_hash',           left(live_h, 12),
    'restored_hash',       left(rest_h, 12),
    'content_match',       live_h is not distinct from rest_h,
    'columns_that_differ', to_jsonb(diffs));
end $fn$;
revoke all on function public.backup_restore_test(text, jsonb) from public;
grant execute on function public.backup_restore_test(text, jsonb) to service_role;


-- ── Which tables are safe to prove a restore with ───────────────────────────
-- A false failure here would wrongly block the build, so the choice is a stated
-- rule rather than a guess. Columns of type json, numeric, money or bytea can
-- differ after a JSON round trip for reasons that are about serialisation, not
-- about the backup, so tables containing them are not used as the PROOF. They
-- are still backed up; they are just not what we prove the mechanism on.
create or replace function public.backup_restore_candidates()
returns table (table_name text, est_rows bigint)
language sql stable security definer set search_path = pg_catalog, public as $fn$
  select c.relname::text, c.reltuples::bigint
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname <> 'app_data'
     and c.reltuples > 0
     and not exists (
       select 1 from information_schema.columns col
        where col.table_schema = 'public' and col.table_name = c.relname
          and col.data_type in ('json', 'numeric', 'money', 'bytea', 'USER-DEFINED'))
   order by c.reltuples desc;
$fn$;
revoke all on function public.backup_restore_candidates() from public;
grant execute on function public.backup_restore_candidates() to service_role;

notify pgrst, 'reload schema';
