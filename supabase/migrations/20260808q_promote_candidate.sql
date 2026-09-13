-- =============================================================================
-- Caring Companions Core — promoting a reviewed candidate into a real record
--
-- The extraction pipeline could produce candidates and list them, but nothing
-- could ever approve one. kb_candidates had status, reviewed_by, reviewed_at,
-- review_note and promoted_item_id, and not one line of code wrote to any of
-- them. This is the missing act.
--
-- WHY THIS IS A DATABASE FUNCTION AND NOT THREE CALLS FROM THE EDGE FUNCTION
--
-- Promotion is four writes: mint an id, insert the record, record its first
-- version, link it to the document it came from, then mark the candidate. Done
-- from the outside, a failure halfway leaves either a verified record nobody
-- approved or an approved candidate with no record. Both are worse than
-- failing. In here it is one transaction: all of it, or none of it.
--
-- WHAT APPROVAL MEANS
--
-- A human approving a candidate IS verification. That is the whole point of the
-- pipeline, so the new record lands as status='verified' with verified_by set
-- to the actual person. Nothing else in the system may set that.
--
-- Additive and safe to re-run.
-- =============================================================================

-- ── Minting the next human-quotable id ───────────────────────────────────────
-- kb_items.id is text like 'N001' because people quote it out loud and paste it
-- into emails. A bigserial would not survive that. Only ids matching N + digits
-- are considered, so a hand-written id like 'CDS-PAY' cannot break the count.
create or replace function kb_next_item_id()
returns text
language sql
stable
as $$
  select 'N' || lpad(
    (coalesce(max((substring(id from 2))::int), 0) + 1)::text, 3, '0')
  from kb_items
  where id ~ '^N[0-9]+$';
$$;

comment on function kb_next_item_id is
  'Next free N### id. Ignores ids that are not N followed by digits, so a hand-written id cannot corrupt the sequence.';


-- ── Bridging the two halves of the schema ────────────────────────────────────
-- The Source Library and the knowledge records grew separately and never met:
--
--   kb_publications → kb_source_documents → kb_source_chunks → kb_candidates
--   kb_sources      → kb_items
--
-- Nothing joined them, and extract-api writes source_id: null on every
-- candidate, so a promoted record had no way to satisfy kb_items.source_id,
-- which is NOT NULL. Rather than invent a placeholder source, this mirrors the
-- publication into kb_sources under the SAME id. The publication stays the
-- thing a person manages; kb_sources becomes the citation label Cara quotes.
create or replace function kb_source_for_publication(p_pub_id text)
returns text
language plpgsql
as $$
declare p kb_publications%rowtype; v_kind text;
begin
  if p_pub_id is null then return null; end if;
  select * into p from kb_publications where id = p_pub_id;
  if not found then return null; end if;

  -- kb_sources.kind is a much coarser vocabulary than source_type, so this is a
  -- deliberate narrowing, not a lossy accident: the detail stays on the
  -- publication and is not needed for a citation.
  v_kind := case
    when p.authority = 'company'                            then 'internal'
    when p.source_type in ('regulation','statute','policy')  then 'regulation'
    when p.authority = 'primary'                             then 'regulation'
    else 'vendor'
  end;

  -- A publication id is a slug of its title and a kb_sources id is hand-written
  -- ('S1', 'S3'), so a collision is unlikely but not impossible: add_pub lets a
  -- caller supply any id. Blindly upserting would RENAME an existing source and
  -- silently repoint every record already citing it. Refuse instead.
  if exists (
    select 1 from kb_sources s
     where s.id = p.id
       and coalesce(s.note,'') not like 'Mirrored from the Source Library publication%'
  ) then
    raise exception
      'Publication "%" collides with an existing hand-made source of the same id. Rename the publication. Nothing was changed.', p.id;
  end if;

  insert into kb_sources (id, name, note, kind)
  values (p.id, p.title, 'Mirrored from the Source Library publication ' || p.id || ' (' || p.publisher || ').', v_kind)
  on conflict (id) do update
    -- Only rows this function created. Keeps a retitled publication from
    -- leaving a stale citation, without ever touching a source a person owns.
    set name = excluded.name,
        kind = excluded.kind
    where kb_sources.note like 'Mirrored from the Source Library publication%'
  returning id into p_pub_id;

  return p.id;
end;
$$;

comment on function kb_source_for_publication is
  'Ensures a kb_sources row exists mirroring a Source Library publication, under the same id, and returns it. The bridge between the Source Library and the citations on knowledge records.';


-- ── answer_key: the thing that makes contradictions visible ──────────────────
-- kb_items.answer_key is how the policy module detects that two verified
-- records answer the SAME question differently. Promotion originally left it
-- null, and null defeats BOTH safety checks at once:
--
--   conflict:  byKey[r.answer_key || r.id]  → null falls back to the id, so two
--              contradictory records get different keys and never collide.
--   ambiguity: top[0].answer_key !== top[1].answer_key  → null !== null is
--              false, so that check does not fire either.
--
-- The result was the worst of the three: Cara receives both contradictory
-- records as a normal 'ok' answer, with nothing flagged. A verified record MUST
-- have a key.
--
-- This is a heuristic, and deliberately a blunt one. Sorting the significant
-- words means differently-worded questions about the same fact still miss each
-- other, and unrelated questions sharing vocabulary can collide. A false
-- conflict makes Cara flag something for a human; a missed conflict makes Cara
-- state a contradiction confidently. Only one of those is survivable.
--
-- The correct long-term answer is the reviewer saying "this replaces N005" on
-- screen. Until that exists, this is the floor, not the ceiling.
create or replace function kb_answer_key(p_question text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(array_to_string(
    array(
      select w from unnest(
        string_to_array(
          regexp_replace(lower(coalesce(p_question,'')), '[^a-z0-9 ]', ' ', 'g'),
          ' ')) as w
       where w <> ''
         and w not in ('a','an','the','is','are','do','does','did','can','could','will','would',
                       'i','my','me','we','our','you','your','it','of','for','to','in','on','at',
                       'be','been','get','got','have','has','if','and','or','as','that','this',
                       'what','when','who','how','why','which','there','their','they')
       order by w
    ), '-'), ''), 'q-' || md5(lower(coalesce(p_question,''))));
$$;

comment on function kb_answer_key is
  'A blunt, deterministic key for "these records answer the same question". Significant words, lowercased, deduped by sorting. Falls back to a hash when a question is all stopwords, so the column is never null.';


-- ── Promotion ────────────────────────────────────────────────────────────────
-- The edited_* arguments carry what the reviewer changed on screen. NULL means
-- "leave what the AI proposed". An empty string is NOT null and will be
-- rejected, because a blank answer is a mistake rather than an intention.
create or replace function kb_promote_candidate(
  p_candidate_id  bigint,
  p_actor         text,
  p_question      text    default null,
  p_answer        text    default null,
  p_alt_questions text[]  default null,
  p_audience      text    default null,
  p_note          text    default null
)
returns text
language plpgsql
as $$
declare
  c           kb_candidates%rowtype;
  v_id        text;
  v_question  text;
  v_answer    text;
  v_audience  text;
  v_alts      text[];
  v_source    text;
  v_doc_src   text;
begin
  if p_actor is null or btrim(p_actor) = '' then
    raise exception 'Refusing to promote without a named reviewer. Verification has to belong to a person.';
  end if;

  -- Serialise promotion. Two reviewers approving at the same moment would
  -- otherwise both read the same max id and collide on the primary key.
  perform pg_advisory_xact_lock(hashtext('kb_promote_candidate'));

  select * into c from kb_candidates where id = p_candidate_id for update;
  if not found then
    raise exception 'No candidate with id %.', p_candidate_id;
  end if;

  -- Only an untouched candidate may be promoted. This is what makes the button
  -- safe to double-click and safe to retry after a dropped connection.
  if c.status <> 'proposed' then
    raise exception 'Candidate % was already decided (status: %). Nothing was changed.',
      p_candidate_id, c.status;
  end if;

  v_question := coalesce(nullif(btrim(p_question), ''), c.proposed_question);
  v_answer   := coalesce(nullif(btrim(p_answer),   ''), c.proposed_answer);
  v_alts     := coalesce(p_alt_questions, c.alt_questions);
  v_audience := coalesce(nullif(btrim(p_audience), ''), c.audience_suggestion);

  if btrim(v_question) = '' or btrim(v_answer) = '' then
    raise exception 'A record needs both a question and an answer.';
  end if;
  if v_audience not in ('public','internal') then
    raise exception 'Audience must be public or internal, not "%".', v_audience;
  end if;

  -- kb_items.source_id is NOT NULL and references kb_sources. Candidates carry
  -- source_id: null (extract-api has always written null there), so it is
  -- resolved through the document's publication and mirrored across the bridge.
  v_source := nullif(btrim(coalesce(c.source_id, '')), '');

  if v_source is null and c.document_id is not null then
    select d.publication_id into v_doc_src
      from kb_source_documents d where d.id = c.document_id;
    v_source := kb_source_for_publication(v_doc_src);
  end if;

  if v_source is null then
    raise exception 'Candidate % cannot say which publication it came from, so an approved record could not cite anything.', p_candidate_id;
  end if;
  if not exists (select 1 from kb_sources s where s.id = v_source) then
    raise exception 'Candidate % resolved to source "%", which does not exist. Nothing was changed.', p_candidate_id, v_source;
  end if;

  v_id := kb_next_item_id();

  -- The record itself. Verified, because a person just verified it.
  --
  -- confidence is deliberately NOT the AI's extraction_confidence. They measure
  -- different things: extraction_confidence is how sure the model was that it
  -- read the passage correctly; kb_items.confidence is how much the COMPANY
  -- trusts the fact. Once a person has read the passage and approved it, the
  -- model's uncertainty is spent and no longer describes anything.
  --
  -- It also actively misleads: pickSafest() resolves a conflict by preferring
  -- the higher confidence, so storing 41 here would let a stale hand-seeded
  -- record at 90 outrank a fact a human verified this morning. The AI's number
  -- is kept on the version note, where it is history rather than authority.
  insert into kb_items (
    id, question, answer, answer_key, alt_questions, source_id,
    status, audience, confidence,
    verified_on, verified_by, version)
  values (
    v_id, v_question, v_answer, kb_answer_key(v_question), v_alts, v_source,
    'verified', v_audience, 90,
    current_date, p_actor, 1);

  -- NO version row is written here, deliberately. The kb_items_versioning
  -- trigger archives the OLD wording when a record later changes, so history
  -- rows record supersession, not birth. Writing version 1 at creation would
  -- collide with that: the first later edit would archive version 1 again and
  -- leave two rows claiming it. The birth record is the candidate row itself,
  -- which keeps the passage, the model's confidence and the review note.

  -- Provenance. A verified record that cannot name its document is not
  -- auditable, which is the entire reason the Source Library exists.
  if c.document_id is not null then
    insert into kb_document_knowledge (document_id, kb_item_id, chunk_id, approved_by)
    values (c.document_id, v_id, c.chunk_id, p_actor)
    on conflict (document_id, kb_item_id) do nothing;
  end if;

  update kb_candidates
     -- 'edited' means the CONTENT changed, not that a field arrived in the
     -- request. The rehearsal caught the difference: passing an empty string
     -- (meaning "keep the proposal") was being recorded as an edit.
     set status           = case when v_question is distinct from c.proposed_question
                                   or v_answer   is distinct from c.proposed_answer
                                   or v_audience is distinct from c.audience_suggestion
                                 then 'edited' else 'approved' end,
         reviewed_by      = p_actor,
         reviewed_at      = now(),
         review_note      = nullif(btrim(p_note), ''),
         promoted_item_id = v_id
   where id = p_candidate_id;

  return v_id;
end;
$$;

comment on function kb_promote_candidate is
  'Turns one reviewed candidate into a verified kb_item, its first version row, and its provenance link, in a single transaction. Refuses a candidate that was already decided, so retrying is safe.';


-- ── Closing a candidate without promoting it ─────────────────────────────────
-- Rejecting and asking for clarification are single-row updates, but they go
-- through a function too so that the same "already decided" guard applies and
-- the edge function cannot invent a status the check constraint would take.
create or replace function kb_close_candidate(
  p_candidate_id bigint,
  p_actor        text,
  p_status       text,
  p_note         text default null
)
returns void
language plpgsql
as $$
declare
  v_prev text;
begin
  if p_status not in ('rejected','needs_clarification') then
    raise exception 'kb_close_candidate handles rejected and needs_clarification. For approval use kb_promote_candidate.';
  end if;
  if p_actor is null or btrim(p_actor) = '' then
    raise exception 'Refusing to record a decision without a named reviewer.';
  end if;

  select status into v_prev from kb_candidates where id = p_candidate_id for update;
  if not found then
    raise exception 'No candidate with id %.', p_candidate_id;
  end if;
  if v_prev <> 'proposed' then
    raise exception 'Candidate % was already decided (status: %). Nothing was changed.', p_candidate_id, v_prev;
  end if;

  -- A rejection with no reason teaches nobody anything, and this queue exists
  -- partly to improve the extraction that fills it.
  if p_status = 'rejected' and nullif(btrim(coalesce(p_note,'')), '') is null then
    raise exception 'Say why it was rejected. The reason is what stops the same mistake being extracted again.';
  end if;

  update kb_candidates
     set status      = p_status,
         reviewed_by = p_actor,
         reviewed_at = now(),
         review_note = nullif(btrim(p_note), '')
   where id = p_candidate_id;
end;
$$;

comment on function kb_close_candidate is
  'Records a rejection or a request for clarification. Requires a reason for a rejection. Never touches kb_items.';


-- One row per (item, version). The trigger writes each version exactly once;
-- this makes any future code that thinks otherwise fail loudly instead of
-- quietly forking history.
create unique index if not exists kb_item_versions_item_version_key
  on kb_item_versions (item_id, version);

-- These are service-role only, same as every other kb_ function. The browser
-- reaches them through extract-api, which enforces Core access first.
revoke all on function kb_promote_candidate(bigint,text,text,text,text[],text,text) from public, anon, authenticated;
revoke all on function kb_close_candidate(bigint,text,text,text)                    from public, anon, authenticated;
revoke all on function kb_next_item_id()                                            from public, anon, authenticated;
revoke all on function kb_source_for_publication(text)                              from public, anon, authenticated;
revoke all on function kb_answer_key(text)                                          from public, anon, authenticated;
