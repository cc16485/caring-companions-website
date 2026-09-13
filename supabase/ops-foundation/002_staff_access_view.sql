-- =============================================================================
-- STAFF & ACCESS — the read-only half.  Build 6 period.
-- =============================================================================
-- One function. It reads; it writes nothing; there is no companion that writes.
-- The write-capable page comes after the authority cutover, so that
-- can('manage_staff_access') can gate it from inception rather than being
-- migrated in later.
--
-- WHY A FUNCTION AND NOT A VIEW WITH RLS:
-- hub_access, last_sign_in_at and email_confirmed_at live in auth.users, which
-- PostgREST does not expose at all. No grant reaches it from a browser. A
-- security-definer function is the only way to surface those three facts, and
-- because it runs as its owner it must decide for itself who may call it.
--
-- THE BOUNDARY IS HERE, NOT IN THE PAGE:
-- the caller is resolved from auth.uid() and checked against staff_roles. A
-- non-owner calling this directly gets an empty result, not an error and not
-- data. Hiding a menu item is presentation. This is the boundary.
--
-- It is also the first thing anywhere that reads authority from the structural
-- model rather than from a hardcoded list of two email addresses.
-- =============================================================================

drop function if exists public.staff_access_overview();

create or replace function public.staff_access_overview()
returns table (
  person_id         uuid,
  full_name         text,
  email             text,
  active            boolean,
  entities          text[],
  roles             text[],
  hub_access        text[],
  has_account       boolean,
  account_confirmed boolean,
  last_sign_in      timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_catalog
as $fn$
begin
  -- Caller must hold owner_admin somewhere. Read from the database, never
  -- from anything the request supplied.
  if not exists (
    select 1
      from public.auth_identities ai
      join public.staff_roles r on r.person_id = ai.person_id
     where ai.auth_user_id = auth.uid()
       and r.role = 'owner_admin'
  ) then
    return;                     -- empty. Not an error, and not data.
  end if;

  return query
  select p.person_id,
         p.full_name,
         coalesce(p.primary_email, '')                                as email,
         p.active,
         coalesce(array_agg(distinct m.entity)
                  filter (where m.entity is not null and m.active), '{}')  as entities,
         coalesce(array_agg(distinct r.role)
                  filter (where r.role is not null), '{}')                 as roles,
         coalesce((select array(select jsonb_array_elements_text(
                    u.raw_app_meta_data -> 'hub_access'))), '{}')          as hub_access,
         (u.id is not null)                                                as has_account,
         (u.email_confirmed_at is not null)                                as account_confirmed,
         u.last_sign_in_at
    from public.persons p
    left join public.entity_memberships m on m.person_id = p.person_id
    left join public.staff_roles       r on r.person_id = p.person_id
    left join public.auth_identities  ai on ai.person_id = p.person_id
    left join auth.users               u on u.id = ai.auth_user_id
   group by p.person_id, p.full_name, p.primary_email, p.active,
            u.id, u.email_confirmed_at, u.last_sign_in_at, u.raw_app_meta_data
   order by (u.id is null), p.full_name;
end $fn$;

-- Anyone signed in may CALL it. The function decides what they get back, which
-- is the point: the check cannot be skipped by calling it a different way.
revoke all on function public.staff_access_overview() from public;
grant execute on function public.staff_access_overview() to authenticated;
grant execute on function public.staff_access_overview() to service_role;

comment on function public.staff_access_overview() is
  'Read-only Staff & Access. Owner/Admin only, enforced inside the function. '
  'Returns an empty set to anyone else. Writes nothing; there is no companion '
  'that writes. Build 6 period.';

notify pgrst, 'reload schema';
