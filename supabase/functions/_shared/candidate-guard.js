// Caring Companions Core — candidate guard
// -----------------------------------------------------------------------------
// Extraction proposes. This decides what a proposal is ALLOWED to claim, based
// on the standing of the document it came from.
//
// The prompt asks the model for the same things. A prompt is a request; this is
// the guarantee. Every rule here exists because the failure it prevents would
// be invisible: a candidate from a confidential HR document reads exactly like
// one from a public manual, and by the time anyone notices, a person has
// approved it and Cara is saying it to families.
//
// Nothing here decides whether a candidate is TRUE. That stays a human act.
// This only bounds what a candidate may claim about itself.
// -----------------------------------------------------------------------------

export const KNOWLEDGE_TYPES = [
  'external_rule',      // the state, CMS, VA or a carrier requires this
  'company_procedure',  // how Caring Companions complies operationally
  'company_policy',     // a Caring Companions decision, never a government requirement
  'case_precedent',     // how one situation was actually handled, anonymised
  'definition',         // terminology or an abbreviation
]

/**
 * The standing of a source document.
 *
 * `approval_state` is null for an external publication and that is correct:
 * Missouri does not publish drafts to us. A COMPANY document with nothing
 * recorded is treated as a draft, because assuming the opposite is precisely
 * how unreviewed material becomes procedure.
 */
export function sourceStanding(doc = {}) {
  const sensitivity = doc.sensitivity || 'internal'
  const approval = doc.approval_state
    || (doc.authority === 'company' ? 'draft' : 'published by an external authority')
  return {
    sensitivity,
    approval,
    isDraft: approval === 'draft',
    // Anything not explicitly public is closely held, including an unset value.
    mustBeInternal: sensitivity !== 'public',
  }
}

/**
 * Clamp one proposed record to what its source permits.
 *
 * Returns the corrected fields plus `applied`, the list of clamps that fired,
 * so a run can report what it had to correct rather than silently fixing it.
 */
export function guardCandidate(raw = {}, standing) {
  const applied = []

  // An unrecognised type would be rejected by the database CHECK constraint,
  // which fails the whole insert and loses every other record in the batch.
  // Correcting it keeps the batch and leaves the reviewer something to fix.
  let knowledge_type = KNOWLEDGE_TYPES.includes(raw.knowledge_type)
    ? raw.knowledge_type : 'external_rule'
  if (raw.knowledge_type && knowledge_type !== raw.knowledge_type)
    applied.push(`unknown knowledge_type "${raw.knowledge_type}" corrected to external_rule`)

  // A document nobody has approved cannot establish a company decision. It can
  // propose how we intend to work, which is company_procedure.
  if (standing.isDraft && knowledge_type === 'company_policy') {
    knowledge_type = 'company_procedure'
    applied.push('company_policy from a draft source downgraded to company_procedure')
  }

  let extraction_confidence = Math.max(0, Math.min(100, Number(raw.confidence) || 0))
  if (standing.isDraft && extraction_confidence > 70) {
    extraction_confidence = 70
    applied.push('confidence capped at 70 because the source is a draft')
  }

  // The one that matters most. Nothing derived from a closely held document is
  // ever suggested for a family-facing answer, however harmless the sentence
  // looks by itself.
  let audience_suggestion = raw.audience_suggestion === 'internal' ? 'internal' : 'public'
  if (standing.mustBeInternal && audience_suggestion !== 'internal') {
    audience_suggestion = 'internal'
    applied.push(`audience forced to internal because the source is ${standing.sensitivity}`)
  }

  return {
    knowledge_type,
    extraction_confidence,
    audience_suggestion,
    // The reviewer must see the source's standing without going to look for it.
    // A proposal from a draft otherwise reads exactly like any other.
    review_note: standing.isDraft
      ? 'From a DRAFT source. Nothing here describes approved procedure yet.'
      : null,
    applied,
  }
}
