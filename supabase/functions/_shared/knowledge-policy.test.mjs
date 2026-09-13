// Caring Companions Core — knowledge policy tests
// -----------------------------------------------------------------------------
// Run:  node supabase/functions/_shared/knowledge-policy.test.mjs
//
// This tests the part that matters: whether Cara is ALLOWED to say something.
// No database, no model, no network. Just the rules.
//
// The four failure cases are the point. Anyone can make the happy path work.
// -----------------------------------------------------------------------------

import { decide, buildSystemPrompt, buildRefusal } from './knowledge-policy.js'

const PHONE = '(417) 234-8494'

// Fixtures mirror the seeded production records, plus two extra rows that exist
// ONLY here: a conflicting duplicate and an internal-only procedure. Test data
// stays out of the real database on purpose.
const REAL = [
  { id:'N001', question:'Can my daughter be my CDS caregiver?',
    answer:'Sometimes. Missouri CDS can pay a family member as the attendant when the consumer is eligible and directs their own care. A spouse cannot be paid.',
    answer_key:'cds_family_attendant', topics:['cds','medicaid','attendant','family','daughter','caregiver'],
    status:'verified', audience:'public', confidence:92, conservative:true,
    verified_on:'2026-08-01', version:3, source_name:'Missouri Medicaid Manual' },

  { id:'N002', question:'What does a CDS attendant get paid?', answer:'$14.00 per hour.',
    answer_key:'cds_pay_rate', topics:['cds','pay','rate','wage','attendant'],
    status:'stale', audience:'public', confidence:38, conservative:false,
    verified_on:'2026-02-10', version:1, source_name:'Internal payroll policy' },

  { id:'N003', question:'Who directs care under CDS?',
    answer:'The consumer does. They hire, schedule, train and dismiss their own attendant.',
    answer_key:'cds_who_directs', topics:['cds','medicaid','consumer','directs','supervision'],
    status:'verified', audience:'public', confidence:96, conservative:false,
    verified_on:'2026-08-01', version:1, source_name:'Missouri Medicaid Manual' },

  { id:'N004', question:'Can a spouse be paid as a CDS attendant?',
    answer:'No. Under Missouri CDS a spouse cannot be paid as the attendant. Other family members may be able to.',
    answer_key:'cds_spouse', topics:['cds','medicaid','spouse','husband','wife','attendant'],
    status:'verified', audience:'public', confidence:95, conservative:true,
    verified_on:'2026-08-01', version:1, source_name:'Missouri Medicaid Manual' },

  { id:'N005', question:'What happens when a caregiver calls off?',
    answer:'Coordinator confirms the call-off, checks the coverage board, offers the shift to the on-call list in seniority order, then calls the family.',
    answer_key:'calloff_procedure', topics:['calloff','call off','coverage','staffing','shift','scheduling'],
    alt_questions:['What do we do when a caregiver calls out?','Who do we call when a caregiver does not show up?'],
    phrases:['calls off','called off','call out','no show','missed shift'],
    status:'verified', audience:'internal', confidence:88, conservative:false,
    verified_on:'2026-07-15', version:2, source_name:'Employee handbook' },
]

// Test-only: a second approved answer to the SAME question that disagrees.
const CONFLICTING = {
  id:'N099', question:'Can a daughter be paid as a CDS attendant?',
  answer:'Yes, any family member can be paid as the attendant.',
  answer_key:'cds_family_attendant', topics:['cds','attendant','family','daughter','caregiver'],
  status:'verified', audience:'public', confidence:80, conservative:false,
  verified_on:'2026-05-01', version:1, source_name:'Old intake sheet',
}

let pass = 0, fail = 0
const results = []
function check(name, cond, detail) {
  if (cond) { pass++; results.push(['PASS', name, detail]) }
  else { fail++; results.push(['FAIL', name, detail]) }
}

console.log('\n=== CARING COMPANIONS CORE, KNOWLEDGE POLICY ===\n')

// ── TEST 1: the real first production question ───────────────────────────────
{
  const q = 'Can my daughter be my CDS caregiver?'
  const d = decide(REAL, q, { audience: 'public' })
  console.log('TEST 1  The first production question')
  console.log('  Family asks : ' + q)
  console.log('  Core decision: ' + d.decision)
  console.log('  Record used  : ' + d.records.map(r => `${r.id} v${r.version}`).join(', '))
  console.log('  Source       : ' + d.records.map(r => r.source_name).join(', '))
  console.log('  Verified     : ' + d.records.map(r => r.verified_on).join(', '))
  console.log('  Withheld     : ' + (d.withheld.map(w => `${w.id} (${w.reason})`).join(', ') || 'none'))
  check('1. answers the CDS family question', d.decision === 'ok' && d.records.some(r => r.id === 'N001'))
  check('1. does NOT leak the stale pay rate', !d.records.some(r => r.id === 'N002'))
  check('1. does NOT leak the internal call-off procedure', !d.records.some(r => r.id === 'N005'))
  console.log()
}

// ── TEST 2: no record exists ─────────────────────────────────────────────────
{
  const q = 'Do you take Humana Medicare Advantage for assisted living in Branson?'
  const d = decide(REAL, q, { audience: 'public' })
  console.log('TEST 2  A question with no knowledge record')
  console.log('  Family asks : ' + q)
  console.log('  Core decision: ' + d.decision + '  (' + d.reason + ')')
  console.log('  Cara says   : ' + buildRefusal(d, PHONE))
  check('2. refuses rather than inventing', d.decision === 'none' && d.records.length === 0)
  check('2. routes to the phone number', buildRefusal(d, PHONE).includes(PHONE))
  console.log()
}

// ── TEST 3: only match is unverified ─────────────────────────────────────────
{
  const q = 'What is the CDS pay rate per hour?'
  const d = decide(REAL, q, { audience: 'public' })
  console.log('TEST 3  The only matching record is unverified')
  console.log('  Family asks : ' + q)
  console.log('  Core decision: ' + d.decision + '  (' + d.reason + ')')
  console.log('  Withheld     : ' + d.withheld.map(w => `${w.id} (${w.reason})`).join(', '))
  console.log('  Cara says   : ' + buildRefusal(d, PHONE))
  check('3. withholds the stale rate', d.decision === 'withheld')
  check('3. returns zero usable records', d.records.length === 0)
  check('3. names N002 as withheld', d.withheld.some(w => w.id === 'N002'))
  check('3. the $14 figure never appears in what Cara says', !buildRefusal(d, PHONE).includes('14'))
  console.log()
}

// ── TEST 3b: the withheld record is the ON-POINT one ─────────────────────────
// Caught by the end-to-end walkthrough, not by test 3. Same subject, different
// wording, completely different behaviour. A family asking about the PAY RATE
// was being handed a confident answer about WHO can be paid, with the rate
// silently dropped. They would have left thinking they were answered.
{
  const q = 'How much does a CDS attendant get paid per hour?'
  const d = decide(REAL, q, { audience: 'public' })
  console.log('TEST 3b The unsayable record is the closest match')
  console.log('  Family asks : ' + q)
  console.log('  Core decision: ' + d.decision)
  console.log('  Answered from: ' + (d.records.map(r => r.id).join(', ') || 'nothing'))
  console.log('  Withheld     : ' + d.withheld.map(w => w.id).join(', '))
  check('3b. does not answer around the withheld record', d.decision === 'withheld')
  check('3b. answers with nothing rather than the wrong subject', d.records.length === 0)
  check('3b. the pay rate record is the one withheld', d.withheld.some(w => w.id === 'N002'))
  console.log()
}

// ── TEST 3c: internal is not the same as unverified ──────────────────────────
{
  const d = decide(REAL, 'What happens when a caregiver calls off?', { audience: 'public' })
  const said = buildRefusal(d, PHONE)
  console.log('TEST 3c Wording for an internal-only record')
  console.log('  Cara says   : ' + said)
  check('3c. does not call a verified SOP unconfirmed', !said.includes('not been confirmed'))
  check('3c. still routes to the phone', said.includes(PHONE))
  console.log()
}

// ── TEST 4: two approved records conflict ────────────────────────────────────
{
  const q = 'Can my daughter be my CDS caregiver?'
  const d = decide([...REAL, CONFLICTING], q, { audience: 'public' })
  console.log('TEST 4  Two approved records disagree')
  console.log('  Family asks : ' + q)
  console.log('  Core decision: ' + d.decision)
  console.log('  Candidates   : ' + (d.conflict ? d.conflict.candidate_ids.join(' vs ') : 'n/a'))
  console.log('  Chose        : ' + (d.conflict ? d.conflict.chose : 'n/a'))
  console.log('  Why          : ' + (d.conflict ? d.conflict.why : 'n/a'))
  check('4. flags the conflict rather than choosing silently', d.decision === 'conflict' && !!d.conflict)
  check('4. picks the conservative record (N001, not N099)', d.conflict && d.conflict.chose === 'N001')
  check('4. records both candidates for the audit log', d.conflict && d.conflict.candidate_ids.length === 2)
  console.log()
}

// ── TEST 5: internal-only record must never go public ────────────────────────
{
  const q = 'What happens when a caregiver calls off?'
  const pub = decide(REAL, q, { audience: 'public' })
  const int = decide(REAL, q, { audience: 'internal' })
  console.log('TEST 5  An internal-only record')
  console.log('  Asked publicly  : decision ' + pub.decision + ', records ' + (pub.records.length || 'none'))
  console.log('  Asked internally: decision ' + int.decision + ', records ' + int.records.map(r => r.id).join(', '))
  check('5. never returned to a family', pub.decision === 'withheld' && pub.records.length === 0)
  check('5. still available to staff', int.decision === 'ok' && int.records.some(r => r.id === 'N005'))
  console.log()
}

// ── TEST 6: the prompt carries no facts of its own ───────────────────────────
{
  const d = decide(REAL, 'Can my daughter be my CDS caregiver?', { audience: 'public' })
  const sys = buildSystemPrompt(d.records)
  console.log('TEST 6  The prompt contains only what Core returned')
  const leaks = ['$30','$32','$34','$99','$450','Greene','Christian','Webster']
    .filter(t => sys.includes(t))
  console.log('  Old hard-coded facts still present: ' + (leaks.length ? leaks.join(', ') : 'none'))
  console.log('  Cites record + version            : ' + /\[N001 v\d+\]/.test(sys))
  check('6. no hard-coded prices survive in the prompt', leaks.length === 0)
  check('6. prompt cites the record id and version', /\[N001 v\d+\]/.test(sys))
  check('6. prompt forbids outside facts', sys.includes('must come from the approved answers below'))
  console.log()
}

// ── TEST 7: retrieval does not fire on filler ────────────────────────────────
{
  console.log('TEST 7  Retrieval precision')
  const junk = [
    'is the parking lot getting plowed',
    'can someone fix the copier',
    'what time does the office close',
    'order more printer paper',
  ]
  for (const q of junk) {
    const d = decide(REAL, q, { audience: 'public' })
    console.log(`  "${q}" -> ${d.decision}`)
    check(`7. no false retrieval for "${q}"`, d.decision === 'none')
  }
  const good = ['who directs care under CDS', 'can a spouse be paid']
  for (const q of good) {
    const d = decide(REAL, q, { audience: 'public' })
    console.log(`  "${q}" -> ${d.decision} ${d.records.map(r => r.id).join(',')}`)
    check(`7. still retrieves for "${q}"`, d.decision === 'ok')
  }
  console.log()
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('=== RESULTS ===\n')
for (const [s, n] of results) console.log(`  ${s === 'PASS' ? 'ok  ' : 'FAIL'}  ${n}`)
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
