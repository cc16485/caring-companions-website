-- =============================================================================
-- 004 — TWO NEW DOMAINS, AND ONE NARROWED
-- =============================================================================
-- A domain is an ADDRESS for unowned work, not a taxonomy. Two of these earned
-- one because they route to a different person; nothing else did.
--
--   caregiver_performance   NARROWS to employment and performance management.
--                           Code unchanged, label clarified, Krystal keeps it.
--                           NO ops_items are migrated: every existing row on
--                           this domain is still correctly classified, because
--                           the discipline path is exactly what stays here.
--
--   field_quality           NEW. Hands-on field quality and advanced care.
--                           The same domain was doing both jobs: the Advanced
--                           Care duty area pointed at caregiver_performance
--                           while the discipline path wrote to it too. One
--                           address, two different owners.
--
--   payer_programs          NEW. Getting people through a third-party payer's
--                           approval and into active care. IHS, CDS and
--                           Veterans Affairs are PROGRAMMES inside it, not
--                           separate domains, because unowned work in all
--                           three goes to the same person.
--
-- OWNERS ARE DELIBERATELY LEFT NULL. This file names the addresses; it does
-- not decide who holds them. Cierra has not started, and Angiel's person row
-- must be confirmed by email rather than guessed. Escalation is set, because
-- that is true today either way.
--
-- Safe to run twice.
-- =============================================================================

insert into domains (entity, code, label, sort_order) values
  ('cc_ihs', 'field_quality',  'Field Quality & Advanced Care', 45),
  ('cc_ihs', 'payer_programs', 'Payer Programs & Enrollment',   55)
on conflict (entity, code) do nothing;

-- The label narrows to match what it now means. The CODE never changes, which
-- is what keeps every existing ops_item correct and migration-free.
update domains
   set label = 'Caregiver Performance Management'
 where entity = 'cc_ihs'
   and code = 'caregiver_performance'
   and label = 'Caregiver performance and field quality';

do $$
declare
  krystal  uuid;
  samantha uuid;
begin
  select person_id into krystal  from persons where lower(primary_email)='krystal@mo-care.com';
  select person_id into samantha from persons where lower(primary_email)='samantha@mo-care.com';

  -- Field quality escalates to Krystal, NOT Samantha. That is the whole point
  -- of the split: when Cierra finds something in a home that is about the
  -- EMPLOYEE rather than their skills, it becomes performance management, and
  -- Krystal owns that. Skills stay with Cierra; conduct goes to Krystal.
  update domains set escalation_person = krystal
   where entity='cc_ihs' and code='field_quality';

  update domains set escalation_person = samantha
   where entity='cc_ihs' and code='payer_programs';

  raise notice 'field_quality  escalation -> Krystal, owner left NULL until Cierra is activated';
  raise notice 'payer_programs escalation -> Samantha, owner left NULL until Angiel''s person row is confirmed';
end $$;

-- What this changed, for the person running it.
select code, label,
       coalesce((select full_name from persons p where p.person_id = d.owner_person),      '— none yet') as owner,
       coalesce((select full_name from persons p where p.person_id = d.escalation_person), '— none')     as escalation
  from domains d
 where entity='cc_ihs'
   and code in ('caregiver_performance','field_quality','payer_programs')
 order by sort_order;
