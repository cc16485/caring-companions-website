// Cara <-> Caring Companions Core — end to end walkthrough
// -----------------------------------------------------------------------------
// Run:  node supabase/functions/_shared/cara-flow.demo.mjs
//
// Walks the exact path a real request takes and prints every stage: the family
// question, the Core lookup, the record chosen, the source, the system prompt
// Cara receives, and the row written to kb_answer_log.
//
// HONEST LIMIT: the Anthropic call is NOT made here. Everything up to and after
// the model is real code; the model's sentence is shown as [not executed
// locally]. Everything that decides what Cara is ALLOWED to say runs for real.
// -----------------------------------------------------------------------------

import { decide, buildSystemPrompt, buildRefusal } from './knowledge-policy.js'

const PHONE = '(417) 234-8494'

// Same records the SQL seeds into kb_items.
const DB = [
  { id:'N001', question:'Can my daughter be my CDS caregiver?',
    answer:"Sometimes. Missouri Consumer Directed Services can pay a family member as the attendant when the consumer is eligible for the program and directs their own care. A spouse cannot be paid as the attendant. Whether a particular daughter qualifies depends on the consumer's eligibility, so it is worth a short call to check.",
    answer_key:'cds_family_attendant', topics:['cds','medicaid','attendant','family','daughter','caregiver'],
    status:'verified', audience:'public', confidence:92, conservative:true,
    verified_on:'2026-08-01', version:3, source_name:'Missouri Medicaid Manual' },
  { id:'N002', question:'What does a CDS attendant get paid?', answer:'$14.00 per hour.',
    answer_key:'cds_pay_rate', topics:['cds','pay','rate','wage','attendant'],
    status:'stale', audience:'public', confidence:38, conservative:false,
    verified_on:'2026-02-10', version:1, source_name:'Internal payroll policy' },
  { id:'N003', question:'Who directs care under CDS?',
    answer:'The consumer does. They hire, schedule, train and dismiss their own attendant. The vendor handles payroll and compliance, not supervision.',
    answer_key:'cds_who_directs', topics:['cds','medicaid','consumer','directs','supervision'],
    status:'verified', audience:'public', confidence:96, conservative:false,
    verified_on:'2026-08-01', version:1, source_name:'Missouri Medicaid Manual' },
  { id:'N004', question:'Can a spouse be paid as a CDS attendant?',
    answer:'No. Under Missouri CDS a spouse cannot be paid as the attendant. Other family members may be able to.',
    answer_key:'cds_spouse', topics:['cds','medicaid','spouse','husband','wife','attendant'],
    status:'verified', audience:'public', confidence:95, conservative:true,
    verified_on:'2026-08-01', version:1, source_name:'Missouri Medicaid Manual' },
  { id:'N005', question:'What happens when a caregiver calls off?',
    answer:'The coordinator confirms the call-off, checks the coverage board, offers the shift to the on-call list in seniority order, then calls the family with a name and an arrival time.',
    answer_key:'calloff_procedure', topics:['calloff','coverage','staffing','shift','scheduling'],
    status:'verified', audience:'internal', confidence:88, conservative:false,
    verified_on:'2026-07-15', version:2, source_name:'Employee handbook' },
  { id:'N006', question:'What does HomeTogether TV cost?',
    answer:'HomeTogether TV is $99 per month flat for the device and the service, with free shipping, a 30-day money-back guarantee, no contract, and you can cancel anytime.',
    answer_key:'httv_price', topics:['hometogether','tv','price','cost','device','monthly'],
    status:'verified', audience:'public', confidence:98, conservative:false,
    verified_on:'2026-08-01', version:1, source_name:'HomeTogether pricing' },
]

const line = (c = '─') => console.log(c.repeat(78))

function run(question, { audience = 'public', session = 'demo-session' } = {}) {
  line('=')
  console.log('FAMILY ASKS:  ' + question)
  line('=')

  // 1. Core lookup (this is exactly what knowledge-api does)
  const d = decide(DB, question, { audience })
  console.log('\n1. CORE LOOKUP')
  console.log('   decision : ' + d.decision)
  if (d.reason) console.log('   reason   : ' + d.reason)
  if (d.withheld.length) {
    for (const w of d.withheld) console.log(`   withheld : ${w.id} (${w.reason})`)
  }

  // 2. Record selected
  console.log('\n2. RECORD SELECTED')
  if (d.records.length) {
    for (const r of d.records) {
      console.log(`   ${r.id} v${r.version}  "${r.question}"`)
      console.log(`   source: ${r.source_name}, verified ${r.verified_on}, confidence ${r.confidence}`)
    }
  } else {
    console.log('   none')
  }
  if (d.conflict) {
    console.log('\n   ⚠ CONFLICT')
    console.log('   candidates: ' + d.conflict.candidate_ids.join(' vs '))
    console.log('   chose     : ' + d.conflict.chose)
    console.log('   why       : ' + d.conflict.why)
  }

  // 3. What Cara is allowed to work from
  let reply, outcome
  console.log('\n3. WHAT CARA RECEIVES')
  if (d.decision === 'ok' || d.decision === 'conflict') {
    const sys = buildSystemPrompt(d.records)
    console.log(sys.split('\n').map((l) => '   | ' + l).join('\n'))
    reply = '[not executed locally, Anthropic call happens in the deployed function]'
    outcome = d.decision === 'conflict' ? 'conflict' : 'answered'
  } else if (d.decision === 'withheld') {
    console.log('   | (no model call at all, this path is deterministic)')
    reply = buildRefusal(d, PHONE)
    outcome = 'withheld'
  } else {
    console.log('   | NO approved facts. Cara may be warm, but may not assert anything.')
    reply = '[not executed locally, warm no-facts reply]'
    outcome = 'none'
  }

  console.log('\n4. CARA SAYS')
  console.log('   ' + reply)

  // 5. The audit row
  const logRow = {
    channel: 'cara',
    question,
    outcome,
    item_ids: d.records.map((r) => r.id),
    item_versions: d.records.map((r) => r.version),
    sources: d.records.map((r) => r.source_name),
    verified_on: d.records.map((r) => r.verified_on),
    withheld_ids: d.withheld.map((w) => w.id),
    conflict: d.conflict,
    reply,
    session_id: session,
  }
  console.log('\n5. AUDIT ROW written to kb_answer_log')
  console.log(JSON.stringify(logRow, null, 2).split('\n').map((l) => '   ' + l).join('\n'))
  console.log()
}

console.log('\n\n########  CARA  <->  CARING COMPANIONS CORE  ########\n')

console.log('\n\n>>> THE FIRST PRODUCTION TEST\n')
run('Can my daughter be my CDS caregiver?')

console.log('\n\n>>> FAILURE CASE 1: no knowledge record exists\n')
run('Do you take Humana Medicare Advantage for assisted living in Branson?')

console.log('\n\n>>> FAILURE CASE 2: the only match is unverified\n')
run('How much does a CDS attendant get paid per hour?')

console.log('\n\n>>> FAILURE CASE 3: an internal-only record, asked by a family\n')
run('What happens when a caregiver calls off?')

console.log('\n\n>>> FAILURE CASE 4: two approved records disagree\n')
const CONFLICT_DB = [...DB, {
  id:'N099', question:'Can a daughter be paid as a CDS attendant?',
  answer:'Yes, any family member can be paid as the attendant.',
  answer_key:'cds_family_attendant', topics:['cds','attendant','family','daughter','caregiver'],
  status:'verified', audience:'public', confidence:80, conservative:false,
  verified_on:'2026-05-01', version:1, source_name:'Old intake sheet',
}]
{
  const q = 'Can my daughter be my CDS caregiver?'
  const d = decide(CONFLICT_DB, q, { audience: 'public' })
  line('=')
  console.log('FAMILY ASKS:  ' + q)
  line('=')
  console.log('\n   decision  : ' + d.decision)
  console.log('   candidates: ' + d.conflict.candidate_ids.join(' vs '))
  console.log('   chose     : ' + d.conflict.chose + ' (the conservative one)')
  console.log('   flagged   : yes, written to kb_answer_log.conflict for a human')
  console.log('   NOT done  : silently picking whichever scored higher\n')
}

console.log('\n\n>>> SAME INTERNAL QUESTION, asked by staff instead\n')
run('What happens when a caregiver calls off?', { audience: 'internal', session: 'staff-hub' })
