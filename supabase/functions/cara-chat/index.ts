// Cara chat — Supabase Edge Function
// -----------------------------------------------------------------------------
// PHASE 2, INTEGRATION 1: Cara now answers from Caring Companions Core.
//
// What changed and why:
//   Before, every price, rate and eligibility rule was written into the system
//   prompt in this file. Changing the HomeTogether price meant editing this
//   function, and nothing else in the company knew it had changed. Cara could
//   also state a fact confidently that nobody had verified in six months.
//
//   Now this function holds NO facts. It asks the Knowledge API what Caring
//   Companions actually knows, and can only speak from what comes back. If the
//   answer is not verified and approved for families, Cara says she does not
//   have a confirmed answer instead of guessing.
//
// Her voice, her warmth and the empathy step are deliberately unchanged.
//
// DEPLOY:
//   supabase functions deploy cara-chat --no-verify-jwt --project-ref zngsgedlsxinbygwmxwn
// SECRET (already set):
//   ANTHROPIC_API_KEY
// -----------------------------------------------------------------------------

import { buildSystemPrompt, buildRefusal } from '../_shared/knowledge-policy.js'

const PHONE = '(417) 234-8494'
const KNOWLEDGE_API = `${Deno.env.get('SUPABASE_URL')}/functions/v1/knowledge-api`
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Unchanged. The consultation acknowledgment step states no facts, so it needs
// no knowledge lookup.
const EMPATHY_PROMPT =
  "You are Cara, a warm, calm care coordinator at a home care agency. A family " +
  "member just described their situation in their own words. Respond with ONLY " +
  "1-2 short, warm, empathetic sentences (under 40 words total) acknowledging " +
  "what they shared and validating that looking into this now is a good step. " +
  "Do not give advice, recommendations, diagnoses, or mention pricing. Do not " +
  "ask a question. Just acknowledge with warmth. Refer to their loved one " +
  "exactly as they did (their dad, their mom, their husband, a name) - never " +
  "substitute a different relative or assume who it is. Never use em " +
  "dashes; use commas or periods instead."

// Who Cara is. Personality only. There is not a single fact in here any more,
// and that is the point.
const VOICE =
  "You are Cara, a warm, experienced care coordinator for Caring Companions, a " +
  "Missouri home care agency in Springfield. You talk with families the way a " +
  "seasoned coordinator would on the phone: like a real conversation, not a FAQ. " +
  "When someone shares something hard (a fall, a diagnosis, a parent declining, " +
  "caregiver exhaustion), acknowledge it briefly and genuinely before anything " +
  "else, one warm sentence, never clinical or scripted. Pay close attention to " +
  "who the visitor is talking about and refer to that same person every time: if " +
  "they say dad, talk about their dad; if they say mom, their mom; if they give a " +
  "name, use the name. Never swap in a different relative or assume a gender they " +
  "did not state. Reply in plain sentences only, no markdown, no asterisks, no " +
  "bullet lists. Never use em dashes; use commas or periods instead."

// Used when Core has nothing on the subject. She can still be a person. She
// just cannot be a source.
const NO_FACTS_PROMPT =
  VOICE +
  "\n\nYou have NO approved facts available for this message. That means:\n" +
  "1. Do not state any price, rate, program rule, eligibility requirement, county, " +
  "phone number other than " + PHONE + ", or service detail. Not one, however sure you feel.\n" +
  "2. If they asked a factual question, say plainly that you do not have a confirmed " +
  "answer for it and invite them to call " + PHONE + ". Do not apologise more than once.\n" +
  "3. If they were greeting you or sharing something personal rather than asking a " +
  "question, simply respond warmly and ask one gentle question to understand their " +
  "situation. That needs no facts.\n" +
  "4. Keep it to 2 to 4 sentences, under 70 words."

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
async function core(payload: Record<string, any>) {
  const res = await fetch(KNOWLEDGE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`knowledge-api ${res.status}`)
  return await res.json()
}

async function askClaude(system: string, messages: unknown[], maxTokens: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, system, messages }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    const { messages, mode, session_id } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return json({ error: 'Invalid messages' }, 400)
    }
    const safeMessages = messages
      // deno-lint-ignore no-explicit-any
      .filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      // deno-lint-ignore no-explicit-any
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))

    // The empathy step asserts nothing, so it skips the knowledge layer entirely.
    if (mode === 'empathy') {
      const reply = await askClaude(EMPATHY_PROMPT, safeMessages, 120)
      return json({ reply })
    }

    const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user')
    const question = lastUser?.content ?? ''

    // 1. Ask Core what we actually know.
    //    If Core is unreachable, Cara does NOT go down and does NOT fall back to
    //    guessing. She degrades to the no-facts mode: still warm, still useful,
    //    but unable to assert anything. An outage must never turn her back into
    //    a system that answers from memory.
    // deno-lint-ignore no-explicit-any
    let d: any
    try {
      d = await core({ action: 'search', question, audience: 'public', channel: 'cara' })
    } catch (e) {
      console.error('core unreachable, degrading to no-facts mode', e)
      d = { decision: 'none', records: [], conflict: null, withheld: [], reason: 'core_unreachable' }
    }

    let reply: string
    let outcome: string

    if (d.decision === 'ok' || d.decision === 'conflict') {
      // 2. Answer from the approved records, and only from them.
      const system = buildSystemPrompt(d.records) + '\n\n' + VOICE
      reply = await askClaude(system, safeMessages, 300)
      outcome = d.decision === 'conflict' ? 'conflict' : 'answered'
    } else if (d.decision === 'withheld') {
      // 3. We HAVE something and it is not confirmed. This is the dangerous
      //    case, so it never touches the model. A fixed sentence cannot be
      //    talked into paraphrasing an unverified rate.
      reply = buildRefusal(d, PHONE)
      outcome = 'withheld'
    } else {
      // 4. Nothing on file. She can still be a person, she just cannot be a
      //    source. The prompt forbids asserting anything.
      reply = await askClaude(NO_FACTS_PROMPT, safeMessages, 200)
      outcome = 'none'
    }

    // 5. Log it. Every answer traceable to the record and version behind it.
    //    Logging must never take the reply down, so it is fire-and-forget.
    core({
      action: 'log',
      channel: 'cara',
      question,
      outcome,
      records: d.records ?? [],
      conflict: d.conflict ?? null,
      withheld: d.withheld ?? [],
      reply,
      session_id: session_id ?? null,
    }).catch((e) => console.error('log failed', e))

    // `reply` keeps the original shape so the existing widget is unaffected.
    // The rest is metadata for auditing and for showing the source in the UI.
    return json({
      reply,
      knowledge: {
        decision: d.decision,
        // deno-lint-ignore no-explicit-any
        ids: (d.records ?? []).map((r: any) => r.id),
        // deno-lint-ignore no-explicit-any
        sources: [...new Set((d.records ?? []).map((r: any) => r.source_name))],
        conflict: d.conflict ?? null,
      },
    })
  } catch (err) {
    console.error('cara-chat', err)
    return json({ error: 'chat_failed' }, 500)
  }
})
