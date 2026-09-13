-- =============================================================================
-- 006 — LET AN OWNER CHANGE OPERATIONAL OWNERSHIP, FROM THE HUB
-- =============================================================================
-- domains is SELECT-only for authenticated, which is right: a browser holding a
-- public key must not be able to rewrite who work routes to. But that also
-- meant changing an owner required me and a terminal, which is the thing this
-- whole pass exists to end.
--
-- So: one security-definer function that does the write, and decides for itself
-- whether the caller may. Same rule as the hub-access function — the caller is
-- auth.uid(), resolved through auth_identities to a person, and that person
-- must hold owner_admin. Nothing passed in decides anything about authority.
--
-- It will not:
--   · accept a person_id directly. Emails are resolved here, so a caller
--     cannot point ownership at a row they only guessed the id of
--   · set an owner who is not an active person
--   · touch any column other than the three people columns
--
-- Clearing is explicit: pass null to leave a domain deliberately unowned. That
-- is sometimes the honest answer and should not require a workaround.
-- =============================================================================

drop function if exists public.set_domain_people(text, text, text, text);

create function public.set_domain_people(
  p_code            text,
  p_owner_email     text default null,
  p_backup_email    text default null,
  p_escalation_email text default null
)
returns table (code text, owner_name text, backup_name text, escalation_name text)
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $fn$
declare
  v_is_owner boolean;
  v_owner uuid; v_backup uuid; v_esc uuid;
begin
  -- Authority, read from the database. Never from an argument.
  select exists (
    select 1 from public.auth_identities ai
      join public.staff_roles r on r.person_id = ai.person_id
     where ai.auth_user_id = auth.uid()
       and r.role = 'owner_admin'
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only an owner can change operational ownership.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.domains d
                  where d.entity = 'cc_ihs' and d.code = p_code) then
    raise exception 'There is no area called %', p_code using errcode = '22023';
  end if;

  -- Emails in, person ids out. An address that is not an active person is a
  -- mistake worth stopping for, not a null to shrug at.
  if p_owner_email is not null and length(trim(p_owner_email)) > 0 then
    select person_id into v_owner from public.persons
     where lower(primary_email) = lower(trim(p_owner_email)) and active;
    if v_owner is null then
      raise exception 'No active person with the email %', p_owner_email using errcode = '22023';
    end if;
  end if;
  if p_backup_email is not null and length(trim(p_backup_email)) > 0 then
    select person_id into v_backup from public.persons
     where lower(primary_email) = lower(trim(p_backup_email)) and active;
    if v_backup is null then
      raise exception 'No active person with the email %', p_backup_email using errcode = '22023';
    end if;
  end if;
  if p_escalation_email is not null and length(trim(p_escalation_email)) > 0 then
    select person_id into v_esc from public.persons
     where lower(primary_email) = lower(trim(p_escalation_email)) and active;
    if v_esc is null then
      raise exception 'No active person with the email %', p_escalation_email using errcode = '22023';
    end if;
  end if;

  update public.domains d
     set owner_person      = v_owner,
         backup_person     = v_backup,
         escalation_person = v_esc
   where d.entity = 'cc_ihs' and d.code = p_code;

  return query
  select d.code,
         coalesce((select full_name from public.persons p where p.person_id = d.owner_person),      '')::text,
         coalesce((select full_name from public.persons p where p.person_id = d.backup_person),     '')::text,
         coalesce((select full_name from public.persons p where p.person_id = d.escalation_person), '')::text
    from public.domains d
   where d.entity = 'cc_ihs' and d.code = p_code;
end
$fn$;

revoke all on function public.set_domain_people(text, text, text, text) from public;
grant execute on function public.set_domain_people(text, text, text, text) to authenticated;

comment on function public.set_domain_people is
  'Change who owns, backs up and escalates an area of the business. Checks '
  'owner_admin from staff_roles using auth.uid(); arguments never decide '
  'authority. Emails are resolved here so a caller cannot point ownership at a '
  'person_id they guessed. Pass null to leave a role deliberately unowned.';


-- ── Make the structural map agree with the operating model ──────────────────
-- scheduling_coverage still says Krystal owns it, while the responsibility
-- record says Samantha holds it temporarily with Krystal as backup. The
-- domain map is the one that actually routes unowned work, so the map was
-- wrong. Escalation stays with Samantha.
do $$
declare s uuid; k uuid;
begin
  select person_id into s from persons where lower(primary_email)='samantha@mo-care.com';
  select person_id into k from persons where lower(primary_email)='krystal@mo-care.com';
  if s is not null then
    update domains set owner_person = s, backup_person = k, escalation_person = s
     where entity='cc_ihs' and code='scheduling_coverage';
    raise notice 'scheduling_coverage -> owner Samantha, backup Krystal';
  end if;
end $$;

select d.code, d.label,
       coalesce((select full_name from persons p where p.person_id=d.owner_person),      '— none') as owner,
       coalesce((select full_name from persons p where p.person_id=d.backup_person),     '— none') as backup,
       coalesce((select full_name from persons p where p.person_id=d.escalation_person), '— none') as escalation
  from domains d where d.entity='cc_ihs' order by d.sort_order;
