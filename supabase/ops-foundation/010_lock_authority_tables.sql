-- =============================================================================
-- 010 — LOCK THE AUTHORITY TABLES DOWN TO READ
-- =============================================================================
-- Found by the 009 installer, which printed:
--
--   staff_role_audit   authenticated may: SELECT, TRUNCATE, REFERENCES, TRIGGER
--
-- 009 granted SELECT and nothing else. TRUNCATE, REFERENCES and TRIGGER came
-- from this project's ALTER DEFAULT PRIVILEGES, which hand extra privileges to
-- every newly created table in public. 001 said "SELECT ONLY ... so authority
-- data still cannot be changed from a browser", and that was true of what 001
-- explicitly granted and untrue of what the defaults added on top.
--
-- WHY TRUNCATE MATTERS MORE THAN IT LOOKS:
--   · row level security does not apply to TRUNCATE. A policy that restricts
--     every row is no defence at all
--   · TRUNCATE on staff_role_audit erases the audit trail, which is the one
--     table whose entire purpose is being permanent
--   · TRUNCATE on staff_roles removes everybody's authority at once
--
-- TRIGGER lets somebody attach code to a table they do not own. REFERENCES
-- lets them point a foreign key at it and block deletes. Neither is wanted.
--
-- THE PASS CONDITION, STATED ONCE:
--   on every table listed below, the browser-facing roles `authenticated` and
--   `anon` hold SELECT and nothing else. There is currently no table in this
--   list with a documented reason to permit anything more.
--
-- NOT TOUCHED, DELIBERATELY:
--   · service_role. A server-side secret that never reaches a browser, so
--     restricting it defends against nothing and risks breaking an edge
--     function that quietly depends on it
--   · app_data and the ordinary application tables. The hub genuinely writes
--     to those from the browser under RLS. Anything found wrong there is
--     reported for a separate decision, not changed here
-- =============================================================================

do $$
declare
  t text;
  authority_tables text[] := array[
    'entities','persons','auth_identities','entity_memberships',
    'staff_roles','domains','ops_routing','staff_role_types','staff_role_audit'
  ];
begin
  foreach t in array authority_tables loop
    if exists (select 1 from information_schema.tables
                where table_schema='public' and table_name=t) then
      execute format('revoke all on public.%I from authenticated', t);
      execute format('revoke all on public.%I from anon', t);
      execute format('revoke all on public.%I from public', t);
      execute format('grant select on public.%I to authenticated', t);
      raise notice 'locked %', t;
    else
      raise notice 'skipped % (does not exist)', t;
    end if;
  end loop;
end $$;

-- The definer functions are unaffected: they run as their owner, not as the
-- caller, which is the entire reason writes go through them.


-- ── STOP THE NEXT STRUCTURAL TABLE BEING BORN WITH IT ───────────────────────
-- Default privileges are recorded PER OWNING ROLE in pg_default_acl. A blanket
-- ALTER DEFAULT PRIVILEGES only changes the defaults belonging to the role
-- that runs it, so fixing today's grants fixes nothing about tomorrow's tables
-- if a different owner created them. This walks every owner that currently
-- hands anything to authenticated or anon and narrows each one, reporting any
-- it lacks the membership to change rather than failing silently.
do $$
declare
  d record;
  fixed int := 0;
  couldnt text := '';
begin
  for d in
    select distinct pg_get_userbyid(defaclrole) as owner_role,
           nspname
      from pg_default_acl da
      left join pg_namespace n on n.oid = da.defaclnamespace
      cross join lateral unnest(da.defaclacl) acl
     where da.defaclobjtype = 'r'
       and (acl::text like 'authenticated=%' or acl::text like 'anon=%')
  loop
    begin
      if d.nspname is null then
        execute format(
          'alter default privileges for role %I revoke truncate, references, trigger on tables from authenticated',
          d.owner_role);
        execute format(
          'alter default privileges for role %I revoke truncate, references, trigger on tables from anon',
          d.owner_role);
      else
        execute format(
          'alter default privileges for role %I in schema %I revoke truncate, references, trigger on tables from authenticated',
          d.owner_role, d.nspname);
        execute format(
          'alter default privileges for role %I in schema %I revoke truncate, references, trigger on tables from anon',
          d.owner_role, d.nspname);
      end if;
      fixed := fixed + 1;
      raise notice 'narrowed defaults owned by %', d.owner_role;
    exception when others then
      couldnt := couldnt || d.owner_role || ' (' || sqlerrm || '); ';
    end;
  end loop;
  raise notice 'default privilege owners narrowed: %', fixed;
  if couldnt <> '' then
    raise notice 'COULD NOT NARROW: %', couldnt;
  end if;
end $$;

-- Also narrow the current role's own default, which may have no row in
-- pg_default_acl yet and therefore would not appear in the loop above.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon;


-- ── PROVE IT, INSIDE THE MIGRATION ──────────────────────────────────────────
-- has_table_privilege is used rather than information_schema because it also
-- accounts for privileges granted to PUBLIC and inherited through role
-- membership, which the information_schema view does not show.
do $$
declare
  t text;
  p text;
  r text;
  bad text := '';
  authority_tables text[] := array[
    'entities','persons','auth_identities','entity_memberships',
    'staff_roles','domains','ops_routing','staff_role_types','staff_role_audit'
  ];
begin
  foreach t in array authority_tables loop
    if exists (select 1 from information_schema.tables
                where table_schema='public' and table_name=t) then
      foreach r in array array['authenticated','anon'] loop
        foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
          if has_table_privilege(r, format('public.%I', t), p) then
            bad := bad || format('%s: %s has %s; ', t, r, p);
          end if;
        end loop;
      end loop;
      -- authenticated must KEEP select, or the hub goes blind
      if not has_table_privilege('authenticated', format('public.%I', t), 'SELECT') then
        bad := bad || format('%s: authenticated lost SELECT; ', t);
      end if;
    end if;
  end loop;
  if bad <> '' then
    raise exception 'Authority tables are not in the intended state -> %', bad;
  end if;
  raise notice 'PASS: every authority table is SELECT-only for authenticated and anon.';
end $$;
