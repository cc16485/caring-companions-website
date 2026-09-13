// Caring Companions Core — extraction
// -----------------------------------------------------------------------------
// SOURCE → AI EXTRACTION → PROPOSED KNOWLEDGE → HUMAN REVIEW → VERIFIED RECORD
//
// This function performs the second arrow only. It writes to kb_candidates and
// can never write to kb_items. Promotion is a separate, human act.
//
// THE GOVERNING RULE, and the reason this is safe:
//
//   Questions may be generated freely.
//   Answers may be generated ONLY from the cited passage.
//
// Broad question coverage, narrow answer authority. A question we cannot answer
// from the source is not an answer with hedging, it is a Knowledge Gap.
//
// DEPLOY: supabase functions deploy extract-api --project-ref zngsgedlsxinbygwmxwn
// SECRET: ANTHROPIC_API_KEY (already set)
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sourceStanding, guardCandidate } from '../_shared/candidate-guard.js'
import { requireCoreUser, actorOf } from '../_shared/require-core.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const errText = (e: unknown): string =>
  e instanceof Error ? e.message
  : (e && typeof e === 'object')
    ? ['message','details','hint','code'].map((k)=>((e as any)[k]?`${k}: ${(e as any)[k]}`:null)).filter(Boolean).join(' | ') || JSON.stringify(e).slice(0,600)
    : String(e)

const SYSTEM = `You extract structured knowledge from authoritative healthcare policy sources for a Missouri home care agency.

You are given ONE passage from ONE source document. You produce proposed knowledge records for human review. Nothing you produce is published or treated as true until a person approves it.

THE RULE THAT GOVERNS EVERYTHING:
Questions may be generated freely. Answers may be generated ONLY from the passage provided.
If the passage does not support an answer, the question belongs in "gaps", never in a record with a hedged answer.

FIND EVERY DISTINCT ITEM IN THE PASSAGE. A passage often contains several independent rules. Do not stop at one. Look specifically for:
- rules and requirements
- eligibility criteria
- exclusions and exceptions
- deadlines and timing
- documentation requirements
- forms and systems involved (FUSION, AxisCare, CMS-1500, portals)
- who is responsible
- what is prohibited
- escalation conditions
- program terminology and abbreviations that should be defined

FOR EACH RULE, generate MANY realistic questions, not one. Include:
- family language ("Can Mom get this?", "Does Medicaid pay my daughter?")
- staff and office language ("What do I document for a CDS reassessment?")
- owner and leadership language ("What is our exposure if this lapses?")
- alternate wording and abbreviations (CDS / Consumer Directed Services / consumer-directed)
- vague phrasing ("Can I get help at home?")
- scenario questions ("Mom is in the hospital, what happens to her CDS hours?")
- common misspellings only where genuinely useful (medicad, medicaide)

KNOWLEDGE TYPE, chosen carefully, because conflating these is a compliance risk:
- external_rule: the state, CMS, VA or a carrier requires this
- company_procedure: how Caring Companions complies operationally
- company_policy: a Caring Companions decision, never to be presented as a government requirement
- case_precedent: how one specific situation was actually handled once, with the outcome. Anonymised, never naming a consumer, attendant or employee. Use this ONLY when the passage recounts a particular episode rather than stating a standing rule. A precedent is evidence of what we did, not proof of what we must do.
- definition: terminology or an abbreviation
A state manual almost always yields external_rule or definition. Do not label something a company procedure unless the passage is a company document.

SOURCE APPROVAL STATE, given to you as APPROVAL below:
- approved, or an external publication: extract normally.
- draft: this is company material nobody has approved. You may still extract from it, and everything you extract is a PROPOSAL about what we intend, not a statement of settled procedure. Do not phrase an answer as though the practice is established. Cap confidence at 70, because the ceiling is the document's standing, not your reading of it. Never emit company_policy from a draft: an unapproved document cannot establish a company decision. Use company_procedure and let the reviewer decide.

SOURCE SENSITIVITY, given to you as SENSITIVITY below:
- public: audience_suggestion may be public or internal, on the merits.
- internal, confidential or restricted: audience_suggestion MUST be internal. Nothing derived from a closely held document is ever suggested for a family-facing answer, however harmless the sentence looks on its own. This is also enforced in code after you answer, so a mistake here is caught rather than published, but get it right.

ANSWER STYLE: plain, warm, direct. Sentence case. No markdown. Never use em dashes, use commas or periods. State limits and exceptions plainly rather than softening them. If the passage gives a number, a deadline or a form name, include it exactly.

CONFIDENCE: how directly the passage supports the answer. 90+ the passage states it explicitly. 70-89 it is clearly implied. Below 70 you are interpreting, and you should probably put it in gaps instead.

COVERAGE PASS: after drafting, ask what a reasonable person would still want to know about this passage that you have NOT covered. Add those to "gaps" with a reason. Do not invent answers to close them.

Return ONLY valid JSON, no prose outside it:
{
  "records": [{
    "question": "the clearest single phrasing",
    "alt_questions": ["at least 6, spanning family, staff and leadership phrasing"],
    "answer": "plain English, supported entirely by the passage",
    "conditions": ["important conditions, exceptions or limits, may be empty"],
    "knowledge_type": "external_rule|company_procedure|company_policy|case_precedent|definition",
    "programs": ["CDS","IHS","GUIDE","VA","LTCI","private_pay"],
    "supporting_passage": "the exact sentences from the passage that support this answer, quoted verbatim",
    "confidence": 0-100,
    "audience_suggestion": "public|internal"
  }],
  "gaps": [{ "question": "a reasonable question this passage raises but does not answer",
             "why": "what is missing and where it might live" }],
  "terminology": [{ "term": "CDS", "expansion": "Consumer Directed Services" }]
}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let b: Record<string, any> = {}
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  // Same gate as source-api. Extraction spends money on model calls, so an
  // unauthenticated caller here is a bill as well as a data exposure.
  const gate = await requireCoreUser(req)
  if (gate.error) return json({ error: gate.error }, gate.status)
  const actor = actorOf(gate.user)

  const sb = db()

  try {
    // ── extract: draft candidates from one or more sections. Writes ONLY to
    //    kb_candidates. Has no code path that touches kb_items. ────────────────
    if (b.action === 'extract') {
      const docId = Number(b.document_id)
      const only = Array.isArray(b.ordinals) ? b.ordinals.map(Number) : null

      const { data: doc, error: de } = await sb.from('kb_source_library').select('*').eq('id', docId).single()
      if (de) throw new Error('Could not load the source. ' + errText(de))

      let q = sb.from('kb_source_chunks').select('id, ordinal, heading, text').eq('document_id', docId).order('ordinal')
      if (only) q = q.in('ordinal', only)
      const { data: chunks, error: ce } = await q
      if (ce) throw new Error('Could not load the sections. ' + errText(ce))
      if (!chunks?.length) return json({ error: 'That source has no indexed sections to extract from.' }, 400)

      // What this document's standing permits a proposal to claim. The rules
      // live in _shared/candidate-guard.js so they can be tested without a
      // database or a model.
      const standing = sourceStanding(doc)
      const { approval, sensitivity } = standing
      const clamped: string[] = []

      // A chunk that already produced candidates is DONE, whatever their review
      // status. The first live run hit the gateway timeout (504) partway
      // through: the response died but the function kept writing, so a blind
      // retry would draft the early sections twice and the reviewer would see
      // every rule as its own duplicate. Skipping drafted chunks makes retry
      // and section-at-a-time calls idempotent.
      const { data: done, error: dne } = await sb.from('kb_candidates')
        .select('chunk_id').eq('document_id', docId)
      if (dne) throw new Error('Could not check for earlier drafts. ' + errText(dne))
      const drafted = new Set((done ?? []).map((r: any) => r.chunk_id))

      const results: any[] = []
      for (const c of chunks.slice(0, 12)) {
        if (drafted.has(c.id)) {
          results.push({ ordinal: c.ordinal, heading: c.heading, skipped: 'already drafted' })
          continue
        }
        const context =
          `SOURCE: ${doc.publication_title || doc.title}\n` +
          `PUBLISHER: ${doc.publisher || 'unknown'} (authority: ${doc.authority || 'unknown'})\n` +
          `APPROVAL: ${approval}\n` +
          `SENSITIVITY: ${sensitivity}\n` +
          `PROGRAMS: ${(doc.programs || []).join(', ') || 'unspecified'}\n` +
          `SECTION: ${c.heading || 'untitled'}\n` +
          `VERSION: ${doc.publisher_revision || 'publisher states none'}\n\n` +
          `PASSAGE:\n${(c.text || '').slice(0, 14000)}`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
                     'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 16000, system: SYSTEM,
                                 messages: [{ role: 'user', content: context }] }),
        })
        if (!res.ok) throw new Error(`Anthropic API ${res.status} on section ${c.ordinal}`)
        const data = await res.json()
        // Take the first TEXT block, not the first block. A response can lead
        // with a non-text block, and content[0].text is then undefined, which
        // reads as "the model returned nothing" when it returned plenty.
        const raw = (Array.isArray(data.content)
          ? (data.content.find((x: any) => x?.type === 'text')?.text ?? '')
          : '') as string
        if (!raw) {
          results.push({ ordinal: c.ordinal, heading: c.heading,
            error: 'The response contained no text block.',
            block_types: Array.isArray(data.content) ? data.content.map((x: any) => x?.type) : 'not an array',
            stop_reason: data.stop_reason ?? null })
          continue
        }
        let parsed: any
        try {
          parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim())
        } catch (pe) {
          // Keep the evidence. "Did not return usable JSON" is the same
          // information-free failure that has cost hours tonight: the raw text
          // is the only thing that says whether it was truncated, wrapped in
          // prose, or refused.
          const looksTruncated = raw.length > 500 && !raw.trimEnd().endsWith('}')
          results.push({
            ordinal: c.ordinal, heading: c.heading,
            error: looksTruncated
              ? `The response was cut off at ${raw.length} characters, so the JSON was incomplete. The section is probably too large to extract in one pass.`
              : `The model did not return usable JSON. ${errText(pe)}`,
            raw_head: raw.slice(0, 300),
            raw_tail: raw.slice(-300),
            raw_length: raw.length,
          })
          continue
        }

        // Persist as candidates. Never as knowledge.
        //
        // The clamps below are enforcement, not tidying. The prompt asks for the
        // same things, and a prompt is a request. These are the guarantee:
        //   - nothing from a closely held source is ever suggested for families
        //   - a draft cannot establish company policy, only propose procedure
        //   - a confidence from a draft cannot exceed the document's standing
        //   - an unrecognised knowledge_type is corrected rather than rejected
        //     by the database, which would lose the whole batch
        const rows = (parsed.records || []).map((r: any) => {
          const g = guardCandidate(r, standing)
          for (const a of g.applied) clamped.push(`${c.ordinal}: ${a}`)

          return {
            source_id: null, document_id: docId, chunk_id: c.id,
            proposed_question: String(r.question || '').slice(0, 500),
            proposed_answer: String(r.answer || '').slice(0, 4000),
            alt_questions: Array.isArray(r.alt_questions) ? r.alt_questions.slice(0, 20) : [],
            conditions: Array.isArray(r.conditions) ? r.conditions.slice(0, 12) : [],
            knowledge_type: g.knowledge_type,
            programs: Array.isArray(r.programs) ? r.programs : (doc.programs || []),
            supporting_passage: String(r.supporting_passage || '').slice(0, 4000),
            extraction_confidence: g.extraction_confidence,
            audience_suggestion: g.audience_suggestion,
            review_note: g.review_note,
            section_heading: c.heading, status: 'proposed',
          }
        })
        if (rows.length) {
          const { error: ie } = await sb.from('kb_candidates').insert(rows)
          if (ie) throw new Error('Saving the proposed records failed. ' + errText(ie))
        }
        for (const g of (parsed.gaps || []).slice(0, 20)) {
          await sb.from('kb_gaps').insert({
            question: String(g.question || '').slice(0, 500),
            why: String(g.why || '').slice(0, 1000),
            document_id: docId, chunk_id: c.id, origin: 'extraction',
          })
        }
        results.push({ ordinal: c.ordinal, heading: c.heading,
                       records: rows.length, gaps: (parsed.gaps || []).length,
                       terminology: parsed.terminology || [] })
      }
      return json({ ok: true, document: doc.title,
                    source_approval: approval, source_sensitivity: sensitivity,
                    sections_processed: results.length, results,
                    clamped })
    }

    // ── candidates: the review batch ─────────────────────────────────────────
    if (b.action === 'candidates') {
      let q = sb.from('kb_candidates').select('*').order('id')
      if (b.document_id) q = q.eq('document_id', Number(b.document_id))
      if (b.status) q = q.eq('status', String(b.status))
      const { data, error } = await q
      if (error) throw new Error(errText(error))
      return json({ candidates: data ?? [] })
    }

    // ── decide: the human act this whole pipeline exists to reach ────────────
    // kb_candidates has carried status, reviewed_by, reviewed_at, review_note
    // and promoted_item_id since the beginning, and nothing ever wrote to any
    // of them. Extraction could propose forever and no proposal could become a
    // record. This is that missing step.
    //
    // The work happens in kb_promote_candidate / kb_close_candidate so that it
    // is one transaction. This handler only translates.
    //
    // `actor` comes from the verified session, never from the request body. A
    // reviewer must not be able to sign someone else's name to a verification.
    if (b.action === 'decide') {
      const id = Number(b.candidate_id)
      if (!Number.isFinite(id)) return json({ error: 'Which candidate? candidate_id was missing or not a number.' }, 400)

      const decision = String(b.decision ?? '')
      const note = typeof b.note === 'string' ? b.note : null

      if (decision === 'approve') {
        // Nulls mean "keep what the AI proposed". Only send through what the
        // reviewer actually changed, so an untouched field cannot be
        // accidentally overwritten with a stale copy from the screen.
        const { data, error } = await sb.rpc('kb_promote_candidate', {
          p_candidate_id: id,
          p_actor: actor,
          p_question: typeof b.question === 'string' ? b.question : null,
          p_answer: typeof b.answer === 'string' ? b.answer : null,
          p_alt_questions: Array.isArray(b.alt_questions) ? b.alt_questions.map(String) : null,
          p_audience: typeof b.audience === 'string' ? b.audience : null,
          p_note: note,
        })
        if (error) return json({ error: errText(error) }, 400)
        return json({ ok: true, decision: 'approve', item_id: data, reviewed_by: actor })
      }

      if (decision === 'reject' || decision === 'needs_clarification') {
        const { error } = await sb.rpc('kb_close_candidate', {
          p_candidate_id: id,
          p_actor: actor,
          p_status: decision === 'reject' ? 'rejected' : 'needs_clarification',
          p_note: note,
        })
        if (error) return json({ error: errText(error) }, 400)
        return json({ ok: true, decision, reviewed_by: actor })
      }

      return json({ error: 'decision must be approve, reject or needs_clarification.' }, 400)
    }

    // ── gaps ─────────────────────────────────────────────────────────────────
    if (b.action === 'gaps') {
      const { data, error } = await sb.from('kb_gaps').select('*').order('id', { ascending: false })
      if (error) throw new Error(errText(error))
      return json({ gaps: data ?? [] })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    console.error('extract-api', err)
    return json({ error: 'extract_api_failed', detail: errText(err) }, 500)
  }
})
