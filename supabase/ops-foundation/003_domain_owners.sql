-- =============================================================================
-- DOMAIN OWNERS — who actually holds each of the eight, today
-- =============================================================================
-- These are CURRENT owners, not job definitions. Six of the eight are Krystal,
-- which is not a modelling artefact: it is the operating model's "no legitimate
-- backup anywhere" finding written down as data. It should look like that on
-- screen until it stops being true.
--
-- Four are explicitly temporary and move when people start:
--   scheduling_coverage    -> the VA, once trained
--   caregiver_performance  -> Cierra, once she starts and the role is confirmed
--   recruiting_orientation -> Cierra and Angiel, as they are trained
--   training_compliance    -> later
--
-- Changing an owner is one UPDATE. Future and unclaimed work follows it;
-- work somebody has already claimed does not move.
--
-- Escalation is Samantha everywhere, because that is the truth today rather
-- than an aspiration. Backups stay NULL rather than being invented.
-- =============================================================================

do $$
declare
  krystal uuid;
  samantha uuid;
begin
  select person_id into krystal  from persons where lower(primary_email)='krystal@mo-care.com';
  select person_id into samantha from persons where lower(primary_email)='samantha@mo-care.com';

  if krystal is null or samantha is null then
    raise exception 'Missing person rows. Run the identity seeder first.';
  end if;

  -- Krystal, for now. Every one of these is a current fact, not a plan.
  update domains set owner_person = krystal, escalation_person = samantha
   where entity = 'cc_ihs'
     and code in ('family_enquiries','scheduling_coverage','client_care',
                  'caregiver_performance','recruiting_orientation','training_compliance');

  -- Samantha's own, and hers for the foreseeable future.
  update domains set owner_person = samantha, escalation_person = samantha
   where entity = 'cc_ihs'
     and code in ('program_administration','money');
end $$;


-- ── The front door ──────────────────────────────────────────────────────────
-- Where a missed call goes when we cannot tell what it is about.
--
-- IT IS A PERSON, NOT A DOMAIN, AND THAT IS THE POINT. Krystal rings unknown
-- callers back. That does NOT make an unknown call part of Client Care; it
-- means she is the person responsible for finding out what it is. The domain
-- stays null until somebody rings back and knows.
--
-- Stored as a role rather than a name so it moves without a deploy when Angiel
-- or the VA starts taking the phones.
create table if not exists ops_routing (
  key        text primary key,
  person_id  uuid references persons(person_id),
  note       text,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table ops_routing enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='ops_routing' and policyname='ops_routing_read') then
    create policy ops_routing_read on ops_routing for select to authenticated using (true);
  end if;
end $$;
grant select on ops_routing to authenticated, service_role;

insert into ops_routing (key, person_id, note)
select 'front_door', person_id,
       'Rings back missed calls we cannot classify. Owner of the callback, '
       'not evidence of a domain.'
  from persons where lower(primary_email) = 'krystal@mo-care.com'
on conflict (key) do nothing;

notify pgrst, 'reload schema';
