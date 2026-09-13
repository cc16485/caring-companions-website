-- =============================================================================
-- 005 — LINK THE OWNERS' SIGN-INS TO THEIR PERSON RECORDS
-- =============================================================================
-- The hub-access function decides what a caller may do by reading
-- auth_identities -> staff_roles. Both tables were created in 001 and NEITHER
-- HAS EVER BEEN POPULATED, so that check currently denies everybody, including
-- the owners. The security model was written and then never given the data it
-- reads from.
--
-- This is the bootstrap, and it is deliberately narrow:
--   · it links a person to a sign-in ONLY where the email already matches an
--     existing auth account. It never creates an account and never invents a
--     link
--   · it grants owner_admin ONLY to samantha@ and zach@, the two people who
--     already hold every approval in the running system
--   · it grants nothing to anybody else. Everyone else gets access through the
--     Hub, which is the entire point of the build
--
-- Safe to run twice.
-- =============================================================================

do $$
declare
  linked int := 0;
  granted int := 0;
  missing text := '';
  r record;
begin
  -- ── Which owners actually have a sign-in yet? Report before changing. ─────
  for r in
    select p.person_id, p.full_name, lower(p.primary_email) as email,
           (select u.id from auth.users u where lower(u.email) = lower(p.primary_email)) as auth_id
      from persons p
     where lower(p.primary_email) in ('samantha@mo-care.com','zach@mo-care.com')
  loop
    if r.auth_id is null then
      missing := missing || r.email || ' ';
    else
      insert into auth_identities (person_id, project_ref, auth_user_id, login_email)
      values (r.person_id, 'zngsgedlsxinbygwmxwn', r.auth_id, r.email)
      on conflict (person_id, project_ref)
        do update set auth_user_id = excluded.auth_user_id,
                      login_email  = excluded.login_email;
      linked := linked + 1;
    end if;

    insert into staff_roles (person_id, entity, role, granted_by)
    values (r.person_id, 'cc_ihs', 'owner_admin', '005_owner_identity.sql')
    on conflict (person_id, entity, role) do nothing;
    granted := granted + 1;
  end loop;

  raise notice 'linked % sign-in(s), ensured owner_admin on % person row(s)', linked, granted;
  if missing <> '' then
    raise notice 'NO AUTH ACCOUNT YET FOR: %', missing;
    raise notice 'They can still be granted owner_admin, but cannot call the function until they sign in once.';
  end if;
end $$;


-- What the function will see when it checks. If this returns no rows for an
-- owner, that owner cannot administer access — which is the honest answer, not
-- a reason to loosen the check.
select p.full_name,
       lower(p.primary_email)                                   as email,
       (ai.auth_user_id is not null)                            as sign_in_linked,
       coalesce(string_agg(distinct r.role, ', '), '— none')    as roles,
       (select u.last_sign_in_at from auth.users u where u.id = ai.auth_user_id) as last_sign_in
  from persons p
  left join auth_identities ai
         on ai.person_id = p.person_id and ai.project_ref = 'zngsgedlsxinbygwmxwn'
  left join staff_roles r on r.person_id = p.person_id
 where p.active
 group by p.full_name, p.primary_email, ai.auth_user_id
 order by (coalesce(string_agg(distinct r.role, ''), '') = '') , p.full_name;
