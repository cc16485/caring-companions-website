-- =============================================================================
-- PROPOSED, revision 3 — the relational lead model.  NOT IN migrations/.
-- =============================================================================
-- The installer applies everything in supabase/migrations/. This lives in
-- supabase/proposed/ so it cannot run before it is approved.
--
-- Revision 2 changes, all from review:
--   * `soc` is a Start of Care PIPELINE, not a date. Evidence in §SOC below.
--   * funnel stage and operational status are separate vocabularies
--   * outcome (active|started|lost|paused|transferred) sits above reason
--   * human ACTIVITY and human CONTACT ESTABLISHED are different facts
--   * payer_interest[] for exploration, confirmed_payer for what paid
--   * one source of truth for first/last touch
--   * the hourly value column is named for what it actually is
--   * leads are archived, never deleted, so immutable history stays history
--
-- Revision 3 changes, all business decisions:
--   * PROGRAM/PAYER and SOC PATHWAY are separate, extensible vocabularies.
--     A1/A2/B/PP are preserved verbatim as legacy codes and mapped, never
--     reinterpreted.
--   * three distinct dates: process started, start agreed, care actually began
--   * two more operational statuses: needs_follow_up, waiting_on_internal
-- =============================================================================


-- ── Vocabularies ───────────────────────────────────────────────────────────

-- The funnel. For conversion reporting. A lead may legitimately SKIP stages:
-- a discharge planner can go straight from inquiry to assessment, and a
-- returning client may need no consultation. `step` orders them for reporting
-- and nothing enforces passing through every one.
create table if not exists lead_stages (
  code text primary key, label text not null, step int not null unique
);
insert into lead_stages (code, label, step) values
  ('inquiry','Inquiry',10), ('contacted','Contacted',20), ('qualified','Qualified',30),
  ('consultation_booked','Consultation booked',40),
  ('consultation_completed','Consultation completed',50),
  ('care_assessment','Care assessment',60),      -- named for OUR assessment. Payer
                                                 -- assessments (DSDS, VA) are events.
  ('start_scheduled','Start scheduled',70),
  ('client_started','Client started',80)
on conflict (code) do nothing;

-- What is happening right now. A different question from how far they got.
-- "Waiting on VA" and "Consultation completed" are not the same kind of fact
-- and should never have competed for one column.
create table if not exists lead_operational_statuses (
  code text primary key, label text not null, sort_order int not null default 100
);
-- Ordered so the board reads the way a coordinator thinks: everything WE owe
-- first, then everything we are waiting on, then the settled states.
insert into lead_operational_statuses (code, label, sort_order) values
  ('new',                   'New',                     10),
  ('needs_call',            'Needs call',              20),   -- nobody has reached them
  ('attempted_contact',     'Attempted contact',       30),   -- tried, not connected
  ('needs_follow_up',       'Needs follow-up',         40),   -- connected, WE owe the next move
  ('waiting_on_family',     'Waiting on family',       50),
  ('waiting_on_payer',      'Waiting on payer',        60),
  ('waiting_on_internal',   'Waiting on us',           70),   -- staffing, clinical, paperwork
  ('consultation_scheduled','Consultation scheduled',  80),
  ('nurture_not_ready',     'Nurture, not ready',      90),
  ('start_pending',         'Start pending',          100),
  ('active_client',         'Active client',          110),
  ('closed',                'Closed',                 120)
on conflict (code) do nothing;

-- The six statuses that answer "who owes the next move", which is the question
-- a coordinator is actually asking when they scan the board:
--   needs_call          nobody has reached them yet
--   attempted_contact   we tried and have not connected
--   needs_follow_up     we connected and WE owe the next action
--   waiting_on_family   the family owes the next action
--   waiting_on_payer    a payer or authorisation owes it
--   waiting_on_internal one of our own people or processes owes it

-- Outcome sits ABOVE reason. "We lost 14 leads to Medicaid" is a false
-- sentence: a family moving to Medicaid IHS, CDS or VA may still be revenue.
create table if not exists lead_outcomes (
  code text primary key, label text not null, counts_as_lost boolean not null
);
insert into lead_outcomes (code, label, counts_as_lost) values
  ('active',     'Still in the pipeline',        false),
  ('started',    'Became a client',              false),
  ('paused',     'Paused, expected to return',   false),
  ('transferred','Moved to another programme',   false),
  ('lost',       'Lost',                         true)
on conflict (code) do nothing;

create table if not exists lead_outcome_reasons (
  code text primary key,
  outcome text not null references lead_outcomes(code),
  label text not null, sort_order int not null default 100, active boolean not null default true
);
insert into lead_outcome_reasons (code, outcome, label, sort_order) values
  ('chose_competitor',    'lost','Chose another agency',            10),
  ('could_not_reach',     'lost','Could not reach them',            20),
  ('outside_area',        'lost','Outside our service area',        30),
  ('declined_care',       'lost','Declined care',                   40),
  ('too_expensive',       'lost','Price or affordability',          50),
  ('unable_to_staff',     'lost','We could not staff it',           60),
  ('facility_placement',  'lost','Went into a facility',            70),
  ('passed_away',         'lost','Passed away',                     80),

  ('not_ready',           'paused','Not ready yet',                 10),
  ('hospitalized',        'paused','Hospitalised',                  20),
  ('payer_auth_pending',  'paused','Waiting on payer authorisation',30),
  ('revisit_later',       'paused','Family wants to revisit later', 40),

  ('to_medicaid_ihs',     'transferred','Moved to Medicaid IHS',    10),
  ('to_cds',              'transferred','Moved to CDS',             20),
  ('to_va',               'transferred','Moved to VA',              30),
  ('to_hometogether',     'transferred','Moved to HomeTogether',    40),
  ('to_other_internal',   'transferred','Another of our programmes',50),

  ('other',               'lost','Other, see notes',               999)
on conflict (code) do nothing;


-- ── Programme / payer, and SOC pathway: two different questions ────────────
-- The legacy codes A1/A2/B/PP conflated them. A1 says both "Medicaid IHS" and
-- "we are submitting a new referral". Separating them means a private-pay
-- provider change, or a VA authorisation arriving, can be described without
-- inventing a fifth letter.

create table if not exists lead_programs (
  code text primary key, label text not null, sort_order int not null default 100,
  active boolean not null default true
);
insert into lead_programs (code, label, sort_order) values
  ('private_pay','Private Pay',10), ('medicaid_ihs','Medicaid IHS',20),
  ('medicaid_cds','Medicaid CDS',30), ('va_ccn','VA CCN',40),
  ('medicare_guide','Medicare GUIDE',50), ('ltci','Long-Term Care Insurance',60)
on conflict (code) do nothing;

-- Extensible on purpose. Four codes were never going to be the permanent model.
create table if not exists lead_soc_pathways (
  code text primary key, label text not null, sort_order int not null default 100,
  active boolean not null default true
);
insert into lead_soc_pathways (code, label, sort_order) values
  ('new_referral',          'New referral we submit',        10),
  ('provider_change_pccp',  'Provider change / PCCP',        20),
  ('state_offered',         'State offered us the case',     30),
  ('direct_private_start',  'Direct private-pay start',      40),
  ('authorization_received','Authorisation or referral received', 50),
  ('other',                 'Other',                        999)
on conflict (code) do nothing;

-- How the legacy letters translate. Kept as data, not as a decision buried in
-- code, so historical SOC records can be read without reinterpreting them.
create table if not exists lead_soc_legacy_map (
  legacy_code text primary key,
  pathway     text not null references lead_soc_pathways(code),
  program     text not null references lead_programs(code),
  note        text
);
insert into lead_soc_legacy_map (legacy_code, pathway, program, note) values
  ('A1','new_referral',         'medicaid_ihs','New Medicaid referral, we submit to FUSION'),
  ('A2','provider_change_pccp', 'medicaid_ihs','PCCP, switching to us from another agency'),
  ('B', 'state_offered',        'medicaid_ihs','DSDS offered us the case directly'),
  ('PP','direct_private_start', 'private_pay', 'Private pay')
on conflict (legacy_code) do nothing;


-- ── The lead: current state only ───────────────────────────────────────────
create table if not exists leads (
  id                    uuid primary key,
  legacy_blob_id        text,

  -- Who called. A lead is an ENQUIRY, not a person.
  first_name text, last_name text, phone text, email text,
  relationship_to_client text,

  -- Who needs care, when that is someone else. Usually it is.
  client_first_name text, client_last_name text, client_phone text,
  client_name_withheld boolean not null default false,

  -- What they need
  service_interest text[], needs text, medical_conditions text,
  safety_concerns text, urgency text, service_area text, in_service_area boolean,

  -- Payer. Exploration and reality are different questions.
  payer_interest text[],          -- what they are considering, often several
  confirmed_payer text,           -- what actually funds the care, once known
  confirmed_payer_at timestamptz,

  -- Attribution. lead_touches holds the trail; these two point into it.
  source text, referral_source_name text, referral_org_id text,
  first_touch_id bigint, last_touch_id bigint,   -- FKs added after lead_touches

  -- Where they are, as two separate facts
  stage  text not null default 'inquiry' references lead_stages(code),
  op_status text references lead_operational_statuses(code),
  legacy_status text,             -- the blob's free text, verbatim, never parsed away

  outcome text not null default 'active' references lead_outcomes(code),
  outcome_reason text references lead_outcome_reasons(code),
  outcome_reason_free text,       -- the original free-text lost_reason, preserved
  outcome_at timestamptz,
  outcome_notes text,

  owner text,                     -- display name for now; a staff id later
  next_action text, next_action_due date, follow_up_due date,

  -- HUMAN ACTIVITY: a coordinator worked this lead. An unanswered call counts.
  -- This is what stops family automation.
  first_human_activity_at timestamptz,
  last_human_activity_at  timestamptz,
  human_activity_count    int not null default 0,

  -- CONTACT ESTABLISHED: the family and a coordinator actually connected.
  -- This, and only this, is what a time-to-contact metric may use.
  first_contact_established_at timestamptz,
  last_contact_established_at  timestamptz,
  contact_established_count    int not null default 0,

  contact_attempts int not null default 0,
  last_attempt_kind text, bad_number boolean not null default false,

  -- Automation. Never sets any of the human columns above.
  ack_sent_at timestamptz, nudge_1_at timestamptz, nudge_2_at timestamptz,
  overdue_alerted_at timestamptz,
  nurture_sequence text, nurture_step int, nurture_started_at timestamptz,
  nurture_last_sent_at timestamptz, nurture_stopped_at timestamptz, nurture_stop_reason text,

  -- Funnel timestamps, each mirroring an event
  qualified_at timestamptz, consultation_booked_at timestamptz,
  consultation_completed_at timestamptz, care_assessment_at timestamptz,
  -- THREE DIFFERENT DATES. Conflating any two of them loses the question.
  --   soc_started_at      the paperwork began
  --   start_scheduled_at  the family and we have AGREED care will begin then.
  --                       New operational field. Nothing is backfilled into it,
  --                       because no reliable historical value exists and an
  --                       invented start date would corrupt every future
  --                       "did we start when we said we would" answer.
  --   client_started_at   the first shift was actually completed
  start_scheduled_at timestamptz,
  client_started_at  timestamptz,        -- from the SOC first-shift step's done_at

  -- Start of Care pipeline. See lead_soc_steps.
  soc_pathway        text references lead_soc_pathways(code),
  soc_program        text references lead_programs(code),
  soc_legacy_pathway text,     -- 'A1' | 'A2' | 'B' | 'PP', preserved verbatim,
                               -- never reinterpreted. See lead_soc_legacy_map.
  soc_started_at timestamptz,  -- when the PROCESS began, not the care
  soc_started_by text,

  -- Value. Named for what it is, so non-hourly work is not silently undervalued.
  estimated_weekly_hours numeric(6,2), quoted_hourly_rate numeric(8,2),
  hourly_care_weekly_value numeric(10,2)
    generated always as (estimated_weekly_hours * quoted_hourly_rate) stored,
  estimated_monthly_revenue numeric(12,2),   -- any pricing shape: live-in, payer
                                             -- authorisation, HomeTogether, day rate
  price_quoted text, axiscare_client_id text,

  interest_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Archived, never deleted, so immutable history stays history.
  archived_at timestamptz, archived_reason text,

  synced_from_blob_at timestamptz, blob_checksum text
);

create index if not exists leads_stage_idx    on leads (stage) where archived_at is null;
create index if not exists leads_outcome_idx  on leads (outcome) where archived_at is null;
create index if not exists leads_owner_idx    on leads (owner) where archived_at is null;
create index if not exists leads_created_idx  on leads (created_at desc);
-- The query that would have surfaced Gabriel: real, live, never actually reached.
create index if not exists leads_unreached_idx on leads (created_at)
  where first_contact_established_at is null and outcome = 'active' and archived_at is null;


-- ── Attribution ────────────────────────────────────────────────────────────
-- ONE source of truth: the lead points at its first and last touch. There are
-- no is_first/is_last flags, because two places to record the same fact is two
-- places for it to disagree.
create table if not exists lead_touches (
  id bigserial primary key,
  lead_id uuid references leads(id),
  occurred_at timestamptz not null default now(),
  channel text, medium text, campaign text, content text, series text,
  landing_page text, referrer text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  gclid text, fbclid text, referral_org text, referral_person text,
  raw jsonb
);
create index if not exists lead_touches_lead_idx on lead_touches (lead_id, occurred_at);
create index if not exists lead_touches_campaign_idx on lead_touches (campaign, occurred_at);

do $$ begin
  alter table leads add constraint leads_first_touch_fk
    foreign key (first_touch_id) references lead_touches(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table leads add constraint leads_last_touch_fk
    foreign key (last_touch_id) references lead_touches(id) on delete set null;
exception when duplicate_object then null; end $$;


-- ── Start of Care pipeline ─────────────────────────────────────────────────
-- EVIDENCE for this shape, from cc-hub-live/index.html:
--   line 10752  "the SOC checklist lives on each lead as lead.soc"
--   line 10858  lead.soc = { pathway, started_at, started_by, steps: socBuildSteps(pathway) }
--   line 10756  SOC_PATHWAYS: A1 new Medicaid referral · A2 PCCP switch ·
--               B DSDS offered it · PP private pay
--   line 10781  SOC_MERGED, the common tail, ending with
--               "First shift completed within the required timeframe"
--
-- So `soc` is neither start_scheduled_at nor client_started_at. It is a
-- multi-step workflow. `client_started_at` is the done_at of the first-shift
-- step. `start_scheduled_at` has no source in today's data at all.
create table if not exists lead_soc_steps (
  id bigserial primary key,
  lead_id uuid not null references leads(id),
  step_key text not null,          -- 'p0', 'm4' etc, as the hub generates them
  ordinal int not null,
  label text not null,
  role text,                       -- day | evening | state
  is_first_shift boolean not null default false,
  done_at timestamptz, done_by text,
  unique (lead_id, step_key)
);
create index if not exists lead_soc_steps_lead_idx on lead_soc_steps (lead_id, ordinal);
create index if not exists lead_soc_steps_open_idx on lead_soc_steps (lead_id) where done_at is null;


-- ── History: append-only ───────────────────────────────────────────────────
-- No ON DELETE CASCADE. Deleting a lead would ask this table to delete its
-- history and the immutability trigger would refuse, which is the correct
-- argument in a fight the delete should not have started. Leads are archived.
create table if not exists lead_events (
  id bigserial primary key,
  lead_id uuid not null references leads(id),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),

  kind text not null,
  -- lead_created · acknowledgement_sent · assigned · call_attempted
  -- · voicemail_left · manual_sms_sent · manual_email_sent · reply_received
  -- · human_contact_established · status_changed · stage_changed
  -- · consultation_booked · consultation_completed · payer_identified
  -- · soc_started · soc_step_completed · outcome_recorded · converted
  -- · automation_escalated · note_added · imported_from_blob

  -- Three separate facts, never collapsed:
  actor        text,
  actor_type   text not null default 'unknown'
                 check (actor_type in ('human','automation','system','unknown')),
  is_human_activity     boolean not null default false,  -- a coordinator did something
  established_contact   boolean not null default false,  -- the family actually responded

  channel text, direction text check (direction in ('inbound','outbound','internal')),
  from_value text, to_value text, summary text, detail jsonb,
  source_system text not null default 'hub',
  external_id text
);
create index if not exists lead_events_lead_idx on lead_events (lead_id, occurred_at desc);
create index if not exists lead_events_kind_idx on lead_events (kind, occurred_at desc);
create index if not exists lead_events_contact_idx on lead_events (lead_id) where established_contact;

-- `actor_type` defaults to 'unknown' on purpose. Backfilled comm_log entries
-- that cannot prove whether a person or a machine sent them stay unknown
-- rather than being guessed into a statistic.

create or replace function lead_events_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'lead_events is append-only. Record a correcting event instead of editing or deleting one.'
    using errcode = 'check_violation';
end $$;
drop trigger if exists lead_events_no_update on lead_events;
create trigger lead_events_no_update before update or delete on lead_events
  for each row execute function lead_events_immutable();


-- ── Where a start is actually stuck ────────────────────────────────────────
-- "7 of 11 steps complete, waiting on authorisation" instead of "start pending".
-- The hub already knows a state-role step is stuck after 14 days and any other
-- after 3; this makes that answerable across every lead at once.
drop view if exists lead_soc_progress;
create view lead_soc_progress as
select
  l.id as lead_id, l.first_name, l.last_name,
  coalesce(m.pathway, l.soc_pathway) as pathway,
  coalesce(m.program, l.soc_program) as program,
  l.soc_legacy_pathway, l.soc_started_at,
  count(s.*)                                   as steps_total,
  count(s.*) filter (where s.done_at is not null) as steps_done,
  (select s2.label from lead_soc_steps s2
    where s2.lead_id = l.id and s2.done_at is null
    order by s2.ordinal limit 1)               as waiting_on,
  (select s2.role from lead_soc_steps s2
    where s2.lead_id = l.id and s2.done_at is null
    order by s2.ordinal limit 1)               as waiting_on_role,
  (select max(s3.done_at) from lead_soc_steps s3 where s3.lead_id = l.id) as last_progress_at
from leads l
left join lead_soc_legacy_map m on m.legacy_code = l.soc_legacy_pathway
left join lead_soc_steps s on s.lead_id = l.id
where l.soc_started_at is not null and l.archived_at is null
group by l.id, l.first_name, l.last_name, m.pathway, m.program,
         l.soc_pathway, l.soc_program, l.soc_legacy_pathway, l.soc_started_at;


-- ── Reconciliation ─────────────────────────────────────────────────────────
create table if not exists lead_sync_issues (
  id bigserial primary key,
  lead_id uuid, blob_id text,
  kind text not null,      -- missing_in_table | missing_in_blob | field_mismatch | write_failed
  field text, blob_value text, table_value text, detail text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz, resolution text
);
create index if not exists lead_sync_issues_open_idx on lead_sync_issues (detected_at desc)
  where resolved_at is null;

alter table leads                     enable row level security;
alter table lead_events               enable row level security;
alter table lead_touches              enable row level security;
alter table lead_soc_steps            enable row level security;
alter table lead_sync_issues          enable row level security;
alter table lead_stages               enable row level security;
alter table lead_operational_statuses enable row level security;
alter table lead_outcomes             enable row level security;
alter table lead_outcome_reasons      enable row level security;
alter table lead_programs             enable row level security;
alter table lead_soc_pathways         enable row level security;
alter table lead_soc_legacy_map       enable row level security;
-- No policies. Service role only, as everywhere else in this project.
