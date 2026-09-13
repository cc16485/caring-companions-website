-- =============================================================================
-- PROPOSED — inbound inquiries and routing.  NOT IN migrations/.
-- =============================================================================
-- WHY THIS EXISTS, in one sentence: Gabriel Eneh asked about an overnight
-- caregiver job and became a family sales lead, because nothing between the
-- website and the pipeline ever asks why a person is writing.
--
-- THE ROOT CAUSE, located in the code rather than inferred:
--   assets/forms.js line 2, its own header comment:
--     "Posts to the shared hub's lead-intake Edge Function, so EVERY website
--      submission becomes a lead in the CC Hub pipeline"
--   One function, CCForms.submitLead, one endpoint, no intent question.
--   Eight pages call it, including the general contact form, the Referral
--   PARTNER portal, the family caregiver TRAINING signup and the HomeTogether
--   TV product page. lead-intake then writes status 'New' and follow_up_due
--   today, and the family follow-up ladder begins.
--
-- So the fix is not another field on `leads`. It is a layer in front of it:
--
--   INBOUND INQUIRY  →  CLASSIFICATION  →  ROUTED WORKFLOW
--                                            family lead is ONE of them
--
-- `leads` stops being the universal intake table and becomes what its name
-- always claimed: people who want care.
--
-- THE RULE THIS ENFORCES: the family SLA and follow-up ladder cannot begin
-- until an inquiry is classified as needs_care. That is enforced structurally,
-- not by a check: no lead row exists until routing creates one, and the ladder
-- only ever reads leads.
-- =============================================================================


-- ── INTENT and ROUTE are two different things ──────────────────────────────
-- Intent is what the person wanted. Route is which of our workflows handles it.
-- Keeping them apart means we can move work between teams later without
-- rewriting what anybody actually asked for, and a historical classification
-- stays true even after a reorganisation.

create table if not exists inquiry_intents (
  code text primary key,
  label text not null,
  default_route text not null,
  starts_family_sla boolean not null default false,
  sort_order int not null default 100
);
insert into inquiry_intents (code, label, default_route, starts_family_sla, sort_order) values
  ('needs_care',        'Needs care',                        'family_sales',          true,  10),
  ('looking_for_job',   'Looking for a job',                 'recruiting',            false, 20),
  ('existing_client',   'Existing client or their family',   'client_service',        false, 30),
  ('existing_staff',    'Existing caregiver or employee',    'employee_support',      false, 40),
  ('referral_partner',  'Professional partner, introducing', 'referral_relationship', false, 50),
  ('training',          'Training or education',             'family_academy',        false, 60),
  ('product_enquiry',   'Product, e.g. HomeTogether TV',     'product',               false, 70),
  ('community',         'Community, nomination, press',      'other',                 false, 80),
  ('vendor',            'Vendor or solicitation',            'vendor_other',          false, 90),
  ('unknown',           'Unknown, needs a person',           'human_triage',          false, 99)
on conflict (code) do nothing;

create table if not exists inquiry_routes (
  code text primary key, label text not null, owner_team text, sort_order int not null default 100
);
insert into inquiry_routes (code, label, owner_team, sort_order) values
  ('family_sales',          'Family lead',           'care coordinators', 10),
  ('recruiting',            'Recruiting',            'staffing',          20),
  ('client_service',        'Client service',        'care coordinators', 30),
  ('employee_support',      'Employee support',      'staffing',          40),
  ('referral_relationship', 'Referral relationship', 'leadership',        50),
  ('family_academy',        'Family Academy',        'marketing',         60),
  ('product',               'HomeTogether',          'marketing',         70),
  ('other',                 'Other',                 'office',            80),
  ('vendor_other',          'Vendor',                'office',            90),
  ('human_triage',          'Needs triage',          'office',            99)
on conflict (code) do nothing;

-- Only needs_care starts the family clock. Everything else is routed and
-- answered, and never chased by the family ladder.

-- MULTI-INTENT. Someone can ask about care AND HomeTogether TV in one message.
-- The primary intent decides the route; the others are recorded rather than
-- discarded, so the data never has to lie because the UI wanted one answer.
create table if not exists inquiry_secondary_intents (
  inquiry_id uuid not null,
  intent     text not null references inquiry_intents(code),
  method     text,
  confidence int check (confidence between 0 and 100),
  primary key (inquiry_id, intent)
);


-- ── The inquiry: every inbound contact, whatever it turns out to be ────────
create table if not exists inquiries (
  id            uuid primary key,
  received_at   timestamptz not null default now(),

  -- The same shape whatever the channel, which is the point. A phone call from
  -- an unknown number is exactly as unclassified as a web form.
  channel       text not null
                  check (channel in ('web_form','phone_call','sms','email','facebook',
                                     'referral_form','walk_in','chat','other')),
  source_page   text,                -- contact.html, referral-partners.html, ...
  source_form   text,                -- which form on that page
  source_detail text,                -- campaign, referring org, caller id

  -- The submission exactly as it arrived. Never parsed away, never normalised.
  -- If a later classification turns out wrong, this is what it gets re-read from.
  raw_payload   jsonb not null default '{}',

  contact_name  text,
  contact_phone text,
  contact_email text,
  message       text,

  -- Classification. `intent` is what they wanted; `routed_to` is who handles it.
  intent text not null default 'unknown' references inquiry_intents(code),
  -- The hierarchy, most trustworthy first. AI never classifies something the
  -- form or the page already stated explicitly.
  classification_method text not null default 'none'
                  check (classification_method in ('none','form_selection','page_intent','rule','ai','human')),
  -- Prioritises the triage queue. It is not evidence and nothing routes on it.
  classification_confidence int check (classification_confidence between 0 and 100),
  classified_at timestamptz,
  classified_by text,

  -- Where it went, and what it became
  routed_to     text references inquiry_routes(code),
  routed_ref    uuid,                -- leads.id, applicant id, ticket id
  routed_at     timestamptz,

  -- THE CLOCK THE FAMILY EXPERIENCES.
  -- received_at is when they asked for help. Every response-time measure starts
  -- there, never at classified_at or routed_at, because a family that waited 18
  -- minutes did not wait 14 just because classification took four of them.
  -- These three exist so the delay can be attributed rather than hidden.

  -- A durable test marker, so nothing ever again depends on a name beginning ZZ.
  is_test       boolean not null default false,
  test_reason   text,

  needs_triage  boolean generated always as (intent = 'unknown') stored,
  triage_note   text,

  created_at    timestamptz not null default now()
);
create index if not exists inquiries_intent_idx  on inquiries (intent, received_at desc);
create index if not exists inquiries_channel_idx on inquiries (channel, received_at desc);
create index if not exists inquiries_triage_idx  on inquiries (received_at)
  where intent = 'unknown' and not is_test;
create index if not exists inquiries_routed_idx  on inquiries (routed_ref);


-- ── Reclassification is history, not an edit ───────────────────────────────
-- Gabriel will be reclassified from needs_care to looking_for_job. That change
-- is itself a fact worth keeping: it is the evidence that routing failed, and
-- the only way to notice it happening again.
create table if not exists inquiry_routing_history (
  id            bigserial primary key,
  inquiry_id    uuid not null references inquiries(id),
  changed_at    timestamptz not null default now(),
  from_classification text,
  to_classification   text,
  from_routed_to text,
  to_routed_to   text,
  method        text,
  actor         text,
  reason        text
);
create index if not exists inquiry_routing_history_idx on inquiry_routing_history (inquiry_id, changed_at desc);

create or replace function inquiry_routing_write() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'UPDATE'
     and (new.intent is distinct from old.intent
          or new.routed_to is distinct from old.routed_to) then
    insert into inquiry_routing_history
      (inquiry_id, from_classification, to_classification, from_routed_to, to_routed_to, method, actor, reason)
    values (new.id, old.intent, new.intent, old.routed_to, new.routed_to,
            new.classification_method, new.classified_by, new.triage_note);
  end if;
  return new;
end $$;

drop trigger if exists inquiries_routing_history on inquiries;
create trigger inquiries_routing_history after update on inquiries
  for each row execute function inquiry_routing_write();


-- ── The join back to the family pipeline ───────────────────────────────────
-- A lead now always has an inquiry behind it. The reverse is not true, and
-- that asymmetry is the entire fix.
alter table leads add column if not exists inquiry_id uuid references inquiries(id);
alter table leads add column if not exists is_test boolean not null default false;
create index if not exists leads_inquiry_idx on leads (inquiry_id);

comment on column leads.inquiry_id is
  'The inbound inquiry this lead came from. A lead exists only because an inquiry was classified needs_care.';
comment on column leads.is_test is
  'Excluded from every operational metric. Set from the inquiry, never inferred from a name.';


-- ── What the office should actually look at ────────────────────────────────
drop view if exists inquiry_triage_queue;
create view inquiry_triage_queue as
select i.id, i.received_at, i.channel, i.source_page,
       i.contact_name, i.contact_phone, i.contact_email,
       left(coalesce(i.message,''), 200) as message_preview,
       i.intent, i.classification_method, i.classification_confidence,
       extract(epoch from (now() - i.received_at))/3600 as hours_waiting
from inquiries i
where i.intent = 'unknown' and not i.is_test and i.routed_ref is null
order by i.received_at;

-- Where inquiries actually come from, and what they turn out to be. This is
-- the report that would have shown the contact form producing job applications
-- long before anyone noticed Gabriel.
drop view if exists inquiry_source_mix;
create view inquiry_source_mix as
select coalesce(source_page, channel) as source,
       intent,
       count(*) as n,
       min(received_at) as first_seen,
       max(received_at) as last_seen
from inquiries
where not is_test
group by 1, 2
order by 1, 3 desc;

-- ── Minimum viable intake, per channel ─────────────────────────────────────
-- A phone inquiry with no name, no number, no request and no transcript is not
-- a sales lead. It is an incomplete record, and it belongs in triage.
create table if not exists inquiry_channel_minimums (
  channel text primary key,
  requires_contact boolean not null default true,   -- a phone or an email
  requires_message boolean not null default false,  -- something they actually said
  note text
);
insert into inquiry_channel_minimums (channel, requires_contact, requires_message, note) values
  ('web_form',      true,  true,  'A form with neither contact details nor a message is a bot or a misfire.'),
  ('phone_call',    true,  false, 'Caller ID counts as contact. A call with no number AND no transcript is incomplete.'),
  ('sms',           true,  false, 'The number is the contact.'),
  ('email',         true,  false, 'The address is the contact.'),
  ('facebook',      true,  false, 'The profile is the contact.'),
  ('referral_form', true,  true,  'The partner and the situation are both required.'),
  ('walk_in',       false, true,  'Someone at the door may leave no details; what they asked for is the record.'),
  ('chat',          true,  false, null),
  ('other',         false, false, 'Deliberately permissive; everything lands in triage anyway.')
on conflict (channel) do nothing;

alter table inquiries               enable row level security;
alter table inquiry_intents         enable row level security;
alter table inquiry_routes          enable row level security;
alter table inquiry_secondary_intents enable row level security;
alter table inquiry_channel_minimums enable row level security;
alter table inquiry_routing_history enable row level security;
-- No policies. Service role only, as everywhere else.
