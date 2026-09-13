-- =============================================================================
-- 016 — A KEY NOBODY MAPPED IS DENIED, NOT SHARED
-- =============================================================================
-- Until now can_access_data_key returned TRUE for any key with no map row.
-- That was the right default while keys were being traced: an unmapped key
-- behaved as it always had, so mapping work could not lock anyone out.
--
-- Every real key is now mapped deliberately, so the default can stop being
-- generous. Without this, the next person to add a key and forget the map row
-- recreates the same class of problem the July incident was.
--
-- ONE BRANCH IS REMOVED:
--     or not exists (select 1 from app_data_key_hub_map where data_key = k)
--
-- WHAT IS DELIBERATELY LEFT ALONE:
--   jwt_hub_access() is null  ->  still allowed everything.
--   That branch exists because a signed-in user with no hub_access claim
--   predates the hub list. It is NOT made fail-closed here because doing so
--   would lock out any such account instantly, and that deserves its own
--   decision with its own verification. It is reported, not changed.
--
-- ROLLBACK — restores the previous behaviour exactly:
--
--   create or replace function public.can_access_data_key(k text)
--   returns boolean language sql stable security definer
--   set search_path = pg_catalog, public as $r$
--     select public.jwt_hub_access() is null
--       or not exists (select 1 from public.app_data_key_hub_map m where m.data_key = k)
--       or exists (select 1 from public.app_data_key_hub_map m
--                   where m.data_key = k and public.jwt_hub_access() ? m.hub_slug);
--   $r$;
-- =============================================================================

-- Refuse to tighten the default while any real key would be caught by it.
do $$
declare orphan text;
begin
  select string_agg(a.key, ', ') into orphan
    from public.app_data a
   where not exists (select 1 from public.app_data_key_hub_map m where m.data_key = a.key);
  if orphan is not null then
    raise exception 'These keys have no map row and would become unreachable: %', orphan;
  end if;
  raise notice 'every existing app_data key is mapped; safe to close the default.';
end $$;

create or replace function public.can_access_data_key(k text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $fn$
  select
    public.jwt_hub_access() is null
    or exists (
      select 1 from public.app_data_key_hub_map m
      where m.data_key = k
        and public.jwt_hub_access() ? m.hub_slug
    );
$fn$;

do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname='can_access_data_key' and p.prosecdef) then
    raise exception 'can_access_data_key lost SECURITY DEFINER.';
  end if;
  raise notice 'unmapped keys now fail closed.';
end $$;
