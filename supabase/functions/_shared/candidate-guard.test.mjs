// Caring Companions Core — candidate guard tests
// -----------------------------------------------------------------------------
// Run:  node supabase/functions/_shared/candidate-guard.test.mjs
//
// No database, no model, no network.
//
// The rule under test: extraction proposes, and what a proposal may CLAIM is
// bounded by the standing of the document it came from. The prompt asks the
// model for the same things. This is what happens when the model does not
// comply, which is the only case that matters.
//
// The leak these prevent is silent. A candidate extracted from a confidential
// HR document looks exactly like one from a public state manual in the review
// queue, and once approved it is something Cara says to families.
// -----------------------------------------------------------------------------

import { sourceStanding, guardCandidate, KNOWLEDGE_TYPES } from './candidate-guard.js'

let pass = 0, fail = 0
const results = []
const check = (name, ok, detail = '') => {
  results.push([ok ? 'PASS' : 'FAIL', name + (ok ? '' : `  ${detail}`)])
  ok ? pass++ : fail++
}

// The three real shapes in the library today.
const STATE_MANUAL = { authority: 'primary', approval_state: null, sensitivity: 'internal' }
const PUBLIC_PAGE  = { authority: 'primary', approval_state: null, sensitivity: 'public' }
const DRAFT_SOP    = { authority: 'company', approval_state: 'draft', sensitivity: 'internal' }
const APPROVED_SOP = { authority: 'company', approval_state: 'approved', sensitivity: 'internal' }

// ── TEST 1: reading a source's standing ─────────────────────────────────────
{
  console.log('TEST 1  Source standing')
  const ext = sourceStanding(STATE_MANUAL)
  check('1. an external publication is not a draft', !ext.isDraft)
  console.log('  state manual ->', ext.approval)

  const sop = sourceStanding(DRAFT_SOP)
  check('1. a draft SOP is a draft', sop.isDraft)

  // The default that matters. A company document nobody classified must not be
  // treated as approved, or unreviewed material becomes procedure by omission.
  const unset = sourceStanding({ authority: 'company' })
  check('1. an unclassified company document defaults to draft', unset.isDraft)
  check('1. an unclassified document defaults to internal', unset.mustBeInternal)

  check('1. only "public" counts as public', !sourceStanding(PUBLIC_PAGE).mustBeInternal
        && sourceStanding({ sensitivity: 'confidential' }).mustBeInternal
        && sourceStanding({ sensitivity: 'restricted' }).mustBeInternal
        && sourceStanding({}).mustBeInternal)
  console.log()
}

// ── TEST 2: the leak that matters most ──────────────────────────────────────
{
  console.log('TEST 2  Nothing from a closely held source is suggested for families')
  for (const [label, doc] of [['internal', STATE_MANUAL], ['draft internal SOP', DRAFT_SOP],
                              ['confidential', { sensitivity: 'confidential' }],
                              ['restricted', { sensitivity: 'restricted' }],
                              ['unclassified', {}]]) {
    const g = guardCandidate({ audience_suggestion: 'public', confidence: 95 }, sourceStanding(doc))
    console.log(`  ${label.padEnd(20)} -> ${g.audience_suggestion}`)
    check(`2. "${label}" cannot propose a public answer`, g.audience_suggestion === 'internal')
  }
  const ok = guardCandidate({ audience_suggestion: 'public', confidence: 95 }, sourceStanding(PUBLIC_PAGE))
  check('2. a genuinely public source may still propose public', ok.audience_suggestion === 'public')
  check('2. and the clamp is reported when it fires',
        guardCandidate({ audience_suggestion: 'public' }, sourceStanding(DRAFT_SOP))
          .applied.some((a) => /forced to internal/.test(a)))
  console.log()
}

// ── TEST 3: a draft cannot establish company policy ─────────────────────────
{
  console.log('TEST 3  Draft sources')
  const g = guardCandidate({ knowledge_type: 'company_policy', confidence: 95 }, sourceStanding(DRAFT_SOP))
  console.log('  company_policy from a draft ->', g.knowledge_type, '| confidence', g.extraction_confidence)
  check('3. company_policy is downgraded to company_procedure', g.knowledge_type === 'company_procedure')
  check('3. confidence is capped at 70', g.extraction_confidence === 70)
  check('3. the reviewer is told it came from a draft', /DRAFT/.test(g.review_note || ''))
  check('3. the draft clamps are reported by name',
        g.applied.some((a) => /downgraded to company_procedure/.test(a))
     && g.applied.some((a) => /capped at 70/.test(a)))

  const appr = guardCandidate({ knowledge_type: 'company_policy', confidence: 95 }, sourceStanding(APPROVED_SOP))
  console.log('  company_policy from an approved SOP ->', appr.knowledge_type, '| confidence', appr.extraction_confidence)
  check('3. an approved SOP may establish company_policy', appr.knowledge_type === 'company_policy')
  check('3. and keeps its confidence', appr.extraction_confidence === 95)
  check('3. and carries no draft note', appr.review_note === null)

  // A low confidence from a draft is not raised to the cap.
  check('3. the cap is a ceiling, not a value',
        guardCandidate({ confidence: 40 }, sourceStanding(DRAFT_SOP)).extraction_confidence === 40)
  console.log()
}

// ── TEST 4: case_precedent is accepted ──────────────────────────────────────
{
  console.log('TEST 4  Knowledge types')
  check('4. case_precedent is a valid type', KNOWLEDGE_TYPES.includes('case_precedent'))
  for (const t of KNOWLEDGE_TYPES) {
    const doc = t === 'company_policy' ? APPROVED_SOP : STATE_MANUAL
    check(`4. "${t}" survives the guard`,
          guardCandidate({ knowledge_type: t }, sourceStanding(doc)).knowledge_type === t)
  }
  console.log()
}

// ── TEST 5: a bad type is corrected, not allowed to lose the batch ──────────
{
  console.log('TEST 5  Unrecognised knowledge_type')
  // The database CHECK constraint would reject the whole insert, losing every
  // other record extracted from that section.
  const g = guardCandidate({ knowledge_type: 'best_practice' }, sourceStanding(STATE_MANUAL))
  console.log('  "best_practice" ->', g.knowledge_type)
  check('5. corrected to external_rule', g.knowledge_type === 'external_rule')
  check('5. and reported rather than silently fixed',
        g.applied.some((a) => /best_practice/.test(a)))
  check('5. a missing type is not reported as a correction',
        !guardCandidate({}, sourceStanding(STATE_MANUAL))
          .applied.some((a) => /knowledge_type/.test(a)))
  console.log()
}

// ── TEST 6: confidence is always in range ───────────────────────────────────
{
  console.log('TEST 6  Confidence bounds')
  const s = sourceStanding(STATE_MANUAL)
  for (const [input, expected] of [[150, 100], [-20, 0], ['abc', 0], [undefined, 0], [88, 88]]) {
    const got = guardCandidate({ confidence: input }, s).extraction_confidence
    check(`6. ${JSON.stringify(input)} -> ${expected}`, got === expected, `got ${got}`)
  }
  console.log()
}

console.log('=== RESULTS ===\n')
for (const [s, n] of results) console.log(`  ${s === 'PASS' ? 'ok  ' : 'FAIL'}  ${n}`)
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
