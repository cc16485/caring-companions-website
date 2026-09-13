// Caring Companions Core — asset claim scanning
// -----------------------------------------------------------------------------
// A company document is not empty of knowledge. An onboarding packet states a
// pay rate, a pay cycle, how timesheets work, what training is required. Those
// are claims, and claims go out of date.
//
// This finds places where a document appears to state a value that Core also
// holds a fact about, so a person can check them. It is literal matching. It
// does not understand the document and it does not understand the fact.
//
// IMPORTANT, and the whole reason for the asset/reference split: a document is
// never authority. If the packet says $14.00 and the verified record says
// $15.00, the PACKET is wrong. Nothing here may ever be used to correct a
// knowledge record, and nothing here is read by retrieval or by the policy
// gate. It produces a list for a human, and that is all.
// -----------------------------------------------------------------------------

/**
 * Pull out the values that go stale: money, durations, percentages.
 *
 * Deliberately narrow. Matching every number in a document would flag page
 * numbers, phone numbers and form revision codes, and a check that cries wolf
 * gets switched off. These three kinds cover the claims that actually rot:
 * a wage, a pay cycle, an hours-of-training requirement.
 */
export function literals(text) {
  const out = []
  const seen = new Set()
  const push = (kind, value, raw) => {
    const key = `${kind}:${value}`
    if (!seen.has(key)) { seen.add(key); out.push({ kind, value, raw }) }
  }

  // $14, $14.00, $1,200.50
  for (const m of String(text).matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g))
    push('money', String(parseFloat(m[1].replace(/,/g, ''))), m[0].trim())

  // 14 days, 12 hours, 2 weeks. Singularised so "14 day" and "14 days" are one
  // claim rather than two.
  for (const m of String(text).matchAll(
    /\b(\d{1,4}(?:\.\d+)?)\s*(hours?|hrs?|days?|weeks?|months?|years?|minutes?|mins?)\b/gi)) {
    const unit = m[2].toLowerCase()
      .replace(/s$/, '').replace(/^hr$/, 'hour').replace(/^min$/, 'minute')
    push('duration', `${parseFloat(m[1])} ${unit}`, m[0].trim())
  }

  for (const m of String(text).matchAll(/\b(\d{1,3}(?:\.\d+)?)\s?%/g))
    push('percent', String(parseFloat(m[1])), m[0].trim())

  return out
}

/** Whole-word match, so "pay" does not hit "payable" or "repayment". */
export function wordIn(haystack, word) {
  if (!word) return false
  return new RegExp(`\\b${String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    .test(String(haystack))
}

/**
 * Compare one knowledge record against one passage of a document.
 *
 * Returns null when the passage is not plausibly about this fact. Two topic
 * words are required: one is coincidence in any document about home care,
 * where "caregiver" and "cds" appear on nearly every page.
 *
 * Verdicts:
 *   differs   both state the same KIND of value and the values disagree.
 *             The only verdict worth acting on, and still only a suspicion.
 *   agrees    the document repeats a value the fact holds.
 *   mentions  the topic is here with a value, but nothing lines up.
 */
export function compareClaim(fact, passage) {
  const text = String(passage ?? '')
  const topicHits = (fact.topics ?? []).filter((t) => t && wordIn(text, t))
  if (topicHits.length < 2) return null

  const factLits = literals(fact.answer ?? '')
  const docLits = literals(text)
  if (!factLits.length && !docLits.length) return null

  const factKinds = new Set(factLits.map((l) => l.kind))
  const shared = docLits.filter((d) =>
    factLits.some((f) => f.kind === d.kind && f.value === d.value))
  const conflicting = docLits.filter((d) =>
    factKinds.has(d.kind) && !shared.includes(d))

  // A document that repeats the right figure AND also carries a wrong one is
  // still a problem, so a conflict outranks agreement rather than being hidden
  // by it.
  const verdict = conflicting.length ? 'differs'
                : shared.length ? 'agrees'
                : 'mentions'

  return {
    verdict,
    topic_hits: topicHits,
    fact_values: factLits.map((l) => l.raw),
    document_values: docLits.map((l) => l.raw),
    conflicting_values: conflicting.map((l) => l.raw),
  }
}
