-- =============================================================================
-- 011 — app_data: REMOVE WHAT NOTHING USES
-- =============================================================================
-- REVISED after inspection. The first version of this file tried to reduce
-- `authenticated` to SELECT, INSERT, UPDATE. That would have broken the hub:
--
--   delete_app_data_item is SECURITY INVOKER
--
-- so it deletes using the CALLER's privileges. Take DELETE away from
-- `authenticated` and every deletion in the hub stops working. The migration
-- checked before acting and refused, which is why nothing broke.
--
-- WHAT THIS DOES INSTEAD — the part that is provably safe today:
--   revoke TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
--   keep    SELECT, INSERT, UPDATE, DELETE
--
-- Traced in the deployed file at cc.mo-care.com, the hub uses .select() and
-- one .upsert(). It never issues TRUNCATE, never creates a trigger on this
-- table, never points a foreign key at it, and never vacuums it. Removing
-- those four cannot break a working feature. Removing DELETE demonstrably
-- would.
--
-- WHY TRUNCATE IS THE ONE THAT MATTERS MOST:
-- row level security does not apply to it. Whatever the policies on app_data
-- say, TRUNCATE empties all 50 keys and no policy is consulted. DELETE, by
-- contrast, is filtered by RLS row by row, so what a signed-in browser can
-- delete is bounded by the policy. Those are different sizes of risk and this
-- removes the unbounded one.
--
-- STILL OPEN, deliberately: whether to convert delete_app_data_item to
-- SECURITY DEFINER and then remove DELETE too. That needs its source and
-- app_data's RLS policies read first, because making a function definer also
-- makes it bypass RLS.
-- =============================================================================

do $$
declare bad text := '';
begin
  -- Nothing about this change should depend on a function's security mode,
  -- but assert what we believe anyway so a surprise stops the migration.
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='upsert_app_data_item') then
    raise exception 'upsert_app_data_item is missing. That is the hub''s save path.';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='delete_app_data_item') then
    raise exception 'delete_app_data_item is missing.';
  end if;
end $$;

-- Named individually rather than "revoke all then grant back", so that DELETE
-- is never momentarily absent. This runs in one transaction, but a migration
-- that reads as "take everything, give some back" invites somebody to copy it
-- to a table where the give-back is wrong.
revoke truncate  on public.app_data from authenticated;
revoke references on public.app_data from authenticated;
revoke trigger   on public.app_data from authenticated;

-- MAINTAIN only exists on PostgreSQL 17 and later. Skipped silently elsewhere.
do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'revoke maintain on public.app_data from authenticated';
    execute 'revoke maintain on public.app_data from anon';
  end if;
end $$;

-- anon holds MAINTAIN and nothing else; it is removed above where supported.
-- service_role is not touched: it never reaches a browser.


-- ── PROVE IT ────────────────────────────────────────────────────────────────
do $$
declare bad text := '';
begin
  foreach bad in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if not has_table_privilege('authenticated','public.app_data',bad) then
      raise exception 'app_data lost %, which the hub needs.', bad;
    end if;
  end loop;
  bad := '';
  if has_table_privilege('authenticated','public.app_data','TRUNCATE') then
    bad := bad || 'TRUNCATE '; end if;
  if has_table_privilege('authenticated','public.app_data','REFERENCES') then
    bad := bad || 'REFERENCES '; end if;
  if has_table_privilege('authenticated','public.app_data','TRIGGER') then
    bad := bad || 'TRIGGER '; end if;
  if bad <> '' then
    raise exception 'app_data still grants: %', bad;
  end if;
  raise notice 'PASS: app_data keeps SELECT, INSERT, UPDATE, DELETE and nothing else.';
end $$;
