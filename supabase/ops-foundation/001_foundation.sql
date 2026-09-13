-- =============================================================================
-- OPERATING FOUNDATION — Build step 1.  Tables only.  NOTHING READS THESE YET.
-- =============================================================================
-- Project: zngsgedlsxinbygwmxwn (canonical, because it owns hub auth)
--
-- This file creates the structural seams the operating model needs and nothing
-- else. No hub file is touched by this step. No existing table is touched by
-- this step. Every statement is idempotent, so the installer can be re-run.
--
-- THE ONE RULE THIS FILE ENFORCES STRUCTURALLY:
--   Authority never bleeds between entities. Every authority row carries an
--   entity, and membership in that entity is a separate fact that has to exist
--   first. Krystal holding a role in Caring Companions cannot make her anything
--   at all in CDS, because there is no membership row to hang a role on.
--
-- WHAT IS DELIBERATELY NOT HERE (per the approved scope):
--   competency levels, duty windows, work item changes, client or caregiver
--   competency profiles. Those are later builds, gated on real data existing.
--   No person is given authority by this file. Every owner column starts NULL.
-- =============================================================================


-- ── ENTITIES ────────────────────────────────────────────────────────────────
-- The separate businesses. Operational records stay in their own systems; this
-- only names them so authority can be scoped.
create table if not exists entities (
  code       text primary key,
  label      text not null,
  active     boolean not null default true,
  sort_order int not null default 100
);

insert into entities (code, label, sort_order) values
  ('cc_ihs', 'Caring Companions In-Home Senior Care', 10),
  ('cc_cds', 'Caring Companions CDS',                 20)
on conflict (code) do nothing;
-- do nothing, never do update. A seed that updates on every install is how
-- verified records silently reset; that lesson was paid for once already.


-- ── PERSONS ─────────────────────────────────────────────────────────────────
-- One row per human being, for as long as they exist to us. Not per login, not
-- per entity, not per role. This is the record that stops one employee becoming
-- two unrelated people because they work across two companies.
create table if not exists persons (
  person_id     uuid primary key default gen_random_uuid(),
  full_name     text not null,
  primary_email text unique,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table persons is
  'One stable human identity. Never duplicated per entity or per login.';


-- ── AUTH IDENTITIES ─────────────────────────────────────────────────────────
-- A person already has more than one login: the shared hubs project and the
-- training project are separate Supabase projects with separate users, which is
-- documented as deliberate in the VA access checklist. CDS may become a third.
-- This maps a human to each of their logins without pretending they are one.
create table if not exists auth_identities (
  person_id    uuid not null references persons(person_id) on delete cascade,
  project_ref  text not null,
  auth_user_id uuid,
  login_email  text,
  created_at   timestamptz not null default now(),
  primary key (person_id, project_ref)
);

create index if not exists auth_identities_user_idx on auth_identities (auth_user_id);

comment on column auth_identities.project_ref is
  'Supabase project this login belongs to, e.g. zngsgedlsxinbygwmxwn for the shared hubs.';


-- ── ENTITY MEMBERSHIP ───────────────────────────────────────────────────────
-- ★ THE GATE. Checked before roles, always, everywhere.
--
-- can(action, entity) must return false when there is no active membership row
-- for that person and entity, regardless of what roles exist. That ordering is
-- what makes shared identity safe: adding a role row by mistake cannot grant
-- anything in an entity the person does not belong to.
create table if not exists entity_memberships (
  person_id       uuid not null references persons(person_id) on delete cascade,
  entity          text not null references entities(code),
  employment_type text,
  started_at      date,
  ended_at        date,
  active          boolean not null default true,
  primary key (person_id, entity)
);

create index if not exists entity_memberships_entity_idx
  on entity_memberships (entity) where active;


-- ── ROLES ───────────────────────────────────────────────────────────────────
-- What someone IS. Many per person, per entity.
--
-- Role is not a schedule. The hub currently uses ME.shift ('day' | 'evening' |
-- 'manager') to answer authority questions, which is why a schedule change
-- reads as a permission change. Nothing in this table is a time of day.
--
-- Role is also not authority. It describes the job; a later build adds
-- competency, which is what actually decides whether someone may act.
create table if not exists staff_roles (
  person_id  uuid not null references persons(person_id) on delete cascade,
  entity     text not null references entities(code),
  role       text not null,
  granted_at timestamptz not null default now(),
  granted_by text,
  primary key (person_id, entity, role)
);

create index if not exists staff_roles_lookup_idx on staff_roles (entity, role);


-- ── DOMAINS ─────────────────────────────────────────────────────────────────
-- Areas of work that outlive the people doing them.
--
-- Work routes to a DOMAIN, and the domain resolves the current owner. That is
-- the whole point: the week scheduling moves from Krystal to the staffing
-- coordinator, one row changes and nothing else does. Routing to a team name
-- ('to_staffing', 'to_coordinators', 'to_owners' as the hub does today) has to
-- be rewritten every time responsibility moves.
create table if not exists domains (
  entity            text not null references entities(code),
  code              text not null,
  label             text not null,
  owner_person      uuid references persons(person_id),
  backup_person     uuid references persons(person_id),
  escalation_person uuid references persons(person_id),
  active            boolean not null default true,
  sort_order        int not null default 100,
  primary key (entity, code)
);

-- The eight domains from the approved operating model.
--
-- EVERY PERSON COLUMN IS NULL, deliberately. This file names the areas of work;
-- it does not decide who holds them. Owners are set in step 2, from what is
-- true today, and only for people who actually hold the work now.
insert into domains (entity, code, label, sort_order) values
  ('cc_ihs', 'family_enquiries',       'Family enquiries and conversion',      10),
  ('cc_ihs', 'scheduling_coverage',    'Scheduling and coverage',              20),
  ('cc_ihs', 'client_care',            'Client care and family relationships', 30),
  ('cc_ihs', 'caregiver_performance',  'Caregiver performance and field quality', 40),
  ('cc_ihs', 'recruiting_orientation', 'Recruiting and orientation',           50),
  ('cc_ihs', 'training_compliance',    'Training and compliance',              60),
  ('cc_ihs', 'program_administration', 'Program administration',               70),
  ('cc_ihs', 'money',                  'Money and approvals',                  80)
on conflict (entity, code) do nothing;

comment on column domains.escalation_person is
  'Where work goes when the owner and backup cannot resolve it. Replaces the '
  'hub''s to_owners routing, which is an escalation modelled as a destination.';


-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Matches the approved visibility model: visibility is broad, authority gates
-- actions. Who works here, what roles they hold and who owns which domain are
-- exactly the things everyone should be able to see; hiding them would defeat
-- the purpose. So: any signed-in staff member may READ.
--
-- NOBODY may write from a browser. There is no insert, update or delete policy
-- on any table here, so writes are service-role only. Authority data that the
-- authorised person could edit from the console would not be authority data.
alter table entities           enable row level security;
alter table persons            enable row level security;
alter table auth_identities    enable row level security;
alter table entity_memberships enable row level security;
alter table staff_roles        enable row level security;
alter table domains            enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='entities' and policyname='entities_read') then
    create policy entities_read on entities for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='persons' and policyname='persons_read') then
    create policy persons_read on persons for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='entity_memberships' and policyname='memberships_read') then
    create policy memberships_read on entity_memberships for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='staff_roles' and policyname='roles_read') then
    create policy roles_read on staff_roles for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='domains' and policyname='domains_read') then
    create policy domains_read on domains for select to authenticated using (true);
  end if;

  -- The one exception. An identity map is not interesting to colleagues and
  -- there is no reason for the browser to read anyone else's row, so a person
  -- sees only their own. cc-ops.js needs exactly this much to answer "who am I".
  if not exists (select 1 from pg_policies where tablename='auth_identities' and policyname='auth_identities_self') then
    create policy auth_identities_self on auth_identities
      for select to authenticated using (auth_user_id = auth.uid());
  end if;
end $$;


-- ── TABLE GRANTS ────────────────────────────────────────────────────────────
-- RLS and GRANT are two different gates and BOTH have to be open.
--
-- A policy decides WHICH ROWS you may see. A grant decides whether you may
-- touch the table at all. Creating the first without the second produced
-- "permission denied for table persons" for a signed-in user, on 2026-08-10,
-- with the policies sitting there looking correct.
--
-- Supabase normally grants new public tables to authenticated by default, but
-- this project's default privileges were altered at some point (the Staffing
-- hub's notes record service_role grants being stripped and re-granted), so
-- nothing can be assumed and every grant is stated explicitly here.
--
-- SELECT ONLY. No insert, update or delete to anyone but the service role,
-- so authority data still cannot be changed from a browser.
grant usage on schema public to authenticated;
grant select on entities, persons, auth_identities,
                entity_memberships, staff_roles, domains to authenticated;

-- Edge functions run as service_role, which bypasses RLS but still needs the
-- grant. Nothing uses these tables server-side yet; granted now so a later
-- build does not fail with the same confusing message.
grant select on entities, persons, auth_identities,
                entity_memberships, staff_roles, domains to service_role;


-- ── KEEP THE API IN STEP ────────────────────────────────────────────────────
-- PostgREST caches the schema. Without this the new tables exist in the
-- database and are invisible to the client, which has happened here before and
-- looks exactly like a permissions problem.
notify pgrst, 'reload schema';
