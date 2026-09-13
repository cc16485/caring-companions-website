// Caring Companions Core — concept review API
// -----------------------------------------------------------------------------
// The control surface for governing a concept. Everything a person can decide
// about CDS Eligibility passes through here.
//
// WHAT THIS FUNCTION DOES NOT DO, on purpose:
//   * it never approves anything on its own
//   * it never resolves a CONFLICTS or DIFFERENT_SCOPE relationship
//   * it never reads extraction_confidence in any decision path
//   * it never cascades an approved claim into an approved answer
//
// The database guards are the enforcement. This function's job is to carry a
// person's decision to them and to report a refusal in language worth reading,
// because a guard that fires with "error 23514" teaches nobody anything.
//
// DEPLOY: supabase functions deploy concept-api --project-ref zngsgedlsxinbygwmxwn
//
// ACTIONS
//   get           { concept_id }                     everything the review screen shows
//   list          {}                                 concepts awaiting review, most urgent first
//   approve_claims{ concept_id, refs[], actor }      approve named claims, nothing else
//   edit_claim    { ref, concept_id, text, actor, note }
//   set_claim     { ref, concept_id, status, actor, note }   reject / needs_research / withhold
//   resolve       { ref, concept_id, outcome, actor, note }  settle a dispute, explicitly
//   decide_merge  { merge_id, status, actor }
//   approve_answer{ concept_id, audience, actor }
//   set_concept   { concept_id, status, actor }
//   history       { concept_id }
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    ? ['message','details','hint','code'].map((k)=>((e as any)[k]?`${(e as any)[k]}`:null)).filter(Boolean).join(' | ')
      || JSON.stringify(e).slice(0,600)
    : String(e)

/**
 * A guard refusing is a normal outcome, not a crash.
 *
 * Postgres raises check_violation (23514) when one of the answer, audience or
 * verification guards refuses. Those messages are written for a person, so they
 * are passed through intact rather than flattened into "save failed".
 */
function refusal(e: unknown): string | null {
  const o = e as Record<string, unknown>
  const code = String(o?.code ?? '')
  const msg = String(o?.message ?? '')
  if (code === '23514' || /cannot include claim|cannot be marked verified|cannot be approved while/.test(msg))
    return msg.replace(/^ERROR:\s*/, '')
  return null
}

const CLAIM_STATUS = ['proposed','approved','rejected','needs_research','withheld','needs_reverification']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let b: Record<string, any> = {}
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  const sb = db()
  const action = String(b.action ?? '')
  const actor = String(b.actor ?? 'samantha').slice(0, 80)
  const cid = String(b.concept_id ?? '')

  try {
    // ── get: one call returns everything the screen renders ────────────────
    // Assembled here so the screen stays a display layer with no opinion about
    // what any of it means.
    if (action === 'get') {
      const { data: concept, error: ce } = await sb.from('kb_concepts').select('*').eq('id', cid).single()
      if (ce) throw new Error('Could not load that concept. ' + errText(ce))

      const { data: claims } = await sb.from('kb_claims').select('*').eq('concept_id', cid).order('ref')
      const ids = (claims ?? []).map((c: any) => c.id)

      const { data: evidence } = ids.length
        ? await sb.from('kb_claim_evidence').select('*').in('claim_id', ids).order('id')
        : { data: [] as any[] }

      // Documents and publications, so the screen can show who published a
      // thing and when without a second round trip.
      const docIds = [...new Set((evidence ?? []).map((e: any) => e.document_id).filter(Boolean))]
      const { data: docs } = docIds.length
        ? await sb.from('kb_source_library').select('*').in('id', docIds)
        : { data: [] as any[] }

      const [{ data: answers }, { data: questions }, { data: gaps },
             { data: merges }, { data: attention }, { data: review }] = await Promise.all([
        sb.from('kb_answers').select('*').eq('concept_id', cid),
        sb.from('kb_questions').select('*').eq('concept_id', cid).order('register').order('id'),
        sb.from('kb_gaps').select('*').eq('concept_id', cid).order('id'),
        sb.from('kb_merge_proposals').select('*').eq('concept_id', cid).order('id'),
        sb.from('kb_concept_attention').select('*').eq('id', cid).order('rank'),
        sb.from('kb_concept_review').select('*').eq('id', cid).single(),
      ])

      const { data: history } = ids.length
        ? await sb.from('kb_claim_history').select('*').in('claim_id', ids).order('at', { ascending: false }).limit(200)
        : { data: [] as any[] }

      // Attach evidence to its claim, and the document behind each piece.
      const byDoc = Object.fromEntries((docs ?? []).map((d: any) => [d.id, d]))
      const withEvidence = (claims ?? []).map((c: any) => ({
        ...c,
        evidence: (evidence ?? []).filter((e: any) => e.claim_id === c.id)
          .map((e: any) => ({ ...e, document: byDoc[e.document_id] ?? null })),
      }))

      return json({
        concept, review, attention: attention ?? [],
        claims: withEvidence,
        answers: answers ?? [], questions: questions ?? [],
        gaps: gaps ?? [], merges: merges ?? [], history: history ?? [],
      })
    }

    // ── list: the review queue, most urgent first ──────────────────────────
    if (action === 'list') {
      const { data, error } = await sb.from('kb_concept_review').select('*')
        .order('priority').order('name')
      if (error) throw error
      return json({ concepts: data ?? [] })
    }

    // ── approve_claims: only the refs named, nothing swept in ──────────────
    // The caller must list what it wants approved. There is no "approve the
    // rest" shortcut here, because the screen's job is to show exactly what a
    // click covers and this is the half that has to keep that promise.
    if (action === 'approve_claims') {
      const refs = (Array.isArray(b.refs) ? b.refs : []).map(String)
      if (!cid || !refs.length) return json({ error: 'concept_id and refs are required' }, 400)

      const { data: claims, error: le } = await sb.from('kb_claims')
        .select('id, ref, relationship, status, proposed_audience')
        .eq('concept_id', cid).in('ref', refs)
      if (le) throw le

      // A disputed claim is never approved in bulk, whatever the caller asked.
      const disputed = (claims ?? []).filter((c: any) =>
        ['CONFLICTS','DIFFERENT_SCOPE'].includes(c.relationship) && ['proposed','needs_research'].includes(c.status))
      if (disputed.length)
        return json({ ok: false, refused:
          `These are still disputed and have to be settled one at a time, not approved in a batch: `
          + disputed.map((d: any) => d.ref).join(', ') })

      const approvable = (claims ?? []).filter((c: any) => !disputed.includes(c))
      const now = new Date().toISOString()
      const done: string[] = []
      for (const c of approvable) {
        const { error } = await sb.from('kb_claims').update({
          status: 'approved',
          // The audience becomes effective only when a person approves it.
          effective_audience: c.proposed_audience,
          reviewed_by: actor, reviewed_at: now,
          review_note: b.note ?? null,
        }).eq('id', c.id)
        if (error) { const r = refusal(error); if (r) return json({ ok: false, refused: r }); throw error }
        done.push(c.ref)
      }
      return json({ ok: true, approved: done, count: done.length })
    }

    // ── edit_claim ─────────────────────────────────────────────────────────
    if (action === 'edit_claim') {
      const text = String(b.text ?? '').trim()
      if (!text) return json({ error: 'text is required' }, 400)
      const { error } = await sb.from('kb_claims').update({
        text, reviewed_by: actor, reviewed_at: new Date().toISOString(),
        review_note: b.note ?? 'Wording edited during review.',
      }).eq('concept_id', cid).eq('ref', String(b.ref))
      if (error) throw error
      return json({ ok: true })
    }

    // ── set_claim: reject, needs_research, withhold ────────────────────────
    if (action === 'set_claim') {
      const status = String(b.status ?? '')
      if (!CLAIM_STATUS.includes(status)) return json({ error: 'unknown status' }, 400)
      if (status === 'approved')
        return json({ error: 'Use approve_claims, so the audience is set and the batch is explicit.' }, 400)
      const { error } = await sb.from('kb_claims').update({
        status, reviewed_by: actor, reviewed_at: new Date().toISOString(), review_note: b.note ?? null,
      }).eq('concept_id', cid).eq('ref', String(b.ref))
      if (error) throw error
      return json({ ok: true })
    }

    // ── resolve: settle a dispute, as an explicit human act ────────────────
    // The AI proposed the relationship. Only this call changes it, and only
    // with a person's name attached.
    if (action === 'resolve') {
      const outcome = String(b.outcome ?? '')
      const patch: Record<string, unknown> = {
        reviewed_by: actor, reviewed_at: new Date().toISOString(),
        review_note: b.note ?? null,
      }
      if (outcome === 'different_scope') {
        // Both statements stand; they cover different circumstances.
        patch.relationship = 'DIFFERENT_SCOPE'; patch.status = 'approved'
      } else if (outcome === 'conflict') {
        // A real contradiction. The claim is held out of answers until the
        // source is clarified, and it is not deleted.
        patch.relationship = 'CONFLICTS'; patch.status = 'withheld'
      } else if (outcome === 'needs_research') {
        patch.status = 'needs_research'
      } else if (outcome === 'reject') {
        patch.status = 'rejected'
      } else {
        return json({ error: 'outcome must be different_scope, conflict, needs_research or reject' }, 400)
      }
      if (!b.note) return json({ error: 'A note is required when settling a dispute. Six months from now the reason is the only thing that will matter.' }, 400)

      const { error } = await sb.from('kb_claims').update(patch)
        .eq('concept_id', cid).eq('ref', String(b.ref))
      if (error) throw error
      return json({ ok: true })
    }

    // ── decide_merge ───────────────────────────────────────────────────────
    if (action === 'decide_merge') {
      const status = String(b.status ?? '')
      if (!['confirmed','rejected'].includes(status)) return json({ error: 'status must be confirmed or rejected' }, 400)
      const { error } = await sb.from('kb_merge_proposals').update({
        status, decided_by: actor, decided_at: new Date().toISOString(),
      }).eq('id', Number(b.merge_id))
      if (error) throw error
      return json({ ok: true })
    }

    // ── approve_answer: separate from approving claims, always ─────────────
    if (action === 'approve_answer') {
      const audience = String(b.audience ?? '')
      const { data: ans, error: ae } = await sb.from('kb_answers').select('id')
        .eq('concept_id', cid).eq('audience', audience).single()
      if (ae) throw new Error('No such answer to approve. ' + errText(ae))
      const { error } = await sb.from('kb_answers').update({
        status: 'approved', approved_by: actor, approved_at: new Date().toISOString(),
      }).eq('id', ans.id)
      if (error) { const r = refusal(error); if (r) return json({ ok: false, refused: r }); throw error }
      return json({ ok: true })
    }

    // ── set_concept ────────────────────────────────────────────────────────
    if (action === 'set_concept') {
      const status = String(b.status ?? '')
      if (!['proposed','partially_verified','verified','held'].includes(status))
        return json({ error: 'unknown status' }, 400)
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
      if (status === 'verified' || status === 'partially_verified') {
        patch.verified_by = actor
        patch.verified_on = new Date().toISOString().slice(0, 10)
      }
      const { error } = await sb.from('kb_concepts').update(patch).eq('id', cid)
      if (error) { const r = refusal(error); if (r) return json({ ok: false, refused: r }); throw error }
      return json({ ok: true })
    }

    // ── history ────────────────────────────────────────────────────────────
    if (action === 'history') {
      const { data: ids } = await sb.from('kb_claims').select('id').eq('concept_id', cid)
      const list = (ids ?? []).map((r: any) => r.id)
      if (!list.length) return json({ history: [] })
      const { data, error } = await sb.from('kb_claim_history').select('*')
        .in('claim_id', list).order('at', { ascending: false }).limit(500)
      if (error) throw error
      return json({ history: data ?? [] })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    const r = refusal(err)
    if (r) return json({ ok: false, refused: r })
    console.error('concept-api', action, err)
    return json({ error: 'concept_api_failed', detail: errText(err) }, 500)
  }
})
