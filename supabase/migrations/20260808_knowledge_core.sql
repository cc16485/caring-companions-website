-- =============================================================================
-- Caring Companions Core — knowledge layer
-- =============================================================================
-- Run once, in the Supabase SQL editor for project zngsgedlsxinbygwmxwn.
--
-- SAFETY NOTES, because this project is shared by three hubs:
--   * Every object here is new and prefixed kb_. Nothing existing is touched.
--   * No table is dropped. Re-running this file is safe.
--   * RLS is ON with no public policy, so ONLY the service role (edge
--     functions) can read or write. The browser cannot reach these tables.
--
-- What this is: the single place a fact lives. Everything else, Cara today and
-- the website, training and HomeTogether later, reads from here instead of
-- keeping its own copy.
-- =============================================================================

-- ── Sources: where an answer came from ───────────────────────────────────────
create table if not exists kb_sources (
  id          text primary key,
  name        text not null,
  note        text,
  kind        text not null default 'internal'   -- 'regulation' | 'internal' | 'clinical'
                check (kind in ('regulation','internal','clinical','vendor')),
  created_at  timestamptz not null default now()
);

-- ── Knowledge items: question, answer, evidence ──────────────────────────────
create table if not exists kb_items (
  id            text primary key,                 -- stable, human-quotable: 'N001'
  question      text not null,
  answer        text not null,
  answer_key    text,                             -- two records sharing this answer
                                                  -- the same question = a conflict
  source_id     text not null references kb_sources(id),
  topics        text[] not null default '{}',

  -- Trust. These four decide whether Cara may say it.
  status        text not null default 'unverified'
                  check (status in ('verified','unverified','stale','held')),
  audience      text not null default 'internal'
                  check (audience in ('public','internal')),
  confidence    int  not null default 50 check (confidence between 0 and 100),
  conservative  boolean not null default false,   -- prefer this one in a conflict

  verified_on   date,
  verified_by   text,

  -- Review tracks, kept separate because they are different questions.
  review_legal      text not null default 'na' check (review_legal in ('ok','need','na')),
  review_clinical   text not null default 'na' check (review_clinical in ('ok','need','na')),
  review_marketing  text not null default 'na' check (review_marketing in ('ok','need','na')),

  version       int not null default 1,           -- bumps on every answer change
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists kb_items_status_audience_idx on kb_items (status, audience);
create index if not exists kb_items_topics_idx on kb_items using gin (topics);

-- ── Version history: what it used to say, and why it changed ─────────────────
create table if not exists kb_item_versions (
  id          bigserial primary key,
  item_id     text not null references kb_items(id) on delete cascade,
  version     int  not null,
  question    text not null,
  answer      text not null,
  status      text not null,
  changed_by  text,
  change_note text,
  changed_at  timestamptz not null default now()
);
create index if not exists kb_item_versions_item_idx on kb_item_versions (item_id, version desc);

-- Bump the version and write history whenever an answer actually changes.
-- An audit trail nobody has to remember to write is the only kind that survives.
create or replace function kb_version_on_change() returns trigger
language plpgsql as $$
begin
  if (new.answer is distinct from old.answer) or (new.question is distinct from old.question) then
    new.version := old.version + 1;
    new.updated_at := now();
    insert into kb_item_versions (item_id, version, question, answer, status, changed_by, change_note)
    values (old.id, old.version, old.question, old.answer, old.status, new.verified_by, 'superseded');
  end if;
  return new;
end $$;

drop trigger if exists kb_items_versioning on kb_items;
create trigger kb_items_versioning before update on kb_items
  for each row execute function kb_version_on_change();

-- ── Answer log: what Cara said, and what she said it from ────────────────────
-- Requirement: every answer is auditable back to the exact record and version.
create table if not exists kb_answer_log (
  id            bigserial primary key,
  asked_at      timestamptz not null default now(),
  channel       text not null default 'cara',
  question      text not null,
  outcome       text not null                     -- 'answered' | 'conflict' | 'withheld' | 'none'
                  check (outcome in ('answered','conflict','withheld','none')),
  item_ids      text[]  not null default '{}',
  item_versions int[]   not null default '{}',
  sources       text[]  not null default '{}',
  verified_on   date[]  not null default '{}',
  withheld_ids  text[]  not null default '{}',
  conflict      jsonb,
  reply         text,
  session_id    text
);
create index if not exists kb_answer_log_asked_idx on kb_answer_log (asked_at desc);
create index if not exists kb_answer_log_outcome_idx on kb_answer_log (outcome);
create index if not exists kb_answer_log_items_idx on kb_answer_log using gin (item_ids);

-- ── Lock everything to the service role ──────────────────────────────────────
alter table kb_sources        enable row level security;
alter table kb_items          enable row level security;
alter table kb_item_versions  enable row level security;
alter table kb_answer_log     enable row level security;
-- No policies are created on purpose. With RLS on and no policy, anon and
-- authenticated get nothing. Edge functions use the service role, which
-- bypasses RLS. The knowledge layer is never reachable from a browser.

-- =============================================================================
-- SEED — real records only
-- =============================================================================
-- These are actual Caring Companions answers, not test fixtures. The pay rate
-- is seeded as 'stale' because that is genuinely its condition: it was last
-- confirmed in February and the training manual contradicts it. Cara will
-- refuse to quote it until somebody verifies it, which is correct behaviour,
-- not a bug to work around.
-- =============================================================================

insert into kb_sources (id, name, note, kind) values
  ('S1','Missouri Medicaid Manual','19 CSR 15-8, state regulation','regulation'),
  ('S3','Internal payroll policy','Ours, changes without notice','internal'),
  ('S5','HomeTogether pricing','tryhometogether.com','vendor'),
  ('S6','Employee handbook','Ours, legal reviewed','internal')
-- INSERT ONLY. See the note on kb_items below: a seed makes an empty database
-- usable and has no business overruling a row that already exists.
on conflict (id) do nothing;

insert into kb_items
  (id, question, answer, answer_key, source_id, topics, status, audience, confidence,
   conservative, verified_on, verified_by, review_legal, review_marketing)
values
  ('N001',
   'Can my daughter be my CDS caregiver?',
   'Sometimes. Missouri Consumer Directed Services can pay a family member as the attendant when the consumer is eligible for the program and directs their own care. A spouse cannot be paid as the attendant. Whether a particular daughter qualifies depends on the consumer''s eligibility, so it is worth a short call to check.',
   'cds_family_attendant','S1',
   array['cds','medicaid','attendant','family','daughter','caregiver'],
   'verified','public',92,true,'2026-08-01','Samantha','ok','ok'),

  ('N002',
   'What does a CDS attendant get paid?',
   '$14.00 per hour.',
   'cds_pay_rate','S3',
   array['cds','pay','rate','wage','attendant'],
   'stale','public',38,false,'2026-02-10','Samantha','na','need'),

  ('N003',
   'Who directs care under CDS?',
   'The consumer does. They hire, schedule, train and dismiss their own attendant. The vendor handles payroll and compliance, not supervision.',
   'cds_who_directs','S1',
   array['cds','medicaid','consumer','directs','supervision'],
   'verified','public',96,false,'2026-08-01','Samantha','ok','ok'),

  ('N004',
   'Can a spouse be paid as a CDS attendant?',
   'No. Under Missouri CDS a spouse cannot be paid as the attendant. Other family members may be able to.',
   'cds_spouse','S1',
   array['cds','medicaid','spouse','husband','wife','attendant'],
   'verified','public',95,true,'2026-08-01','Samantha','ok','ok'),

  ('N005',
   'What happens when a caregiver calls off?',
   'The coordinator confirms the call-off, checks the coverage board, offers the shift to the on-call list in seniority order, then calls the family with a name and an arrival time. Never leave a family without a call.',
   'calloff_procedure','S6',
   array['calloff','coverage','staffing','shift','scheduling'],
   'verified','internal',88,false,'2026-07-15','Samantha','ok','na'),

  ('N006',
   'What does HomeTogether TV cost?',
   'HomeTogether TV is $99 per month flat for the device and the service, with free shipping, a 30-day money-back guarantee, no contract, and you can cancel anytime.',
   'httv_price','S5',
   array['hometogether','tv','price','cost','device','monthly'],
   'verified','public',98,false,'2026-08-01','Samantha','ok','ok')
-- =============================================================================
-- INSERT ONLY. NEVER UPDATE. This is not a style preference.
-- =============================================================================
-- This previously read `on conflict (id) do update set ...`, which meant every
-- run of the installer reset these six records to the values written above.
-- The cost was visible and measurable: N001, N003 and N004 reached version 26,
-- because each run reverted them here and 20260808c re-applied its correction,
-- flipping the answer back and forth and writing a history row every time.
--
-- Once a person has verified a record, this file is the least informed thing
-- in the system about what it should say. A seed exists to make an empty
-- database usable. After the first run every record already exists, so there is
-- nothing left for it to do.
--
-- THE RULE FOR EVERY MIGRATION THAT FOLLOWS: a migration may CREATE, and may
-- CORRECT a specific known value it names explicitly. It may never RESTORE.
-- Enforced by migration-safety.test.mjs, which fails on an unguarded update.
-- =============================================================================
on conflict (id) do nothing;

-- Sanity check. Run this after and you should see 6 items, 4 public+verified.
-- select status, audience, count(*) from kb_items group by 1,2 order by 1,2;
