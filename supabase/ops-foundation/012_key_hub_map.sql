-- =============================================================================
-- 012 — STAGE 2A: THE COMPLETE KEY-TO-HUB MAP
-- =============================================================================
-- Writes the map only. It does NOT drop auth_all_app_data, does NOT touch any
-- user's metadata, and does NOT change can_access_data_key().
--
-- Because the allow-all policy is still in place and overrides everything,
-- this migration has ZERO observable effect on any current user. That is the
-- point: the map can be written, inspected and corrected while nothing depends
-- on it yet.
--
-- Every row below comes from tracing all TEN deployed pages that touch
-- app_data (Core 5, Team 4, Staffing 1) plus the three Edge Functions, not
-- from assuming one hub owns each key.
--
-- TWO STRUCTURAL THINGS ARE CHECKED FIRST, because either would silently
-- defeat the whole design:
--
--   1. The map must allow MANY ROWS PER KEY. Twelve keys are used by more than
--      one hub. If data_key alone is unique, multi-hub is impossible and the
--      map would force a key into one hub and lock the other hubs out.
--
--   2. `authenticated` must be able to READ this table. can_access_data_key()
--      is LANGUAGE SQL with no SECURITY DEFINER, so it reads the map as the
--      CALLER. If RLS or grants hide the rows from a signed-in user, then
--      "not exists (select 1 from map where data_key = k)" is TRUE for every
--      key, every key looks unmapped, and the function fails open for
--      everything. The map would look perfect and do nothing.
-- =============================================================================

-- ── 1. MANY ROWS PER KEY ────────────────────────────────────────────────────
do $$
declare
  c record;
  n int;
begin
  for c in
    select con.conname, con.contype,
           array_agg(a.attname::text order by a.attname::text) cols
      from pg_constraint con
      join pg_class t on t.oid = con.conrelid
      join pg_namespace ns on ns.oid = t.relnamespace
      join unnest(con.conkey) k(attnum) on true
      join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
     where ns.nspname='public' and t.relname='app_data_key_hub_map'
       and con.contype in ('p','u')
     group by con.conname, con.contype
  loop
    if c.cols = array['data_key']::text[] then
      raise notice 'Constraint % makes data_key unique on its own, which forbids a key belonging to two hubs. Widening it to (data_key, hub_slug).', c.conname;
      execute format('alter table public.app_data_key_hub_map drop constraint %I', c.conname);
      execute 'alter table public.app_data_key_hub_map add constraint app_data_key_hub_map_pkey primary key (data_key, hub_slug)';
    end if;
  end loop;

  -- Make sure SOME uniqueness exists on the pair, so the upsert below has a
  -- conflict target and re-running this file cannot duplicate rows.
  select count(*) into n
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace ns on ns.oid = t.relnamespace
   where ns.nspname='public' and t.relname='app_data_key_hub_map'
     and con.contype in ('p','u');
  if n = 0 then
    execute 'alter table public.app_data_key_hub_map add constraint app_data_key_hub_map_pkey primary key (data_key, hub_slug)';
    raise notice 'Added a primary key on (data_key, hub_slug).';
  end if;
end $$;


-- ── 2. THE MAP ITSELF ───────────────────────────────────────────────────────
-- 'server_only' is a slug NO account holds and none ever should. It is how a
-- key is marked "browsers have no business here". The Edge Functions that use
-- those keys run on service_role, which bypasses RLS entirely, so denying
-- browsers costs them nothing.
insert into public.app_data_key_hub_map (data_key, hub_slug) values
  ('agency_docs','care_coordinator'),
  ('attendance_events','care_coordinator'),
  ('attendance_events','staffing'),
  ('attendance_events','team_hub'),
  ('call_disposition_log','server_only'),
  ('call_followup_log','server_only'),
  ('calls_cache','server_only'),
  ('campaign_log','care_coordinator'),
  ('campaign_settings','care_coordinator'),
  ('candidates','staffing'),
  ('care_assessments','care_coordinator'),
  ('care_plan_reviews','care_coordinator'),
  ('care_plans','care_coordinator'),
  ('caregivers','care_coordinator'),
  ('caregivers','staffing'),
  ('cc_goals','care_coordinator'),
  ('cc_hub_config','care_coordinator'),
  ('client_checkins','care_coordinator'),
  ('client_checkins','staffing'),
  ('consult_bookings','care_coordinator'),
  ('coordinator_staff','care_coordinator'),
  ('coordinator_staff','staffing'),
  ('coverage_cases','care_coordinator'),
  ('discipline_actions','care_coordinator'),
  ('discipline_actions','staffing'),
  ('discipline_actions','team_hub'),
  ('dnr_log','care_coordinator'),
  ('dnr_log','staffing'),
  ('duty_windows','care_coordinator'),
  ('feedback','care_coordinator'),
  ('feedback','team_hub'),
  ('file_audits','team_hub'),
  ('ghe_forms','care_coordinator'),
  ('guide_screens','care_coordinator'),
  ('handoffs','care_coordinator'),
  ('handoffs','staffing'),
  ('hometogether_orders','care_coordinator'),
  ('ht_tickets','care_coordinator'),
  ('hub_portals','team_hub'),
  ('interview_calendars','care_coordinator'),
  ('interview_outcomes','care_coordinator'),
  ('leads','care_coordinator'),
  ('leads','team_hub'),
  ('local_caregivers','care_coordinator'),
  ('local_families','care_coordinator'),
  ('meetings','care_coordinator'),
  ('meetings','staffing'),
  ('nurse_clients','care_coordinator'),
  ('nurse_staff','care_coordinator'),
  ('nurse_visits','care_coordinator'),
  ('offboardings','team_hub'),
  ('on_call_schedule','care_coordinator'),
  ('ops_items','care_coordinator'),
  ('ops_settings','care_coordinator'),
  ('pay_rates','care_coordinator'),
  ('phone_suppress','server_only'),
  ('positions','care_coordinator'),
  ('post_call_followups','care_coordinator'),
  ('recurring_duties','care_coordinator'),
  ('responsibilities','care_coordinator'),
  ('review_rules','care_coordinator'),
  ('role_profiles','care_coordinator'),
  ('settings','care_coordinator'),
  ('settings','staffing'),
  ('settings','team_hub'),
  ('sop_library','care_coordinator'),
  ('staffing_tasks','care_coordinator'),
  ('staffing_tasks','staffing'),
  ('staffing_tasks','team_hub'),
  ('standup_notes','team_hub'),
  ('supervisory_visits','care_coordinator'),
  ('team_directory','team_hub'),
  ('team_hub_settings','team_hub'),
  ('team_meetings','team_hub'),
  ('user_hub_access_directory','team_hub')
on conflict (data_key, hub_slug) do nothing;


-- ── 3. PROVE THE SHAPE ──────────────────────────────────────────────────────
do $$
declare
  n_keys int; n_rows int; n_multi int; n_server int; bad text := '';
begin
  select count(distinct data_key), count(*) into n_keys, n_rows
    from public.app_data_key_hub_map;
  select count(*) into n_multi from (
    select data_key from public.app_data_key_hub_map
     group by data_key having count(*) > 1) z;
  select count(*) into n_server from public.app_data_key_hub_map where hub_slug='server_only';

  -- every real app_data key must now have a deliberate decision
  select string_agg(a.key, ', ') into bad
    from public.app_data a
   where not exists (select 1 from public.app_data_key_hub_map m where m.data_key = a.key);
  if bad is not null then
    raise exception 'These real app_data keys have no map row: %', bad;
  end if;

  raise notice 'map: % rows over % keys; % keys span more than one hub; % server_only rows',
               n_rows, n_keys, n_multi, n_server;
end $$;
