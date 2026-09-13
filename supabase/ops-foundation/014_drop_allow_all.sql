-- =============================================================================
-- 014 — STAGE 4A: REMOVE THE JULY 2026 ALLOW-ALL POLICY
-- =============================================================================
-- ONE STATEMENT. Nothing else belongs in this migration.
--
-- WHAT IS BEING REMOVED:
--   policy   auth_all_app_data
--   on       public.app_data
--   FOR ALL to authenticated
--   USING    true      WITH CHECK true
--   PERMISSIVE
--
-- Permissive policies are ORed. While this existed, the effective rule for a
-- signed-in user was "can_access_data_key(key) OR true", which is true. The
-- hub-scoped policy beside it had therefore never restricted anything since
-- the day it was written. An ordinary Care Coordinator could delete all 50
-- keys, including the Staffing and Team hubs' data. That was proved by doing
-- it inside a rolled-back transaction on 12 August 2026.
--
-- WHAT REMAINS AFTER THIS:
--   policy   Hub-scoped read/write
--   USING    auth.role() = 'authenticated' AND can_access_data_key(key)
--
-- PRECONDITIONS, ALL VERIFIED BEFORE THIS FILE WAS WRITTEN:
--   · all 50 real app_data keys have a deliberate map row (75 rows total)
--   · can_access_data_key is SECURITY DEFINER with a fixed search_path, so it
--     can read the map, which is otherwise invisible to authenticated
--   · six simulated personas each matched the map exactly, in both directions
--   · the caller's JWT still decides: four distinct outcomes across six claims
--
-- THE ROLLBACK, if any page loses data or saves:
--
--   create policy "auth_all_app_data" on public.app_data
--     as permissive for all to authenticated
--     using (true) with check (true);
--
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename='app_data'
                    and policyname='auth_all_app_data') then
    raise notice 'auth_all_app_data is already gone. Nothing to do.';
    return;
  end if;

  -- Refuse to leave app_data with no policy at all. Dropping the allow-all
  -- one when it is the ONLY policy would lock every user out of everything.
  if (select count(*) from pg_policies
       where schemaname='public' and tablename='app_data') < 2 then
    raise exception 'auth_all_app_data is the only policy on app_data. Dropping it would deny everyone.';
  end if;

  execute 'drop policy "auth_all_app_data" on public.app_data';
  raise notice 'auth_all_app_data dropped.';
end $$;

do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname='public' and tablename='app_data' and policyname='auth_all_app_data';
  if n <> 0 then raise exception 'The policy is still there.'; end if;
  select count(*) into n from pg_policies
   where schemaname='public' and tablename='app_data';
  raise notice 'app_data now has % policy/policies.', n;
end $$;
