-- =============================================================================
-- 008 — LET ADD STAFF CREATE A REAL EMPLOYEE IDENTITY
-- =============================================================================
-- persons and entity_memberships are SELECT-only for authenticated, which is
-- right. But it meant "Add staff member" could only create enough to display
-- somebody, and a new hire could not later be named the owner of anything
-- without me and a terminal. That is the last normal lifecycle action that
-- still needed Claude.
--
-- Same shape as set_domain_people: one security-definer function that does the
-- write and decides for itself whether the caller may, from auth.uid() through
-- auth_identities to staff_roles.owner_admin.
--
-- WHAT IT WILL NOT DO:
--   · create an auth account. A person row means "a real human the operating
--     model may point at", never "this person can sign in"
--   · grant any role. Nobody becomes owner_admin by being hired
--   · create a second person for an email that already has one. It returns the
--     existing row instead, so a rehire reactivates rather than duplicating
--   · accept a person_id. Identity is matched on email, here, where it can be
--     checked
-- =============================================================================

drop function if exists public.upsert_staff_person(text, text, text[], boolean);

create function public.upsert_staff_person(
  p_email     text,
  p_full_name text,
  p_entities  text[] default array['cc_ihs'],
  p_active    boolean default true
)
returns table (
  person_id    uuid,
  full_name    text,
  email        text,
  was_existing boolean,
  was_inactive boolean,
  entities     text[],
  roles        text[],
  has_account  boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $fn$
declare
  v_is_owner boolean;
  v_id uuid;
  v_existing boolean := false;
  v_wasinactive boolean := false;
  v_email text := lower(trim(p_email));
  e text;
begin
  select exists (
    select 1 from public.auth_identities ai
      join public.staff_roles r on r.person_id = ai.person_id
     where ai.auth_user_id = auth.uid() and r.role = 'owner_admin'
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'Only an owner can add an employee.' using errcode = '42501';
  end if;

  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A work email address is required.' using errcode = '22023';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'A name is required.' using errcode = '22023';
  end if;

  -- One human, one row. A rehire comes back to the same identity.
  select p.person_id, not p.active into v_id, v_wasinactive
    from public.persons p where lower(p.primary_email) = v_email;

  if v_id is not null then
    v_existing := true;
    update public.persons
       set full_name = trim(p_full_name), active = p_active, updated_at = now()
     where public.persons.person_id = v_id;
  else
    insert into public.persons (full_name, primary_email, active)
    values (trim(p_full_name), v_email, p_active)
    returning public.persons.person_id into v_id;
  end if;

  -- Which companies they work for. Re-adding an entity reactivates it.
  --
  -- Written as update-then-insert rather than ON CONFLICT (person_id, entity)
  -- on purpose: `person_id` is also an OUT parameter of this function, so in a
  -- conflict target PL/pgSQL cannot tell the column from the variable and the
  -- whole function failed with "column reference person_id is ambiguous". It
  -- had never run successfully. Naming the constraint instead would work, but
  -- it would depend on a generated name; this depends on nothing.
  foreach e in array coalesce(p_entities, array['cc_ihs']) loop
    if e in ('cc_ihs','cc_cds') then
      update public.entity_memberships m
         set active = true
       where m.person_id = v_id and m.entity = e;
      if not found then
        insert into public.entity_memberships (person_id, entity, employment_type, active)
        values (v_id, e, 'employee', true);
      end if;
    end if;
  end loop;

  return query
  select p.person_id,
         p.full_name,
         coalesce(p.primary_email,'')::text,
         v_existing,
         v_wasinactive,
         coalesce(array(select m.entity from public.entity_memberships m
                         where m.person_id = p.person_id and m.active), '{}')::text[],
         coalesce(array(select r.role from public.staff_roles r
                         where r.person_id = p.person_id), '{}')::text[],
         exists(select 1 from auth.users u where lower(u.email) = v_email)
    from public.persons p
   where p.person_id = v_id;
end
$fn$;

revoke all on function public.upsert_staff_person(text, text, text[], boolean) from public;
grant execute on function public.upsert_staff_person(text, text, text[], boolean) to authenticated;

comment on function public.upsert_staff_person is
  'Create or reactivate a real employee identity from Add Staff. Checks '
  'owner_admin from staff_roles using auth.uid(). Never creates an auth '
  'account, never grants a role, and never creates a second person for an '
  'email that already has one — a rehire returns the existing identity.';


-- ── Also let the Hub see whether somebody is already known ──────────────────
-- persons is already readable by authenticated, so this only adds the auth
-- account check, which the browser cannot do for itself.
drop function if exists public.staff_identity_status(text);

create function public.staff_identity_status(p_email text)
returns table (person_exists boolean, person_active boolean, full_name text,
               entities text[], roles text[], has_account boolean)
language sql
security definer
set search_path = public, auth, pg_catalog
as $fn$
  select (p.person_id is not null),
         coalesce(p.active, false),
         coalesce(p.full_name,'')::text,
         coalesce(array(select m.entity from entity_memberships m
                         where m.person_id = p.person_id and m.active), '{}')::text[],
         coalesce(array(select r.role from staff_roles r
                         where r.person_id = p.person_id), '{}')::text[],
         exists(select 1 from auth.users u where lower(u.email) = lower(trim(p_email)))
    from (select 1) z
    left join persons p on lower(p.primary_email) = lower(trim(p_email));
$fn$;

revoke all on function public.staff_identity_status(text) from public;
grant execute on function public.staff_identity_status(text) to authenticated;
