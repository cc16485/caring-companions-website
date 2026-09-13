// Caring Companions Core — asset claim scanning tests
// -----------------------------------------------------------------------------
// Run:  node supabase/functions/_shared/asset-claims.test.mjs
//
// No database, no model, no network.
//
// The case this exists for is real: the CDS training manual says $14.00 an
// hour, and it is one of seven things that manual gets wrong. The onboarding
// packet was written from the same material. When the pay rate is verified at
// the correct number, every document still quoting the old one has to surface
// on its own, because nobody is going to remember which ones they are.
//
// The false-positive tests matter as much as the detection ones. A check that
// flags page numbers and phone numbers gets ignored, and an ignored check is
// worse than none because it looks like coverage.
// -----------------------------------------------------------------------------

import { literals, wordIn, compareClaim } from './asset-claims.js'

let pass = 0, fail = 0
const results = []
const check = (name, ok) => {
  results.push([ok ? 'PASS' : 'FAIL', name])
  ok ? pass++ : fail++
}

// The real seeded records, plus the pay rate at a corrected value, which is the
// scenario the whole feature is for.
const PAY_OLD = {
  id: 'N002', question: 'What does a CDS attendant get paid?',
  answer: '$14.00 per hour.',
  topics: ['cds', 'pay', 'rate', 'wage', 'attendant'], status: 'stale',
}
const PAY_NEW = { ...PAY_OLD, answer: '$15.00 per hour.', status: 'verified' }
const TRAINING = {
  id: 'N010', question: 'How much basic training is required?',
  answer: 'Twelve hours. Missouri requires 12 hours of basic training before a caregiver works alone.',
  topics: ['training', 'basic', 'caregiver', 'hours'], status: 'verified',
}
const SPOUSE = {
  id: 'N004', question: 'Can a spouse be paid as a CDS attendant?',
  answer: 'No. Under Missouri CDS a spouse cannot be paid as the attendant.',
  topics: ['cds', 'medicaid', 'spouse', 'husband', 'wife', 'attendant'], status: 'verified',
}

// ── TEST 1: literal extraction ───────────────────────────────────────────────
{
  console.log('TEST 1  Literal extraction')

  const money = literals('The rate is $14.00 per hour, with a $1,200.50 annual stipend.')
  console.log('  money   ->', money.map((l) => `${l.kind}:${l.value}`).join(' '))
  check('1. finds $14.00 as money 14', money.some((l) => l.kind === 'money' && l.value === '14'))
  check('1. handles thousands separators', money.some((l) => l.value === '1200.5'))

  const dur = literals('Timesheets are due every 14 days. Training is 12 hours.')
  console.log('  duration->', dur.map((l) => l.value).join(' | '))
  check('1. finds 14 days', dur.some((l) => l.kind === 'duration' && l.value === '14 day'))
  check('1. finds 12 hours', dur.some((l) => l.kind === 'duration' && l.value === '12 hour'))

  // "14 day" and "14 days" must be one claim, not two.
  check('1. singularises the unit',
    literals('a 14 day cycle')[0].value === literals('a 14 days cycle')[0].value)

  check('1. finds a percentage', literals('withholding of 7.65%').some((l) => l.kind === 'percent'))

  // Bare numbers are NOT literals. Page numbers, form codes and phone numbers
  // are numbers, and matching them would drown every real finding.
  const bare = literals('See page 4, form CC-1099, call (417) 234-8494.')
  console.log('  bare    ->', bare.length, 'literal(s)')
  check('1. ignores bare numbers, page and form codes', bare.length === 0)
  console.log()
}

// ── TEST 2: whole-word topic matching ────────────────────────────────────────
{
  console.log('TEST 2  Topic matching is whole-word')
  check('2. matches "pay" in "pay period"', wordIn('the pay period ends Friday', 'pay'))
  check('2. does not match "pay" inside "repayment"', !wordIn('a repayment schedule', 'pay'))
  check('2. does not match "rate" inside "accurate"', !wordIn('an accurate record', 'rate'))
  check('2. is case-insensitive', wordIn('PAY PERIOD', 'pay'))
  console.log()
}

// ── TEST 3: the case this was built for ──────────────────────────────────────
{
  console.log('TEST 3  A form quoting the old pay rate')
  const packet = 'Pay and Timesheets. Your pay rate as a CDS attendant is $14.00 per hour, '
               + 'paid on a 14 day cycle.'

  const vsOld = compareClaim(PAY_OLD, packet)
  console.log('  vs the old record ->', vsOld.verdict, vsOld.document_values.join(' '))
  check('3. agrees with the record it was written from', vsOld.verdict === 'agrees')

  const vsNew = compareClaim(PAY_NEW, packet)
  console.log('  vs the corrected  ->', vsNew.verdict, 'conflicting:', vsNew.conflicting_values.join(' '))
  check('3. differs once the rate is corrected', vsNew.verdict === 'differs')
  check('3. names the wrong figure in the document', vsNew.conflicting_values.includes('$14.00'))
  check('3. names the right figure from the fact', vsNew.fact_values.includes('$15.00'))
  console.log()
}

// ── TEST 4: a conflict is not hidden by an agreement ─────────────────────────
{
  console.log('TEST 4  Right figure and wrong figure in the same passage')
  const mixed = 'Attendant pay rate: $15.00 per hour. Older agreements list the CDS wage as $14.00.'
  const r = compareClaim(PAY_NEW, mixed)
  console.log('  ->', r.verdict, 'conflicting:', r.conflicting_values.join(' '))
  check('4. still reports differs', r.verdict === 'differs')
  check('4. reports the stale figure', r.conflicting_values.includes('$14.00'))
  console.log()
}

// ── TEST 5: false positives ──────────────────────────────────────────────────
{
  console.log('TEST 5  Passages that must NOT be flagged')

  // One topic word is coincidence in any home-care document.
  const oneTopic = compareClaim(PAY_NEW, 'The attendant should arrive 15 minutes early.')
  console.log('  one topic word    ->', oneTopic)
  check('5. one topic word is not enough', oneTopic === null)

  // Topic words but no values anywhere.
  const noValues = compareClaim(SPOUSE, 'A spouse cannot be paid as a CDS attendant. This is a Medicaid rule.')
  console.log('  no values         ->', noValues)
  check('5. no figures on either side is not a claim', noValues === null)

  // Different KIND of value: a duration in the document, money in the fact.
  const wrongKind = compareClaim(PAY_NEW, 'Your CDS attendant pay is issued 14 days after the period ends.')
  console.log('  different kind    ->', wrongKind.verdict)
  check('5. a duration does not contradict a wage', wrongKind.verdict === 'mentions')

  // A passage about training does not get compared against the wage record.
  const other = compareClaim(PAY_NEW, 'Basic training is 12 hours and must be finished before the first shift.')
  console.log('  unrelated topic   ->', other)
  check('5. unrelated passage is skipped entirely', other === null)
  console.log()
}

// ── TEST 6: the training-hours case ──────────────────────────────────────────
{
  console.log('TEST 6  Training hours stated wrongly')
  const wrong = 'Caregiver Training. Every caregiver completes 8 hours of basic training before working alone.'
  const r = compareClaim(TRAINING, wrong)
  console.log('  ->', r.verdict, r.conflicting_values.join(' '), '| fact:', r.fact_values.join(' '))
  check('6. catches the wrong hours figure', r.verdict === 'differs')
  check('6. reports what the document says', r.conflicting_values.some((v) => /8\s*hours?/i.test(v)))

  const right = 'Caregiver Training. Every caregiver completes 12 hours of basic training before working alone.'
  const ok = compareClaim(TRAINING, right)
  console.log('  correct version ->', ok.verdict)
  check('6. does not flag the correct figure', ok.verdict === 'agrees')
  console.log()
}

// ── TEST 7: a fact with no figure in it is never a numeric conflict ──────────
{
  console.log('TEST 7  Facts without figures')
  const r = compareClaim(SPOUSE, 'A spouse cannot be paid as a CDS attendant. Form CC-4 must be signed within 30 days.')
  console.log('  ->', r.verdict, '| fact values:', r.fact_values.length)
  check('7. cannot contradict a fact that states no value', r.verdict === 'mentions')
  check('7. reports the document value for context', r.document_values.some((v) => /30\s*days?/i.test(v)))
  console.log()
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('=== RESULTS ===\n')
for (const [s, n] of results) console.log(`  ${s === 'PASS' ? 'ok  ' : 'FAIL'}  ${n}`)
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
