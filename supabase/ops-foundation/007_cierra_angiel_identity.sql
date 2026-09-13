-- =============================================================================
-- 007 — REAL PERSON RECORDS FOR CIERRA AND ANGIEL
-- =============================================================================
-- set_domain_people resolves an owner by email against persons. Neither Cierra
-- nor Angiel has a row there, so neither can be named as the owner of an area
-- they actually hold. That is the gap, and this closes it.
--
-- A PERSON ROW IS NOT AN ACCOUNT AND NOT AUTHORITY. It says "this is a real
-- human the structure may point at". It creates no sign-in, grants no Hub
-- access, and confers no role. Those are separate acts, done elsewhere,
-- deliberately.
--
--   Angiel   real and working now. She already owns payer work through
--            PAYER_COORDINATOR, so the structural domain is set to match what
--            the Hub already does. This does NOT replace that routing path —
--            that migration stays deferred.
--
--   Cierra   real, but her office and field model is planned. Her person row is
--            created and NOTHING is made live: field_quality keeps no owner,
--            because a planned owner is not an owner. Responsible Now must keep
--            showing that area as unheld until she actually starts.
--
-- No staff_roles rows. Neither of them is an owner_admin.
-- Safe to run twice.
-- =============================================================================

insert into persons (full_name, primary_email, active)
select v.full_name, v.email, true
  from (values ('Cierra Barber','cierra@mo-care.com'),
               ('Angiel Falig','angiel@mo-care.com')) as v(full_name, email)
 where not exists (select 1 from persons p where lower(p.primary_email) = v.email);

insert into entity_memberships (person_id, entity, employment_type, active)
select p.person_id, 'cc_ihs', 'employee', true
  from persons p
 where lower(p.primary_email) in ('cierra@mo-care.com','angiel@mo-care.com')
   and not exists (select 1 from entity_memberships m
                    where m.person_id = p.person_id and m.entity = 'cc_ihs');

do $$
declare a uuid; s uuid;
begin
  select person_id into a from persons where lower(primary_email)='angiel@mo-care.com';
  select person_id into s from persons where lower(primary_email)='samantha@mo-care.com';

  -- Angiel: the structure catches up with what is already true.
  if a is not null then
    update domains set owner_person = a, escalation_person = s
     where entity='cc_ihs' and code='payer_programs';
    raise notice 'payer_programs -> owner Angiel, escalation Samantha';
  end if;

  -- Cierra: DELIBERATELY NOT SET. field_quality stays unowned until she starts.
  raise notice 'field_quality left with no owner on purpose — planned is not held';
end $$;


-- ── Prove it did only what it said ──────────────────────────────────────────
select p.full_name,
       lower(p.primary_email)                                             as email,
       p.active,
       (select count(*) from entity_memberships m where m.person_id=p.person_id) as memberships,
       coalesce((select string_agg(r.role,', ') from staff_roles r
                  where r.person_id=p.person_id), '— none')               as roles,
       (select count(*) from auth_identities ai where ai.person_id=p.person_id) as sign_ins,
       exists(select 1 from auth.users u where lower(u.email)=lower(p.primary_email)) as has_auth_account
  from persons p
 where lower(p.primary_email) in ('cierra@mo-care.com','angiel@mo-care.com')
 order by p.full_name;

select d.code, d.label,
       coalesce((select full_name from persons p where p.person_id=d.owner_person),      '— none') as owner,
       coalesce((select full_name from persons p where p.person_id=d.escalation_person), '— none') as escalation
  from domains d
 where d.entity='cc_ihs' and d.code in ('payer_programs','field_quality')
 order by d.sort_order;
