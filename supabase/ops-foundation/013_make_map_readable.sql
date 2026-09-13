-- =============================================================================
-- 013 — MAKE THE KEY MAP ACTUALLY READABLE BY THE POLICY
-- =============================================================================
-- Found by the Stage 2A pre-check, and it invalidates the entire design if
-- left alone:
--
--   app_data_key_hub_map        RLS enabled, ZERO policies,
--                               authenticated has no SELECT
--
--   can_access_data_key(k)      LANGUAGE sql, STABLE, *SECURITY INVOKER*
--
-- The function reads the map as the CALLER. A signed-in user cannot see a
-- single row of it, so for every key:
--
--   not exists (select 1 from app_data_key_hub_map where data_key = k)  -> TRUE
--
-- and the function returns TRUE for everything. The map we just wrote is inert.
-- Dropping auth_all_app_data on top of this would produce a security model
-- that looks complete, reports clean, and restricts nobody.
--
-- TWO WAYS TO FIX IT:
--
--   A. grant SELECT on the map to authenticated and add a read policy.
--      Simple, but publishes the key-to-hub mapping to every signed-in user.
--
--   B. make can_access_data_key SECURITY DEFINER, so it reads the map as its
--      owner regardless of the caller's grants.
--
-- B is chosen. It needs no new grant and no new policy, exposes nothing extra,
-- and keeps the whole rule inside one function.
--
-- ON THE STANDING RULE "converting to DEFINER also removes its RLS check":
-- that rule exists because a definer function stops honouring the policies it
-- used to rely on. Here it relied on none — the table has zero policies, and
-- the map holds nothing but key names and hub names. There is no per-row
-- restriction being discarded, only an accidental blackout being lifted.
--
-- The BODY IS UNCHANGED. Only the security mode and search_path move.
--
-- WHILE auth_all_app_data STILL EXISTS THIS CHANGES NOTHING OBSERVABLE:
-- that policy is permissive and says USING (true), so it grants everything
-- regardless of what this function returns.
-- =============================================================================

create or replace function public.can_access_data_key(k text)
returns boolean
language sql
stable
security definer
-- Fixed, minimal, and NOT caller-controlled. pg_temp is deliberately excluded
-- so a caller cannot shadow a referenced object with a temp one. Every object
-- below is schema-qualified as well, so resolution does not depend on this
-- list at all — the setting is the belt, the qualification is the braces.
set search_path = pg_catalog, public
as $fn$
  select
    public.jwt_hub_access() is null
    or not exists (
      select 1 from public.app_data_key_hub_map m where m.data_key = k)
    or exists (
      select 1 from public.app_data_key_hub_map m
      where m.data_key = k
        and public.jwt_hub_access() ? m.hub_slug
    );
$fn$;

-- jwt_hub_access() reads auth.jwt(), which reads the request's JWT claims out
-- of a session setting, NOT out of the current role. That is why the decision
-- still follows the signed-in caller even though the table read now happens as
-- the definer. It is deliberately left exactly as it is, and the persona tests
-- exist to prove that claim rather than assert it.
--
-- EXECUTE is deliberately not changed here. The Hub-scoped policy is declared
-- TO public, so every role evaluates this function when it touches app_data;
-- narrowing EXECUTE could turn a clean 'false' into an error inside a policy.
-- Reported by the verification script instead, for a separate decision.

do $$
declare v_def boolean;
begin
  select p.prosecdef into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname='public' and p.proname='can_access_data_key';
  if not coalesce(v_def,false) then
    raise exception 'can_access_data_key is still SECURITY INVOKER.';
  end if;
  raise notice 'can_access_data_key is now security definer and can see the map.';
end $$;
