-- =============================================================================
-- 009 — ROLE ADMINISTRATION FROM THE HUB
-- =============================================================================
-- Phase 1 moved authority onto staff_roles. Nothing could hand out a role, so
-- hiring somebody still ended at a terminal. This closes that.
--
-- THREE THINGS, DELIBERATELY SEPARATE:
--   staff_role_types   the catalog of roles that legitimately exist. The UI
--                      picks from it and this function validates against it,
--                      so a browser cannot invent 'super_admin'
--   staff_role_audit   who changed whose role, when, and from what
--   set_staff_role     the only write path, security definer, authority read
--                      from auth.uid() and never from an argument
--
-- WHY REVOKING DELETES THE ROW RATHER THAN FLAGGING IT INACTIVE:
-- five separate places ask staff_roles whether somebody is an owner — the
-- staff access view, set_domain_people, upsert_staff_person, the hub-access
-- edge function, and the hub itself. An 'active' column would mean every one
-- of them has to learn to filter it, and the one that got missed would keep
-- a former employee's permissions alive while every screen said they were
-- gone. Deleting is correct everywhere at once. History lives in the audit
-- table, which is the thing that actually wanted to be permanent.
--
-- WHAT THIS DOES NOT DO:
--   · touch confidential visibility. opsCanSee is not a role and no role
--     grants it
--   · let anybody change their own role, in either direction
--   · let the last owner who can actually sign in be demoted
--   · create or remove an auth account. Access is a separate decision
-- =============================================================================

-- ── THE CATALOG ─────────────────────────────────────────────────────────────
create table if not exists public.staff_role_types (
  role        text primary key,
  label       text not null,
  description text not null default '',
  sort        int  not null default 100,
  active      boolean not null default true
);

-- Existing identifiers are NOT renamed. Other code and data depend on
-- 'owner_admin' and 'care_coordinator'; only the display label is friendly.
insert into public.staff_role_types (role, label, description, sort) values
  ('owner_admin',         'Owner / Admin',
   'Full authority, including discipline approval, Hub access, rates and Settings.', 10),
  ('care_coordinator',    'Care Coordinator (Office Operations)',
   'Runs day-to-day office operations. Cannot approve discipline, administer Hub access, change rates or change Settings.', 20),
  ('staffing_coordinator','Staffing Coordinator',
   'Runs coverage and scheduling. PROPOSED starting authority: duty coverage only. Widen it deliberately if the job turns out to need more.', 30)
on conflict (role) do update
  set label = excluded.label,
      description = excluded.description,
      sort = excluded.sort;

alter table public.staff_role_types enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies
                  where tablename='staff_role_types' and policyname='staff_role_types_read') then
    create policy staff_role_types_read on public.staff_role_types
      for select to authenticated using (true);
  end if;
end $$;
grant select on public.staff_role_types to authenticated;


-- ── THE AUDIT ───────────────────────────────────────────────────────────────
create table if not exists public.staff_role_audit (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  actor_email   text,
  subject_email text,
  person_id     uuid,
  action        text not null check (action in ('grant','revoke')),
  role          text not null,
  note          text
);
create index if not exists staff_role_audit_person_idx
  on public.staff_role_audit (person_id, at desc);

alter table public.staff_role_audit enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies
                  where tablename='staff_role_audit' and policyname='staff_role_audit_read') then
    create policy staff_role_audit_read on public.staff_role_audit
      for select to authenticated using (true);
  end if;
end $$;
-- Read only. Every write goes through the definer function below, so the log
-- cannot be written by hand from a browser.
grant select on public.staff_role_audit to authenticated;


-- ── THE ONLY WRITE PATH ─────────────────────────────────────────────────────
-- p_role null or '' removes every role the person holds, which is what
-- offboarding wants. Otherwise the person ends up holding exactly p_role:
-- one operating persona at a time, never an accumulated pile.
drop function if exists public.set_staff_role(text, text, text);

create function public.set_staff_role(
  p_email  text,
  p_role   text,
  p_entity text default 'cc_ihs'
)
returns table (
  subject_email text,
  roles         text[],
  changed       boolean,
  message       text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $fn$
declare
  v_actor_person uuid;
  v_actor_email  text;
  v_is_owner     boolean;
  v_id           uuid;
  v_email        text := lower(trim(p_email));
  v_role         text := nullif(trim(coalesce(p_role,'')), '');
  v_had_owner    boolean;
  v_owners_left  int;
  v_changed      boolean := false;
  /* NOT named `r`. It was, and `r` is also the natural alias for
     staff_roles, so `r.person_id` in the authority check below resolved
     against this variable instead of the table and the function failed on
     its first statement with "record r is not assigned yet". It had never
     once run successfully. */
  v_rev record;
begin
  -- WHO IS ASKING. Read from the session, never from an argument.
  select ai.person_id, lower(p.primary_email)
    into v_actor_person, v_actor_email
    from public.auth_identities ai
    join public.persons p on p.person_id = ai.person_id
   where ai.auth_user_id = auth.uid();

  select exists (
    select 1 from public.staff_roles r
     where r.person_id = v_actor_person and r.role = 'owner_admin'
  ) into v_is_owner;

  if not coalesce(v_is_owner, false) then
    raise exception 'Only an Owner/Admin can change a Hub role.' using errcode = '42501';
  end if;

  -- The role must be one that legitimately exists. This is what stops a
  -- browser inventing an identifier.
  if v_role is not null and not exists (
      select 1 from public.staff_role_types t where t.role = v_role and t.active) then
    raise exception 'Not a role that exists: %', v_role using errcode = '22023';
  end if;

  select p.person_id into v_id
    from public.persons p where lower(p.primary_email) = v_email;
  if v_id is null then
    raise exception 'No employee with that email.' using errcode = '22023';
  end if;

  -- NOBODY CHANGES THEIR OWN ROLE, in either direction. This is the whole
  -- self-elevation defence: there is no "grant yourself something smaller"
  -- path to argue about, and an owner cannot quietly drop their own
  -- accountability either.
  if v_id = v_actor_person then
    raise exception 'You cannot change your own Hub role. Ask the other owner.'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.staff_roles r
     where r.person_id = v_id and r.entity = p_entity and r.role = 'owner_admin'
  ) into v_had_owner;

  -- THE LAST OWNER. Counted as owners who could actually sign in and use it,
  -- because an owner with no auth account cannot put anything back.
  if v_had_owner and v_role is distinct from 'owner_admin' then
    select count(*) into v_owners_left
      from public.staff_roles r
      join public.persons p on p.person_id = r.person_id
     where r.role = 'owner_admin'
       and r.entity = p_entity          -- same company as the row being removed
       and r.person_id <> v_id
       and p.active
       and exists (select 1 from auth.users u where lower(u.email) = lower(p.primary_email));
    if coalesce(v_owners_left,0) < 1 then
      raise exception
        'That is the last Owner/Admin who can sign in. Make somebody else an owner first.'
        using errcode = '42501';
    end if;
  end if;

  -- Log what is being taken away before taking it.
  for v_rev in select role from public.staff_roles
                where person_id = v_id and entity = p_entity
                  and (v_role is null or role <> v_role)
  loop
    insert into public.staff_role_audit
      (actor_email, subject_email, person_id, action, role, note)
    values (v_actor_email, v_email, v_id, 'revoke', v_rev.role,
            case when v_role is null then 'removed' else 'replaced by '||v_role end);
    v_changed := true;
  end loop;

  delete from public.staff_roles
   where person_id = v_id and entity = p_entity
     and (v_role is null or role <> v_role);

  if v_role is not null then
    insert into public.staff_roles (person_id, entity, role, granted_by)
    values (v_id, p_entity, v_role, coalesce(v_actor_email,'set_staff_role'))
    on conflict (person_id, entity, role) do nothing;
    if found then
      insert into public.staff_role_audit
        (actor_email, subject_email, person_id, action, role, note)
      values (v_actor_email, v_email, v_id, 'grant', v_role, 'assigned from My Team');
      v_changed := true;
    end if;
  end if;

  return query
  select v_email,
         coalesce(array(select r2.role from public.staff_roles r2
                         where r2.person_id = v_id and r2.entity = p_entity
                         order by r2.role), '{}')::text[],
         v_changed,
         case when v_role is null then 'Hub role removed.'
              else 'Hub role set to '||v_role||'.' end;
end
$fn$;

revoke all on function public.set_staff_role(text, text, text) from public;
grant execute on function public.set_staff_role(text, text, text) to authenticated;

comment on function public.set_staff_role is
  'The only way to change a Hub role. Owner/Admin only, checked from '
  'auth.uid() and never from an argument. Validates the role against '
  'staff_role_types, refuses self-changes, refuses to demote the last owner '
  'who can sign in, and writes staff_role_audit. Grants no confidential '
  'visibility: opsCanSee is not a role.';
