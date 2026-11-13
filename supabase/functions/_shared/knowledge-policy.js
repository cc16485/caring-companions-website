// Caring Companions Core: knowledge policy
// -----------------------------------------------------------------------------
// Decides whether Cara is allowed to say something, and what from.
// Plain .js with no runtime imports beyond concepts.js so that the Deno edge
// function and a plain Node test run the identical code.
//
// TWO INDEPENDENT KINDS OF CONFIDENCE. Conflating them is the central danger.
//
//   RECORD confidence  - how much we trust the fact itself.
//                        Lives on the record: status, audience, confidence.
//                        A stale $14 rate is a low-trust record.
//
//   RETRIEVAL confidence - how well this record answers THIS question.
//                        Computed here, per query. A perfectly verified
//                        record about HomeTogether pricing has near-zero
//                        retrieval confidence for a question about spouses.
//
// Both must be strong before Cara answers. A trusted record that barely
// relates to the question is exactly how a system gives a confident,
// authoritative, irrelevant answer.
// -----------------------------------------------------------------------------

import { queryConcepts, conceptsIn, normalize, words } from './concepts.js';

// ── One coherent relevance policy ───────────────────────────────────────────
// Previously isRelevant() allowed a 1-point match on short queries while
// rankRecords() imposed a floor of 2, so the short-query branch was
// unreachable dead logic. There is now one policy, expressed as two named
// thresholds on the same 0..1 scale.
export const CANDIDATE_MIN = 0.25;  // worth considering
export const ANSWER_MIN    = 0.50;  // worth answering from
export const AMBIGUITY_GAP = 0.12;  // two different answers this close = unclear question

// How much a match is worth, by where in the record it was found.
// Answer text is deliberately weak. An answer that happens to contain a word
// is not necessarily about that word, and matching strongly on answer prose is
// what previously made "order printer paper" retrieve a staffing procedure.
const FIELD_WEIGHT = {
  question:      3,
  aliases:       3,
  alt_questions: 3,
  phrases:       3,
  topics:        2,
  answer:        1,
};
const MAX_WEIGHT = 3;
const STRONG_FIELD_MIN = 2;   // a match must land somewhere better than answer prose

/**
 * Score a record against a question: 0..1 RETRIEVAL confidence.
 *
 * Two things must both be true for a record to be a good answer:
 *
 *   COVERAGE  the record accounts for what was asked
 *   FOCUS     the record is ABOUT what was asked
 *
 * Coverage alone is not enough, and that gap is a real failure mode. The
 * stale pay-rate record mentions daughters and CDS, so it covered every
 * concept in "Can my daughter be my CDS attendant?" and scored a perfect 1.0
 * on a question that has nothing to do with pay. Measuring focus as well
 * drops it below the record that is actually about that question.
 *
 * Focus is measured against each PHRASING of the record (its canonical
 * question and every alternate question), taking the best. Each alternate
 * question is a complete way of asking the same thing, so comparing against
 * the whole bag of them would dilute every one of them.
 */
function conceptSet(text) { return conceptsIn(text); }

function f1(queryConceptsSet, phrasingConcepts) {
  if (!phrasingConcepts.size || !queryConceptsSet.size) return 0;
  let shared = 0;
  for (const c of queryConceptsSet) if (phrasingConcepts.has(c)) shared++;
  if (!shared) return 0;
  const coverage = shared / queryConceptsSet.size;   // how much of the question
  const focus    = shared / phrasingConcepts.size;   // how much of the phrasing
  return (2 * coverage * focus) / (coverage + focus);
}

export function scoreRecord(record, question) {
  const qc = queryConcepts(question);
  if (!qc.length) return { confidence: 0, matched: [], missed: [], strongest: 0, via: null };

  // Unmapped words ("branson") are kept as concepts so a question we cannot
  // answer cannot quietly score well on the words we happen to share.
  const qset = new Set(qc);

  const phrasings = [
    { label: 'question', text: record.question || '' },
    ...(record.alt_questions || []).map((t, i) => ({ label: `alt_question[${i}]`, text: t })),
  ];

  let best = 0, via = null;
  for (const p of phrasings) {
    const score = f1(qset, conceptSet(p.text));
    if (score > best) { best = score; via = p.label; }
  }

  // Topics, aliases and phrases are supporting evidence, not a phrasing.
  // They can lift a near miss but can never carry a record on their own.
  const support = conceptSet(
    [(record.topics || []).join(' . '), (record.aliases || []).join(' . '),
     (record.phrases || []).join(' . ')].join(' . '));
  let sharedSupport = 0;
  for (const c of qset) if (support.has(c)) sharedSupport++;
  const bonus = Math.min(0.10, (sharedSupport / qset.size) * 0.10);

  const confidence = Math.min(1, best > 0 ? best + bonus : 0);

  const matched = [], missed = [];
  for (const c of qc) {
    if (support.has(c) || phrasings.some((p) => conceptSet(p.text).has(c))) matched.push(c);
    else missed.push(c);
  }

  return { confidence, matched, missed, strongest: best, via };
}

/** Candidates, best first, with their evidence attached. */
// 2026-11-12: the office rulebook (source S10, ids OR01 and up) was loaded on 2026-11-07 for Ask Cara in the Hub. Its rules
// are short office instructions ("Calls", "Regular care") whose titles and topics tie with public answers, and a tie with an
// internal record is withheld below. So the website chat told families "that is about how we run things on our end" when they
// asked for rates, services, the phone number or overnight care. The rulebook is not knowledge about our services: Ask Cara
// reads every rule itself. A public search never considers it. Other internal records (real procedures) still withhold.
export const OFFICE_RULEBOOK_SOURCE = 'S10';
export function forAudience(rows, audience = 'public') {
  const all = rows || [];
  return audience === 'public' ? all.filter((r) => r && r.source_id !== OFFICE_RULEBOOK_SOURCE) : all;
}

export function rankRecords(records, question) {
  return (records || [])
    .map((r) => ({ record: r, ...scoreRecord(r, question) }))
    .filter((x) => x.confidence >= CANDIDATE_MIN && x.strongest > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

// "Safest" has to be a rule, not a vibe. For a family-facing answer about money
// or eligibility, the safest record is the one that promises least.
export function pickSafest(candidates) {
  return [...candidates].sort((a, b) => {
    if (!!b.conservative !== !!a.conservative) return b.conservative ? 1 : -1;
    if ((b.confidence || 0) !== (a.confidence || 0)) return (b.confidence || 0) - (a.confidence || 0);
    return String(b.verified_on || '').localeCompare(String(a.verified_on || ''));
  })[0];
}

/**
 * The gate.
 *
 *   ok         answer from `records`
 *   conflict   two approved records disagree; answer from the safest, flag it
 *   ambiguous  candidates answer different questions and none is clearly the
 *              one asked. We do not guess which question was meant.
 *   unsure     something related, but not enough of the question is covered
 *   withheld   matched, but nothing matched is publishable
 *   none       nothing matched at all
 *
 * Everything except `ok` and `conflict` produces a refusal. The distinctions
 * exist because they deserve different things said back.
 */
export function decide(allRecords, question, { audience = 'public' } = {}) {
  const ranked = rankRecords(allRecords, question);

  if (!ranked.length) {
    return { decision: 'none', records: [], conflict: null, withheld: [], candidates: [],
             reason: 'No knowledge record is relevant to this question.' };
  }

  const candidates = ranked.map((x) => ({
    id: x.record.id, confidence: Number(x.confidence.toFixed(3)),
    status: x.record.status, audience: x.record.audience,
    via: x.via, matched: x.matched, missed: x.missed,
  }));

  // RECORD-level gate. Unchanged, and deliberately applied AFTER retrieval so
  // the reason for exclusion survives into the answer.
  const usable = [];
  const withheld = [];
  let bestUsable = 0, bestWithheld = 0;
  for (const x of ranked) {
    const r = x.record;
    const publicOk = audience !== 'public' || r.audience === 'public';
    const verified = r.status === 'verified';
    if (publicOk && verified) {
      usable.push({ ...r, _retrieval: x.confidence });
      if (x.confidence > bestUsable) bestUsable = x.confidence;
    } else {
      withheld.push({ id: r.id, reason: !verified ? `status is "${r.status}"` : 'internal use only',
                      kind: !verified ? 'unverified' : 'internal', confidence: Number(x.confidence.toFixed(3)) });
      if (x.confidence > bestWithheld) bestWithheld = x.confidence;
    }
  }

  // The closest thing to their question is something we may not say. Answering
  // from a lesser record would read as if we had answered.
  if (!usable.length || bestWithheld >= bestUsable) {
    return { decision: 'withheld', records: [], conflict: null, withheld, candidates,
             reason: !usable.length
               ? 'Matching records exist but none are approved for a family-facing answer.'
               : 'The most relevant record is not approved for a family-facing answer.' };
  }

  // RETRIEVAL-level gate. A record can be perfectly trusted and still be a poor
  // answer to what was actually asked.
  if (bestUsable < ANSWER_MIN) {
    return { decision: 'unsure', records: [], conflict: null, withheld, candidates,
             reason: `Best retrieval confidence ${bestUsable.toFixed(2)} is below the ${ANSWER_MIN} threshold. ` +
                     'Something is related but too little of the question is covered.' };
  }

  const top = usable.filter((r) => r._retrieval >= ANSWER_MIN);

  // Two approved records answering the SAME question differently is a
  // contradiction in our own truth. Never resolve that quietly.
  const byKey = {};
  for (const r of top) (byKey[r.answer_key || r.id] = byKey[r.answer_key || r.id] || []).push(r);
  const clashKey = Object.keys(byKey).find((k) => byKey[k].length > 1);
  if (clashKey) {
    const group = byKey[clashKey];
    const safest = pickSafest(group);
    return { decision: 'conflict', records: [safest], withheld, candidates,
             conflict: { answer_key: clashKey, candidate_ids: group.map((c) => c.id), chose: safest.id,
                         why: 'Answered from the most conservative approved record. A human must resolve which is correct.' },
             reason: `${group.length} approved records answer "${clashKey}" differently.` };
  }

  // Different questions, indistinguishably close. We do not know which one was
  // asked, so we do not pick. This is different from a conflict: our knowledge
  // is consistent, the QUESTION is unclear.
  if (top.length > 1 && (top[0]._retrieval - top[1]._retrieval) < AMBIGUITY_GAP
      && top[0].answer_key !== top[1].answer_key) {
    // Both are verified and public, so Cara may answer from the pair. She is
    // told to say which part each covers rather than pick one at random.
    return { decision: 'ambiguous', records: top.slice(0, 2), conflict: null, withheld, candidates,
             reason: `Could be about "${top[0].question}" or "${top[1].question}" and nothing distinguishes them.` };
  }

  return { decision: 'ok', records: top.slice(0, 2), conflict: null, withheld, candidates, reason: null };
}

// What Cara is told. The records ARE the prompt. No facts are baked in here,
// which is the entire point: change the record, change what she says.
// phone: the office number Cara offers. 2026-11-06: rule 7's example used to be the CDS number, and she gave it to a
// family asking about overnight care, so the office number is named here and the example carries no number.
export function buildSystemPrompt(records, phone) {
  const block = records.map((r) =>
    `[${r.id} v${r.version}] Question: ${r.question}\nApproved answer: ${r.answer}\n` +
    `Source: ${r.source_name} (verified ${r.verified_on})`).join('\n\n');

  return [
    'You answer quick questions on the Caring Companions website. Caring Companions is a Missouri home care agency.',
    // 2026-11-06 (Samantha: "go away with Cara all together, people are not a fan of ai"): no name, and honest if asked.
    'You have no name. Never call yourself Cara or any other name, and never say you are a care coordinator. If someone asks whether they are talking to a real person, say plainly that this chat gives quick answers and that a Care Coordinator answers our calls and texts' + (phone ? ' at ' + phone : '') + '.',
    '',
    'You have been given the ONLY approved answers you may use. They appear below.',
    '',
    'RULES, in order of importance:',
    '1. Every factual claim in your reply must come from the approved answers below. Do not add facts from your own knowledge, not even ones you are confident about.',
    '2. Do not state a price, a rate, an eligibility rule or a program requirement that is not written below.',
    '3. If the approved answers do not cover part of what was asked, say plainly that you do not have a confirmed answer for that part and offer ' + (phone ? 'our office number, ' + phone : 'the phone number') + '. Do not fill the gap.',
    '4. You may rephrase warmly and conversationally. You may not change what the answer says or soften a limitation.',
    '5. Reply in plain sentences, 2 to 6 of them, under 120 words. No markdown, no bullets.',
    '6. Never use em dashes. Use commas or periods.',
    '7. Write every price, number and phone number in digits exactly as the approved answer shows it, like $15. Never spell them out in words.',
    ...(phone ? ['8. The only phone number you may give is ' + phone + ', unless an approved answer below gives a different number, and then only for what that answer is about.'] : []),
    // 2026-11-06 (Samantha, after "so your dad will be covered" slipped into a dialysis answer): no added promises,
    // the assessment always comes first, and families who are ready are invited to the next step.
    '9. Never add a promise, guarantee or reassurance that is not written in the approved answers. Never promise a start date or a time frame, that a caregiver is available, staffing, transportation, or that anything is covered by insurance.',
    '10. If the question is about starting care, including urgent, same-day or next-day care, always say that we first complete a free in-home assessment and build a care plan before care begins.',
    '11. When the visitor sounds ready to begin care, end by inviting them to book a free in-home assessment at mo-care.com/book or call ' + (phone || 'our office') + '. Do not do this when the approved answer is about jobs or sends them to Consumer Directed Services.',
    '',
    'APPROVED ANSWERS:',
    block,
  ].join('\n');
}

// The refusal. Said out loud rather than papered over, because a family acting
// on an invented eligibility answer is the failure this system exists to stop.
export function buildRefusal(decision, phone) {
  const d = decision.decision;

  if (d === 'withheld') {
    const wh = decision.withheld || [];
    // Describe why the BEST match cannot be used, not the whole withheld list.
    // A question about the call-off procedure also brushes the stale pay record;
    // saying "not confirmed recently enough" about a verified internal SOP would
    // be untrue and would make us sound disorganised rather than private.
    const top = [...wh].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    if (top && top.kind === 'internal') {
      return 'That one is about how we run things on our end rather than something I can walk you through here. ' +
        `If it is affecting your care, please call us at ${phone} and a coordinator will sort it out with you directly.`;
    }
    return 'That is a good question, and I want to give you the right answer rather than a guess. ' +
      'We do have something on file about it, but it has not been confirmed recently enough for me to quote it to you. ' +
      `Please call us at ${phone} and a coordinator will give you the current answer.`;
  }

  if (d === 'ambiguous' || d === 'unsure') {
    return 'I want to make sure I answer the right question rather than guess at it. ' +
      `Could you tell me a little more about what you are trying to find out? Or call us at ${phone} ` +
      'and a coordinator can talk it through with you.';
  }

  return 'I do not have a confirmed answer for that one, and I would rather tell you that than guess. ' +
    `Please call us at ${phone} and a coordinator can help you directly.`;
}

// 2026-11-06 (Samantha, "Yes, tighten it"): with no approved answer, the chat said "We provide care in homes, so that's a
// little different from what a nursing home offers", a service claim nobody approved. The prompt already forbade it, so
// this check runs on every no-answer reply: anything that says what we do or do not provide, a price, a time, a program
// or a place is swapped for a fixed reply that only points to the office. Warm greetings and questions pass through.
const NO_FACTS_RISKY = [
  /\bwe(?:'re| are)? ?(?:only |also |do |don'?t |do not |can'?t |cannot |can |could |will |won'?t |are able to |are not able to |usually |typically |normally )?(?:provide|offer|accept|take|serve|cover|work with|work in|go to|come to|bill|charge|have|specialize|staff|send|do not do|don'?t do)\b/i,
  /\b(?:caring companions|our (?:caregivers|care|services|agency|team|office|staff)|caregivers) (?:does|do|doesn'?t|does not|can|cannot|can'?t|will|won'?t|provides?|offers?|accepts?|is able|are able|only)\b/i,
  /\$\s?\d/,
  /\b\d+\s*(?:hours?|days?|weeks?|months?|minutes?)\b/i,
  /\b(?:medicaid|medicare|insurance|va\b|veterans?|hospice|assisted living|nursing ?homes?|memory care|facility|facilities|counties|county|in-home|in homes|at home)\b/i,
]

export function noFactsGuard(reply, phone) {
  const text = String(reply || '')
  if (!NO_FACTS_RISKY.some((re) => re.test(text))) return { reply: text, replaced: false }
  return {
    reply: 'I do not have a confirmed answer for that one, and I would rather tell you that than guess. ' +
      `A Care Coordinator can help: call or text us at ${phone}.`,
    replaced: true,
  }
}
