// Caring Companions Core — Knowledge API
// -----------------------------------------------------------------------------
// The contract layer. Cara talks to THIS, never to the tables and never to
// "Caring Companions Core.html". Everything that integrates later (the website,
// the training platform, HomeTogether Hire, HomeTogether TV) uses this same
// endpoint, so none of them has to learn how knowledge is stored.
//
// DEPLOY:
//   supabase functions deploy knowledge-api --project-ref zngsgedlsxinbygwmxwn
//   (needs no extra secrets; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
//    injected automatically)
//
// CONTRACT
//   POST { action: "search", question, audience?, channel? }
//     -> { decision, records, conflict, withheld, reason }
//        `decision` is one of ok | conflict | withheld | none.
//        Records returned are ALREADY filtered to what the caller is allowed to
//        say. A caller cannot accidentally receive an unverified record.
//
//   POST { action: "log", question, outcome, records, conflict, withheld, reply, channel?, session_id? }
//     -> { ok: true, id }
//
//   POST { action: "get", ids: ["N001"] }   -> { records }
//   POST { action: "health" }               -> counts by status and audience
//
// The API never returns an unverified record to a public caller. That rule
// lives here rather than in each consumer, so a future integration cannot get
// it wrong by forgetting.
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decide } from '../_shared/knowledge-policy.js'
import { requireServiceOrCore } from '../_shared/require-core.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

// Shape a database row into what the policy module and callers expect.
// deno-lint-ignore no-explicit-any
const shape = (r: any) => ({
  id: r.id,
  question: r.question,
  answer: r.answer,
  answer_key: r.answer_key,
  topics: r.topics ?? [],
  // Retrieval-only fields. They widen what can be FOUND, never what may be SAID.
  aliases: r.aliases ?? [],
  alt_questions: r.alt_questions ?? [],
  phrases: r.phrases ?? [],
  status: r.status,
  audience: r.audience,
  confidence: r.confidence,
  conservative: r.conservative,
  verified_on: r.verified_on,
  verified_by: r.verified_by,
  version: r.version,
  source_name: r.kb_sources?.name ?? 'Unknown source',
  source_id: r.source_id,
})

const SELECT = '*, kb_sources(name)'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_json' }, 400)
  }
  const action = String(body.action ?? '')

  // This function had NO authorisation check. Deployed with the default
  // verify_jwt, it accepted the public anon key — the one printed in the
  // website and in Core's own page — so anyone could read internal records.
  // Confirmed exploitable against the live project before this was added.
  const gate = await requireServiceOrCore(req)
  if (gate.error) return json({ error: gate.error }, gate.status)

  const db = admin()

  try {
    // ── search ───────────────────────────────────────────────────────────────
    if (action === 'search') {
      const question = String(body.question ?? '').slice(0, 2000)
      const audience = (body.audience === 'internal' && gate.trusted) ? 'internal' : 'public'
      if (!question.trim()) return json({ error: 'question_required' }, 400)

      // Pull the candidate set wide, then let the policy module do the deciding.
      // Filtering in SQL would hide WHY something was excluded, and the caller
      // needs to know the difference between "we have nothing" and "we have
      // something we are not allowed to say".
      const { data, error } = await db.from('kb_items').select(SELECT).limit(200)
      if (error) throw error

      const records = (data ?? []).map(shape)
      const d = decide(records, question, { audience })

      return json({
        decision: d.decision,
        records: d.records,
        conflict: d.conflict,
        withheld: d.withheld,
        reason: d.reason,
      })
    }

    // ── log ──────────────────────────────────────────────────────────────────
    if (action === 'log') {
      // deno-lint-ignore no-explicit-any
      const recs: any[] = Array.isArray(body.records) ? body.records : []
      const row = {
        channel: String(body.channel ?? 'cara').slice(0, 40),
        question: String(body.question ?? '').slice(0, 4000),
        outcome: String(body.outcome ?? 'none'),
        item_ids: recs.map((r) => r.id),
        item_versions: recs.map((r) => r.version ?? 1),
        sources: recs.map((r) => r.source_name ?? ''),
        verified_on: recs.map((r) => r.verified_on).filter(Boolean),
        withheld_ids: Array.isArray(body.withheld)
          // deno-lint-ignore no-explicit-any
          ? (body.withheld as any[]).map((w) => w.id).filter(Boolean)
          : [],
        conflict: body.conflict ?? null,
        reply: String(body.reply ?? '').slice(0, 8000),
        session_id: body.session_id ? String(body.session_id).slice(0, 80) : null,
      }
      const { data, error } = await db.from('kb_answer_log').insert(row).select('id').single()
      if (error) throw error
      return json({ ok: true, id: data?.id })
    }

    // ── get ──────────────────────────────────────────────────────────────────
    if (action === 'get') {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 50)
      if (!ids.length) return json({ records: [] })
      const { data, error } = await db.from('kb_items').select(SELECT).in('id', ids)
      if (error) throw error
      return json({ records: (data ?? []).map(shape) })
    }

    // ── health ───────────────────────────────────────────────────────────────
    if (action === 'health') {
      const { data, error } = await db.from('kb_items').select('status, audience')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        const k = `${r.status}/${r.audience}`
        counts[k] = (counts[k] ?? 0) + 1
      }
      const total = (data ?? []).length
      const verifiedPublic = (data ?? []).filter(
        (r) => r.status === 'verified' && r.audience === 'public',
      ).length
      return json({ total, verified_public: verifiedPublic, counts })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    console.error('knowledge-api', action, err)
    return json({ error: 'knowledge_api_failed' }, 500)
  }
})
