-- =============================================================================
-- 015 — THE admin.html MAPPING GAP
-- =============================================================================
-- hub.mo-care.com/admin.html is a Team Hub page, and it reads and writes five
-- keys that are mapped only to care_coordinator (and staffing). It was missed
-- in the original trace because it addresses app_data through a variable —
-- readKey(key), saveItem(key) — so a literal-key search found nothing and the
-- page silently dropped out of the ten-page verification.
--
-- Nothing is broken today: all three accounts hold all three slugs, so they
-- reach these keys through care_coordinator. It breaks the moment anybody is
-- scoped to team_hub only, and it breaks by going blank rather than erroring.
--
-- This ADDS rows. It removes nothing, so no existing access changes.
-- =============================================================================

insert into public.app_data_key_hub_map (data_key, hub_slug) values
  ('coordinator_staff','team_hub'),
  ('on_call_schedule','team_hub'),
  ('ops_settings','team_hub'),
  ('ops_items','team_hub'),
  ('cc_hub_config','team_hub')
on conflict (data_key, hub_slug) do nothing;

do $$
declare missing text;
begin
  select string_agg(k, ', ') into missing from unnest(array[
    'coordinator_staff','on_call_schedule','ops_settings','ops_items','cc_hub_config']) k
   where not exists (select 1 from public.app_data_key_hub_map m
                      where m.data_key = k and m.hub_slug = 'team_hub');
  if missing is not null then
    raise exception 'admin.html keys still not readable by team_hub: %', missing;
  end if;
  raise notice 'admin.html can now be served to a team_hub-only user.';
end $$;
